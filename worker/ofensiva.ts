export const OFFENSIVE_PRIZE_XP = 1500;
const SAO_PAULO = "America/Sao_Paulo";

export function calendarDay(at?: string | Date) {
  const date = at instanceof Date ? at : at ? new Date(at) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("en-CA", { timeZone: SAO_PAULO });
  return date.toLocaleDateString("en-CA", { timeZone: SAO_PAULO });
}

function shiftDay(day: string, delta: number) {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + delta));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${next.getUTCDate().toString().padStart(2, "0")}`;
}

export function currentStreak(days: string[], today = calendarDay()) {
  const set = new Set(days);
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  if (!set.has(cursor)) return 0;
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

export function longestStreak(days: string[]) {
  const sorted = [...new Set(days)].sort();
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] === shiftDay(sorted[index - 1], 1)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

export async function recordActivityDay(db: MysqlDb, userId: string, source: "login" | "platform", at?: string) {
  const day = calendarDay(at);
  await db.execute("INSERT IGNORE INTO user_activity_days (user_id, day, source, created_at) VALUES (?,?,?,?)", [userId, day, source, at ?? new Date().toISOString()]);
  return day;
}

/** ChatGPT/platform has no cookie session; one auth_sessions row per São Paulo day. */
export async function recordPlatformLoginDay(db: MysqlDb, userId: string) {
  const now = new Date();
  const day = calendarDay(now);
  const sessionId = `platform-login:${userId}:${day}`;
  await db.execute("INSERT IGNORE INTO auth_sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", [sessionId, userId, new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(), now.toISOString()]);
  await recordActivityDay(db, userId, "platform", now.toISOString());
  return day;
}

async function loginDaysFromSessions(db: MysqlDb, userId: string) {
  const sessions = await db.query<{ createdAt: string }>("SELECT created_at AS createdAt FROM auth_sessions WHERE user_id = ?", [userId]);
  return [...new Set(sessions.map(row => calendarDay(row.createdAt)))].sort();
}

export async function backfillLoginDays(db: MysqlDb, userId: string) {
  const sessions = await db.query<{ createdAt: string }>("SELECT created_at AS createdAt FROM auth_sessions WHERE user_id = ?", [userId]);
  for (const row of sessions) await db.execute("INSERT IGNORE INTO user_activity_days (user_id, day, source, created_at) VALUES (?,?,?,?)", [userId, calendarDay(row.createdAt), "login", row.createdAt]);
}

export async function loadOffensiveState(db: MysqlDb, userId: string) {
  await backfillLoginDays(db, userId);
  const days = await loginDaysFromSessions(db, userId);
  const reward = (await db.query<{ bonusXp: number; prizeClaimedAt: string | null }>("SELECT bonus_xp AS bonusXp, prize_claimed_at AS prizeClaimedAt FROM user_offensive WHERE user_id = ?", [userId]))[0];
  const streak = currentStreak(days);
  return {
    days,
    streak,
    bestStreak: Math.max(longestStreak(days), streak),
    bonusXp: reward?.bonusXp ?? 0,
    prizeClaimed: Boolean(reward?.prizeClaimedAt),
    today: calendarDay(),
  };
}

export async function claimOffensivePrize(db: MysqlDb, userId: string) {
  const state = await loadOffensiveState(db, userId);
  if (state.prizeClaimed) return { ...state, claimedNow: false, error: "Você já recolheu o prêmio de 15 dias." };
  if (state.streak < 15) return { ...state, claimedNow: false, error: "Complete 15 dias seguidos de login para recolher o prêmio." };
  const now = new Date().toISOString();
  await db.execute(`INSERT INTO user_offensive (user_id, bonus_xp, prize_claimed_at) VALUES (?,?,?)
    ON DUPLICATE KEY UPDATE bonus_xp=user_offensive.bonus_xp + VALUES(bonus_xp), prize_claimed_at=VALUES(prize_claimed_at)`, [userId, OFFENSIVE_PRIZE_XP, now]);
  return { ...await loadOffensiveState(db, userId), claimedNow: true, prizeXp: OFFENSIVE_PRIZE_XP };
}
import type { MysqlDb } from "./mysql";

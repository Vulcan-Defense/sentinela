import type { MysqlDb } from "./mysql";

export const PLAN_CYCLE_DAYS = 30;

export function planCycleWindow(date = new Date()) {
  const startedAt = date.toISOString();
  const expiresAt = new Date(date.getTime() + PLAN_CYCLE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return { startedAt, expiresAt };
}

export async function enforceMysqlPlanExpiry(db: MysqlDb, userId?: string) {
  const current = new Date().toISOString();
  await db.execute(
    `UPDATE accounts SET plan='gratuito',plan_started_at=NULL,plan_expires_at=NULL,updated_at=?
     WHERE system_role<>'admin' AND plan<>'gratuito' AND plan_expires_at IS NOT NULL AND plan_expires_at<=?${userId ? " AND user_id=?" : ""}`,
    userId ? [current, current, userId] : [current, current],
  );
}

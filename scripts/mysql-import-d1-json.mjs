import { readFileSync } from "node:fs";
import { connect } from "./mysql-env.mjs";

const tableOrder = [
  "accounts",
  "plans",
  "courses",
  "course_modules",
  "certifications",
  "manual_credentials",
  "auth_challenges",
  "auth_rate_limits",
  "auth_sessions",
  "enrollments",
  "module_completions",
  "quiz_passes",
  "lesson_steps",
  "user_activity_days",
  "user_offensive",
  "certification_attempts",
  "certificates",
  "platform_settings",
  "printed_certificate_requests",
];

const allowedColumns = {
  accounts: ["user_id", "email", "name", "role", "system_role", "plan", "status", "goal", "email_verified_at", "created_at", "updated_at", "plan_started_at", "plan_expires_at", "phone", "postal_code", "address_line", "address_number", "address_complement", "neighborhood", "city", "state", "receive_printed_certificate", "address_confirmed", "profile_photo_key", "community_member"],
  plans: ["id", "name", "price_cents", "description", "features_json", "sort_order"],
  courses: ["id", "code", "title", "description", "hours", "level", "icon", "tone", "access_plan", "premium", "price_cents", "published", "sort_order"],
  course_modules: ["id", "course_id", "title", "short_title", "difficulty", "lessons", "xp", "tone", "sort_order"],
  certifications: ["id", "code", "title", "description", "published", "passing_percentage", "question_count", "duration_minutes", "created_at", "updated_at"],
  manual_credentials: ["user_id", "password_hash", "password_salt", "password_iterations", "created_at", "updated_at"],
  auth_challenges: ["id", "user_id", "purpose", "code_hash", "expires_at", "attempts", "consumed_at", "created_at"],
  auth_rate_limits: ["rate_key", "attempts", "window_started_at"],
  auth_sessions: ["id", "user_id", "expires_at", "created_at"],
  enrollments: ["user_id", "course_id", "source", "stripe_session_id", "created_at"],
  module_completions: ["user_id", "module_id", "course_id", "xp", "completed_at"],
  quiz_passes: ["user_id", "course_id", "passed_at"],
  lesson_steps: ["user_id", "module_id", "step_index", "studied_at"],
  user_activity_days: ["user_id", "day", "source", "created_at"],
  user_offensive: ["user_id", "bonus_xp", "prize_claimed_at"],
  certification_attempts: ["id", "user_id", "certification_id", "score", "total", "percentage", "passed", "attempted_at"],
  certificates: ["id", "user_id", "student_name", "course_id", "course_title", "hours", "issued_at", "issuer", "status"],
  platform_settings: ["setting_key", "setting_value", "updated_at", "updated_by"],
  printed_certificate_requests: ["id", "user_id", "certificate_id", "course_id", "student_name", "phone", "delivery_address", "amount_cents", "currency", "status", "stripe_session_id", "created_at", "paid_at", "updated_at"],
};

const primaryKeys = {
  accounts: ["user_id"], plans: ["id"], courses: ["id"], course_modules: ["id"],
  certifications: ["id"], manual_credentials: ["user_id"], auth_challenges: ["id"],
  auth_rate_limits: ["rate_key"], auth_sessions: ["id"], enrollments: ["user_id", "course_id"],
  module_completions: ["user_id", "module_id"], quiz_passes: ["user_id", "course_id"],
  lesson_steps: ["user_id", "module_id", "step_index"], user_activity_days: ["user_id", "day"],
  user_offensive: ["user_id"], certification_attempts: ["id"], certificates: ["id"],
  platform_settings: ["setting_key"], printed_certificate_requests: ["id"],
};

function normalize(table, row) {
  if (table === "auth_rate_limits" && row.key !== undefined && row.rate_key === undefined) {
    return { ...row, rate_key: row.key };
  }
  if (table === "platform_settings") {
    return {
      ...row,
      setting_key: row.setting_key ?? row.key,
      setting_value: row.setting_value ?? row.value,
    };
  }
  return row;
}

async function main() {
  const input = process.argv[2] ? readFileSync(process.argv[2], "utf8") : readFileSync(0, "utf8");
  const payload = JSON.parse(input);
  const byTable = new Map(payload.map(entry => [entry.table, entry.rows || []]));
  const connection = await connect(true).catch(() => connect(false));
  const counts = {};
  const verified = {};

  try {
    await connection.beginTransaction();
    for (const table of tableOrder) {
      const rows = byTable.get(table) || [];
      counts[table] = 0;
      for (const source of rows) {
        const row = normalize(table, source);
        const columns = allowedColumns[table].filter(column => Object.hasOwn(row, column));
        if (!columns.length) continue;
        const quoted = columns.map(column => `\`${column}\``).join(",");
        const placeholders = columns.map(() => "?").join(",");
        const updates = columns.map(column => `\`${column}\`=VALUES(\`${column}\`)`).join(",");
        await connection.execute(
          `INSERT INTO \`${table}\` (${quoted}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
          columns.map(column => row[column] ?? null),
        );
        counts[table] += 1;
      }
    }
    await connection.commit();
    for (const table of tableOrder) {
      verified[table] = 0;
      for (const source of byTable.get(table) || []) {
        const row = normalize(table, source);
        const keys = primaryKeys[table];
        const predicate = keys.map(key => `\`${key}\` <=> ?`).join(" AND ");
        const [found] = await connection.execute(
          `SELECT 1 AS present FROM \`${table}\` WHERE ${predicate} LIMIT 1`,
          keys.map(key => row[key] ?? null),
        );
        if (found.length === 1) verified[table] += 1;
      }
    }
    const ok = tableOrder.every(table => verified[table] === counts[table]);
    process.stdout.write(JSON.stringify({ ok, counts, verified }));
    if (!ok) process.exitCode = 2;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

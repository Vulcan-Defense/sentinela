import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { connect, root } from "./mysql-env.mjs";

function sqliteFiles() {
  const dir = join(root, ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(name => name.endsWith(".sqlite") && !name.includes("metadata"))
    .map(name => join(dir, name));
}

function tableExists(db, name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function rows(db, sql) {
  if (!sql) return [];
  try {
    return db.prepare(sql).all();
  } catch {
    return [];
  }
}

async function insert(connection, sql, params) {
  await connection.execute(sql, params);
}

async function main() {
  const files = sqliteFiles();
  if (!files.length) {
    console.log("Nenhum D1 local encontrado em .wrangler.");
    process.exit(1);
  }

  const connection = await connect(true).catch(() => connect(false));
  let accounts = 0;
  let credentials = 0;
  let sessions = 0;
  let extras = 0;

  try {
    for (const file of files) {
      const sqlite = new DatabaseSync(file, { readOnly: true });
      const hasAccounts = tableExists(sqlite, "accounts");
      if (!hasAccounts) {
        console.log(`sem tabela accounts: ${file}`);
      }

      const accountRows = hasAccounts
        ? rows(sqlite, "SELECT user_id,email,name,role,system_role,plan,status,email_verified_at,created_at,updated_at FROM accounts")
        : [];
      for (const account of accountRows) {
        await insert(connection,
          `INSERT INTO accounts (user_id,email,name,role,system_role,plan,status,goal,email_verified_at,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,'AppSec Specialist',?,?,?)
           ON DUPLICATE KEY UPDATE email=VALUES(email), name=VALUES(name), role=VALUES(role), system_role=VALUES(system_role), plan=VALUES(plan), status=VALUES(status), email_verified_at=VALUES(email_verified_at), updated_at=VALUES(updated_at)`,
          [account.user_id, account.email, account.name, account.role || "Estudante de Segurança", account.system_role || "aluno", account.plan || "gratuito", account.status || "active", account.email_verified_at || "", account.created_at, account.updated_at || account.created_at],
        );
        accounts += 1;
      }

      if (tableExists(sqlite, "manual_credentials")) {
        for (const credential of rows(sqlite, "SELECT user_id,password_hash,password_salt,password_iterations,created_at,updated_at FROM manual_credentials")) {
          await insert(connection,
            `INSERT INTO manual_credentials (user_id,password_hash,password_salt,password_iterations,created_at,updated_at)
             VALUES (?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), password_salt=VALUES(password_salt), password_iterations=VALUES(password_iterations), updated_at=VALUES(updated_at)`,
            [credential.user_id, credential.password_hash, credential.password_salt, credential.password_iterations, credential.created_at, credential.updated_at],
          );
          credentials += 1;
        }
      }

      if (tableExists(sqlite, "auth_sessions")) {
        for (const session of rows(sqlite, "SELECT id,user_id,expires_at,created_at FROM auth_sessions")) {
          await insert(connection,
            "INSERT IGNORE INTO auth_sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)",
            [session.id, session.user_id, session.expires_at, session.created_at],
          );
          sessions += 1;
        }
      }

      if (tableExists(sqlite, "user_activity_days")) {
        for (const day of rows(sqlite, "SELECT user_id,day,source,created_at FROM user_activity_days")) {
          await insert(connection, "INSERT IGNORE INTO user_activity_days (user_id,day,source,created_at) VALUES (?,?,?,?)", [day.user_id, day.day, day.source, day.created_at]);
          extras += 1;
        }
      }

      if (tableExists(sqlite, "user_offensive")) {
        for (const offensive of rows(sqlite, "SELECT user_id,bonus_xp,prize_claimed_at FROM user_offensive")) {
          await insert(connection,
            `INSERT INTO user_offensive (user_id,bonus_xp,prize_claimed_at) VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE bonus_xp=VALUES(bonus_xp), prize_claimed_at=VALUES(prize_claimed_at)`,
            [offensive.user_id, offensive.bonus_xp, offensive.prize_claimed_at],
          );
          extras += 1;
        }
      }

      if (tableExists(sqlite, "certificates")) {
        for (const certificate of rows(sqlite, "SELECT id,user_id,student_name,course_id,course_title,hours,issued_at,issuer,status FROM certificates")) {
          await insert(connection,
            `INSERT INTO certificates (id,user_id,student_name,course_id,course_title,hours,issued_at,issuer,status)
             VALUES (?,?,?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE student_name=VALUES(student_name), course_title=VALUES(course_title), status=VALUES(status)`,
            [certificate.id, certificate.user_id || null, certificate.student_name, certificate.course_id, certificate.course_title, certificate.hours, certificate.issued_at, certificate.issuer || "Vulcan Defense", certificate.status || "valid"],
          );
          extras += 1;
        }
      }

      if (tableExists(sqlite, "premium_enrollments")) {
        for (const enrollment of rows(sqlite, "SELECT user_id,course_id,stripe_session_id,created_at FROM premium_enrollments")) {
          await insert(connection,
            "INSERT IGNORE INTO enrollments (user_id,course_id,source,stripe_session_id,created_at) VALUES (?,?,?,?,?)",
            [enrollment.user_id, enrollment.course_id, "stripe", enrollment.stripe_session_id, enrollment.created_at],
          ).catch(() => undefined);
          extras += 1;
        }
      }

      if (tableExists(sqlite, "enrollments")) {
        for (const enrollment of rows(sqlite, "SELECT user_id,course_id,source,stripe_session_id,created_at FROM enrollments")) {
          await insert(connection,
            "INSERT IGNORE INTO enrollments (user_id,course_id,source,stripe_session_id,created_at) VALUES (?,?,?,?,?)",
            [enrollment.user_id, enrollment.course_id, enrollment.source || "self", enrollment.stripe_session_id, enrollment.created_at],
          ).catch(() => undefined);
          extras += 1;
        }
      }

      if (tableExists(sqlite, "module_completions")) {
        for (const completion of rows(sqlite, "SELECT user_id,module_id,course_id,xp,completed_at FROM module_completions")) {
          await insert(connection,
            "INSERT IGNORE INTO module_completions (user_id,module_id,course_id,xp,completed_at) VALUES (?,?,?,?,?)",
            [completion.user_id, completion.module_id, completion.course_id, completion.xp, completion.completed_at],
          ).catch(() => undefined);
          extras += 1;
        }
      }

      if (tableExists(sqlite, "quiz_passes")) {
        for (const quiz of rows(sqlite, "SELECT user_id,course_id,passed_at FROM quiz_passes")) {
          await insert(connection, "INSERT IGNORE INTO quiz_passes (user_id,course_id,passed_at) VALUES (?,?,?)", [quiz.user_id, quiz.course_id, quiz.passed_at]).catch(() => undefined);
          extras += 1;
        }
      }

      if (tableExists(sqlite, "lesson_steps")) {
        for (const step of rows(sqlite, "SELECT user_id,module_id,step_index,studied_at FROM lesson_steps")) {
          await insert(connection,
            "INSERT IGNORE INTO lesson_steps (user_id,module_id,step_index,studied_at) VALUES (?,?,?,?)",
            [step.user_id, step.module_id, step.step_index, step.studied_at],
          ).catch(() => undefined);
          extras += 1;
        }
      }

      sqlite.close();
      console.log(`migrado: ${file}`);
    }

    const [[{ n }]] = await connection.query("SELECT COUNT(*) AS n FROM accounts");
    console.log(`MySQL accounts=${n} · copiados agora: contas=${accounts} senhas=${credentials} sessões=${sessions} extras=${extras}`);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error("Falha ao migrar usuários:", error instanceof Error ? error.message : error);
  process.exit(1);
});

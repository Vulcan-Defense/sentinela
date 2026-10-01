import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { connect, root } from "./mysql-env.mjs";
import { courses, plans } from "../data/site-catalog.ts";

const now = new Date().toISOString();

async function main() {
  let connection;
  try {
    connection = await connect(true);
  } catch {
    connection = await connect(false);
  }
  try {
    const schema = readFileSync(resolve(root, "db/mysql/schema.sql"), "utf8");
    await connection.query(schema);
    const [accountColumns] = await connection.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='accounts'");
    const existingAccountColumns = new Set(accountColumns.map(row => row.COLUMN_NAME));
    if (!existingAccountColumns.has("plan_started_at")) await connection.query("ALTER TABLE accounts ADD COLUMN plan_started_at VARCHAR(40) NULL AFTER plan");
    if (!existingAccountColumns.has("plan_expires_at")) await connection.query("ALTER TABLE accounts ADD COLUMN plan_expires_at VARCHAR(40) NULL AFTER plan_started_at");
    const profileColumns = [
      ["phone","VARCHAR(32) NOT NULL DEFAULT ''"],["postal_code","VARCHAR(16) NOT NULL DEFAULT ''"],["address_line","VARCHAR(255) NOT NULL DEFAULT ''"],
      ["address_number","VARCHAR(32) NOT NULL DEFAULT ''"],["address_complement","VARCHAR(120) NOT NULL DEFAULT ''"],["neighborhood","VARCHAR(120) NOT NULL DEFAULT ''"],
      ["city","VARCHAR(120) NOT NULL DEFAULT ''"],["state","VARCHAR(2) NOT NULL DEFAULT ''"],["receive_printed_certificate","TINYINT(1) NOT NULL DEFAULT 0"],
      ["address_confirmed","TINYINT(1) NOT NULL DEFAULT 0"],["profile_photo_key","VARCHAR(255) NULL"],["community_member","TINYINT(1) NOT NULL DEFAULT 0"],
    ];
    for (const [column,definition] of profileColumns) if(!existingAccountColumns.has(column)) await connection.query(`ALTER TABLE accounts ADD COLUMN ${column} ${definition}`);
    if (!existingAccountColumns.has("community_member")) await connection.query("UPDATE accounts SET community_member=1");
    const [feedbackColumns] = await connection.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_feedback'");
    const existingFeedbackColumns = new Set(feedbackColumns.map(row => row.COLUMN_NAME));
    if (!existingFeedbackColumns.has("status")) await connection.query("ALTER TABLE community_feedback ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'open'");
    if (!existingFeedbackColumns.has("admin_note")) await connection.query("ALTER TABLE community_feedback ADD COLUMN admin_note TEXT NULL");
    if (!existingFeedbackColumns.has("updated_at")) await connection.query("ALTER TABLE community_feedback ADD COLUMN updated_at VARCHAR(40) NULL");
    await connection.query("INSERT INTO platform_settings (setting_key,setting_value,updated_at) VALUES ('printed_certificate_fee_cents','18990',?) ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key)",[now]);

    const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const demoAccounts = [
      ["demo-marina","marina@exemplo.com","Marina Costa","Estudante de Segurança","aluno","avancado","AppSec Specialist",2940],
      ["demo-joao","joao@exemplo.com","João Vieira","Analista de Segurança","aluno","medio","Cloud Security",2210],
      ["demo-beatriz","beatriz@exemplo.com","Beatriz Lima","Professora de AppSec","professor","avancado","Ensino de Segurança",1980],
      ["demo-lucas","lucas@exemplo.com","Lucas Martins","Desenvolvedor","aluno","basico","Secure Coding",1320],
      ["demo-ana","ana@exemplo.com","Ana Ribeiro","Professora de Segurança","professor","medio","Segurança de APIs",960],
      ["demo-diego","diego@exemplo.com","Diego Santos","Estudante de Segurança","aluno","gratuito","Fundamentos de Segurança",420],
    ];
    for (const [userId,email,name,role,systemRole,plan,goal,bonusXp] of demoAccounts) {
      const paid = plan !== "gratuito";
      await connection.query(
        `INSERT INTO accounts (user_id,email,name,role,system_role,plan,status,goal,email_verified_at,created_at,updated_at,plan_started_at,plan_expires_at)
         VALUES (?,?,?,?,?,?,'active',?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name),role=VALUES(role),system_role=VALUES(system_role),goal=VALUES(goal),updated_at=VALUES(updated_at)`,
        [userId,email,name,role,systemRole,plan,goal,now,now,now,paid?now:null,paid?planExpiresAt:null],
      );
      await connection.query("INSERT INTO user_offensive (user_id,bonus_xp) VALUES (?,?) ON DUPLICATE KEY UPDATE bonus_xp=VALUES(bonus_xp)",[userId,bonusXp]);
    }
    await connection.query(
      `INSERT INTO certifications (id,code,title,description,published,passing_percentage,question_count,duration_minutes,created_at,updated_at)
       VALUES (?,?,?,?,1,85,40,90,?,?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), updated_at=VALUES(updated_at)`,
      ["vcws", "VCWS", "Vulcan Certified Web Security", "Certificação profissional em segurança de aplicações, APIs, cloud, DevSecOps e fundamentos de IA segura.", now, now],
    );

    for (const [index, plan] of plans.entries()) {
      await connection.query(
        `INSERT INTO plans (id,name,price_cents,description,features_json,sort_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), price_cents=VALUES(price_cents), description=VALUES(description), features_json=VALUES(features_json), sort_order=VALUES(sort_order)`,
        [plan.id, plan.name, Math.round(plan.price * 100), plan.description, JSON.stringify(plan.features), index],
      );
    }

    for (const [index, course] of courses.entries()) {
      await connection.query(
        `INSERT INTO courses (id,code,title,description,hours,level,icon,tone,access_plan,premium,price_cents,published,sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)
         ON DUPLICATE KEY UPDATE code=VALUES(code), title=VALUES(title), description=VALUES(description), hours=VALUES(hours), level=VALUES(level), icon=VALUES(icon), tone=VALUES(tone), access_plan=VALUES(access_plan), premium=VALUES(premium), price_cents=VALUES(price_cents), sort_order=VALUES(sort_order)`,
        [course.id, course.code, course.title, course.description, course.hours, course.level, course.icon, course.tone, course.access, course.premium ? 1 : 0, Math.round((course.price || 0) * 100), index],
      );
      for (const [moduleIndex, module] of course.modules.entries()) {
        await connection.query(
          `INSERT INTO course_modules (id,course_id,title,short_title,difficulty,lessons,xp,tone,sort_order)
           VALUES (?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE course_id=VALUES(course_id), title=VALUES(title), short_title=VALUES(short_title), difficulty=VALUES(difficulty), lessons=VALUES(lessons), xp=VALUES(xp), tone=VALUES(tone), sort_order=VALUES(sort_order)`,
          [module.id, course.id, module.title, module.short, module.difficulty, module.lessons, module.xp, module.tone, moduleIndex],
        );
      }
    }

    const [tables] = await connection.query("SHOW TABLES");
    const names = tables.map(row => Object.values(row)[0]);
    console.log(`MySQL ok · ${names.length} tabelas: ${names.join(", ")}`);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error("Falha na migração MySQL:", error instanceof Error ? error.message : error);
  process.exit(1);
});

import { connect } from "./mysql-env.mjs";

try {
  const connection = await connect(true).catch(() => connect(false));
  const [rows] = await connection.query("SHOW TABLES");
  const names = rows.map(row => Object.values(row)[0]);
  console.log("connected");
  console.log(names.length ? names.join(",") : "(nenhuma tabela)");
  if (names.includes("accounts")) {
    const [demoRows] = await connection.query("SELECT user_id,name,plan,system_role,plan_expires_at FROM accounts WHERE user_id LIKE 'demo-%' ORDER BY user_id");
    console.log(`demo-users:${demoRows.length}`);
    for (const row of demoRows) console.log(`${row.user_id}|${row.name}|${row.system_role}|${row.plan}|${row.plan_expires_at || "sem-expiracao"}`);
  }
  if (names.includes("platform_settings")) {
    const [settings] = await connection.query("SELECT setting_value FROM platform_settings WHERE setting_key='printed_certificate_fee_cents'");
    console.log(`printed-certificate-fee:${settings[0]?.setting_value || "missing"}`);
  }
  await connection.end();
} catch (error) {
  console.error("fail:", error instanceof Error ? error.message : error);
  process.exit(1);
}

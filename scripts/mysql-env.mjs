import { readFileSync, existsSync } from "node:fs";
import { createConnection } from "mysql2/promise";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv(resolve(root, ".env"));
loadDotEnv(resolve(root, ".dev.vars"));

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} no arquivo .env`);
  return value;
}

async function connect(ssl = true) {
  const config = {
    host: required("MYSQL_HOST"),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: required("MYSQL_USER"),
    password: required("MYSQL_PASSWORD"),
    database: required("MYSQL_DATABASE"),
    multipleStatements: true,
    charset: "utf8mb4",
    connectTimeout: 20000,
  };
  return createConnection(ssl ? { ...config, ssl: { rejectUnauthorized: false } } : config);
}

export { connect, loadDotEnv, required, root };

import { createConnection, type Connection } from "mysql2/promise";

export type MysqlEnv = {
  MYSQL_HOST?: string;
  MYSQL_PORT?: string;
  MYSQL_USER?: string;
  MYSQL_PASSWORD?: string;
  MYSQL_DATABASE?: string;
};

export type MysqlDb = {
  query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<unknown>;
};

export function mysqlConfigured(env: MysqlEnv) {
  return Boolean(env.MYSQL_HOST && env.MYSQL_USER && env.MYSQL_PASSWORD && env.MYSQL_DATABASE);
}

async function openConnection(env: MysqlEnv): Promise<Connection> {
  if (!mysqlConfigured(env)) throw new Error("MySQL não configurado.");
  const base = {
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT || 3306),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    charset: "utf8mb4" as const,
    connectTimeout: 15000,
    disableEval: true,
  };
  try {
    return await createConnection({ ...base, ssl: { rejectUnauthorized: false } });
  } catch {
    return createConnection(base);
  }
}

function toMysqlParams(params: unknown[]) {
  return params.map(value => {
    if (value instanceof Uint8Array && typeof Buffer !== "undefined" && !Buffer.isBuffer(value)) {
      return Buffer.from(value);
    }
    return value;
  });
}

export async function withMysql<T>(env: MysqlEnv, run: (db: MysqlDb) => Promise<T>): Promise<T> {
  const connection = await openConnection(env);
  const db: MysqlDb = {
    async query<TRow extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const [rows] = await connection.query(sql, toMysqlParams(params));
      return (Array.isArray(rows) ? rows : []) as TRow[];
    },
    async execute(sql: string, params: unknown[] = []) {
      const [result] = await connection.execute(sql, toMysqlParams(params));
      return result;
    },
  };
  try {
    return await run(db);
  } finally {
    await connection.end().catch(() => undefined);
  }
}

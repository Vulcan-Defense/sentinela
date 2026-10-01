import { mysqlConfigured, withMysql, type MysqlDb, type MysqlEnv } from "./mysql";
import { resolveAuthIdentity } from "./manual-auth";

type PhotoEnv = MysqlEnv & {
  PROFILE_IMAGES?: { get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>; put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType: string } }): Promise<unknown> };
  AUTH_SECRET?: string;
};

const PHOTO_TABLE = `CREATE TABLE IF NOT EXISTS profile_photos (
  user_id VARCHAR(128) NOT NULL,
  content_type VARCHAR(64) NOT NULL,
  photo MEDIUMBLOB NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function photoBody(value: unknown) {
  if (!value) return null;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data)) {
    return Uint8Array.from((value as { data: number[] }).data);
  }
  return null;
}

async function ensurePhotoTable(db: MysqlDb) {
  await db.query(PHOTO_TABLE);
}

export async function handleProfilePhoto(request: Request, env: PhotoEnv) {
  const url = new URL(request.url);
  if (url.pathname!=="/api/profile/photo"&&!url.pathname.startsWith("/api/profile/photo/")) return null;
  try {
    const identity = await resolveAuthIdentity(request, env);
    if (!identity?.userId) return jsonError("Faça login para acessar a foto do perfil.", 401);
    if (!mysqlConfigured(env)) return jsonError("MySQL indisponível.", 503);

    if (request.method === "GET") {
      const requestedUserId=url.pathname.startsWith("/api/profile/photo/")?decodeURIComponent(url.pathname.slice("/api/profile/photo/".length)):"";
      const targetUserId=requestedUserId||identity.userId;
      const account = (await withMysql(env, async db => {
        await ensurePhotoTable(db);
        return db.query<{ photoKey: string | null }>("SELECT profile_photo_key AS photoKey FROM accounts WHERE user_id=? AND status='active' LIMIT 1", [targetUserId]);
      }))[0];
      if (!account?.photoKey) return new Response(null, { status: 404 });
      if (env.PROFILE_IMAGES && account.photoKey.startsWith("profiles/")) {
        const object = await env.PROFILE_IMAGES.get(account.photoKey);
        if (!object) return new Response(null, { status: 404 });
        return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "image/webp", "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" } });
      }
      const row = (await withMysql(env, db => db.query<{ contentType: string; photo: unknown }>("SELECT content_type AS contentType, photo FROM profile_photos WHERE user_id=? LIMIT 1", [targetUserId])))[0];
      const body = photoBody(row?.photo);
      if (!row || !body) return new Response(null, { status: 404 });
      return new Response(body, { headers: { "content-type": row.contentType || "image/webp", "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" } });
    }

    if (request.method === "POST") {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) return jsonError("Origem inválida.", 403);
      const contentType = (request.headers.get("content-type") || "").split(";")[0].trim();
      if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return jsonError("Use uma imagem JPG, PNG ou WebP.", 415);
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 2 * 1024 * 1024) return jsonError("A foto deve ter no máximo 2 MB.", 413);
      const now = new Date().toISOString();
      const key = `mysql:${identity.userId}`;
      await withMysql(env, async db => {
        await ensurePhotoTable(db);
        await db.execute(
          "INSERT INTO profile_photos (user_id,content_type,photo,updated_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE content_type=VALUES(content_type), photo=VALUES(photo), updated_at=VALUES(updated_at)",
          [identity.userId, contentType, Buffer.from(bytes), now],
        );
        await db.execute("UPDATE accounts SET profile_photo_key=?,updated_at=? WHERE user_id=?", [key, now, identity.userId]);
      });
      return Response.json({ photoUrl: `/api/profile/photo?v=${Date.now()}` });
    }

    return jsonError("Método não permitido.", 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível gravar a foto.";
    return jsonError(message.includes("PROFILE_IMAGES") || message.includes("undefined") ? "Armazenamento de fotos indisponível." : message, 500);
  }
}

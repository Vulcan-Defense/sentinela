import { mysqlConfigured, withMysql, type MysqlDb, type MysqlEnv } from "./mysql";
import { resolveAuthIdentity } from "./manual-auth";

type CommunityEnv = MysqlEnv & { AUTH_SECRET?: string };
type FeedbackKind = "idea" | "bug";
type FeedbackStatus = "open" | "in_progress" | "done" | "archived";

const FEEDBACK_STATUSES = new Set<FeedbackStatus>(["open", "in_progress", "done", "archived"]);

const FEEDBACK_TABLE = `CREATE TABLE IF NOT EXISTS community_feedback (
  id VARCHAR(40) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  admin_note TEXT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_community_feedback_user (user_id, created_at),
  KEY idx_community_feedback_status (status, created_at),
  CONSTRAINT fk_community_feedback_account FOREIGN KEY (user_id) REFERENCES accounts (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function ensureCommunitySchema(db: MysqlDb) {
  await db.query("ALTER TABLE accounts ADD COLUMN community_member TINYINT(1) NOT NULL DEFAULT 0").catch(() => undefined);
  await db.query(FEEDBACK_TABLE);
  await db.query("ALTER TABLE community_feedback ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'open'").catch(() => undefined);
  await db.query("ALTER TABLE community_feedback ADD COLUMN admin_note TEXT NULL").catch(() => undefined);
  await db.query("ALTER TABLE community_feedback ADD COLUMN updated_at VARCHAR(40) NULL").catch(() => undefined);
}

async function isCommunityMember(db: MysqlDb, userId: string) {
  const row = (await db.query<{ communityMember: number }>("SELECT community_member AS communityMember FROM accounts WHERE user_id=? LIMIT 1", [userId]))[0];
  return Boolean(row?.communityMember);
}

async function requireAdmin(db: MysqlDb, userId: string) {
  const row = (await db.query<{ systemRole: string }>("SELECT system_role AS systemRole FROM accounts WHERE user_id=? LIMIT 1", [userId]))[0];
  return row?.systemRole === "admin";
}

export async function handleCommunityApi(request: Request, env: CommunityEnv) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/community/")) return null;
  const identity = await resolveAuthIdentity(request, env);
  if (!identity?.userId) return json({ error: "Faça login para acessar a Comunidade Sentinela." }, 401);
  if (!mysqlConfigured(env)) return json({ error: "MySQL indisponível." }, 503);

  if (url.pathname === "/api/community/feedback" && request.method === "POST") {
    if (!sameOrigin(request)) return json({ error: "Origem inválida." }, 403);
    try {
      const body = await request.json() as { kind?: string; title?: string; message?: string };
      const kind: FeedbackKind | null = body.kind === "bug" ? "bug" : body.kind === "idea" ? "idea" : null;
      const title = String(body.title ?? "").trim().slice(0, 160);
      const message = String(body.message ?? "").trim().slice(0, 4000);
      if (!kind) return json({ error: "Informe se é uma sugestão ou um bug." }, 400);
      if (title.length < 4) return json({ error: "O título precisa ter pelo menos 4 caracteres." }, 400);
      if (message.length < 12) return json({ error: "Descreva a mensagem com pelo menos 12 caracteres." }, 400);
      const id = `CS-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
      const createdAt = new Date().toISOString();
      await withMysql(env, async db => {
        await ensureCommunitySchema(db);
        if (!await isCommunityMember(db, identity.userId)) throw new Error("COMMUNITY_FORBIDDEN");
        const today = createdAt.slice(0, 10);
        const count = (await db.query<{ total: number }>("SELECT COUNT(*) AS total FROM community_feedback WHERE user_id=? AND created_at>=?", [identity.userId, `${today}T00:00:00.000Z`]))[0];
        if (Number(count?.total || 0) >= 8) throw new Error("COMMUNITY_LIMIT");
        await db.execute(
          "INSERT INTO community_feedback (id,user_id,kind,title,message,status,admin_note,created_at,updated_at) VALUES (?,?,?,?,?,'open','',?,?)",
          [id, identity.userId, kind, title, message, createdAt, createdAt],
        );
      });
      return json({ id, saved: true }, 201);
    } catch (error) {
      const text = error instanceof Error ? error.message : "";
      if (text === "COMMUNITY_FORBIDDEN") return json({ error: "Este menu é exclusivo de quem se cadastrou com o código da Comunidade Sentinela." }, 403);
      if (text === "COMMUNITY_LIMIT") return json({ error: "Limite diário de envios da comunidade atingido. Tente amanhã." }, 429);
      console.error("community-feedback", error);
      return json({ error: "Não foi possível enviar sua mensagem." }, 500);
    }
  }

  if (url.pathname === "/api/community/admin") {
    try {
      const admin = await withMysql(env, async db => {
        await ensureCommunitySchema(db);
        return requireAdmin(db, identity.userId);
      });
      if (!admin) return json({ error: "Apenas administradores podem gerenciar a Comunidade Sentinela." }, 403);

      if (request.method === "GET") {
        const kind = url.searchParams.get("kind");
        const status = url.searchParams.get("status");
        const items = await withMysql(env, db => db.query<{
          id: string; userId: string; name: string; email: string; kind: string; title: string; message: string; status: string; adminNote: string | null; createdAt: string; updatedAt: string | null;
        }>(
          `SELECT f.id, f.user_id AS userId, a.name, a.email, f.kind, f.title, f.message, COALESCE(f.status,'open') AS status, f.admin_note AS adminNote, f.created_at AS createdAt, f.updated_at AS updatedAt
           FROM community_feedback f JOIN accounts a ON a.user_id=f.user_id
           ORDER BY f.created_at DESC`,
        ));
        const members = await withMysql(env, db => db.query<{
          userId: string; name: string; email: string; communityMember: number; createdAt: string;
        }>("SELECT user_id AS userId, name, email, community_member AS communityMember, created_at AS createdAt FROM accounts ORDER BY community_member DESC, name"));
        const filtered = items.filter(item => {
          if (kind === "idea" || kind === "bug") return item.kind === kind;
          return true;
        }).filter(item => {
          if (status && FEEDBACK_STATUSES.has(status as FeedbackStatus)) return item.status === status;
          return true;
        });
        return json({
          items: filtered.map(item => ({ ...item, adminNote: item.adminNote || "" })),
          members: members.map(item => ({ ...item, communityMember: Boolean(item.communityMember) })),
          counts: {
            total: items.length,
            ideas: items.filter(item => item.kind === "idea").length,
            bugs: items.filter(item => item.kind === "bug").length,
            open: items.filter(item => item.status === "open").length,
            members: members.filter(item => item.communityMember).length,
          },
        });
      }

      if (!sameOrigin(request)) return json({ error: "Origem inválida." }, 403);

      if (request.method === "PATCH") {
        const body = await request.json() as { id?: string; status?: string; adminNote?: string; userId?: string; communityMember?: boolean };
        if (body.userId && typeof body.communityMember === "boolean") {
          const updatedAt = new Date().toISOString();
          const result = await withMysql(env, db => db.execute("UPDATE accounts SET community_member=?,updated_at=? WHERE user_id=?", [body.communityMember ? 1 : 0, updatedAt, body.userId]));
          if (!(result as { affectedRows?: number }).affectedRows) return json({ error: "Conta não encontrada." }, 404);
          return json({ updated: true, userId: body.userId, communityMember: body.communityMember });
        }
        if (!body.id) return json({ error: "Informe o registro da comunidade." }, 400);
        const status = body.status && FEEDBACK_STATUSES.has(body.status as FeedbackStatus) ? body.status : null;
        const note = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 2000) : null;
        if (!status && note === null) return json({ error: "Informe o status ou a anotação." }, 400);
        const updatedAt = new Date().toISOString();
        await withMysql(env, async db => {
          if (status && note !== null) await db.execute("UPDATE community_feedback SET status=?,admin_note=?,updated_at=? WHERE id=?", [status, note, updatedAt, body.id]);
          else if (status) await db.execute("UPDATE community_feedback SET status=?,updated_at=? WHERE id=?", [status, updatedAt, body.id]);
          else await db.execute("UPDATE community_feedback SET admin_note=?,updated_at=? WHERE id=?", [note, updatedAt, body.id]);
        });
        return json({ updated: true, id: body.id, status, adminNote: note, updatedAt });
      }

      if (request.method === "DELETE") {
        const body = await request.json() as { id?: string };
        if (!body.id) return json({ error: "Informe o registro da comunidade." }, 400);
        const result = await withMysql(env, db => db.execute("DELETE FROM community_feedback WHERE id=?", [body.id]));
        if (!(result as { affectedRows?: number }).affectedRows) return json({ error: "Registro não encontrado." }, 404);
        return json({ deleted: true, id: body.id });
      }

      return json({ error: "Método não permitido." }, 405);
    } catch (error) {
      console.error("community-admin", error);
      return json({ error: "Não foi possível gerenciar a Comunidade Sentinela." }, 500);
    }
  }

  return json({ error: "Rota não encontrada." }, 404);
}

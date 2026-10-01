import { resolveAuthIdentity } from "./manual-auth";
import { mysqlConfigured, withMysql, type MysqlEnv } from "./mysql";
import { completeModule, enrollCourse, loadMe, loadRanking, passQuiz, recordLessonStep, updateProfile } from "./user-store";

type MeEnv = MysqlEnv & {
  AUTH_SECRET?: string;
  CF_EMAIL_ACCOUNT_ID?: string;
  CF_EMAIL_API_TOKEN?: string;
  CF_EMAIL_FROM?: string;
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function requireUser(request: Request, env: MeEnv): Promise<{identity: NonNullable<Awaited<ReturnType<typeof resolveAuthIdentity>>>; error?: never} | {identity?: never; error: Response}> {
  const identity = await resolveAuthIdentity(request, env);
  if (!identity?.userId) return { error: json({ error: "Faça login para continuar." }, 401) };
  return { identity };
}

export async function handleMeApi(request: Request, env: MeEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/api/db/health" && request.method === "GET") {
    if (!mysqlConfigured(env)) return json({ mysql: false, storage: "mysql" }, 503);
    try {
      const ping = await withMysql(env, async db => (await db.query<{ ok: number }>("SELECT 1 AS ok"))[0]?.ok === 1);
      return json({ mysql: ping, host: env.MYSQL_HOST, database: env.MYSQL_DATABASE });
    } catch (error) {
      return json({ mysql: false, error: error instanceof Error ? error.message : "Falha ao conectar." }, 503);
    }
  }

  if (url.pathname === "/api/ranking" && request.method === "GET") {
    if (!mysqlConfigured(env)) return json({ people: [], error: "MySQL indisponível." }, 503);
    try {
      const people = await withMysql(env, db => loadRanking(db));
      return json({ people });
    } catch (error) {
      console.error("mysql-ranking", error);
      return json({ people: [], error: "Ranking indisponível no MySQL." }, 503);
    }
  }

  if (!url.pathname.startsWith("/api/me")) return null;
  const auth = await requireUser(request, env);
  if (!auth.identity) return auth.error;
  const identity = auth.identity;

  try {
    if (!mysqlConfigured(env)) return json({ error: "MySQL indisponível." }, 503);
    if (url.pathname === "/api/me/activity" && request.method === "GET") {
      const currentYear = new Date().getUTCFullYear();
      const requestedYear = Number(url.searchParams.get("year") || currentYear);
      if (!Number.isInteger(requestedYear) || requestedYear < 2020 || requestedYear > currentYear) return json({ error: "Ano inválido." }, 400);
      const start = `${requestedYear}-01-01`;
      const end = `${requestedYear + 1}-01-01`;
      const sql = `SELECT day, COUNT(*) AS events FROM (
        SELECT SUBSTR(created_at,1,10) AS day FROM user_activity_days WHERE user_id=?
        UNION ALL SELECT SUBSTR(studied_at,1,10) AS day FROM lesson_steps WHERE user_id=?
        UNION ALL SELECT SUBSTR(completed_at,1,10) AS day FROM module_completions WHERE user_id=?
        UNION ALL SELECT SUBSTR(passed_at,1,10) AS day FROM quiz_passes WHERE user_id=?
      ) activity WHERE day>=? AND day<? GROUP BY day ORDER BY day`;
      const bindings = [identity.userId, identity.userId, identity.userId, identity.userId, start, end];
      const days = await withMysql(env, db => db.query<{ day:string; events:number }>(sql, bindings));
      return json({ year: requestedYear, days: days.map(row => ({ day: row.day, events: Number(row.events) })) });
    }

    if (url.pathname === "/api/me" && request.method === "GET") {
      const me = await withMysql(env, db => loadMe(db, identity.userId));
      if (!me) return json({ error: "Conta ainda não sincronizada. Recarregue após o login." }, 404);
      return json({ me });
    }

    if (!sameOrigin(request)) return json({ error: "Origem inválida." }, 403);

    if (url.pathname === "/api/me" && request.method === "PATCH") {
      const body = await request.json() as {name?:string;role?:string;goal?:string;phone?:string;postalCode?:string;addressLine?:string;addressNumber?:string;addressComplement?:string;neighborhood?:string;city?:string;state?:string;receivePrintedCertificate?:boolean;addressConfirmed?:boolean};
      const me = await withMysql(env, db => updateProfile(db, identity.userId, body));
      return json({ me });
    }

    if (url.pathname === "/api/me/enrollments" && request.method === "POST") {
      const body = await request.json() as { courseId?: string };
      if (!body.courseId) return json({ error: "Informe o curso." }, 400);
      const me = await withMysql(env, db => enrollCourse(db, identity.userId, body.courseId!));
      return json({ me });
    }

    if (url.pathname === "/api/me/modules" && request.method === "POST") {
      const body = await request.json() as { moduleId?: string };
      if (!body.moduleId) return json({ error: "Informe o módulo." }, 400);
      const me = await withMysql(env, db => completeModule(db, identity.userId, body.moduleId!));
      return json({ me });
    }

    if (url.pathname === "/api/me/quizzes" && request.method === "POST") {
      const body = await request.json() as { courseId?: string };
      if (!body.courseId) return json({ error: "Informe o curso." }, 400);
      const me = await withMysql(env, db => passQuiz(db, identity.userId, body.courseId!));
      return json({ me });
    }

    if (url.pathname === "/api/me/lesson-steps" && request.method === "POST") {
      const body = await request.json() as { moduleId?: string; step?: number };
      if (!body.moduleId || typeof body.step !== "number") return json({ error: "Informe módulo e etapa." }, 400);
      const me = await withMysql(env, db => recordLessonStep(db, identity.userId, body.moduleId!, body.step!));
      return json({ me });
    }

    return json({ error: "Rota não encontrada." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gravar o progresso.";
    const status = /não encontrado|Matricule-se|requer o plano|inválid/i.test(message) ? 400 : 500;
    console.error("mysql-me", error);
    return json({ error: message }, status);
  }
}

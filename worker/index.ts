/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleManualAuth, resolveAuthIdentity, resolveCommunityAccess, vulcanMeetPreflight, withVulcanMeetCors } from "./manual-auth";
import { handleGoogleAuth } from "./google-auth";
import { handleCertificationApi } from "./certifications";
import { handleMeApi } from "./me";
import { handleProfilePhoto } from "./profile-photo";
import { handleCommunityApi } from "./community";
import { handleAdminAccess } from "./admin-access";
import { handleMeetingAudit } from "./meeting-audit";
import { enrollPaidCourse, findAccountByUserId, upsertAccount } from "./user-store";
import { mysqlConfigured, withMysql } from "./mysql";
import { claimOffensivePrize, loadOffensiveState, recordPlatformLoginDay } from "./ofensiva";
import { enforceMysqlPlanExpiry, planCycleWindow } from "./plan-cycle";
import { courses } from "../data/site-catalog";

interface Env {
  ASSETS: Fetcher;
  PROFILE_IMAGES?: R2Bucket;
  AUTH_SECRET?: string;
  CF_EMAIL_ACCOUNT_ID?: string;
  CF_EMAIL_API_TOKEN?: string;
  CF_EMAIL_FROM?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MYSQL_HOST?: string;
  MYSQL_PORT?: string;
  MYSQL_USER?: string;
  MYSQL_PASSWORD?: string;
  MYSQL_DATABASE?: string;
  MEETING_AUDIT_TOKEN?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const INITIAL_ADMIN_EMAILS = new Set(["styvie2012@gmail.com"]);

const STRIPE_PLANS = {
  basico: { name: "VulcanAcademy - Plano Básico", amount: 2990 },
  medio: { name: "VulcanAcademy - Plano Médio", amount: 5990 },
  avancado: { name: "VulcanAcademy - Plano Avançado", amount: 10000 },
} as const;

const STRIPE_PREMIUM_COURSES = {
  "ai-redteam": "Red Team para Inteligência Artificial",
  "llm-security": "Segurança de LLMs e RAG",
  "agentic-defense": "Defesa de Agentes Autônomos",
} as const;

async function completedModuleIds(env: Env, userId: string) {
  if (!mysqlConfigured(env)) throw new Error("O SQL novo não está configurado para certificados.");
  const rows = await withMysql(env, db => db.query<{ moduleId:string }>("SELECT module_id AS moduleId FROM module_completions WHERE user_id=?", [userId]));
  return new Set(rows.map(row => row.moduleId));
}

function courseIsComplete(courseId: string, completed: Set<string>) {
  const course = courses.find(item => item.id === courseId);
  return Boolean(course && course.modules.length && course.modules.every(module => completed.has(module.id)));
}

async function printedCertificateFee(env: Env) {
  if (!mysqlConfigured(env)) throw new Error("O SQL novo não está configurado para certificados.");
  return withMysql(env, async db => {
    const at = new Date().toISOString();
    await db.execute("INSERT IGNORE INTO platform_settings (setting_key,setting_value,updated_at) VALUES ('printed_certificate_fee_cents','18990',?)", [at]);
    const setting = (await db.query<{ value:string }>("SELECT setting_value AS value FROM platform_settings WHERE setting_key='printed_certificate_fee_cents' LIMIT 1"))[0];
    return Math.max(100, Number(setting?.value) || 18990);
  });
}

function stripeForm(fields: Record<string, string>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

async function stripeRequest(env: Env, path: string, init?: RequestInit) {
  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Checkout indisponível: configuração segura do Stripe pendente." }, { status: 503 });
  }
  return fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(init?.body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
  });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/auth/manual/") && request.method === "OPTIONS") {
      const preflight = vulcanMeetPreflight(request);
      if (preflight) return preflight;
    }

    const adminAccessResponse=await handleAdminAccess(request,env);if(adminAccessResponse)return adminAccessResponse;

    if (url.hostname === "verify.vulcandefense.com.br") {
      const passThrough =
        url.pathname === "/verify" ||
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/_next/") ||
        url.pathname.startsWith("/_vinext/") ||
        url.pathname === "/favicon.svg" ||
        url.pathname === "/favicon.ico" ||
        url.pathname === "/logo-vulcan-defense.png";
      if (!passThrough) {
        url.pathname = "/verify";
        return handler.fetch(new Request(url.toString(), request), env, ctx);
      }
    }

    const googleAuthResponse = await handleGoogleAuth(request, env);
    if (googleAuthResponse) return googleAuthResponse;

    const manualAuthResponse = await handleManualAuth(request, env);
    if (manualAuthResponse) return withVulcanMeetCors(request, manualAuthResponse);

    const meetingAuditResponse = await handleMeetingAudit(request, env);
    if (meetingAuditResponse) return meetingAuditResponse;

    const certificationResponse = await handleCertificationApi(request, env);
    if (certificationResponse) return certificationResponse;

    const meResponse = await handleMeApi(request, env);
    if (meResponse) return meResponse;

    const photoResponse = await handleProfilePhoto(request, env);
    if (photoResponse) return photoResponse;

    const communityResponse = await handleCommunityApi(request, env);
    if (communityResponse) return communityResponse;

    if (url.pathname === "/api/stripe/config" && request.method === "GET") {
      return Response.json({
        configured: Boolean(env.STRIPE_PUBLISHABLE_KEY && env.STRIPE_SECRET_KEY),
        publishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
        mode: env.STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") ? "test" : "live",
      }, { headers: { "cache-control": "no-store" } });
    }

    if (url.pathname === "/api/stripe/checkout" && request.method === "POST") {
      const identity = await resolveAuthIdentity(request, env);
      if (!identity?.userId || !identity.email) return Response.json({ error: "Faça login para assinar um plano." }, { status: 401 });
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
      const body = await request.json() as { kind?: "plan" | "course" | "printed_certificate"; id?: string };
      const common = {
        "success_url": `${url.origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url": `${url.origin}/?payment=cancelled`,
        "customer_email": identity.email,
        "client_reference_id": identity.userId,
        "metadata[user_id]": identity.userId,
        "metadata[kind]": body.kind || "",
        "metadata[item_id]": body.id || "",
        "line_items[0][quantity]": "1",
        "payment_method_types[0]": "card",
        "locale": "pt-BR",
      };
      let fields: Record<string, string>;
      if (body.kind === "plan" && body.id && body.id in STRIPE_PLANS) {
        const plan = STRIPE_PLANS[body.id as keyof typeof STRIPE_PLANS];
        fields = {
          ...common,
          mode: "subscription",
          "line_items[0][price_data][currency]": "brl",
          "line_items[0][price_data][unit_amount]": String(plan.amount),
          "line_items[0][price_data][recurring][interval]": "month",
          "line_items[0][price_data][product_data][name]": plan.name,
          "subscription_data[metadata][user_id]": identity.userId,
          "subscription_data[metadata][plan]": body.id,
        };
      } else if (body.kind === "course" && body.id && body.id in STRIPE_PREMIUM_COURSES) {
        fields = {
          ...common,
          mode: "payment",
          "line_items[0][price_data][currency]": "brl",
          "line_items[0][price_data][unit_amount]": "50000",
          "line_items[0][price_data][product_data][name]": STRIPE_PREMIUM_COURSES[body.id as keyof typeof STRIPE_PREMIUM_COURSES],
        };
      } else if(body.kind==="printed_certificate"&&body.id){
        if(!mysqlConfigured(env))return Response.json({error:"O SQL novo não está configurado para certificados."},{status:503});
        const eligible=await withMysql(env,async db=>(await db.query<{id:string;courseId:string;addressConfirmed:number;receivePrintedCertificate:number;phone:string;postalCode:string;addressLine:string;addressNumber:string;city:string;state:string}>(`SELECT c.id,c.course_id AS courseId,a.address_confirmed AS addressConfirmed,a.receive_printed_certificate AS receivePrintedCertificate,a.phone,a.postal_code AS postalCode,a.address_line AS addressLine,a.address_number AS addressNumber,a.city,a.state
          FROM certificates c JOIN accounts a ON a.user_id=c.user_id WHERE c.id=? AND c.user_id=? AND c.status='valid' LIMIT 1`,[body.id,identity.userId]))[0]);
        if(!eligible)return Response.json({error:"Certificado não encontrado para esta conta."},{status:404});
        const completed=await completedModuleIds(env,identity.userId);
        if(!courseIsComplete(eligible.courseId,completed))return Response.json({error:"Conclua todos os módulos do curso antes de solicitar o certificado impresso."},{status:403});
        if(!eligible.addressConfirmed||!eligible.receivePrintedCertificate||!eligible.phone||!eligible.postalCode||!eligible.addressLine||!eligible.addressNumber||!eligible.city||!eligible.state)return Response.json({error:"Confirme telefone e endereço completo no Perfil antes de solicitar a versão impressa."},{status:409});
        const amount=await printedCertificateFee(env);
        fields={...common,mode:"payment","line_items[0][price_data][currency]":"brl","line_items[0][price_data][unit_amount]":String(amount),"line_items[0][price_data][product_data][name]":"Certificado impresso VulcanAcademy"};
      } else {
        return Response.json({ error: "Plano ou curso inválido." }, { status: 400 });
      }
      const stripeResponse = await stripeRequest(env, "/checkout/sessions", { method: "POST", body: stripeForm(fields) });
      if (!stripeResponse.ok) {
        const error = await stripeResponse.json().catch(() => null) as { error?: { message?: string } } | null;
        return Response.json({ error: error?.error?.message || "Não foi possível iniciar o checkout." }, { status: stripeResponse.status });
      }
      const session = await stripeResponse.json() as { id: string; url: string };
      return Response.json({ sessionId: session.id, checkoutUrl: session.url, publishableKey: env.STRIPE_PUBLISHABLE_KEY });
    }

    if (url.pathname === "/api/stripe/confirm" && request.method === "GET") {
      const identity = await resolveAuthIdentity(request, env);
      if (!identity?.userId) return Response.json({ error: "Faça login para confirmar o pagamento." }, { status: 401 });
      const sessionId = url.searchParams.get("session_id");
      if (!sessionId?.startsWith("cs_")) return Response.json({ error: "Sessão de pagamento inválida." }, { status: 400 });
      const stripeResponse = await stripeRequest(env, `/checkout/sessions/${encodeURIComponent(sessionId)}`);
      if (!stripeResponse.ok) return Response.json({ error: "Não foi possível confirmar o pagamento." }, { status: 502 });
      const session = await stripeResponse.json() as { payment_status?: string; status?: string; client_reference_id?: string; metadata?: { kind?: string; item_id?: string } };
      if (session.client_reference_id !== identity.userId) return Response.json({ error: "Pagamento não pertence a esta conta." }, { status: 403 });
      if (session.payment_status !== "paid" && session.status !== "complete") return Response.json({ error: "Pagamento ainda não confirmado." }, { status: 409 });
      const kind = session.metadata?.kind;
      const itemId = session.metadata?.item_id;
      if(!mysqlConfigured(env))return Response.json({error:"MySQL indisponível."},{status:503});
      if (kind === "plan" && itemId && itemId in STRIPE_PLANS) {
        const buyer=await withMysql(env,async db=>(await db.query<{systemRole:string}>("SELECT system_role AS systemRole FROM accounts WHERE user_id=?",[identity.userId]))[0]);
        const cycle=buyer?.systemRole==="admin"?{startedAt:null,expiresAt:null}:planCycleWindow();
        await withMysql(env, db => db.execute("UPDATE accounts SET plan=?,plan_started_at=?,plan_expires_at=?,updated_at=? WHERE user_id=?", [itemId,cycle.startedAt,cycle.expiresAt,cycle.startedAt,identity.userId]));
        return Response.json({ confirmed: true, kind, plan: itemId });
      }
      if (kind === "course" && itemId && itemId in STRIPE_PREMIUM_COURSES) {
        await withMysql(env, db => enrollPaidCourse(db, identity.userId, itemId, sessionId));
        return Response.json({ confirmed: true, kind, courseId: itemId });
      }
      if(kind==="printed_certificate"&&itemId){
        if(!mysqlConfigured(env))return Response.json({error:"O SQL novo não está configurado para certificados."},{status:503});
        const row=await withMysql(env,async db=>(await db.query<{certificateId:string;courseId:string;studentName:string;phone:string;postalCode:string;addressLine:string;addressNumber:string;addressComplement:string;neighborhood:string;city:string;state:string;addressConfirmed:number}>(`SELECT c.id AS certificateId,c.course_id AS courseId,c.student_name AS studentName,a.phone,a.postal_code AS postalCode,a.address_line AS addressLine,a.address_number AS addressNumber,a.address_complement AS addressComplement,a.neighborhood,a.city,a.state,a.address_confirmed AS addressConfirmed
          FROM certificates c JOIN accounts a ON a.user_id=c.user_id WHERE c.id=? AND c.user_id=? AND c.status='valid' LIMIT 1`,[itemId,identity.userId]))[0]);
        if(!row||!row.addressConfirmed)return Response.json({error:"Endereço de entrega não confirmado."},{status:409});
        const amount=await printedCertificateFee(env);const at=new Date().toISOString();const requestId=`PCR-${crypto.randomUUID().replaceAll("-","").slice(0,16).toUpperCase()}`;
        const address=[`${row.addressLine}, ${row.addressNumber}`,row.addressComplement,row.neighborhood,`${row.city}/${row.state}`,`CEP ${row.postalCode}`].filter(Boolean).join(" · ");
        await withMysql(env,db=>db.execute(`INSERT INTO printed_certificate_requests (id,user_id,certificate_id,course_id,student_name,phone,delivery_address,amount_cents,currency,status,stripe_session_id,created_at,paid_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'brl','paid',?,?,?,?) ON DUPLICATE KEY UPDATE phone=VALUES(phone),delivery_address=VALUES(delivery_address),amount_cents=VALUES(amount_cents),status='paid',stripe_session_id=VALUES(stripe_session_id),paid_at=VALUES(paid_at),updated_at=VALUES(updated_at)`,[requestId,identity.userId,row.certificateId,row.courseId,row.studentName,row.phone,address,amount,sessionId,at,at,at]));
        return Response.json({confirmed:true,kind,printedCertificate:true});
      }
      return Response.json({ error: "Item de pagamento não reconhecido." }, { status: 400 });
    }

    if (url.pathname === "/api/account") {
      const identity=await resolveAuthIdentity(request,env);
      const userId=identity?.userId;
      const verifiedEmail=identity?.email;
      if(!userId||!verifiedEmail)return Response.json({error:"Faça login para continuar."},{status:401});
      if(!mysqlConfigured(env))return Response.json({error:"MySQL indisponível."},{status:503});
      if(request.method==="POST"&&identity.source==="platform"){
        const body=await request.json() as {name?:string;role?:string;accessCode?:string};
        const access=await resolveCommunityAccess(env,body.accessCode);
        if(!access.ok)return Response.json({error:access.error},{status:403});
        const encodedFullName=request.headers.get("oai-authenticated-user-full-name");
        const fullNameEncoding=request.headers.get("oai-authenticated-user-full-name-encoding");
        let identityName="";
        if(encodedFullName&&fullNameEncoding==="percent-encoded-utf-8"){
          try{identityName=decodeURIComponent(encodedFullName).trim()}catch{/* usa o e-mail como fallback */}
        }
        const name=body.name?.trim()||identityName||verifiedEmail.split("@")[0];
        const role=body.role?.trim()||"Estudante de Segurança";
        const systemRole=INITIAL_ADMIN_EMAILS.has(verifiedEmail)?"admin":"aluno";
        const now=new Date().toISOString();
        try {
          await withMysql(env, db => upsertAccount(db, {
            userId, email: verifiedEmail, name, role, systemRole, plan: "gratuito", status: "active", emailVerifiedAt: now, createdAt: now, updatedAt: now, communityMember: access.communityMember,
          }));
        } catch (error) {
          console.error("mysql-create-account", error);
          return Response.json({error:"Não foi possível criar a conta no MySQL da academia."},{status:503});
        }
      }else if(request.method!=="GET"){
        return Response.json({error:"Método não permitido."},{status:405});
      }
      if(INITIAL_ADMIN_EMAILS.has(verifiedEmail))await withMysql(env,db=>db.execute("UPDATE accounts SET system_role='admin',updated_at=? WHERE user_id=?",[new Date().toISOString(),userId]));
      await withMysql(env,db=>enforceMysqlPlanExpiry(db,userId));
      const account=await withMysql(env,db=>findAccountByUserId(db,userId));
      if(!account)return Response.json({error:"Conta não encontrada. Faça seu cadastro primeiro."},{status:404});
      const isPlatformLogin = identity.source === "platform" && (request.method === "POST" || url.searchParams.get("login") === "1");
      if (isPlatformLogin) {
        try { await withMysql(env,db=>recordPlatformLoginDay(db,userId)); } catch (error) { console.error("ofensiva-platform-login", error); }
      }
      return Response.json({account:{...account,emailVerified:Boolean(account.emailVerifiedAt)},authSource:identity.source},{headers:{"cache-control":"no-store"}});
    }

    if (url.pathname === "/api/ofensiva") {
      const identity = await resolveAuthIdentity(request, env);
      if (!identity?.userId) return Response.json({ error: "Faça login para ver sua ofensiva." }, { status: 401 });
      if (request.method === "GET" || request.method === "POST") {
        try {
          if(!mysqlConfigured(env))return Response.json({error:"MySQL indisponível."},{status:503});
          const state = await withMysql(env,db=>loadOffensiveState(db,identity.userId));
          return Response.json(state, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          console.error("ofensiva", error);
          return Response.json({ error: "Não foi possível carregar os dias de ofensiva." }, { status: 500 });
        }
      }
      return Response.json({ error: "Método não permitido." }, { status: 405 });
    }

    if (url.pathname === "/api/ofensiva/prize" && request.method === "POST") {
      const identity = await resolveAuthIdentity(request, env);
      if (!identity?.userId) return Response.json({ error: "Faça login para recolher o prêmio." }, { status: 401 });
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
      try {
        if(!mysqlConfigured(env))return Response.json({error:"MySQL indisponível."},{status:503});
        const result = await withMysql(env,db=>claimOffensivePrize(db,identity.userId));
        if ("error" in result && result.error) return Response.json(result, { status: 409 });
        return Response.json(result, { headers: { "cache-control": "no-store" } });
      } catch (error) {
        console.error("ofensiva-prize", error);
        return Response.json({ error: "Não foi possível recolher o prêmio." }, { status: 500 });
      }
    }

    if(url.pathname==="/api/printed-certificate/config"&&request.method==="GET"){
      try{return Response.json({feeCents:await printedCertificateFee(env),storage:"mysql"},{headers:{"cache-control":"no-store"}})}catch{return Response.json({error:"O SQL novo não está disponível."},{status:503})}
    }

    if(url.pathname==="/api/admin/printed-certificates"){
      const adminIdentity=await resolveAuthIdentity(request,env);if(!adminIdentity?.userId)return Response.json({error:"Autenticação obrigatória."},{status:401});
      if(!mysqlConfigured(env))return Response.json({error:"O SQL novo não está configurado."},{status:503});
      const administrator=await withMysql(env,async db=>(await db.query<{systemRole:string}>("SELECT system_role AS systemRole FROM accounts WHERE user_id=? LIMIT 1",[adminIdentity.userId]))[0]);
      if(administrator?.systemRole!=="admin")return Response.json({error:"Apenas administradores podem gerenciar solicitações."},{status:403});
      if(request.method==="GET"){
        const feeCents=await printedCertificateFee(env);
        const requests=await withMysql(env,db=>db.query(`SELECT r.id,r.certificate_id AS certificateId,r.course_id AS courseId,r.student_name AS studentName,a.email,r.phone,r.delivery_address AS deliveryAddress,r.amount_cents AS amountCents,r.status,r.created_at AS createdAt,r.paid_at AS paidAt
          FROM printed_certificate_requests r JOIN accounts a ON a.user_id=r.user_id ORDER BY r.created_at DESC`));
        return Response.json({feeCents,requests,storage:"mysql"},{headers:{"cache-control":"no-store"}});
      }
      if(request.method==="PATCH"){
        const origin=request.headers.get("origin");if(origin&&origin!==url.origin)return Response.json({error:"Origem inválida."},{status:403});
        const body=await request.json() as {feeCents?:number;requestId?:string;status?:string};const at=new Date().toISOString();
        if(Number.isInteger(body.feeCents)&&body.feeCents!>=100&&body.feeCents!<=1000000){
          await withMysql(env,db=>db.execute("INSERT INTO platform_settings (setting_key,setting_value,updated_at,updated_by) VALUES ('printed_certificate_fee_cents',?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_at=VALUES(updated_at),updated_by=VALUES(updated_by)",[String(body.feeCents),at,adminIdentity.userId]));
          return Response.json({feeCents:body.feeCents});
        }
        if(body.requestId&&["paid","preparing","shipped","delivered","cancelled"].includes(body.status||"")){
          const result=await withMysql(env,db=>db.execute("UPDATE printed_certificate_requests SET status=?,updated_at=? WHERE id=?",[body.status,at,body.requestId]));
          if(!(result as {affectedRows?:number}).affectedRows)return Response.json({error:"Solicitação não encontrada."},{status:404});
          return Response.json({updated:true});
        }
        return Response.json({error:"Alteração inválida."},{status:400});
      }
      return Response.json({error:"Método não permitido."},{status:405});
    }

    if (url.pathname === "/api/admin/accounts") {
      const adminIdentity=await resolveAuthIdentity(request,env);
      const adminUserId=adminIdentity?.userId;
      if(!adminUserId)return Response.json({error:"Autenticação obrigatória."},{status:401});
      if(!mysqlConfigured(env))return Response.json({error:"MySQL indisponível."},{status:503});
      const administrator=await withMysql(env,async db=>(await db.query<{systemRole:string}>("SELECT system_role AS systemRole FROM accounts WHERE user_id=?",[adminUserId]))[0]);
      if(administrator?.systemRole!=="admin")return Response.json({error:"Apenas administradores podem gerenciar planos."},{status:403});
      if(request.method==="GET"){
        await withMysql(env,db=>enforceMysqlPlanExpiry(db));
        const result=await withMysql(env,db=>db.query("SELECT user_id AS userId,email,name,role,system_role AS systemRole,plan,status,plan_started_at AS planStartedAt,plan_expires_at AS planExpiresAt,created_at AS createdAt FROM accounts ORDER BY created_at DESC"));
        return Response.json({accounts:result,storage:"mysql"});
      }
      if(request.method==="PATCH"){
        const origin=request.headers.get("origin");
        if(origin&&origin!==url.origin)return Response.json({error:"Origem inválida."},{status:403});
        const body=await request.json() as {userId?:string;plan?:string;systemRole?:string};
        if(body.userId&&body.systemRole){
          if(!["admin","professor","aluno"].includes(body.systemRole))return Response.json({error:"Permissão inválida."},{status:400});
          if(body.userId===adminUserId&&body.systemRole!=="admin")return Response.json({error:"Você não pode remover sua própria permissão administrativa."},{status:400});
          await withMysql(env,db=>db.execute("UPDATE accounts SET system_role=?,updated_at=? WHERE user_id=?",[body.systemRole,new Date().toISOString(),body.userId]));
          const account=await withMysql(env,async db=>(await db.query("SELECT user_id AS userId,email,name,role,system_role AS systemRole,plan,status,plan_started_at AS planStartedAt,plan_expires_at AS planExpiresAt,created_at AS createdAt FROM accounts WHERE user_id=?",[body.userId]))[0]);
          return account?Response.json({account}):Response.json({error:"Usuário não encontrado."},{status:404});
        }
        const allowedPlans=new Set(["gratuito","basico","medio","avancado"]);
        if(!body.userId||!body.plan||!allowedPlans.has(body.plan))return Response.json({error:"Usuário ou plano inválido."},{status:400});
        const updatedAt=new Date().toISOString();
        const target=await withMysql(env,async db=>(await db.query<{systemRole:string}>("SELECT system_role AS systemRole FROM accounts WHERE user_id=?",[body.userId]))[0]);
        if(!target)return Response.json({error:"Usuário não encontrado."},{status:404});
        const cycle=body.plan==="gratuito"||target.systemRole==="admin"?{startedAt:null,expiresAt:null}:planCycleWindow();
        await withMysql(env,db=>db.execute("UPDATE accounts SET plan=?,plan_started_at=?,plan_expires_at=?,updated_at=? WHERE user_id=?",[body.plan,cycle.startedAt,cycle.expiresAt,updatedAt,body.userId]));
        const account=await withMysql(env,async db=>(await db.query("SELECT user_id AS userId,email,name,role,system_role AS systemRole,plan,status,plan_started_at AS planStartedAt,plan_expires_at AS planExpiresAt,created_at AS createdAt FROM accounts WHERE user_id=?",[body.userId]))[0]);
        return Response.json({account});
      }
      return Response.json({error:"Método não permitido."},{status:405});
    }

    if (url.pathname === "/api/certificates" && request.method === "GET") {
      const identity = await resolveAuthIdentity(request, env);
      if (!identity?.userId) return Response.json({ error: "Faça login para consultar seus certificados." }, { status: 401 });
      if(!mysqlConfigured(env))return Response.json({error:"O SQL novo não está configurado para certificados."},{status:503});
      const result=await withMysql(env,db=>db.query<{id:string;courseId:string;issuedAt:string}>(`SELECT id,course_id AS courseId,issued_at AS issuedAt
        FROM certificates WHERE user_id=? AND status='valid' ORDER BY issued_at DESC`,[identity.userId]));
      const completed=await completedModuleIds(env,identity.userId);
      const eligibleCertificates=result.filter(certificate=>courseIsComplete(certificate.courseId,completed));
      return Response.json({ certificates: eligibleCertificates.map(certificate => ({
        ...certificate,
        verifyUrl: `https://verify.vulcandefense.com.br/?id=${encodeURIComponent(certificate.id)}`,
      })), storage:"mysql" }, { headers: { "cache-control": "no-store" } });
    }

    if (url.pathname === "/api/certificates" && request.method === "POST") {
      const identity = await resolveAuthIdentity(request, env);
      if (!identity?.userId) return Response.json({ error: "Faça login para emitir o certificado." }, { status: 401 });
      if(!mysqlConfigured(env))return Response.json({error:"O SQL novo não está configurado para certificados."},{status:503});
      const body = await request.json() as { studentName?: string; courseId?: string; courseTitle?: string; hours?: number };
      if (!body.studentName || !body.courseId || !body.courseTitle || !Number.isFinite(body.hours)) {
        return Response.json({ error: "Dados do certificado incompletos." }, { status: 400 });
      }
      const account=await withMysql(env,async db=>(await db.query<{name:string}>("SELECT name FROM accounts WHERE user_id=? LIMIT 1",[identity.userId]))[0]);
      if (!account) return Response.json({ error: "Conta não encontrada." }, { status: 404 });
      const course=courses.find(item=>item.id===body.courseId);
      if(!course)return Response.json({error:"Curso não encontrado."},{status:404});
      const completed=await completedModuleIds(env,identity.userId);
      if(!courseIsComplete(course.id,completed))return Response.json({error:"Conclua todos os módulos do curso antes de emitir o certificado."},{status:403});
      const issuedAt = new Date().toISOString();
      const id = `VD-${new Date().getUTCFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      await withMysql(env,db=>db.execute("INSERT INTO certificates (id,user_id,student_name,course_id,course_title,hours,issued_at,issuer,status) VALUES (?,?,?,?,?,?,?,'Vulcan Defense','valid')",[id,identity.userId,account.name,course.id,course.title,course.hours,issuedAt]));
      return Response.json({ id, issuedAt, verifyUrl: `https://verify.vulcandefense.com.br/?id=${encodeURIComponent(id)}` }, { status: 201 });
    }

    if (url.pathname.startsWith("/api/certificates/") && request.method === "GET") {
      if(!mysqlConfigured(env))return Response.json({error:"O SQL novo não está configurado para certificados."},{status:503});
      const id = decodeURIComponent(url.pathname.slice("/api/certificates/".length)).trim().toUpperCase();
      const certificate=await withMysql(env,async db=>(await db.query("SELECT id,student_name AS studentName,course_title AS courseTitle,hours,issued_at AS issuedAt,issuer,status FROM certificates WHERE id=? LIMIT 1",[id]))[0]);
      return certificate ? Response.json({ certificate }) : Response.json({ error: "Certificado não encontrado." }, { status: 404 });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;

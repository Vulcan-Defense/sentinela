import { mysqlConfigured, withMysql, type MysqlEnv } from "./mysql";
import { deleteSession, findAccountByEmail, findManualLogin, findSession, insertAuthSession, upsertAccount, upsertCredentials } from "./user-store";
import { recordActivityDay } from "./ofensiva";

export interface ManualAuthEnv extends MysqlEnv {
  AUTH_SECRET?: string;
  AUTH_COOKIE_DOMAIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}
export type AuthIdentity = { userId: string; email: string; source: "platform" | "manual" };
export type AccountRow = { userId:string; email:string; name:string; role:string; systemRole:string; plan:string; status:string; emailVerifiedAt:string; communityMember?:boolean };

export async function resolveCommunityAccess(env:ManualAuthEnv,accessCode: unknown): Promise<{ ok: true; communityMember: boolean } | { ok: false; error: string }> {
  const code = String(accessCode ?? "").trim().toLowerCase();
  if (code === FREE_PLAN_ACCESS_CODE) return { ok: true, communityMember: true };
  if(code&&mysqlConfigured(env)){
    const accepted=await withMysql(env,async db=>{
      await db.execute(`CREATE TABLE IF NOT EXISTS access_codes (id VARCHAR(64) PRIMARY KEY,code VARCHAR(80) NOT NULL UNIQUE,active TINYINT(1) NOT NULL DEFAULT 1,max_uses INT NULL,uses_count INT NOT NULL DEFAULT 0,expires_at VARCHAR(40) NULL,created_at VARCHAR(40) NOT NULL,created_by VARCHAR(128) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      const row=(await db.query<{id:string}>("SELECT id FROM access_codes WHERE code=? AND active=1 AND (expires_at IS NULL OR expires_at>?) AND (max_uses IS NULL OR uses_count<max_uses) LIMIT 1",[code.toUpperCase(),new Date().toISOString()]))[0];
      if(!row)return false;await db.execute("UPDATE access_codes SET uses_count=uses_count+1 WHERE id=?",[row.id]);return true;
    }).catch(()=>false);
    if(accepted)return{ok:true,communityMember:true};
  }
  return { ok: false, error: "Código de cadastro obrigatório ou inválido." };
}

const encoder=new TextEncoder();
const SESSION_COOKIE="vl_session";
const SESSION_SECONDS=8*60*60;
// Cloudflare Workers Web Crypto limits PBKDF2 to 100,000 iterations.
const PASSWORD_ITERATIONS=100_000;
const VULCAN_MEET_ORIGIN="https://meet.vulcandefense.com.br";
export const INITIAL_ADMIN_EMAILS=new Set(["styvie2012@gmail.com"]);
export const FREE_PLAN_ACCESS_CODE="sentinela";

function json(data:unknown,status=200,headers?:HeadersInit){return Response.json(data,{status,headers:{"cache-control":"no-store",...headers}})}
function bytesToBase64Url(bytes:Uint8Array){let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")}
function base64UrlToBytes(value:string){const normalized=value.replaceAll("-","+").replaceAll("_","/");const padded=normalized+"=".repeat((4-normalized.length%4)%4);const binary=atob(padded);return Uint8Array.from(binary,c=>c.charCodeAt(0))}
function randomToken(size=32){return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(size)))}
async function sha256(value:string){return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))))}
async function hmac(value:string,secret:string){const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(value))))}
function constantTimeEqual(left:string,right:string){if(!left||!right)return false;const a=encoder.encode(left),b=encoder.encode(right);let difference=a.length^b.length;const length=Math.max(a.length,b.length);for(let i=0;i<length;i++)difference|=(a[i%a.length]??0)^(b[i%b.length]??0);return difference===0}
async function hashPassword(password:string,salt=randomToken(16)){const material=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);const derived=await crypto.subtle.deriveBits({name:"PBKDF2",salt:base64UrlToBytes(salt),iterations:PASSWORD_ITERATIONS,hash:"SHA-256"},material,256);return{salt,hash:bytesToBase64Url(new Uint8Array(derived))}}
async function verifyPassword(password:string,salt:string,expected:string){return constantTimeEqual((await hashPassword(password,salt)).hash,expected)}
function normalizeEmail(value:unknown){const email=String(value??"").trim().toLowerCase();return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null}
function passwordError(value:unknown){const password=String(value??"");if(password.length<10||password.length>128)return"Use uma senha entre 10 e 128 caracteres.";if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))return"A senha deve conter letra maiúscula, minúscula e número.";return null}
function requireMysql(env:ManualAuthEnv){if(!mysqlConfigured(env))throw new Error("MYSQL_REQUIRED")}
function requireSecret(env:ManualAuthEnv){if(!env.AUTH_SECRET||env.AUTH_SECRET.length<32)throw new Error("AUTH_SECRET não configurado.");return env.AUTH_SECRET}
function parseCookie(request:Request,name:string){for(const cookie of request.headers.get("cookie")?.split(";")??[]){const separator=cookie.indexOf("=");if(separator>0&&cookie.slice(0,separator).trim()===name)return decodeURIComponent(cookie.slice(separator+1).trim())}return null}
function sameOrigin(request:Request){const origin=request.headers.get("origin");return!origin||origin===new URL(request.url).origin||origin===VULCAN_MEET_ORIGIN}
function sessionCookieDomain(env:ManualAuthEnv){const domain=env.AUTH_COOKIE_DOMAIN?.trim();return domain&&/^\.?[a-z0-9.-]+$/i.test(domain)?`; Domain=${domain}`:""}
export function withVulcanMeetCors(request:Request,response:Response){
  if(request.headers.get("origin")!==VULCAN_MEET_ORIGIN)return response;
  const headers=new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin",VULCAN_MEET_ORIGIN);
  headers.set("Access-Control-Allow-Credentials","true");
  headers.append("Vary","Origin");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export function vulcanMeetPreflight(request:Request){
  if(request.headers.get("origin")!==VULCAN_MEET_ORIGIN)return null;
  return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":VULCAN_MEET_ORIGIN,"Access-Control-Allow-Credentials":"true","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"content-type","Access-Control-Max-Age":"600","Vary":"Origin"}});
}
async function readBody(request:Request){if(!request.headers.get("content-type")?.toLowerCase().includes("application/json"))throw new Error("Envie os dados em formato JSON.");return await request.json() as Record<string,unknown>}
function publicAccount(account:AccountRow){return{email:account.email,name:account.name,role:account.role,systemRole:account.systemRole,plan:account.plan,status:account.status,emailVerified:Boolean(account.emailVerifiedAt),communityMember:Boolean(account.communityMember)}}

async function checkRateLimit(request:Request,env:ManualAuthEnv,action:string,identifier:string,maximum=5){
  requireMysql(env);const ip=request.headers.get("cf-connecting-ip")??"unknown";const rateKey=await sha256(`${action}:${identifier}:${ip}`);const now=new Date();
  return withMysql(env,async db=>{const row=(await db.query<{attempts:number;windowStartedAt:string}>("SELECT attempts,window_started_at AS windowStartedAt FROM auth_rate_limits WHERE rate_key=? LIMIT 1",[rateKey]))[0];
    if(!row||now.getTime()-Date.parse(row.windowStartedAt)>15*60*1000){await db.execute("INSERT INTO auth_rate_limits (rate_key,attempts,window_started_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=1,window_started_at=VALUES(window_started_at)",[rateKey,now.toISOString()]);return true}
    if(Number(row.attempts)>=maximum)return false;await db.execute("UPDATE auth_rate_limits SET attempts=attempts+1 WHERE rate_key=?",[rateKey]);return true});
}

export async function resolveAuthIdentity(request:Request,env:ManualAuthEnv):Promise<AuthIdentity|null>{
  const userId=request.headers.get("oai-authenticated-user-id");const email=normalizeEmail(request.headers.get("oai-authenticated-user-email"));
  if(userId&&email)return{userId,email,source:"platform"};
  if(!mysqlConfigured(env)||!env.AUTH_SECRET)return null;
  const cookie=parseCookie(request,SESSION_COOKIE);if(!cookie)return null;const[token,signature]=cookie.split(".");
  if(!token||!signature||!constantTimeEqual(await hmac(token,env.AUTH_SECRET),signature))return null;
  const sessionId=await sha256(token);const session=await withMysql(env,db=>findSession(db,sessionId,new Date().toISOString())).catch(()=>null);
  return session?{...session,source:"manual"}:null;
}

export async function createSessionForAccount(env:ManualAuthEnv,account:AccountRow){
  requireMysql(env);const token=randomToken(32);const signature=await hmac(token,requireSecret(env));const now=new Date();const sessionId=await sha256(token);const createdAt=now.toISOString();const expiresAt=new Date(now.getTime()+SESSION_SECONDS*1000).toISOString();
  await withMysql(env,async db=>{await insertAuthSession(db,{id:sessionId,userId:account.userId,expiresAt,createdAt});await recordActivityDay(db,account.userId,"login",createdAt)});
  return{account:publicAccount(account),headers:{"set-cookie":`${SESSION_COOKIE}=${encodeURIComponent(`${token}.${signature}`)}; Path=/; HttpOnly; Secure; SameSite=Lax${sessionCookieDomain(env)}; Max-Age=${SESSION_SECONDS}`}};
}

export async function handleManualAuth(request:Request,env:ManualAuthEnv):Promise<Response|null>{
  const url=new URL(request.url);if(!url.pathname.startsWith("/api/auth/manual/"))return null;
  if(url.pathname==="/api/auth/manual/status"&&request.method==="GET")return json({manualAvailable:mysqlConfigured(env)&&Boolean(env.AUTH_SECRET&&env.AUTH_SECRET.length>=32),googleAvailable:Boolean(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.AUTH_SECRET&&env.AUTH_SECRET.length>=32),googleClientId:env.GOOGLE_CLIENT_ID||"",emailVerificationRequired:false,mfaRequired:false,storage:"mysql"});
  if(url.pathname==="/api/auth/manual/session"&&request.method==="GET"){
    const identity=await resolveAuthIdentity(request,env);
    if(!identity)return json({authenticated:false},401);
    const account=await withMysql(env,db=>findAccountByEmail(db,identity.email));
    return account?json({authenticated:true,account:publicAccount(account)}):json({authenticated:false},401);
  }
  if(request.method!=="POST")return json({error:"Método não permitido."},405);if(!sameOrigin(request))return json({error:"Origem inválida."},403);
  try{
    requireMysql(env);
    if(url.pathname==="/api/auth/manual/logout"){
      const token=parseCookie(request,SESSION_COOKIE)?.split(".")[0];if(token){const sessionId=await sha256(token);await withMysql(env,db=>deleteSession(db,sessionId))}
      return json({signedOut:true},200,{"set-cookie":`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax${sessionCookieDomain(env)}; Max-Age=0`});
    }
    const body=await readBody(request);
    if(url.pathname==="/api/auth/manual/register"){
      requireSecret(env);
      const email=normalizeEmail(body.email),name=String(body.name??"").trim().slice(0,100),role=String(body.role??"Estudante de Segurança").trim().slice(0,100),password=String(body.password??""),access=await resolveCommunityAccess(env,body.accessCode),issue=passwordError(password);
      if(!access.ok)return json({error:access.error},403);if(!email||name.length<2||issue)return json({error:issue||"Informe nome e e-mail válidos."},400);if(!await checkRateLimit(request,env,"register",email,4))return json({error:"Muitas tentativas. Aguarde 15 minutos."},429);
      const existing=await withMysql(env,db=>findAccountByEmail(db,email));
      if(existing?.status==="active"){
        const existingLogin=await withMysql(env,db=>findManualLogin(db,email));
        if(existingLogin)return json({error:"Este e-mail já possui uma conta. Use a tela de login."},409);
      }
      const userId=existing?.userId??`manual_${crypto.randomUUID()}`,now=new Date().toISOString(),credentials=await hashPassword(password);const account:AccountRow={userId,email,name,role,systemRole:INITIAL_ADMIN_EMAILS.has(email)?"admin":"aluno",plan:"gratuito",status:"active",emailVerifiedAt:now,communityMember:access.communityMember};
      await withMysql(env,async db=>{await upsertAccount(db,{...account,createdAt:now,updatedAt:now});await upsertCredentials(db,{userId,passwordHash:credentials.hash,passwordSalt:credentials.salt,passwordIterations:PASSWORD_ITERATIONS,createdAt:now,updatedAt:now})});
      const session=await createSessionForAccount(env,account);return json({account:session.account,storedIn:"mysql"},201,session.headers);
    }
    if(url.pathname==="/api/auth/manual/login"){
      const email=normalizeEmail(body.email),password=String(body.password??"");if(!email||!password)return json({error:"Informe e-mail e senha."},400);if(!await checkRateLimit(request,env,"login",email,6))return json({error:"Muitas tentativas. Aguarde 15 minutos."},429);
      const row=await withMysql(env,db=>findManualLogin(db,email));if(!row||!await verifyPassword(password,row.passwordSalt,row.passwordHash))return json({error:"E-mail ou senha incorretos."},401);if(row.status!=="active")return json({error:"Conta inativa."},403);
      const session=await createSessionForAccount(env,row);return json({account:session.account,mfaRequired:false},200,session.headers);
    }
    if(url.pathname==="/api/auth/manual/verify-email"||url.pathname==="/api/auth/manual/verify-mfa")return json({verified:true,message:"Confirmação desabilitada; a conta usa autenticação direta no MySQL."});
    return json({error:"Rota não encontrada."},404);
  }catch(error){if(error instanceof Error&&error.message==="MYSQL_REQUIRED")return json({error:"O MySQL da academia está indisponível."},503);if(error instanceof Error&&error.message==="AUTH_SECRET não configurado.")return json({error:"O cadastro está temporariamente indisponível. A configuração de sessão precisa ser concluída."},503);console.error("manual-auth",error instanceof Error?error.message:error);return json({error:"Não foi possível concluir a autenticação. Tente novamente."},500)}
}

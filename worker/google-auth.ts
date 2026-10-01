import { mysqlConfigured, withMysql } from "./mysql";
import {
  createSessionForAccount,
  INITIAL_ADMIN_EMAILS,
  resolveCommunityAccess,
  type AccountRow,
  type ManualAuthEnv,
} from "./manual-auth";
import { findAccountRecord, upsertAccount } from "./user-store";

const STATE_COOKIE = "vl_google_oauth";
const ACCESS_COOKIE = "vl_google_access";
const STATE_SECONDS = 600;
const encoder = new TextEncoder();

type OAuthState = {
  state: string;
  verifier: string;
  mode: "login" | "signup";
  returnTo: string;
  accessCode: string;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function randomToken(size = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(size)));
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

function constantTimeEqual(left: string, right: string) {
  if (!left || !right) return false;
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a[i % a.length] ?? 0) ^ (b[i % b.length] ?? 0);
  return difference === 0;
}

function parseCookie(request: Request, name: string) {
  for (const cookie of request.headers.get("cookie")?.split(";") ?? []) {
    const separator = cookie.indexOf("=");
    if (separator > 0 && cookie.slice(0, separator).trim() === name) {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    }
  }
  return null;
}

function cookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name: string) {
  return cookie(name, "", 0);
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/?login=1";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/?login=1";
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/signin") || url.pathname.startsWith("/signout")) return "/?login=1";
    return `${url.pathname}${url.search}` || "/?login=1";
  } catch {
    return "/?login=1";
  }
}

function redirect(location: string, cookies: string[] = []) {
  const headers = new Headers({ location });
  for (const item of cookies) headers.append("Set-Cookie", item);
  return new Response(null, { status: 302, headers });
}

function authError(origin: string, message: string, cookies: string[] = []) {
  return redirect(`${origin}/?auth_error=${encodeURIComponent(message)}`, cookies);
}

function googleConfigured(env: ManualAuthEnv) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.AUTH_SECRET && env.AUTH_SECRET.length >= 32);
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function completeGoogleAccount(
  env: ManualAuthEnv,
  profile: { email: string; name: string; sub: string },
  mode: "login" | "signup",
  accessCode: string,
): Promise<{ account: AccountRow; created: boolean } | { error: string; status: number; signup?: boolean }> {
  const existing = await withMysql(env, db => findAccountRecord(db, profile.email));
  if (existing) {
    if (existing.status !== "active") return { error: "Conta inativa.", status: 403 };
    return { account: { ...existing, communityMember: Boolean(existing.communityMember) }, created: false };
  }
  if (mode !== "signup") return { error: "Crie sua conta para continuar.", status: 404, signup: true };
  const access = await resolveCommunityAccess(env, accessCode);
  if (!access.ok) return { error: access.error, status: 403 };
  const now = new Date().toISOString();
  const account: AccountRow = {
    userId: `google_${profile.sub}`,
    email: profile.email,
    name: profile.name,
    role: "Estudante de Segurança",
    systemRole: INITIAL_ADMIN_EMAILS.has(profile.email) ? "admin" : "aluno",
    plan: "gratuito",
    status: "active",
    emailVerifiedAt: now,
    communityMember: access.communityMember,
  };
  await withMysql(env, db => upsertAccount(db, { ...account, createdAt: now, updatedAt: now }));
  return { account, created: true };
}

async function signState(payload: OAuthState, secret: string) {
  const encoded = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${encoded}.${await hmac(encoded, secret)}`;
}

async function readState(request: Request, secret: string): Promise<OAuthState | null> {
  const cookieValue = parseCookie(request, STATE_COOKIE);
  if (!cookieValue) return null;
  const separator = cookieValue.lastIndexOf(".");
  if (separator < 0) return null;
  const encoded = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  if (!constantTimeEqual(await hmac(encoded, secret), signature)) return null;
  try {
    const json = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as OAuthState;
    if (!json.state || !json.verifier || (json.mode !== "login" && json.mode !== "signup")) return null;
    return json;
  } catch {
    return null;
  }
}

function mysqlLoginError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/access denied/i.test(message)) {
    return "O Google autenticou, mas o MySQL da Locaweb recusou o IP do Cloudflare. No DBaaS, libere o host % para o usuário vulcanacademy.";
  }
  if (/timeout|econnrefused|enotfound|connect/i.test(message)) {
    return "O Google autenticou, mas não foi possível conectar ao MySQL da academia.";
  }
  return "O Google autenticou, mas não foi possível gravar a sessão no MySQL.";
}

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export async function handleGoogleAuth(request: Request, env: ManualAuthEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/auth/google/")) return null;

  if (url.pathname === "/api/auth/google/start" && request.method === "GET") {
    if (!googleConfigured(env)) return authError(url.origin, "Login com Google ainda não está configurado.");
    if (!mysqlConfigured(env)) return authError(url.origin, "MySQL da academia indisponível.");
    const mode = url.searchParams.get("mode") === "signup" ? "signup" : "login";
    const returnTo = safeReturnTo(url.searchParams.get("return_to") || "/?login=1");
    const accessCode = (parseCookie(request, ACCESS_COOKIE) || url.searchParams.get("access_code") || "").trim().toLowerCase();
    const state = randomToken(24);
    const verifier = randomToken(32);
    const payload: OAuthState = { state, verifier, mode, returnTo, accessCode };
    const signed = await signState(payload, env.AUTH_SECRET!);
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    google.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
    google.searchParams.set("redirect_uri", redirectUri);
    google.searchParams.set("response_type", "code");
    google.searchParams.set("scope", "openid email profile");
    google.searchParams.set("state", state);
    google.searchParams.set("prompt", "select_account");
    return redirect(google.toString(), [cookie(STATE_COOKIE, signed, STATE_SECONDS), clearCookie(ACCESS_COOKIE)]);
  }

  if (url.pathname === "/api/auth/google/callback" && request.method === "GET") {
    const clearAuthCookies = [clearCookie(STATE_COOKIE), clearCookie(ACCESS_COOKIE)];
    if (!googleConfigured(env)) return authError(url.origin, "Login com Google ainda não está configurado.", clearAuthCookies);
    const error = url.searchParams.get("error");
    if (error) return authError(url.origin, error === "access_denied" ? "Login com Google cancelado." : "Google recusou o acesso.", clearAuthCookies);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const payload = await readState(request, env.AUTH_SECRET!);
    if (!code || !payload || !returnedState || !constantTimeEqual(payload.state, returnedState)) {
      return authError(url.origin, "Sessão do Google expirou. Tente novamente.", clearAuthCookies);
    }
    try {
      const redirectUri = `${url.origin}/api/auth/google/callback`;
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenResponse.json() as { id_token?: string; error?: string };
      if (!tokenResponse.ok || !tokens.id_token) {
        console.error("google-token", tokens.error || tokenResponse.status);
        return authError(url.origin, "Não foi possível validar a conta Google.", clearAuthCookies);
      }
      const infoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`);
      const info = await infoResponse.json() as { aud?: string; email?: string; email_verified?: string | boolean; name?: string; sub?: string; exp?: string };
      if (!infoResponse.ok || info.aud !== env.GOOGLE_CLIENT_ID || !info.sub) {
        return authError(url.origin, "Token Google inválido.", clearAuthCookies);
      }
      if (Number(info.exp || 0) * 1000 < Date.now()) return authError(url.origin, "Token Google expirado.", clearAuthCookies);
      const email = normalizeEmail(info.email);
      const verified = info.email_verified === true || info.email_verified === "true";
      if (!email || !verified) return authError(url.origin, "Sua conta Google precisa de um e-mail verificado.", clearAuthCookies);
      const finished = await completeGoogleAccount(env, {
        email,
        name: (info.name || email.split("@")[0]).trim().slice(0, 100),
        sub: info.sub,
      }, payload.mode, payload.accessCode);
      if ("error" in finished) {
        const location = finished.signup
          ? `${url.origin}/?auth_error=${encodeURIComponent(finished.error)}&signup=1`
          : `${url.origin}/?auth_error=${encodeURIComponent(finished.error)}`;
        return redirect(location, clearAuthCookies);
      }
      const session = await createSessionForAccount(env, finished.account);
      const destination = payload.returnTo.includes("login=1") ? payload.returnTo : "/?login=1";
      return redirect(`${url.origin}${destination}`, [String(session.headers["set-cookie"]), ...clearAuthCookies]);
    } catch (error) {
      console.error("google-auth", error instanceof Error ? error.message : error);
      return authError(url.origin, "Falha ao entrar com Google.", clearAuthCookies);
    }
  }

  if (url.pathname === "/api/auth/google/session" && request.method === "POST") {
    if (!sameOrigin(request)) return json({ error: "Origem inválida." }, 403);
    if (!googleConfigured(env)) return json({ error: "Login com Google ainda não está configurado." }, 503);
    if (!mysqlConfigured(env)) return json({ error: "MySQL da academia indisponível." }, 503);
    try {
      const body = await request.json() as { accessToken?: string; mode?: string; accessCode?: string };
      const accessToken = String(body.accessToken ?? "").trim();
      if (!accessToken) return json({ error: "Token Google ausente." }, 400);
      const mode = body.mode === "signup" ? "signup" : "login";
      const accessCode = String(body.accessCode ?? "").trim().toLowerCase();
      const [tokenInfoResponse, userInfoResponse] = await Promise.all([
        fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`),
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { authorization: `Bearer ${accessToken}` } }),
      ]);
      const tokenInfo = await tokenInfoResponse.json() as { aud?: string; azp?: string; sub?: string; exp?: string };
      const userInfo = await userInfoResponse.json() as { email?: string; email_verified?: boolean | string; name?: string; sub?: string };
      if (!tokenInfoResponse.ok || !userInfoResponse.ok || !tokenInfo.sub) return json({ error: "Token Google inválido." }, 401);
      if (tokenInfo.aud !== env.GOOGLE_CLIENT_ID && tokenInfo.azp !== env.GOOGLE_CLIENT_ID) return json({ error: "Token Google inválido." }, 401);
      if (tokenInfo.exp && Number(tokenInfo.exp) * 1000 < Date.now()) return json({ error: "Token Google expirado." }, 401);
      const email = normalizeEmail(userInfo.email);
      const verified = userInfo.email_verified === true || userInfo.email_verified === "true";
      if (!email || !verified) return json({ error: "Sua conta Google precisa de um e-mail verificado." }, 403);
      const finished = await completeGoogleAccount(env, {
        email,
        name: (userInfo.name || email.split("@")[0]).trim().slice(0, 100),
        sub: userInfo.sub || tokenInfo.sub,
      }, mode, accessCode);
      if ("error" in finished) return json({ error: finished.error, signup: finished.signup === true }, finished.status);
      const session = await createSessionForAccount(env, finished.account);
      return json({ account: session.account, created: finished.created }, finished.created ? 201 : 200, session.headers);
    } catch (error) {
      console.error("google-session", error instanceof Error ? error.message : error);
      return json({ error: mysqlLoginError(error) }, 503);
    }
  }

  return json({ error: "Rota não encontrada." }, 404);
}

/**
 * Cloudflare Worker — headers de segurança da Sentinela.
 *
 * Como aplicar (escolha UM método):
 *
 * A) Worker: Workers & Pages → Create → deploy este arquivo em *sentinelacibernetica.com.br/*
 *
 * B) Transform Rules (já em uso): Rules → Transform Rules → Modify Response Header
 *    - Remover: Access-Control-Allow-Origin
 *    - Remover: Content-Security-Policy-Report-Only
 *    - Remover: Age, Expires, x-timer, x-cache, x-cache-hits, x-served-by,
 *      x-fastly-request-id, x-github-request-id, x-github-edge-region,
 *      x-proxy-cache, x-origin-cache, Via
 *    - Definir os headers SET abaixo (substituir o CSP atual).
 *
 * Page Shield: Security → Settings → Client-side security → desligar
 * "Continuous script monitoring" (elimina CSP Report-Only em /cdn-cgi/content).
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://formspree.io https://api.web3forms.com",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' https://www.google.com https://t0.gstatic.com https://t1.gstatic.com https://t2.gstatic.com https://t3.gstatic.com",
  "font-src 'self'",
  "connect-src 'self' https://formspree.io https://api.web3forms.com",
  "frame-src 'none'",
  "media-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SET = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

const REMOVE = [
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "access-control-expose-headers",
  "content-security-policy-report-only",
  "age",
  "expires",
  "x-timer",
  "x-cache",
  "x-cache-hits",
  "x-served-by",
  "x-fastly-request-id",
  "x-github-request-id",
  "x-github-edge-region",
  "x-proxy-cache",
  "x-origin-cache",
  "via",
];

const MOBILE_REGISTRATION_PATH = "/api/mobile-registration";
const MOBILE_FEEDBACK_PATH = "/api/mobile-feedback";
const MOBILE_REGISTRATION_ENDPOINT = "https://formspree.io/f/xaenzpjq";
const FEEDBACK_CODES = new Set([
  "VULCAN-FB-7K2M", "VULCAN-FB-9Q4R", "VULCAN-FB-3T8N", "VULCAN-FB-6P5X",
  "VULCAN-FB-4D7L", "VULCAN-FB-8H2C", "VULCAN-FB-5W9J", "VULCAN-FB-2Y6V",
  "VULCAN-FB-7B3F", "VULCAN-FB-9M4K", "VULCAN-FB-6R8D", "VULCAN-FB-3X5P",
]);

function formPage(title, message, status, returnPath, returnLabel) {
  const accent = status < 400 ? "#38d9ff" : "#ff8c9a";
    return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Sentinela</title></head><body style="margin:0;background:#07111b;color:#e8f6ff;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box"><main style="max-width:540px;border:1px solid ${accent};border-radius:16px;padding:32px;background:#0b1926"><p style="color:${accent};font:700 12px ui-monospace,monospace;letter-spacing:.08em">TESTES MOBILE</p><h1>${title}</h1><p style="line-height:1.6">${message}</p><a href="${returnPath}" style="color:${accent}">${returnLabel}</a></main></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function isAsset(pathname) {
  return /\.(?:css|js|woff2|png|svg|jpg|jpeg|gif|ico|webp|json)$/i.test(pathname);
}

function contentTypeFor(pathname) {
  if (pathname.endsWith(".html") || pathname === "/" || pathname === "") {
    return "text/html; charset=utf-8";
  }
  if (pathname.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (pathname.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".woff2")) return "font/woff2";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === MOBILE_REGISTRATION_PATH && request.method === "POST") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.startsWith("application/x-www-form-urlencoded") && !contentType.startsWith("multipart/form-data")) {
        return formPage("Formato de cadastro inválido", "Atualize a página e tente enviar novamente.", 400, "/testes-mobile", "Voltar ao cadastro");
      }

      const upstream = await fetch(MOBILE_REGISTRATION_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": contentType },
        body: request.body,
      });
      if (upstream.ok) {
        return formPage("Cadastro enviado", "Recebemos suas informações. A equipe entrará em contato caso seu dispositivo seja selecionado.", 200, "/testes-mobile", "Voltar ao cadastro");
      }
      return formPage("Não foi possível enviar", "Tente novamente em alguns minutos.", 502, "/testes-mobile", "Voltar ao cadastro");
    }
    if (url.pathname === MOBILE_FEEDBACK_PATH && request.method === "POST") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.startsWith("application/x-www-form-urlencoded") && !contentType.startsWith("multipart/form-data")) {
        return formPage("Formato de feedback inválido", "Atualize a página e tente enviar novamente.", 400, "/testes-mobile/feedback/", "Voltar ao feedback");
      }
      const fields = await request.clone().formData();
      const code = String(fields.get("feedback_code") || "").trim().toUpperCase();
      if (!FEEDBACK_CODES.has(code)) {
        return formPage("Código não reconhecido", "Confira o código recebido no convite e tente novamente.", 403, "/testes-mobile/feedback/", "Voltar ao feedback");
      }
      const upstream = await fetch(MOBILE_REGISTRATION_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": contentType },
        body: request.body,
      });
      if (upstream.ok) {
        return formPage("Feedback enviado", "Obrigado pelo seu retorno. A equipe vai considerar suas observações na próxima etapa do projeto.", 200, "/testes-mobile/feedback/", "Enviar outro feedback");
      }
      return formPage("Não foi possível enviar", "Tente novamente em alguns minutos.", 502, "/testes-mobile/feedback/", "Voltar ao feedback");
    }
    const originResponse = await fetch(request);
    const headers = new Headers(originResponse.headers);

    for (const name of REMOVE) {
      headers.delete(name);
    }
    for (const [name, value] of Object.entries(SET)) {
      headers.set(name, value);
    }

    const type = contentTypeFor(url.pathname);
    if (type && !headers.get("Content-Type")) {
      headers.set("Content-Type", type);
    }
    if (type && type.startsWith("text/html") && !/charset=/i.test(headers.get("Content-Type") || "")) {
      headers.set("Content-Type", type);
    }
    if (url.pathname.endsWith(".html") || url.pathname === "/") {
      headers.set("Content-Type", "text/html; charset=utf-8");
    }
    if (url.pathname.endsWith("/robots.txt")) {
      headers.set("Content-Type", "text/plain; charset=utf-8");
    }
    headers.delete("etag");
    headers.delete("last-modified");

    if (isAsset(url.pathname)) {
      headers.set("Cache-Control", "public, max-age=86400, must-revalidate");
    } else {
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers,
    });
  },
};

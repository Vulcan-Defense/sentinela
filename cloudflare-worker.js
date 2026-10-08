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
const FEEDBACK_PAGE_PATH = "/testes-mobile/feedback/";
const FEEDBACK_CTA_STYLE_PATH = "/css/mobile-feedback-cta.css";
const FEEDBACK_PAGE_STYLE_PATH = "/css/mobile-feedback-page.css";
const MOBILE_REGISTRATION_ENDPOINT = "https://formspree.io/f/xaenzpjq";
const FEEDBACK_CODES = new Set([
  "VULCAN-FB-7K2M", "VULCAN-FB-9Q4R", "VULCAN-FB-3T8N", "VULCAN-FB-6P5X",
  "VULCAN-FB-4D7L", "VULCAN-FB-8H2C", "VULCAN-FB-5W9J", "VULCAN-FB-2Y6V",
  "VULCAN-FB-7B3F", "VULCAN-FB-9M4K", "VULCAN-FB-6R8D", "VULCAN-FB-3X5P",
]);

const FEEDBACK_CTA_STYLE = `
  .feedback-worker-button { display: inline-flex; align-items: center; justify-content: center; gap: .6rem; min-height: 52px; margin-top: 1.35rem; padding: .8rem 1.1rem; border-radius: 9px; background: #38d9ff; color: #03111a; font: 750 .92rem system-ui, sans-serif; text-decoration: none; box-shadow: 0 12px 30px rgba(56,217,255,.22); }
  .feedback-worker-button:hover { background: #76e7ff; transform: translateY(-1px); }
  .feedback-worker-button:focus-visible { outline: 3px solid #f5bd48; outline-offset: 4px; }
`;

const FEEDBACK_PAGE_STYLE = `
  :root { color-scheme: dark; --bg:#060b13; --surface:#0d1724; --line:#203448; --cyan:#38d9ff; --gold:#f5bd48; --text:#edf7ff; --muted:#9db0c2; } * { box-sizing:border-box; } body { min-height:100vh; margin:0; color:var(--text); background: radial-gradient(circle at 82% 12%, rgba(56,217,255,.12), transparent 28rem), var(--bg); font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; } .wrap { width:min(1040px,calc(100% - 2rem)); margin:auto; padding:4rem 0; } .top { display:flex; justify-content:space-between; gap:1rem; margin-bottom:clamp(3rem,7vw,6rem); } .brand { color:var(--text); font:700 1.1rem ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.1em; text-decoration:none; } .back { color:var(--muted); font-size:.9rem; } .layout { display:grid; grid-template-columns:minmax(0,.9fr) minmax(360px,.8fr); gap:clamp(3rem,10vw,9rem); align-items:start; } .signal { display:flex; align-items:center; gap:.55rem; margin:0 0 1.1rem; color:var(--gold); font:500 .75rem ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.05em; } .signal i { width:.55rem; height:.55rem; border-radius:50%; background:var(--gold); box-shadow:0 0 0 .34rem rgba(245,189,72,.13); } h1 { max-width:600px; margin:0; font-size:clamp(2.6rem,5.5vw,4.8rem); letter-spacing:-.06em; line-height:.96; } .intro { max-width:520px; margin:1.4rem 0 0; color:var(--muted); font-size:1.06rem; line-height:1.65; } .steps { display:grid; gap:.9rem; margin:2.8rem 0 0; } .steps div { padding:0 0 1rem; border-bottom:1px solid var(--line); } .steps strong { display:block; } .steps span { display:block; margin-top:.35rem; color:var(--muted); font-size:.88rem; line-height:1.55; } .panel { padding:clamp(1.4rem,4vw,2.5rem); border:1px solid rgba(245,189,72,.48); border-radius:18px; background:linear-gradient(145deg,rgba(28,29,22,.96),rgba(8,15,24,.98)); box-shadow:0 28px 70px rgba(0,0,0,.3); } .panel h2 { margin:.7rem 0 0; font-size:2rem; letter-spacing:-.045em; line-height:1.05; } .panel > p { margin:.7rem 0 0; color:var(--muted); font-size:.89rem; line-height:1.5; } form { display:grid; gap:.6rem; margin-top:2rem; } label, legend { margin-top:.6rem; font-size:.84rem; font-weight:650; } input:not([type=radio]), select, textarea { width:100%; min-height:48px; padding:.75rem .9rem; border:1px solid var(--line); border-radius:9px; outline:0; background:#09121d; color:var(--text); font:inherit; } textarea { min-height:132px; resize:vertical; } input:focus, select:focus, textarea:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(245,189,72,.13); } fieldset { display:grid; gap:.6rem; margin:.8rem 0 0; padding:0; border:0; } legend { padding:0; } .score { display:flex; gap:.55rem; } .score input { position:absolute; opacity:0; } .score label { display:grid; width:2.35rem; height:2.35rem; margin:0; place-items:center; border:1px solid var(--line); border-radius:50%; color:var(--muted); cursor:pointer; } .score input:checked + label { border-color:var(--gold); background:var(--gold); color:#201601; } .score input:focus-visible + label { outline:3px solid var(--cyan); outline-offset:3px; } button { min-height:50px; margin-top:.65rem; border:0; border-radius:9px; background:var(--gold); color:#201601; font:750 1rem inherit; cursor:pointer; } button:hover { background:#ffdb8a; } .notice { margin-top:1rem; color:var(--muted); font-size:.74rem; line-height:1.5; } .hp { position:absolute; left:-10000px; } @media (max-width:800px) { .layout { grid-template-columns:1fr; } .top { margin-bottom:3rem; } } @media (max-width:500px) { .wrap { padding:2.2rem 0 3rem; } .top { margin-bottom:2.5rem; } .back { display:none; } .panel { padding:1.35rem; } .score { justify-content:space-between; } }
`;

function feedbackScreen() {
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><title>Enviar feedback | Testes mobile Sentinela</title><link rel="stylesheet" href="${FEEDBACK_PAGE_STYLE_PATH}"></head><body><main class="wrap"><header class="top"><a class="brand" href="/">SENTINELA</a><a class="back" href="/testes-mobile/">Voltar aos testes mobile</a></header><div class="layout"><section aria-labelledby="feedback-title"><p class="signal"><i></i> retorno de participante</p><h1 id="feedback-title">Conte o que funcionou no seu teste.</h1><p class="intro">Seu relato ajuda a encontrar pontos de melhoria antes de uma nova versão chegar a mais pessoas.</p><div class="steps"><div><strong>Use seu código</strong><span>Ele identifica a rodada de testes da qual você participou.</span></div><div><strong>Avalie a experiência</strong><span>Leva poucos minutos e você pode detalhar o que observou.</span></div><div><strong>Envie quando terminar</strong><span>O retorno chega à equipe responsável pelo projeto.</span></div></div></section><section class="panel" aria-labelledby="form-title"><p class="signal"><i></i> feedback do teste</p><h2 id="form-title">Como foi a experiência?</h2><p>Informe o código recebido com o convite.</p><form action="${MOBILE_FEEDBACK_PATH}" method="POST"><input type="hidden" name="_subject" value="Feedback — Projeto de testes mobile Sentinela"><input type="hidden" name="origem" value="Projeto de testes mobile Sentinela"><input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true"><label for="feedback-code">Código de feedback</label><input id="feedback-code" name="feedback_code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="VULCAN-FB-0000" required><label for="feedback-name">Nome</label><input id="feedback-name" name="name" type="text" autocomplete="name" placeholder="Como devemos chamar você" required><label for="feedback-device">Dispositivo testado</label><select id="feedback-device" name="device" required><option value="" selected disabled>Selecione uma opção</option><option value="android">Android</option><option value="ios">iPhone (iOS)</option></select><fieldset><legend>Nota geral</legend><div class="score"><input id="score-1" name="score" type="radio" value="1" required><label for="score-1">1</label><input id="score-2" name="score" type="radio" value="2"><label for="score-2">2</label><input id="score-3" name="score" type="radio" value="3"><label for="score-3">3</label><input id="score-4" name="score" type="radio" value="4"><label for="score-4">4</label><input id="score-5" name="score" type="radio" value="5"><label for="score-5">5</label></div></fieldset><label for="feedback-type">O que você quer contar?</label><select id="feedback-type" name="feedback_type" required><option value="" selected disabled>Selecione uma opção</option><option value="melhoria">Uma sugestão de melhoria</option><option value="erro">Um erro ou comportamento inesperado</option><option value="elogio">Algo que funcionou bem</option><option value="outro">Outro comentário</option></select><label for="feedback-message">Seu relato</label><textarea id="feedback-message" name="message" rows="5" placeholder="Descreva o que aconteceu e, se possível, o que você esperava que acontecesse." required></textarea><button type="submit">Enviar feedback</button></form><p class="notice">O código é conferido antes do envio. Não inclua senhas, dados bancários ou outras informações sensíveis no relato.</p></section></div></main></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

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
    if (request.method === "GET" && (url.pathname === FEEDBACK_PAGE_PATH || url.pathname === "/testes-mobile/feedback")) {
      return feedbackScreen();
    }
    if (request.method === "GET" && url.pathname === FEEDBACK_CTA_STYLE_PATH) {
      return new Response(FEEDBACK_CTA_STYLE, { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
    }
    if (request.method === "GET" && url.pathname === FEEDBACK_PAGE_STYLE_PATH) {
      return new Response(FEEDBACK_PAGE_STYLE, { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
    }
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

    let responseBody = originResponse.body;
    if (request.method === "GET" && (url.pathname === "/testes-mobile" || url.pathname === "/testes-mobile/")) {
      responseBody = new HTMLRewriter()
        .on("head", { element(element) { element.append(`<link rel="stylesheet" href="${FEEDBACK_CTA_STYLE_PATH}">`, { html: true }); } })
        .on(".registration-note", { element(element) { element.after(`<a class="feedback-worker-button" href="${FEEDBACK_PAGE_PATH}">Enviar feedback <span aria-hidden="true">↗</span></a>`, { html: true }); } })
        .transform(originResponse).body;
    }

    return new Response(responseBody, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers,
    });
  },
};

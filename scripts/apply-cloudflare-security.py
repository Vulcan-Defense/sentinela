"""
Aplica headers de segurança e desliga Page Shield na zona Cloudflare.

Uso (PowerShell):
  $env:CLOUDFLARE_API_TOKEN = "token com permissão Zone.Transform Rules, Zone.Page Shield, Zone.Settings"
  py scripts/apply-cloudflare-security.py

Crie o token em https://dash.cloudflare.com/profile/api-tokens
Custom Token: Zone.Zone Read, Zone.Transform Rules Edit,
Zone.Page Shield Edit, Zone.Zone Settings Edit.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

ZONE_NAME = "sentinelacibernetica.com.br"
API = "https://api.cloudflare.com/client/v4"
RULE_NAME = "Sentinela ZAP security headers"

CSP = (
    "default-src 'self'; "
    "base-uri 'self'; "
    "object-src 'none'; "
    "frame-ancestors 'none'; "
    "form-action 'self' https://formspree.io https://api.web3forms.com; "
    "script-src 'self'; "
    "style-src 'self'; "
    "img-src 'self' https://www.google.com https://t0.gstatic.com https://t1.gstatic.com https://t2.gstatic.com https://t3.gstatic.com; "
    "font-src 'self'; "
    "connect-src 'self' https://formspree.io https://api.web3forms.com https://api.github.com; "
    "frame-src 'none'; "
    "media-src 'none'; "
    "manifest-src 'self'; "
    "worker-src 'self'; "
    "upgrade-insecure-requests"
)

ALL_EXPR = "true"
HTML_EXPR = '(http.request.uri.path eq "/") or (http.request.uri.path contains ".html")'
ROBOTS_EXPR = 'http.request.uri.path eq "/robots.txt"'
SITEMAP_EXPR = 'http.request.uri.path eq "/sitemap.xml"'
DOCS_EXPR = (
    '(http.request.uri.path eq "/") or '
    '(http.request.uri.path contains ".html") or '
    '(http.request.uri.path eq "/robots.txt") or '
    '(http.request.uri.path eq "/sitemap.xml")'
)


def set_header(value: str) -> dict:
    return {"operation": "set", "value": value}


def remove_header() -> dict:
    return {"operation": "remove"}


SECURITY_HEADERS = {
    "Access-Control-Allow-Origin": remove_header(),
    "Content-Security-Policy-Report-Only": remove_header(),
    "Age": remove_header(),
    "Expires": remove_header(),
    "x-timer": remove_header(),
    "x-cache": remove_header(),
    "x-cache-hits": remove_header(),
    "x-served-by": remove_header(),
    "x-fastly-request-id": remove_header(),
    "x-github-request-id": remove_header(),
    "x-github-edge-region": remove_header(),
    "x-proxy-cache": remove_header(),
    "x-origin-cache": remove_header(),
    "Via": remove_header(),
    "Content-Security-Policy": set_header(CSP),
    "Strict-Transport-Security": set_header("max-age=31536000; includeSubDomains; preload"),
    "X-Content-Type-Options": set_header("nosniff"),
    "X-Frame-Options": set_header("DENY"),
    "Referrer-Policy": set_header("strict-origin-when-cross-origin"),
    "Cross-Origin-Opener-Policy": set_header("same-origin"),
    "Cross-Origin-Resource-Policy": set_header("same-origin"),
    "Cross-Origin-Embedder-Policy": set_header("credentialless"),
    "X-Permitted-Cross-Domain-Policies": set_header("none"),
}

NO_STORE = {
    "ETag": remove_header(),
    "Last-Modified": remove_header(),
    "Cache-Control": set_header("no-store, no-cache, must-revalidate, private"),
}


def api(method: str, path: str, token: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Cloudflare API {method} {path} -> {exc.code}\n{err}") from exc
    if not payload.get("success", True):
        raise SystemExit(f"Cloudflare API error: {json.dumps(payload, indent=2)}")
    return payload


def rule(desc: str, expr: str, headers: dict) -> dict:
    return {
        "action": "rewrite",
        "action_parameters": {"headers": headers},
        "expression": expr,
        "description": desc,
        "enabled": True,
    }


def main() -> None:
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not token:
        sys.exit(
            "Defina CLOUDFLARE_API_TOKEN e rode de novo.\n"
            "Crie o token em https://dash.cloudflare.com/profile/api-tokens"
        )

    zones = api("GET", f"/zones?name={ZONE_NAME}", token).get("result") or []
    if not zones:
        sys.exit(f"Zona {ZONE_NAME} não encontrada nesta conta.")
    zone_id = zones[0]["id"]
    print(f"Zona {ZONE_NAME} = {zone_id}")

    shield = api("GET", f"/zones/{zone_id}/page_shield", token).get("result") or {}
    print(f"Page Shield atual: {shield}")
    api(
        "PUT",
        f"/zones/{zone_id}/page_shield",
        token,
        {
            "enabled": False,
            "use_cloudflare_reporting_endpoint": False,
            "use_connection_monitor": False,
        },
    )
    print("Page Shield desligado (some CSP Report-Only em /cdn-cgi/content).")

    api(
        "PATCH",
        f"/zones/{zone_id}/settings/security_header",
        token,
        {
            "value": {
                "strict_transport_security": {
                    "enabled": True,
                    "max_age": 31536000,
                    "include_subdomains": True,
                    "preload": True,
                    "nosniff": True,
                }
            }
        },
    )
    print("HSTS nativo da zona ativado (vale também para robots.txt e 301).")

    path = f"/zones/{zone_id}/rulesets/phases/http_response_headers_transform/entrypoint"
    current = api("GET", path, token).get("result") or {}
    existing = list(current.get("rules") or [])
    ours = {
        RULE_NAME,
        f"{RULE_NAME} html",
        f"{RULE_NAME} robots",
        f"{RULE_NAME} sitemap",
        f"{RULE_NAME} nostore",
    }
    kept = [r for r in existing if r.get("description") not in ours]

    new_rules = [
        rule(RULE_NAME, ALL_EXPR, SECURITY_HEADERS),
        rule(f"{RULE_NAME} nostore", DOCS_EXPR, NO_STORE),
        rule(f"{RULE_NAME} html", HTML_EXPR, {"Content-Type": set_header("text/html; charset=utf-8")}),
        rule(f"{RULE_NAME} robots", ROBOTS_EXPR, {"Content-Type": set_header("text/plain; charset=utf-8")}),
        rule(f"{RULE_NAME} sitemap", SITEMAP_EXPR, {"Content-Type": set_header("application/xml; charset=utf-8")}),
    ]
    api("PUT", path, token, {"rules": kept + new_rules})
    print("Transform Rules de header publicadas.")
    print("Rode o ZAP de novo depois de 1–2 minutos.")


if __name__ == "__main__":
    main()

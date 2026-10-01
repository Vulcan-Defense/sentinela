import vinext from "vinext";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(async ({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: {
          main: "./worker/index.ts",
          compatibility_flags: ["nodejs_compat"],
          vars: Object.fromEntries(
            [
              "MYSQL_HOST",
              "MYSQL_PORT",
              "MYSQL_USER",
              "MYSQL_DATABASE",
              "CF_EMAIL_FROM",
              "STRIPE_PUBLISHABLE_KEY",
              "GOOGLE_CLIENT_ID",
            ]
              .map((key) => [key, fileEnv[key] || process.env[key] || ""])
              .filter(([, value]) => Boolean(value)),
          ),
          r2_buckets: [],
        },
      }),
    ],
  };
});

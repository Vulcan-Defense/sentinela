/* Copia js/crptochat-contrib.js para dentro do Cloudflare Worker.
   O Worker entrega esse script em produção enquanto o arquivo estático não é publicado. */
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const workerPath = new URL("cloudflare-worker.js", root);
const contribPath = new URL("js/crptochat-contrib.js", root);

const source = readFileSync(contribPath, "utf8");
const worker = readFileSync(workerPath, "utf8");

const begin = "/* BEGIN CONTRIB SCRIPT — gerado por scripts/sync-contrib-worker.mjs */";
const end = "/* END CONTRIB SCRIPT */";
const startIndex = worker.indexOf(begin);
const endIndex = worker.indexOf(end);

if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  throw new Error("Marcadores do script de contribuições não encontrados no Worker.");
}

const next =
  worker.slice(0, startIndex) +
  `${begin}\nconst CONTRIB_SCRIPT = ${JSON.stringify(source)};\n${end}` +
  worker.slice(endIndex + end.length);

writeFileSync(workerPath, next);
console.log("Script de contribuições sincronizado no Cloudflare Worker.");

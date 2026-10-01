import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "public", "patch-notes.json");
const highlightsPath = resolve(root, "data", "patch-notes-highlights.json");

const highlights = JSON.parse(readFileSync(highlightsPath, "utf8"));
let commits = [];

try {
  const log = execFileSync("git", [
    "log", "-20", "--date=iso-strict",
    "--pretty=format:%H%x1f%h%x1f%aI%x1f%s%x1e",
  ], { cwd: root, encoding: "utf8" });

  commits = log.split("\x1e").map(row => row.trim()).filter(Boolean).map(row => {
    const [hash, shortHash, date, rawMessage] = row.split("\x1f");
    const files = execFileSync("git", ["show", "--pretty=format:", "--name-only", hash], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/).map(file => file.trim()).filter(Boolean);
    const areas = [...new Set(files.map(file => {
      if (file.startsWith("app/")) return "Interface";
      if (file.startsWith("worker/")) return "Autenticação e serviços";
      if (file.startsWith("db/")) return "Dados";
      if (file.includes("wrangler") || file.includes("package")) return "Plataforma";
      return "Projeto";
    }))];
    const message = /^(up|update)$/i.test(rawMessage.trim()) ? "Atualização da plataforma" : rawMessage.trim();
    return { hash, shortHash, date, message, areas, filesChanged: files.length };
  });
} catch (error) {
  try {
    commits = JSON.parse(readFileSync(outputPath, "utf8")).commits || [];
  } catch {
    commits = [];
  }
}

writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), repository: "https://github.com/Vulcan-Defense/vulcan-academy", highlights, commits }, null, 2)}\n`);
console.log(`Patch notes atualizadas: ${commits.length} commits.`);

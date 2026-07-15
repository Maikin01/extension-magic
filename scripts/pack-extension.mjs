#!/usr/bin/env node
// Empacota a extensão com obfuscação forte de popup.js, license.js,
// background.js e ui-extras.js. Gera public/rise-lovable-extension.zip.
import { mkdirSync, rmSync, cpSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import JavaScriptObfuscator from "javascript-obfuscator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "extension");
const BUILD = resolve(ROOT, ".ext-build");
const OUT = resolve(ROOT, "public/rise-lovable-extension.zip");

// Arquivos que recebem obfuscação forte (o "cérebro" da extensão)
const TO_OBFUSCATE = ["popup.js", "license.js", "background.js", "ui-extras.js"];

const OBF_OPTS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.8,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false, // não usar: quebra devtools do próprio user, mas mantém baixo perfil
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  numbersToExpressions: true,
  renameGlobals: false, // NÃO renomear globais — window.__lvblFetch, chrome.*, etc.
  reservedNames: [
    "^chrome$",
    "^window$",
    "^document$",
    "^__lvblFetch$",
    "^__lvblAuthorizeSend$",
  ],
  reservedStrings: ["^chrome\\.", "^https?://"],
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 6,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.9,
  stringArrayWrappersCount: 3,
  stringArrayWrappersType: "function",
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  target: "browser",
};

console.log("[pack] cleaning build dir");
rmSync(BUILD, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });
cpSync(SRC, BUILD, { recursive: true });

for (const file of TO_OBFUSCATE) {
  const p = resolve(BUILD, file);
  if (!existsSync(p)) {
    console.log(`[pack] skip missing ${file}`);
    continue;
  }
  console.log(`[pack] obfuscating ${file}`);
  const src = readFileSync(p, "utf8");
  const out = JavaScriptObfuscator.obfuscate(src, OBF_OPTS).getObfuscatedCode();
  writeFileSync(p, out, "utf8");
}

console.log("[pack] zipping to", OUT);
mkdirSync(dirname(OUT), { recursive: true });
rmSync(OUT, { force: true });
execSync(`nix run nixpkgs#zip -- -r ${JSON.stringify(OUT)} .`, {
  cwd: BUILD,
  stdio: "inherit",
});

console.log("[pack] done");

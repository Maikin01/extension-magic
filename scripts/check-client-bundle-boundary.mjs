import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sourceDirectory = path.resolve(projectRoot, "src");
const args = process.argv.slice(2);
const sourceOnly = args.includes("--source-only");
const bundleOnly = args.includes("--bundle-only");
const clientDirectoryArgument = args.find((argument) => !argument.startsWith("--"));
const clientDirectory = path.resolve(projectRoot, clientDirectoryArgument ?? ".output/public");

if (sourceOnly && bundleOnly) {
  console.error("[architecture-boundary] Use apenas um modo: --source-only ou --bundle-only.");
  process.exit(1);
}

// Esta allowlist já reserva o único ponto browser -> Edge da arquitetura final,
// mesmo antes de o arquivo existir. Nenhum outro módulo pode invocar Functions.
const browserEdgeAllowlist = new Set(["src/lib/api/backend-client.ts"]);
const serverEdgeAllowlist = new Set(["src/lib/supabase-edge.server.ts"]);

// Acesso direto a tabelas fica restrito ao cliente e aos poucos pontos de auth
// explicitamente designados. Novas exceções devem ser avaliadas uma a uma.

// Estes marcadores identificam implementação de servidor. O protocolo público
// (backend-api, functions.invoke e nomes de actions) é permitido no cliente central.
const serverOnlyBundleMarkers = [
  { label: "helper invokeProtectedEdge", pattern: /invokeProtectedEdge/ },
  { label: "módulo supabase-edge.server", pattern: /supabase-edge\.server/ },
  { label: "tipo SupabaseFunctionContext", pattern: /SupabaseFunctionContext/ },
  {
    label: "invocação via contexto server-side",
    pattern: /context\s*\.\s*supabase\s*\.\s*functions\s*\.\s*invoke\s*\(/,
  },
  {
    label: "factory de handler server-side",
    pattern: /protected(?:Get|Post|PostWithoutInput)/,
  },
  {
    label: "service-role do Supabase",
    pattern: /SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9_-]{20,}/,
  },
  {
    label: "segredo administrativo",
    pattern:
      /MERCADO_PAGO_ACCESS_TOKEN|APP_USR-[A-Za-z0-9-]{20,}|ghp_[A-Za-z0-9]{20,}|sbp_[A-Za-z0-9]{20,}/,
  },
];

function toProjectPath(file) {
  return path.relative(projectRoot, file).split(path.sep).join("/");
}

async function listFiles(directory, acceptsFile) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath, acceptsFile)));
    } else if (entry.isFile() && acceptsFile(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

async function scanSource() {
  const sourceFiles = await listFiles(sourceDirectory, (name) => /\.(?:[cm]?[jt]sx?)$/.test(name));
  const violations = [];

  for (const file of sourceFiles) {
    const source = await readFile(file, "utf8");
    const relativeFile = toProjectPath(file);

    if (/\.functions\s*\.\s*invoke\s*\(/.test(source) && !browserEdgeAllowlist.has(relativeFile)) {
      violations.push(`${relativeFile}: .functions.invoke fora de src/lib/api/backend-client.ts`);
    }

    // Array.from/Buffer.from não são consultas ao banco e não entram na regra.
    const sourceWithoutNativeFrom = source.replace(/\b(?:Array|Buffer)\.from\s*\(/g, "");
    if (/\.from\s*\(/.test(sourceWithoutNativeFrom)) {
      violations.push(`${relativeFile}: acesso direto .from() proibido no frontend`);
    }

    if (/\b(?:createServerFn|useServerFn)\b/.test(source)) {
      violations.push(`${relativeFile}: ServerFn proibida na fronteira de dados do frontend`);
    }

    if (
      /\/functions\/v1(?:\/|["'`])/.test(source) &&
      !browserEdgeAllowlist.has(relativeFile) &&
      !serverEdgeAllowlist.has(relativeFile)
    ) {
      violations.push(`${relativeFile}: URL direta de Edge Function fora do cliente central`);
    }
  }

  return { filesScanned: sourceFiles.length, violations };
}

async function scanBundle() {
  const javaScriptFiles = await listFiles(clientDirectory, (name) => name.endsWith(".js"));
  const violations = [];

  if (javaScriptFiles.length === 0) {
    violations.push(`${toProjectPath(clientDirectory)}: nenhum JavaScript encontrado`);
  }

  for (const file of javaScriptFiles) {
    const source = await readFile(file, "utf8");
    const relativeFile = toProjectPath(file);

    for (const marker of serverOnlyBundleMarkers) {
      if (marker.pattern.test(source)) {
        violations.push(`${relativeFile}: ${marker.label}`);
      }
    }
  }

  return { filesScanned: javaScriptFiles.length, violations };
}

const results = [];

try {
  if (!bundleOnly) results.push({ name: "source", ...(await scanSource()) });
  if (!sourceOnly) results.push({ name: "bundle", ...(await scanBundle()) });
} catch (error) {
  console.error(
    `[architecture-boundary] Não foi possível ler os artefatos. Execute o build antes da checagem do bundle.`,
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const violations = results.flatMap((result) => result.violations);

if (violations.length > 0) {
  console.error("[architecture-boundary] Falha: fronteira arquitetural violada:");
  for (const violation of [...new Set(violations)].sort()) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

const summary = results
  .map((result) => `${result.filesScanned} arquivo(s) de ${result.name}`)
  .join(" e ");
console.log(`[architecture-boundary] OK: ${summary} validados.`);

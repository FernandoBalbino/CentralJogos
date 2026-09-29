import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import vm from "node:vm";

// Verifica a lista usada pelo próprio worker, sem reproduzir um catálogo paralelo.
const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, "service-worker.js"), "utf8");
const context = { URL, self: { addEventListener() {} } };
vm.runInNewContext(`${source}\nglobalThis.packages = { basic: PRECACHE_PATHS, ...GAME_OFFLINE_PATHS };`, context);
const report = {};
for (const [id, paths] of Object.entries(context.packages)) {
  let bytes = 0;
  for (const path of new Set(paths)) bytes += (await stat(resolve(root, path))).size;
  report[id] = { files: new Set(paths).size, bytes, MiB: Number((bytes / 1048576).toFixed(3)) };
}
JSON.parse(await readFile(resolve(root, "manifest.webmanifest"), "utf8"));
const base = process.argv[2];
if (base) {
  const expectedTypes = { ".mjs": "javascript", ".js": "javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "manifest+json" };
  const paths = [...new Set(Object.values(context.packages).flat())];
  // Pequenos lotes evitam sobrecarregar o servidor estático.
  for (let i = 0; i < paths.length; i += 12) await Promise.all(paths.slice(i, i + 12).map(async (path) => {
    const response = await fetch(new URL(path, base));
    if (!response.ok) throw Error(`${path}: HTTP ${response.status}`);
    const type = expectedTypes[extname(path)];
    if (type && !response.headers.get("content-type")?.includes(type)) throw Error(`${path}: tipo incorreto`);
    await response.arrayBuffer();
  }));
  const missing = await fetch(new URL("./arquivo-inexistente-qa.mjs", base));
  if (missing.status !== 404) throw Error("Arquivo ausente deve retornar HTTP 404.");
  console.log(`HTTP e tipos: ${paths.length} caminhos válidos em ${base}`);
}
console.log(JSON.stringify(report, null, 2));

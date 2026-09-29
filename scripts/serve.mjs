import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";

const root = normalize(join(import.meta.dirname, ".."));
const port = Number(process.env.CENTRAL_JOGOS_PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json"
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  if (pathname === "/CentralJogos") { response.writeHead(307, { Location: "/CentralJogos/" }); response.end(); return; }
  const scopedPath = pathname.startsWith("/CentralJogos/") ? pathname.slice("/CentralJogos".length) : pathname;
  const requested = resolve(root, scopedPath === "/" ? "index.html" : scopedPath.replace(/^\/+/, ""));
  const taskRelativePath = relative(root, requested);
  if (taskRelativePath.startsWith("..") || !existsSync(requested) || !statSync(requested).isFile()) { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); response.end("Arquivo não encontrado."); return; }
  const safePath = requested;
  response.writeHead(200, {
    "Content-Type": types[extname(safePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(safePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`CentralJogos em http://127.0.0.1:${port}/\n`);
});

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
function setup() {
  const handlers = new Map(), stores = new Map(), requests = [], failures = new Set();
  const normalize = (request) => { const url = new URL(typeof request === "string" ? request : request.url); url.search = ""; return url.href; };
  const caches = { async open(name) { if (!stores.has(name)) stores.set(name, new Map()); const data = stores.get(name); return { async match(url) { return data.get(normalize(url)); }, async put(url, response) { data.set(normalize(url), response); } }; }, async keys() { return [...stores.keys()]; }, async delete(name) { return stores.delete(name); } };
  const self = { registration: { scope: "https://school.example/CentralJogos/" }, location: { origin: "https://school.example" }, clients: { async claim() {} }, async skipWaiting() {}, addEventListener(type, handler) { handlers.set(type, handler); } };
  vm.runInNewContext(source, { self, caches, URL, Response, fetch: async (url) => { requests.push(url); return new Response("local asset", { status: failures.has(new URL(url).pathname) ? 404 : 200 }); } });
  const run = (type, data, port) => { let promise; handlers.get(type)({ data, ports: port ? [port] : [], waitUntil(value) { promise = value; } }); return promise; };
  const message = async (data) => { const replies = []; await run("message", data, { postMessage(reply) { replies.push(reply); } }); return replies; };
  return { stores, requests, failures, run, message };
}
test("precache básico evita Three.js e módulos 3D; pacote usa caminhos no subdiretório", async () => {
  const env = setup(); await env.run("install");
  assert.ok(env.requests.length > 100);
  assert.ok(env.requests.every((url) => url.startsWith("https://school.example/CentralJogos/")));
  assert.ok(!env.requests.some((url) => /vendor\/three|oficina-pc.*\.mjs|windows-mission.*\.mjs/.test(url)));
  const replies = await env.message({ type: "PREPARE_GAME_OFFLINE", gameId: "oficina-pc" }); assert.equal(replies.at(-1).ok, true);
  assert.ok(env.requests.some((url) => url.endsWith("/controls/OrbitControls.js")));
  assert.equal((await env.message({ type: "GAME_OFFLINE_STATUS", gameId: "oficina-pc" })).at(-1).ready, true);
  const count = env.requests.length; await env.message({ type: "PREPARE_GAME_OFFLINE", gameId: "oficina-pc" }); assert.equal(env.requests.length, count);
});
test("pacote incompleto não aparece disponível offline e pode ser recuperado", async () => {
  const env = setup(); env.failures.add("/CentralJogos/js/oficina-pc-scene.mjs");
  const failed = await env.message({ type: "PREPARE_GAME_OFFLINE", gameId: "oficina-pc" }); assert.equal(failed.at(-1).ok, false);
  assert.equal((await env.message({ type: "GAME_OFFLINE_STATUS", gameId: "oficina-pc" })).at(-1).ready, false);
  env.failures.clear(); assert.equal((await env.message({ type: "PREPARE_GAME_OFFLINE", gameId: "oficina-pc" })).at(-1).ok, true);
  assert.equal((await env.message({ type: "GAME_OFFLINE_STATUS", gameId: "oficina-pc" })).at(-1).ready, true);
  const count = env.requests.length; assert.equal((await env.message({ type: "PREPARE_GAME_OFFLINE", gameId: "../../other" })).at(-1).ok, false); assert.equal(env.requests.length, count);
});
test("ativação substitui apenas os caches da Central; treinamento possui seu pacote", async () => {
  const env = setup(); env.stores.set("central-jogos-offline-v28", new Map()); env.stores.set("another-project-cache", new Map());
  await env.run("install"); assert.ok(env.stores.has("central-jogos-offline-v28"));
  await env.run("activate"); assert.ok(!env.stores.has("central-jogos-offline-v28")); assert.ok(env.stores.has("another-project-cache"));
  assert.equal((await env.message({ type: "GAME_OFFLINE_STATUS", gameId: "windows-mission" })).at(-1).ready, false);
  await env.message({ type: "PREPARE_GAME_OFFLINE", gameId: "windows-mission" });
  assert.equal((await env.message({ type: "GAME_OFFLINE_STATUS", gameId: "windows-mission" })).at(-1).ready, true);
});

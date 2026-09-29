import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Executa o controlador real da aplicação com downloads controlados.
const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const loader = app.slice(app.indexOf("  const enterLazyGame ="), app.indexOf("  const shuffle ="));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
const setup = () => {
  let mounted = 0, entered = 0, prepared = 0, route = "oficina-pc", imports = 0;
  const css = deferred(), module = deferred(), progress = {}, root = { dataset: {}, querySelector: () => progress };
  const entry = { rootId: "test-root", title: "Oficina do PC", css: "oficina-pc.css", load: () => { imports++; return module.promise; } };
  const context = { lazyGames: { "oficina-pc": entry }, document: { getElementById: () => root }, routeGeneration: 1, getRoute: () => route, loadGameCss: () => css.promise, prepareGameOffline: () => prepared++, navigator: { onLine: true } };
  vm.runInNewContext(`${loader}\nglobalThis.start = enterLazyGame;`, context);
  const game = { mount() { mounted++; }, enter() { entered++; } };
  return { context, css, module, game, root, setRoute: (value) => { route = value; }, counts: () => ({ mounted, entered, prepared, imports }) };
};
test("sair enquanto o CSS carrega não importa nem monta o jogo", async () => {
  const env = setup(), pending = env.context.start("oficina-pc", 1);
  env.setRoute("home"); env.context.routeGeneration++; env.css.resolve(); await pending;
  assert.deepEqual(env.counts(), { mounted: 0, entered: 0, prepared: 0, imports: 0 });
});
test("sair durante importação não cria cena nem inicia o pacote offline", async () => {
  const env = setup(), pending = env.context.start("oficina-pc", 1); env.css.resolve(); await tick();
  assert.equal(env.counts().imports, 1); env.setRoute("home"); env.context.routeGeneration++; env.module.resolve(env.game); await pending;
  assert.deepEqual(env.counts(), { mounted: 0, entered: 0, prepared: 0, imports: 1 });
});
test("voltar rapidamente à rota usa a importação pendente e só monta a última abertura", async () => {
  const env = setup(), old = env.context.start("oficina-pc", 1); env.css.resolve(); await tick();
  env.context.routeGeneration = 3;
  const current = env.context.start("oficina-pc", 3); await tick(); env.module.resolve(env.game); await Promise.all([old, current]);
  assert.deepEqual(env.counts(), { mounted: 1, entered: 1, prepared: 1, imports: 1 }); assert.equal(env.root.dataset.loadingStage, "scene-ready");
});

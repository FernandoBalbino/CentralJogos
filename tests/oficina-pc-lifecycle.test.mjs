import test from "node:test";
import assert from "node:assert/strict";
import { WorkshopGame } from "../js/oficina-pc.mjs";
import { WorkshopInteractions } from "../js/oficina-pc-interactions.mjs";
import { COMPONENTS, STORAGE_KEY } from "../js/oficina-pc-data.mjs";

class Surface extends EventTarget {
  constructor() { super(); this.dataset = {}; this.classList = { add() {}, remove() {} }; this.innerHTML = ""; this.clientWidth = 1366; this.disabled = false; }
  setAttribute() {}
  focus() {}
}
const setup = () => {
  const host = new Surface(), document = new Surface(), root = new Surface(), elements = new Map();
  document.body = new Surface(); host.matchMedia = () => ({ matches: true });
  root.querySelector = (key) => { if (!elements.has(key)) elements.set(key, new Surface()); return elements.get(key); };
  const stored = new Map([["outro-jogo", "preservar"]]);
  const storage = { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) };
  const scenes = [], interactions = [];
  const game = new WorkshopGame({ host, document, storage, sceneFactory: () => {
    const scene = { sync() {}, navigation: { overview() {}, focus() {} }, tweens: [], pauseCount: 0, resumeCount: 0, destroyCount: 0, pause() { this.pauseCount++; }, resume() { this.resumeCount++; }, cancelDrag() {}, destroy() { this.destroyCount++; }, animateMotion: async () => {} };
    scenes.push(scene); return scene;
  }, interactionsFactory: () => { const interaction = { cancelCount: 0, destroyCount: 0, cancel() { this.cancelCount++; }, destroy() { this.destroyCount++; } }; interactions.push(interaction); return interaction; } });
  game.mount(root); return { game, host, document, root, stored, scenes, interactions };
};

test("entradas repetidas criam uma cena por abertura e descartam listeners e recursos", () => {
  const { game, document, scenes, interactions } = setup();
  for (let i = 0; i < 4; i++) {
    game.enter(); game.enter(); assert.equal(scenes.length, i + 1);
    document.hidden = true; document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(scenes[i].pauseCount, 1); assert.equal(interactions[i].cancelCount, 1);
    document.hidden = false; document.dispatchEvent(new Event("visibilitychange")); assert.equal(scenes[i].resumeCount, 1);
    game.leave(); game.leave(); assert.equal(scenes[i].destroyCount, 1); assert.equal(interactions[i].destroyCount, 1); assert.equal(game.listeners.length, 0);
    document.dispatchEvent(new Event("visibilitychange")); assert.equal(scenes[i].resumeCount, 1);
  }
});
test("sair durante encaixe não confirma uma animação antiga; reset preserva outros jogos", async () => {
  const { game, stored } = setup(); game.enter();
  for (let i = 0; i < 3; i++) game.apply({ type: "CONTINUE" });
  let finish; game.scene.animateMotion = () => new Promise((resolve) => { finish = resolve; });
  game.select("motherboard"); game.drop({ componentId: "motherboard", position: COMPONENTS.motherboard.snapPosition });
  assert.ok(game.state.motion); game.leave(); finish(); await Promise.resolve(); await Promise.resolve();
  assert.equal(game.state.installed.length, 0); game.enter(); assert.equal(game.state.phase, "MOTHERBOARD");
  game.reset(); assert.equal(stored.has(STORAGE_KEY), false); assert.equal(stored.get("outro-jogo"), "preservar"); game.leave();
});
test("armazenamento indisponível não impede jogar e recomeçar", () => {
  const { game } = setup(); game.storageOverride = { getItem() { throw Error("bloqueado"); }, setItem() { throw Error("bloqueado"); }, removeItem() { throw Error("bloqueado"); } };
  game.enter(); game.apply({ type: "CONTINUE" }); assert.equal(game.state.phase, "TUTORIAL"); game.reset(); assert.equal(game.state.phase, "INTRO"); game.leave();
});
test("arraste intercepta OrbitControls, aceita touch e cancela ao perder captura", () => {
  const canvas = new Surface(); canvas.setPointerCapture = () => {}; canvas.hasPointerCapture = () => false;
  let cancelled = 0, dropped = 0, dragged = 0, intercepted = 0;
  const scene = { canvas, navigation: { controls: { enabled: true } }, pick: () => ({ componentId: "motherboard", kind: "tray", object: {} }), beginDrag() { dragged++; }, dragTo() {}, cancelDrag() { cancelled++; this.navigation.controls.enabled = true; }, endDrag: () => ({ componentId: "motherboard", position: COMPONENTS.motherboard.snapPosition }) };
  const control = new WorkshopInteractions(scene, { getState: () => ({ phase: "MOTHERBOARD" }), select() {}, drop() { dropped++; }, power() {}, inspect() {} });
  const event = { button: 0, pointerType: "touch", pointerId: 2, clientX: 20, clientY: 20, preventDefault() {}, stopImmediatePropagation() { intercepted++; } };
  control.down(event); assert.equal(scene.navigation.controls.enabled, false);
  control.move({ ...event, clientX: 80 }); assert.equal(dragged, 1); control.up(event); assert.equal(dropped, 1); assert.equal(scene.navigation.controls.enabled, true); assert.equal(intercepted, 3);
  control.down(event); canvas.dispatchEvent(new Event("pointercancel")); assert.equal(control.pointer, null); assert.equal(cancelled, 1);
  control.destroy(); assert.equal(control.listeners.length, 0); canvas.dispatchEvent(new Event("pointercancel")); assert.equal(cancelled, 2);
});

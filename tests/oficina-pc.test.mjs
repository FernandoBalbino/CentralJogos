import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { createState, transition, acceptsSnap, outsideCase, serializeProgress, restoreProgress } from "../js/oficina-pc-core.mjs";
import { COMPONENTS, STEPS, PHASES, INSTALL_ORDER, choicesFor } from "../js/oficina-pc-data.mjs";

const action = (state, type, values = {}) => transition(state, { type, ...values });
const start = () => [1, 2, 3].reduce((state) => action(state, "CONTINUE"), createState());
const install = (state, id) => {
  state = action(state, "SELECT", { componentId: id });
  state = action(state, "DROP", { componentId: id, position: COMPONENTS[id].snapPosition });
  assert.equal(state.motion.componentId, id);
  return action(state, "ANIMATION_DONE", { kind: "install", componentId: id });
};
const assembled = () => INSTALL_ORDER.reduce(install, start());
const connect = (state, id = "power-plug") => {
  state = action(state, "SELECT", { componentId: id });
  state = action(state, "DROP", { componentId: id, position: COMPONENTS[id].snapPosition });
  assert.equal(state.motion.kind, "connect");
  return action(state, "ANIMATION_DONE", { kind: "connect", componentId: id });
};
const boot = (state) => action(action(state, "POWER"), "ANIMATION_DONE", { kind: "power" });
const beginMaintenance = () => {
  let state = connect(action(assembled(), "CONTINUE"));
  state = action(state, "POWER"); state = action(state, "ANIMATION_DONE", { kind: "power" });
  state = action(state, "CONTINUE"); return action(state, "CONTINUE");
};
test("oito etapas e peças genéricas têm configuração completa e encaixes válidos", () => {
  assert.equal(STEPS.length, 8); assert.equal(new Set(PHASES).size, PHASES.length);
  assert.deepEqual(STEPS.slice(1).map((step) => step.componentId), INSTALL_ORDER);
  for (const [id, part] of Object.entries(COMPONENTS)) {
    assert.equal(part.id, id); assert.equal(part.distractors.length, 2);
    assert.ok(part.distractors.every((other) => COMPONENTS[other] && other !== id));
    for (const key of ["startPosition", "startRotation", "snapPosition", "snapRotation", "cameraTarget", "cameraOffset"]) assert.ok(part[key].length === 3 && part[key].every(Number.isFinite));
    assert.ok(part.purpose && part.location && part.characteristic && part.snapRadius > 0);
    assert.ok(acceptsSnap(id, part.snapPosition));
  }
  assert.equal(acceptsSnap("ram", [Infinity, 0, 0]), false); assert.equal(acceptsSnap("unknown", [0, 0, 0]), false);
});
test("escolhas erradas, fora da zona e eventos duplicados não avançam", () => {
  let state = start(); assert.equal(state.phase, "MOTHERBOARD");
  assert.equal(action(state, "CONTINUE"), state);
  state = action(state, "SELECT", { componentId: "gpu" });
  state = action(state, "DROP", { componentId: "gpu", position: COMPONENTS.motherboard.snapPosition });
  assert.equal(state.phase, "MOTHERBOARD"); assert.equal(state.installed.length, 0); assert.equal(state.motion, null);
  state = action(state, "SELECT", { componentId: "motherboard" });
  state = action(state, "DROP", { componentId: "motherboard", position: [100, 100, 100] }); assert.equal(state.motion, null);
  state = action(state, "DROP", { componentId: "motherboard", position: COMPONENTS.motherboard.snapPosition });
  assert.equal(action(state, "SELECT", { componentId: "gpu" }), state);
  assert.equal(action(state, "ANIMATION_DONE", { kind: "remove", componentId: "motherboard" }), state);
  state = action(state, "ANIMATION_DONE", { kind: "install", componentId: "motherboard" });
  const next = action(state, "ANIMATION_DONE", { kind: "install", componentId: "motherboard" }); assert.equal(next, state); assert.equal(state.phase, "CPU");
});
test("montagem completa mantém HD, exige Power e desliga ao iniciar manutenção", () => {
  let state = assembled(); assert.equal(state.phase, "ASSEMBLED"); assert.deepEqual(state.installed, INSTALL_ORDER); assert.ok(!state.installed.includes("ssd"));
  state = action(state, "CONTINUE"); assert.equal(state.phase, "CONNECT_POWER"); assert.equal(action(state, "POWER"), state); assert.equal(action(state, "CONTINUE"), state);
  state = connect(state); assert.equal(state.plugged, true);
  state = action(state, "POWER"); state = action(state, "ANIMATION_DONE", { kind: "power" }); assert.equal(state.powered, true);
  state = action(state, "CONTINUE"); assert.equal(state.phase, "CLIENT_ORDER");
  state = action(state, "CONTINUE"); assert.equal(state.phase, "FIND_HDD"); assert.equal(state.powered, false); assert.equal(state.plugged, false); assert.equal(state.selectedId, null);
});
test("manutenção exige identificar o HD e retirá-lo para fora do gabinete", () => {
  let state = beginMaintenance();
  state = action(state, "SELECT", { componentId: "ram" }); assert.equal(state.hddFound, false); assert.equal(state.phase, "FIND_HDD");
  assert.equal(action(state, "REMOVE", { componentId: "hdd", position: [4, 0, 0] }), state);
  state = action(state, "SELECT", { componentId: "hdd" }); assert.equal(state.phase, "REMOVE_HDD");
  state = action(state, "REMOVE", { componentId: "hdd", position: COMPONENTS.hdd.snapPosition }); assert.equal(state.motion, null);
  assert.equal(outsideCase([0, 0, 0]), false); assert.equal(outsideCase([4, 0, 0]), true);
  state = action(state, "REMOVE", { componentId: "hdd", position: [4, 0, 0] });
  state = action(state, "ANIMATION_DONE", { kind: "remove", componentId: "hdd" });
  assert.equal(state.phase, "SELECT_SSD"); assert.equal(state.hddRemoved, true); assert.ok(!state.installed.includes("hdd"));
});
test("três desafios exigem instalação, energia, teste e respostas corretas", () => {
  let state = beginMaintenance(); state = action(state, "SELECT", { componentId: "hdd" }); state = action(state, "REMOVE", { componentId: "hdd", position: [4, 0, 0] }); state = action(state, "ANIMATION_DONE", { kind: "remove", componentId: "hdd" });
  state = action(state, "SELECT", { componentId: "cpu" }); assert.equal(action(state, "INSTALL_SSD"), state);
  state = action(state, "SELECT", { componentId: "ssd" }); state = action(state, "INSTALL_SSD"); assert.equal(state.phase, "INSTALL_SSD");
  state = install(state, "ssd"); assert.equal(state.phase, "CONNECT_POWER"); state = connect(state); assert.equal(state.phase, "FINAL_TEST"); assert.equal(action(state, "CONTINUE"), state);
  state = action(state, "POWER"); state = action(state, "ANIMATION_DONE", { kind: "power" }); state = action(state, "CONTINUE");
  const wrong = action(state, "ANSWER", { answer: true }); assert.equal(wrong.phase, "FINAL_QUESTION"); assert.equal(wrong.completed, false);
  state = action(wrong, "ANSWER", { answer: false }); assert.equal(state.phase, "RAM_ORDER"); assert.equal(state.hddDone, true);
  state = action(state, "CONTINUE"); assert.equal(state.powered, false); assert.equal(state.plugged, false);
  state = action(state, "SELECT", { componentId: "ssd" }); assert.equal(state.phase, "FIND_RAM");
  state = action(state, "SELECT", { componentId: "ram" });
  state = action(state, "REMOVE", { componentId: "ram", position: COMPONENTS.ram.snapPosition }); assert.equal(state.motion, null);
  state = action(state, "REMOVE", { componentId: "ram", position: [4, 0, 0] }); state = action(state, "ANIMATION_DONE", { kind: "remove", componentId: "ram" });
  assert.equal(state.phase, "SELECT_RAM"); assert.equal(state.installed.includes("ram"), false);
  assert.equal(action(state, "INSTALL_RAM"), state);
  state = action(state, "SELECT", { componentId: "ram" }); state = action(state, "INSTALL_RAM"); state = install(state, "ram");
  assert.equal(state.ramReplaced, true); state = connect(state); state = boot(state); state = action(state, "CONTINUE");
  assert.equal(action(state, "ANSWER", { answer: true }).phase, "RAM_QUESTION"); state = action(state, "ANSWER", { answer: false });
  state = action(state, "CONTINUE"); state = action(state, "SELECT", { componentId: "cpu" }); assert.equal(state.phase, "FIND_MOUSE");
  state = action(state, "SELECT", { componentId: "mouse" }); assert.equal(state.phase, "CONNECT_MOUSE"); assert.equal(action(state, "TEST_MOUSE"), state);
  state = connect(state, "mouse-usb"); assert.equal(action(state, "CONTINUE"), state);
  state = action(state, "TEST_MOUSE"); assert.equal(action(state, "TEST_MOUSE"), state); state = action(state, "ANIMATION_DONE", { kind: "mouse-test" }); state = action(state, "CONTINUE");
  assert.equal(action(state, "ANSWER", { answer: true }).phase, "MOUSE_QUESTION"); state = action(state, "ANSWER", { answer: false }); assert.equal(state.phase, "COMPLETED"); assert.equal(state.completed, true);
  assert.deepEqual(restoreProgress(serializeProgress(state)), state);
  assert.deepEqual(action(state, "RESET"), createState());
});
test("peças instaladas nunca reaparecem como distratores e conexões erradas não avançam", () => {
  let state = start();
  for (const id of INSTALL_ORDER) { assert.ok(choicesFor(state.phase, state.installed).every((part) => !state.installed.includes(part))); state = install(state, id); }
  state = action(state, "CONTINUE"); state = action(state, "SELECT", { componentId: "power-plug" });
  state = action(state, "DROP", { componentId: "power-plug", position: [0, 0, 0] }); assert.equal(state.phase, "CONNECT_POWER"); assert.equal(state.plugged, false);
  assert.equal(action(state, "POWER"), state); state = connect(state); assert.equal(state.phase, "POWER_ON");
});
test("checkpoint antigo migra para os novos desafios sem perder a montagem", () => {
  const old = { version: 1, phase: "COMPLETED", installed: [...INSTALL_ORDER.filter((id) => id !== "hdd"), "ssd"], hddFound: true, hddRemoved: true, completed: true, powered: true };
  const restored = restoreProgress(old); assert.equal(restored.phase, "RAM_ORDER"); assert.equal(restored.hddDone, true); assert.equal(restored.completed, false); assert.equal(restored.plugged, true);
  const plugging = action(assembled(), "CONTINUE"); assert.deepEqual(restoreProgress(serializeProgress(plugging)), plugging);
});
test("retomada elimina ações transitórias e não aceita progresso sem pré-requisitos", () => {
  let state = install(start(), "motherboard");
  const restored = restoreProgress(serializeProgress(state)); assert.equal(restored.phase, "CPU"); assert.equal(restored.selectedId, null); assert.equal(restored.motion, null);
  assert.equal(restoreProgress('{"version":1,"phase":"COMPLETED","installed":[]}').phase, "MOTHERBOARD");
  assert.deepEqual(restoreProgress("invalid"), createState()); assert.deepEqual(restoreProgress({ version: 999 }), createState());
  const forged = { ...assembled(), phase: "COMPLETED", hddFound: false, hddRemoved: true, completed: true, powered: true };
  assert.equal(restoreProgress(forged).phase, "FIND_HDD");
  const found = { ...assembled(), phase: "REMOVE_HDD", hddFound: true };
  assert.equal(restoreProgress(found).phase, "REMOVE_HDD");
});
test("rota, importação sob demanda, arquivos e controles acessíveis estão integrados", async () => {
  const root = new URL("../", import.meta.url);
  const [html, app, worker, ui] = await Promise.all(["index.html", "js/app.js", "service-worker.js", "js/oficina-pc.mjs"].map((path) => readFile(new URL(path, root), "utf8")));
  assert.match(html, /#\/oficina-do-pc/); assert.match(html, /oficina-pc-app/); assert.match(html, /ABRIR OFICINA/);
  assert.doesNotMatch(app, /import\s*\{\s*windowsMissionGame\s*\}\s*from/); assert.match(app, /import\("\.\/oficina-pc.mjs/);
  assert.match(worker, /PREPARE_GAME_OFFLINE/); assert.match(worker, /central-jogos-offline-v31/);
  assert.match(ui, /EXAMINAR PEÇA/); assert.match(ui, /SIMULAÇÃO ILUSTRATIVA/); assert.match(ui, /aria-live="polite"/);
  for (const path of ["oficina-pc.css", ...["", "-core", "-data", "-scene", "-models", "-camera", "-interactions"].map((suffix) => `js/oficina-pc${suffix}.mjs`), "vendor/three/controls/OrbitControls.js", "assets/oficina-pc/oficina-pc-preview.jpg"]) await access(new URL(path, root));
});

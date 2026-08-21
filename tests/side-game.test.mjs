import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  optionSets,
  sideGameItems,
  sideGameItemMap,
  getOptionsForItem,
  getQuestionForItem
} from "../js/side-game-data.mjs";
import {
  VALID_PHASES,
  buildWheelCandidates,
  calculateStopAngle,
  createCountdown,
  createDeck,
  createSession,
  finishRound,
  formatTimer,
  isActionAllowed,
  markItemPresented,
  normalizeAngle,
  pauseCountdown,
  readCountdown,
  reconcileSession,
  resumeCountdown,
  reserveNextItem
} from "../js/side-game-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sequenceRandom = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test("dataset possui 74 registros válidos e IDs únicos", async () => {
  assert.equal(sideGameItems.length, 74);
  assert.equal(new Set(sideGameItems.map((item) => item.id)).size, 74);
  assert.ok(!sideGameItemMap.has("tcp-ip"));

  const allowed = {
    nature: new Set(["hardware", "software", "neither"]),
    peripheral: new Set(["input", "output", "hybrid"])
  };

  for (const item of sideGameItems) {
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.ok(item.name.length > 0, `${item.id} sem nome`);
    assert.ok(item.alt.length > 0, `${item.id} sem texto alternativo`);
    assert.ok(item.explanation.length >= 30, `${item.id} sem explicação suficiente`);
    assert.ok(allowed[item.mode]?.has(item.answer), `${item.id} combina modo e resposta inválidos`);
    assert.ok(item.creditId || item.attribution, `${item.id} sem atribuição`);
    await access(resolve(projectRoot, item.image.replace(/^\.\//, "")));
  }
});

test("classes de periféricos têm 11 itens cada", () => {
  const peripheralItems = sideGameItems.filter((item) => item.mode === "peripheral");
  for (const answer of ["input", "output", "hybrid"]) {
    assert.equal(peripheralItems.filter((item) => item.answer === answer).length, 11);
  }
});

test("cada item apresenta somente o conjunto de respostas do próprio modo", () => {
  for (const id of ["teclado", "mouse", "touchpad", "controle-vibracao"]) {
    const item = sideGameItemMap.get(id);
    assert.equal(item.mode, "peripheral");
    assert.deepEqual(getOptionsForItem(item), optionSets.peripheral);
    assert.equal(getQuestionForItem(item), "Que tipo de periférico é?");
  }

  for (const id of ["memoria-ram", "windows", "internet"]) {
    const item = sideGameItemMap.get(id);
    assert.equal(item.mode, "nature");
    assert.deepEqual(getOptionsForItem(item), optionSets.nature);
    assert.equal(getQuestionForItem(item), "O que este item é?");
  }
});

test("baralho não repete antes do fim do ciclo", () => {
  const ids = sideGameItems.map((item) => item.id);
  const session = createSession(sideGameItems, sequenceRandom(0.11, 0.72, 0.31, 0.94));
  const drawn = [];

  for (let index = 0; index < ids.length; index += 1) {
    const itemId = reserveNextItem(session, sideGameItems, () => 0.5);
    drawn.push(itemId);
    markItemPresented(session, itemId, `2026-08-14T00:00:${String(index).padStart(2, "0")}Z`);
    finishRound(session);
  }

  assert.equal(new Set(drawn).size, ids.length);
  assert.deepEqual(new Set(drawn), new Set(ids));
  assert.equal(session.cycleComplete, true);
});

test("novo ciclo evita repetir imediatamente o último item", () => {
  const ids = ["a", "b", "c"];
  const deck = createDeck(ids, () => 0.999, "a");
  assert.notEqual(deck[0], "a");

  const session = createSession(sideGameItems, () => 0.2);
  session.remainingIds = [];
  session.usedIds = sideGameItems.map((item) => item.id);
  const lastId = session.usedIds.at(-1);
  const nextId = reserveNextItem(session, sideGameItems, () => 0.999);
  assert.notEqual(nextId, lastId);
  assert.equal(session.cycle, 2);
});

test("roleta inclui o alvo e para no centro de qualquer segmento", () => {
  const ids = sideGameItems.map((item) => item.id);
  const targetId = ids[17];
  const candidates = buildWheelCandidates(ids, targetId, 12, sequenceRandom(0.2, 0.8, 0.4));
  assert.equal(candidates.ids.length, 12);
  assert.equal(new Set(candidates.ids).size, 12);
  assert.equal(candidates.ids[candidates.targetIndex], targetId);

  for (let targetIndex = 0; targetIndex < 12; targetIndex += 1) {
    const stopAngle = calculateStopAngle({ startAngle: 37, targetIndex, segmentCount: 12, turns: 7 });
    const segmentCenter = (targetIndex * 30) + 15;
    assert.ok(stopAngle > 37 + (6 * 360));
    assert.ok(Math.abs(normalizeAngle(stopAngle + segmentCenter)) < 1e-9);
  }
});

test("sessão persistida é saneada e uma rotação interrompida volta como revelação", () => {
  const original = createSession(sideGameItems, () => 0.4);
  const current = original.remainingIds[0];
  const restored = reconcileSession({
    ...original,
    currentPhase: "spinning",
    currentItemId: current,
    reservedItemId: current,
    remainingIds: [current, "nao-existe", ...original.remainingIds.slice(1)],
    usedIds: ["teclado", "teclado", "nao-existe"],
    remainingSeconds: -3,
    settings: { durationSeconds: 27, soundEnabled: false, explanationsEnabled: false }
  }, sideGameItems, () => 0.3);

  assert.equal(restored.currentPhase, "reveal");
  assert.equal(restored.reservedItemId, current);
  assert.ok(!restored.remainingIds.includes(current));
  assert.deepEqual(restored.usedIds, ["teclado"]);
  assert.equal(restored.remainingSeconds, 0);
  assert.equal(restored.settings.durationSeconds, 60);
  assert.equal(restored.settings.soundEnabled, false);
  assert.equal(restored.settings.explanationsEnabled, false);
});

test("ações respeitam a máquina de estados e o cronômetro é formatado", () => {
  for (const phase of VALID_PHASES) assert.equal(isActionAllowed(phase, "fullscreen"), true);
  assert.equal(isActionAllowed("intro", "spin"), false);
  assert.equal(isActionAllowed("wheel", "spin"), true);
  assert.equal(isActionAllowed("spinning", "advance"), false);
  assert.equal(isActionAllowed("reveal", "advance"), true);
  assert.equal(isActionAllowed("choosing", "pause"), true);
  assert.equal(isActionAllowed("result", "next"), true);
  assert.equal(formatTimer(60), "01:00");
  assert.equal(formatTimer(5.1), "00:06");
  assert.equal(formatTimer(-2), "00:00");
});

test("pausa e retomada do cronômetro não acumulam deriva", () => {
  let countdown = createCountdown(60, 1_000);
  assert.equal(readCountdown(countdown, 11_000), 50_000);
  countdown = pauseCountdown(countdown, 11_000);
  assert.equal(readCountdown(countdown, 91_000), 50_000);
  countdown = resumeCountdown(countdown, 91_000);
  assert.equal(readCountdown(countdown, 101_000), 40_000);
});

import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  supportCards,
  supportSlotTypes,
  supportTickets
} from "../js/support-game-data.mjs";
import {
  buildSupportSlotId,
  countMissingSupportSlots,
  createSupportState,
  evaluateSupportPlacements,
  locateSupportCard,
  moveSupportCard,
  returnSupportCardToTray,
  shuffleSupportCardIds,
  shuffleValues
} from "../js/support-game-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("dataset possui três chamados, nove respostas únicas e três distratores", async () => {
  assert.equal(supportTickets.length, 3);
  assert.equal(supportSlotTypes.length, 3);
  assert.equal(supportCards.length, 12);
  assert.equal(new Set(supportCards.map((card) => card.id)).size, 12);
  assert.equal(supportCards.filter((card) => card.type === "distrator").length, 3);

  const expectedSlots = new Set();
  for (const card of supportCards.filter((item) => item.type !== "distrator")) {
    assert.ok(supportTickets.some((ticket) => ticket.id === card.ticketId));
    assert.ok(supportSlotTypes.some((type) => type.id === card.type));
    expectedSlots.add(buildSupportSlotId(card.ticketId, card.type));
    await access(resolve(projectRoot, `assets/side-game/icons/${card.icon}.svg`));
  }
  assert.equal(expectedSlots.size, 9);

  for (const ticket of supportTickets) {
    await access(resolve(projectRoot, `assets/side-game/icons/${ticket.icon}.svg`));
  }
});

test("embaralhamento preserva todos os cartões e altera a ordem", () => {
  const ids = supportCards.map((card) => card.id);
  const shuffled = shuffleValues(ids, () => 0);
  assert.deepEqual(new Set(shuffled), new Set(ids));
  assert.notDeepEqual(shuffled, ids);

  const state = createSupportState(ids, () => 0.4);
  assert.equal(state.trayOrder.length, 12);
  assert.equal(state.placements.size, 0);
  assert.equal(state.lockedSlots.size, 0);
  assert.equal(state.attempts, 0);
});

test("embaralhamento pedagógico evita cartões do mesmo chamado lado a lado", () => {
  const shuffled = shuffleSupportCardIds(
    supportCards.map((card) => card.id),
    supportCards,
    () => 0.37
  );
  const cardById = new Map(supportCards.map((card) => [card.id, card]));
  const groups = shuffled.map((cardId) => cardById.get(cardId).ticketId || "distrator");

  assert.equal(shuffled.length, 12);
  assert.deepEqual(new Set(shuffled), new Set(supportCards.map((card) => card.id)));
  for (let index = 1; index < groups.length; index += 1) {
    assert.notEqual(groups[index], groups[index - 1]);
  }
});

test("cartões podem ser colocados, trocados e devolvidos à bandeja", () => {
  let state = createSupportState(supportCards.map((card) => card.id), () => 0.5);
  const firstSlot = buildSupportSlotId("wifi", "verificar");
  const secondSlot = buildSupportSlotId("lento", "causa");

  state = moveSupportCard(state, "wifi-verificar", firstSlot).state;
  state = moveSupportCard(state, "lento-causa", secondSlot).state;
  assert.equal(locateSupportCard(state.placements, "wifi-verificar"), firstSlot);
  assert.equal(state.trayOrder.includes("wifi-verificar"), false);

  state = moveSupportCard(state, "wifi-verificar", secondSlot).state;
  assert.equal(state.placements.get(secondSlot), "wifi-verificar");
  assert.equal(state.placements.get(firstSlot), "lento-causa");

  state = returnSupportCardToTray(state, "wifi-verificar").state;
  assert.equal(locateSupportCard(state.placements, "wifi-verificar"), "tray");
  assert.equal(state.trayOrder[0], "wifi-verificar");
});

test("acertos bloqueados não podem ser movidos nem substituídos", () => {
  const slot = buildSupportSlotId("wifi", "verificar");
  let state = createSupportState(supportCards.map((card) => card.id), () => 0.5);
  state = moveSupportCard(state, "wifi-verificar", slot).state;
  state.lockedSlots.add(slot);

  const moveLocked = moveSupportCard(state, "wifi-verificar", buildSupportSlotId("audio", "causa"));
  const replaceLocked = moveSupportCard(state, "audio-causa", slot);
  const returnLocked = returnSupportCardToTray(state, "wifi-verificar");

  assert.equal(moveLocked.changed, false);
  assert.equal(moveLocked.reason, "card-locked");
  assert.equal(replaceLocked.changed, false);
  assert.equal(replaceLocked.reason, "target-locked");
  assert.equal(returnLocked.changed, false);
  assert.equal(returnLocked.reason, "card-locked");
});

test("avaliação reconhece somente a posição única de cada resposta", () => {
  const placements = new Map();
  for (const card of supportCards.filter((item) => item.type !== "distrator")) {
    placements.set(buildSupportSlotId(card.ticketId, card.type), card.id);
  }

  const perfect = evaluateSupportPlacements(placements, supportCards);
  assert.equal(perfect.score, 9);
  assert.equal(perfect.correctSlots.size, 9);
  assert.equal(perfect.incorrectSlots.size, 0);
  assert.equal(countMissingSupportSlots(placements), 0);

  placements.set(buildSupportSlotId("wifi", "verificar"), "distrator-formatar");
  placements.set(buildSupportSlotId("audio", "solucao"), "wifi-verificar");
  const mixed = evaluateSupportPlacements(placements, supportCards);
  assert.equal(mixed.score, 7);
  assert.equal(mixed.incorrectSlots.size, 2);
});

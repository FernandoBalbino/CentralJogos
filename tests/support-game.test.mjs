import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  supportCards,
  supportLevels,
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

test("dataset possui dois níveis com três chamados em cada um", async () => {
  assert.equal(supportLevels.length, 2);
  assert.equal(supportTickets.length, 6);
  assert.equal(supportSlotTypes.length, 3);
  assert.equal(supportCards.length, 24);
  assert.equal(new Set(supportCards.map((card) => card.id)).size, 24);

  for (const level of supportLevels) {
    assert.equal(level.tickets.length, 3);
    assert.equal(level.cards.length, 12);
    assert.equal(level.cards.filter((card) => card.type === "distrator").length, 3);

    const expectedSlots = new Set();
    for (const card of level.cards.filter((item) => item.type !== "distrator")) {
      assert.ok(level.tickets.some((ticket) => ticket.id === card.ticketId));
      assert.ok(supportSlotTypes.some((type) => type.id === card.type));
      expectedSlots.add(buildSupportSlotId(card.ticketId, card.type));
      await access(resolve(projectRoot, `assets/side-game/icons/${card.icon}.svg`));
    }
    assert.equal(expectedSlots.size, 9);
  }

  for (const ticket of supportTickets) {
    await access(resolve(projectRoot, `assets/side-game/icons/${ticket.icon}.svg`));
  }
});

test("segundo nível apresenta mouse, teclado e impressora", () => {
  assert.deepEqual(
    supportLevels[1].tickets.map((ticket) => ticket.title),
    ["Mouse não funciona", "Teclado não funciona", "Impressora não imprime"]
  );
});

test("embaralhamento preserva os doze cartões de cada nível e altera a ordem", () => {
  for (const level of supportLevels) {
    const ids = level.cards.map((card) => card.id);
    const shuffled = shuffleValues(ids, () => 0);
    assert.deepEqual(new Set(shuffled), new Set(ids));
    assert.notDeepEqual(shuffled, ids);

    const state = createSupportState(ids, () => 0.4);
    assert.equal(state.trayOrder.length, 12);
    assert.equal(state.placements.size, 0);
    assert.equal(state.lockedSlots.size, 0);
    assert.equal(state.attempts, 0);
  }
});

test("embaralhamento pedagógico evita cartões do mesmo chamado lado a lado", () => {
  for (const level of supportLevels) {
    const shuffled = shuffleSupportCardIds(
      level.cards.map((card) => card.id),
      level.cards,
      () => 0.37
    );
    const cardById = new Map(level.cards.map((card) => [card.id, card]));
    const groups = shuffled.map((cardId) => cardById.get(cardId).ticketId || "distrator");

    assert.equal(shuffled.length, 12);
    assert.deepEqual(new Set(shuffled), new Set(level.cards.map((card) => card.id)));
    for (let index = 1; index < groups.length; index += 1) {
      assert.notEqual(groups[index], groups[index - 1]);
    }
  }
});

test("cartões podem ser colocados, trocados e devolvidos à bandeja", () => {
  const cards = supportLevels[0].cards;
  let state = createSupportState(cards.map((card) => card.id), () => 0.5);
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
  const cards = supportLevels[0].cards;
  const slot = buildSupportSlotId("wifi", "verificar");
  let state = createSupportState(cards.map((card) => card.id), () => 0.5);
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

test("avaliação reconhece somente a posição única de cada resposta no primeiro nível", () => {
  const cards = supportLevels[0].cards;
  const placements = new Map();
  for (const card of cards.filter((item) => item.type !== "distrator")) {
    placements.set(buildSupportSlotId(card.ticketId, card.type), card.id);
  }

  const perfect = evaluateSupportPlacements(placements, cards);
  assert.equal(perfect.score, 9);
  assert.equal(perfect.correctSlots.size, 9);
  assert.equal(perfect.incorrectSlots.size, 0);
  assert.equal(countMissingSupportSlots(placements), 0);

  placements.set(buildSupportSlotId("wifi", "verificar"), "distrator-formatar");
  placements.set(buildSupportSlotId("audio", "solucao"), "wifi-verificar");
  const mixed = evaluateSupportPlacements(placements, cards);
  assert.equal(mixed.score, 7);
  assert.equal(mixed.incorrectSlots.size, 2);
});

test("avaliação perfeita do segundo nível completa nove etapas", () => {
  const cards = supportLevels[1].cards;
  const placements = new Map(
    cards
      .filter((card) => card.type !== "distrator")
      .map((card) => [buildSupportSlotId(card.ticketId, card.type), card.id])
  );

  const result = evaluateSupportPlacements(placements, cards);
  assert.equal(result.score, 9);
  assert.equal(result.correctSlots.size, 9);
  assert.equal(result.incorrectSlots.size, 0);
});

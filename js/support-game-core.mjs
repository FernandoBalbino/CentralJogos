import { SUPPORT_GAME_DATA_VERSION } from "./support-game-data.mjs";

export const SUPPORT_GAME_STATE_VERSION = SUPPORT_GAME_DATA_VERSION;

export const buildSupportSlotId = (ticketId, type) => `${ticketId}:${type}`;

export const shuffleValues = (values, random = Math.random) => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

export const shuffleSupportCardIds = (cardIds, cards, random = Math.random) => {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const pool = shuffleValues(cardIds, random);
  const result = [];
  let previousGroup = null;

  while (pool.length > 0) {
    const groups = new Map();
    pool.forEach((cardId, index) => {
      const group = cardById.get(cardId)?.ticketId || "distrator";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(index);
    });
    const eligibleGroups = [...groups.entries()].filter(([group]) => group !== previousGroup);
    const candidates = eligibleGroups.length > 0 ? eligibleGroups : [...groups.entries()];
    const largestGroupSize = Math.max(...candidates.map(([, indexes]) => indexes.length));
    const balancedCandidates = candidates.filter(([, indexes]) => indexes.length === largestGroupSize);
    const [selectedGroup, selectedIndexes] = balancedCandidates[
      Math.floor(random() * balancedCandidates.length)
    ];
    const selectedIndex = selectedIndexes[Math.floor(random() * selectedIndexes.length)];
    const [cardId] = pool.splice(selectedIndex, 1);
    result.push(cardId);
    previousGroup = selectedGroup;
  }

  return result;
};

export const createSupportState = (cardIds, random = Math.random) => ({
  trayOrder: shuffleValues(cardIds, random),
  placements: new Map(),
  lockedSlots: new Set(),
  feedback: new Map(),
  selectedCard: null,
  phase: "playing",
  attempts: 0
});

export const locateSupportCard = (placements, cardId) => {
  for (const [slotId, placedCardId] of placements.entries()) {
    if (placedCardId === cardId) return slotId;
  }
  return "tray";
};

export const moveSupportCard = (state, cardId, targetSlot) => {
  const currentLocation = locateSupportCard(state.placements, cardId);
  if (state.lockedSlots.has(targetSlot)) {
    return { changed: false, reason: "target-locked", state };
  }
  if (currentLocation !== "tray" && state.lockedSlots.has(currentLocation)) {
    return { changed: false, reason: "card-locked", state };
  }
  if (currentLocation === targetSlot) {
    return { changed: false, reason: "same-slot", state };
  }

  const placements = new Map(state.placements);
  const trayOrder = state.trayOrder.filter((id) => id !== cardId);
  const targetCard = placements.get(targetSlot);

  if (currentLocation !== "tray") placements.delete(currentLocation);

  if (targetCard && targetCard !== cardId) {
    if (currentLocation === "tray") {
      if (!trayOrder.includes(targetCard)) trayOrder.unshift(targetCard);
    } else {
      placements.set(currentLocation, targetCard);
    }
  }

  placements.set(targetSlot, cardId);
  return {
    changed: true,
    reason: "moved",
    state: { ...state, placements, trayOrder, selectedCard: null }
  };
};

export const returnSupportCardToTray = (state, cardId) => {
  const currentLocation = locateSupportCard(state.placements, cardId);
  if (currentLocation === "tray") {
    return { changed: false, reason: "already-in-tray", state };
  }
  if (state.lockedSlots.has(currentLocation)) {
    return { changed: false, reason: "card-locked", state };
  }

  const placements = new Map(state.placements);
  placements.delete(currentLocation);
  const trayOrder = state.trayOrder.filter((id) => id !== cardId);
  trayOrder.unshift(cardId);
  return {
    changed: true,
    reason: "returned",
    state: { ...state, placements, trayOrder, selectedCard: null }
  };
};

export const evaluateSupportPlacements = (placements, cards) => {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const correctSlots = new Set();
  const incorrectSlots = new Set();

  for (const [slotId, cardId] of placements.entries()) {
    const card = cardById.get(cardId);
    const correct = Boolean(
      card
      && card.ticketId
      && card.type !== "distrator"
      && buildSupportSlotId(card.ticketId, card.type) === slotId
    );
    (correct ? correctSlots : incorrectSlots).add(slotId);
  }

  return {
    correctSlots,
    incorrectSlots,
    score: correctSlots.size
  };
};

export const countMissingSupportSlots = (placements, totalSlots = 9) => (
  Math.max(0, totalSlots - placements.size)
);

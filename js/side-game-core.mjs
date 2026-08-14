import { SIDE_GAME_DATA_VERSION } from "./side-game-data.mjs";

export const SIDE_GAME_STORAGE_KEY = "centraljogos.choose-side.session.v1";
export const SESSION_VERSION = 1;

export const DEFAULT_SETTINGS = Object.freeze({
  durationSeconds: 60,
  soundEnabled: true,
  explanationsEnabled: true
});

export const VALID_PHASES = Object.freeze([
  "intro", "wheel", "spinning", "reveal", "choosing", "result"
]);

export const shuffle = (values, random = Math.random) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

export const createDeck = (ids, random = Math.random, lastId = null) => {
  const unique = [...new Set(ids)];
  const deck = shuffle(unique, random);
  if (deck.length > 1 && lastId && deck[0] === lastId) {
    const swapIndex = deck.findIndex((id) => id !== lastId);
    [deck[0], deck[swapIndex]] = [deck[swapIndex], deck[0]];
  }
  return deck;
};

export const buildWheelCandidates = (allIds, targetId, count = 12, random = Math.random) => {
  const alternatives = shuffle(allIds.filter((id) => id !== targetId), random)
    .slice(0, Math.max(0, count - 1));
  const candidates = [targetId, ...alternatives];
  while (candidates.length < count && allIds.length) {
    const fallback = allIds[candidates.length % allIds.length];
    if (!candidates.includes(fallback)) candidates.push(fallback);
    else break;
  }
  const shuffled = shuffle(candidates, random);
  return {
    ids: shuffled,
    targetIndex: shuffled.indexOf(targetId)
  };
};

export const normalizeAngle = (angle) => ((angle % 360) + 360) % 360;

export const calculateStopAngle = ({ startAngle, targetIndex, segmentCount, turns }) => {
  if (!Number.isInteger(segmentCount) || segmentCount < 1) throw new Error("segmentCount inválido");
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= segmentCount) {
    throw new Error("targetIndex inválido");
  }
  const segmentAngle = 360 / segmentCount;
  const targetCenter = (targetIndex * segmentAngle) + (segmentAngle / 2);
  const desiredRotation = normalizeAngle(-targetCenter);
  const delta = normalizeAngle(desiredRotation - normalizeAngle(startAngle));
  return startAngle + (Math.max(1, turns) * 360) + delta;
};

export const smoothSpinEasing = (progress) => {
  const value = Math.min(1, Math.max(0, progress));
  return value * value * (3 - (2 * value));
};

export const formatTimer = (seconds) => {
  const safe = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

export const createCountdown = (durationSeconds, nowMs = 0) => {
  const remainingMs = Math.max(0, Number(durationSeconds) || 0) * 1000;
  return { deadlineMs: nowMs + remainingMs, remainingMs, paused: false };
};

export const readCountdown = (countdown, nowMs) => countdown.paused
  ? countdown.remainingMs
  : Math.max(0, countdown.deadlineMs - nowMs);

export const pauseCountdown = (countdown, nowMs) => ({
  deadlineMs: countdown.deadlineMs,
  remainingMs: readCountdown(countdown, nowMs),
  paused: true
});

export const resumeCountdown = (countdown, nowMs) => ({
  deadlineMs: nowMs + countdown.remainingMs,
  remainingMs: countdown.remainingMs,
  paused: false
});

export const createSession = (items, random = Math.random, settings = {}) => ({
  version: SESSION_VERSION,
  dataVersion: SIDE_GAME_DATA_VERSION,
  cycle: 1,
  remainingIds: createDeck(items.map((item) => item.id), random),
  usedIds: [],
  history: [],
  reservedItemId: null,
  currentItemId: null,
  currentPhase: "intro",
  remainingSeconds: null,
  cycleComplete: false,
  settings: {
    ...DEFAULT_SETTINGS,
    ...settings
  }
});

const validDuration = (value) => [15, 30, 45, 60].includes(Number(value))
  ? Number(value)
  : DEFAULT_SETTINGS.durationSeconds;

export const reconcileSession = (rawSession, items, random = Math.random) => {
  if (!rawSession || typeof rawSession !== "object" || rawSession.version !== SESSION_VERSION) {
    return createSession(items, random);
  }

  const validIds = new Set(items.map((item) => item.id));
  const uniqueValid = (values) => [...new Set(Array.isArray(values) ? values : [])]
    .filter((id) => validIds.has(id));

  const usedIds = uniqueValid(rawSession.usedIds);
  const reservedItemId = validIds.has(rawSession.reservedItemId) ? rawSession.reservedItemId : null;
  const occupied = new Set([...usedIds, reservedItemId].filter(Boolean));
  const remainingIds = uniqueValid(rawSession.remainingIds).filter((id) => !occupied.has(id));
  const missingIds = [...validIds].filter((id) => !occupied.has(id) && !remainingIds.includes(id));

  const history = Array.isArray(rawSession.history)
    ? rawSession.history
      .filter((entry) => entry && validIds.has(entry.itemId))
      .slice(-items.length * 3)
      .map((entry) => ({
        itemId: entry.itemId,
        cycle: Math.max(1, Number(entry.cycle) || 1),
        shownAt: typeof entry.shownAt === "string" ? entry.shownAt : new Date().toISOString()
      }))
    : [];

  const currentItemId = validIds.has(rawSession.currentItemId)
    ? rawSession.currentItemId
    : reservedItemId;
  const currentPhase = VALID_PHASES.includes(rawSession.currentPhase)
    ? rawSession.currentPhase
    : "intro";

  return {
    version: SESSION_VERSION,
    dataVersion: SIDE_GAME_DATA_VERSION,
    cycle: Math.max(1, Number(rawSession.cycle) || 1),
    remainingIds: [...remainingIds, ...createDeck(missingIds, random)],
    usedIds,
    history,
    reservedItemId,
    currentItemId,
    currentPhase: currentPhase === "spinning" ? "reveal" : currentPhase,
    remainingSeconds: Number.isFinite(rawSession.remainingSeconds)
      ? Math.max(0, Number(rawSession.remainingSeconds))
      : null,
    cycleComplete: Boolean(rawSession.cycleComplete),
    settings: {
      durationSeconds: validDuration(rawSession.settings?.durationSeconds),
      soundEnabled: rawSession.settings?.soundEnabled !== false,
      explanationsEnabled: rawSession.settings?.explanationsEnabled !== false
    }
  };
};

export const reserveNextItem = (session, items, random = Math.random) => {
  if (session.reservedItemId) return session.reservedItemId;
  if (session.remainingIds.length === 0) {
    const lastId = session.usedIds.at(-1) || null;
    session.cycle += 1;
    session.remainingIds = createDeck(items.map((item) => item.id), random, lastId);
    session.usedIds = [];
    session.cycleComplete = false;
  }
  session.reservedItemId = session.remainingIds.shift() || null;
  session.currentItemId = session.reservedItemId;
  return session.reservedItemId;
};

export const markItemPresented = (session, itemId, shownAt = new Date().toISOString()) => {
  if (!itemId || session.usedIds.includes(itemId)) return false;
  session.usedIds.push(itemId);
  session.history.push({ itemId, cycle: session.cycle, shownAt });
  session.cycleComplete = session.remainingIds.length === 0;
  return true;
};

export const finishRound = (session) => {
  session.reservedItemId = null;
  session.currentItemId = null;
  session.currentPhase = "wheel";
  session.remainingSeconds = null;
};

export const isActionAllowed = (phase, action) => {
  const actions = {
    intro: ["start", "fullscreen", "sound", "settings", "history"],
    wheel: ["spin", "fullscreen", "sound", "settings", "history"],
    spinning: ["fullscreen", "sound"],
    reveal: ["advance", "restart", "fullscreen", "sound"],
    choosing: ["reveal", "pause", "restart", "fullscreen", "sound", "settings", "history"],
    result: ["next", "restart", "fullscreen", "sound", "settings", "history"]
  };
  return actions[phase]?.includes(action) || false;
};

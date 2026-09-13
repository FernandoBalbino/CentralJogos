import {
  CATEGORIES,
  CONNECTION_FILES,
  DESKTOP_LEVEL_WITH_EXTENSIONS,
  DESKTOP_LEVEL_WITHOUT_EXTENSIONS,
  FILE_TYPES,
  GUIDED_CHALLENGES,
  WINDOWS_FILE_ORGANIZER_DATA_VERSION
} from "./windows-file-organizer-data.mjs";

export const WINDOWS_FILE_ORGANIZER_STATE_VERSION = WINDOWS_FILE_ORGANIZER_DATA_VERSION;

export const PHASES = [
  "start",
  "intro",
  "connections",
  "drag-demo",
  "guided",
  "desktop-visible-intro",
  "desktop-visible",
  "hidden-intro",
  "properties-demo",
  "desktop-hidden",
  "final"
];

const categoryIds = new Set(CATEGORIES.map((category) => category.id));
const fileIds = (files) => new Set(files.map((file) => file.id));

const sanitizePlacements = (rawPlacements, files) => {
  const validFiles = fileIds(files);
  return Object.fromEntries(Object.entries(rawPlacements || {}).filter(([fileId, destination]) => (
    validFiles.has(fileId) && (destination === "desktop" || categoryIds.has(destination))
  )));
};

export const createInitialOrganizerState = (seed = Date.now()) => ({
  version: WINDOWS_FILE_ORGANIZER_STATE_VERSION,
  phase: "start",
  introIndex: 0,
  connections: {},
  guidedIndex: 0,
  guidedPlacement: null,
  visiblePlacements: {},
  hiddenPlacements: {},
  contextHintSeen: false,
  runSeed: Math.abs(Math.floor(Number(seed) || 0)) % 1000000
});

export const sanitizeOrganizerState = (rawState) => {
  const fallback = createInitialOrganizerState();
  if (!rawState || rawState.version !== WINDOWS_FILE_ORGANIZER_STATE_VERSION) return fallback;
  const validConnectionFiles = fileIds(CONNECTION_FILES);
  const connections = Object.fromEntries(Object.entries(rawState.connections || {}).filter(([fileId, categoryId]) => (
    validConnectionFiles.has(fileId) && categoryIds.has(categoryId)
  )));
  const guidedIndex = Number.isInteger(rawState.guidedIndex)
    ? Math.min(Math.max(rawState.guidedIndex, 0), GUIDED_CHALLENGES.length - 1)
    : 0;
  const introIndex = Number.isInteger(rawState.introIndex)
    ? Math.min(Math.max(rawState.introIndex, 0), FILE_TYPES.length - 1)
    : 0;
  return {
    version: WINDOWS_FILE_ORGANIZER_STATE_VERSION,
    phase: PHASES.includes(rawState.phase) ? rawState.phase : "start",
    introIndex,
    connections,
    guidedIndex,
    guidedPlacement: categoryIds.has(rawState.guidedPlacement) ? rawState.guidedPlacement : null,
    visiblePlacements: sanitizePlacements(rawState.visiblePlacements, DESKTOP_LEVEL_WITH_EXTENSIONS),
    hiddenPlacements: sanitizePlacements(rawState.hiddenPlacements, DESKTOP_LEVEL_WITHOUT_EXTENSIONS),
    contextHintSeen: rawState.contextHintSeen === true,
    runSeed: Number.isInteger(rawState.runSeed) ? Math.abs(rawState.runSeed) % 1000000 : fallback.runSeed
  };
};

export const connectFileToCategory = (connections, fileId, categoryId) => {
  if (!fileIds(CONNECTION_FILES).has(fileId) || !categoryIds.has(categoryId)) return { ...(connections || {}) };
  return { ...(connections || {}), [fileId]: categoryId };
};

export const removeConnection = (connections, fileId) => {
  const next = { ...(connections || {}) };
  delete next[fileId];
  return next;
};

export const evaluateConnections = (connections) => {
  const results = Object.fromEntries(CONNECTION_FILES.map((file) => [file.id, connections?.[file.id] === file.category]));
  const correctCount = Object.values(results).filter(Boolean).length;
  return { results, correctCount, total: CONNECTION_FILES.length, passed: correctCount === CONNECTION_FILES.length };
};

export const keepCorrectConnections = (connections) => Object.fromEntries(
  CONNECTION_FILES.filter((file) => connections?.[file.id] === file.category).map((file) => [file.id, file.category])
);

export const getGuidedFolderOrder = (challengeIndex, runSeed, folderIds) => {
  const order = Array.isArray(folderIds) ? [...folderIds] : [];
  return (Math.abs(Number(runSeed) || 0) + challengeIndex) % 2 === 0 ? order : order.reverse();
};

export const moveOrganizerFile = (placements, files, fileId, destination) => {
  if (!fileIds(files).has(fileId) || (destination !== "desktop" && !categoryIds.has(destination))) {
    return { ...(placements || {}) };
  }
  const next = { ...(placements || {}) };
  if (destination === "desktop") delete next[fileId];
  else next[fileId] = destination;
  return next;
};

export const evaluateDesktop = (files, placements) => {
  const correctIds = [];
  const incorrectIds = [];
  for (const file of files) {
    if (placements?.[file.id] === file.category) correctIds.push(file.id);
    else incorrectIds.push(file.id);
  }
  const folderCompletion = Object.fromEntries(CATEGORIES.map((category) => {
    const expectedIds = files.filter((file) => file.category === category.id).map((file) => file.id);
    const actualIds = files.filter((file) => placements?.[file.id] === category.id).map((file) => file.id);
    return [category.id, expectedIds.length > 0 && expectedIds.length === actualIds.length && expectedIds.every((id) => actualIds.includes(id))];
  }));
  return {
    correctIds,
    incorrectIds,
    correctCount: correctIds.length,
    total: files.length,
    passed: correctIds.length === files.length,
    folderCompletion
  };
};

export const removeIncorrectPlacements = (files, placements) => {
  const evaluation = evaluateDesktop(files, placements);
  return Object.fromEntries(evaluation.correctIds.map((fileId) => [fileId, placements[fileId]]));
};

export const getFolderCounts = (files, placements) => Object.fromEntries(
  CATEGORIES.map((category) => [category.id, files.filter((file) => placements?.[file.id] === category.id).length])
);

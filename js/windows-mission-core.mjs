import { WINDOWS_MISSION_DATA_VERSION } from "./windows-mission-data.mjs";

export const WINDOWS_MISSION_STATE_VERSION = WINDOWS_MISSION_DATA_VERSION;

export const sanitizeCompletedMissionIds = (completedIds, missions) => {
  const requested = new Set(Array.isArray(completedIds) ? completedIds : []);
  const contiguous = [];
  for (const mission of missions) {
    if (!requested.has(mission.id)) break;
    contiguous.push(mission.id);
  }
  return contiguous;
};

export const getFirstIncompleteMissionIndex = (completedIds, missions) => (
  Math.min(sanitizeCompletedMissionIds(completedIds, missions).length, Math.max(0, missions.length - 1))
);

export const isMissionUnlocked = (missionIndex, completedIds, missions) => {
  if (!Number.isInteger(missionIndex) || missionIndex < 0 || missionIndex >= missions.length) return false;
  const completed = sanitizeCompletedMissionIds(completedIds, missions);
  return missionIndex <= completed.length;
};

export const createMissionOrder = (mission) => [...mission.startOrder];

export const moveMissionAction = (order, fromIndex, toIndex) => {
  if (!Array.isArray(order)) return [];
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return [...order];
  if (fromIndex < 0 || fromIndex >= order.length || toIndex < 0 || toIndex >= order.length) return [...order];
  if (fromIndex === toIndex) return [...order];
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const evaluateMissionOrder = (mission, order) => {
  const correctPositions = new Set();
  mission.solution.forEach((actionId, index) => {
    if (order[index] === actionId) correctPositions.add(index);
  });
  return {
    correctPositions,
    correctCount: correctPositions.size,
    total: mission.solution.length,
    passed: correctPositions.size === mission.solution.length
  };
};

export const completeMission = (completedIds, missionId, missions) => {
  const contiguous = sanitizeCompletedMissionIds(completedIds, missions);
  const expected = missions[contiguous.length];
  if (!expected || expected.id !== missionId) return contiguous;
  return [...contiguous, missionId];
};

export const sanitizeSavedMissionState = (rawState, missions) => {
  const completedIds = sanitizeCompletedMissionIds(rawState?.completedIds, missions);
  const fallbackIndex = getFirstIncompleteMissionIndex(completedIds, missions);
  const requestedIndex = Number.isInteger(rawState?.missionIndex) ? rawState.missionIndex : fallbackIndex;
  const missionIndex = isMissionUnlocked(requestedIndex, completedIds, missions) ? requestedIndex : fallbackIndex;
  const attempts = Number.isFinite(rawState?.attempts) && rawState.attempts >= 0 ? Math.floor(rawState.attempts) : 0;
  return { version: WINDOWS_MISSION_STATE_VERSION, completedIds, missionIndex, attempts };
};

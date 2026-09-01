import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { windowsMissions } from "../js/windows-mission-data.mjs";
import {
  completeMission,
  createMissionOrder,
  evaluateMissionOrder,
  getFirstIncompleteMissionIndex,
  isMissionUnlocked,
  moveMissionAction,
  sanitizeCompletedMissionIds,
  sanitizeSavedMissionState
} from "../js/windows-mission-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("catálogo possui seis missões básicas e ações válidas", async () => {
  assert.equal(windowsMissions.length, 6);
  assert.equal(new Set(windowsMissions.map((mission) => mission.id)).size, 6);
  for (const mission of windowsMissions) {
    assert.equal(mission.actions.length, 4);
    assert.equal(mission.solution.length, 4);
    assert.equal(mission.startOrder.length, 4);
    assert.deepEqual(new Set(mission.startOrder), new Set(mission.solution));
    assert.notDeepEqual(mission.startOrder, mission.solution);
    for (const action of mission.actions) {
      await access(resolve(projectRoot, `assets/side-game/icons/${action.icon}.svg`));
    }
  }
});

test("somente a primeira missão começa desbloqueada", () => {
  assert.equal(isMissionUnlocked(0, [], windowsMissions), true);
  assert.equal(isMissionUnlocked(1, [], windowsMissions), false);
  assert.equal(getFirstIncompleteMissionIndex([], windowsMissions), 0);
});

test("conclusões fora de ordem não burlam pré-requisitos", () => {
  const staleIds = [windowsMissions[0].id, windowsMissions[2].id, windowsMissions[4].id];
  assert.deepEqual(sanitizeCompletedMissionIds(staleIds, windowsMissions), [windowsMissions[0].id]);
  assert.equal(isMissionUnlocked(1, staleIds, windowsMissions), true);
  assert.equal(isMissionUnlocked(2, staleIds, windowsMissions), false);
});

test("completeMission aceita apenas a próxima missão obrigatória", () => {
  const first = completeMission([], windowsMissions[0].id, windowsMissions);
  assert.deepEqual(first, [windowsMissions[0].id]);
  const skipped = completeMission(first, windowsMissions[2].id, windowsMissions);
  assert.deepEqual(skipped, first);
  const second = completeMission(first, windowsMissions[1].id, windowsMissions);
  assert.deepEqual(second, [windowsMissions[0].id, windowsMissions[1].id]);
});

test("avaliação reconhece ordem correta e posições parciais", () => {
  const mission = windowsMissions[1];
  const initial = createMissionOrder(mission);
  const wrong = evaluateMissionOrder(mission, initial);
  assert.equal(wrong.passed, false);
  assert.ok(wrong.correctCount < wrong.total);

  const perfect = evaluateMissionOrder(mission, mission.solution);
  assert.equal(perfect.passed, true);
  assert.equal(perfect.correctCount, mission.solution.length);
});

test("ações podem ser reposicionadas sem alterar o array original", () => {
  const order = ["a", "b", "c", "d"];
  const moved = moveMissionAction(order, 3, 1);
  assert.deepEqual(moved, ["a", "d", "b", "c"]);
  assert.deepEqual(order, ["a", "b", "c", "d"]);
});

test("estado persistido inválido volta à primeira missão incompleta", () => {
  const completedIds = [windowsMissions[0].id, windowsMissions[1].id];
  const state = sanitizeSavedMissionState({ completedIds, missionIndex: 5, attempts: -4 }, windowsMissions);
  assert.equal(state.missionIndex, 2);
  assert.equal(state.attempts, 0);
  assert.deepEqual(state.completedIds, completedIds);
});

test("arquivos essenciais do modo 3D e offline existem", async () => {
  await access(resolve(projectRoot, "vendor/three/three.module.min.js"));
  await access(resolve(projectRoot, "vendor/three/three.core.min.js"));
  await access(resolve(projectRoot, "assets/windows-mission/tecnico-em-acao-card.png"));
  await access(resolve(projectRoot, "windows-mission-game.css"));
  await access(resolve(projectRoot, "service-worker.js"));
  const serviceWorker = await readFile(resolve(projectRoot, "service-worker.js"), "utf8");
  assert.match(serviceWorker, /PREPARE_OFFLINE/);
  assert.match(serviceWorker, /windows-mission-game\.mjs/);
  assert.match(serviceWorker, /three\.module\.min\.js/);
  assert.match(serviceWorker, /three\.core\.min\.js/);
});

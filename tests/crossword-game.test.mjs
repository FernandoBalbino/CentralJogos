import test from "node:test";
import assert from "node:assert/strict";

import { memoryGamePairs } from "../js/memory-game-data.mjs";
import {
  CROSSWORD_BLOCKED_IDS,
  evaluateEntry,
  generateCrossword,
  isCrosswordConnected,
  normalizeCrosswordAnswer,
  revealHint
} from "../js/crossword-core.mjs";

const seededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = ((state * 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const validatePuzzle = (puzzle) => {
  assert.equal(puzzle.entries.length, 10);
  assert.equal(new Set(puzzle.entries.map((entry) => entry.id)).size, 10);
  assert.equal(isCrosswordConnected(puzzle), true);
  assert.ok(puzzle.rows > 0 && puzzle.columns > 0);
  assert.ok(puzzle.cells.every((cell) => cell.row >= 0 && cell.column >= 0));

  const occupied = new Map(puzzle.cells.map((cell) => [cell.key, cell]));
  for (const entry of puzzle.entries) {
    assert.equal(entry.cells.length, entry.answer.length);
    assert.ok(entry.number >= 1);
    assert.ok(["across", "down"].includes(entry.direction));
    const rowStep = entry.direction === "down" ? 1 : 0;
    const columnStep = entry.direction === "across" ? 1 : 0;
    assert.equal(occupied.has(`${entry.row - rowStep}:${entry.column - columnStep}`), false);
    assert.equal(occupied.has(`${entry.row + (rowStep * entry.answer.length)}:${entry.column + (columnStep * entry.answer.length)}`), false);
    for (const cell of entry.cells) {
      const boardCell = occupied.get(cell.key);
      assert.equal(boardCell?.solution, cell.solution);
      assert.ok(boardCell?.entryIds.includes(entry.id));
      if (boardCell.entryIds.length === 1) {
        const sideKeys = entry.direction === "across"
          ? [`${cell.row - 1}:${cell.column}`, `${cell.row + 1}:${cell.column}`]
          : [`${cell.row}:${cell.column - 1}`, `${cell.row}:${cell.column + 1}`];
        assert.equal(sideKeys.some((key) => occupied.has(key)), false);
      }
    }
  }

  for (const cell of puzzle.cells) {
    assert.ok(cell.entryIds.length >= 1 && cell.entryIds.length <= 2);
    assert.equal(new Set(cell.directions).size, cell.directions.length);
  }

  const numberedStarts = [...new Map(puzzle.entries.map((entry) => [`${entry.row}:${entry.column}`, entry])).values()]
    .sort((left, right) => left.row - right.row || left.column - right.column);
  numberedStarts.forEach((entry, index) => assert.equal(entry.number, index + 1));
};

test("normalização remove separadores e acentos, mas preserva números", () => {
  assert.equal(normalizeCrosswordAnswer("Memória RAM"), "MEMORIARAM");
  assert.equal(normalizeCrosswordAnswer("Wi-Fi"), "WIFI");
  assert.equal(normalizeCrosswordAnswer("Processador / CPU"), "PROCESSADORCPU");
  assert.equal(normalizeCrosswordAnswer("IPv4"), "IPV4");
});

test("gerador cria dez palavras conectadas e válidas em centenas de sementes", () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    validatePuzzle(generateCrossword({ items: memoryGamePairs, random: seededRandom(seed) }));
  }
});

test("cada nova assinatura pode rejeitar a grade anterior", () => {
  const random = seededRandom(42);
  const first = generateCrossword({ items: memoryGamePairs, random });
  const second = generateCrossword({ items: memoryGamePairs, random, previousSignature: first.signature });
  assert.notEqual(second.signature, first.signature);
});

test("banco elegível nunca inclui conceitos bloqueados", () => {
  assert.ok(CROSSWORD_BLOCKED_IDS.every((id) => !memoryGamePairs.some((pair) => pair.id === id)));
  const puzzle = generateCrossword({ items: memoryGamePairs, random: seededRandom(8) });
  assert.ok(puzzle.entries.every((entry) => !CROSSWORD_BLOCKED_IDS.includes(entry.id)));
});

test("palavra só é aceita quando todas as letras correspondem", () => {
  const puzzle = generateCrossword({ items: memoryGamePairs, random: seededRandom(12) });
  const entry = puzzle.entries[0];
  const values = Object.fromEntries(entry.cells.map((cell) => [cell.key, cell.solution]));
  assert.equal(evaluateEntry(entry, values), true);
  values[entry.cells.at(-1).key] = values[entry.cells.at(-1).key] === "A" ? "B" : "A";
  assert.equal(evaluateEntry(entry, values), false);
});

test("dica corrige uma célula errada e respeita células bloqueadas", () => {
  const puzzle = generateCrossword({ items: memoryGamePairs, random: seededRandom(21) });
  const entry = puzzle.entries.find((candidate) => candidate.cells.length >= 4);
  const values = Object.fromEntries(entry.cells.map((cell) => [cell.key, "X"]));
  const lockedCells = new Set(entry.cells.slice(0, 2).map((cell) => cell.key));
  const hint = revealHint({ entry, cellValues: values, lockedCells, random: () => 0 });
  assert.ok(hint);
  assert.ok(!lockedCells.has(hint.key));
  assert.equal(hint.value, hint.solution);

  for (const cell of entry.cells) values[cell.key] = cell.solution;
  assert.equal(revealHint({ entry, cellValues: values, lockedCells }), null);
});

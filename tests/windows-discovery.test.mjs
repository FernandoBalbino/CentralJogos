import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { windowsDiscoveryLessons } from "../js/windows-discovery-data.mjs";
import {
  WORD_SEARCH_COUNT,
  WORD_SEARCH_DIRECTIONS,
  WORD_SEARCH_HIDDEN_COUNT,
  WORD_SEARCH_SIZE,
  WORD_SEARCH_VISIBLE_COUNT,
  appendSelection,
  buildQuizOrder,
  createInitialDiscoveryState,
  createWordSearch,
  matchSelection,
  normalizeGridWord,
  partitionPuzzleWords,
  sanitizeDiscoveryState,
  undoSelection
} from "../js/windows-discovery-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("currículo possui 30 lições completas, únicas e em português", () => {
  assert.equal(windowsDiscoveryLessons.length, 30);
  assert.equal(new Set(windowsDiscoveryLessons.map((item) => item.id)).size, 30);
  assert.equal(new Set(windowsDiscoveryLessons.map((item) => item.gridWord)).size, 30);
  for (const item of windowsDiscoveryLessons) {
    assert.equal(item.gridWord, normalizeGridWord(item.term));
    assert.match(item.gridWord, /^[A-Z]+$/);
    assert.ok(item.gridWord.length <= WORD_SEARCH_SIZE);
    assert.equal(item.options.length, 4);
    assert.equal(new Set(item.options).size, 4);
    assert.ok(item.options.includes(item.correctOption));
    assert.match(item.video, /^\.\/assets\/windows-discovery\/videos\/\d{2}-[a-z]+\.webm$/);
    assert.match(item.poster, /^\.\/assets\/windows-discovery\/posters\/[a-z]+\.webp$/);
    assert.ok(item.demoDescription.length > 30);
    assert.ok(item.explanation.length > 25);
  }
});

test("as 30 animações e todos os pôsteres existem e ficam abaixo de 15 MiB", async () => {
  let total = 0;
  for (const item of windowsDiscoveryLessons) {
    const videoPath = resolve(projectRoot, item.video.replace("./", ""));
    await access(videoPath);
    total += (await stat(videoPath)).size;
    await access(resolve(projectRoot, item.poster.replace("./", "")));
  }
  assert.ok(total > 0);
  assert.ok(total < 15 * 1024 * 1024, `pacote de vídeos possui ${total} bytes`);
});

test("ordem de alternativas é determinística por lição e semente", () => {
  const lesson = windowsDiscoveryLessons[4];
  const first = buildQuizOrder(lesson, "turma-a");
  const second = buildQuizOrder(lesson, "turma-a");
  assert.deepEqual(first, second);
  assert.deepEqual(new Set(first), new Set(lesson.options));
});

test("gerador cria 15 termos válidos em 200 sementes", () => {
  const directionNames = new Set(WORD_SEARCH_DIRECTIONS.map((item) => item.name));
  for (let seed = 0; seed < 200; seed += 1) {
    const puzzle = createWordSearch(windowsDiscoveryLessons, `aluno-${seed}`);
    assert.equal(puzzle.grid.length, WORD_SEARCH_SIZE);
    assert.ok(puzzle.grid.every((row) => row.length === WORD_SEARCH_SIZE));
    assert.equal(puzzle.words.length, WORD_SEARCH_COUNT);
    assert.equal(puzzle.placements.length, WORD_SEARCH_COUNT);
    assert.equal(new Set(puzzle.words.map((item) => item.id)).size, WORD_SEARCH_COUNT);
    const { visibleWords, hiddenWords } = partitionPuzzleWords(puzzle);
    assert.equal(visibleWords.length, WORD_SEARCH_VISIBLE_COUNT);
    assert.equal(hiddenWords.length, WORD_SEARCH_HIDDEN_COUNT);
    assert.equal(new Set([...visibleWords, ...hiddenWords].map((item) => item.id)).size, WORD_SEARCH_COUNT);
    for (const placement of puzzle.placements) {
      assert.ok(directionNames.has(placement.direction));
      assert.equal(placement.cells.length, placement.gridWord.length);
      assert.equal(placement.cells.map(({ row, column }) => puzzle.grid[row][column]).join(""), placement.gridWord);
    }
  }
});

test("cada semente preserva a grade e sementes diferentes variam a rodada", () => {
  const first = createWordSearch(windowsDiscoveryLessons, "mesma-semente");
  const repeated = createWordSearch(windowsDiscoveryLessons, "mesma-semente");
  const different = createWordSearch(windowsDiscoveryLessons, "outra-semente");
  assert.deepEqual(first.grid, repeated.grid);
  assert.deepEqual(first.placements, repeated.placements);
  assert.notDeepEqual(first.grid, different.grid);
});

test("seleção letra por letra exige adjacência e direção constante", () => {
  let selection = appendSelection([], { row: 1, column: 1 });
  assert.equal(selection.ok, true);
  selection = appendSelection(selection.selection, { row: 2, column: 2 });
  assert.equal(selection.ok, true);
  const invalid = appendSelection(selection.selection, { row: 3, column: 2 });
  assert.equal(invalid.ok, false);
  const valid = appendSelection(selection.selection, { row: 3, column: 3 });
  assert.equal(valid.ok, true);
  assert.deepEqual(undoSelection(valid.selection), selection.selection);
});

test("seleção completa encontra somente a posição correta e ainda não resolvida", () => {
  const puzzle = createWordSearch(windowsDiscoveryLessons, "teste-selecao");
  const target = puzzle.placements[0];
  assert.equal(matchSelection(target.cells, puzzle, [])?.id, target.id);
  assert.equal(matchSelection(target.cells, puzzle, [target.id]), null);
  assert.equal(matchSelection(target.cells.slice(0, -1), puzzle, []), null);
});

test("estado persistido inválido é saneado sem liberar etapas", () => {
  const initial = createInitialDiscoveryState();
  const sanitized = sanitizeDiscoveryState({
    version: initial.version,
    view: "word-result",
    quizCompleted: false,
    lessonIndex: 999,
    quizCorrect: 999,
    foundIds: [1, 2],
    elapsedSeconds: -10
  });
  assert.equal(sanitized.view, "intro");
  assert.equal(sanitized.quizCompleted, false);
  assert.equal(sanitized.lessonIndex, 29);
  assert.equal(sanitized.quizCorrect, 30);
  assert.equal(sanitized.elapsedSeconds, 0);
});

test("rota, ciclo de vida, cache e cartão do Jogo 09 estão integrados", async () => {
  const [index, app, worker, css] = await Promise.all([
    readFile(resolve(projectRoot, "index.html"), "utf8"),
    readFile(resolve(projectRoot, "js/app.js"), "utf8"),
    readFile(resolve(projectRoot, "service-worker.js"), "utf8"),
    readFile(resolve(projectRoot, "windows-discovery-game.css"), "utf8")
  ]);
  assert.match(index, /Jogo 09/);
  assert.match(index, /#\/descubra-windows/);
  assert.match(index, /windows-discovery-game\.css/);
  assert.match(app, /windowsDiscoveryGame\.mount/);
  assert.match(app, /windowsDiscoveryGame\.enter/);
  assert.match(app, /windowsDiscoveryGame\.leave/);
  assert.match(worker, /central-jogos-offline-v13/);
  assert.match(worker, /WINDOWS_DISCOVERY_MEDIA/);
  assert.match(worker, /type: "progress"/);
  assert.match(css, /grid-template-columns: minmax\(0, 1\.85fr\)/);
  assert.match(css, /\.wd-question-column\.has-feedback/);
});

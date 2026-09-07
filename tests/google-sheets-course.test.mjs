import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GOOGLE_SHEETS_DEMO_ACTIONS,
  GOOGLE_SHEETS_DEMO_TARGETS,
  GOOGLE_SHEETS_PRACTICE_ACTIONS,
  googleSheetsFinalChallenge,
  googleSheetsLessons
} from "../js/google-sheets-course-data.mjs";
import {
  GOOGLE_SHEETS_COURSE_STORAGE_KEY,
  cellsInRange,
  courseStats,
  createFinalChallengeProgress,
  createInitialCourseState,
  createLessonSpreadsheetState,
  displayCellValue,
  evaluateCell,
  practiceMatches,
  recalculateSpreadsheet,
  reduceSpreadsheet,
  sanitizeCourseState,
  updateFinalChallenge,
  validateFinalChallenge
} from "../js/google-sheets-course-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const apply = (state, type, payload = {}) => reduceSpreadsheet(state, { type, payload });

test("catálogo possui exatamente 30 aulas e cinco módulos de seis aulas", () => {
  assert.equal(googleSheetsLessons.length, 30);
  assert.deepEqual(googleSheetsLessons.map((lesson) => lesson.id), Array.from({ length: 30 }, (_, index) => index + 1));
  assert.deepEqual([...new Set(googleSheetsLessons.map((lesson) => lesson.module))].map((module) => googleSheetsLessons.filter((lesson) => lesson.module === module).length), [6, 6, 6, 6, 6]);
  for (const lesson of googleSheetsLessons) {
    assert.ok(lesson.title.length > 5);
    assert.ok(lesson.objective.length > 20);
    assert.ok(lesson.explanation.length > 20);
    assert.equal(lesson.demo.type, "script");
    assert.ok(lesson.demo.steps.length >= 5);
    assert.equal(lesson.question.options.length, 4);
    assert.ok(GOOGLE_SHEETS_PRACTICE_ACTIONS.includes(lesson.practice.expectedAction));
    for (const step of lesson.demo.steps) {
      assert.ok(GOOGLE_SHEETS_DEMO_ACTIONS.includes(step.action));
      if (step.target) assert.ok(GOOGLE_SHEETS_DEMO_TARGETS.includes(step.target), `alvo desconhecido: ${step.target}`);
      if (step.effect) assert.ok(GOOGLE_SHEETS_PRACTICE_ACTIONS.includes(step.effect.type));
    }
  }
});

test("endereços, intervalos e fórmulas básicas são determinísticos", () => {
  assert.deepEqual(cellsInRange("A1", "C3"), ["A1", "B1", "C1", "A2", "B2", "C2", "A3", "B3", "C3"]);
  let state = createLessonSpreadsheetState(28);
  state = apply(state, "formula:input", { cell: "D2", input: "=B2*C2" });
  assert.equal(state.cells.D2.value, 12);
  state = apply(state, "formula:input", { cell: "D3", input: "=(B2+C2)*2" });
  assert.equal(state.cells.D3.value, 14);
  state = apply(state, "formula:input", { cell: "B5", input: "=SOMA(B2:B4)" });
  assert.equal(state.cells.B5.value, 3);
  state = apply(state, "formula:input", { cell: "C5", input: "=MÉDIA(C2:C4)" });
  assert.equal(state.cells.C5.value, 4 / 3);
  assert.equal(evaluateCell(state, "D2"), 12);
  assert.equal(state.cells.D2.value, 12);
  assert.equal(displayCellValue({ value: 25, format: { numberFormat: "currency" } }), "R$ 25,00");
});

test("cada prática exige a mudança correspondente no simulador", () => {
  let state = createLessonSpreadsheetState(1);
  state = apply(state, "app:identify");
  assert.equal(practiceMatches(googleSheetsLessons[0], { type: "app:identify", payload: {} }, createLessonSpreadsheetState(1), state), true);

  state = createLessonSpreadsheetState(8);
  const beforeText = state;
  state = apply(state, "cell:input", { cell: "A1", input: "Aluno" });
  assert.equal(practiceMatches(googleSheetsLessons[7], { type: "cell:input", payload: { cell: "A1", input: "Aluno" } }, beforeText, state), true);

  state = createLessonSpreadsheetState(12);
  const navEvents = ["ArrowRight", "Tab", "Enter"];
  for (const key of navEvents) {
    const previous = state;
    state = apply(state, "navigation:key", { key });
    assert.equal(practiceMatches(googleSheetsLessons[11], { type: "navigation:key", payload: { key } }, previous, state), key === "Enter");
  }

  state = createLessonSpreadsheetState(17);
  state = apply(state, "clipboard:copy");
  state = apply(state, "cell:select", { cell: "B1" });
  const beforePaste = state;
  state = apply(state, "clipboard:paste", { target: "B1", mode: "copy" });
  assert.equal(practiceMatches(googleSheetsLessons[16], { type: "clipboard:paste", payload: { target: "B1", mode: "copy" } }, beforePaste, state), true);

  state = createLessonSpreadsheetState(19);
  for (const style of ["bold", "italic", "underline"]) state = apply(state, "format:style", { style, enabled: true });
  assert.equal(practiceMatches(googleSheetsLessons[18], { type: "format:style", payload: { style: "underline", enabled: true } }, createLessonSpreadsheetState(19), state), true);

  state = createLessonSpreadsheetState(24);
  state = apply(state, "range:select", { start: "A1", end: "C3" });
  const beforeBorder = state;
  state = apply(state, "format:border", { border: "all" });
  assert.equal(practiceMatches(googleSheetsLessons[23], { type: "format:border", payload: { border: "all" } }, beforeBorder, state), true);

  state = createLessonSpreadsheetState(25);
  state = apply(state, "sheet:insert", { kind: "row" });
  const beforeColumn = state;
  state = apply(state, "sheet:insert", { kind: "column" });
  assert.equal(practiceMatches(googleSheetsLessons[24], { type: "sheet:insert", payload: { kind: "column" } }, beforeColumn, state), true);
});

test("ações de edição, formatação, fórmulas e inserção preservam estado real", () => {
  let state = createLessonSpreadsheetState(10);
  state = apply(state, "cell:edit", { cell: "A1", input: "Aluno" });
  state = apply(state, "format:style", { style: "bold", enabled: true });
  state = apply(state, "format:font-size", { size: 14 });
  state = apply(state, "format:text-color", { color: "#1a73e8" });
  state = apply(state, "format:fill-color", { color: "#fce8b2" });
  state = apply(state, "format:align", { align: "center" });
  state = apply(state, "format:number", { format: "currency" });
  assert.equal(state.cells.A1.input, "Aluno");
  assert.equal(state.cells.A1.format.bold, true);
  assert.equal(state.cells.A1.format.fontSize, 14);
  assert.equal(state.cells.A1.format.textColor, "#1a73e8");
  assert.equal(state.cells.A1.format.fillColor, "#fce8b2");
  assert.equal(state.cells.A1.format.align, "center");
  assert.equal(state.cells.A1.format.numberFormat, "currency");

  state = createLessonSpreadsheetState(29);
  state = apply(state, "formula:input", { cell: "B5", input: "=SOMA(B2:B4)" });
  assert.equal(state.cells.B5.value, 60);
  state = createLessonSpreadsheetState(30);
  state = apply(state, "formula:input", { cell: "C5", input: "=MÉDIA(C2:C4)" });
  assert.equal(state.cells.C5.value, 8);
  state = apply(state, "format:number", { format: "percent" });
  assert.match(displayCellValue(state.cells.C5), /800/);
});

test("desafio final confere dez objetivos e conclui só com o estado completo", () => {
  let progress = createFinalChallengeProgress();
  let state = progress.state;
  const fill = (cell, input) => { state = apply(state, "cell:input", { cell, input }); };
  for (const [cell, input] of [["A1", "Produto"], ["B1", "Quantidade"], ["C1", "Preço"], ["D1", "Total"], ["A2", "Caderno"], ["B2", "2"], ["C2", "15"], ["A3", "Caneta"], ["B3", "3"], ["C3", "5"], ["E1", "Taxa"], ["E2", "0,1"]]) fill(cell, input);
  state = apply(state, "range:select", { start: "A1", end: "D3" });
  state = apply(state, "format:border", { border: "all" });
  state = apply(state, "range:select", { start: "A1", end: "D1" });
  for (const style of ["bold"]) state = apply(state, "format:style", { style, enabled: true });
  state = apply(state, "format:fill-color", { color: "#fce8b2" });
  state = apply(state, "format:align", { align: "center" });
  state = apply(state, "cell:select", { cell: "C2" });
  state = apply(state, "format:number", { format: "currency" });
  state = apply(state, "cell:select", { cell: "C3" });
  state = apply(state, "format:number", { format: "currency" });
  state = apply(state, "cell:select", { cell: "E2" });
  state = apply(state, "format:number", { format: "percent" });
  state = apply(state, "formula:input", { cell: "D2", input: "=B2*C2" });
  state = apply(state, "formula:input", { cell: "D4", input: "=SOMA(D2:D3)" });
  state = apply(state, "formula:input", { cell: "C4", input: "=MÉDIA(C2:C3)" });
  const goals = validateFinalChallenge(state);
  assert.equal(Object.values(goals).filter(Boolean).length, 10);
  progress = updateFinalChallenge({ ...progress, state }, { type: "cell:select", payload: { cell: "A1" } });
  assert.equal(progress.completed, true);
  assert.equal(googleSheetsFinalChallenge.goals.length, 10);
});

test("progresso permanece sequencial, sanitizado e compatível", () => {
  const initial = createInitialCourseState();
  initial.view = "lesson";
  initial.currentLessonId = 10;
  initial.stage = "practice";
  initial.lessons[10].watched = true;
  const restored = sanitizeCourseState(JSON.parse(JSON.stringify(initial)));
  assert.equal(restored.currentLessonId, 1);
  assert.equal(restored.stage, "watch");
  assert.equal(GOOGLE_SHEETS_COURSE_STORAGE_KEY, "central-jogos.google-sheets-course.v1");
  assert.equal(Object.keys(restored.lessons).length, 30);
  assert.deepEqual(courseStats(restored), { completedLessons: 0, correctAnswers: 0, questionAttempts: 0, accuracy: 0, completedPractices: 0, teacherCompleted: 0, finalChallengeCompleted: false });
});

test("rota, recursos, cache v17, fullscreen, senha e instrução Reproduzir estão integrados", async () => {
  const [index, app, game, css, worker] = await Promise.all([
    readFile(resolve(projectRoot, "index.html"), "utf8"),
    readFile(resolve(projectRoot, "js/app.js"), "utf8"),
    readFile(resolve(projectRoot, "js/google-sheets-course-game.mjs"), "utf8"),
    readFile(resolve(projectRoot, "google-sheets-course.css"), "utf8"),
    readFile(resolve(projectRoot, "service-worker.js"), "utf8")
  ]);
  assert.match(index, /Jogo 11/);
  assert.match(index, /#\/google-planilhas/);
  assert.match(index, /google-sheets-course-screen/);
  assert.match(app, /googleSheetsCourseGame\.mount/);
  assert.match(app, /google-planilhas/);
  assert.match(game, /TEACHER_PASSWORD_HASH = "6bbe9df04e5d43cb2db41c795b9a4f4d84349cf9e889597b310cf8fe13f6c59f"/);
  assert.match(game, /this\.teacherUnlocked = false/);
  assert.match(game, /Senha incorreta\./);
  assert.match(game, /requestCourseFullscreen\(\)/);
  assert.match(game, /Para começar esta aula/);
  assert.match(game, /MENU_OPEN_HOLD_MS = 1000/);
  assert.match(game, /OPTION_HIGHLIGHT_MS = 500/);
  assert.match(game, /OPTION_SETTLE_MS = 350/);
  assert.match(css, /@font-face/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /@media \(max-width: 1100px\)/);
  assert.match(worker, /central-jogos-offline-v17/);
  assert.match(worker, /google-sheets-course-data\.mjs/);
  assert.match(worker, /roboto-400\.ttf/);
  assert.match(worker, /chromebook-keyboard\.webp/);
});

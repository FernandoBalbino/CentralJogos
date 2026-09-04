import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GOOGLE_SLIDES_DEMO_ACTIONS,
  GOOGLE_SLIDES_DEMO_TARGETS,
  GOOGLE_SLIDES_DEMO_TYPES,
  GOOGLE_SLIDES_PRACTICE_ACTIONS,
  demoStepCount,
  googleSlidesFinalChallenge,
  googleSlidesLessons
} from "../js/google-slides-course-data.mjs";
import {
  GOOGLE_SLIDES_COURSE_STORAGE_KEY,
  courseStats,
  createFinalChallengeProgress,
  createInitialCourseState,
  createLessonPresentationState,
  markLessonCompleteByTeacher,
  practiceMatches,
  rebuildDemoState,
  reducePresentation,
  resetLessonInState,
  sanitizeCourseState,
  updateFinalChallenge,
  validateFinalChallenge
} from "../js/google-slides-course-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("catálogo possui 30 aulas completas distribuídas nos cinco módulos", () => {
  assert.equal(googleSlidesLessons.length, 30);
  assert.deepEqual(googleSlidesLessons.map((lesson) => lesson.id), Array.from({ length: 30 }, (_, index) => index + 1));
  assert.equal(new Set(googleSlidesLessons.map((lesson) => lesson.id)).size, 30);
  assert.deepEqual([...new Set(googleSlidesLessons.map((lesson) => lesson.module))].length, 5);
  assert.deepEqual([...new Set(googleSlidesLessons.map((lesson) => lesson.module))].map((module) => googleSlidesLessons.filter((lesson) => lesson.module === module).length), [6, 8, 5, 6, 5]);
  for (const lesson of googleSlidesLessons) {
    assert.ok(lesson.title.length > 5);
    assert.ok(lesson.objective.length > 20);
    assert.ok(lesson.explanation.length > 20);
    assert.ok(GOOGLE_SLIDES_DEMO_TYPES.includes(lesson.demo.type));
    assert.equal(lesson.demo.type, "script");
    assert.ok(demoStepCount(lesson.demo) >= 5);
    assert.equal(lesson.question.options.length, 4);
    assert.equal(new Set(lesson.question.options).size, 4);
    assert.ok(Number.isInteger(lesson.question.answer));
    assert.ok(lesson.question.answer >= 0 && lesson.question.answer < 4);
    assert.ok(GOOGLE_SLIDES_PRACTICE_ACTIONS.includes(lesson.practice.expectedAction));
    for (const step of lesson.demo.steps) {
      assert.ok(GOOGLE_SLIDES_DEMO_ACTIONS.includes(step.action));
      if (step.target) assert.ok(GOOGLE_SLIDES_DEMO_TARGETS.includes(step.target), `alvo desconhecido: ${step.target}`);
      if (step.effect) assert.ok(GOOGLE_SLIDES_PRACTICE_ACTIONS.includes(step.effect.type));
    }
  }
});

test("cada uma das 30 práticas altera o estado e só então é aceita", () => {
  for (const lesson of googleSlidesLessons) {
    let previous = createLessonPresentationState(lesson.id);
    if (lesson.id === 6) previous = reducePresentation(previous, { type: "slide:select", payload: { id: "slide-2" } });
    const event = { type: lesson.practice.expectedAction, payload: lesson.practice.expectedPayload || {} };
    const next = reducePresentation(previous, event);
    assert.notDeepEqual(next, previous, `aula ${lesson.id} não alterou o estado`);
    assert.equal(practiceMatches(lesson, event, previous, next), true, `prática da aula ${lesson.id} não foi aceita`);
    assert.equal(practiceMatches(lesson, { type: "canvas:focus", payload: {} }, previous, next), lesson.practice.expectedAction === "canvas:focus");
  }
});

test("criar, duplicar, reordenar e excluir modificam o deck real", () => {
  const initial = createLessonPresentationState(4);
  const created = reducePresentation(initial, { type: "slide:create", payload: {} });
  const duplicated = reducePresentation(created, { type: "slide:duplicate", payload: {} });
  const reordered = reducePresentation(duplicated, { type: "slide:reorder", payload: { id: duplicated.selectedSlideId, toIndex: 0 } });
  const deleted = reducePresentation(reordered, { type: "slide:delete", payload: { deletedSlideId: reordered.selectedSlideId } });
  assert.equal(initial.slides.length, 1);
  assert.equal(created.slides.length, 2);
  assert.equal(duplicated.slides.length, 3);
  assert.equal(reordered.slides[0].id, duplicated.selectedSlideId);
  assert.equal(reordered.reordered, true);
  assert.equal(deleted.slides.length, 2);
});

test("texto, imagens e elementos visuais guardam formatação e posição", () => {
  let state = createLessonPresentationState(8);
  state = reducePresentation(state, { type: "text:title", payload: { value: "Minha apresentação" } });
  state = reducePresentation(state, { type: "text:create", payload: { value: "Conteúdo da aula" } });
  state = reducePresentation(state, { type: "text:font-size", payload: { size: 28 } });
  state = reducePresentation(state, { type: "text:font", payload: { font: "Verdana" } });
  state = reducePresentation(state, { type: "text:style", payload: {} });
  state = reducePresentation(state, { type: "text:color", payload: { color: "#1a73e8" } });
  state = reducePresentation(state, { type: "text:align", payload: { align: "center" } });
  state = reducePresentation(state, { type: "image:insert", payload: {} });
  state = reducePresentation(state, { type: "image:resize", payload: { scale: 1.25 } });
  state = reducePresentation(state, { type: "image:move", payload: { x: 62, y: 48 } });
  state = reducePresentation(state, { type: "shape:insert", payload: { kind: "rectangle" } });
  state = reducePresentation(state, { type: "line:insert", payload: { kind: "arrow" } });
  const slide = state.slides[0];
  const text = slide.textElements[0];
  assert.equal(slide.title, "Minha apresentação");
  assert.deepEqual({ size: text.fontSize, font: text.font, bold: text.bold, italic: text.italic, underline: text.underline, color: text.color, align: text.align }, { size: 28, font: "Verdana", bold: true, italic: true, underline: true, color: "#1a73e8", align: "center" });
  assert.deepEqual({ scale: slide.images[0].scale, x: slide.images[0].x, y: slide.images[0].y }, { scale: 1.25, x: 62, y: 48 });
  assert.deepEqual(slide.shapes.map((shape) => shape.kind), ["rectangle", "arrow"]);
});

test("demonstrações são reconstruídas e repetir volta ao estado inicial", () => {
  for (const lesson of googleSlidesLessons) {
    const complete = rebuildDemoState(lesson, demoStepCount(lesson.demo));
    const repeated = rebuildDemoState(lesson, 0);
    assert.notDeepEqual(complete, repeated, `demonstração da aula ${lesson.id} não produziu mudança`);
    assert.deepEqual(repeated, createLessonPresentationState(lesson.id));
  }
});

test("o desafio final confere dez objetivos no estado real", () => {
  let progress = createFinalChallengeProgress();
  const apply = (type, payload = {}) => { progress = updateFinalChallenge(progress, { type, payload }); };
  apply("slide:create");
  apply("slide:create");
  apply("slide:select", { id: "slide-1" });
  apply("text:title", { value: "Minha apresentação" });
  apply("text:create", { value: "Conteúdo da aula" });
  apply("text:style");
  apply("image:insert");
  apply("layout:change", { layout: "title-body" });
  apply("slide:select", { id: "slide-2" });
  apply("slide:reorder", { id: "slide-2", toIndex: 0 });
  apply("theme:change", { theme: "dourado" });
  apply("transition:change", { transition: "dissolver" });
  assert.equal(progress.completed, false);
  apply("presentation:start");
  assert.equal(googleSlidesFinalChallenge.goals.length, 10);
  assert.equal(Object.values(validateFinalChallenge(progress.state)).filter(Boolean).length, 10);
  assert.equal(progress.completed, true);
  assert.ok(progress.completedAt);
});

test("sanitização bloqueia aulas fora de ordem e restaura a etapa válida", () => {
  const state = createInitialCourseState();
  state.view = "lesson";
  state.currentLessonId = 12;
  state.stage = "practice";
  state.lessons[12].watched = true;
  state.lessons[12].questionCompleted = true;
  const blocked = sanitizeCourseState(JSON.parse(JSON.stringify(state)));
  assert.equal(blocked.currentLessonId, 1);
  assert.equal(blocked.stage, "watch");

  for (let id = 1; id <= 4; id += 1) Object.assign(state.lessons[id], { watched: true, questionCompleted: true, practiceCompleted: true, completed: true });
  state.currentLessonId = 5;
  state.stage = "question";
  state.lessons[5].watched = true;
  const restored = sanitizeCourseState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.currentLessonId, 5);
  assert.equal(restored.stage, "question");
});

test("progresso serializado preserva 30 aulas, simulador e desafio", () => {
  const state = createInitialCourseState();
  state.view = "lesson";
  state.lessons[1].watched = true;
  state.lessons[1].demoStep = 3;
  state.lessons[1].questionAttempts = 2;
  state.finalChallenge.state = reducePresentation(state.finalChallenge.state, { type: "slide:create", payload: {} });
  const restored = sanitizeCourseState(JSON.parse(JSON.stringify(state)));
  assert.equal(GOOGLE_SLIDES_COURSE_STORAGE_KEY, "central-jogos.google-slides-course.v1");
  assert.equal(Object.keys(restored.lessons).length, 30);
  assert.equal(restored.lessons[1].demoStep, 3);
  assert.equal(restored.lessons[1].questionAttempts, 2);
  assert.equal(restored.finalChallenge.state.slides.length, 2);
});

test("conclusões forçadas pelo professor não entram na precisão", () => {
  const initial = createInitialCourseState();
  initial.lessons[2].questionAttempts = 3;
  initial.lessons[2].incorrectAttempts = 3;
  const completed = markLessonCompleteByTeacher(initial, 2);
  assert.equal(completed.lessons[2].completedByTeacher, true);
  assert.deepEqual(courseStats(completed), {
    completedLessons: 1,
    correctAnswers: 0,
    questionAttempts: 0,
    accuracy: 0,
    completedPractices: 0,
    teacherCompleted: 1,
    finalChallengeCompleted: false
  });
  const reset = resetLessonInState(completed, 2);
  assert.equal(reset.lessons[2].completed, false);
  assert.equal(reset.currentLessonId, 2);
});

test("rota, desafio, modo professor, acessibilidade e cache v14 estão integrados", async () => {
  const [index, app, game, css, worker] = await Promise.all([
    readFile(resolve(projectRoot, "index.html"), "utf8"),
    readFile(resolve(projectRoot, "js/app.js"), "utf8"),
    readFile(resolve(projectRoot, "js/google-slides-course-game.mjs"), "utf8"),
    readFile(resolve(projectRoot, "google-slides-course.css"), "utf8"),
    readFile(resolve(projectRoot, "service-worker.js"), "utf8")
  ]);
  assert.match(index, /30 aulas \+ desafio/);
  assert.match(index, /#\/google-apresentacoes/);
  assert.match(app, /googleSlidesCourseGame\.mount/);
  assert.match(game, /renderChallenge\(\)/);
  assert.match(game, /teacher-module-filter/);
  assert.match(game, /teacher-challenge/);
  assert.match(game, /new EventTarget\(\)/);
  assert.match(game, /type: event\.type, payload: event\.payload, state: next/);
  assert.match(css, /gsc-challenge-checklist/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(worker, /central-jogos-offline-v14/);
  assert.match(worker, /google-slides-course-data\.mjs/);
});

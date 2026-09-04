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
  googleSlidesLessons
} from "../js/google-slides-course-data.mjs";
import {
  GOOGLE_SLIDES_COURSE_STORAGE_KEY,
  courseStats,
  createInitialCourseState,
  createLessonPresentationState,
  markLessonCompleteByTeacher,
  practiceMatches,
  rebuildDemoState,
  reducePresentation,
  resetLessonInState,
  sanitizeCourseState
} from "../js/google-slides-course-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("catálogo da Fase 1 possui três aulas completas e ações válidas", () => {
  assert.equal(googleSlidesLessons.length, 3);
  assert.deepEqual(googleSlidesLessons.map((lesson) => lesson.id), [1, 2, 3]);
  assert.equal(new Set(googleSlidesLessons.map((lesson) => lesson.id)).size, 3);
  for (const lesson of googleSlidesLessons) {
    assert.ok(lesson.title.length > 5);
    assert.ok(lesson.objective.length > 20);
    assert.ok(GOOGLE_SLIDES_DEMO_TYPES.includes(lesson.demo.type));
    assert.equal(lesson.demo.type, "script", "a Fase 1 deve usar somente demonstrações locais em script");
    assert.equal(demoStepCount(lesson.demo), lesson.demo.steps.length);
    assert.ok(lesson.demo.steps.length >= 4);
    assert.equal(lesson.question.options.length, 4);
    assert.equal(new Set(lesson.question.options).size, 4);
    assert.ok(Number.isInteger(lesson.question.answer));
    assert.ok(lesson.question.answer >= 0 && lesson.question.answer < lesson.question.options.length);
    assert.ok(GOOGLE_SLIDES_PRACTICE_ACTIONS.includes(lesson.practice.expectedAction));
    for (const step of lesson.demo.steps) {
      assert.ok(GOOGLE_SLIDES_DEMO_ACTIONS.includes(step.action));
      if (step.target) assert.ok(GOOGLE_SLIDES_DEMO_TARGETS.includes(step.target), `alvo desconhecido: ${step.target}`);
      if (step.effect) assert.ok(GOOGLE_SLIDES_PRACTICE_ACTIONS.includes(step.effect.type));
    }
  }
});

test("estado real do simulador identifica a tela, cria, seleciona e exclui slides", () => {
  const first = createLessonPresentationState(1);
  const focused = reducePresentation(first, { type: "canvas:focus", payload: {} });
  assert.equal(focused.focusedRegion, "canvas");
  assert.equal(first.focusedRegion, null, "o redutor não deve alterar o estado anterior");

  const createStart = createLessonPresentationState(2);
  const created = reducePresentation(createStart, { type: "slide:create", payload: {} });
  assert.equal(created.slides.length, 2);
  assert.equal(created.selectedSlideId, "slide-2");
  assert.equal(createStart.slides.length, 1);

  const deleteStart = createLessonPresentationState(3);
  const selected = reducePresentation(deleteStart, { type: "slide:select", payload: { id: "slide-2" } });
  const deleted = reducePresentation(selected, { type: "slide:delete", payload: { deletedSlideId: "slide-2" } });
  assert.equal(selected.selectedSlideId, "slide-2");
  assert.deepEqual(deleted.slides.map((slide) => slide.id), ["slide-1"]);
  assert.equal(deleted.selectedSlideId, "slide-1");
});

test("prática só conclui com o evento esperado e uma alteração verdadeira", () => {
  const createLesson = googleSlidesLessons[1];
  const previous = createLessonPresentationState(2);
  const wrongEvent = { type: "canvas:focus", payload: {} };
  const wrongNext = reducePresentation(previous, wrongEvent);
  assert.equal(practiceMatches(createLesson, wrongEvent, previous, wrongNext), false);
  assert.equal(practiceMatches(createLesson, { type: "slide:create", payload: {} }, previous, previous), false);

  const correctEvent = { type: "slide:create", payload: {} };
  const correctNext = reducePresentation(previous, correctEvent);
  assert.equal(practiceMatches(createLesson, correctEvent, previous, correctNext), true);

  const deleteLesson = googleSlidesLessons[2];
  const deleteStart = reducePresentation(createLessonPresentationState(3), { type: "slide:select", payload: { id: "slide-2" } });
  const wrongDelete = { type: "slide:delete", payload: { deletedSlideId: "slide-1" } };
  const correctDelete = { type: "slide:delete", payload: { deletedSlideId: "slide-2" } };
  const deleteNext = reducePresentation(deleteStart, correctDelete);
  assert.equal(practiceMatches(deleteLesson, wrongDelete, deleteStart, deleteNext), false);
  assert.equal(practiceMatches(deleteLesson, correctDelete, deleteStart, deleteNext), true);
});

test("demonstrações podem ser reconstruídas e repetidas sem estado falso", () => {
  const createLesson = googleSlidesLessons[1];
  const beforeClick = rebuildDemoState(createLesson, 2);
  const afterClick = rebuildDemoState(createLesson, createLesson.demo.steps.length);
  const repeated = rebuildDemoState(createLesson, 0);
  assert.equal(beforeClick.slides.length, 1);
  assert.equal(afterClick.slides.length, 2);
  assert.equal(repeated.slides.length, 1);

  const deleteLesson = googleSlidesLessons[2];
  const afterDelete = rebuildDemoState(deleteLesson, deleteLesson.demo.steps.length);
  assert.deepEqual(afterDelete.slides.map((slide) => slide.id), ["slide-1"]);
});

test("progresso inválido é saneado e não libera etapas", () => {
  const initial = createInitialCourseState();
  const sanitized = sanitizeCourseState({
    version: initial.version,
    view: "result",
    currentLessonId: 999,
    stage: "practice",
    lessons: {
      1: { watched: false, questionCompleted: true, practiceCompleted: true, completed: true, demoStep: 999 },
      2: { watched: true, questionCompleted: false, practiceCompleted: true },
      3: null
    }
  });
  assert.equal(sanitized.currentLessonId, 1);
  assert.equal(sanitized.stage, "watch");
  assert.equal(sanitized.view, "lesson");
  assert.equal(sanitized.lessons[1].questionCompleted, false);
  assert.equal(sanitized.lessons[1].practiceCompleted, false);
  assert.equal(sanitized.lessons[1].demoStep, googleSlidesLessons[0].demo.steps.length);
});

test("progresso serializado restaura etapa, tentativas e estado parcial", () => {
  const state = createInitialCourseState();
  state.view = "lesson";
  state.stage = "practice";
  state.lessons[1].watched = true;
  state.lessons[1].questionCompleted = true;
  state.lessons[1].questionCompletedByStudent = true;
  state.lessons[1].questionAttempts = 3;
  state.lessons[1].incorrectAttempts = 2;
  state.lessons[1].practiceState = reducePresentation(state.lessons[1].practiceState, { type: "slide:create", payload: {} });
  const restored = sanitizeCourseState(JSON.parse(JSON.stringify(state)));
  assert.equal(GOOGLE_SLIDES_COURSE_STORAGE_KEY, "central-jogos.google-slides-course.v1");
  assert.equal(restored.stage, "practice");
  assert.equal(restored.lessons[1].questionAttempts, 3);
  assert.equal(restored.lessons[1].incorrectAttempts, 2);
  assert.equal(restored.lessons[1].practiceState.slides.length, 2);
});

test("conclusão do professor é isolada das estatísticas do aluno e pode ser reiniciada", () => {
  const initial = createInitialCourseState();
  initial.lessons[2].questionAttempts = 2;
  initial.lessons[2].incorrectAttempts = 2;
  const completed = markLessonCompleteByTeacher(initial, 2);
  assert.equal(initial.lessons[2].completed, false);
  assert.equal(completed.lessons[2].completed, true);
  assert.equal(completed.lessons[2].completedByTeacher, true);
  assert.deepEqual(courseStats(completed), {
    completedLessons: 1,
    correctAnswers: 0,
    questionAttempts: 0,
    accuracy: 0,
    completedPractices: 0,
    teacherCompleted: 1
  });
  const reset = resetLessonInState(completed, 2);
  assert.equal(reset.lessons[2].completed, false);
  assert.equal(reset.lessons[2].practiceState.slides.length, 1);
});

test("rota, card, ciclo de vida, controles, responsividade e cache estão integrados", async () => {
  const [index, app, game, css, worker] = await Promise.all([
    readFile(resolve(projectRoot, "index.html"), "utf8"),
    readFile(resolve(projectRoot, "js/app.js"), "utf8"),
    readFile(resolve(projectRoot, "js/google-slides-course-game.mjs"), "utf8"),
    readFile(resolve(projectRoot, "google-slides-course.css"), "utf8"),
    readFile(resolve(projectRoot, "service-worker.js"), "utf8")
  ]);
  assert.match(index, /Jogo 10/);
  assert.match(index, /#\/google-apresentacoes/);
  assert.match(index, /google-slides-course\.css/);
  assert.match(app, /googleSlidesCourseGame\.mount/);
  assert.match(app, /googleSlidesCourseGame\.enter/);
  assert.match(app, /googleSlidesCourseGame\.leave/);
  assert.match(game, /data-action="repeat-demo"/);
  assert.match(game, /data-action="next-demo-step"/);
  assert.match(game, /new EventTarget\(\)/);
  assert.match(game, /type: event\.type, payload: event\.payload, state: next/);
  assert.match(css, /grid-template-columns: minmax\(720px, 1\.68fr\)/);
  assert.match(css, /\.gsc-toolbar button \{ width: 44px; min-width: 44px; min-height: 44px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(worker, /central-jogos-offline-v13/);
  assert.match(worker, /google-slides-course-game\.mjs/);
});

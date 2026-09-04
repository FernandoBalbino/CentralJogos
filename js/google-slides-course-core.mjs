import {
  GOOGLE_SLIDES_COURSE_DATA_VERSION,
  GOOGLE_SLIDES_PRACTICE_ACTIONS,
  demoStepCount,
  googleSlidesLessons
} from "./google-slides-course-data.mjs";

export const GOOGLE_SLIDES_COURSE_STORAGE_KEY = "central-jogos.google-slides-course.v1";

const makeSlide = (id) => ({
  id: `slide-${id}`,
  layout: "title",
  title: "",
  textElements: [],
  images: [],
  shapes: [],
  background: "#ffffff",
  transition: null
});

export const createPresentationState = (slideCount = 1, selectedSlideId = "slide-1") => ({
  slides: Array.from({ length: Math.max(0, slideCount) }, (_, index) => makeSlide(index + 1)),
  selectedSlideId: slideCount ? selectedSlideId : null,
  focusedRegion: null,
  theme: null,
  transition: null,
  presenting: false,
  nextSlideNumber: slideCount + 1
});

export const createLessonPresentationState = (lessonId) => {
  if (lessonId === 1) return createPresentationState(1, "slide-1");
  if (lessonId === 3) return createPresentationState(2, "slide-1");
  return createPresentationState(1, "slide-1");
};

const copyPresentation = (state) => ({
  ...state,
  slides: state.slides.map((slide) => ({
    ...slide,
    textElements: [...slide.textElements],
    images: [...slide.images],
    shapes: [...slide.shapes]
  }))
});

export const reducePresentation = (state, event) => {
  const current = copyPresentation(state);
  if (!event || !GOOGLE_SLIDES_PRACTICE_ACTIONS.includes(event.type)) return current;

  if (event.type === "canvas:focus") {
    current.focusedRegion = "canvas";
    return current;
  }

  if (event.type === "slide:create") {
    const slide = makeSlide(current.nextSlideNumber);
    current.slides.push(slide);
    current.selectedSlideId = slide.id;
    current.focusedRegion = "thumbnails";
    current.nextSlideNumber += 1;
    return current;
  }

  if (event.type === "slide:select") {
    if (current.slides.some((slide) => slide.id === event.payload?.id)) {
      current.selectedSlideId = event.payload.id;
      current.focusedRegion = "thumbnails";
    }
    return current;
  }

  if (event.type === "slide:delete") {
    const deletedSlideId = current.selectedSlideId;
    if (!deletedSlideId) return current;
    const deletedIndex = current.slides.findIndex((slide) => slide.id === deletedSlideId);
    if (deletedIndex < 0) return current;
    current.slides.splice(deletedIndex, 1);
    current.selectedSlideId = current.slides[Math.min(deletedIndex, current.slides.length - 1)]?.id || null;
    current.focusedRegion = "thumbnails";
    return current;
  }

  return current;
};

export const presentationChangedForAction = (previous, next, event) => {
  if (!previous || !next || !event) return false;
  if (event.type === "canvas:focus") return previous.focusedRegion !== "canvas" && next.focusedRegion === "canvas";
  if (event.type === "slide:create") {
    return next.slides.length === previous.slides.length + 1
      && next.selectedSlideId !== previous.selectedSlideId
      && next.slides.some((slide) => slide.id === next.selectedSlideId);
  }
  if (event.type === "slide:select") return next.selectedSlideId === event.payload?.id && previous.selectedSlideId !== next.selectedSlideId;
  if (event.type === "slide:delete") {
    const deletedId = event.payload?.deletedSlideId;
    return Boolean(deletedId)
      && previous.slides.some((slide) => slide.id === deletedId)
      && !next.slides.some((slide) => slide.id === deletedId)
      && next.slides.length === previous.slides.length - 1;
  }
  return false;
};

export const practiceMatches = (lesson, event, previous, next) => {
  if (!lesson || event?.type !== lesson.practice.expectedAction) return false;
  const expectedPayload = lesson.practice.expectedPayload || {};
  const payloadMatches = Object.entries(expectedPayload).every(([key, value]) => event.payload?.[key] === value);
  return payloadMatches && presentationChangedForAction(previous, next, event);
};

const sanitizePresentation = (value, fallback) => {
  if (!value || !Array.isArray(value.slides)) return fallback;
  const slides = value.slides
    .filter((slide) => slide && typeof slide.id === "string")
    .slice(0, 50)
    .map((slide) => ({
      ...makeSlide(1),
      ...slide,
      textElements: Array.isArray(slide.textElements) ? slide.textElements : [],
      images: Array.isArray(slide.images) ? slide.images : [],
      shapes: Array.isArray(slide.shapes) ? slide.shapes : []
    }));
  const selectedSlideId = slides.some((slide) => slide.id === value.selectedSlideId) ? value.selectedSlideId : slides[0]?.id || null;
  const maxSlideNumber = slides.reduce((maximum, slide) => {
    const parsed = Number(slide.id.replace(/^slide-/, ""));
    return Number.isFinite(parsed) ? Math.max(maximum, parsed) : maximum;
  }, 0);
  return {
    slides,
    selectedSlideId,
    focusedRegion: value.focusedRegion === "canvas" || value.focusedRegion === "thumbnails" ? value.focusedRegion : null,
    theme: typeof value.theme === "string" ? value.theme : null,
    transition: typeof value.transition === "string" ? value.transition : null,
    presenting: Boolean(value.presenting),
    nextSlideNumber: Math.max(maxSlideNumber + 1, Number(value.nextSlideNumber) || 1)
  };
};

export const createLessonProgress = (lessonId) => ({
  watched: false,
  demoStep: 0,
  questionCompleted: false,
  questionAttempts: 0,
  incorrectAttempts: 0,
  questionCompletedByStudent: false,
  practiceCompleted: false,
  practiceCompletedByStudent: false,
  completed: false,
  completedByTeacher: false,
  practiceState: createLessonPresentationState(lessonId)
});

export const createInitialCourseState = (lessons = googleSlidesLessons) => ({
  version: GOOGLE_SLIDES_COURSE_DATA_VERSION,
  view: "intro",
  currentLessonId: lessons[0]?.id || null,
  stage: "watch",
  lessons: Object.fromEntries(lessons.map((lesson) => [lesson.id, createLessonProgress(lesson.id)]))
});

const sanitizeLessonProgress = (value, lesson) => {
  const initial = createLessonProgress(lesson.id);
  if (!value) return initial;
  const watched = Boolean(value.watched);
  const questionCompleted = watched && Boolean(value.questionCompleted);
  const practiceCompleted = questionCompleted && Boolean(value.practiceCompleted);
  const completed = watched && questionCompleted && practiceCompleted && Boolean(value.completed);
  return {
    ...initial,
    watched,
    demoStep: Math.max(0, Math.min(demoStepCount(lesson.demo), Number.isInteger(value.demoStep) ? value.demoStep : 0)),
    questionCompleted,
    questionAttempts: Math.max(0, Math.floor(Number(value.questionAttempts) || 0)),
    incorrectAttempts: Math.max(0, Math.floor(Number(value.incorrectAttempts) || 0)),
    questionCompletedByStudent: questionCompleted && Boolean(value.questionCompletedByStudent),
    practiceCompleted,
    practiceCompletedByStudent: practiceCompleted && Boolean(value.practiceCompletedByStudent),
    completed,
    completedByTeacher: completed && Boolean(value.completedByTeacher),
    practiceState: sanitizePresentation(value.practiceState, initial.practiceState)
  };
};

export const sanitizeCourseState = (value, lessons = googleSlidesLessons) => {
  const initial = createInitialCourseState(lessons);
  if (!value || value.version !== GOOGLE_SLIDES_COURSE_DATA_VERSION) return initial;
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const currentLessonId = lessonIds.has(value.currentLessonId) ? value.currentLessonId : initial.currentLessonId;
  const lessonProgress = Object.fromEntries(lessons.map((lesson) => [
    lesson.id,
    sanitizeLessonProgress(value.lessons?.[lesson.id], lesson)
  ]));
  const current = lessonProgress[currentLessonId];
  let stage = ["watch", "question", "practice"].includes(value.stage) ? value.stage : "watch";
  if (stage === "question" && !current.watched) stage = "watch";
  if (stage === "practice" && !current.questionCompleted) stage = current.watched ? "question" : "watch";
  const allCompleted = lessons.every((lesson) => lessonProgress[lesson.id].completed);
  let view = ["intro", "lesson", "result"].includes(value.view) ? value.view : "intro";
  if (view === "result" && !allCompleted) view = "lesson";
  return {
    version: GOOGLE_SLIDES_COURSE_DATA_VERSION,
    view,
    currentLessonId,
    stage,
    lessons: lessonProgress
  };
};

export const markLessonCompleteByTeacher = (state, lessonId) => {
  const lesson = googleSlidesLessons.find((item) => item.id === lessonId);
  if (!lesson || !state.lessons[lessonId]) return state;
  const next = structuredClone(state);
  next.lessons[lessonId] = {
    ...next.lessons[lessonId],
    watched: true,
    demoStep: demoStepCount(lesson.demo),
    questionCompleted: true,
    practiceCompleted: true,
    completed: true,
    completedByTeacher: true
  };
  return next;
};

export const resetLessonInState = (state, lessonId) => {
  if (!state.lessons[lessonId]) return state;
  const next = structuredClone(state);
  next.lessons[lessonId] = createLessonProgress(lessonId);
  if (next.currentLessonId === lessonId) next.stage = "watch";
  if (next.view === "result") next.view = "lesson";
  return next;
};

export const courseStats = (state, lessons = googleSlidesLessons) => {
  const progress = lessons.map((lesson) => state.lessons[lesson.id]);
  const studentProgress = progress.filter((item) => !item.completedByTeacher);
  const questionAttempts = studentProgress.reduce((total, item) => total + item.questionAttempts, 0);
  const correctAnswers = studentProgress.filter((item) => item.questionCompletedByStudent).length;
  return {
    completedLessons: progress.filter((item) => item.completed).length,
    correctAnswers,
    questionAttempts,
    accuracy: questionAttempts ? Math.round((correctAnswers / questionAttempts) * 100) : 0,
    completedPractices: studentProgress.filter((item) => item.practiceCompletedByStudent).length,
    teacherCompleted: progress.filter((item) => item.completedByTeacher).length
  };
};

export const rebuildDemoState = (lesson, completedSteps) => {
  let state = createLessonPresentationState(lesson.id);
  for (const step of lesson.demo.type === "script" ? lesson.demo.steps.slice(0, completedSteps) : []) {
    if (step.effect) state = reducePresentation(state, step.effect);
  }
  return state;
};

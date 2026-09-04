import {
  GOOGLE_SLIDES_COURSE_DATA_VERSION,
  GOOGLE_SLIDES_PRACTICE_ACTIONS,
  demoStepCount,
  googleSlidesFinalChallenge,
  googleSlidesLessons
} from "./google-slides-course-data.mjs";

export const GOOGLE_SLIDES_COURSE_STORAGE_KEY = "central-jogos.google-slides-course.v1";

const makeText = (id, value = "Conteúdo da aula", role = "body") => ({
  id,
  role,
  value,
  fontSize: 18,
  font: "Arial",
  bold: false,
  italic: false,
  underline: false,
  color: "#3c4043",
  align: "left",
  x: 20,
  y: 55
});

const makeImage = (id = "image-1") => ({ id, x: 28, y: 44, width: 28, height: 26, scale: 1 });

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
  selectedTextId: null,
  selectedImageId: null,
  focusedRegion: null,
  identifiedApp: false,
  theme: null,
  transition: null,
  presenting: false,
  shareOpen: false,
  comments: [],
  animations: [],
  reordered: false,
  nextSlideNumber: slideCount + 1,
  nextElementNumber: 2
});

const selectedSlide = (state) => state.slides.find((slide) => slide.id === state.selectedSlideId);
const selectedText = (state) => {
  const slide = selectedSlide(state);
  return slide?.textElements.find((item) => item.id === state.selectedTextId) || slide?.textElements[0] || null;
};
const selectedImage = (state) => {
  const slide = selectedSlide(state);
  return slide?.images.find((item) => item.id === state.selectedImageId) || slide?.images[0] || null;
};

export const createLessonPresentationState = (lessonId) => {
  const twoSlides = [3, 5, 6, 17].includes(lessonId);
  const state = createPresentationState(twoSlides ? 2 : 1, lessonId === 17 ? "slide-2" : "slide-1");
  const slide = selectedSlide(state);
  if ([9, 10, 11, 12, 13, 14, 27].includes(lessonId)) {
    slide.title = "Tecnologia na escola";
    slide.textElements.push(makeText("text-1"));
    state.selectedTextId = lessonId >= 10 && lessonId <= 14 ? "text-1" : null;
  }
  if ([21, 22].includes(lessonId)) {
    slide.images.push(makeImage());
    state.selectedImageId = "image-1";
  }
  return state;
};

const copyPresentation = (state) => ({
  ...state,
  slides: state.slides.map((slide) => ({
    ...slide,
    textElements: slide.textElements.map((item) => ({ ...item })),
    images: slide.images.map((item) => ({ ...item })),
    shapes: slide.shapes.map((item) => ({ ...item }))
  })),
  comments: state.comments.map((item) => ({ ...item })),
  animations: state.animations.map((item) => ({ ...item }))
});

export const reducePresentation = (state, event) => {
  const current = copyPresentation(state);
  if (!event || !GOOGLE_SLIDES_PRACTICE_ACTIONS.includes(event.type)) return current;
  let slide = selectedSlide(current);

  if (event.type === "app:identify") current.identifiedApp = true;
  else if (event.type === "canvas:focus") current.focusedRegion = "canvas";
  else if (event.type === "thumbnails:focus") current.focusedRegion = "thumbnails";
  else if (event.type === "slide:create") {
    const created = makeSlide(current.nextSlideNumber);
    current.slides.push(created);
    current.selectedSlideId = created.id;
    current.focusedRegion = "thumbnails";
    current.nextSlideNumber += 1;
  } else if (event.type === "slide:select") {
    if (current.slides.some((item) => item.id === event.payload?.id)) {
      current.selectedSlideId = event.payload.id;
      current.selectedTextId = null;
      current.selectedImageId = null;
      current.focusedRegion = "thumbnails";
    }
  } else if (event.type === "slide:delete") {
    const deletedSlideId = current.selectedSlideId;
    const index = current.slides.findIndex((item) => item.id === deletedSlideId);
    if (index >= 0) {
      current.slides.splice(index, 1);
      current.selectedSlideId = current.slides[Math.min(index, current.slides.length - 1)]?.id || null;
      current.selectedTextId = null;
      current.selectedImageId = null;
      current.focusedRegion = "thumbnails";
    }
  } else if (event.type === "slide:duplicate" && slide) {
    const duplicated = structuredClone(slide);
    duplicated.id = `slide-${current.nextSlideNumber}`;
    current.slides.splice(current.slides.indexOf(slide) + 1, 0, duplicated);
    current.selectedSlideId = duplicated.id;
    current.nextSlideNumber += 1;
  } else if (event.type === "slide:reorder") {
    const id = event.payload?.id || current.selectedSlideId;
    const fromIndex = current.slides.findIndex((item) => item.id === id);
    const toIndex = Math.max(0, Math.min(current.slides.length - 1, Number(event.payload?.toIndex) || 0));
    if (fromIndex >= 0 && fromIndex !== toIndex) {
      const [moved] = current.slides.splice(fromIndex, 1);
      current.slides.splice(toIndex, 0, moved);
      current.selectedSlideId = moved.id;
      current.reordered = true;
    }
  } else if (event.type === "text:title" && slide) {
    slide.title = event.payload?.value || "Minha apresentação";
  } else if (event.type === "text:create" && slide) {
    const id = `text-${current.nextElementNumber}`;
    slide.textElements.push(makeText(id, event.payload?.value || "Conteúdo da aula"));
    current.selectedTextId = id;
    current.nextElementNumber += 1;
  } else if (event.type === "text:select" && slide) {
    if (slide.textElements.some((item) => item.id === event.payload?.id)) current.selectedTextId = event.payload.id;
  } else if (event.type === "text:font-size") {
    const text = selectedText(current);
    if (text) text.fontSize = Number(event.payload?.size) || 28;
  } else if (event.type === "text:font") {
    const text = selectedText(current);
    if (text) text.font = event.payload?.font || "Verdana";
  } else if (event.type === "text:style") {
    const text = selectedText(current);
    if (text) Object.assign(text, { bold: true, italic: true, underline: true });
  } else if (event.type === "text:color") {
    const text = selectedText(current);
    if (text) text.color = event.payload?.color || "#1a73e8";
  } else if (event.type === "text:align") {
    const text = selectedText(current);
    if (text) text.align = event.payload?.align || "center";
  } else if (event.type === "layout:change" && slide) slide.layout = event.payload?.layout || "title-body";
  else if (event.type === "background:change" && slide) slide.background = event.payload?.color || "#fff2cc";
  else if (event.type === "theme:change") current.theme = event.payload?.theme || "dourado";
  else if (event.type === "image:insert" && slide) {
    const image = makeImage(`image-${current.nextElementNumber}`);
    slide.images.push(image);
    current.selectedImageId = image.id;
    current.nextElementNumber += 1;
  } else if (event.type === "image:resize") {
    const image = selectedImage(current);
    if (image) image.scale = Number(event.payload?.scale) || 1.25;
  } else if (event.type === "image:move") {
    const image = selectedImage(current);
    if (image) Object.assign(image, { x: Number(event.payload?.x) || 62, y: Number(event.payload?.y) || 48 });
  } else if (event.type === "shape:insert" && slide) {
    slide.shapes.push({ id: `shape-${current.nextElementNumber}`, kind: event.payload?.kind || "rectangle", x: 56, y: 22 });
    current.nextElementNumber += 1;
  } else if (event.type === "textbox:insert" && slide) {
    const id = `text-${current.nextElementNumber}`;
    slide.textElements.push(makeText(id, event.payload?.value || "Nova caixa de texto", "textbox"));
    current.selectedTextId = id;
    current.nextElementNumber += 1;
  } else if (event.type === "line:insert" && slide) {
    slide.shapes.push({ id: `shape-${current.nextElementNumber}`, kind: event.payload?.kind || "arrow", x: 48, y: 72 });
    current.nextElementNumber += 1;
  } else if (event.type === "transition:change" && slide) {
    current.transition = event.payload?.transition || "dissolver";
    slide.transition = current.transition;
  } else if (event.type === "animation:add") {
    current.animations.push({ id: `animation-${current.animations.length + 1}`, type: event.payload?.animation || "aparecer" });
  } else if (event.type === "comment:add") {
    current.comments.push({ id: `comment-${current.comments.length + 1}`, value: event.payload?.value || "Revise este slide" });
  } else if (event.type === "share:open") current.shareOpen = true;
  else if (event.type === "presentation:start") current.presenting = true;

  return current;
};

export const presentationChangedForAction = (previous, next, event) => {
  if (!previous || !next || !event) return false;
  const beforeSlide = selectedSlide(previous);
  const afterSlide = selectedSlide(next);
  const beforeText = selectedText(previous);
  const afterText = selectedText(next);
  const beforeImage = selectedImage(previous);
  const afterImage = selectedImage(next);
  switch (event.type) {
    case "app:identify": return !previous.identifiedApp && next.identifiedApp;
    case "canvas:focus": return previous.focusedRegion !== "canvas" && next.focusedRegion === "canvas";
    case "thumbnails:focus": return previous.focusedRegion !== "thumbnails" && next.focusedRegion === "thumbnails";
    case "slide:create": return next.slides.length === previous.slides.length + 1 && next.selectedSlideId !== previous.selectedSlideId;
    case "slide:select": return previous.selectedSlideId !== next.selectedSlideId && next.selectedSlideId === event.payload?.id;
    case "slide:delete": return previous.slides.some((item) => item.id === event.payload?.deletedSlideId) && !next.slides.some((item) => item.id === event.payload?.deletedSlideId) && next.slides.length === previous.slides.length - 1;
    case "slide:duplicate": return next.slides.length === previous.slides.length + 1 && next.selectedSlideId !== previous.selectedSlideId;
    case "slide:reorder": return !previous.reordered && next.reordered && next.slides[Number(event.payload?.toIndex) || 0]?.id === event.payload?.id;
    case "text:title": return beforeSlide?.title !== afterSlide?.title && afterSlide?.title === event.payload?.value;
    case "text:create": return afterSlide?.textElements.length === (beforeSlide?.textElements.length || 0) + 1;
    case "text:select": return previous.selectedTextId !== next.selectedTextId && next.selectedTextId === event.payload?.id;
    case "text:font-size": return beforeText?.fontSize !== afterText?.fontSize && afterText?.fontSize === event.payload?.size;
    case "text:font": return beforeText?.font !== afterText?.font && afterText?.font === event.payload?.font;
    case "text:style": return !beforeText?.bold && afterText?.bold && afterText.italic && afterText.underline;
    case "text:color": return beforeText?.color !== afterText?.color && afterText?.color === event.payload?.color;
    case "text:align": return beforeText?.align !== afterText?.align && afterText?.align === event.payload?.align;
    case "layout:change": return beforeSlide?.layout !== afterSlide?.layout && afterSlide?.layout === event.payload?.layout;
    case "background:change": return beforeSlide?.background !== afterSlide?.background && afterSlide?.background === event.payload?.color;
    case "theme:change": return previous.theme !== next.theme && next.theme === event.payload?.theme;
    case "image:insert": return afterSlide?.images.length === (beforeSlide?.images.length || 0) + 1;
    case "image:resize": return beforeImage?.scale !== afterImage?.scale && afterImage?.scale === event.payload?.scale;
    case "image:move": return (beforeImage?.x !== afterImage?.x || beforeImage?.y !== afterImage?.y) && afterImage?.x === event.payload?.x && afterImage?.y === event.payload?.y;
    case "shape:insert": return afterSlide?.shapes.length === (beforeSlide?.shapes.length || 0) + 1 && afterSlide.shapes.at(-1)?.kind === event.payload?.kind;
    case "textbox:insert": return afterSlide?.textElements.length === (beforeSlide?.textElements.length || 0) + 1 && afterSlide.textElements.at(-1)?.role === "textbox";
    case "line:insert": return afterSlide?.shapes.length === (beforeSlide?.shapes.length || 0) + 1 && afterSlide.shapes.at(-1)?.kind === event.payload?.kind;
    case "transition:change": return previous.transition !== next.transition && next.transition === event.payload?.transition;
    case "animation:add": return next.animations.length === previous.animations.length + 1;
    case "comment:add": return next.comments.length === previous.comments.length + 1;
    case "share:open": return !previous.shareOpen && next.shareOpen;
    case "presentation:start": return !previous.presenting && next.presenting;
    default: return false;
  }
};

export const practiceMatches = (lesson, event, previous, next) => {
  if (!lesson || event?.type !== lesson.practice.expectedAction) return false;
  const expectedPayload = lesson.practice.expectedPayload || {};
  const payloadMatches = Object.entries(expectedPayload).every(([key, value]) => event.payload?.[key] === value);
  return payloadMatches && presentationChangedForAction(previous, next, event);
};

const sanitizeText = (item, index) => ({ ...makeText(`text-${index + 1}`), ...item, id: typeof item?.id === "string" ? item.id : `text-${index + 1}` });
const sanitizeImage = (item, index) => ({ ...makeImage(`image-${index + 1}`), ...item, id: typeof item?.id === "string" ? item.id : `image-${index + 1}` });

const sanitizePresentation = (value, fallback) => {
  if (!value || !Array.isArray(value.slides)) return fallback;
  const slides = value.slides.filter((item) => item && typeof item.id === "string").slice(0, 50).map((slide) => ({
    ...makeSlide(1),
    ...slide,
    textElements: Array.isArray(slide.textElements) ? slide.textElements.slice(0, 50).map(sanitizeText) : [],
    images: Array.isArray(slide.images) ? slide.images.slice(0, 20).map(sanitizeImage) : [],
    shapes: Array.isArray(slide.shapes) ? slide.shapes.slice(0, 30).map((item, index) => ({ id: `shape-${index + 1}`, kind: "rectangle", x: 50, y: 25, ...item })) : []
  }));
  const selectedSlideId = slides.some((item) => item.id === value.selectedSlideId) ? value.selectedSlideId : slides[0]?.id || null;
  const slide = slides.find((item) => item.id === selectedSlideId);
  const maxSlideNumber = slides.reduce((maximum, item) => Math.max(maximum, Number(item.id.replace(/^slide-/, "")) || 0), 0);
  return {
    slides,
    selectedSlideId,
    selectedTextId: slide?.textElements.some((item) => item.id === value.selectedTextId) ? value.selectedTextId : null,
    selectedImageId: slide?.images.some((item) => item.id === value.selectedImageId) ? value.selectedImageId : null,
    focusedRegion: ["canvas", "thumbnails"].includes(value.focusedRegion) ? value.focusedRegion : null,
    identifiedApp: Boolean(value.identifiedApp),
    theme: typeof value.theme === "string" ? value.theme : null,
    transition: typeof value.transition === "string" ? value.transition : null,
    presenting: Boolean(value.presenting),
    shareOpen: Boolean(value.shareOpen),
    comments: Array.isArray(value.comments) ? value.comments.slice(0, 50).map((item, index) => ({ id: `comment-${index + 1}`, value: String(item?.value || "") })) : [],
    animations: Array.isArray(value.animations) ? value.animations.slice(0, 50).map((item, index) => ({ id: `animation-${index + 1}`, type: String(item?.type || "aparecer") })) : [],
    reordered: Boolean(value.reordered),
    nextSlideNumber: Math.max(maxSlideNumber + 1, Number(value.nextSlideNumber) || 1),
    nextElementNumber: Math.max(2, Number(value.nextElementNumber) || 2)
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

export const validateFinalChallenge = (state) => {
  const firstSlide = state.slides.find((item) => item.id === "slide-1");
  const allText = state.slides.flatMap((item) => item.textElements);
  return {
    "three-slides": state.slides.length >= 3,
    "first-title": Boolean(firstSlide?.title.trim()),
    "body-text": allText.some((item) => item.role === "body" && item.value.trim()),
    "bold-text": allText.some((item) => item.bold),
    image: state.slides.some((item) => item.images.length > 0),
    layout: state.slides.some((item) => item.layout !== "title"),
    reorder: state.reordered,
    theme: Boolean(state.theme),
    transition: Boolean(state.transition),
    present: state.presenting
  };
};

export const isFinalChallengeComplete = (state) => Object.values(validateFinalChallenge(state)).every(Boolean);

export const createFinalChallengeProgress = () => {
  const state = createPresentationState();
  return { state, goals: validateFinalChallenge(state), completed: false, completedAt: null };
};

export const createInitialCourseState = (lessons = googleSlidesLessons) => ({
  version: GOOGLE_SLIDES_COURSE_DATA_VERSION,
  view: "intro",
  currentLessonId: lessons[0]?.id || null,
  stage: "watch",
  lessons: Object.fromEntries(lessons.map((item) => [item.id, createLessonProgress(item.id)])),
  finalChallenge: createFinalChallengeProgress()
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
  const lessonProgress = Object.fromEntries(lessons.map((item) => [item.id, sanitizeLessonProgress(value.lessons?.[item.id], item)]));
  const firstIncompleteIndex = lessons.findIndex((item) => !lessonProgress[item.id].completed);
  const requestedIndex = lessons.findIndex((item) => item.id === value.currentLessonId);
  const allowedIndex = firstIncompleteIndex < 0 ? lessons.length - 1 : firstIncompleteIndex;
  const currentIndex = requestedIndex < 0 || requestedIndex > allowedIndex ? allowedIndex : requestedIndex;
  const currentLessonId = lessons[Math.max(0, currentIndex)]?.id || initial.currentLessonId;
  const current = lessonProgress[currentLessonId];
  let stage = ["watch", "question", "practice"].includes(value.stage) ? value.stage : "watch";
  if (stage === "question" && !current.watched) stage = "watch";
  if (stage === "practice" && !current.questionCompleted) stage = current.watched ? "question" : "watch";
  const challengeState = sanitizePresentation(value.finalChallenge?.state, initial.finalChallenge.state);
  const goals = validateFinalChallenge(challengeState);
  const finalChallenge = {
    state: challengeState,
    goals,
    completed: Object.values(goals).every(Boolean) && Boolean(value.finalChallenge?.completed),
    completedAt: typeof value.finalChallenge?.completedAt === "string" ? value.finalChallenge.completedAt : null
  };
  const allCompleted = firstIncompleteIndex < 0;
  let view = ["intro", "lesson", "challenge", "result"].includes(value.view) ? value.view : "intro";
  if ((view === "challenge" || view === "result") && !allCompleted) view = "lesson";
  if (view === "result" && !finalChallenge.completed) view = "challenge";
  return { version: GOOGLE_SLIDES_COURSE_DATA_VERSION, view, currentLessonId, stage, lessons: lessonProgress, finalChallenge };
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
  next.currentLessonId = lessonId;
  next.stage = "watch";
  next.view = "lesson";
  next.finalChallenge = createFinalChallengeProgress();
  return next;
};

export const updateFinalChallenge = (progress, event) => {
  const nextState = reducePresentation(progress.state, event);
  const goals = validateFinalChallenge(nextState);
  const completed = Object.values(goals).every(Boolean);
  return { state: nextState, goals, completed, completedAt: completed ? progress.completedAt || new Date().toISOString() : null };
};

export const courseStats = (state, lessons = googleSlidesLessons) => {
  const progress = lessons.map((item) => state.lessons[item.id]);
  const studentProgress = progress.filter((item) => !item.completedByTeacher);
  const questionAttempts = studentProgress.reduce((total, item) => total + item.questionAttempts, 0);
  const correctAnswers = studentProgress.filter((item) => item.questionCompletedByStudent).length;
  return {
    completedLessons: progress.filter((item) => item.completed).length,
    correctAnswers,
    questionAttempts,
    accuracy: questionAttempts ? Math.round((correctAnswers / questionAttempts) * 100) : 0,
    completedPractices: studentProgress.filter((item) => item.practiceCompletedByStudent).length,
    teacherCompleted: progress.filter((item) => item.completedByTeacher).length,
    finalChallengeCompleted: Boolean(state.finalChallenge?.completed)
  };
};

export const rebuildDemoState = (lesson, completedSteps) => {
  let state = createLessonPresentationState(lesson.id);
  for (const step of lesson.demo.type === "script" ? lesson.demo.steps.slice(0, completedSteps) : []) {
    if (step.effect) state = reducePresentation(state, step.effect);
  }
  return state;
};

export { googleSlidesFinalChallenge };

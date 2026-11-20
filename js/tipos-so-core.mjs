import { LESSONS, PHASES, TOTAL_CARDS } from "./tipos-so-data.mjs";

export const STORAGE_KEY = "central-tipos-so-v1";

export const createProgress = () => ({ version: 1, lessonsDone: 0, scores: [] });

// Aceita só progresso coerente; qualquer outra coisa recomeça do zero.
export function restoreProgress(raw) {
  try {
    const value = JSON.parse(raw);
    const lessonsDone = value?.lessonsDone;
    const scores = value?.scores;
    if (value?.version !== 1 || !Number.isInteger(lessonsDone) || lessonsDone < 0 || lessonsDone > LESSONS.length) return createProgress();
    if (!Array.isArray(scores) || scores.length > PHASES.length) return createProgress();
    if (scores.length && lessonsDone < LESSONS.length) return createProgress();
    if (!scores.every((score, index) => Number.isInteger(score) && score >= 0 && score <= PHASES[index].cards.length)) return createProgress();
    return { version: 1, lessonsDone, scores: [...scores] };
  } catch {
    return createProgress();
  }
}

export const isCorrect = (card, binId) => card.answer === binId;

// Próxima etapa a partir do progresso salvo.
export function nextStage(progress) {
  if (progress.lessonsDone < LESSONS.length) return { screen: "lesson", index: progress.lessonsDone };
  if (progress.scores.length < PHASES.length) return { screen: "phase", index: progress.scores.length };
  return { screen: "result" };
}

export const totalScore = (scores) => scores.reduce((sum, score) => sum + score, 0);

export function starsFor(score, total = TOTAL_CARDS) {
  const ratio = total ? score / total : 0;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}

export function shuffle(values, random = Math.random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { TYPE_INFO, LOGOS, LESSONS, PHASES, BONUS, TOTAL_CARDS } from "../js/tipos-so-data.mjs";
import { createProgress, restoreProgress, isCorrect, nextStage, totalScore, starsFor, shuffle } from "../js/tipos-so-core.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("aulas: cinco temas da matriz e uma única resposta certa por pergunta", () => {
  assert.deepEqual(LESSONS.map((lesson) => lesson.id), ["mono", "multi", "real", "emb", "combo"]);
  for (const lesson of LESSONS) {
    assert.equal(lesson.question.options.filter((option) => option.correct).length, 1, lesson.id);
    assert.ok(lesson.lead && lesson.points.length && lesson.question.explain, lesson.id);
  }
});

test("fases: cartas únicas, respostas válidas e todas as caixas usadas", () => {
  const ids = PHASES.flatMap((phase) => phase.cards.map((card) => card.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(TOTAL_CARDS, 30);
  assert.deepEqual(PHASES[PHASES.length - 1].bins, ["mono", "multi", "real", "emb"]);
  for (const phase of PHASES) {
    for (const bin of phase.bins) {
      assert.ok(TYPE_INFO[bin], bin);
      assert.ok(phase.cards.filter((card) => card.answer === bin).length >= 2, `${phase.id}: poucas cartas em ${bin}`);
    }
    for (const card of phase.cards) {
      assert.ok(phase.bins.includes(card.answer), card.id);
      assert.ok(card.why && (card.icon || card.logo) && card.name, card.id);
      assert.equal(isCorrect(card, card.answer), true);
      assert.equal(phase.bins.filter((bin) => isCorrect(card, bin)).length, 1, card.id);
    }
  }
});

test("logos: cartas usam logos locais, guardados no cache offline", () => {
  const worker = read("service-worker.js");
  const used = new Set(PHASES.flatMap((phase) => phase.cards.filter((card) => card.logo).map((card) => card.logo)));
  assert.ok(used.size >= 4);
  for (const name of used) {
    const logo = LOGOS[name];
    assert.ok(logo, name);
    assert.ok(existsSync(new URL(`../${logo.src.slice(2)}`, import.meta.url)), logo.src);
    assert.ok(worker.includes(`"${logo.src}"`), `cache: ${logo.src}`);
  }
  for (const card of PHASES.flatMap((phase) => phase.cards)) assert.ok(card.logo || card.icon, card.id);
});

test("questão especial do Chromebook: uma resposta certa e curiosidades", () => {
  assert.equal(BONUS.options.filter((option) => option.correct).length, 1);
  assert.equal(BONUS.options.find((option) => option.correct).text, "Multiusuário");
  assert.ok(BONUS.facts.length >= 1 && BONUS.wrong);
});

test("progresso: restauração aceita só dados coerentes", () => {
  assert.deepEqual(restoreProgress(null), createProgress());
  assert.deepEqual(restoreProgress("{quebrado"), createProgress());
  assert.deepEqual(restoreProgress('{"version":2,"lessonsDone":5,"scores":[]}'), createProgress());
  assert.deepEqual(restoreProgress('{"version":1,"lessonsDone":9,"scores":[]}'), createProgress());
  assert.deepEqual(restoreProgress('{"version":1,"lessonsDone":2,"scores":[3]}'), createProgress(), "fase sem aula concluída");
  assert.deepEqual(restoreProgress('{"version":1,"lessonsDone":5,"scores":[7]}'), createProgress(), "nota acima do total da fase");
  assert.deepEqual(restoreProgress('{"version":1,"lessonsDone":5,"scores":[6,8]}'), { version: 1, lessonsDone: 5, scores: [6, 8] });
});

test("próxima etapa, pontuação e estrelas", () => {
  assert.deepEqual(nextStage(createProgress()), { screen: "lesson", index: 0 });
  assert.deepEqual(nextStage({ lessonsDone: 3, scores: [] }), { screen: "lesson", index: 3 });
  assert.deepEqual(nextStage({ lessonsDone: 5, scores: [6] }), { screen: "phase", index: 1 });
  assert.deepEqual(nextStage({ lessonsDone: 5, scores: [6, 8, 8, 8] }), { screen: "result" });
  assert.equal(totalScore([6, 8, 8, 8]), 30);
  assert.equal(starsFor(30), 3);
  assert.equal(starsFor(27), 3);
  assert.equal(starsFor(21), 2);
  assert.equal(starsFor(10), 1);
});

test("embaralhar não altera o original e mantém as cartas", () => {
  const cards = PHASES[0].cards;
  const copy = shuffle(cards, () => 0.3);
  assert.notEqual(copy, cards);
  assert.deepEqual([...copy].sort((a, b) => a.id.localeCompare(b.id)), [...cards].sort((a, b) => a.id.localeCompare(b.id)));
});

test("integração: rota, cartão na página inicial, ciclo de vida e cache offline", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  const worker = read("service-worker.js");
  assert.match(html, /href="#\/tipos-de-so"/);
  assert.match(html, /Jogo 17/);
  assert.match(html, /data-screen="tipos-so"/);
  assert.match(html, /tipos-so\.css/);
  for (const call of ["mount", "enter", "leave"]) assert.match(app, new RegExp(`tiposSoGame\\.${call}`));
  for (const path of ["./tipos-so.css", "./js/tipos-so.mjs", "./js/tipos-so-core.mjs", "./js/tipos-so-data.mjs"]) assert.ok(worker.includes(path), path);
  const thumbs = [...html.matchAll(/\.\/assets\/thumbs\/([\w-]+)\.jpg/g)].map((match) => match[1]);
  assert.equal(thumbs.length, 18);
  for (const name of thumbs) {
    assert.ok(existsSync(new URL(`../assets/thumbs/${name}.jpg`, import.meta.url)), name);
    assert.ok(worker.includes(`"${name}"`), `cache: ${name}`);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { TYPE_INFO, LESSONS, PHASES } from "../js/iot-data.mjs";
import { createProgress, restoreProgress, nextStage, isCorrect, countCards } from "../js/lesson-game-core.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const scenes = read("js/iot.mjs");

test("aulas: cinco cenas com animação e uma resposta certa por pergunta", () => {
  assert.equal(LESSONS.length, 5);
  for (const lesson of LESSONS) {
    assert.equal(lesson.question.options.filter((option) => option.correct).length, 1, lesson.id);
    assert.ok(lesson.color && lesson.icon && lesson.lead && lesson.points.length, lesson.id);
    assert.ok(scenes.includes(`"${lesson.id}": \``), `cena: ${lesson.id}`);
    assert.match(scenes, new RegExp(`"${lesson.id}": \\[`), `linha do tempo: ${lesson.id}`);
  }
});

test("fases: cartas únicas, respostas válidas e todas as caixas usadas", () => {
  const ids = PHASES.flatMap((phase) => phase.cards.map((card) => card.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(countCards(PHASES), 28);
  for (const phase of PHASES) {
    for (const bin of phase.bins) {
      assert.ok(TYPE_INFO[bin], bin);
      assert.ok(phase.cards.filter((card) => card.answer === bin).length >= 2, `${phase.id}: poucas cartas em ${bin}`);
    }
    for (const card of phase.cards) {
      assert.ok(card.icon && card.name && card.why, card.id);
      assert.equal(phase.bins.filter((bin) => isCorrect(card, bin)).length, 1, card.id);
    }
  }
});

test("aula na TV: o jogo abre direto, sem exigir a aula", () => {
  assert.deepEqual(nextStage(createProgress(), LESSONS, PHASES, false), { screen: "phase", index: 0 });
  assert.deepEqual(nextStage({ lessonsDone: 0, scores: [6, 8] }, LESSONS, PHASES, false), { screen: "phase", index: 2 });
  assert.deepEqual(restoreProgress('{"version":1,"lessonsDone":0,"scores":[6]}', LESSONS, PHASES, false), { version: 1, lessonsDone: 0, scores: [6] });
  assert.deepEqual(restoreProgress('{"version":1,"lessonsDone":0,"scores":[6]}', LESSONS, PHASES, true), createProgress(), "Tipos de SO continua exigindo a aula");
  assert.match(scenes, /lessonsRequired: false/);
});

test("integração: rota, cartão Jogo 18, filtro Redes e cache offline", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  const worker = read("service-worker.js");
  assert.match(html, /href="#\/internet-das-coisas"/);
  assert.match(html, /Jogo 18 · Redes/);
  assert.match(html, /data-filter="redes"/);
  assert.match(html, /data-screen="iot"/);
  assert.match(html, /iot\.css/);
  for (const call of ["mount", "enter", "leave"]) assert.match(app, new RegExp(`iotGame\\.${call}`));
  for (const path of ["./iot.css", "./js/iot.mjs", "./js/iot-data.mjs", "./js/lesson-game.mjs", "./js/lesson-game-core.mjs"]) {
    assert.ok(worker.includes(`"${path}"`), path);
    assert.ok(existsSync(new URL(`../${path.slice(2)}`, import.meta.url)), path);
  }
  assert.ok(existsSync(new URL("../assets/thumbs/iot.jpg", import.meta.url)));
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { desafioCategories, desafioFinalQuestions, desafioQuestions } from "../js/desafio-ti-data.mjs";
import {
  DESAFIO_STATE_VERSION,
  POINT_VALUES,
  buildMatchBoard,
  getNextTeamId,
  isBoardComplete,
  rankTeams,
  sanitizeStoredState,
  scoreAttempt,
  scoreFinalRound,
  selectMatchCategories,
  shuffleValues
} from "../js/desafio-ti-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sequenceRandom = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};
const teams = [
  { id: "team-1", name: "Byte", score: 800, color: "#58d6ff" },
  { id: "team-2", name: "Firewall", score: 600, color: "#fb7185" },
  { id: "team-3", name: "Linux", score: 800, color: "#4ade80" }
];

test("banco possui 150 perguntas equilibradas e finais suficientes", () => {
  assert.equal(desafioCategories.length, 10);
  assert.equal(desafioQuestions.length, 150);
  assert.ok(desafioFinalQuestions.length >= 10);
  assert.equal(new Set(desafioQuestions.map((question) => question.id)).size, 150);
  for (const category of desafioCategories) {
    const categoryQuestions = desafioQuestions.filter((question) => question.categoryId === category.id);
    assert.equal(categoryQuestions.length, 15, `${category.id} deve possuir 15 perguntas`);
    for (const value of POINT_VALUES) {
      assert.equal(categoryQuestions.filter((question) => question.value === value).length, 3, `${category.id} por ${value}`);
    }
  }
});

test("todas as perguntas têm conteúdo completo, IDs válidos e valores permitidos", () => {
  for (const question of desafioQuestions) {
    assert.match(question.id, /^[a-z0-9-]+$/);
    assert.ok(question.prompt.length >= 24, `${question.id} com enunciado curto`);
    assert.ok(question.answer.length >= 2, `${question.id} sem resposta`);
    assert.ok(question.explanation.length >= 24, `${question.id} sem explicação suficiente`);
    assert.ok(POINT_VALUES.includes(question.value));
    assert.ok(desafioCategories.some((category) => category.id === question.categoryId));
  }
});

test("Redes Básicas não inclui os conceitos avançados proibidos", () => {
  const networkText = desafioQuestions
    .filter((question) => question.categoryId === "redes-basicas")
    .map((question) => `${question.prompt} ${question.answer} ${question.explanation}`)
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  for (const forbidden of ["gateway", "ipv4", "ipv6", "máscara de sub-rede", "endereço mac", "dhcp", "nat", "tcp", "udp", "terminal"]) {
    assert.ok(!networkText.includes(forbidden), `Redes Básicas contém ${forbidden}`);
  }
});

test("seleção sempre inclui os três grupos prioritários e não repete categoria", () => {
  for (let seed = 0; seed < 25; seed += 1) {
    const selected = selectMatchCategories(desafioCategories, sequenceRandom(seed / 25, .7, .2, .9));
    const ids = selected.map((category) => category.id);
    assert.equal(ids.length, 6);
    assert.equal(new Set(ids).size, 6);
    assert.ok(ids.includes("hardware"));
    assert.ok(ids.some((id) => ["software", "perifericos"].includes(id)));
    assert.ok(ids.some((id) => ["seguranca", "malware", "firewall-vpn"].includes(id)));
  }
});

test("tabuleiro contém 30 perguntas sem repetição e uma ou duas surpresas", () => {
  const board = buildMatchBoard({ categories: desafioCategories, questions: desafioQuestions, random: sequenceRandom(.1, .8, .4, .6, .2) });
  assert.equal(board.categories.length, 6);
  assert.equal(board.cells.length, 30);
  assert.equal(new Set(board.cells.map((cell) => cell.questionId)).size, 30);
  assert.ok([1, 2].includes(board.cells.filter((cell) => cell.isDouble).length));
  for (const category of board.categories) {
    assert.deepEqual(board.cells.filter((cell) => cell.categoryId === category.id).map((cell) => cell.value).sort((a, b) => a - b), POINT_VALUES);
  }
});

test("embaralhamento aceita aleatoriedade controlada sem alterar a origem", () => {
  const source = [1, 2, 3, 4, 5];
  const shuffled = shuffleValues(source, () => 0);
  assert.deepEqual(source, [1, 2, 3, 4, 5]);
  assert.deepEqual(new Set(shuffled), new Set(source));
  assert.notDeepEqual(shuffled, source);
});

test("acerto soma, erro subtrai e surpresa dobra somente o acerto", () => {
  const correct = scoreAttempt({ teams, teamId: "team-1", correct: true, value: 400 });
  assert.equal(correct.delta, 400);
  assert.equal(correct.teams[0].score, 1200);
  const wrong = scoreAttempt({ teams, teamId: "team-1", correct: false, value: 400 });
  assert.equal(wrong.delta, -400);
  assert.equal(wrong.teams[0].score, 400);
  const doubleCorrect = scoreAttempt({ teams, teamId: "team-2", correct: true, value: 300, isDouble: true });
  assert.equal(doubleCorrect.delta, 600);
  assert.equal(doubleCorrect.teams[1].score, 1200);
  const doubleWrong = scoreAttempt({ teams, teamId: "team-2", correct: false, value: 300, isDouble: true });
  assert.equal(doubleWrong.delta, -300);
  assert.equal(doubleWrong.teams[1].score, 300);
});

test("roubo errado pode gerar pontuação negativa e o ciclo usa a equipe que escolheu", () => {
  const stealingTeam = [{ id: "team-1", name: "Byte", score: 0, color: "#58d6ff" }, ...teams.slice(1)];
  const result = scoreAttempt({ teams: stealingTeam, teamId: "team-1", correct: false, value: 500 });
  assert.equal(result.teams[0].score, -500);
  assert.equal(getNextTeamId(teams, "team-1"), "team-2");
  assert.equal(getNextTeamId(teams, "team-3"), "team-1");
});

test("ranking preserva empates e identifica campeões compartilhados", () => {
  const ranking = rankTeams(teams);
  assert.equal(ranking[0].rank, 1);
  assert.equal(ranking[1].rank, 1);
  assert.equal(ranking[2].rank, 3);
  assert.equal(ranking.filter((team) => team.rank === 1).length, 2);
});

test("desafio final soma ou subtrai 500 e exige resultado de todas as equipes", () => {
  const finalTeams = scoreFinalRound(teams, {
    "team-1": "correct",
    "team-2": "wrong",
    "team-3": "correct"
  });
  assert.equal(finalTeams[0].score, 1300);
  assert.equal(finalTeams[1].score, 100);
  assert.equal(finalTeams[2].score, 1300);
  assert.throws(() => scoreFinalRound(teams, { "team-1": "correct" }), /Resultado final ausente/);
});

test("tabuleiro só termina quando as 30 casas são usadas", () => {
  const board = buildMatchBoard({ categories: desafioCategories, questions: desafioQuestions, random: () => .4 });
  assert.equal(isBoardComplete(board.cells), false);
  assert.equal(isBoardComplete(board.cells.map((cell) => ({ ...cell, status: "used" }))), true);
});

test("estado restaurado é validado e cronômetro sempre volta pausado", () => {
  const board = buildMatchBoard({ categories: desafioCategories, questions: desafioQuestions, random: () => .4 });
  const stored = {
    version: DESAFIO_STATE_VERSION,
    phase: "board",
    teams,
    currentTeamId: "team-1",
    categoryIds: board.categories.map((category) => category.id),
    cells: board.cells,
    settings: { timerDuration: 30, soundEnabled: true },
    timer: { duration: 30, remaining: 17, status: "running" },
    active: null,
    final: null
  };
  const restored = sanitizeStoredState(stored);
  assert.equal(restored.timer.status, "paused");
  assert.equal(restored.timer.remaining, 17);
  assert.equal(sanitizeStoredState({ ...stored, version: 99 }), null);
  assert.equal(sanitizeStoredState({ ...stored, teams: [teams[0]] }), null);
  assert.equal(sanitizeStoredState({ ...stored, currentTeamId: "missing" }), null);
});

test("rota, folha de estilo, ciclo de vida e card do Jogo 07 estão registrados", async () => {
  const [html, app, css] = await Promise.all([
    readFile(resolve(projectRoot, "index.html"), "utf8"),
    readFile(resolve(projectRoot, "js/app.js"), "utf8"),
    readFile(resolve(projectRoot, "desafio-ti-game.css"), "utf8")
  ]);
  assert.match(html, /Jogo 07/);
  assert.match(html, /#\/desafio-ti/);
  assert.match(html, /desafio-ti-game\.css/);
  assert.match(app, /desafioTiGame\.enter\(\)/);
  assert.match(app, /desafioTiGame\.leave\(\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /100dvh/);
});

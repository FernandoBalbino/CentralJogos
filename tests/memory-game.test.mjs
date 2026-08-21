import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { memoryCategories, memoryGamePairs } from "../js/memory-game-data.mjs";
import {
  advanceTeamIndex,
  buildMemoryDeck,
  getGridDimensions,
  getLeaders,
  isMatchingPair,
  rankTeams,
  selectRoundPairs,
  shuffleValues
} from "../js/memory-game-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sequenceRandom = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test("banco possui 69 pares válidos em oito categorias", async () => {
  assert.equal(memoryGamePairs.length, 69);
  assert.equal(memoryCategories.length, 8);
  assert.equal(new Set(memoryGamePairs.map((pair) => pair.id)).size, 69);
  assert.deepEqual(
    Object.fromEntries(memoryCategories.map((category) => [category.id, memoryGamePairs.filter((pair) => pair.category === category.id).length])),
    { hardware: 11, software: 8, peripherals: 15, networks: 15, topologies: 5, security: 2, malware: 8, wireless: 5 }
  );
  assert.ok(!memoryGamePairs.some((pair) => ["network-tcp", "network-udp"].includes(pair.id)));

  const sprite = await readFile(resolve(projectRoot, "assets/memory-game/tech-illustrations.svg"), "utf8");
  for (const pair of memoryGamePairs) {
    assert.match(pair.id, /^[a-z0-9-]+$/);
    assert.ok(pair.name.length > 1, `${pair.id} sem nome`);
    assert.ok(pair.definition.length >= 45 && pair.definition.length <= 130, `${pair.id} com definição fora do tamanho esperado`);
    assert.ok(pair.alt.length >= 12, `${pair.id} sem texto alternativo suficiente`);
    assert.ok(memoryCategories.some((category) => category.id === pair.category), `${pair.id} com categoria inválida`);
    assert.ok(!pair.definition.toLocaleLowerCase("pt-BR").includes(pair.name.toLocaleLowerCase("pt-BR")), `${pair.id} entrega o nome na definição`);
    if (pair.visual.type === "image") await access(resolve(projectRoot, pair.visual.src.replace(/^\.\//, "")));
    else assert.ok(sprite.includes(`id="${pair.visual.id}"`), `${pair.id} referencia símbolo ausente`);
  }
});

test("cada par produz exatamente uma imagem e uma definição", () => {
  const pairs = memoryGamePairs.slice(0, 12);
  const deck = buildMemoryDeck(pairs, () => 0.5);
  assert.equal(deck.length, 24);
  assert.equal(new Set(deck.map((card) => card.key)).size, 24);
  for (const pair of pairs) {
    const cards = deck.filter((card) => card.pairId === pair.id);
    assert.equal(cards.length, 2);
    assert.deepEqual(new Set(cards.map((card) => card.type)), new Set(["image", "definition"]));
    assert.equal(isMatchingPair(cards[0], cards[1]), true);
    assert.equal(isMatchingPair(cards[0], cards[0]), false);
  }
  assert.equal(isMatchingPair(deck[0], deck.find((card) => card.pairId !== deck[0].pairId)), false);
});

test("seleção prioriza conteúdo inédito e só recicla após esgotá-lo", () => {
  const hardwareIds = memoryGamePairs.filter((pair) => pair.category === "hardware").map((pair) => pair.id);
  const first = selectRoundPairs({
    items: memoryGamePairs,
    categoryIds: ["hardware"],
    pairCount: 8,
    usedIds: [],
    random: sequenceRandom(.1, .7, .3)
  });
  assert.equal(first.pairs.length, 8);
  assert.equal(first.recycledCount, 0);
  assert.equal(first.remainingFreshCount, 3);

  const second = selectRoundPairs({
    items: memoryGamePairs,
    categoryIds: ["hardware"],
    pairCount: 8,
    usedIds: first.usedIds,
    random: sequenceRandom(.2, .8, .4)
  });
  assert.equal(second.pairs.length, 8);
  assert.equal(second.recycledCount, 5);
  assert.deepEqual(new Set(second.pairs.slice(0, 3).map((pair) => pair.id)), new Set(hardwareIds.filter((id) => !first.usedIds.includes(id))));
});

test("Fisher–Yates preserva valores e aceita aleatoriedade controlada", () => {
  const values = [1, 2, 3, 4, 5];
  const result = shuffleValues(values, () => 0);
  assert.deepEqual(new Set(result), new Set(values));
  assert.notDeepEqual(result, values);
  assert.deepEqual(values, [1, 2, 3, 4, 5]);
});

test("turnos avançam em ciclo e o ranking preserva empates", () => {
  assert.equal(advanceTeamIndex(0, 3), 1);
  assert.equal(advanceTeamIndex(2, 3), 0);
  const teams = [
    { name: "Byte", score: 4 },
    { name: "Linux", score: 2 },
    { name: "Firewall", score: 4 }
  ];
  const ranked = rankTeams(teams);
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].rank, 1);
  assert.equal(ranked[2].rank, 3);
  assert.equal(getLeaders(teams).length, 2);
});

test("layouts pedidos usam 4x4, 5x4, 6x4 e 6x5", () => {
  assert.deepEqual(getGridDimensions(16), { columns: 4, rows: 4 });
  assert.deepEqual(getGridDimensions(20), { columns: 5, rows: 4 });
  assert.deepEqual(getGridDimensions(24), { columns: 6, rows: 4 });
  assert.deepEqual(getGridDimensions(30), { columns: 6, rows: 5 });
});

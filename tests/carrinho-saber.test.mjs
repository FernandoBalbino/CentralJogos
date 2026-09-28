import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { cartItems, cartPhases, CART_ASSETS } from "../js/carrinho-saber-data.mjs";
import { STATES, createSession, objectiveFor, isCorrect, createArena, beginPhase, startCountdown, nextPhase, captureItem, pauseGame, resumeGame, chooseWave, spawnWave, samplePositions, validPositions, safeIntervals, stepGame, serializeProgress, restoreProgress } from "../js/carrinho-saber-core.mjs";
const seeded = (seed = 7) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const arena = createArena(1366, 550);
const playing = (phaseIndex = 0) => ({ ...beginPhase({ ...createSession(seeded()), phaseIndex }, arena), status: STATES.PLAYING, spawnIn: 99 });

test("catálogo: 25 itens únicos, imagens locais e dez fases", () => {
  assert.equal(cartItems.length, 25); assert.equal(new Set(cartItems.map(item => item.id)).size, 25); assert.equal(cartPhases.length, 10);
  for (const path of CART_ASSETS) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
  const sw = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  for (const path of CART_ASSETS) assert.ok(sw.includes(path), `Cache: ${path}`);
});
test("respostas simples e múltiplas têm exatamente as capacidades esperadas", () => {
  const expected = [["mouse"], ["keyboard"], ["monitor"], ["ssd", "hd", "usb"], ["powerpoint", "slides"], ["excel", "sheets"], ["word", "writer"], ["microphone", "headset"], ["printer"]];
  expected.forEach((ids, i) => assert.deepEqual(cartItems.filter(item => isCorrect(item.id, cartPhases[i].objectives[0])).map(item => item.id).sort(), ids.sort()));
  for (const objective of cartPhases[9].objectives) assert.ok(cartItems.some(item => isCorrect(item.id, objective)));
  assert.equal(isCorrect("ram", cartPhases[3].objectives[0]), false);
});
test("erro não avança; tentativa preserva objetivo e reinicia introdução e contagem", () => {
  const state = playing(9), objective = objectiveFor(state).id;
  const wrong = cartItems.find(item => !isCorrect(item.id, objectiveFor(state))).id;
  const failed = captureItem(state, { id: "wrong", itemId: wrong });
  assert.equal(failed.status, STATES.WRONG); assert.equal(failed.completed.length, 0); assert.equal(failed.phaseIndex, 9);
  assert.equal(nextPhase(failed, arena), failed);
  const retry = beginPhase(failed, arena);
  assert.equal(retry.status, STATES.INTRO); assert.equal(objectiveFor(retry).id, objective); assert.equal(retry.objects.length, 0);
  const count = startCountdown(retry); assert.equal(count.status, STATES.COUNTDOWN);
  assert.equal(stepGame(count, 3.5, 0, arena).objects.length, 0);
  assert.equal(stepGame(count, 3.7, 0, arena, seeded()).status, STATES.PLAYING);
});
test("percurso das dez fases: captura única, explicação, avanço manual, conclusão e reset", () => {
  let state = beginPhase(createSession(seeded()), arena);
  for (let i = 0; i < 10; i++) {
    state = { ...state, status: STATES.PLAYING };
    const itemId = cartItems.find(item => isCorrect(item.id, objectiveFor(state))).id;
    state = captureItem(state, { id: `correct-${i}`, itemId });
    assert.equal(state.status, STATES.CORRECT); assert.equal(state.phaseIndex, i);
    assert.equal(captureItem(state, { id: "second", itemId }), state);
    assert.equal(nextPhase(state, arena), state);
    state = stepGame(state, 1, 0, arena);
    assert.equal(state.status, STATES.COMPLETE); assert.equal(state.completed.length, i + 1);
    state = nextPhase(state, arena);
    assert.equal(state.status, i === 9 ? STATES.VICTORY : STATES.INTRO);
  }
  const fresh = createSession(seeded(500)); assert.equal(fresh.completed.length, 0); assert.equal(fresh.phaseIndex, 0);
});
test("persistência retoma próxima fase e preserva sorteio, sem objetos ou relógios", () => {
  let state = captureItem(playing(), { id: "1", itemId: "mouse" });
  state.objects.push({ id: "falling" });
  const restored = restoreProgress(serializeProgress(state), seeded(1000));
  assert.equal(restored.phaseIndex, 1); assert.equal(restored.status, STATES.MENU); assert.deepEqual(restored.choices, state.choices); assert.equal(restored.objects.length, 0);
  assert.equal(restored.elapsed, 0); assert.equal(restored.player.velocity, 0);
  assert.equal(restoreProgress("bad json").completed.length, 0);
  assert.equal(restoreProgress({ version: 0 }).completed.length, 0);
  assert.equal(restoreProgress({ version: 1, choices: state.choices, completed: [{ objectiveId: "click", itemId: "ram" }] }).completed.length, 0);
});
test("objetivo final muda entre partidas e permanece durante tentativas", () => {
  const variants = new Set(Array.from({length:20}, (_,i) => createSession(() => i / 20).choices[9]));
  assert.equal(variants.size, 9);
  const state = playing(9); assert.equal(objectiveFor(beginPhase(state, arena)).id, objectiveFor(state).id);
});
test("pausa congela contagem, física, spawns e resultado", () => {
  for (const original of [startCountdown(beginPhase(createSession(), arena)), spawnWave(playing(), arena, seeded())]) {
    const paused = pauseGame(original);
    assert.equal(paused.status, STATES.PAUSED); assert.equal(stepGame(paused, 20, 1, arena), paused);
    assert.equal(resumeGame(paused).status, original.status);
    assert.equal(resumeGame(paused).player.velocity, 0);
  }
});
test("ondas têm dois itens diferentes, cadência correta e resposta até a terceira", () => {
  const random = seeded(); let state = playing(3); const counts = new Set();
  for (let wave = 0; wave < 2000; wave++) {
    const result = chooseWave(state, random);
    assert.equal(result.ids.length, 2); assert.notEqual(...result.ids);
    assert.ok(result.interval >= 4.5 && result.interval <= 5.5);
    const count = result.ids.filter(id => isCorrect(id, objectiveFor(state))).length; counts.add(count);
    assert.ok(result.withoutCorrect <= 2);
    if (state.withoutCorrect === 2) assert.ok(count > 0);
    state = { ...state, ...result };
  }
  assert.deepEqual([...counts].sort(), [0, 1, 2]);
});
test("posições seguras: separação, opção alcançável, rota de desvio e fallback", () => {
  const random = seeded();
  for (const [width,height] of [[300,280],[390,500],[768,650],[1024,530],[1366,550],[1920,850]]) {
    for (let phase = 0; phase < 10; phase++) {
      const field = createArena(width,height,phase), state = playing(phase), objective = objectiveFor(state);
      for (let wave = 0; wave < 30; wave++) {
        const {ids} = chooseWave(state,random), x = wave % 2 ? field.minX : field.maxX;
        const positions = samplePositions(ids,field,x,objective,random);
        assert.ok(validPositions(positions,ids,field,x,objective));
        assert.ok(safeIntervals(positions,field).some(([a,b])=>b-a>=18));
        assert.ok(validPositions(samplePositions(ids,field,x,objective,()=>.5),ids,field,x,objective));
      }
    }
  }
});
test("spawn escalonado e queda de aproximadamente sete a seis segundos", () => {
  for (const phase of [0,9]) {
    const field = createArena(1366,550,phase), state = spawnWave(playing(phase),field,seeded());
    assert.equal(state.objects.length,2); assert.equal(state.objects[0].delay,0);
    assert.ok(state.objects[1].delay>=.1 && state.objects[1].delay<=.3);
    for (const object of state.objects) assert.ok(Math.abs(field.catchY/object.speed-field.fallTime)<.15);
  }
});
test("movimento independe da taxa de quadros e desacelera sem teclas", () => {
  const start = playing(); const run = frames => { let state=start; for (let i=0;i<frames;i++) state=stepGame(state,.2/frames,1,arena); return state; };
  assert.ok(Math.abs(run(6).player.x-run(24).player.x)<8);
  let moving = run(12); assert.ok(moving.player.x>start.player.x);
  const stopped = stepGame(moving,.4,0,arena); assert.equal(stopped.player.velocity,0);
  assert.equal(stepGame(stopped,1,0,arena).player.x,stopped.player.x);
});
test("colisão entre quadros ocorre na abertura e a primeira captura bloqueia a segunda", () => {
  const state = playing(); state.objects = [{ id:"a",itemId:"mouse",x:state.player.x,y:arena.catchY-arena.itemHeight-5,speed:1200,delay:0 },{ id:"b",itemId:"ram",x:state.player.x,y:arena.catchY-arena.itemHeight-5,speed:1200,delay:0 }];
  const result = stepGame(state,.05,0,arena);
  assert.equal(result.result.itemId,"mouse"); assert.equal(result.completed.length,1);
  const missed = playing(); missed.objects=[{...state.objects[0],x:arena.minX}];
  assert.equal(stepGame(missed,1,0,arena).status,STATES.PLAYING);
  const below = playing(); below.objects=[{...state.objects[0],y:arena.catchY+5}];
  assert.equal(stepGame(below,.1,0,arena).status,STATES.PLAYING);
});

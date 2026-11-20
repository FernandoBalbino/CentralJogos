import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { CUSTOMERS, PHASES, CUSTOMER_BY_ID } from "../js/balcao-informatica-data.mjs";
import { PRODUCTS, catalogForPhase } from "../js/balcao-informatica-products.mjs";
import { createSession, startPhase, tickQueue, queueCustomers, currentCustomer, selectProduct, addToBag, removeFromBag, submitOrder, retryOrder, nextCustomer, nextPhase, replayPhase, statistics, starsForErrors, scoreOrder, sameProducts, pauseSession, resumeSession, restoreSession, serializeSession } from "../js/balcao-informatica-core.mjs";
import { ProductGesture } from "../js/balcao-informatica-interactions.mjs";
import { dialogue } from "../js/balcao-informatica-renderer.mjs";
const initial = () => ({ ...tickQueue(startPhase(createSession(() => .4)), 1), status: "shopping" });
const solve = state => submitOrder({ ...state, status: "shopping", bag: [...currentCustomer(state).products].reverse() });

test("catálogo local: 17 produtos e 100 pedidos distintos nas cinco fases", async () => {
  assert.equal(PRODUCTS.length, 17); assert.equal(new Set(PRODUCTS.map(p => p.id)).size, 17);
  assert.equal(CUSTOMERS.length, 100); assert.equal(new Set(CUSTOMERS.map(c => c.id)).size, 100); assert.equal(new Set(CUSTOMERS.map(c => c.speech)).size, 100);
  assert.deepEqual(PHASES.map((p, i) => CUSTOMERS.filter(c => c.phase === i).length), [15,15,20,20,30]);
  for (const p of PRODUCTS) { assert.ok(p.name && p.knowledge && p.alt); await access(new URL(`../${p.image}`, import.meta.url)); }
  for (const c of CUSTOMERS) {
    assert.ok(c.name && c.profile && c.speech.length > 30 && c.explanation);
    assert.equal(new Set(c.products).size, c.products.length);
    assert.ok(c.products.every(id => catalogForPhase(c.phase).some(p => p.id === id)));
    assert.ok(c.phase === 4 ? [2,3].includes(c.products.length) : c.products.length === 1);
  }
  assert.deepEqual(PHASES.map((_, i) => catalogForPhase(i).length), [7,10,16,17,17]);
});
test("embaralha sem repetição, preserva dificuldade e não altera o banco", () => {
  const before = JSON.stringify(CUSTOMERS); const signatures = new Set();
  for (let seed = 1; seed < 50; seed++) {
    let n = seed; const s = createSession(() => (n = n * 16807 % 2147483647) / 2147483647);
    signatures.add(s.orders.flat().join(",")); assert.equal(new Set(s.orders.flat()).size, 100);
    for (const order of s.orders) order.forEach((id, i) => { if (i) assert.ok(CUSTOMER_BY_ID[order[i - 1]].difficulty <= CUSTOMER_BY_ID[id].difficulty); });
  }
  assert.ok(signatures.size > 40); assert.equal(JSON.stringify(CUSTOMERS), before);
});
test("seleção é reversível; sacola impede duplicatas, comporta três itens e remove", () => {
  let s = initial(); const clean = JSON.stringify(s); const selected = selectProduct(s, "mouse");
  assert.equal(selected.selected, "mouse"); assert.equal(selectProduct(selected, "mouse").selected, null); assert.equal(JSON.stringify(s), clean);
  s = addToBag(selected).state; assert.deepEqual(s.bag, ["mouse"]); assert.equal(s.selected, null);
  assert.equal(addToBag(s, "mouse").state, s); assert.match(addToBag(s, "mouse").message, /já está/);
  s = addToBag(addToBag(s, "keyboard").state, "monitor").state;
  assert.equal(addToBag(s, "webcam").state, s); assert.deepEqual(removeFromBag(s, "keyboard").bag, ["mouse", "monitor"]);
  assert.equal(addToBag(s, "ram").state, s); assert.equal(submitOrder(initial()).status, "shopping");
});
test("erro só após entrega; tentativa mantém pedido e sacola sem corrigir automaticamente", () => {
  let s = initial(); const c = currentCustomer(s), wrong = catalogForPhase(0).find(p => !c.products.includes(p.id)).id;
  s = addToBag(s, wrong).state; assert.equal(s.status, "shopping");
  assert.doesNotMatch(dialogue(s), /O cliente precisava|PEDIDO CORRETO/);
  s = submitOrder(s); assert.equal(s.status, "wrong"); assert.equal(s.errors, 1); assert.equal(s.results.length, 0);
  assert.match(dialogue(s), /O cliente precisava/); assert.equal(submitOrder(s), s);
  assert.equal(addToBag(s, c.products[0]).state, s);
  const retry = retryOrder(s); assert.equal(currentCustomer(retry).id, c.id); assert.deepEqual(retry.bag, [wrong]); assert.equal(retry.status, "shopping");
  const correct = solve({ ...retry, bag: [] }); assert.equal(correct.status, "correct"); assert.equal(statistics(correct.results).points, 100);
  assert.equal(submitOrder(correct), correct); assert.equal(statistics(correct.results).retried, 1);
});
test("valida conjuntos exatos: ordem livre, extras, faltantes e duplicatas incorretos", () => {
  assert.equal(sameProducts(["webcam", "headset"], ["headset", "webcam"]), true);
  assert.equal(sameProducts(["webcam"], ["headset", "webcam"]), false);
  assert.equal(sameProducts(["webcam", "headset", "mouse"], ["headset", "webcam"]), false);
  assert.equal(sameProducts(["webcam", "webcam"], ["webcam", "headset"]), false);
  assert.equal(sameProducts(["mouse", "monitor", "keyboard"], ["keyboard", "mouse", "monitor"]), true);
});
test("estrelas, pontos e sequências dependem das tentativas, sem bônus duplicado", () => {
  assert.deepEqual([0,1,2,6].map(starsForErrors), [3,2,1,1]); assert.equal(scoreOrder(3,0), 450); assert.equal(scoreOrder(2,1), 200);
  const ids = createSession().orders[0];
  const stats = statistics([0,0,1,0,0,0].map((errors,i) => ({id:ids[i],errors})));
  assert.equal(stats.attended, 6); assert.equal(stats.first, 5); assert.equal(stats.best, 3); assert.equal(stats.streak, 3); assert.equal(stats.points, 850); assert.equal(stats.accuracy, 83);
  assert.match(stats.medal, /destaque/); assert.match(statistics([{id:ids[0],errors:0}]).medal, /Especialista/); assert.match(statistics([{id:ids[0],errors:2}]).medal, /Aprendiz/);
});
test("fila gradual com até quatro esperando; pausa congela chegadas", () => {
  let s = startPhase(createSession()); assert.equal(s.arrived, 0);
  s = tickQueue(s, .5); assert.equal(s.status, "opening"); s = tickQueue(s, .5); assert.equal(s.status, "greeting");
  for(let i=0;i<100;i++) s = tickQueue(s, 1);
  assert.equal(queueCustomers(s).length, 4); assert.equal(s.arrived, 5); assert.equal(s.cursor, 0);
  const paused = pauseSession(s); assert.equal(tickQueue(paused,5), paused); assert.deepEqual(resumeSession(paused), {...s, selected:null});
  const next = nextCustomer(solve(s)); assert.equal(next.status, "greeting"); assert.equal(next.cursor, 1); assert.equal(queueCustomers(next).length,3);
});
test("campanha completa, retomada em cada atendimento, fases e replay sem inflação", () => {
  let s = createSession(() => .5); s = addToBag(selectProduct(s,"mouse")).state; s = submitOrder(s);
  assert.equal(s.status,"trained"); assert.equal(s.results.length,0); s = startPhase(s);
  for(let phase=0;phase<5;phase++) {
    for(let n=0;n<PHASES[phase].count;n++) {
      if(s.status === "opening") s = tickQueue(s,1);
      assert.ok(restoreSession(serializeSession(s)), `restore before ${phase}/${n}`);
      s = solve(s); assert.equal(s.status,"correct");
      assert.deepEqual(restoreSession(serializeSession(s)), s);
      s = nextCustomer(s);
    }
    assert.equal(s.status,"summary"); assert.ok(restoreSession(serializeSession(s)));
    if(phase<4) s = nextPhase(s);
  }
  const stats = statistics(s.results); assert.equal(stats.attended,100); assert.equal(stats.first,100); assert.equal(stats.best,100); assert.equal(stats.points,21750);
  assert.equal(nextPhase(s),s);
  const replay = replayPhase(s,()=>.2); assert.equal(replay.results.length,70); assert.equal(replay.phase,4); assert.equal(replay.cursor,0); assert.ok(restoreSession(serializeSession(replay)));
});
test("retomada mantém sacola/tentativas e recusa estados inválidos", () => {
  const s = initial(); s.bag=["mouse"]; const paused=pauseSession(s);
  assert.deepEqual(restoreSession(serializeSession(paused)),paused);
  assert.equal(restoreSession("garbage"),null);
  const invalid = [ {version:99}, {phase:8}, {cursor:50}, {errors:-1}, {bag:["missing"]}, {bag:["mouse","mouse"]}, {results:[{id:"p1-01",errors:0}]}, {arrived:99}, {status:"paused",resumeStatus:"unknown"}, {elapsed:-1}, {status:"summary"} ];
  for(const patch of invalid) assert.equal(restoreSession(JSON.stringify({...s,...patch})),null,JSON.stringify(patch));
  const badOrder=structuredClone(s); badOrder.orders[0][0]=badOrder.orders[0][1]; assert.equal(restoreSession(JSON.stringify(badOrder)),null);
});
test("clique e arraste usam a mesma inclusão; cancelamento e gesto curto não adicionam", () => {
  const gesture = new ProductGesture(), s=initial();
  gesture.start("mouse",1,10,10); gesture.move(1,12,12); assert.equal(gesture.finish(1,true),null); assert.equal(gesture.consumeClick("mouse"),false);
  gesture.start("mouse",2,10,10); gesture.move(2,60,50); const id=gesture.finish(2,true);
  assert.equal(id,"mouse"); assert.equal(gesture.consumeClick("mouse"),true); assert.equal(gesture.consumeClick("mouse"),false);
  assert.deepEqual(addToBag(s,id).state.bag,addToBag(selectProduct(s,"mouse")).state.bag);
  for(const cancelled of [false,true]) { gesture.start("keyboard",3,0,0); gesture.move(3,50,50); assert.equal(gesture.finish(3,false,cancelled),null); }
  gesture.start("keyboard",4,0,0); gesture.move(4,50,50); assert.equal(gesture.finish(4,true,true),null);
  gesture.start("keyboard",5,0,0); gesture.cancel(); assert.equal(gesture.finish(5,true),null);
});
test("integração: rota, ciclo de vida, precache e imagens dos 17 produtos", async () => {
  const read = file => readFile(new URL(`../${file}`,import.meta.url),"utf8");
  const [html, app, sw, css] = await Promise.all(["index.html","js/app.js","service-worker.js","balcao-informatica.css"].map(read));
  assert.match(html,/#\/balcao-da-informatica/); assert.match(html,/Jogo 16/); assert.match(app,/balcaoGame\.mount/); assert.match(app,/balcaoGame\.enter/); assert.match(app,/balcaoGame\.leave/);
  for (const suffix of ["","-core","-data","-products","-renderer","-interactions"]) assert.ok(sw.includes(`./js/balcao-informatica${suffix}.mjs`));
  for(const p of PRODUCTS) assert.ok(sw.includes(p.image),p.image);
  assert.match(sw,/central-jogos-offline-v35/); assert.match(css,/prefers-reduced-motion/); assert.match(css,/focus-visible/);
});

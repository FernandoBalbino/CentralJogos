// Verificação opcional de navegador. Playwright não é dependência do jogo.
// BALCAO_PLAYWRIGHT_PATH pode apontar para o index.mjs de uma instalação existente.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CUSTOMER_BY_ID } from "../js/balcao-informatica-data.mjs";
import { STORAGE_KEY, createSession, startPhase, tickQueue, submitOrder, nextCustomer, nextPhase, currentCustomer, serializeSession } from "../js/balcao-informatica-core.mjs";
const { chromium } = await import(process.env.BALCAO_PLAYWRIGHT_PATH ? pathToFileURL(resolve(process.env.BALCAO_PLAYWRIGHT_PATH)).href : "playwright");
const base = process.argv[2] || "http://127.0.0.1:4173/";
const output = resolve("qa-evidence"); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BALCAO_BROWSER || "msedge", headless: true });
const context = await browser.newContext({ viewport: { width:1366, height:768 }, reducedMotion:"reduce" });
const page = await context.newPage(), errors = [], report = { checks:[], screenshots:[] };
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if(message.type()==="error") errors.push(`${message.text()} ${message.location().url || ""}`); });
const check = name => { report.checks.push(name); console.log(`✓ ${name}`); };
const action = name => page.locator(`[data-action="${name}"]`).click();
const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
const choose = async id => { await page.locator(`[data-focus="product-${id}"]`).click(); await action("add"); };
const restoreFixture = async fixture => {
  // Saia antes de instalar a fixture: o jogo salva seu estado ao sair da página.
  await page.locator('.bi-toolbar a').click();
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:STORAGE_KEY,value:serializeSession(fixture)});
  await page.locator('.balcao-home-card a').click();await action("continue");
};
const screenshot = async name => { await page.screenshot({path:resolve(output,`${name}.png`),fullPage:true}); report.screenshots.push(`${name}.png`); };
const dimensions = async () => {
  const d=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight}));
  assert.ok(d.scroll<=d.viewport,JSON.stringify(d));return d;
};
function phaseFixture(phase) {
  let s=startPhase(createSession(()=>.4));
  while(s.phase<phase) {
    if(s.status==="opening") s=tickQueue(s,1);
    s=submitOrder({...s,status:"shopping",bag:[...currentCustomer(s).products]});s=nextCustomer(s);
    if(s.status==="summary")s=nextPhase(s);
  }
  for(let i=0;i<21;i++)s=tickQueue(s,1);
  return s;
}
try {
  await page.goto(`${base}#/balcao-da-informatica`);
  await page.locator('[data-action="new"]').waitFor();
  await page.waitForFunction(()=>document.documentElement.dataset.offlineState==="ready");
  await page.locator('[data-offline-label]').filter({hasText:"Disponível offline"}).waitFor();
  await screenshot("balcao-menu-1366");await dimensions();
  await action("new");
  const product=page.locator('[data-focus="product-mouse"]'); await product.focus();await page.keyboard.press("Enter");
  assert.equal((await state()).selected,null); // seleção é transitória, não é persistida
  await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),"add");
  await page.keyboard.press("Space");assert.deepEqual((await state()).bag,["mouse"]);
  await action("deliver");assert.equal((await state()).results.length,0);await action("open");await action("serve");check("tutorial por teclado, sem pontuação");
  let s=await state();let answer=CUSTOMER_BY_ID[s.orders[s.phase][s.cursor]].products;
  const wrong=["mouse","keyboard","monitor"].find(id=>!answer.includes(id));await choose(wrong);
  assert.equal(await page.locator(".bi-comparison").count(),0);await action("deliver");
  await page.locator(".is-wrong").waitFor();assert.equal((await state()).errors,1);await action("retry");assert.deepEqual((await state()).bag,[wrong]);
  await page.locator(`[data-action="remove"][data-product="${wrong}"]`).click();
  await page.locator(`[data-focus="product-${answer[0]}"]`).scrollIntoViewIfNeeded();
  const source=await page.locator(`[data-focus="product-${answer[0]}"]`).boundingBox(),target=await page.locator("[data-dropzone]").boundingBox();
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});await page.mouse.up();
  assert.deepEqual((await state()).bag,answer);await action("deliver");assert.equal((await state()).results[0].errors,1);check("erro sem resposta prévia, retry e arraste real sem duplicata");
  await screenshot("balcao-feedback-1366");await action("next");await action("serve");
  await choose("mouse");await page.reload();await action("continue");assert.deepEqual((await state()).bag,["mouse"]);await page.locator('[data-action="remove"]').click();check("recarga preserva sacola e andamento");
  await action("pause");assert.equal((await state()).status,"paused");await action("resume");
  await action("fullscreen");assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true);await action("fullscreen");check("pausa, retomada e tela cheia");
  // Termina a fase inicial usando os mesmos botões de um aluno.
  for(let n=1;n<15;n++) {
    s=await state();answer=CUSTOMER_BY_ID[s.orders[s.phase][s.cursor]].products;
    for(const id of answer)await choose(id);await action("deliver");await action("next");
    if(n<14)await action("serve");
  }
  await page.getByRole("heading",{name:"Expediente encerrado"}).waitFor();assert.equal((await state()).results.length,15);await screenshot("balcao-resumo-1366");
  await action("replay");assert.equal((await state()).results.length,0);await action("serve");check("15 atendimentos completos pela interface e replay sem inflação");
  // Fixture com fases anteriores concluídas permite exercitar o catálogo completo.
  const fixture=phaseFixture(4);await restoreFixture(fixture);
  await action("serve");s=await state();answer=CUSTOMER_BY_ID[s.orders[s.phase][s.cursor]].products;
  for(const id of [...answer].reverse())await choose(id);
  assert.equal((await state()).bag.length,2);await action("deliver");assert.equal((await state()).status,"correct");check("pedido combinado aceita ordem invertida");
  await action("next");await action("serve");
  for(const [width,height] of [[1920,1080],[1366,768],[390,844]]) {
    await page.setViewportSize({width,height});await dimensions();
    await screenshot(`balcao-loja-${width}`);
    if(width===390) {
      assert.equal(await page.locator(".bi-products").evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(" ").length),2);
      await choose("mouse");assert.ok((await state()).bag.includes("mouse"));await page.locator('[data-action="remove"][data-product="mouse"]').click();
    }
  }
  check("1920×1080, 1366×768 e 390×844 sem overflow; clique no celular");
  await page.setViewportSize({width:1366,height:768});
  // Pedido de três produtos, apresentado a partir de um estado válido.
  let three=phaseFixture(4);
  while(currentCustomer(three).products.length<3) { three=submitOrder({...three,status:"shopping",bag:[...currentCustomer(three).products]});three=nextCustomer(three);for(let i=0;i<5;i++)three=tickQueue(three,1); }
  await restoreFixture(three);await action("serve");
  for(const id of [...currentCustomer(three).products].reverse())await choose(id);await action("deliver");assert.equal((await state()).status,"correct");await screenshot("balcao-tres-produtos");await dimensions();check("pedido de três produtos e feedback legível");
  await page.locator('.bi-toolbar a').click();await page.locator('.balcao-home-card a').waitFor();
  await page.locator('a.primary-button[href="#/carrinho-do-saber"]').click();assert.equal(await page.locator('body').evaluate(n=>n.classList.contains("balcao-active")),false);
  await page.goto(`${base}#/`);await page.locator('.balcao-home-card a').click();await action("continue");check("entrada pelo card e saída para outro jogo");
  // Valida o escopo usado pelo GitHub Pages em um perfil de cache independente.
  const scoped=new URL("CentralJogos/",base).href;
  await page.goto(`${scoped}#/balcao-da-informatica`);await page.locator('[data-action="continue"]').waitFor();
  await page.waitForFunction(()=>document.documentElement.dataset.offlineState==="ready");await action("continue");
  await context.setOffline(true);await page.reload();await action("continue");
  assert.equal((await state()).status,"correct");
  const images=await page.locator(".bi-shell img").evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0));assert.equal(images,true);
  await screenshot("balcao-offline-subdiretorio");check("recarga offline em /CentralJogos/ com progresso e imagens");
  await context.setOffline(false);
  assert.deepEqual(errors,[]);report.consoleErrors=errors;report.result="passed";
  await writeFile(resolve(output,"balcao-browser-report.json"),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally { await browser.close(); }

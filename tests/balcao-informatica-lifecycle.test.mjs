import test from "node:test";
import assert from "node:assert/strict";
import { BalcaoGame } from "../js/balcao-informatica.mjs";
import { STORAGE_KEY, SOUND_KEY, currentCustomer } from "../js/balcao-informatica-core.mjs";
class Target {
  constructor() { this.events = new Map(); }
  addEventListener(type, listener) { if (!this.events.has(type)) this.events.set(type,new Set()); this.events.get(type).add(listener); }
  removeEventListener(type,listener) { this.events.get(type)?.delete(listener); }
  emit(type,event={}) { for(const listener of this.events.get(type)||[]) listener({target:{closest:()=>null},preventDefault(){},...event}); }
  count() { return [...this.events.values()].reduce((sum,list)=>sum+list.size,0); }
}
function setup() {
  const host=new Target(),document=new Target(),root=new Target(),store=new Map(),timers=new Map(),classes=new Set(); let serial=0,destroyed=0,announcements=[],renders=0;
  const storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
  document.body={classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
  root.querySelector=selector=>selector === "[data-dropzone]" ? {getBoundingClientRect:()=>({left:100,top:100,right:200,bottom:200})} : null;
  const scheduler={set:fn=>{timers.set(++serial,fn);return serial;},clear:id=>timers.delete(id)};
  const rendererFactory=()=>({shell:{},mount(){},render(){renders++;},queue(){},offline(){},clearDrag(){},drag(){},animateAdd(){},announce:s=>announcements.push(s),destroy(){destroyed++;}});
  const game=new BalcaoGame({host,document,storage,scheduler,rendererFactory,random:()=>.4}); game.mount(root);
  const advance=n=>{for(let i=0;i<n;i++) for(const fn of [...timers.values()]) fn();};
  return {game,host,document,root,store,timers,classes,advance,counts:()=>({destroyed,renders,announcements})};
}
function open(game) { game.action("new"); game.action("select","mouse"); game.action("add"); game.action("deliver"); game.action("open"); }
test("enter idempotente, treino sem pontos, fila única e saída sem temporizadores/eventos", () => {
  const e=setup();e.game.enter(); const listeners=e.host.count()+e.document.count()+e.root.count(); e.game.enter();
  assert.equal(e.host.count()+e.document.count()+e.root.count(),listeners);
  open(e.game); assert.equal(e.game.state.results.length,0); assert.equal(e.timers.size,1);e.advance(1);assert.equal(e.game.state.status,"greeting");
  e.game.action("serve");e.game.action("select","mouse");e.game.action("add");
  assert.ok(e.store.has(STORAGE_KEY)); const bag=[...e.game.state.bag];
  e.document.hidden=true;e.document.emit("visibilitychange");assert.equal(e.game.state.status,"paused"); assert.equal(e.timers.size,0);
  const elapsed=e.game.state.elapsed;e.advance(90);assert.equal(e.game.state.elapsed,elapsed);
  e.game.action("resume");assert.equal(e.timers.size,1);assert.deepEqual(e.game.state.bag,bag);
  e.game.leave();assert.equal(e.timers.size,0);assert.equal(e.host.count()+e.document.count()+e.root.count(),0);assert.equal(e.classes.size,0);
  const renders=e.counts().renders;e.advance(3);assert.equal(e.counts().renders,renders);
  for(let i=0;i<3;i++){e.game.enter();assert.equal(e.game.canContinue,true);e.game.action("continue");assert.deepEqual(e.game.state.bag,bag);e.game.leave();}
  assert.equal(e.counts().destroyed,4);
});
test("tentativas e resultado sobrevivem à recarga sem pontuação duplicada", () => {
  const e=setup();e.game.enter();open(e.game);e.advance(1);e.game.action("serve");
  const c=currentCustomer(e.game.state); e.game.action("select",c.products[0]);e.game.action("add");e.game.action("deliver");
  assert.equal(e.game.state.status,"correct");e.game.leave();e.game.enter();e.game.action("continue");
  assert.equal(e.game.state.status,"correct");assert.equal(e.game.state.results.length,1);e.game.action("deliver");assert.equal(e.game.state.results.length,1);
  e.game.action("next");assert.equal(e.game.state.cursor,1);e.game.leave();
});
test("controlador aceita arraste ou clique, cancela fora e evita clique após arraste", () => {
  const e=setup();e.game.enter();e.game.action("new");
  const target={dataset:{product:"mouse"},setPointerCapture(){}};
  const event={button:0,pointerId:1,clientX:10,clientY:10,target:{closest:()=>target},preventDefault(){}};
  e.game.pointerDown(event);e.game.pointerMove({...event,clientX:140,clientY:130});e.game.pointerEnd({...event,clientX:140,clientY:130});
  assert.deepEqual(e.game.state.bag,["mouse"]);assert.equal(e.game.gesture.consumeClick("mouse"),true);
  e.game.action("remove","mouse");e.game.pointerDown(event);e.game.pointerMove({...event,clientX:140,clientY:130});e.game.pointerEnd({...event,clientX:140,clientY:130},true);assert.deepEqual(e.game.state.bag,[]);
  e.game.pointerDown(event);e.game.pointerMove({...event,clientX:70,clientY:40});e.game.pointerEnd({...event,clientX:70,clientY:40});assert.deepEqual(e.game.state.bag,[]);
  e.game.action("select","mouse");e.document.emit("keydown",{code:"Escape"});assert.equal(e.game.state.selected,null);
  e.game.action("select","mouse");e.game.action("add");assert.deepEqual(e.game.state.bag,["mouse"]);e.game.leave();
});
test("armazenamento bloqueado não impede atendimento; som e nova campanha", () => {
  const e=setup();e.game.dependencies.storage={getItem(){throw Error("blocked");},setItem(){throw Error("blocked");}};
  assert.doesNotThrow(()=>{e.game.enter();open(e.game);e.advance(1);e.game.action("serve");});assert.equal(e.game.storageError,true);e.game.leave();
  const good=setup();good.game.enter();good.game.action("sound");assert.equal(good.store.get(SOUND_KEY),"on");open(good.game);good.game.leave();good.game.enter();
  good.game.action("new");assert.equal(good.game.confirmNew,true);assert.equal(good.game.menu,true);good.game.action("cancel-new");assert.equal(good.game.canContinue,true);
  good.game.action("new");good.game.action("confirm-new");assert.equal(good.game.state.status,"tutorial");assert.equal(good.game.state.elapsed,0);good.game.leave();
});

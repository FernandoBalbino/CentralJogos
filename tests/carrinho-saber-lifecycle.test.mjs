import test from "node:test";
import assert from "node:assert/strict";
import { CartGame } from "../js/carrinho-saber.mjs";
import { STATES, STORAGE_KEY, SOUND_KEY } from "../js/carrinho-saber-core.mjs";

class Target {
  constructor() { this.events = new Map(); }
  addEventListener(type, handler) { if (!this.events.has(type)) this.events.set(type,new Set()); this.events.get(type).add(handler); }
  removeEventListener(type, handler) { this.events.get(type)?.delete(handler); }
  emit(type, detail = {}) { for (const listener of this.events.get(type) || []) listener({target:{matches:()=>false,closest:()=>null},preventDefault(){},...detail}); }
  count() { return [...this.events.values()].reduce((sum,set)=>sum+set.size,0); }
}
function setup() {
  const host = new Target(), document = new Target(), root = new Target();
  const classes = new Set(); document.body={classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}};
  const store = new Map(); const storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
  const frames = new Map(); let id=0,time=0;
  const scheduler={ request:callback=>{frames.set(++id,callback);return id;}, cancel:id=>frames.delete(id) };
  const advance = seconds => { for(let i=0;i<seconds*60;i++) { time+=1000/60; const scheduled=[...frames.values()];frames.clear();scheduled.forEach(callback=>callback(time)); } };
  let destroys=0,renders=0,closed=0,stopped=0;
  host.AudioContext=class { constructor(){this.state="running";this.currentTime=0;} createOscillator(){ return { frequency:{},connect(){},disconnect(){},start(){},stop(){stopped++;} };} createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};} close(){closed++;return Promise.resolve();} };
  const rendererFactory=()=>({shell:{},mount(){},measure:()=>({width:1366,height:550}),configure(){},render(){renders++;},destroy(){destroys++;},announce(){}});
  const game = new CartGame({host,document,storage,scheduler,rendererFactory,random:()=>.6}); game.mount(root);
  return {game,host,document,root,store,frames,advance,classes,counts:()=>({destroys,renders,closed,stopped})};
}
test("relógio controlado: enter idempotente, um loop, pausa sem callbacks e leave limpo", () => {
  const env=setup(),{game,frames,advance,host,document,root}=env;
  game.enter(); const listeners=host.count()+document.count()+root.count(); game.enter();
  assert.equal(host.count()+document.count()+root.count(),listeners); assert.equal(frames.size,0);
  game.action("new");game.action("start"); assert.equal(frames.size,1); advance(2);
  const countdown=game.state.countdown; host.emit("blur");assert.equal(game.state.status,STATES.PAUSED);assert.equal(frames.size,0);
  advance(10);assert.equal(game.state.countdown,countdown);
  game.action("resume");advance(3); assert.equal(game.state.status,STATES.PLAYING);assert.equal(frames.size,1);
  document.emit("keydown",{code:"ArrowRight"});assert.equal(game.keys.size,1);
  document.hidden=true;document.emit("visibilitychange"); assert.equal(game.keys.size,0);assert.equal(frames.size,0);
  game.action("resume");advance(.5); game.leave();assert.equal(frames.size,0);assert.equal(host.count()+document.count()+root.count(),0);assert.equal(game.nodes.size,0);assert.equal(env.classes.size,0);assert.equal(env.counts().closed,1);
  const renders=env.counts().renders;advance(5);assert.equal(env.counts().renders,renders);
  for(let i=0;i<5;i++){game.enter();assert.equal(host.count()+document.count()+root.count(),listeners);game.leave();}
  assert.equal(env.counts().destroys,6);
});
test("teclado, toque cancelado, som persistido, retomada e reset", () => {
  const {game,document,root,advance,store}=setup();game.enter();game.action("new");
  assert.ok(store.has(STORAGE_KEY));document.emit("keydown",{code:"Enter"});advance(4);
  const button={disabled:false,dataset:{move:"1"},setPointerCapture(){}};
  root.emit("pointerdown",{pointerId:1,target:{closest:()=>button}});assert.equal(game.pointers.size,1);
  const before=game.state.player.x;advance(.1);assert.ok(game.state.player.x>before);
  root.emit("pointercancel",{pointerId:1});assert.equal(game.pointers.size,0);
  document.emit("keydown",{code:"Escape"});assert.equal(game.state.status,STATES.PAUSED);
  game.action("sound");assert.equal(store.get(SOUND_KEY),"off");game.leave();game.enter();assert.equal(game.sound,false);assert.equal(game.canContinue,true);
  game.action("continue");assert.equal(game.state.status,STATES.INTRO);game.action("new");assert.equal(game.state.completed.length,0);game.leave();
});
test("armazenamento bloqueado não impede a partida", () => {
  const env=setup(); env.game.dependencies.storage={getItem(){throw new Error("blocked");},setItem(){throw new Error("blocked");}};
  assert.doesNotThrow(()=>{env.game.enter();env.game.action("new");env.game.action("start");env.advance(4);});assert.equal(env.game.state.status,STATES.PLAYING);env.game.leave();
});

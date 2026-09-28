import { CartRenderer } from "./carrinho-saber-renderer.mjs";
import { STORAGE_KEY, SOUND_KEY, STATES, createSession, createArena, beginPhase, startCountdown, nextPhase, pauseGame, resumeGame, stepGame, serializeProgress, restoreProgress } from "./carrinho-saber-core.mjs";

// Dependencies are injectable so lifecycle and timing can be tested without a browser.
export class CartGame {
  constructor({ host, document, storage, scheduler, rendererFactory, random = Math.random } = {}) {
    this.dependencies = { host, document, storage, scheduler, rendererFactory };
    this.random = random; this.active = false; this.frame = null; this.listeners = []; this.keys = new Set(); this.pointers = new Map(); this.nodes = new Set();
  }
  mount(root) { this.root = root; }
  enter() {
    if (this.active || !this.root) return;
    const dependencies = this.dependencies;
    this.host = dependencies.host || globalThis.window;
    this.document = dependencies.document || globalThis.document;
    this.scheduler = dependencies.scheduler || { request: callback => this.host.requestAnimationFrame(callback), cancel: id => this.host.cancelAnimationFrame(id) };
    try { this.storage = dependencies.storage || this.host.localStorage; } catch { this.storage = null; }
    this.active = true; this.lastTime = null;
    const saved = this.read(STORAGE_KEY);
    this.state = restoreProgress(saved, this.random);
    this.canContinue = Boolean(saved && (() => { try { const value = JSON.parse(saved); return value.version === 1 && JSON.stringify(value.choices) === JSON.stringify(this.state.choices); } catch { return false; } })());
    this.sound = this.read(SOUND_KEY) !== "off";
    this.renderer = dependencies.rendererFactory ? dependencies.rendererFactory(this.root) : new CartRenderer(this.root);
    this.document.body.classList.add("carrinho-game-active");
    this.renderer.mount(); this.configureArena();
    this.state.player.x = this.arena.width / 2;
    this.listen(this.root, "click", event => {
      const button = event.target.closest?.("[data-action]");
      if (button && !button.disabled) this.action(button.dataset.action);
    });
    this.listen(this.root, "pointerdown", event => {
      const button = event.target.closest?.("[data-move]");
      if (!button || button.disabled || this.state.status !== STATES.PLAYING) return;
      event.preventDefault(); button.setPointerCapture?.(event.pointerId);
      this.pointers.set(event.pointerId, Number(button.dataset.move)); this.startAudio();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) this.listen(this.root, type, event => this.pointers.delete(event.pointerId));
    this.listen(this.document, "keydown", event => this.keydown(event));
    this.listen(this.document, "keyup", event => this.keys.delete(event.code));
    this.listen(this.host, "blur", () => this.pause());
    this.listen(this.document, "visibilitychange", () => { if (this.document.hidden) this.pause(); });
    this.listen(this.host, "resize", () => this.resize());
    this.listen(this.document, "fullscreenchange", () => { this.resize(); this.render(); });
    this.render();
  }
  listen(target, type, handler) { target.addEventListener(type, handler); this.listeners.push(() => target.removeEventListener(type, handler)); }
  read(key) { try { return this.storage?.getItem(key); } catch { return null; } }
  write(key, value) { try { this.storage?.setItem(key, value); } catch { /* Playing remains possible when storage is blocked or full. */ } }
  save() { this.write(STORAGE_KEY, serializeProgress(this.state)); this.canContinue = true; }
  configureArena(phaseIndex = this.state.phaseIndex) {
    const { width, height } = this.renderer.measure();
    this.arena = createArena(width, height, phaseIndex); this.renderer.configure(this.arena);
  }
  resize() {
    if (!this.active) return;
    this.pause();
    const old = this.arena; this.configureArena();
    const scaleX = this.arena.width / old.width;
    this.state = { ...this.state, player: { ...this.state.player, x: Math.max(this.arena.minX, Math.min(this.arena.maxX, this.state.player.x * scaleX)), velocity: 0 }, objects: this.state.objects.map(object => ({ ...object, x: object.x * scaleX, y: (object.y + old.itemHeight) * this.arena.catchY / old.catchY - this.arena.itemHeight, speed: object.speed * this.arena.catchY / old.catchY })) };
    // If a new viewport would no longer preserve safe spacing, resume from its introduction.
    if (this.state.status === STATES.PAUSED && Math.abs(scaleX - 1) > .15) this.state = beginPhase(this.state, this.arena);
    this.render();
  }
  keydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.matches?.("input,textarea,select,[contenteditable=true]")) return;
    if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) {
      if (this.state.status === STATES.PLAYING) { event.preventDefault(); this.keys.add(event.code); }
      return;
    }
    if (event.repeat) return;
    if (event.code === "Escape") { event.preventDefault(); if (this.state.status === STATES.PAUSED) this.action("resume"); else this.pause(); }
    if (event.code === "Enter" && !event.target.closest?.("button,a")) {
      const action = { [STATES.MENU]: this.canContinue ? "continue" : "new", [STATES.INTRO]: "start", [STATES.WRONG]: "retry", [STATES.COMPLETE]: "next", [STATES.PAUSED]: "resume", [STATES.VICTORY]: "new" }[this.state.status];
      if (action) { event.preventDefault(); this.action(action); }
    }
  }
  action(action) {
    if (!this.active) return;
    this.startAudio();
    if (action === "sound") { this.sound = !this.sound; this.write(SOUND_KEY, this.sound ? "on" : "off"); if (!this.sound) this.stopAudio(); else { this.startAudio(); this.playSound("start"); } }
    else if (action === "fullscreen") { void this.toggleFullscreen(); return; }
    else if (action === "pause") { this.pause(); return; }
    else if (action === "new") { this.state = createSession(this.random); this.configureArena(); this.state = beginPhase(this.state, this.arena); this.save(); }
    else if (action === "continue" && this.state.status === STATES.MENU) { this.configureArena(); this.state = this.state.completed.length === 10 ? { ...this.state, status: STATES.VICTORY } : beginPhase(this.state, this.arena); }
    else if (action === "start" && this.state.status === STATES.INTRO) { this.state = startCountdown(this.state); this.playSound("start"); }
    else if (action === "retry" && [STATES.WRONG, STATES.PAUSED].includes(this.state.status)) { this.configureArena(); this.state = beginPhase(this.state, this.arena); }
    else if (action === "resume" && this.state.status === STATES.PAUSED) { this.state = resumeGame(this.state); this.lastTime = null; }
    else if (action === "next" && this.state.status === STATES.COMPLETE) { this.configureArena(Math.min(9, this.state.phaseIndex + 1)); this.state = nextPhase(this.state, this.arena); this.save(); if (this.state.status === STATES.VICTORY) this.playSound("victory"); }
    this.clearInput(); this.render(); this.schedule();
  }
  clearInput() { this.keys.clear(); this.pointers.clear(); }
  pause() {
    if (!this.active) return;
    this.clearInput(); this.state = pauseGame(this.state);
    if (this.state.status === STATES.PAUSED) { this.cancelFrame(); this.stopAudio(); }
    this.render();
  }
  animating() { return [STATES.COUNTDOWN, STATES.PLAYING, STATES.CORRECT].includes(this.state.status) || (this.state.status === STATES.WRONG && this.state.result.age < .5); }
  schedule() { if (this.active && this.frame === null && this.animating()) this.frame = this.scheduler.request(time => this.tick(time)); }
  tick(time) {
    this.frame = null; if (!this.active) return;
    const seconds = this.lastTime === null ? 0 : Math.min(.05, Math.max(0, (time - this.lastTime) / 1000)); this.lastTime = time;
    const directions = [...this.pointers.values()];
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA") || directions.includes(-1);
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD") || directions.includes(1);
    const before = this.state;
    this.state = stepGame(this.state, seconds, Number(right) - Number(left), this.arena, this.random);
    if (!before.result && this.state.result) { this.clearInput(); this.playSound(this.state.result.correct ? "correct" : "wrong"); if (this.state.result.correct) this.save(); }
    if (before.status === STATES.COUNTDOWN && this.state.status === STATES.PLAYING) this.playSound("go");
    this.render();
    if (!this.animating()) this.lastTime = null;
    this.schedule();
  }
  render() { if (this.active) this.renderer.render(this.state, { sound: this.sound, canContinue: this.canContinue, fullscreen: Boolean(this.document.fullscreenElement) }); }
  cancelFrame() { if (this.frame !== null) this.scheduler.cancel(this.frame); this.frame = null; this.lastTime = null; }
  async toggleFullscreen() {
    const generation = this.renderer;
    try {
      if (this.document.fullscreenElement === this.renderer.shell) await this.document.exitFullscreen();
      else if (this.renderer.shell.requestFullscreen) await this.renderer.shell.requestFullscreen();
      else this.renderer.announce("Tela cheia indisponível. Você pode continuar jogando nesta guia.");
    } catch { if (this.active && this.renderer === generation) this.renderer.announce("Não foi possível entrar em tela cheia. Continue jogando nesta guia."); }
  }
  startAudio() {
    if (!this.sound || !this.active) return;
    try {
      const Audio = this.host.AudioContext || this.host.webkitAudioContext;
      if (!this.audio && Audio) this.audio = new Audio();
      if (this.audio?.state === "suspended") void this.audio.resume().catch(() => {});
    } catch { /* Audio is optional. */ }
  }
  playSound(kind) {
    if (!this.sound || !this.audio || this.audio.state === "closed") return;
    const notes = { start: [330], go: [660], correct: [523, 659, 784], wrong: [220, 165], victory: [523, 659, 784, 1047] }[kind] || [440];
    try { notes.forEach((frequency, index) => {
      const oscillator = this.audio.createOscillator(), gain = this.audio.createGain();
      const at = this.audio.currentTime + index * .13;
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.055, at + .015); gain.gain.exponentialRampToValueAtTime(.001, at + .22);
      oscillator.connect(gain); gain.connect(this.audio.destination);
      const node = { oscillator, gain }; this.nodes.add(node);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.nodes.delete(node); };
      oscillator.start(at); oscillator.stop(at + .23);
    }); } catch { /* Ignore unavailable audio hardware. */ }
  }
  stopAudio() { for (const { oscillator, gain } of this.nodes) { oscillator.onended = null; try { oscillator.stop(); oscillator.disconnect(); gain.disconnect(); } catch { /* Already ended. */ } } this.nodes.clear(); }
  leave() {
    if (!this.active) return;
    this.active = false; this.cancelFrame(); this.clearInput();
    this.listeners.splice(0).forEach(remove => remove());
    this.stopAudio(); if (this.audio) { void this.audio.close().catch(() => {}); this.audio = null; }
    if (this.document.fullscreenElement === this.renderer.shell) void this.document.exitFullscreen().catch(() => {});
    this.renderer.destroy(); this.document.body.classList.remove("carrinho-game-active");
  }
}
export const carrinhoSaberGame = new CartGame();

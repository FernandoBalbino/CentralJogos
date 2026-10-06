import { STORAGE_KEY, SOUND_KEY, ACTIVE_STATUSES, createSession, restoreSession, serializeSession, startPhase, selectProduct, addToBag, removeFromBag, submitOrder, retryOrder, nextCustomer, nextPhase, replayPhase, tickQueue, pauseSession, resumeSession, canShop } from "./balcao-informatica-core.mjs";
import { ShopRenderer } from "./balcao-informatica-renderer.mjs";
import { ProductGesture } from "./balcao-informatica-interactions.mjs";

export class BalcaoGame {
  constructor(dependencies = {}) { this.dependencies = dependencies; this.active = false; this.listeners = []; this.timer = null; this.nodes = new Set(); this.gesture = new ProductGesture(); }
  mount(root) { this.root = root; }
  enter() {
    if (this.active || !this.root) return;
    this.host = this.dependencies.host || window;
    this.document = this.dependencies.document || document;
    this.scheduler = this.dependencies.scheduler || { set: fn => this.host.setInterval(fn, 1000), clear: id => this.host.clearInterval(id) };
    this.random = this.dependencies.random || Math.random;
    try { this.storage = this.dependencies.storage || this.host.localStorage; } catch { this.storage = null; }
    this.storageError = !this.storage;
    const saved = restoreSession(this.read(STORAGE_KEY));
    this.state = saved || createSession(this.random);
    this.canContinue = Boolean(saved); this.menu = true; this.category = "all"; this.confirmNew = false; this.sound = this.read(SOUND_KEY) === "on";
    this.active = true;
    this.renderer = this.dependencies.rendererFactory ? this.dependencies.rendererFactory(this.root) : new ShopRenderer(this.root);
    this.renderer.mount(); this.document.body.classList.add("balcao-active");
    this.listen(this.root, "click", event => {
      const button = event.target.closest?.("[data-action]");
      if (!button || button.disabled) return;
      if (button.dataset.action === "select" && this.gesture.consumeClick(button.dataset.product)) return;
      this.action(button.dataset.action, button.dataset.product || button.dataset.category);
    });
    this.listen(this.root, "pointerdown", event => this.pointerDown(event));
    this.listen(this.root, "pointermove", event => this.pointerMove(event));
    this.listen(this.root, "pointerup", event => this.pointerEnd(event));
    this.listen(this.root, "pointercancel", event => this.pointerEnd(event, true));
    this.listen(this.root, "lostpointercapture", event => this.pointerEnd(event, true));
    this.listen(this.root, "dragstart", event => { if (event.target.closest?.("[data-product]")) event.preventDefault(); });
    this.listen(this.document, "keydown", event => { if (event.code === "Escape" && !this.menu) { event.preventDefault(); if (this.state.selected || this.gesture.active) this.action("cancel"); else this.action(this.state.status === "paused" ? "resume" : "pause"); } });
    this.listen(this.document, "visibilitychange", () => { if (this.document.hidden) this.pause(); });
    this.listen(this.document, "central-offline-status", () => this.renderer.offline?.());
    this.listen(this.host, "pagehide", () => { this.pause(); this.save(); });
    this.render();
  }
  listen(target, type, listener) { target.addEventListener(type, listener); this.listeners.push(() => target.removeEventListener(type, listener)); }
  read(key) { try { return this.storage?.getItem(key); } catch { this.storageError = true; return null; } }
  write(key, value) { try { if (!this.storage) throw Error("Storage unavailable"); this.storage.setItem(key, value); } catch { this.storageError = true; } }
  save() { if (!this.menu) { this.write(STORAGE_KEY, serializeSession(this.state)); this.canContinue = true; } }
  render(focus) { if (this.active) this.renderer.render(this.state, { menu: this.menu, canContinue: this.canContinue, sound: this.sound, confirmNew: this.confirmNew, category: this.category, storageError: this.storageError }, focus); }
  schedule() {
    const running = !this.menu && ACTIVE_STATUSES.includes(this.state.status);
    if (!running && this.timer !== null) { this.scheduler.clear(this.timer); this.timer = null; }
    if (running && this.timer === null) this.timer = this.scheduler.set(() => this.tick());
  }
  tick() {
    if (!this.active || this.menu) return;
    const before = this.state;
    this.state = tickQueue(before, 1);
    if (this.state === before) return;
    if (this.state.status !== before.status) this.render("serve");
    else if (this.state.arrived !== before.arrived) this.renderer.queue(this.state);
    this.renderer.offline?.();
    if (this.state.arrived !== before.arrived || this.state.elapsed % 10 === 0) this.save();
  }
  action(action, value) {
    if (!this.active) return;
    let focus, announcement = "";
    if (action === "sound") { this.sound = !this.sound; this.write(SOUND_KEY, this.sound ? "on" : "off"); if (this.sound) this.playSound("select"); else this.stopAudio(); }
    else if (action === "fullscreen") { void this.fullscreen(); return; }
    else if (action === "new") { if (this.canContinue) this.confirmNew = true; else this.begin(); }
    else if (action === "confirm-new") this.begin();
    else if (action === "cancel-new") this.confirmNew = false;
    else if (action === "continue" && this.menu) { this.menu = false; this.state = resumeSession(this.state); focus = this.focusForState(); }
    else if (this.menu) return;
    else if (action === "pause") { if (this.state.status === "paused") this.state = resumeSession(this.state); else { this.pause(); return; } }
    else if (action === "resume") { this.state = resumeSession(this.state); focus = this.focusForState(); }
    else if (action === "open" && this.state.status === "trained") this.state = startPhase(this.state);
    else if (action === "serve" && this.state.status === "greeting") { this.state = { ...this.state, status: "shopping" }; focus = `product-${this.visibleFirstProduct()}`; }
    else if (action === "select") { this.state = selectProduct(this.state, value); this.playSound("select"); announcement = this.state.selected ? "Produto selecionado. Agora clique na sacola." : "Seleção cancelada."; }
    else if (action === "cancel") { this.gesture.cancel(); this.renderer.clearDrag(); this.state = { ...this.state, selected: null }; }
    else if (action === "add") { this.add(); return; }
    else if (action === "remove") { this.state = removeFromBag(this.state, value); focus = "add"; }
    else if (action === "deliver") { const before = this.state; this.state = submitOrder(this.state); if (this.state !== before) { this.playSound(this.state.status === "wrong" ? "wrong" : "correct"); announcement = this.state.status === "wrong" ? "Pedido incorreto. Confira a explicação antes de tentar novamente." : this.state.status === "trained" ? "Treino concluído. Você já pode abrir a loja." : "Pedido correto! Leia o que aprendeu antes do próximo cliente."; } focus = this.focusForState(); }
    else if (action === "retry") { this.state = retryOrder(this.state); focus = "add"; }
    else if (action === "next") { this.state = nextCustomer(this.state); focus = this.focusForState(); }
    else if (action === "phase") { this.state = nextPhase(this.state); this.category = "all"; }
    else if (action === "replay") { this.state = replayPhase(this.state, this.random); this.category = "all"; }
    else if (action === "category") { if (!["all", "peripherals", "storage", "components", "network"].includes(value)) return; this.category = value; }
    this.renderer.announce(announcement); this.save(); this.render(focus); this.schedule();
  }
  visibleFirstProduct() { return ({ all: "mouse", peripherals: "mouse", storage: "hd", components: "ram", network: "router" })[this.category]; }
  focusForState() { return ({ greeting: "serve", shopping: "add", correct: "next", wrong: "retry", tutorial: "product-mouse", trained: "open", summary: this.state.phase < 4 ? "phase" : "replay" })[this.state.status]; }
  begin() { this.state = createSession(this.random); this.menu = false; this.confirmNew = false; this.category = "all"; }
  add(id = this.state.selected, origin) {
    const source = origin || this.root.querySelector?.(`[data-focus="product-${id}"]`)?.getBoundingClientRect();
    const before = this.state, result = addToBag(before, id);
    this.state = result.state; this.save(); this.render("add"); this.renderer.announce(result.message);
    if (this.state !== before) { this.renderer.animateAdd?.(id, source); this.playSound("select"); }
  }
  pause() {
    if (!this.active || this.menu) return;
    this.state = pauseSession(this.state); this.gesture.cancel(); this.renderer.clearDrag(); this.stopAudio(); this.save(); this.schedule(); this.render(this.state.status === "paused" ? "resume" : undefined);
  }
  pointerDown(event) {
    const target = event.target.closest?.('[data-action="select"]');
    if (!target || target.disabled || !canShop(this.state) || event.button !== 0 || event.isPrimary === false) return;
    this.gesture.start(target.dataset.product, event.pointerId, event.clientX, event.clientY);
    target.setPointerCapture?.(event.pointerId);
  }
  pointerMove(event) {
    const gesture = this.gesture.move(event.pointerId, event.clientX, event.clientY);
    if (gesture?.dragging) { event.preventDefault(); this.renderer.drag(gesture.id, event.clientX, event.clientY); }
  }
  pointerEnd(event, cancelled = false) {
    if (!this.gesture.active) return;
    const rect = this.root.querySelector?.("[data-dropzone]")?.getBoundingClientRect();
    const inside = rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    const id = this.gesture.finish(event.pointerId, inside, cancelled);
    this.renderer.clearDrag();
    if (id) this.add(id, { left: event.clientX, top: event.clientY });
  }
  async fullscreen() {
    const renderer = this.renderer;
    try { if (this.document.fullscreenElement === renderer.shell) await this.document.exitFullscreen(); else if (renderer.shell.requestFullscreen) await renderer.shell.requestFullscreen(); else this.renderer.announce("Tela cheia indisponível. Continue nesta guia."); }
    catch { if (this.active && this.renderer === renderer) this.renderer.announce("Não foi possível entrar em tela cheia. Continue nesta guia."); }
  }
  playSound(kind) {
    if (!this.sound) return;
    try {
      const Audio = this.host.AudioContext || this.host.webkitAudioContext;
      if (!Audio) return;
      this.audio ||= new Audio();
      if (this.audio.state === "suspended") void this.audio.resume().catch(() => {});
      const notes = ({ select: [440], correct: [523, 659, 784], wrong: [220, 196] })[kind];
      notes.forEach((frequency, index) => {
        const oscillator = this.audio.createOscillator(), gain = this.audio.createGain(), time = this.audio.currentTime + index * .1;
        oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.035, time); gain.gain.exponentialRampToValueAtTime(.001, time + .16);
        oscillator.connect(gain); gain.connect(this.audio.destination);
        const node = { oscillator, gain }; this.nodes.add(node);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.nodes.delete(node); };
        oscillator.start(time); oscillator.stop(time + .17);
      });
    } catch { /* O áudio é opcional e não interrompe o atendimento. */ }
  }
  stopAudio() { for (const { oscillator, gain } of this.nodes) { oscillator.onended = null; try { oscillator.stop(); oscillator.disconnect(); gain.disconnect(); } catch { /* Já encerrado. */ } } this.nodes.clear(); }
  leave() {
    if (!this.active) return;
    this.save(); this.active = false;
    if (this.timer !== null) this.scheduler.clear(this.timer); this.timer = null;
    this.listeners.splice(0).forEach(remove => remove()); this.gesture.cancel(); this.stopAudio();
    if (this.audio) { void this.audio.close().catch(() => {}); this.audio = null; }
    if (this.document.fullscreenElement === this.renderer.shell) void this.document.exitFullscreen().catch(() => {});
    this.renderer.destroy(); this.document.body.classList.remove("balcao-active");
  }
}
export const balcaoGame = new BalcaoGame();

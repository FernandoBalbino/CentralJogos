import { COMPONENTS, STEPS, PHASES, STORAGE_KEY, SOUND_KEY, choicesFor, targetComponent, FINAL_EXPLANATION, isUprightPhase } from "./oficina-pc-data.mjs";
import { createState, transition, serializeProgress, restoreProgress } from "./oficina-pc-core.mjs";
import { WorkshopScene } from "./oficina-pc-scene.mjs";
import { WorkshopInteractions } from "./oficina-pc-interactions.mjs";

const escapeHtml = (text = "") => String(text).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
export class WorkshopGame {
  constructor({ host = globalThis.window, document = globalThis.document, storage, sceneFactory = (container, options) => new WorkshopScene(container, options), interactionsFactory = (scene, callbacks) => new WorkshopInteractions(scene, callbacks) } = {}) {
    this.host = host; this.document = document; this.storageOverride = storage; this.sceneFactory = sceneFactory; this.interactionsFactory = interactionsFactory;
    this.state = createState(); this.active = false; this.listeners = []; this.motionEpoch = 0; this.sound = true; this.nodes = new Set();
  }
  storage() { try { return this.storageOverride || this.host.localStorage; } catch { return null; } }
  mount(root) { this.root = root; }
  listen(target, type, callback) { target.addEventListener(type, callback); this.listeners.push(() => target.removeEventListener(type, callback)); }
  enter() {
    if (this.active || !this.root) return;
    this.active = true; this.motionEpoch++;
    try { this.state = restoreProgress(this.storage()?.getItem(STORAGE_KEY)); this.sound = this.storage()?.getItem(SOUND_KEY) !== "off"; } catch { this.state = createState(); }
    this.document.body.classList.add("oficina-pc-active");
    this.root.innerHTML = `<div class="opc-shell">
      <header class="opc-toolbar"><a class="opc-back" href="#/">← <span>Central</span></a><strong>Oficina do PC<span>HARDWARE + PRÁTICA 3D</span></strong><div class="opc-tools"><button type="button" data-action="sound" aria-label="Alternar som">Som</button><button type="button" data-action="fullscreen" aria-label="Alternar tela cheia">⛶</button><button type="button" data-action="reset" aria-label="Recomeçar oficina">↺</button></div></header>
      <div class="opc-mission" data-mission></div>
      <div class="opc-body"><div class="opc-stage" data-stage>
        <canvas tabindex="0" aria-label="Oficina 3D. Arraste as peças; use as setas para girar, mais e menos para zoom."></canvas>
        <div class="opc-scene-badge"><span class="opc-live-dot"></span> OFICINA INTERATIVA</div>
        <div class="opc-stage-controls"><button type="button" data-action="view">Visão geral</button><button type="button" data-action="view-pc">Ver PC</button><button type="button" data-action="left" aria-label="Girar câmera para a esquerda">↶</button><button type="button" data-action="right" aria-label="Girar câmera para a direita">↷</button><button type="button" data-action="zoom-in" aria-label="Aproximar câmera">+</button><button type="button" data-action="zoom-out" aria-label="Afastar câmera">−</button><button type="button" data-action="xray" aria-pressed="false">Raio-X</button></div>
        <button class="opc-snap-label" type="button" data-snap-label data-action="place" hidden>◎ ENCAIXAR AQUI</button>
        ${Object.values(COMPONENTS).map((part) => `<button class="opc-part-label" type="button" data-part-label="${part.id}" data-inspect="${part.id}" hidden>${escapeHtml(part.name)}</button>`).join("")}
        <div class="opc-overlay" data-overlay hidden></div>
      </div><aside class="opc-panel" data-panel aria-label="Objetivo e componentes"></aside></div>
      <footer class="opc-footer"><span data-feedback role="status" aria-live="polite"></span><span class="opc-offline"><span data-offline-status>Preparando oficina para uso offline…</span><progress data-load-progress value="2" max="4" aria-label="Carregamento: estilos, importação, cena e preparo offline"></progress><button type="button" class="opc-text-button" data-action="retry-offline" hidden>TENTAR NOVAMENTE</button></span></footer>
    </div>`;
    this.listen(this.root, "click", (event) => {
      const button = event.target.closest("button"); if (!button || button.disabled) return;
      if (button.dataset.component) this.select(button.dataset.component);
      else if (button.dataset.inspect) this.examine(button.dataset.inspect);
      else if (button.dataset.action) this.action(button.dataset.action);
    });
    this.listen(this.root, "keydown", (event) => {
      if (event.code === "Escape" && this.scene?.examining) { this.closeExamine(); return; }
      if (event.target.tagName !== "CANVAS") return;
      const actions = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Equal: "zoom-in", NumpadAdd: "zoom-in", Minus: "zoom-out", NumpadSubtract: "zoom-out" };
      if (actions[event.code]) { event.preventDefault(); this.action(actions[event.code]); }
    });
    this.listen(this.document, "visibilitychange", () => {
      if (this.document.hidden) { this.interactions?.cancel(); this.scene?.pause(); this.stopFan(); this.audio?.suspend?.(); }
      else { this.scene?.resume(); if (this.sound) { this.audio?.resume?.(); if (this.state.powered) this.startFan(); } }
    });
    this.listen(this.host, "blur", () => { this.interactions?.cancel(); });
    this.listen(this.document, "fullscreenchange", () => { const enabled = this.document.fullscreenElement === this.root; this.root.dataset.fullscreen = String(enabled); this.root.querySelector("[data-action='fullscreen']").setAttribute("aria-pressed", String(enabled)); });
    this.listen(this.document, "central-game-offline-status", (event) => { if (event.detail.gameId === "oficina-pc") this.updateOffline(event.detail); });
    this.render();
    try {
      const reducedMotion = Boolean(this.host.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
      this.scene = this.sceneFactory(this.root.querySelector("[data-stage]"), { reducedMotion, onMetrics: (metrics) => { const stage = this.root.querySelector("[data-stage]"); Object.entries(metrics).forEach(([key, value]) => { stage.dataset[key] = value; }); }, onContextLost: () => this.showError("A experiência 3D foi interrompida. Reabra a oficina para continuar do seu progresso.") });
      this.interactions = this.interactionsFactory(this.scene, { getState: () => this.viewBusy ? { ...this.state, motion: { kind: "view" } } : this.state, select: (id, options) => this.select(id, options), drop: (result) => this.drop(result), power: () => this.apply({ type: "POWER" }), inspect: (id) => this.examine(id) });
      this.scene.sync(this.state); this.scene.navigation.overview(isUprightPhase(this.state.phase), this.root.clientWidth < 700);
      this.root.querySelector("[data-load-progress]").value = 3;
      if (this.document.hidden) this.scene.pause();
    } catch (error) { this.scene?.destroy(); this.scene = null; this.showError(error.message || "Seu navegador ou dispositivo não oferece suporte à experiência 3D."); }
    this.updateSoundButton();
  }
  save() { try { this.storage()?.setItem(STORAGE_KEY, serializeProgress(this.state)); } catch { /* A oficina continua em memória. */ } }
  apply(action, { focus = true } = {}) {
    if (!this.active || !this.scene || this.viewBusy) return;
    const previous = this.state, next = transition(previous, action); this.state = next;
    if (previous === next) return;
    this.render(); this.save();
    if (next.motion && !previous.motion) { this.runMotion(next.motion); return; }
    this.scene.sync(next);
    if (action.type === "SELECT" && focus && ["REMOVE_HDD", "REMOVE_RAM"].includes(next.phase)) this.scene.focus(next.selectedId);
    if (previous.powered && !next.powered) this.stopFan();
    if (next.phase !== previous.phase) this.announce(next.feedback || this.missionText().objective);
  }
  select(id, options = {}) { this.playSound("select"); this.apply({ type: "SELECT", componentId: id }, options); }
  drop({ componentId, position, removing }) { this.apply({ type: removing ? "REMOVE" : "DROP", componentId, position }, { focus: false }); }
  async runMotion(motion) {
    const epoch = this.motionEpoch;
    await this.scene.animateMotion(motion);
    if (!this.active || epoch !== this.motionEpoch) return;
    this.playSound(motion.kind === "power" ? "power" : motion.componentId === "ram" ? "ram" : "snap");
    this.apply({ type: "ANIMATION_DONE", ...motion });
    if (this.state.powered) this.startFan();
  }
  action(action) {
    if (action === "retry-offline") { this.document.dispatchEvent(new this.host.CustomEvent("central-retry-game-offline", { detail: { gameId: "oficina-pc" } })); return; }
    if (action === "fullscreen") { if (this.document.fullscreenElement) this.document.exitFullscreen?.(); else this.root.requestFullscreen?.(); return; }
    if (action === "sound") { this.sound = !this.sound; try { this.storage()?.setItem(SOUND_KEY, this.sound ? "on" : "off"); } catch {} if (!this.sound) this.stopFan(); else { this.playSound("select"); if (this.state.powered) this.startFan(); } this.updateSoundButton(); return; }
    if (action === "reset") { this.reset(); return; }
    if (!this.scene || this.state.motion || this.viewBusy) return;
    if (action === "continue") { this.playSound("select"); this.apply({ type: "CONTINUE" }); }
    else if (action === "power") this.apply({ type: "POWER" });
    else if (action === "ssd") this.apply({ type: "INSTALL_SSD" });
    else if (action === "ram") this.apply({ type: "INSTALL_RAM" });
    else if (action === "test-mouse") this.apply({ type: "TEST_MOUSE" });
    else if (action === "answer-yes" || action === "answer-no") this.apply({ type: "ANSWER", answer: action === "answer-yes" });
    else if (action === "place") {
      const id = targetComponent(this.state.phase); if (id) this.drop({ componentId: this.state.selectedId, position: COMPONENTS[id].snapPosition });
    } else if (action === "remove") this.drop({ componentId: this.state.phase === "REMOVE_RAM" ? "ram" : "hdd", position: [3.5, -1.43, .04], removing: true });
    else if (action === "examine") this.examine(this.state.selectedId);
    else if (action === "back-examine") this.closeExamine();
    else if (action === "view") this.scene.navigation.overview(isUprightPhase(this.state.phase), this.root.clientWidth < 700);
    else if (action === "view-pc") this.scene.navigation.computer();
    else if (action === "xray") { this.scene.setXray(!this.scene.xray); this.root.querySelector("[data-action='xray']").setAttribute("aria-pressed", String(this.scene.xray)); }
    else if (["left", "right", "up", "down"].includes(action)) this.scene.navigation.rotate(action === "left" ? -.22 : action === "right" ? .22 : 0, action === "up" ? -.15 : action === "down" ? .15 : 0);
    else if (action === "zoom-in" || action === "zoom-out") this.scene.navigation.zoom(action === "zoom-in" ? .83 : 1.2);
    else if (action === "exploded") {
      const epoch = this.motionEpoch; this.viewBusy = true;
      const animation = this.scene.setExploded(!this.scene.exploded); this.render();
      animation.then(() => { if (this.active && epoch === this.motionEpoch) { this.viewBusy = false; this.render(); } });
    }
  }
  missionText() {
    const step = STEPS.find((entry) => entry.phase === this.state.phase);
    if (step) return { title: step.title, objective: step.objective, kicker: `ETAPA ${STEPS.indexOf(step) + 1} DE 8` };
    return ({
      INTRO: { title: "Uma peça. Uma descoberta.", objective: "Aprenda como um computador é montado peça por peça.", kicker: "BEM-VINDO À OFICINA" },
      TUTORIAL: { title: "Você está no controle", objective: "Arraste uma peça para instalar. Arraste o espaço vazio para girar a câmera.", kicker: "CONTROLES RÁPIDOS" },
      ASSEMBLED: { title: "Computador montado!", objective: "Você instalou os principais componentes. Clique nas peças para lembrar suas funções.", kicker: "MONTAGEM CONCLUÍDA" },
      CONNECT_POWER: { title: "Conecte à tomada", objective: "Encaixe o plugue do cabo da fonte na tomada ao lado da bancada. Depois será possível ligar.", kicker: "ENERGIA PARA O COMPUTADOR" },
      POWER_ON: { title: this.state.powered ? "Funcionando!" : "Hora de ligar", objective: this.state.powered ? "A montagem está pronta. Agora temos um pedido de manutenção." : "Use o botão Power para ligar o computador.", kicker: "PRIMEIRA INICIALIZAÇÃO" },
      CLIENT_ORDER: { title: "Ordem de serviço #001", objective: "Lucas quer trocar seu HD por um SSD.", kicker: "DESAFIO 1 DE 3" },
      FIND_HDD: { title: "Encontre o armazenamento", objective: "Gire o gabinete e clique no dispositivo que precisa ser substituído.", kicker: "MANUTENÇÃO · 1 DE 5" },
      REMOVE_HDD: { title: "Remova o HD", objective: "Arraste o HD para fora do gabinete, em direção à bancada.", kicker: "MANUTENÇÃO · 2 DE 5" },
      SELECT_SSD: { title: "Qual peça atende ao pedido?", objective: "Escolha na bancada o novo dispositivo de armazenamento.", kicker: "MANUTENÇÃO · 3 DE 5" },
      INSTALL_SSD: { title: "Instale o SSD", objective: "Arraste o SSD para o compartimento de armazenamento.", kicker: "MANUTENÇÃO · 4 DE 5" },
      FINAL_TEST: { title: this.state.powered ? "Upgrade funcionando!" : "Teste o upgrade", objective: this.state.powered ? "Compare a inicialização ilustrativa antes e depois." : "Ligue o computador para testar o SSD instalado.", kicker: "MANUTENÇÃO · 5 DE 5" },
      FINAL_QUESTION: { title: "Uma última descoberta", objective: "O SSD tornou o processador mais potente?", kicker: "ENTENDA A DIFERENÇA" },
      RAM_ORDER: { title: "Ordem de serviço #002", objective: "Sofia quer mais memória para usar vários programas.", kicker: "DESAFIO 2 DE 3" },
      FIND_RAM: { title: "Encontre a memória temporária", objective: "Localize a RAM que será substituída. O PC foi desligado e desconectado.", kicker: "MEMÓRIA · 1 DE 5" },
      REMOVE_RAM: { title: "Retire a RAM antiga", objective: "Arraste o módulo para fora do gabinete, em direção à bancada.", kicker: "MEMÓRIA · 2 DE 5" },
      SELECT_RAM: { title: "Escolha a nova memória", objective: "Qual peça guarda os dados usados pelos programas enquanto estão abertos?", kicker: "MEMÓRIA · 3 DE 5" },
      INSTALL_RAM: { title: "Instale a nova RAM", objective: "Encaixe o novo módulo no slot de memória.", kicker: "MEMÓRIA · 4 DE 5" },
      RAM_TEST: { title: this.state.powered ? "Memória reconhecida!" : "Teste a memória", objective: this.state.powered ? "A nova RAM oferece mais espaço temporário para programas abertos." : "Ligue o computador para verificar a memória instalada.", kicker: "MEMÓRIA · 5 DE 5" },
      RAM_QUESTION: { title: "O que a RAM guarda?", objective: "A RAM mantém seus arquivos guardados para sempre?", kicker: "VERIFIQUE SUA DESCOBERTA" },
      MOUSE_ORDER: { title: "Ordem de serviço #003", objective: "Marina precisa de ajuda: o ponteiro do mouse não se move.", kicker: "DESAFIO 3 DE 3" },
      FIND_MOUSE: { title: "Encontre o periférico", objective: "Qual dispositivo usamos para controlar o ponteiro na tela?", kicker: "MOUSE · 1 DE 3" },
      CONNECT_MOUSE: { title: "Conecte o mouse", objective: "O cabo estava solto. Encaixe o plugue do mouse na porta USB do gabinete.", kicker: "MOUSE · 2 DE 3" },
      MOUSE_TEST: { title: this.state.mouseTested ? "Mouse funcionando!" : "Teste o mouse", objective: "Observe o ponteiro no monitor ao testar a conexão.", kicker: "MOUSE · 3 DE 3" },
      MOUSE_QUESTION: { title: "Uma função diferente", objective: "O mouse é usado para armazenar seus arquivos?", kicker: "VERIFIQUE SUA DESCOBERTA" },
      COMPLETED: { title: "Oficina concluída!", objective: "Você montou um computador e resolveu três pedidos de manutenção.", kicker: "MISSÃO CUMPRIDA" }
    })[this.state.phase];
  }
  render() {
    if (!this.root || !this.active) return;
    const panel = this.root.querySelector("[data-panel]"), focused = this.document.activeElement;
    const focusedInPanel = panel.contains?.(focused);
    const focusKey = focusedInPanel ? ["component", "inspect", "action"].find((key) => focused?.dataset?.[key]) : null;
    const focusValue = focusKey && focused.dataset[focusKey];
    const state = this.state, text = this.missionText(), busy = state.motion || this.viewBusy ? " disabled" : "";
    const progressPhase = state.phase === "CONNECT_POWER" ? state.powerReturn === "POWER_ON" ? "CONNECT_POWER" : state.powerReturn === "RAM_TEST" ? "INSTALL_RAM" : "INSTALL_SSD" : state.phase;
    const progress = Math.round(PHASES.indexOf(progressPhase) / (PHASES.length - 1) * 100);
    this.root.dataset.phase = state.phase;
    this.root.querySelector("[data-mission]").innerHTML = `<div><span class="opc-kicker">${text.kicker}</span><h1>${escapeHtml(text.title)}</h1><p>${escapeHtml(text.objective)}</p></div><div class="opc-progress"><span>${progress}% da oficina</span><progress value="${progress}" max="100" aria-label="Progresso da oficina"></progress></div>`;
    const button = (label, action, disabled = false) => `<button class="opc-primary" type="button" data-action="${action}"${busy || (disabled ? " disabled" : "")}>${label}</button>`;
    const choices = choicesFor(state.phase, state.installed), expected = targetComponent(state.phase), selected = COMPONENTS[state.selectedId];
    let content = "";
    if (state.phase === "INTRO") content = `<span class="opc-panel-icon">◎</span><h2>Oficina do PC</h2><p>Você não precisa conhecer todos os componentes. A oficina vai ensinar durante a montagem.</p><div class="opc-learning-path"><span>PEGAR</span><i>→</i><span>CONHECER</span><i>→</i><span>ENCAIXAR</span></div>${button("COMEÇAR →", "continue")}${state.installed.length ? "" : '<small>Uma oficina virtual, com conexões automáticas.</small>'}`;
    else if (state.phase === "TUTORIAL") content = `<h2>Quatro gestos</h2><div class="opc-control-list"><p><b>↔ ARRASTE</b> a peça até o encaixe.</p><p><b>↶ GIRE</b> arrastando o espaço vazio.</p><p><b>＋ ZOOM</b> com os botões ou a roda do mouse.</p><p><b>◎ CLIQUE</b> para conhecer a peça.</p></div><p class="opc-note">Também pode selecionar a peça e clicar no encaixe. O teclado funciona nos botões e na cena.</p>${button("VAMOS MONTAR →", "continue")}`;
    else if (state.phase === "CASE") content = `<h2>O espaço de cada peça</h2><p>${STEPS[0].explanation}</p><p class="opc-note">Observe o gabinete vazio e gire a câmera. O interior está aberto para facilitar a montagem.</p>${button("INSTALAR A PRIMEIRA PEÇA →", "continue")}`;
    else if (choices.length) {
      content = `<h2>Peças na bancada</h2><p class="opc-note">Clique em uma peça 3D ou escolha abaixo.</p><div class="opc-piece-list">${choices.map((id, index) => `<button type="button" data-component="${id}" class="${state.selectedId === id ? "is-selected" : ""}" aria-pressed="${state.selectedId === id}"${busy}><span>${String(index + 1).padStart(2, "0")}</span>${COMPONENTS[id].name}<i>${state.selectedId === id ? "✓" : "↗"}</i></button>`).join("")}</div>`;
      if (selected) content += `<div class="opc-fact"><span>CONHEÇA A PEÇA</span><h3>${selected.name}</h3><p>${escapeHtml(state.feedback || selected.purpose)}</p><button class="opc-text-button" type="button" data-action="examine"${busy}>EXAMINAR PEÇA ↗</button></div>`;
      if (expected && state.selectedId === expected) content += `${button(state.phase === "CONNECT_POWER" ? "ENCAIXAR NA TOMADA" : state.phase === "CONNECT_MOUSE" ? "ENCAIXAR NA PORTA USB" : "ENCAIXAR NO LOCAL INDICADO", "place")}<small>Ou arraste a própria peça até o encaixe destacado.</small>`;
      if (state.phase === "SELECT_SSD") content += button("INSTALAR SSD →", "ssd", state.selectedId !== "ssd");
      if (state.phase === "SELECT_RAM") content += `<p class="opc-note">O módulo na bancada tem maior capacidade e é compatível com este PC. A RAM retirada fica separada ao fundo.</p>${button("INSTALAR NOVA RAM →", "ram", state.selectedId !== "ram")}`;
    } else if (["CLIENT_ORDER", "RAM_ORDER", "MOUSE_ORDER"].includes(state.phase)) {
      const order = { CLIENT_ORDER: ["Lucas", "Meu computador está funcionando, mas quero que ele inicie e abra arquivos e programas mais rapidamente. Quero trocar meu HD por um SSD.", "Substitua o HD por um SSD."], RAM_ORDER: ["Sofia", "Quero usar vários programas ao mesmo tempo. Preciso trocar minha memória RAM por um módulo com maior capacidade.", "Substitua a RAM por um módulo compatível de maior capacidade."], MOUSE_ORDER: ["Marina", "Meu computador liga, mas o ponteiro não se move. Você pode verificar a conexão do mouse?", "Localize o mouse, conecte o cabo USB e teste o ponteiro."] }[state.phase];
      content = `<div class="opc-service-order"><span>CLIENTE</span><h2>${order[0]}</h2><blockquote>“${order[1]}”</blockquote><span>OBJETIVO</span><p><strong>${order[2]}</strong></p></div>${state.phase !== "MOUSE_ORDER" ? '<p class="opc-note">Ao iniciar, o PC será desligado e o cabo de energia desconectado.</p>' : ""}${button("INICIAR MANUTENÇÃO →", "continue")}`;
    } else if (["FIND_HDD", "FIND_RAM", "FIND_MOUSE"].includes(state.phase)) content = `<h2>Investigue as peças</h2><p class="opc-note">Observe o computador. A peça certa não será destacada antes da sua escolha.</p><div class="opc-piece-list opc-installed-list">${[...state.installed, "mouse"].map((id) => `<button type="button" data-component="${id}">${COMPONENTS[id].name}<i>↗</i></button>`).join("")}</div>${selected ? `<div class="opc-fact"><h3>${selected.name}</h3><p>${escapeHtml(state.feedback)}</p></div>` : ""}`;
    else if (["REMOVE_HDD", "REMOVE_RAM"].includes(state.phase)) { const id = state.phase === "REMOVE_HDD" ? "hdd" : "ram"; content = `<span class="opc-panel-icon">✓</span><h2>${COMPONENTS[id].name} encontrado!</h2><p>${COMPONENTS[id].characteristic}</p><p class="opc-note">Retire a peça arrastando para fora. Você também pode usar o botão abaixo.</p>${button(`RETIRAR ${id === "hdd" ? "HD" : "RAM"} PARA A BANCADA`, "remove")}`; }
    else if (["POWER_ON", "FINAL_TEST", "RAM_TEST"].includes(state.phase)) {
      content = state.powered ? `<span class="opc-panel-icon">✓</span><h2>Funcionando!</h2>` : `<h2>Ligue o computador</h2><p>O botão 3D fica no gabinete. Você também pode usar o botão abaixo.</p>${button("⏻ POWER", "power")}`;
      if (state.powered && state.phase === "FINAL_TEST") content += `<div class="opc-comparison"><span>SIMULAÇÃO ILUSTRATIVA</span><p><b>ANTES · HD</b><i class="opc-hdd-bar"></i></p><p><b>DEPOIS · SSD</b><i class="opc-ssd-bar"></i></p><small>Representação didática: um SSD normalmente permite inicialização e acesso aos dados mais rápidos que um HD.</small></div>`;
      if (state.powered && state.phase === "RAM_TEST") content += `<div class="opc-fact"><span>SIMULAÇÃO ILUSTRATIVA</span><h3>Nova memória reconhecida ✓</h3><p>Mais RAM permite manter mais dados de programas abertos na memória temporária. Ela não substitui o SSD.</p></div>`;
      if (state.powered) content += button(state.phase === "POWER_ON" ? "VER PEDIDO DO CLIENTE →" : "CONTINUAR →", "continue");
    } else if (state.phase === "MOUSE_TEST") content = `<h2>${state.mouseTested ? "Ponteiro funcionando ✓" : "Verifique a conexão"}</h2><p>Clique em testar e acompanhe o movimento do ponteiro no monitor 3D.</p>${button(state.mouseTested ? "CONTINUAR →" : "TESTAR MOVIMENTO DO MOUSE", state.mouseTested ? "continue" : "test-mouse")}`;
    else if (["FINAL_QUESTION", "RAM_QUESTION", "MOUSE_QUESTION"].includes(state.phase)) content = `<h2>${text.objective}</h2><div class="opc-answer-buttons">${button("SIM", "answer-yes")}${button("NÃO", "answer-no")}</div>${state.feedback ? `<p class="opc-note">${escapeHtml(state.feedback)}</p>` : ""}`;
    else if (["ASSEMBLED", "COMPLETED"].includes(state.phase)) {
      content = `<span class="opc-panel-icon">✓</span><h2>${state.phase === "COMPLETED" ? "Você aprendeu!" : "Todas as peças no lugar"}</h2>`;
      if (state.phase === "COMPLETED") content += `<ul class="opc-checklist"><li>Montar e conectar o PC à tomada</li><li>Substituir um HD por SSD</li><li>Trocar a memória RAM</li><li>Conectar e testar o mouse USB</li></ul><p class="opc-note">${FINAL_EXPLANATION}</p>`;
      content += `<div class="opc-installed-chips">${[...state.installed, "mouse"].map((id) => `<button type="button" data-inspect="${id}">${COMPONENTS[id].name}</button>`).join("")}</div>`;
      content += state.phase === "ASSEMBLED" ? button("VAMOS LIGAR →", "continue") : `${button("MONTAR NOVAMENTE", "reset")}<button class="opc-secondary" type="button" data-action="exploded"${busy}>${this.scene?.exploded ? "REMONTAR" : "VER COMPONENTES"}</button><a class="opc-return" href="#/">VOLTAR PARA CENTRAL →</a>`;
    }
    panel.innerHTML = content;
    if (focusedInPanel) {
      const replacement = focusKey ? panel.querySelector(`[data-${focusKey}="${focusValue}"]`) : null;
      if (replacement && !replacement.disabled) replacement.focus();
      else { const heading = panel.querySelector("h2"); if (heading) { heading.tabIndex = -1; heading.focus(); } }
    }
    this.announce(state.feedback);
  }
  announce(message) { const region = this.root?.querySelector("[data-feedback]"); if (region) region.textContent = message || "Arraste, gire e descubra."; }
  examine(id) {
    if (!id || !this.scene || this.state.motion || this.viewBusy) return;
    const part = COMPONENTS[id]; this.scene.examine(id);
    const overlay = this.root.querySelector("[data-overlay]"); overlay.hidden = false;
    overlay.innerHTML = `<article class="opc-examine"><span class="opc-kicker">EXAMINAR PEÇA · GIRE EM 360°</span><h2>${part.name}</h2><dl><dt>Função</dt><dd>${part.purpose}</dd><dt>Onde fica</dt><dd>${part.location}</dd><dt>Característica</dt><dd>${part.characteristic}</dd></dl><button class="opc-primary" type="button" data-action="back-examine">VOLTAR PARA MONTAGEM</button></article>`;
    this.root.querySelector("[data-panel]").inert = true; this.root.querySelector("[data-action='back-examine']").focus();
  }
  closeExamine() { this.scene?.closeExamine(); this.root.querySelector("[data-overlay]").hidden = true; this.root.querySelector("[data-panel]").inert = false; this.root.querySelector("[data-action='examine']")?.focus(); }
  showError(message) {
    const overlay = this.root.querySelector("[data-overlay]"); overlay.hidden = false;
    overlay.innerHTML = `<article class="opc-error" role="alert"><h2>Experiência 3D indisponível</h2><p>${escapeHtml(message)}</p><a class="opc-primary" href="#/">VOLTAR PARA CENTRAL</a></article>`;
    this.root.querySelector("[data-panel]").inert = true;
  }
  updateOffline(detail) {
    const node = this.root?.querySelector("[data-offline-status]");
    if (node) {
      node.textContent = detail.label; node.dataset.state = detail.state;
      this.root.querySelector("[data-action='retry-offline']").hidden = detail.state !== "error";
      const progress = this.root.querySelector("[data-load-progress]"); progress.hidden = detail.state !== "preparing";
      if (detail.state === "ready" && this.scene) progress.value = 4;
    }
  }
  updateSoundButton() { const button = this.root?.querySelector("[data-action='sound']"); if (button) { button.textContent = this.sound ? "♫ Som" : "♪ Mudo"; button.setAttribute("aria-pressed", String(this.sound)); } }
  getAudio() {
    if (!this.sound) return null;
    try { const Audio = this.host.AudioContext || this.host.webkitAudioContext; if (!Audio) return null; this.audio ||= new Audio(); this.audio.resume?.(); return this.audio; } catch { return null; }
  }
  playSound(kind) {
    const audio = this.getAudio(); if (!audio) return;
    try {
      const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
      oscillator.type = kind === "ram" ? "triangle" : "sine"; oscillator.frequency.setValueAtTime(({ select: 440, ram: 1100, snap: 730, power: 240 })[kind] || 440, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "power" ? 580 : 330, now + .16);
      gain.gain.setValueAtTime(.025, now); gain.gain.exponentialRampToValueAtTime(.001, now + .17);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(now + .18);
      this.nodes.add(oscillator); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.nodes.delete(oscillator); };
    } catch { /* Som é opcional. */ }
  }
  startFan() {
    if (this.fan || this.document.hidden) return;
    const audio = this.getAudio(); if (!audio) return;
    try {
      const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .08;
      const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
      filter.type = "lowpass"; filter.frequency.value = 250; gain.gain.value = .10; source.buffer = buffer; source.loop = true;
      source.connect(filter); filter.connect(gain); gain.connect(audio.destination); source.start(); this.fan = { source, filter, gain };
    } catch {}
  }
  stopFan() { if (this.fan) { try { this.fan.source.stop(); } catch {} this.fan.source.disconnect(); this.fan.filter.disconnect(); this.fan.gain.disconnect(); this.fan = null; } }
  reset() {
    this.motionEpoch++; this.viewBusy = false; this.stopFan();
    if (this.scene) { this.scene.tweens.forEach((tween) => tween.resolve(false)); this.scene.tweens = []; this.scene.cancelDrag(); if (this.scene.examining) this.closeExamine(); this.scene.exploded = false; }
    try { this.storage()?.removeItem(STORAGE_KEY); } catch {}
    this.state = createState(); this.render(); this.scene?.sync(this.state); this.scene?.navigation.overview(false, this.root.clientWidth < 700); this.root.querySelector("[data-action='continue']")?.focus();
  }
  leave() {
    if (!this.active) return;
    this.active = false; this.motionEpoch++; this.viewBusy = false; this.save(); this.listeners.forEach((remove) => remove()); this.listeners = [];
    this.interactions?.destroy(); this.interactions = null; this.scene?.destroy(); this.scene = null;
    this.stopFan(); this.nodes.forEach((node) => { try { node.stop(); } catch {} node.disconnect(); }); this.nodes.clear(); this.audio?.close?.(); this.audio = null;
    this.document.body.classList.remove("oficina-pc-active"); this.root.innerHTML = "";
  }
}
export const oficinaPcGame = new WorkshopGame();

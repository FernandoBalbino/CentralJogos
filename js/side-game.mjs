import {
  getAnswerLabel,
  getOptionsForItem,
  getQuestionForItem,
  sideGameItemMap,
  sideGameItems
} from "./side-game-data.mjs?v=1.0.1";
import {
  SIDE_GAME_STORAGE_KEY,
  buildWheelCandidates,
  calculateStopAngle,
  createSession,
  finishRound,
  formatTimer,
  isActionAllowed,
  markItemPresented,
  reconcileSession,
  reserveNextItem,
  smoothSpinEasing
} from "./side-game-core.mjs";

const iconPath = (name) => `./assets/side-game/icons/${name}.svg`;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);
const icon = (name, alt = "") => `<img src="${iconPath(name)}" alt="${escapeHtml(alt)}" aria-hidden="${alt ? "false" : "true"}">`;

const preloadImages = (sources) => Promise.all([...new Set(sources)].map((source) => new Promise((resolve) => {
  const image = new Image();
  image.addEventListener("load", resolve, { once: true });
  image.addEventListener("error", resolve, { once: true });
  image.src = source;
})));

class SideGameController {
  constructor() {
    this.root = null;
    this.stage = null;
    this.session = null;
    this.active = false;
    this.wheelReady = false;
    this.wheelData = null;
    this.wheelAngle = 0;
    this.spinFrame = 0;
    this.phaseTimeout = 0;
    this.timerFrame = 0;
    this.timerDeadline = 0;
    this.timerPaused = false;
    this.timerStarted = false;
    this.lastDisplayedSecond = null;
    this.lastBeepSecond = null;
    this.audioContext = null;
    this.dialogPausedTimer = false;
    this.boundKeydown = (event) => this.onKeydown(event);
  }

  mount(root) {
    if (this.root) return;
    this.root = root;
    this.root.innerHTML = `
      <div class="side-game-shell">
        <div class="side-game-grid" aria-hidden="true"></div>
        <header class="side-toolbar">
          <a class="side-logo" href="#/" aria-label="Voltar para a Central de Jogos">
            <span class="side-logo-mark">${icon("swap_horiz")}</span>
            <span><strong>Escolha seu lado</strong><small>Central de Jogos</small></span>
          </a>
          <div class="side-toolbar-actions">
            <button type="button" data-side-action="history">${icon("history")}<span>Histórico</span></button>
            <button type="button" data-side-action="settings">${icon("settings")}<span>Configurações</span></button>
            <button type="button" data-side-action="sound" aria-label="Alternar som">${icon("volume_up")}</button>
            <button type="button" data-side-action="fullscreen" aria-label="Alternar tela cheia">${icon("fullscreen")}</button>
          </div>
        </header>
        <main class="side-stage" tabindex="-1"></main>
        <dialog class="side-dialog" data-side-dialog="history" aria-labelledby="side-history-title">
          <div class="side-dialog-heading"><div><span>Registro da sessão</span><h2 id="side-history-title">Histórico</h2></div><button type="button" data-close-dialog="history" aria-label="Fechar">${icon("close")}</button></div>
          <div class="side-history-list"></div>
          <div class="side-dialog-actions"><button class="side-secondary-button" type="button" data-side-action="new-session">Nova sessão</button></div>
        </dialog>
        <dialog class="side-dialog" data-side-dialog="settings" aria-labelledby="side-settings-title">
          <div class="side-dialog-heading"><div><span>Preferências da atividade</span><h2 id="side-settings-title">Configurações</h2></div><button type="button" data-close-dialog="settings" aria-label="Fechar">${icon("close")}</button></div>
          <form class="side-settings-form" method="dialog">
            <fieldset><legend>Tempo para a escolha</legend><div class="side-duration-options">${[15, 30, 45, 60].map((duration) => `<label><input type="radio" name="duration" value="${duration}"><span>${duration}s</span></label>`).join("")}</div></fieldset>
            <label class="side-switch"><span><strong>Som da atividade</strong><small>Ticks da roleta e contagem final</small></span><input type="checkbox" name="sound"></label>
            <label class="side-switch"><span><strong>Mostrar explicações</strong><small>Exibe uma justificativa depois da resposta</small></span><input type="checkbox" name="explanations"></label>
            <div class="side-dialog-actions"><button class="side-primary-button" type="submit">Salvar configurações</button></div>
          </form>
        </dialog>
        <dialog class="side-dialog side-confirm-dialog" data-side-dialog="confirm" aria-labelledby="side-confirm-title">
          <div class="side-confirm-icon">${icon("restart_alt")}</div>
          <h2 id="side-confirm-title">Começar uma nova sessão?</h2>
          <p>O histórico e a ordem atual serão apagados. As configurações serão mantidas.</p>
          <div class="side-dialog-actions"><button class="side-secondary-button" type="button" data-close-dialog="confirm">Cancelar</button><button class="side-danger-button" type="button" data-confirm-new-session>Começar de novo</button></div>
        </dialog>
        <div class="side-live-region" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;
    this.stage = this.root.querySelector(".side-stage");
    this.bindShellEvents();
  }

  bindShellEvents() {
    this.root.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-side-action]");
      if (actionButton) this.handleAction(actionButton.dataset.sideAction);
      const closeButton = event.target.closest("[data-close-dialog]");
      if (closeButton) this.closeDialog(closeButton.dataset.closeDialog);
      if (event.target.closest("[data-confirm-new-session]")) this.newSession();
    });

    const settingsForm = this.root.querySelector(".side-settings-form");
    settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(settingsForm);
      this.session.settings.durationSeconds = Number(data.get("duration"));
      this.session.settings.soundEnabled = data.get("sound") === "on";
      this.session.settings.explanationsEnabled = data.get("explanations") === "on";
      if (this.session.currentPhase === "choosing") this.restartTimer(false);
      this.save();
      this.closeDialog("settings");
      this.render();
    });

    this.root.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener("close", () => {
        if (["settings", "history"].includes(dialog.dataset.sideDialog) && this.dialogPausedTimer && this.session?.currentPhase === "choosing" && this.timerPaused) {
          this.dialogPausedTimer = false;
          this.resumeTimer();
        }
      });
    });
  }

  enter() {
    this.active = true;
    document.addEventListener("keydown", this.boundKeydown);
    document.body.classList.add("side-game-active");
    this.session = this.loadSession();
    if (this.session.currentPhase === "spinning") this.session.currentPhase = "reveal";
    this.render();
  }

  leave() {
    this.active = false;
    document.removeEventListener("keydown", this.boundKeydown);
    document.body.classList.remove("side-game-active");
    this.clearAsyncWork();
    this.save();
  }

  loadSession() {
    try {
      return reconcileSession(JSON.parse(localStorage.getItem(SIDE_GAME_STORAGE_KEY)), sideGameItems);
    } catch {
      return createSession(sideGameItems);
    }
  }

  save() {
    if (!this.session) return;
    localStorage.setItem(SIDE_GAME_STORAGE_KEY, JSON.stringify(this.session));
  }

  clearAsyncWork() {
    cancelAnimationFrame(this.spinFrame);
    cancelAnimationFrame(this.timerFrame);
    clearTimeout(this.phaseTimeout);
    this.spinFrame = 0;
    this.timerFrame = 0;
    this.phaseTimeout = 0;
  }

  currentItem() {
    return sideGameItemMap.get(this.session.currentItemId || this.session.reservedItemId);
  }

  setPhase(phase) {
    this.clearAsyncWork();
    this.session.currentPhase = phase;
    this.save();
    this.render();
  }

  announce(message) {
    const liveRegion = this.root.querySelector(".side-live-region");
    liveRegion.textContent = "";
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  syncPhase() {
    if (!this.session || !this.root) return;
    this.root.dataset.phase = this.session.currentPhase;
    document.body.dataset.sidePhase = this.session.currentPhase;
  }

  render() {
    if (!this.active) return;
    const phase = this.session.currentPhase;
    this.syncPhase();
    document.title = "Escolha seu lado — Central de Jogos";
    this.renderToolbar();
    if (phase === "intro") this.renderIntro();
    if (phase === "wheel" || phase === "spinning") this.prepareWheel();
    if (phase === "reveal") this.renderReveal();
    if (phase === "choosing") this.renderChoosing();
    if (phase === "result") this.renderResult();
  }

  renderToolbar() {
    const soundButton = this.root.querySelector('[data-side-action="sound"]');
    soundButton.innerHTML = icon(this.session.settings.soundEnabled ? "volume_up" : "volume_off");
    soundButton.setAttribute("aria-label", this.session.settings.soundEnabled ? "Desativar som" : "Ativar som");
    soundButton.setAttribute("aria-pressed", String(this.session.settings.soundEnabled));
  }

  renderIntro() {
    this.syncPhase();
    this.stage.innerHTML = `
      <section class="side-intro-view">
        <div class="side-intro-copy">
          <span class="side-overline">Dinâmica para a turma toda</span>
          <h1>Veja o item.<br><em>Escolha seu lado.</em></h1>
          <p>A roleta sorteia um conceito. A turma observa a pergunta, se move para a resposta e só então revela o resultado.</p>
          <button class="side-primary-button side-large-button" type="button" data-side-action="start">Começar atividade ${icon("play_arrow")}</button>
          <small>Atalho: pressione <kbd>Espaço</kbd> para começar</small>
        </div>
        <div class="side-rules-card">
          <span class="side-card-number">02 modos automáticos</span>
          <article><span class="side-rule-index">01</span><div><h2>Peças, programas e conceitos</h2><p>Classifique por natureza: <strong>Hardware</strong>, <strong>Nenhum dos dois</strong> ou <strong>Software</strong>.</p></div></article>
          <article><span class="side-rule-index">02</span><div><h2>Periféricos</h2><p>Classifique pelo fluxo de dados: <strong>Entrada</strong>, <strong>Híbrido</strong> ou <strong>Saída</strong>.</p></div></article>
          <div class="side-position-map" aria-label="Posições mantidas durante toda a atividade"><span>${icon("arrow_back")} Esquerda</span><span>${icon("arrow_downward")} Centro</span><span>Direita ${icon("arrow_forward")}</span></div>
        </div>
      </section>
    `;
  }

  async prepareWheel() {
    if (!this.session.reservedItemId) reserveNextItem(this.session, sideGameItems);
    const targetId = this.session.reservedItemId;
    if (!this.wheelData || this.wheelData.targetId !== targetId) {
      const data = buildWheelCandidates(sideGameItems.map((item) => item.id), targetId, 12);
      this.wheelData = { ...data, targetId };
      this.wheelReady = false;
    }
    this.renderWheel();
    if (this.session.currentPhase === "spinning" || this.wheelReady) return;
    const token = targetId;
    await preloadImages(this.wheelData.ids.map((id) => sideGameItemMap.get(id).image));
    if (!this.active || this.session.currentPhase !== "wheel" || this.session.reservedItemId !== token) return;
    this.wheelReady = true;
    this.renderWheel();
  }

  renderWheel() {
    this.syncPhase();
    const spinning = this.session.currentPhase === "spinning";
    const candidates = this.wheelData?.ids || [];
    this.stage.innerHTML = `
      <section class="side-wheel-view">
        <div class="side-wheel-copy">
          <span class="side-overline">Ciclo ${this.session.cycle} · ${this.session.usedIds.length}/75 apresentados</span>
          <h1>${spinning ? "A roleta está escolhendo…" : "Quem será o próximo?"}</h1>
          <p>${spinning ? "Acompanhe a seta. O item já está reservado." : "Doze possibilidades na tela. Uma escolha justa, sem repetir até o fim do ciclo."}</p>
        </div>
        <div class="side-wheel-wrap" aria-label="Roleta com doze candidatos">
          <div class="side-wheel-pointer">${icon("navigation")}</div>
          <div class="side-wheel" style="--wheel-angle:${this.wheelAngle}deg">
            <div class="side-wheel-center"><span>${sideGameItems.length}</span><small>itens</small></div>
            ${candidates.map((id, index) => {
              const item = sideGameItemMap.get(id);
              const angle = (index * 30) + 15;
              return `<div class="side-wheel-card" style="--segment-angle:${angle}deg;--counter-angle:${-angle}deg"><div class="side-wheel-card-inner"><img src="${item.image}" alt=""><span>${escapeHtml(item.name)}</span></div></div>`;
            }).join("")}
          </div>
        </div>
        <div class="side-wheel-actions">
          <button class="side-primary-button side-spin-button" type="button" data-side-action="spin" ${!this.wheelReady || spinning ? "disabled" : ""}>${this.wheelReady ? `${icon("play_arrow")} Girar roleta` : "Carregando itens…"}</button>
          <small>Espaço para girar · 6 segundos</small>
        </div>
      </section>
    `;
  }

  spin() {
    if (!this.wheelReady || !isActionAllowed(this.session.currentPhase, "spin")) return;
    this.ensureAudio();
    this.session.currentPhase = "spinning";
    this.save();
    this.renderWheel();
    const start = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 500 : 6000;
    const startAngle = this.wheelAngle;
    const turns = reducedMotion ? 1 : 6 + Math.floor(Math.random() * 4);
    const endAngle = calculateStopAngle({
      startAngle,
      targetIndex: this.wheelData.targetIndex,
      segmentCount: this.wheelData.ids.length,
      turns
    });
    let lastSegment = Math.floor(startAngle / 30);

    const animate = (now) => {
      if (!this.active || this.session.currentPhase !== "spinning") return;
      const progress = Math.min(1, (now - start) / duration);
      this.wheelAngle = startAngle + ((endAngle - startAngle) * smoothSpinEasing(progress));
      this.stage.querySelector(".side-wheel")?.style.setProperty("--wheel-angle", `${this.wheelAngle}deg`);
      const currentSegment = Math.floor(this.wheelAngle / 30);
      if (currentSegment !== lastSegment) {
        lastSegment = currentSegment;
        this.beep(750, 0.018, 0.035);
      }
      if (progress < 1) {
        this.spinFrame = requestAnimationFrame(animate);
      } else {
        this.wheelAngle = endAngle;
        this.beginReveal();
      }
    };
    this.spinFrame = requestAnimationFrame(animate);
  }

  beginReveal() {
    const item = this.currentItem();
    markItemPresented(this.session, item.id);
    this.session.currentPhase = "reveal";
    this.save();
    this.beep(520, 0.11, 0.12);
    this.renderReveal();
  }

  renderReveal() {
    this.syncPhase();
    const item = this.currentItem();
    if (!item) {
      finishRound(this.session);
      this.save();
      this.render();
      return;
    }
    if (!this.session.usedIds.includes(item.id)) {
      markItemPresented(this.session, item.id);
      this.save();
    }
    this.stage.innerHTML = `
      <section class="side-reveal-view">
        <div class="side-reveal-orbit" aria-hidden="true"></div>
        <figure class="side-reveal-item">
          <div><img src="${item.image}" alt="${escapeHtml(item.alt)}"></div>
          <figcaption>${escapeHtml(item.name)}</figcaption>
        </figure>
      </section>
    `;
    clearTimeout(this.phaseTimeout);
    this.phaseTimeout = setTimeout(() => this.startChoosing(), 4000);
  }

  startChoosing() {
    if (this.session.currentPhase !== "reveal") return;
    this.session.currentPhase = "choosing";
    this.session.remainingSeconds = this.session.settings.durationSeconds;
    this.timerStarted = false;
    this.timerPaused = false;
    this.save();
    this.renderChoosing();
  }

  renderChoosing() {
    this.syncPhase();
    const item = this.currentItem();
    if (!item) return;
    const options = getOptionsForItem(item);
    this.stage.innerHTML = `
      <section class="side-choice-view ${this.timerPaused ? "is-paused" : ""}" data-mode="${item.mode}">
        <div class="side-choice-heading">
          <span class="side-overline">Escolha seu lado</span>
          <h1>${escapeHtml(getQuestionForItem(item))}</h1>
        </div>
        <div class="side-zones" aria-label="Opções de classificação">
          ${options.map((option) => `<article class="side-zone side-zone-${option.direction}" data-answer="${option.id}"><img class="side-zone-arrow" src="${iconPath(option.icon.replace(".svg", ""))}" alt=""><strong>${escapeHtml(option.label)}</strong><small>${option.direction === "left" ? "Lado esquerdo" : option.direction === "right" ? "Lado direito" : "Centro da sala"}</small></article>`).join("")}
        </div>
        <figure class="side-choice-item"><div><img src="${item.image}" alt="${escapeHtml(item.alt)}"></div><figcaption>${escapeHtml(item.name)}</figcaption></figure>
        <div class="side-timer-panel">
          <div class="side-timer" role="timer" aria-label="Tempo restante"><span data-timer-value>${formatTimer(this.session.remainingSeconds ?? this.session.settings.durationSeconds)}</span><small>tempo para escolher</small></div>
          <button type="button" data-side-action="pause" class="side-pause-button">${icon(this.timerPaused ? "play_arrow" : "pause")}<span>${this.timerPaused ? "Continuar" : "Pausar"}</span></button>
          <button type="button" data-side-action="reveal" class="side-reveal-button">Revelar resposta</button>
        </div>
      </section>
    `;
    if (!this.timerStarted) this.startTimer(this.session.remainingSeconds ?? this.session.settings.durationSeconds);
  }

  startTimer(seconds) {
    cancelAnimationFrame(this.timerFrame);
    this.timerStarted = true;
    this.timerPaused = false;
    this.lastDisplayedSecond = null;
    this.lastBeepSecond = null;
    this.timerDeadline = performance.now() + (Math.max(0, seconds) * 1000);
    const tick = (now) => {
      if (!this.active || this.session.currentPhase !== "choosing" || this.timerPaused) return;
      const remaining = Math.max(0, (this.timerDeadline - now) / 1000);
      this.session.remainingSeconds = remaining;
      const displaySecond = Math.ceil(remaining);
      if (displaySecond !== this.lastDisplayedSecond) {
        this.lastDisplayedSecond = displaySecond;
        this.updateTimerDisplay(displaySecond);
        if (displaySecond <= 5 && displaySecond >= 1 && displaySecond !== this.lastBeepSecond) {
          this.lastBeepSecond = displaySecond;
          this.beep(displaySecond <= 3 ? 880 : 660, 0.075, 0.12);
        }
        this.save();
      }
      if (remaining <= 0) {
        this.session.remainingSeconds = 0;
        this.revealAnswer();
        return;
      }
      this.timerFrame = requestAnimationFrame(tick);
    };
    this.timerFrame = requestAnimationFrame(tick);
  }

  updateTimerDisplay(seconds) {
    const timer = this.stage.querySelector(".side-timer");
    const value = this.stage.querySelector("[data-timer-value]");
    if (!timer || !value) return;
    value.textContent = formatTimer(seconds);
    timer.classList.toggle("is-tense", seconds <= 10);
    timer.classList.toggle("is-critical", seconds <= 3);
  }

  pauseTimer() {
    if (this.session.currentPhase !== "choosing") return;
    if (this.timerPaused) {
      this.resumeTimer();
      return;
    }
    this.timerPaused = true;
    cancelAnimationFrame(this.timerFrame);
    this.session.remainingSeconds = Math.max(0, (this.timerDeadline - performance.now()) / 1000);
    this.save();
    this.renderChoosing();
    this.announce("Cronômetro pausado.");
  }

  resumeTimer() {
    if (this.session.currentPhase !== "choosing") return;
    this.timerPaused = false;
    this.renderChoosing();
    this.startTimer(this.session.remainingSeconds ?? this.session.settings.durationSeconds);
    this.announce("Cronômetro retomado.");
  }

  restartTimer(render = true) {
    if (this.session.currentPhase !== "choosing") return;
    this.session.remainingSeconds = this.session.settings.durationSeconds;
    this.timerStarted = false;
    this.timerPaused = false;
    this.save();
    if (render) this.renderChoosing();
  }

  restartPresentation() {
    if (!["reveal", "choosing", "result"].includes(this.session.currentPhase)) return;
    this.clearAsyncWork();
    this.session.currentPhase = "reveal";
    this.session.remainingSeconds = this.session.settings.durationSeconds;
    this.timerStarted = false;
    this.timerPaused = false;
    this.dialogPausedTimer = false;
    this.save();
    this.renderReveal();
    this.announce("Apresentação do item reiniciada.");
  }

  revealAnswer() {
    if (!isActionAllowed(this.session.currentPhase, "reveal")) return;
    cancelAnimationFrame(this.timerFrame);
    this.session.currentPhase = "result";
    this.save();
    this.beep(440, 0.14, 0.16);
    this.renderResult();
  }

  resultSentence(item) {
    const label = getAnswerLabel(item).toLocaleLowerCase("pt-BR");
    if (item.mode === "peripheral") return `${item.name} é periférico de ${label}.`;
    if (item.answer === "neither") return `${item.name} não é hardware nem software.`;
    return `${item.name} é ${label}.`;
  }

  renderResult() {
    this.syncPhase();
    const item = this.currentItem();
    if (!item) return;
    const options = getOptionsForItem(item);
    this.stage.innerHTML = `
      <section class="side-result-view">
        <div class="side-result-heading"><span class="side-overline">Resposta revelada</span><h1>${escapeHtml(this.resultSentence(item))}</h1>${this.session.settings.explanationsEnabled ? `<p>${escapeHtml(item.explanation)}</p>` : ""}</div>
        <div class="side-result-layout">
          <figure class="side-result-item"><div><img src="${item.image}" alt="${escapeHtml(item.alt)}"></div><figcaption>${escapeHtml(item.name)}</figcaption></figure>
          <div class="side-result-options">${options.map((option) => `<div class="side-result-option ${option.id === item.answer ? "is-correct" : ""}" data-direction="${option.direction}">${option.id === item.answer ? icon("check_circle") : `<img src="${iconPath(option.icon.replace(".svg", ""))}" alt="">`}<span>${escapeHtml(option.label)}</span>${option.id === item.answer ? "<strong>Correto</strong>" : ""}</div>`).join("")}</div>
        </div>
        <div class="side-result-actions"><button class="side-primary-button" type="button" data-side-action="next">Próximo item ${icon("arrow_forward")}</button><small>Enter para continuar</small></div>
      </section>
    `;
  }

  nextRound() {
    if (!isActionAllowed(this.session.currentPhase, "next")) return;
    finishRound(this.session);
    this.wheelData = null;
    this.wheelReady = false;
    this.timerStarted = false;
    this.save();
    this.render();
  }

  handleAction(action) {
    this.ensureAudio();
    if (["fullscreen", "sound", "new-session"].includes(action) || isActionAllowed(this.session.currentPhase, action)) {
      if (action === "start") this.setPhase("wheel");
      if (action === "spin") this.spin();
      if (action === "advance" && this.session.currentPhase === "reveal") this.startChoosing();
      if (action === "reveal") this.revealAnswer();
      if (action === "pause") this.pauseTimer();
      if (action === "restart") this.restartPresentation();
      if (action === "next") this.nextRound();
      if (action === "history") this.openHistory();
      if (action === "settings") this.openSettings();
      if (action === "sound") this.toggleSound();
      if (action === "fullscreen") this.toggleFullscreen();
      if (action === "new-session") this.openDialog("confirm");
    }
  }

  openDialog(name) {
    this.root.querySelector(`[data-side-dialog="${name}"]`)?.showModal();
  }

  closeDialog(name) {
    this.root.querySelector(`[data-side-dialog="${name}"]`)?.close();
  }

  openHistory() {
    this.dialogPausedTimer = this.session.currentPhase === "choosing" && !this.timerPaused;
    if (this.dialogPausedTimer) this.pauseTimer();
    const list = this.root.querySelector(".side-history-list");
    if (!this.session.history.length) {
      list.innerHTML = `<div class="side-empty-history">${icon("history")}<p>Nenhum item apresentado nesta sessão.</p></div>`;
    } else {
      list.innerHTML = [...this.session.history].reverse().map((entry, index) => {
        const item = sideGameItemMap.get(entry.itemId);
        return `<article><span>${String(this.session.history.length - index).padStart(2, "0")}</span><img src="${item.image}" alt=""><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(getAnswerLabel(item))} · ciclo ${entry.cycle}</small></div></article>`;
      }).join("");
    }
    this.openDialog("history");
  }

  openSettings() {
    this.dialogPausedTimer = this.session.currentPhase === "choosing" && !this.timerPaused;
    if (this.dialogPausedTimer) this.pauseTimer();
    const form = this.root.querySelector(".side-settings-form");
    form.elements.duration.value = String(this.session.settings.durationSeconds);
    form.elements.sound.checked = this.session.settings.soundEnabled;
    form.elements.explanations.checked = this.session.settings.explanationsEnabled;
    this.openDialog("settings");
  }

  newSession() {
    const settings = { ...this.session.settings };
    this.clearAsyncWork();
    this.session = createSession(sideGameItems, Math.random, settings);
    this.wheelData = null;
    this.wheelReady = false;
    this.wheelAngle = 0;
    this.timerStarted = false;
    this.timerPaused = false;
    this.closeDialog("confirm");
    this.root.querySelector('[data-side-dialog="history"]')?.close();
    this.save();
    this.render();
    this.announce("Nova sessão iniciada.");
  }

  toggleSound() {
    this.session.settings.soundEnabled = !this.session.settings.soundEnabled;
    this.save();
    this.renderToolbar();
    if (this.session.settings.soundEnabled) this.beep(620, 0.05, 0.08);
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.root.requestFullscreen();
    } catch {
      this.announce("Não foi possível alternar a tela cheia neste navegador.");
    }
  }

  ensureAudio() {
    if (this.audioContext) {
      if (this.audioContext.state === "suspended") this.audioContext.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) this.audioContext = new AudioContext();
  }

  beep(frequency, duration = 0.05, volume = 0.08) {
    if (!this.session?.settings.soundEnabled || !this.audioContext) return;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  onKeydown(event) {
    if (!this.active || event.repeat) return;
    if (this.root.querySelector("dialog[open]") || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) {
      if (event.key === "Escape") this.root.querySelector("dialog[open]")?.close();
      return;
    }
    const key = event.key.toLowerCase();
    if (event.code === "Space") {
      event.preventDefault();
      if (this.session.currentPhase === "intro") this.handleAction("start");
      else if (this.session.currentPhase === "wheel") this.handleAction("spin");
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (this.session.currentPhase === "reveal") this.handleAction("advance");
      else if (this.session.currentPhase === "choosing") this.handleAction("reveal");
      else if (this.session.currentPhase === "result") this.handleAction("next");
    }
    if (key === "p") this.handleAction("pause");
    if (key === "f") this.handleAction("fullscreen");
    if (key === "m") this.handleAction("sound");
    if (key === "r") this.handleAction("restart");
  }
}

export const sideGame = new SideGameController();

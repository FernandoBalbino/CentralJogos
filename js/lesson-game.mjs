// Motor das atividades "aula animada + jogo de arrastar" (Tipos de SO, Internet das Coisas).
// Cada jogo passa sua configuração: dados, cenas SVG e textos. Estilos em tipos-so.css (classes ts-*).
import { createProgress, restoreProgress, isCorrect, nextStage, totalScore, countCards, starsFor, shuffle } from "./lesson-game-core.mjs";

const prefersReducedMotion = () => Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export class LessonGame {
  /**
   * config: { id, title, storageKey, types, logos?, lessons, phases, bonus?, scenes, timelines, hooks?,
   *           lessonsRequired?, intro: { tiles, title, text }, resultTitles: [3★, 2★, 1★] }
   * lessonsRequired = false: aula pensada para a TV (sem trava, tela cheia e setas); o jogo abre direto.
   */
  constructor(config, { storage, random = Math.random } = {}) {
    this.c = { logos: {}, hooks: {}, lessonsRequired: true, ...config };
    this.tv = !this.c.lessonsRequired;
    this.totalCards = countCards(this.c.phases);
    this.storageOverride = storage;
    this.random = random;
    this.active = false;
    this.timers = new Set();
    this.listeners = [];
  }

  mount(root) { this.root = root; }

  enter() {
    if (this.active || !this.root) return;
    this.active = true;
    try { this.storage = this.storageOverride || globalThis.localStorage; } catch { this.storage = null; }
    this.progress = restoreProgress(this.read(), this.c.lessons, this.c.phases, this.c.lessonsRequired);
    document.body.classList.add(`${this.c.id}-active`);
    this.listen(this.root, "click", (event) => this.onClick(event));
    this.listen(this.root, "pointerdown", (event) => this.onPointerDown(event));
    this.listen(document, "keydown", (event) => this.onKey(event));
    this.showIntro();
  }

  leave() {
    if (!this.active) return;
    this.active = false;
    this.clearTimers();
    this.listeners.forEach((remove) => remove());
    this.listeners = [];
    this.drag = null;
    document.body.classList.remove(`${this.c.id}-active`);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    this.root.innerHTML = "";
  }

  listen(target, type, handler) {
    target.addEventListener(type, handler);
    this.listeners.push(() => target.removeEventListener(type, handler));
  }

  later(callback, delay) {
    const id = setTimeout(() => { this.timers.delete(id); if (this.active) callback(); }, delay);
    this.timers.add(id);
    return id;
  }

  clearTimers() {
    this.timers.forEach((id) => clearTimeout(id));
    this.timers.clear();
  }

  read() { try { return this.storage?.getItem(this.c.storageKey); } catch { return null; } }
  save() { try { this.storage?.setItem(this.c.storageKey, JSON.stringify(this.progress)); } catch { /* Sem armazenamento a atividade continua em memória. */ } }
  stage() { return nextStage(this.progress, this.c.lessons, this.c.phases, this.c.lessonsRequired); }

  // Logo do sistema quando houver; senão, o emoji da carta.
  cardArt(card) {
    const logo = this.c.logos[card.logo];
    if (!logo) return card.icon;
    return logo.color
      ? `<span class="ts-logo is-mask" style="--logo:url('${logo.src}');--logo-color:${logo.color}"></span>`
      : `<img class="ts-logo" src="${logo.src}" alt="">`;
  }

  frame(step, content) {
    const steps = ["Aula", "Jogo", "Resultado"];
    this.root.innerHTML = `
      <div class="ts-app">
        <header class="ts-top">
          <a class="ts-back" href="#/"><span aria-hidden="true">←</span> Jogos</a>
          <strong class="ts-top-title">${this.c.title}</strong>
          <ol class="ts-steps" aria-label="Etapas">
            ${steps.map((label, index) => `<li class="${index < step ? "is-done" : index === step ? "is-current" : ""}"${index === step ? ' aria-current="step"' : ""}><span>${index < step ? "✓" : index + 1}</span>${label}</li>`).join("")}
          </ol>
        </header>
        <main class="ts-main">${content}</main>
      </div>`;
    globalThis.scrollTo?.(0, 0);
  }

  // ---------- Abertura ----------
  showIntro() {
    this.clearTimers();
    const stage = this.stage();
    const started = this.progress.lessonsDone > 0 || this.progress.scores.length > 0;
    const tiles = this.c.intro.tiles.map((tile, index) => `<li style="--c:${tile.color};--i:${index}"><span aria-hidden="true">${tile.icon}</span>${tile.label}</li>`).join("");
    const restart = started ? '<button class="ts-btn" type="button" data-action="restart">Recomeçar</button>' : "";
    let actions;
    if (this.tv) {
      const play = stage.screen === "result" ? "🏆 Ver resultado" : stage.index ? `🎮 Continuar fase ${stage.index + 1}` : "🎮 Jogar";
      actions = `<button class="ts-btn ts-btn-primary" type="button" data-action="continue">${play}</button><button class="ts-btn" type="button" data-action="lesson" data-index="0">📺 Aula animada (TV)</button>${restart}`;
    } else if (started) {
      const label = stage.screen === "lesson" ? `Continuar aula ${stage.index + 1}` : stage.screen === "phase" ? `Continuar fase ${stage.index + 1}` : "Ver resultado";
      actions = `<button class="ts-btn ts-btn-primary" type="button" data-action="continue">${label} <span aria-hidden="true">→</span></button>${restart}`;
    } else {
      actions = '<button class="ts-btn ts-btn-primary" type="button" data-action="lesson" data-index="0">▶ Começar a aula</button>';
    }
    this.frame(0, `
      <section class="ts-intro">
        <ul class="ts-intro-tiles">${tiles}</ul>
        <h1>${this.c.intro.title}</h1>
        <p>${this.c.intro.text}</p>
        <div class="ts-actions">${actions}</div>
      </section>`);
    this.root.querySelector(".ts-btn-primary")?.focus({ preventScroll: true });
  }

  // ---------- Aula ----------
  showLesson(index) {
    this.clearTimers();
    const { lessons, types, scenes } = this.c;
    this.lessonIndex = index;
    this.reaction = null;
    const lesson = lessons[index];
    const info = types[lesson.type] || lesson;
    const answered = index < this.progress.lessonsDone;
    const unlocked = this.tv ? lessons.length : this.progress.lessonsDone;
    const dots = lessons.map((item, dot) => `<button type="button" class="ts-dot${dot === index ? " is-current" : ""}${dot < this.progress.lessonsDone ? " is-done" : ""}" data-action="lesson" data-index="${dot}" aria-label="Aula ${dot + 1}: ${item.title}"${dot > unlocked ? " disabled" : ""}></button>`).join("");
    const isLast = index === lessons.length - 1;
    const nextLabel = isLast ? (this.tv ? "🎮 Ir para o jogo" : "Começar o jogo") : "Próxima aula";
    this.frame(0, `
      <section class="ts-lesson${this.tv ? " is-tv" : ""}" style="--type:${info.color || "#5b4bdb"}">
        <div class="ts-stage-wrap">
          <div class="ts-stage"><div class="ts-scene scene-${lesson.id}">${scenes[lesson.id]}</div></div>
          <div class="ts-stage-bar">
            <button class="ts-btn ts-btn-small" type="button" data-action="replay">↻ Ver de novo</button>
            ${this.tv ? '<button class="ts-btn ts-btn-small" type="button" data-action="fullscreen">⛶ Tela cheia</button><span class="ts-keys">← → mudam a aula</span>' : ""}
            ${lesson.experiment ? `<button class="ts-react" type="button" data-action="react" aria-live="polite"><b>⚡ Experimente:</b> seja o airbag! <span>Clique aqui para começar</span></button>` : ""}
          </div>
        </div>
        <article class="ts-panel">
          <div class="ts-dots" aria-label="Aulas">${dots}</div>
          <span class="ts-type-badge">${info.icon || "🧩"} Aula ${index + 1} de ${lessons.length}</span>
          <h1>${lesson.title}</h1>
          <p class="ts-lead">${lesson.lead}</p>
          <ul class="ts-points">${lesson.points.map((point) => `<li>${point}</li>`).join("")}</ul>
          ${lesson.examples?.length ? `<p class="ts-examples"><span>Exemplos</span>${lesson.examples.map((example) => `<b>${example}</b>`).join("")}</p>` : ""}
          <div class="ts-quiz">
            <p class="ts-quiz-q"><span>${this.tv ? "Pergunta para a turma" : "Pergunta rápida"}</span>${lesson.question.text}</p>
            <div class="ts-options">${lesson.question.options.map((option, optionIndex) => `<button type="button" class="ts-option${answered && option.correct ? " is-right" : ""}" data-action="answer" data-index="${optionIndex}"${answered ? " disabled" : ""}>${option.text}</button>`).join("")}</div>
            <p class="ts-quiz-feedback" role="status">${answered ? `✓ ${lesson.question.explain}` : ""}</p>
          </div>
          <div class="ts-nav">
            <button class="ts-btn" type="button" data-action="${index ? "lesson" : "intro"}" data-index="${index - 1}">← Voltar</button>
            <button class="ts-btn ts-btn-primary" type="button" data-action="${isLast ? "phase" : "lesson"}" data-index="${isLast ? 0 : index + 1}"${answered || this.tv ? "" : " disabled"}>${nextLabel} <span aria-hidden="true">→</span></button>
          </div>
        </article>
      </section>`);
    this.playScene();
  }

  playScene() {
    const scene = this.root.querySelector(".ts-scene");
    const id = this.c.lessons[this.lessonIndex]?.id;
    if (!scene || !id) return;
    const delays = this.c.timelines[id];
    const hook = this.c.hooks[id];
    scene.classList.add("is-resetting");
    delays.forEach((_, index) => scene.classList.remove(`s${index + 1}`));
    hook?.(scene, 0);
    void scene.getBoundingClientRect();
    scene.classList.remove("is-resetting");
    if (prefersReducedMotion()) {
      delays.forEach((_, index) => scene.classList.add(`s${index + 1}`));
      hook?.(scene, delays.length);
      return;
    }
    let step = 0;
    const advance = () => {
      if (step >= delays.length) { this.later(() => this.playScene(), 3200); return; }
      this.later(() => {
        step += 1;
        scene.classList.add(`s${step}`);
        hook?.(scene, step);
        advance();
      }, delays[step]);
    };
    advance();
  }

  // Resposta com tentativa livre: erro balança o botão, acerto mostra a explicação.
  quiz(question, button, optionIndex, { wrong, right }) {
    const option = question.options[optionIndex];
    const feedback = this.root.querySelector(".ts-quiz-feedback");
    if (!option || !feedback) return false;
    if (!option.correct) {
      button.classList.remove("is-wrong");
      void button.offsetWidth;
      button.classList.add("is-wrong");
      feedback.textContent = wrong;
      feedback.className = "ts-quiz-feedback is-bad";
      return false;
    }
    this.root.querySelectorAll(".ts-option").forEach((item) => { item.disabled = true; });
    button.classList.add("is-right");
    feedback.textContent = `✓ ${right}`;
    feedback.className = "ts-quiz-feedback is-good";
    return true;
  }

  answer(optionIndex, button) {
    const lesson = this.c.lessons[this.lessonIndex];
    if (!this.quiz(lesson.question, button, optionIndex, { wrong: "Ainda não. Olhe a animação e tente de novo.", right: lesson.question.explain })) return;
    this.progress.lessonsDone = Math.max(this.progress.lessonsDone, this.lessonIndex + 1);
    this.save();
    const next = this.root.querySelector(".ts-nav .ts-btn-primary");
    if (next) { next.disabled = false; next.focus({ preventScroll: true }); }
    if (!this.tv) this.root.querySelectorAll(".ts-dot").forEach((dot, index) => { dot.disabled = index > this.progress.lessonsDone; });
  }

  // Mini-teste de reação da aula de tempo real (Tipos de SO): por que um humano não garante 30 ms.
  react() {
    const button = this.root.querySelector(".ts-react");
    if (!button) return;
    const label = button.querySelector("span");
    const state = this.reaction?.state;
    if (state === "waiting") {
      clearTimeout(this.reaction.timer);
      this.timers.delete(this.reaction.timer);
      this.reaction = { state: "idle" };
      button.className = "ts-react is-early";
      label.textContent = "Cedo demais! Espere ficar vermelho. Clique para tentar de novo.";
      return;
    }
    if (state === "go") {
      const elapsed = Math.round(performance.now() - this.reaction.start);
      this.reaction = { state: "idle" };
      button.className = "ts-react is-done";
      label.innerHTML = `Você levou <b>${elapsed} ms</b>. O airbag precisa de <b>30 ms</b>, sempre — por isso ele usa um SO de tempo real. Clique para repetir.`;
      return;
    }
    button.className = "ts-react is-waiting";
    label.textContent = "Espere… clique quando ficar VERMELHO!";
    const timer = this.later(() => {
      this.reaction = { state: "go", start: performance.now() };
      button.className = "ts-react is-go";
      label.textContent = "BATIDA! CLIQUE AGORA!";
    }, 1400 + this.random() * 2200);
    this.reaction = { state: "waiting", timer };
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // ---------- Jogo de arrastar ----------
  showPhase(index) {
    this.clearTimers();
    const { lessons, phases, types } = this.c;
    if (this.c.lessonsRequired && this.progress.lessonsDone < lessons.length) { this.showLesson(this.progress.lessonsDone); return; }
    const phase = phases[index];
    this.phaseIndex = index;
    this.deck = shuffle(phase.cards, this.random);
    this.cardIndex = 0;
    this.missed = new Set();
    this.firstTry = 0;
    this.busy = false;
    const bins = phase.bins.map((id) => {
      const info = types[id];
      return `<button type="button" class="ts-bin" data-bin="${id}" style="--c:${info.color}"><span class="ts-bin-head"><span class="ts-bin-icon" aria-hidden="true">${info.icon}</span><b>${info.label}</b><small>${info.desc}</small></span><span class="ts-bin-items" aria-hidden="true"></span></button>`;
    }).join("");
    this.frame(1, `
      <section class="ts-game${phase.bins.length > 2 ? " is-final" : ""}">
        <div class="ts-phase-head">
          <span class="ts-kicker">Fase ${index + 1} de ${phases.length}</span>
          <h1>${phase.title}</h1>
          <p class="ts-hint">💡 ${phase.hint}</p>
        </div>
        <div class="ts-deck">
          <span class="ts-counter" aria-live="polite"></span>
          <div class="ts-card-slot"></div>
          <p class="ts-tip">Arraste a carta até a caixa certa <span>ou clique na caixa</span></p>
        </div>
        <div class="ts-bins" style="--cols:${phase.bins.length}">${bins}</div>
        <p class="ts-feedback" role="status" aria-live="polite"></p>
      </section>`);
    this.renderCard();
  }

  renderCard() {
    const slot = this.root.querySelector(".ts-card-slot");
    const card = this.deck[this.cardIndex];
    if (!slot || !card) return;
    const final = this.c.phases[this.phaseIndex].bins.length > 2;
    this.root.querySelector(".ts-counter").textContent = `Carta ${this.cardIndex + 1} de ${this.deck.length}`;
    slot.innerHTML = `<div class="ts-card${final ? " is-scenario" : ""}" role="group" aria-label="Carta: ${escapeHtml(card.name)}${card.detail ? `. ${escapeHtml(card.detail)}` : ""}"><span class="ts-card-icon" aria-hidden="true">${this.cardArt(card)}</span><span class="ts-card-text"><strong>${escapeHtml(card.name)}</strong>${card.detail ? `<small>${escapeHtml(card.detail)}</small>` : ""}</span><span class="ts-grip" aria-hidden="true">⠿</span></div>`;
  }

  binAt(x, y) {
    return [...this.root.querySelectorAll(".ts-bin")].find((bin) => {
      const rect = bin.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });
  }

  onPointerDown(event) {
    const card = event.target.closest?.(".ts-card");
    if (!card || this.busy || event.button > 0) return;
    event.preventDefault();
    card.setPointerCapture?.(event.pointerId);
    this.drag = { card, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, over: null };
    const move = (moveEvent) => {
      if (!this.drag || moveEvent.pointerId !== this.drag.id) return;
      const dx = moveEvent.clientX - this.drag.x;
      const dy = moveEvent.clientY - this.drag.y;
      if (!this.drag.moved && Math.hypot(dx, dy) < 6) return;
      this.drag.moved = true;
      card.classList.add("is-dragging");
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-8, Math.min(8, dx / 25))}deg)`;
      const over = this.binAt(moveEvent.clientX, moveEvent.clientY);
      if (over !== this.drag.over) {
        this.drag.over?.classList.remove("is-over");
        over?.classList.add("is-over");
        this.drag.over = over;
      }
    };
    const end = (endEvent) => {
      if (!this.drag || endEvent.pointerId !== this.drag.id) return;
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", end);
      card.removeEventListener("pointercancel", end);
      const { over, moved } = this.drag;
      over?.classList.remove("is-over");
      card.classList.remove("is-dragging");
      this.drag = null;
      if (moved && over && endEvent.type === "pointerup") { this.place(over.dataset.bin, over); return; }
      card.style.transform = "";
      if (!moved) this.say("Arraste a carta até uma caixa — ou clique direto na caixa certa.", "");
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }

  place(binId, bin) {
    if (this.busy) return;
    const card = this.deck[this.cardIndex];
    const cardElement = this.root.querySelector(".ts-card");
    if (!card || !cardElement) return;
    const info = this.c.types[binId];
    if (!isCorrect(card, binId)) {
      this.missed.add(card.id);
      cardElement.style.transform = "";
      cardElement.classList.remove("is-wrong");
      bin.classList.remove("is-wrong");
      void cardElement.offsetWidth;
      cardElement.classList.add("is-wrong");
      bin.classList.add("is-wrong");
      this.later(() => bin.classList.remove("is-wrong"), 600);
      this.say(`Não é ${info.label} (${info.desc}). Tente outra caixa.`, "is-bad");
      return;
    }
    if (!this.missed.has(card.id)) this.firstTry += 1;
    this.busy = true;
    this.say(`✓ ${card.why}`, "is-good");
    const finish = () => {
      const chip = document.createElement("span");
      chip.className = "ts-chip";
      chip.innerHTML = this.cardArt(card);
      chip.title = card.name;
      bin.querySelector(".ts-bin-items").append(chip);
      bin.classList.add("is-right");
      this.later(() => bin.classList.remove("is-right"), 500);
      this.cardIndex += 1;
      this.busy = false;
      if (this.cardIndex >= this.deck.length) this.completePhase();
      else this.renderCard();
    };
    if (prefersReducedMotion() || !cardElement.animate) { finish(); return; }
    const from = cardElement.getBoundingClientRect();
    const to = bin.getBoundingClientRect();
    const current = cardElement.style.transform || "translate(0px, 0px)";
    const offset = this.dragOffset(cardElement);
    const tx = to.left + to.width / 2 - (from.left + from.width / 2) + offset.x;
    const ty = to.top + to.height / 2 - (from.top + from.height / 2) + offset.y;
    const animation = cardElement.animate(
      [{ transform: current, opacity: 1 }, { transform: `translate(${tx}px, ${ty}px) scale(.2)`, opacity: 0 }],
      { duration: 380, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }
    );
    animation.onfinish = () => { if (this.active) finish(); };
  }

  // Deslocamento já aplicado pelo arraste (para a carta voar a partir de onde foi solta).
  dragOffset(element) {
    const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(element.style.transform);
    return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
  }

  say(message, tone) {
    const feedback = this.root.querySelector(".ts-feedback");
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `ts-feedback ${tone}`;
  }

  completePhase() {
    const { phases, bonus } = this.c;
    const phase = phases[this.phaseIndex];
    this.progress.scores = [...this.progress.scores.slice(0, this.phaseIndex), this.firstTry];
    this.save();
    const last = this.phaseIndex === phases.length - 1;
    const perfect = this.firstTry === phase.cards.length;
    const next = !last ? ["phase", "Próxima fase"] : bonus ? ["bonus", "⭐ Questão especial"] : ["result", "Ver resultado"];
    this.root.querySelector(".ts-deck").innerHTML = `
      <div class="ts-done">
        <span class="ts-done-emoji" aria-hidden="true">${perfect ? "🏆" : "🎉"}</span>
        <h2>Fase concluída!</h2>
        <p><b>${this.firstTry} de ${phase.cards.length}</b> certas de primeira</p>
        <button class="ts-btn ts-btn-primary" type="button" data-action="${next[0]}" data-index="${this.phaseIndex + 1}">${next[1]} <span aria-hidden="true">→</span></button>
      </div>`;
    this.root.querySelector(".ts-done .ts-btn-primary")?.focus({ preventScroll: true });
  }

  // ---------- Questão especial (opcional) ----------
  showBonus() {
    const bonus = this.c.bonus;
    if (!bonus) { this.showResult(); return; }
    this.clearTimers();
    const note = bonus.note?.() || "";
    this.frame(1, `
      <section class="ts-bonus">
        <img class="ts-bonus-logo" src="${this.c.logos[bonus.logo]?.src}" alt="">
        <span class="ts-kicker">⭐ Questão especial</span>
        <h1>${bonus.title}</h1>
        ${note ? `<p class="ts-bonus-live">${note}</p>` : ""}
        <div class="ts-quiz">
          <p class="ts-quiz-q">${bonus.text}</p>
          <div class="ts-options">${bonus.options.map((option, index) => `<button type="button" class="ts-option" data-action="bonus-answer" data-index="${index}">${option.text}</button>`).join("")}</div>
          <p class="ts-quiz-feedback" role="status"></p>
        </div>
        <div class="ts-facts" hidden>
          <b>${bonus.factsTitle}</b>
          <ul>${bonus.facts.map((fact) => `<li>${fact}</li>`).join("")}</ul>
          <button class="ts-btn ts-btn-primary" type="button" data-action="result">Ver resultado <span aria-hidden="true">→</span></button>
        </div>
      </section>`);
  }

  bonusAnswer(index, button) {
    const bonus = this.c.bonus;
    if (!this.quiz(bonus, button, index, { wrong: bonus.wrong, right: bonus.right })) return;
    const facts = this.root.querySelector(".ts-facts");
    facts.hidden = false;
    facts.querySelector(".ts-btn-primary").focus({ preventScroll: true });
  }

  // ---------- Resultado ----------
  showResult() {
    this.clearTimers();
    const { phases, resultTitles } = this.c;
    if (this.progress.scores.length < phases.length) { this.showIntro(); return; }
    const score = totalScore(this.progress.scores);
    const stars = starsFor(score, this.totalCards);
    const rows = phases.map((phase, index) => {
      const value = this.progress.scores[index];
      return `<li><span>${phase.title}</span><span class="ts-bar"><i style="--w:${Math.round((value / phase.cards.length) * 100)}%"></i></span><b>${value}/${phase.cards.length}</b></li>`;
    }).join("");
    this.frame(2, `
      <section class="ts-result">
        <div class="ts-stars" aria-label="${stars} de 3 estrelas">${[1, 2, 3].map((star) => `<span class="${star <= stars ? "is-on" : ""}" style="--i:${star}">★</span>`).join("")}</div>
        <h1>${resultTitles[3 - stars]}</h1>
        <p class="ts-score"><b>${score}</b> de ${this.totalCards} certas de primeira</p>
        <ul class="ts-breakdown">${rows}</ul>
        <div class="ts-actions">
          <button class="ts-btn ts-btn-primary" type="button" data-action="replay-game">↻ Jogar de novo</button>
          <button class="ts-btn" type="button" data-action="lesson" data-index="0">Rever a aula</button>
          <a class="ts-btn" href="#/">Voltar aos jogos</a>
        </div>
      </section>`);
  }

  // ---------- Eventos ----------
  onClick(event) {
    const bin = event.target.closest?.(".ts-bin");
    if (bin && this.root.querySelector(".ts-card")) { this.place(bin.dataset.bin, bin); return; }
    const button = event.target.closest?.("[data-action]");
    if (!button || button.disabled) return;
    const index = Number(button.dataset.index);
    const lastLesson = this.c.lessons.length - 1;
    switch (button.dataset.action) {
      case "intro": this.showIntro(); break;
      case "lesson": this.showLesson(Math.max(0, Math.min(index, this.tv ? lastLesson : this.progress.lessonsDone, lastLesson))); break;
      case "continue": this.go(this.stage()); break;
      case "restart": this.progress = createProgress(); this.save(); if (this.tv) this.showIntro(); else this.showLesson(0); break;
      case "replay": this.playScene(); break;
      case "fullscreen": this.toggleFullscreen(); break;
      case "react": this.react(); break;
      case "answer": this.answer(index, button); break;
      case "phase": this.showPhase(Math.min(index, this.progress.scores.length)); break;
      case "bonus": this.showBonus(); break;
      case "bonus-answer": this.bonusAnswer(index, button); break;
      case "result": this.showResult(); break;
      case "replay-game": this.progress.scores = []; this.save(); this.showPhase(0); break;
      default: break;
    }
  }

  go(stage) {
    if (stage.screen === "lesson") this.showLesson(stage.index);
    else if (stage.screen === "phase") this.showPhase(stage.index);
    else this.showResult();
  }

  onKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // Aula na TV: setas ou passador de slides (PageUp/PageDown) mudam a aula.
    if (this.tv && this.root.querySelector(".ts-lesson")) {
      const step = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 }[event.key];
      const target = this.lessonIndex + (step || 0);
      if (step && target >= 0 && target < this.c.lessons.length) { event.preventDefault(); this.showLesson(target); }
      return;
    }
    // Teclas 1–4 escolhem a caixa (útil no Chromebook e com teclado).
    if (!this.root.querySelector(".ts-card")) return;
    const bin = [...this.root.querySelectorAll(".ts-bin")][Number(event.key) - 1];
    if (bin) { event.preventDefault(); this.place(bin.dataset.bin, bin); }
  }
}

import { TYPE_INFO, LOGOS, LESSONS, PHASES, BONUS, TOTAL_CARDS } from "./tipos-so-data.mjs";
import { STORAGE_KEY, createProgress, restoreProgress, isCorrect, nextStage, totalScore, starsFor, shuffle } from "./tipos-so-core.mjs";

const prefersReducedMotion = () => Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

// Cenas da aula: SVG estático + classes s1, s2… adicionadas pela linha do tempo (só transform/opacity no CSS).
const SCENES = {
  mono: `<svg viewBox="0 0 480 300" role="img" aria-label="Ana usa o computador. Bruno chega e precisa esperar Ana sair para usar.">
    <rect class="sv-floor" x="24" y="262" width="432" height="4" rx="2"/>
    <rect class="sv-desk" x="150" y="206" width="180" height="10" rx="4"/><rect class="sv-desk" x="162" y="216" width="8" height="46"/><rect class="sv-desk" x="310" y="216" width="8" height="46"/>
    <rect class="sv-shell" x="178" y="100" width="124" height="88" rx="10"/><rect class="sv-screen" x="186" y="108" width="108" height="72" rx="5"/><rect class="sv-shell" x="232" y="188" width="16" height="18"/>
    <g class="m-ana-screen"><circle cx="240" cy="132" r="11" fill="#ffb86b"/><text x="240" y="166" class="sv-t sv-t-light">Ana conectada</text></g>
    <g class="m-busy"><rect x="192" y="114" width="96" height="60" rx="6" fill="#e4532f"/><text x="240" y="140" class="sv-t sv-t-strong">Ocupado</text><text x="240" y="160" class="sv-t sv-t-light">1 usuário por vez</text></g>
    <g class="m-bruno-screen"><circle cx="240" cy="132" r="11" fill="#7cc6ff"/><text x="240" y="166" class="sv-t sv-t-light">Bruno conectado</text></g>
    <g class="m-ana"><circle cx="110" cy="168" r="18" fill="#ffb86b"/><path d="M80 262v-44a30 30 0 0 1 60 0v44z" fill="#ffb86b" opacity=".85"/><text x="110" y="288" class="sv-t sv-label">Ana</text></g>
    <g class="m-bruno"><circle cx="390" cy="168" r="18" fill="#7cc6ff"/><path d="M360 262v-44a30 30 0 0 1 60 0v44z" fill="#7cc6ff" opacity=".85"/><text x="390" y="288" class="sv-t sv-label">Bruno</text></g>
    <g class="m-bubble"><rect x="326" y="92" width="128" height="40" rx="14" class="sv-bubble"/><path d="M380 131l10 13 8-13z" class="sv-bubble"/><text x="390" y="118" class="sv-t sv-t-dark">Posso usar?</text></g>
  </svg>`,
  multi: `<svg viewBox="0 0 480 300" role="img" aria-label="Quatro pessoas se conectam ao mesmo servidor Linux ao mesmo tempo, cada uma com sua pasta.">
    <path class="u-link l1" d="M206 128 L100 78"/><path class="u-link l2" d="M274 128 L380 78"/><path class="u-link l3" d="M206 180 L100 214"/><path class="u-link l4" d="M274 180 L380 214"/>
    <g class="m-server"><rect x="204" y="94" width="72" height="116" rx="10" class="sv-shell"/>
      <rect x="214" y="108" width="52" height="14" rx="3" class="sv-slot"/><rect x="214" y="130" width="52" height="14" rx="3" class="sv-slot"/><rect x="214" y="152" width="52" height="14" rx="3" class="sv-slot"/>
      <circle cx="258" cy="115" r="3" class="sv-led"/><circle cx="258" cy="137" r="3" class="sv-led"/><circle cx="258" cy="159" r="3" class="sv-led"/>
      <text x="240" y="194" class="sv-t sv-t-dark">Linux</text></g>
    <text x="240" y="234" class="sv-t sv-label">Servidor</text>
    <text x="240" y="30" class="sv-t sv-count m-count">Conectados: 0</text>
    <g class="u u1"><circle cx="72" cy="50" r="14" fill="#ffb86b"/><rect x="50" y="70" width="44" height="26" rx="4" class="sv-laptop"/><text x="72" y="114" class="sv-t sv-label">Ana</text><g class="u-folder"><rect x="34" y="122" width="76" height="22" rx="7" class="sv-tag"/><text x="72" y="137" class="sv-t sv-t-tag">/home/ana</text></g></g>
    <g class="u u2"><circle cx="408" cy="50" r="14" fill="#7cc6ff"/><rect x="386" y="70" width="44" height="26" rx="4" class="sv-laptop"/><text x="408" y="114" class="sv-t sv-label">Bruno</text><g class="u-folder"><rect x="366" y="122" width="84" height="22" rx="7" class="sv-tag"/><text x="408" y="137" class="sv-t sv-t-tag">/home/bruno</text></g></g>
    <g class="u u3"><circle cx="72" cy="196" r="14" fill="#ff8fb1"/><rect x="50" y="216" width="44" height="26" rx="4" class="sv-laptop"/><text x="72" y="260" class="sv-t sv-label">Carla</text><g class="u-folder"><rect x="34" y="268" width="76" height="22" rx="7" class="sv-tag"/><text x="72" y="283" class="sv-t sv-t-tag">/home/carla</text></g></g>
    <g class="u u4"><circle cx="408" cy="196" r="14" fill="#9be38a"/><rect x="386" y="216" width="44" height="26" rx="4" class="sv-laptop"/><text x="408" y="260" class="sv-t sv-label">Davi</text><g class="u-folder"><rect x="370" y="268" width="76" height="22" rx="7" class="sv-tag"/><text x="408" y="283" class="sv-t sv-t-tag">/home/davi</text></g></g>
  </svg>`,
  real: `<svg viewBox="0 0 480 300" role="img" aria-label="Um computador comum pode atrasar sem problema. O airbag precisa inflar antes do prazo de 30 milissegundos.">
    <text x="28" y="38" class="sv-t sv-lane">💻 Computador comum: abrir um vídeo</text>
    <rect x="28" y="50" width="424" height="18" rx="9" class="sv-track"/><rect x="28" y="50" width="424" height="18" rx="9" class="r-fill-a"/>
    <text x="452" y="92" class="sv-t sv-end r-ok-a">1,2 s depois… tudo bem 🙂</text>
    <text x="28" y="134" class="sv-t sv-lane">🚗 Airbag: prazo de 30 ms</text>
    <rect x="28" y="146" width="424" height="18" rx="9" class="sv-track"/><rect x="28" y="146" width="424" height="18" rx="9" class="r-fill-b"/>
    <line x1="330" y1="138" x2="330" y2="172" class="r-deadline"/><text x="330" y="188" class="sv-t sv-t-mini">prazo</text>
    <rect x="364" y="200" width="10" height="72" rx="3" class="sv-wall"/>
    <g class="r-car"><path d="M198 228l22-24h70l24 24z" class="sv-car"/><rect x="170" y="226" width="176" height="34" rx="12" class="sv-car"/><circle cx="206" cy="262" r="12" class="sv-wheel"/><circle cx="310" cy="262" r="12" class="sv-wheel"/></g>
    <circle cx="262" cy="216" r="17" class="r-bag"/>
    <text x="372" y="214" class="sv-t r-boom">💥</text>
    <text x="420" y="246" class="sv-t sv-good r-check">✓ No prazo!</text>
  </svg>`,
  emb: `<svg viewBox="0 0 480 300" role="img" aria-label="Um raio-X passa por roteador, smart TV, smartwatch e máquina de lavar e mostra o pequeno sistema dentro de cada aparelho.">
    <g class="d d1"><line x1="54" y1="150" x2="46" y2="110" class="sv-antenna"/><line x1="100" y1="150" x2="108" y2="110" class="sv-antenna"/><rect x="34" y="150" width="86" height="36" rx="9" class="sv-device"/><circle cx="52" cy="176" r="3" class="sv-led"/><circle cx="64" cy="176" r="3" class="sv-led"/>
      <text x="77" y="222" class="sv-t sv-label">Roteador</text><text x="77" y="242" class="sv-t sv-t-mini e-task">distribui a internet</text><g transform="translate(64 155)"><g class="e-chip"><rect width="26" height="26" rx="4" class="sv-chip"/><text x="13" y="17" class="sv-t sv-t-chip">SO</text></g></g></g>
    <g class="d d2"><rect x="142" y="96" width="106" height="72" rx="6" class="sv-device"/><rect x="150" y="104" width="90" height="56" rx="3" class="sv-screen"/><rect x="186" y="168" width="18" height="16" class="sv-device"/><rect x="170" y="184" width="50" height="6" rx="3" class="sv-device"/>
      <text x="195" y="222" class="sv-t sv-label">Smart TV</text><text x="195" y="242" class="sv-t sv-t-mini e-task">só canais e vídeos</text><g transform="translate(182 119)"><g class="e-chip"><rect width="26" height="26" rx="4" class="sv-chip"/><text x="13" y="17" class="sv-t sv-t-chip">SO</text></g></g></g>
    <g class="d d3"><rect x="294" y="98" width="22" height="94" rx="8" class="sv-band"/><rect x="282" y="118" width="46" height="54" rx="13" class="sv-device"/>
      <text x="305" y="222" class="sv-t sv-label">Smartwatch</text><text x="305" y="242" class="sv-t sv-t-mini e-task">passos e avisos</text><g transform="translate(292 132)"><g class="e-chip"><rect width="26" height="26" rx="4" class="sv-chip"/><text x="13" y="17" class="sv-t sv-t-chip">SO</text></g></g></g>
    <g class="d d4"><rect x="364" y="94" width="84" height="98" rx="9" class="sv-device"/><line x1="370" y1="114" x2="442" y2="114" class="sv-antenna"/><circle cx="406" cy="152" r="26" class="sv-screen"/>
      <text x="406" y="222" class="sv-t sv-label">Lavadora</text><text x="406" y="242" class="sv-t sv-t-mini e-task">ciclo de lavagem</text><g transform="translate(393 139)"><g class="e-chip"><rect width="26" height="26" rx="4" class="sv-chip"/><text x="13" y="17" class="sv-t sv-t-chip">SO</text></g></g></g>
    <rect x="0" y="80" width="6" height="124" rx="3" class="e-scan"/>
    <text x="240" y="284" class="sv-t sv-good e-done">Cada aparelho tem um sistema escondido!</text>
  </svg>`,
  combo: `<svg viewBox="0 0 480 300" role="img" aria-label="Airbag: embarcado e tempo real. Servidor da escola: multiusuário. MS-DOS: monousuário.">
    <g class="c c1"><rect x="40" y="28" width="400" height="66" rx="16" class="sv-card"/><text x="64" y="68" class="sv-t sv-start sv-card-title">🚗 Airbag</text>
      <g class="c-tag ct1"><rect x="232" y="47" width="98" height="28" rx="14" fill="#d98a0b"/><text x="281" y="66" class="sv-t sv-t-pill">Embarcado</text></g>
      <g class="c-tag ct2"><rect x="336" y="47" width="92" height="28" rx="14" fill="#e4532f"/><text x="382" y="66" class="sv-t sv-t-pill">Tempo real</text></g></g>
    <g class="c c2"><rect x="40" y="117" width="400" height="66" rx="16" class="sv-card"/><text x="64" y="157" class="sv-t sv-start sv-card-title">🗄️ Servidor da escola</text>
      <g class="c-tag ct3"><rect x="322" y="136" width="106" height="28" rx="14" fill="#0d9f9a"/><text x="375" y="155" class="sv-t sv-t-pill">Multiusuário</text></g></g>
    <g class="c c3"><rect x="40" y="206" width="400" height="66" rx="16" class="sv-card"/><text x="64" y="246" class="sv-t sv-start sv-card-title">💾 MS-DOS</text>
      <g class="c-tag ct4"><rect x="320" y="225" width="108" height="28" rx="14" fill="#6c5ce7"/><text x="374" y="244" class="sv-t sv-t-pill">Monousuário</text></g></g>
  </svg>`
};

// Pausa (ms) antes de cada passo s1, s2…
const TIMELINES = {
  mono: [600, 1200, 2000, 1100],
  multi: [500, 700, 700, 700, 800],
  real: [400, 700, 250, 400, 1600],
  emb: [400, 490, 755, 700, 645, 700],
  combo: [300, 500, 400, 600, 400, 600, 400]
};

const STEP_HOOKS = {
  multi: (scene, step) => {
    const label = scene.querySelector(".m-count");
    if (label) label.textContent = step >= 5 ? "4 pessoas ao mesmo tempo!" : `Conectados: ${step}`;
  }
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

// Logo do sistema quando houver; senão, o emoji da carta.
const cardArt = (card) => {
  const logo = LOGOS[card.logo];
  if (!logo) return card.icon;
  return logo.color
    ? `<span class="ts-logo is-mask" style="--logo:url('${logo.src}');--logo-color:${logo.color}"></span>`
    : `<img class="ts-logo" src="${logo.src}" alt="">`;
};

export class TiposSoGame {
  constructor({ storage, random = Math.random } = {}) {
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
    this.progress = restoreProgress(this.read());
    document.body.classList.add("tipos-so-active");
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
    document.body.classList.remove("tipos-so-active");
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

  read() { try { return this.storage?.getItem(STORAGE_KEY); } catch { return null; } }
  save() { try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.progress)); } catch { /* Sem armazenamento a atividade continua em memória. */ } }

  frame(step, content) {
    const steps = ["Aula", "Jogo", "Resultado"];
    this.root.innerHTML = `
      <div class="ts-app">
        <header class="ts-top">
          <a class="ts-back" href="#/"><span aria-hidden="true">←</span> Jogos</a>
          <strong class="ts-top-title">Tipos de Sistemas Operacionais</strong>
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
    const stage = nextStage(this.progress);
    const started = this.progress.lessonsDone > 0;
    const continueLabel = stage.screen === "lesson" ? `Continuar aula ${stage.index + 1}` : stage.screen === "phase" ? `Continuar fase ${stage.index + 1}` : "Ver resultado";
    const tiles = ["mono", "multi", "real", "emb"].map((id, index) => `<li style="--c:${TYPE_INFO[id].color};--i:${index}"><span aria-hidden="true">${TYPE_INFO[id].icon}</span>${TYPE_INFO[id].label}</li>`).join("");
    this.frame(0, `
      <section class="ts-intro">
        <ul class="ts-intro-tiles">${tiles}</ul>
        <h1>Que tipo de sistema é esse?</h1>
        <p>Assista à aula animada e depois arraste cada sistema para o tipo certo.</p>
        <div class="ts-actions">
          ${started ? `<button class="ts-btn ts-btn-primary" type="button" data-action="continue">${continueLabel} <span aria-hidden="true">→</span></button><button class="ts-btn" type="button" data-action="restart">Recomeçar</button>` : `<button class="ts-btn ts-btn-primary" type="button" data-action="lesson" data-index="0">▶ Começar a aula</button>`}
        </div>
      </section>`);
    this.root.querySelector(".ts-btn-primary")?.focus({ preventScroll: true });
  }

  // ---------- Aula ----------
  showLesson(index) {
    this.clearTimers();
    this.lessonIndex = index;
    this.reaction = null;
    const lesson = LESSONS[index];
    const info = TYPE_INFO[lesson.type];
    const answered = index < this.progress.lessonsDone;
    const dots = LESSONS.map((item, dot) => `<button type="button" class="ts-dot${dot === index ? " is-current" : ""}${dot < this.progress.lessonsDone ? " is-done" : ""}" data-action="lesson" data-index="${dot}" aria-label="Aula ${dot + 1}: ${item.title}"${dot > this.progress.lessonsDone ? " disabled" : ""}></button>`).join("");
    const isLast = index === LESSONS.length - 1;
    this.frame(0, `
      <section class="ts-lesson" style="--type:${info?.color || "#5b4bdb"}">
        <div class="ts-stage-wrap">
          <div class="ts-stage"><div class="ts-scene scene-${lesson.id}">${SCENES[lesson.id]}</div></div>
          <div class="ts-stage-bar">
            <button class="ts-btn ts-btn-small" type="button" data-action="replay">↻ Ver de novo</button>
            ${lesson.experiment ? `<button class="ts-react" type="button" data-action="react" aria-live="polite"><b>⚡ Experimente:</b> seja o airbag! <span>Clique aqui para começar</span></button>` : ""}
          </div>
        </div>
        <article class="ts-panel">
          <div class="ts-dots" aria-label="Aulas">${dots}</div>
          <span class="ts-type-badge">${info ? `${info.icon} ` : "🧩 "}Aula ${index + 1} de ${LESSONS.length}</span>
          <h1>${lesson.title}</h1>
          <p class="ts-lead">${lesson.lead}</p>
          <ul class="ts-points">${lesson.points.map((point) => `<li>${point}</li>`).join("")}</ul>
          ${lesson.examples.length ? `<p class="ts-examples"><span>Exemplos</span>${lesson.examples.map((example) => `<b>${example}</b>`).join("")}</p>` : ""}
          <div class="ts-quiz">
            <p class="ts-quiz-q"><span>Pergunta rápida</span>${lesson.question.text}</p>
            <div class="ts-options">${lesson.question.options.map((option, optionIndex) => `<button type="button" class="ts-option${answered && option.correct ? " is-right" : ""}" data-action="answer" data-index="${optionIndex}"${answered ? " disabled" : ""}>${option.text}</button>`).join("")}</div>
            <p class="ts-quiz-feedback" role="status">${answered ? `✓ ${lesson.question.explain}` : ""}</p>
          </div>
          <div class="ts-nav">
            <button class="ts-btn" type="button" data-action="${index ? "lesson" : "intro"}" data-index="${index - 1}">← Voltar</button>
            <button class="ts-btn ts-btn-primary" type="button" data-action="${isLast ? "phase" : "lesson"}" data-index="${isLast ? 0 : index + 1}"${answered ? "" : " disabled"}>${isLast ? "Começar o jogo" : "Próxima aula"} <span aria-hidden="true">→</span></button>
          </div>
        </article>
      </section>`);
    this.playScene();
  }

  playScene() {
    const scene = this.root.querySelector(".ts-scene");
    const id = LESSONS[this.lessonIndex]?.id;
    if (!scene || !id) return;
    const delays = TIMELINES[id];
    scene.classList.add("is-resetting");
    delays.forEach((_, index) => scene.classList.remove(`s${index + 1}`));
    STEP_HOOKS[id]?.(scene, 0);
    void scene.getBoundingClientRect();
    scene.classList.remove("is-resetting");
    if (prefersReducedMotion()) {
      delays.forEach((_, index) => scene.classList.add(`s${index + 1}`));
      STEP_HOOKS[id]?.(scene, delays.length);
      return;
    }
    let step = 0;
    const advance = () => {
      if (step >= delays.length) { this.sceneTimer = this.later(() => this.playScene(), 3200); return; }
      this.sceneTimer = this.later(() => {
        step += 1;
        scene.classList.add(`s${step}`);
        STEP_HOOKS[id]?.(scene, step);
        advance();
      }, delays[step]);
    };
    advance();
  }

  answer(optionIndex, button) {
    const lesson = LESSONS[this.lessonIndex];
    const option = lesson.question.options[optionIndex];
    const feedback = this.root.querySelector(".ts-quiz-feedback");
    if (!option || !feedback) return;
    if (!option.correct) {
      button.classList.remove("is-wrong");
      void button.offsetWidth;
      button.classList.add("is-wrong");
      feedback.textContent = "Ainda não. Olhe a animação e tente de novo.";
      feedback.className = "ts-quiz-feedback is-bad";
      return;
    }
    this.root.querySelectorAll(".ts-option").forEach((item) => { item.disabled = true; });
    button.classList.add("is-right");
    feedback.textContent = `✓ ${lesson.question.explain}`;
    feedback.className = "ts-quiz-feedback is-good";
    this.progress.lessonsDone = Math.max(this.progress.lessonsDone, this.lessonIndex + 1);
    this.save();
    const next = this.root.querySelector(".ts-nav .ts-btn-primary");
    if (next) { next.disabled = false; next.focus({ preventScroll: true }); }
    this.root.querySelectorAll(".ts-dot").forEach((dot, index) => { dot.disabled = index > this.progress.lessonsDone; });
  }

  // Mini-teste de reação: mostra por que um humano (ou um sistema comum) não garante 30 ms.
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

  // ---------- Jogo de arrastar ----------
  showPhase(index) {
    this.clearTimers();
    if (this.progress.lessonsDone < LESSONS.length) { this.showLesson(this.progress.lessonsDone); return; }
    const phase = PHASES[index];
    this.phaseIndex = index;
    this.deck = shuffle(phase.cards, this.random);
    this.cardIndex = 0;
    this.missed = new Set();
    this.firstTry = 0;
    this.busy = false;
    const bins = phase.bins.map((id) => {
      const info = TYPE_INFO[id];
      return `<button type="button" class="ts-bin" data-bin="${id}" style="--c:${info.color}"><span class="ts-bin-head"><span class="ts-bin-icon" aria-hidden="true">${info.icon}</span><b>${info.label}</b><small>${info.desc}</small></span><span class="ts-bin-items" aria-hidden="true"></span></button>`;
    }).join("");
    this.frame(1, `
      <section class="ts-game${phase.bins.length > 2 ? " is-final" : ""}">
        <div class="ts-phase-head">
          <span class="ts-kicker">Fase ${index + 1} de ${PHASES.length}</span>
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
    const final = PHASES[this.phaseIndex].bins.length > 2;
    this.root.querySelector(".ts-counter").textContent = `Carta ${this.cardIndex + 1} de ${this.deck.length}`;
    slot.innerHTML = `<div class="ts-card${final ? " is-scenario" : ""}" role="group" aria-label="Carta: ${escapeHtml(card.name)}${card.detail ? `. ${escapeHtml(card.detail)}` : ""}"><span class="ts-card-icon" aria-hidden="true">${cardArt(card)}</span><span class="ts-card-text"><strong>${escapeHtml(card.name)}</strong>${card.detail ? `<small>${escapeHtml(card.detail)}</small>` : ""}</span><span class="ts-grip" aria-hidden="true">⠿</span></div>`;
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
    this.drag = { card, id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, moved: false, over: null };
    const move = (moveEvent) => {
      if (!this.drag || moveEvent.pointerId !== this.drag.id) return;
      const dx = moveEvent.clientX - this.drag.x;
      const dy = moveEvent.clientY - this.drag.y;
      if (!this.drag.moved && Math.hypot(dx, dy) < 6) return;
      this.drag.moved = true;
      this.drag.dx = dx;
      this.drag.dy = dy;
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
    const info = TYPE_INFO[binId];
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
      chip.innerHTML = cardArt(card);
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
    const phase = PHASES[this.phaseIndex];
    this.progress.scores = [...this.progress.scores.slice(0, this.phaseIndex), this.firstTry];
    this.save();
    const last = this.phaseIndex === PHASES.length - 1;
    const perfect = this.firstTry === phase.cards.length;
    this.root.querySelector(".ts-deck").innerHTML = `
      <div class="ts-done">
        <span class="ts-done-emoji" aria-hidden="true">${perfect ? "🏆" : "🎉"}</span>
        <h2>Fase concluída!</h2>
        <p><b>${this.firstTry} de ${phase.cards.length}</b> certas de primeira</p>
        <button class="ts-btn ts-btn-primary" type="button" data-action="${last ? "bonus" : "phase"}" data-index="${this.phaseIndex + 1}">${last ? "⭐ Questão especial" : "Próxima fase"} <span aria-hidden="true">→</span></button>
      </div>`;
    this.root.querySelector(".ts-done .ts-btn-primary")?.focus({ preventScroll: true });
  }

  // ---------- Questão especial: o Chromebook da turma ----------
  showBonus() {
    this.clearTimers();
    const onChromebook = /\bCrOS\b/.test(globalThis.navigator?.userAgent || "");
    this.frame(1, `
      <section class="ts-bonus">
        <img class="ts-bonus-logo" src="${LOGOS.chrome.src}" alt="Logo do ChromeOS">
        <span class="ts-kicker">⭐ Questão especial</span>
        <h1>O sistema do seu Chromebook</h1>
        ${onChromebook ? '<p class="ts-bonus-live">👀 Você está usando um Chromebook agora mesmo!</p>' : ""}
        <div class="ts-quiz">
          <p class="ts-quiz-q">${BONUS.text}</p>
          <div class="ts-options">${BONUS.options.map((option, index) => `<button type="button" class="ts-option" data-action="bonus-answer" data-index="${index}">${option.text}</button>`).join("")}</div>
          <p class="ts-quiz-feedback" role="status"></p>
        </div>
        <div class="ts-facts" hidden>
          <b>🤓 Curiosidades do ChromeOS</b>
          <ul>${BONUS.facts.map((fact) => `<li>${fact}</li>`).join("")}</ul>
          <button class="ts-btn ts-btn-primary" type="button" data-action="result">Ver resultado <span aria-hidden="true">→</span></button>
        </div>
      </section>`);
  }

  bonusAnswer(index, button) {
    const option = BONUS.options[index];
    const feedback = this.root.querySelector(".ts-quiz-feedback");
    if (!option || !feedback) return;
    if (!option.correct) {
      button.classList.remove("is-wrong");
      void button.offsetWidth;
      button.classList.add("is-wrong");
      feedback.textContent = BONUS.wrong;
      feedback.className = "ts-quiz-feedback is-bad";
      return;
    }
    this.root.querySelectorAll(".ts-option").forEach((item) => { item.disabled = true; });
    button.classList.add("is-right");
    feedback.textContent = "✓ Isso! O ChromeOS é multiusuário.";
    feedback.className = "ts-quiz-feedback is-good";
    const facts = this.root.querySelector(".ts-facts");
    facts.hidden = false;
    facts.querySelector(".ts-btn-primary").focus({ preventScroll: true });
  }

  // ---------- Resultado ----------
  showResult() {
    this.clearTimers();
    if (this.progress.scores.length < PHASES.length) { this.showIntro(); return; }
    const score = totalScore(this.progress.scores);
    const stars = starsFor(score);
    const message = stars === 3 ? "Você domina os tipos de SO!" : stars === 2 ? "Muito bem! Revise os que errou." : "Vale rever a aula e tentar de novo.";
    const rows = PHASES.map((phase, index) => {
      const value = this.progress.scores[index];
      return `<li><span>${phase.title}</span><span class="ts-bar"><i style="--w:${Math.round((value / phase.cards.length) * 100)}%"></i></span><b>${value}/${phase.cards.length}</b></li>`;
    }).join("");
    this.frame(2, `
      <section class="ts-result">
        <div class="ts-stars" aria-label="${stars} de 3 estrelas">${[1, 2, 3].map((star) => `<span class="${star <= stars ? "is-on" : ""}" style="--i:${star}">★</span>`).join("")}</div>
        <h1>${message}</h1>
        <p class="ts-score"><b>${score}</b> de ${TOTAL_CARDS} certas de primeira</p>
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
    switch (button.dataset.action) {
      case "intro": this.showIntro(); break;
      case "lesson": this.showLesson(Math.max(0, Math.min(index, this.progress.lessonsDone, LESSONS.length - 1))); break;
      case "continue": this.go(nextStage(this.progress)); break;
      case "restart": this.progress = createProgress(); this.save(); this.showLesson(0); break;
      case "replay": this.playScene(); break;
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

  // Teclas 1–4 escolhem a caixa (útil no Chromebook e com teclado).
  onKey(event) {
    if (!this.root.querySelector(".ts-card") || event.altKey || event.ctrlKey || event.metaKey) return;
    const bins = [...this.root.querySelectorAll(".ts-bin")];
    const bin = bins[Number(event.key) - 1];
    if (bin) { event.preventDefault(); this.place(bin.dataset.bin, bin); }
  }
}

export const tiposSoGame = new TiposSoGame();

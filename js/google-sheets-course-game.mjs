import { demoStepCount, googleSheetsFinalChallenge, googleSheetsLessons } from "./google-sheets-course-data.mjs";
import {
  GOOGLE_SHEETS_COURSE_STORAGE_KEY,
  courseStats,
  createInitialCourseState,
  createLessonProgress,
  createLessonSpreadsheetState,
  createSpreadsheetState,
  displayCellValue,
  indexToColumn,
  markLessonCompleteByTeacher,
  practiceMatches,
  rebuildDemoState,
  reduceSpreadsheet,
  resetLessonInState,
  sanitizeCourseState,
  updateFinalChallenge
} from "./google-sheets-course-core.mjs";

const ICONS = "./assets/side-game/icons";
const SHEETS_ASSETS = "./assets/google-sheets";
const TEACHER_PASSWORD_HASH = "6bbe9df04e5d43cb2db41c795b9a4f4d84349cf9e889597b310cf8fe13f6c59f";
const MENU_TARGET_HIGHLIGHT_MS = 220;
const MENU_OPEN_HOLD_MS = 1000;
const OPTION_HIGHLIGHT_MS = 500;
const OPTION_SETTLE_MS = 350;
const DEMO_SCROLL_SETTLE_MS = 260;

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
const icon = (name, alt = "") => `<img src="${ICONS}/${name}.svg" alt="${alt}">`;
const materialIcon = (name) => `<span class="gsh-ms" aria-hidden="true">${name}</span>`;
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const hashText = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

class GoogleSheetsCourseGame {
  constructor() {
    this.root = null;
    this.state = this.loadState();
    this.simulatorState = createLessonSpreadsheetState(this.state.currentLessonId);
    this.active = false;
    this.demoPlaying = false;
    this.demoRunId = 0;
    this.demoTarget = null;
    this.demoCaptionOverride = "";
    this.openMenu = null;
    this.openSubmenu = null;
    this.editingCell = null;
    this.rangeAnchor = null;
    this.rangeCurrent = null;
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
    this.teacherUnlocked = false;
    this.teacherOpen = false;
    this.teacherAuthOpen = false;
    this.teacherAuthError = "";
    this.teacherPreview = null;
    this.teacherChallengePreview = false;
    this.teacherModuleFilter = "all";
    this.confirmReset = false;
    this.handleClick = this.handleClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerOver = this.handlePointerOver.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
  }

  loadState() {
    try {
      return sanitizeCourseState(JSON.parse(localStorage.getItem(GOOGLE_SHEETS_COURSE_STORAGE_KEY)));
    } catch {
      return createInitialCourseState();
    }
  }

  saveState() {
    if (this.teacherPreview || this.teacherChallengePreview) return;
    try { localStorage.setItem(GOOGLE_SHEETS_COURSE_STORAGE_KEY, JSON.stringify(this.state)); } catch { /* armazenamento indisponível */ }
  }

  mount(root) {
    if (!root || this.root) return;
    this.root = root;
    root.addEventListener("click", this.handleClick);
    root.addEventListener("submit", this.handleSubmit);
    root.addEventListener("change", this.handleChange);
    root.addEventListener("keydown", this.handleKeydown);
    root.addEventListener("pointerdown", this.handlePointerDown);
    root.addEventListener("pointerover", this.handlePointerOver);
    root.addEventListener("pointerup", this.handlePointerUp);
    root.addEventListener("dblclick", this.handleDoubleClick);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    document.addEventListener("central-offline-status", this.handleOffline);
  }

  enter() {
    if (!this.root) return;
    this.active = true;
    document.body.classList.add("google-sheets-course-active");
    this.state = this.loadState();
    this.simulatorState = this.currentStage() === "watch"
      ? rebuildDemoState(this.currentLesson(), this.currentProgress().demoStep)
      : this.currentProgress().practiceState;
    this.render();
  }

  leave() {
    this.active = false;
    this.pauseDemo();
    this.openMenu = null;
    this.openSubmenu = null;
    this.teacherOpen = false;
    this.teacherAuthOpen = false;
    this.teacherPreview = null;
    this.teacherChallengePreview = false;
    document.body.classList.remove("google-sheets-course-active");
    const screen = document.getElementById("google-sheets-course-screen");
    if (document.fullscreenElement && (document.fullscreenElement === screen || screen?.contains(document.fullscreenElement))) document.exitFullscreen?.().catch(() => {});
  }

  offlineState() { return document.documentElement.dataset.offlineState || (navigator.onLine ? "preparing" : "error"); }
  offlineLabel() {
    if (this.offlineState() === "ready") return "Disponível offline";
    if (this.offlineState() === "error") return "Modo offline indisponível";
    return "Preparando modo offline…";
  }
  handleOffline() { if (this.active) this.render(); }

  requestCourseFullscreen() {
    const screen = document.getElementById("google-sheets-course-screen");
    if (!screen || document.fullscreenElement) return Promise.resolve(Boolean(document.fullscreenElement));
    if (!document.fullscreenEnabled || !screen.requestFullscreen) return Promise.resolve(false);
    return screen.requestFullscreen().then(() => true).catch(() => false);
  }

  handleFullscreenChange() {
    const button = this.root?.querySelector('[data-action="enter-fullscreen"]');
    if (button) button.hidden = Boolean(document.fullscreenElement);
  }

  currentLesson() {
    const id = this.teacherPreview?.lessonId || this.state.currentLessonId;
    return googleSheetsLessons.find((lesson) => lesson.id === id) || googleSheetsLessons[0];
  }
  currentProgress() { return this.teacherPreview?.progress || this.state.lessons[this.currentLesson().id]; }
  currentStage() { return this.teacherPreview?.stage || this.state.stage; }
  setStage(stage) {
    if (this.teacherPreview) this.teacherPreview.stage = stage;
    else { this.state.stage = stage; this.saveState(); }
    this.openMenu = null;
    this.openSubmenu = null;
    this.editingCell = null;
    this.simulatorState = stage === "watch" ? rebuildDemoState(this.currentLesson(), this.currentProgress().demoStep) : this.currentProgress().practiceState;
    this.render();
  }

  render() {
    if (!this.root || !this.active) return;
    if (this.teacherChallengePreview || this.state.view === "challenge") this.renderChallenge();
    else if (this.teacherPreview || this.state.view === "lesson") this.renderLesson();
    else if (this.state.view === "result") this.renderResult();
    else this.renderIntro();
  }

  topbar({ title = "Google Planilhas na Prática", showProgress = false, challenge = false } = {}) {
    const lessonIndex = googleSheetsLessons.findIndex((lesson) => lesson.id === this.currentLesson().id);
    const progress = challenge
      ? '<div class="gsc-course-progress" aria-label="Desafio final"><span>Desafio final</span><strong>Planilha completa</strong></div>'
      : showProgress ? `<div class="gsc-course-progress" aria-label="Aula ${lessonIndex + 1} de ${googleSheetsLessons.length}"><span>Aula ${lessonIndex + 1} de ${googleSheetsLessons.length}</span><strong>${escapeHtml(this.currentLesson().module)}</strong></div>` : "";
    return `<header class="gsc-topbar gsh-topbar">
      <a class="gsc-games-link" href="#/">${icon("arrow_back")}<span>Jogos</span></a>
      <div class="gsc-brand"><img class="gsh-course-logo" src="${SHEETS_ASSETS}/google-sheets.ico" alt=""><div><small>Curso interativo</small><strong>${escapeHtml(title)}</strong></div></div>
      ${progress}
      <div class="gsc-top-actions">
        ${showProgress || challenge ? `<button class="gsc-fullscreen-button" type="button" data-action="enter-fullscreen" ${document.fullscreenElement ? "hidden" : ""}>${icon("fullscreen")}<span>Entrar em tela cheia</span></button>` : ""}
        ${this.teacherPreview || this.teacherChallengePreview ? '<button class="gsc-teacher-button is-preview" type="button" data-action="exit-teacher-preview">Sair da prévia</button>' : `<button class="gsc-teacher-button" type="button" data-action="open-teacher" aria-haspopup="dialog">${icon("vpn_key")}<span>Modo Professor</span></button>`}
        <div class="gsc-offline" data-gs-offline data-state="${this.offlineState()}">${icon("wifi")}<span>${escapeHtml(this.offlineLabel())}</span><button type="button" data-action="retry-offline">Tentar novamente</button></div>
      </div>
    </header>`;
  }

  renderIntro() {
    const stats = courseStats(this.state);
    const started = stats.completedLessons > 0;
    this.root.innerHTML = `<div class="gsc-shell gsc-intro-shell gsh-shell">
      ${this.topbar()}
      <section class="gsc-intro gsh-intro">
        <section class="gsc-intro-copy">
          <span class="gsc-eyebrow"><i></i> Aprenda fazendo</span>
          <h1>Domine o básico do Google Planilhas.</h1>
          <p>Aprenda a preencher, organizar, formatar e calcular em uma planilha igual à usada no Chromebook.</p>
          <div class="gsc-intro-steps" aria-label="Etapas de cada aula"><span><b>1</b> Assista</span><span><b>2</b> Responda</span><span><b>3</b> Faça</span></div>
          <button class="gsc-primary" type="button" data-action="start-course">${icon("play_arrow")} ${started ? "Continuar treinamento" : "Começar treinamento"}</button>
          ${started ? `<p class="gsc-resume-note">${stats.completedLessons} de ${googleSheetsLessons.length} aulas concluídas neste Chromebook.</p>` : ""}
          <p class="gsc-save-note">${icon("check_circle")} Seu progresso fica salvo somente neste dispositivo.</p>
        </section>
        <section class="gsc-intro-simulator gsh-intro-simulator" aria-label="Prévia do simulador do Google Planilhas">
          ${this.renderSimulator(createSpreadsheetState(), "preview")}
          <div class="gsc-intro-badge gsh-intro-badge"><strong>30 aulas + desafio final</strong><span>Assista · Responda · Faça</span></div>
        </section>
      </section>
      ${this.teacherLayer()}
    </div>`;
  }

  renderLesson() {
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    const stage = this.currentStage();
    this.simulatorState = stage === "watch" ? rebuildDemoState(lesson, progress.demoStep) : progress.practiceState;
    this.root.innerHTML = `<div class="gsc-shell gsc-lesson-shell gsh-shell ${this.teacherPreview ? "is-teacher-preview" : ""}">
      ${this.topbar({ showProgress: true })}
      <section class="gsc-lesson-layout gsh-lesson-layout">
        <section class="gsc-simulator-column" aria-labelledby="gsh-simulator-title">
          <div class="gsc-simulator-heading"><div><span class="gsc-eyebrow"><i></i> ${stage === "practice" ? "Agora é com você" : "Observe a ação"}</span><h1 id="gsh-simulator-title">${escapeHtml(lesson.title)}</h1></div>${this.teacherPreview ? '<span class="gsc-preview-chip">Prévia sem salvar</span>' : ""}</div>
          <div data-simulator-host>${this.renderSimulator(this.simulatorState, stage === "practice" ? "practice" : "demo")}</div>
          ${stage === "watch" ? this.demoControls(lesson, progress) : ""}
        </section>
        <aside class="gsc-learning-panel">
          ${this.stepper(stage, progress)}
          <div class="gsc-stage-content" data-stage-content>${stage === "watch" ? this.watchPanel(lesson, progress) : stage === "question" ? this.questionPanel(lesson, progress) : this.practicePanel(lesson, progress)}</div>
        </aside>
      </section>
      ${this.teacherLayer()}
    </div>`;
  }

  stepper(stage, progress) {
    const items = [
      { id: "watch", label: "Assista", done: progress.watched },
      { id: "question", label: "Responda", done: progress.questionCompleted },
      { id: "practice", label: "Faça", done: progress.practiceCompleted }
    ];
    return `<ol class="gsc-stepper" aria-label="Progresso da aula">${items.map((item, index) => `<li class="${stage === item.id ? "is-active" : ""} ${item.done ? "is-done" : ""}"><span>${item.done ? "✓" : index + 1}</span><strong>${item.label}</strong></li>`).join("")}</ol>`;
  }

  keyboardAid(lesson) {
    if (!lesson.practice.keyboardAid) return "";
    const touchpad = lesson.practice.keyboardAid === "touchpad";
    return `<figure class="gsh-keyboard-aid" data-demo-target="${touchpad ? "touchpad-guide" : "keyboard-guide"}">
      <img src="${SHEETS_ASSETS}/${touchpad ? "chromebook-touchpad.webp" : "chromebook-keyboard.webp"}" alt="${touchpad ? "Touchpad de Chromebook com a tecla Ctrl indicada para selecionar células separadas" : "Teclado de Chromebook com Ctrl, setas, Tab e Enter destacados"}">
      <figcaption>${touchpad ? "Segure Ctrl e clique no touchpad." : "Use as teclas destacadas para navegar e trabalhar na grade."}</figcaption>
    </figure>`;
  }

  watchPanel(lesson, progress) {
    const total = demoStepCount(lesson.demo);
    return `<span class="gsc-stage-kicker">Etapa 1</span>
      <h2>Veja como fazer</h2>
      <p>${escapeHtml(lesson.explanation)}</p>
      ${this.keyboardAid(lesson)}
      <div class="gsc-observation-card"><strong>O que observar</strong><p data-demo-caption>${escapeHtml(this.demoCaptionOverride || (progress.demoStep ? lesson.demo.steps[Math.min(progress.demoStep - 1, total - 1)]?.text || lesson.demo.caption : lesson.objective))}</p><span data-demo-step>Passo ${Math.min(progress.demoStep, total)} de ${total}</span></div>
      ${progress.watched ? `<div class="gsc-stage-success" role="status"><strong>✓ Demonstração concluída</strong><p>${escapeHtml(lesson.demo.caption)}</p></div><button class="gsc-primary gsc-next-stage" type="button" data-action="go-question">Responder pergunta ${icon("arrow_forward")}</button>` : '<p class="gsc-stage-hint">Conclua a demonstração para liberar a pergunta.</p>'}`;
  }

  demoControls(lesson, progress) {
    const instruction = progress.demoStep === 0 && !progress.watched
      ? `<p class="gsc-play-instruction" role="status">${icon("play_arrow")} <span>Para começar esta aula, clique em <strong>${this.reducedMotion ? "Próximo passo" : "Reproduzir"}</strong>.</span></p>` : "";
    return `<div class="gsc-demo-launch">${instruction}<div class="gsc-demo-controls" role="group" aria-label="Controles da demonstração">
      ${this.reducedMotion ? `<button class="is-primary" type="button" data-action="next-demo-step" data-demo-label="Próximo passo">${icon("arrow_forward")}<span class="gsh-demo-label">Próximo passo</span></button><button type="button" data-action="previous-demo-step" data-demo-label="Voltar um passo"><span class="gsh-demo-label">Voltar um passo</span></button>` : `<button class="is-primary" type="button" data-action="toggle-demo" data-demo-label="${this.demoPlaying ? "Pausar" : "Reproduzir"}">${icon(this.demoPlaying ? "pause" : "play_arrow")}<span class="gsh-demo-label">${this.demoPlaying ? "Pausar" : "Reproduzir"}</span></button>`}
      <button type="button" data-action="repeat-demo" data-demo-label="Repetir">${icon("restart_alt")}<span class="gsh-demo-label">Repetir</span></button>
    </div></div>`;
  }

  questionPanel(lesson, progress) {
    const done = progress.questionCompleted;
    const incorrect = progress.incorrectAttempts > 0 && !done;
    return `<span class="gsc-stage-kicker">Etapa 2</span><h2>Responda</h2><p>${escapeHtml(lesson.question.prompt)}</p>
      <div class="gsc-question-options">${lesson.question.options.map((option, index) => `<button type="button" data-action="answer-question" data-answer="${index}" ${done ? "disabled" : ""}>${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</button>`).join("")}</div>
      ${done ? `<div class="gsc-stage-success" role="status"><strong>✓ Resposta correta</strong><p>${escapeHtml(lesson.question.explanation)}</p></div><button class="gsc-primary gsc-next-stage" type="button" data-action="go-practice">Ir para a prática ${icon("arrow_forward")}</button>` : incorrect ? `<div class="gsc-stage-feedback is-error" role="alert"><strong>Ainda não.</strong><p>${escapeHtml(lesson.question.hint)}</p></div>` : '<p class="gsc-stage-hint">Escolha uma alternativa para continuar.</p>'}`;
  }

  practicePanel(lesson, progress) {
    return `<span class="gsc-stage-kicker">Etapa 3</span><h2>Faça você mesmo</h2>
      <div class="gsc-task-card"><span>Sua tarefa</span><strong>${escapeHtml(lesson.practice.instruction)}</strong></div>
      ${this.keyboardAid(lesson)}
      ${progress.practiceCompleted ? `<div class="gsc-stage-success" role="status"><strong>✓ Prática concluída</strong><p>${escapeHtml(lesson.practice.successMessage)}</p></div><button class="gsc-primary gsc-next-stage" type="button" data-action="next-lesson">${lesson.id === googleSheetsLessons.length ? "Ir para o desafio final" : "Próxima aula"} ${icon("arrow_forward")}</button>` : '<div class="gsc-practice-feedback" role="status"><strong>Agora tente.</strong><p>Use o simulador. A etapa avança somente quando a ação pedida estiver correta.</p></div>'}`;
  }

  renderChallenge() {
    const preview = this.teacherChallengePreview;
    const progress = preview ? this.teacherChallengeProgress : this.state.finalChallenge;
    this.simulatorState = progress.state;
    this.root.innerHTML = `<div class="gsc-shell gsc-lesson-shell gsh-shell ${preview ? "is-teacher-preview" : ""}">
      ${this.topbar({ title: googleSheetsFinalChallenge.title, challenge: true })}
      <section class="gsc-lesson-layout gsh-lesson-layout">
        <section class="gsc-simulator-column"><div class="gsc-simulator-heading"><div><span class="gsc-eyebrow"><i></i> Desafio final</span><h1>Monte a planilha completa</h1></div>${preview ? '<span class="gsc-preview-chip">Prévia sem salvar</span>' : ""}</div><div data-simulator-host>${this.renderSimulator(progress.state, "challenge")}</div></section>
        <aside class="gsc-learning-panel"><span class="gsc-stage-kicker">Missão final</span><h2>${escapeHtml(googleSheetsFinalChallenge.title)}</h2><p>${escapeHtml(googleSheetsFinalChallenge.description)}</p>
          <ol class="gsc-challenge-checklist">${googleSheetsFinalChallenge.goals.map((goal) => `<li class="${progress.goals[goal.id] ? "is-done" : ""}"><span>${progress.goals[goal.id] ? "✓" : "○"}</span>${escapeHtml(goal.label)}</li>`).join("")}</ol>
          ${progress.completed ? '<div class="gsc-stage-success" role="status"><strong>✓ Desafio concluído</strong><p>Sua planilha reúne todos os recursos básicos da trilha.</p></div><button class="gsc-primary" type="button" data-action="finish-course">Ver resultado</button>' : '<p class="gsc-stage-hint">Os itens são marcados automaticamente enquanto você trabalha.</p>'}
        </aside>
      </section>${this.teacherLayer()}</div>`;
  }

  renderResult() {
    const stats = courseStats(this.state);
    this.root.innerHTML = `<div class="gsc-shell gsh-shell">${this.topbar({ title: "Trilha concluída" })}<main class="gsc-result"><span class="gsc-eyebrow"><i></i> Missão cumprida</span><h1>Você concluiu o Google Planilhas na Prática!</h1><p>Você aprendeu a organizar, formatar e calcular informações em uma planilha.</p><div class="gsc-stat-grid"><article><strong>30</strong><span>aulas concluídas</span></article><article><strong>${stats.accuracy}%</strong><span>de precisão</span></article><article><strong>10/10</strong><span>objetivos finais</span></article></div><div class="gsc-result-actions"><a class="gsc-primary" href="#/">Voltar aos jogos</a><button class="gsc-secondary" type="button" data-action="restart-course">Refazer a trilha</button></div></main>${this.teacherLayer()}</div>`;
  }

  renderSimulator(state, mode) {
    const columns = Math.min(state.columns, 14);
    const rows = Math.min(state.rows, 14);
    const activeCell = state.cells[state.activeCell];
    const columnHeaders = Array.from({ length: columns }, (_, index) => {
      const column = indexToColumn(index);
      const selected = state.selectedColumn === column || state.selectedCells.some((address) => address.startsWith(column));
      return `<button class="gsh-column-header ${selected ? "is-selected" : ""}" type="button" data-column="${column}" data-demo-target="column-header-${column}">${column}</button>`;
    }).join("");
    const gridRows = Array.from({ length: rows }, (_, rowIndex) => {
      const row = rowIndex + 1;
      const rowSelected = state.selectedRow === row || state.selectedCells.some((address) => address.endsWith(String(row)));
      const cells = Array.from({ length: columns }, (_, columnIndex) => {
        const address = `${indexToColumn(columnIndex)}${row}`;
        const cell = state.cells[address];
        const format = cell?.format || {};
        const selected = state.selectedCells.includes(address) || state.selectedRow === row || state.selectedColumn === indexToColumn(columnIndex);
        const active = state.activeCell === address;
        const style = `--cell-fill:${format.fillColor || "#fff"};--cell-color:${format.textColor || "#202124"};--cell-size:${format.fontSize || 10}px;--cell-align:${format.align || "left"}`;
        if (this.editingCell === address && mode !== "demo" && mode !== "preview") return `<div class="gsh-cell is-active" data-address="${address}" style="${style}"><input class="gsh-cell-editor" data-cell-editor="${address}" value="${escapeHtml(cell?.input || "")}" aria-label="Editar célula ${address}"></div>`;
        return `<button class="gsh-cell ${selected ? "is-selected" : ""} ${active ? "is-active" : ""} ${format.border === "all" ? "has-border" : ""}" type="button" data-cell="${address}" data-demo-target="cell-${address}" style="${style};font-weight:${format.bold ? 700 : 400};font-style:${format.italic ? "italic" : "normal"};text-decoration:${format.underline ? "underline" : "none"}" title="${address}">${escapeHtml(displayCellValue(cell))}</button>`;
      }).join("");
      return `<button class="gsh-row-header ${rowSelected ? "is-selected" : ""}" type="button" data-row="${row}" data-demo-target="row-header-${row}">${row}</button>${cells}`;
    }).join("");
    return `<section class="gsh-simulator" data-gsh-simulator data-mode="${mode}" tabindex="0" aria-label="Simulador do Google Planilhas">
      <div class="gsh-app-strip">${materialIcon("apps")}</div>
      <div class="gsh-document-header">
        <button class="gsh-logo-button" type="button" data-sim-action="identify-app" data-demo-target="sheets-mark" aria-label="Ícone do Google Planilhas"><img src="${SHEETS_ASSETS}/google-sheets.ico" alt=""></button>
        <div class="gsh-file-area"><div class="gsh-file-title"><span>Planilha sem título</span>${materialIcon("star")}</div><nav class="gsh-menu-bar" aria-label="Menus do Google Planilhas">${["Arquivo", "Editar", "Ver", "Inserir", "Formatar", "Dados", "Ferramentas", "Extensões", "Ajuda"].map((label) => `<button type="button" data-menu="${label.toLowerCase()}" ${label === "Inserir" ? 'data-demo-target="insert-menu"' : label === "Formatar" ? 'data-demo-target="format-menu"' : ""}>${label}</button>`).join("")}</nav></div>
        <button class="gsh-header-more" type="button" aria-label="Mais opções">${materialIcon("menu")}</button>
      </div>
      <div class="gsh-toolbar-scroll"><div class="gsh-toolbar" role="toolbar" aria-label="Barra de ferramentas">
        <button class="gsh-search-menus" type="button">${materialIcon("search")}<span>Menus</span></button>
        ${this.toolButton("undo", "Desfazer")}${this.toolButton("redo", "Refazer")}${this.toolButton("print", "Imprimir")}${this.toolButton("format_paint", "Copiar formatação")}
        <button type="button" class="gsh-zoom">100% ${materialIcon("arrow_drop_down")}</button><span class="gsh-divider"></span>
        <button type="button" data-sheet-event="format:number" data-format="currency" data-demo-target="currency" aria-label="Moeda">R$</button>
        <button type="button" data-sheet-event="format:number" data-format="percent" data-demo-target="percent" aria-label="Porcentagem">%</button>
        ${this.toolButton("decimal_decrease", "Diminuir casas decimais")}${this.toolButton("decimal_increase", "Aumentar casas decimais")}
        <button type="button" class="gsh-number-menu">123</button><span class="gsh-divider"></span>
        <button type="button" class="gsh-font-menu">Padrão ${materialIcon("arrow_drop_down")}</button>
        <button type="button" class="gsh-text-button" aria-label="Diminuir tamanho">−</button><button type="button" class="gsh-font-size" data-sheet-event="format:font-size" data-size="14" data-demo-target="font-size">${activeCell?.format?.fontSize || 10}</button><button type="button" class="gsh-text-button" aria-label="Aumentar tamanho">+</button>
        <button type="button" class="gsh-letter-button" data-sheet-event="format:style" data-style="bold" data-demo-target="bold" aria-label="Negrito"><b>B</b></button>
        <button type="button" class="gsh-letter-button" data-sheet-event="format:style" data-style="italic" data-demo-target="italic" aria-label="Itálico"><i>I</i></button>
        <button type="button" class="gsh-letter-button" data-sheet-event="format:style" data-style="underline" data-demo-target="underline" aria-label="Sublinhado"><u>S</u></button>
        <button type="button" class="gsh-color-button" data-menu="text-color" data-demo-target="text-color" aria-label="Cor do texto">A<span></span></button>
        <button type="button" data-menu="fill-color" data-demo-target="fill-color" aria-label="Cor de preenchimento">${materialIcon("format_color_fill")}</button>
        <button type="button" data-menu="borders" data-demo-target="borders" aria-label="Bordas">${materialIcon("grid_on")}</button>
        ${this.toolButton("select_all", "Mesclar células")}
        <button type="button" data-menu="align" data-demo-target="align" aria-label="Alinhamento">${materialIcon("format_align_left")}${materialIcon("arrow_drop_down")}</button>
        ${this.toolButton("vertical_align_bottom", "Alinhamento vertical")}${this.toolButton("wrap_text", "Quebra de texto")}${this.toolButton("text_rotation_none", "Rotação do texto")}
        <span class="gsh-divider"></span>${this.toolButton("link", "Inserir link")}${this.toolButton("add_comment", "Adicionar comentário")}${this.toolButton("insert_chart", "Inserir gráfico")}${this.toolButton("filter_alt", "Criar filtro")}${this.toolButton("table_view", "Tabelas")}${this.toolButton("functions", "Funções")}
      </div></div>
      <div class="gsh-formula-row"><button type="button" class="gsh-name-box" data-sim-action="identify-name-box" data-demo-target="name-box">${escapeHtml(state.activeCell)}${materialIcon("arrow_drop_down")}</button><span class="gsh-fx" aria-hidden="true">fx</span><input type="text" data-formula-input data-demo-target="formula-bar" aria-label="Barra de fórmulas" value="${escapeHtml(activeCell?.input || "")}"></div>
      <div class="gsh-grid-scroll" data-grid-scroll><div class="gsh-grid" style="--sheet-columns:${columns}"><div class="gsh-corner"></div>${columnHeaders}${gridRows}</div></div>
      ${this.renderMenus()}
      <div class="gsh-demo-cursor" aria-hidden="true"></div>
    </section>`;
  }

  toolButton(name, label) { return `<button type="button" aria-label="${label}" title="${label}">${materialIcon(name)}</button>`; }

  renderMenus() {
    if (!this.openMenu) return "";
    const item = (label, target, event = "", attrs = "", trailing = "") => `<button type="button" data-menu-option ${target ? `data-demo-target="${target}"` : ""} ${event ? `data-sheet-event="${event}"` : ""} ${attrs}>${label}${trailing}</button>`;
    let content = "";
    if (this.openMenu === "insert") content = `${item("Inserir 1 linha acima", "insert-row", "sheet:insert", 'data-kind="row"')}${item("Inserir 1 coluna à esquerda", "insert-column", "sheet:insert", 'data-kind="column"')}<hr>${item("Células", "")}${item("Gráfico", "")}`;
    else if (this.openMenu === "format") content = `${item("Tema", "")}<button type="button" data-submenu="number" data-demo-target="number-submenu">Número <span>›</span></button>${item("Texto", "")} ${item("Alinhamento", "")} ${item("Quebra de texto", "")}`;
    else if (this.openMenu === "text-color") content = `<p>Cor do texto</p><div class="gsh-palette">${item("Azul", "text-color-blue", "format:text-color", 'data-color="#1a73e8"')}${item("Preto", "", "format:text-color", 'data-color="#202124"')}</div>`;
    else if (this.openMenu === "fill-color") content = `<p>Cor de preenchimento</p><div class="gsh-palette">${item("Amarelo-claro", "fill-yellow", "format:fill-color", 'data-color="#fce8b2"')}${item("Verde-claro", "", "format:fill-color", 'data-color="#d9ead3"')}</div>`;
    else if (this.openMenu === "align") content = `${item("Esquerda", "", "format:align", 'data-align="left"')}${item("Centralizar", "align-center", "format:align", 'data-align="center"')}${item("Direita", "", "format:align", 'data-align="right"')}`;
    else if (this.openMenu === "borders") content = `${item("Todas as bordas", "border-all", "format:border", 'data-border="all"')}${item("Borda externa", "")}${item("Limpar bordas", "")}`;
    else content = `${item("Esta área não é necessária nesta missão.", "")}`;
    const submenu = this.openMenu === "format" && this.openSubmenu === "number" ? `<div class="gsh-menu-panel gsh-submenu" role="menu"><p>Formatos numéricos</p>${item("Moeda", "number-currency", "format:number", 'data-format="currency"')}${item("Porcentagem", "number-percent", "format:number", 'data-format="percent"')}${item("Número", "")}</div>` : "";
    return `<div class="gsh-menu-panel gsh-primary-menu" data-open-menu="${this.openMenu}" role="menu">${content}</div>${submenu}`;
  }

  demoCaption(lesson, progress) {
    if (this.demoCaptionOverride) return this.demoCaptionOverride;
    if (!progress.demoStep) return lesson.objective;
    return lesson.demo.steps[Math.min(progress.demoStep - 1, lesson.demo.steps.length - 1)]?.text || lesson.demo.caption;
  }

  async ensureDemoTargetVisible(target, instant = false) {
    if (!target) return null;
    let element = this.root.querySelector(`[data-demo-target="${CSS.escape(target)}"]`);
    if (!element) return null;
    element.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "nearest", inline: "center" });
    await wait(instant ? 0 : DEMO_SCROLL_SETTLE_MS);
    element = this.root.querySelector(`[data-demo-target="${CSS.escape(target)}"]`);
    return element;
  }

  setDemoHighlight(target) {
    this.root.querySelectorAll(".is-demo-target").forEach((item) => item.classList.remove("is-demo-target"));
    if (!target) return;
    this.root.querySelector(`[data-demo-target="${CSS.escape(target)}"]`)?.classList.add("is-demo-target");
  }

  refreshSimulator() {
    const host = this.root.querySelector("[data-simulator-host]");
    if (!host) return;
    const oldGrid = host.querySelector("[data-grid-scroll]");
    const oldToolbar = host.querySelector(".gsh-toolbar-scroll");
    const scroll = { gridLeft: oldGrid?.scrollLeft || 0, gridTop: oldGrid?.scrollTop || 0, toolbarLeft: oldToolbar?.scrollLeft || 0 };
    const mode = this.currentStage() === "practice" ? "practice" : this.state.view === "challenge" || this.teacherChallengePreview ? "challenge" : "demo";
    host.innerHTML = this.renderSimulator(this.simulatorState, mode);
    const grid = host.querySelector("[data-grid-scroll]");
    const toolbar = host.querySelector(".gsh-toolbar-scroll");
    if (grid) { grid.scrollLeft = scroll.gridLeft; grid.scrollTop = scroll.gridTop; }
    if (toolbar) toolbar.scrollLeft = scroll.toolbarLeft;
  }

  async executeDemoStep(step, instant = false) {
    if (step.action === "announce") {
      this.demoCaptionOverride = step.text || "";
      const caption = this.root.querySelector("[data-demo-caption]");
      if (caption) caption.textContent = this.demoCaptionOverride;
      if (!instant) await wait(320);
      return;
    }
    if (step.action === "wait") { if (!instant) await wait(step.duration || 350); return; }
    const target = await this.ensureDemoTargetVisible(step.target, instant);
    if (["move", "highlight"].includes(step.action)) {
      this.setDemoHighlight(step.target);
      const fallback = step.action === "highlight" ? MENU_TARGET_HIGHLIGHT_MS : 420;
      if (!instant) await wait(step.duration || fallback);
      return;
    }
    if (step.action === "open-menu") {
      this.openMenu = step.menu;
      this.openSubmenu = null;
      this.refreshSimulator();
      this.setDemoHighlight(step.target);
      return;
    }
    if (step.action === "open-submenu") {
      this.openSubmenu = step.menu;
      this.refreshSimulator();
      this.setDemoHighlight(step.target);
      return;
    }
    if (step.effect) {
      this.simulatorState = reduceSpreadsheet(this.simulatorState, step.effect);
      this.refreshSimulator();
    }
    this.setDemoHighlight(step.target);
    if (!instant) {
      const duration = step.action === "select-option" ? OPTION_HIGHLIGHT_MS + OPTION_SETTLE_MS : step.action === "click" || step.action === "key" || step.action === "type" ? OPTION_SETTLE_MS : 300;
      await wait(duration);
    }
    if (step.action === "select-option") { this.openMenu = null; this.openSubmenu = null; this.refreshSimulator(); }
  }

  async playDemo() {
    if (this.demoPlaying || this.reducedMotion) return;
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    this.demoPlaying = true;
    const runId = ++this.demoRunId;
    this.updateDemoButtons();
    while (this.demoPlaying && runId === this.demoRunId && progress.demoStep < demoStepCount(lesson.demo)) {
      const step = lesson.demo.steps[progress.demoStep];
      await this.executeDemoStep(step);
      if (!this.demoPlaying || runId !== this.demoRunId) break;
      progress.demoStep += 1;
      if (progress.demoStep >= demoStepCount(lesson.demo)) progress.watched = true;
      if (!this.teacherPreview) this.saveState();
      this.updateDemoProgress();
    }
    if (runId === this.demoRunId) {
      this.demoPlaying = false;
      this.updateDemoButtons();
      if (progress.watched) this.renderLesson();
    }
  }

  pauseDemo() { this.demoPlaying = false; this.demoRunId += 1; this.updateDemoButtons(); }
  updateDemoButtons() {
    const button = this.root?.querySelector('[data-action="toggle-demo"]');
    if (button) button.innerHTML = `${icon(this.demoPlaying ? "pause" : "play_arrow")} ${this.demoPlaying ? "Pausar" : "Reproduzir"}`;
  }
  updateDemoProgress() {
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    const count = this.root?.querySelector("[data-demo-step]");
    const caption = this.root?.querySelector("[data-demo-caption]");
    if (count) count.textContent = `Passo ${progress.demoStep} de ${demoStepCount(lesson.demo)}`;
    if (caption) caption.textContent = this.demoCaption(lesson, progress);
  }
  repeatDemo() {
    this.pauseDemo();
    const progress = this.currentProgress();
    progress.demoStep = 0; progress.watched = false;
    this.simulatorState = createLessonSpreadsheetState(this.currentLesson().id);
    this.demoCaptionOverride = ""; this.openMenu = null; this.openSubmenu = null;
    if (!this.teacherPreview) this.saveState();
    this.renderLesson();
    this.root.querySelector(this.reducedMotion ? '[data-action="next-demo-step"]' : '[data-action="toggle-demo"]')?.focus();
  }
  async nextDemoStep() {
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    if (progress.demoStep >= demoStepCount(lesson.demo)) return;
    await this.executeDemoStep(lesson.demo.steps[progress.demoStep], true);
    progress.demoStep += 1;
    progress.watched = progress.demoStep >= demoStepCount(lesson.demo);
    if (!this.teacherPreview) this.saveState();
    this.renderLesson();
    if (!progress.watched) this.root.querySelector('[data-action="next-demo-step"]')?.focus();
  }
  previousDemoStep() {
    const progress = this.currentProgress();
    progress.demoStep = Math.max(0, progress.demoStep - 1);
    progress.watched = false;
    this.simulatorState = rebuildDemoState(this.currentLesson(), progress.demoStep);
    if (!this.teacherPreview) this.saveState();
    this.renderLesson();
  }

  answerQuestion(index) {
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    if (progress.questionCompleted) return;
    progress.questionAttempts += 1;
    if (index === lesson.question.answer) {
      progress.questionCompleted = true;
      progress.questionCompletedByStudent = true;
    } else progress.incorrectAttempts += 1;
    if (!this.teacherPreview) this.saveState();
    this.renderLesson();
  }

  applySimulatorEvent(event) {
    const lesson = this.currentLesson();
    const challenge = this.state.view === "challenge" || this.teacherChallengePreview;
    if (challenge) {
      const progress = this.teacherChallengePreview ? this.teacherChallengeProgress : this.state.finalChallenge;
      const updated = updateFinalChallenge(progress, event);
      if (this.teacherChallengePreview) this.teacherChallengeProgress = updated;
      else { this.state.finalChallenge = updated; this.saveState(); }
      this.simulatorState = updated.state;
      this.renderChallenge();
      return;
    }
    if (this.currentStage() !== "practice") return;
    const progress = this.currentProgress();
    const previous = progress.practiceState;
    const next = reduceSpreadsheet(previous, event);
    progress.practiceState = next;
    this.simulatorState = next;
    if (practiceMatches(lesson, event, previous, next)) {
      progress.practiceCompleted = true;
      progress.completed = true;
      progress.completedByTeacher = false;
    }
    if (!this.teacherPreview) this.saveState();
    this.renderLesson();
  }

  simulatorPayload(button) {
    const type = button.dataset.sheetEvent;
    if (!type) return null;
    const payload = {};
    for (const key of ["style", "color", "align", "border", "kind", "format"]) if (button.dataset[key] != null) payload[key] = button.dataset[key];
    if (button.dataset.size) payload.size = Number(button.dataset.size);
    if (type === "format:style") payload.enabled = true;
    return { type, payload };
  }

  nextLesson() {
    if (this.teacherPreview) {
      const next = googleSheetsLessons.find((lesson) => lesson.id === this.currentLesson().id + 1);
      if (next) this.openTeacherPreview(next.id); else this.openTeacherChallenge();
      return;
    }
    const index = googleSheetsLessons.findIndex((lesson) => lesson.id === this.state.currentLessonId);
    if (index >= googleSheetsLessons.length - 1) {
      this.state.view = "challenge";
    } else {
      this.state.currentLessonId = googleSheetsLessons[index + 1].id;
      this.state.stage = "watch";
    }
    this.saveState();
    this.render();
    this.root.querySelector('[data-action="toggle-demo"], [data-action="next-demo-step"]')?.focus();
  }

  teacherLayer() {
    if (this.teacherAuthOpen) return `<div class="gsc-dialog-backdrop"><section class="gsc-teacher-dialog gsh-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="gsh-auth-title"><button class="gsc-dialog-close" type="button" data-action="close-teacher" aria-label="Fechar">×</button><span class="gsc-stage-kicker">Acesso restrito</span><h2 id="gsh-auth-title">Modo Professor</h2><p>Digite a senha para abrir as ferramentas do professor.</p><form class="gsc-teacher-auth-form" data-teacher-password-form><label for="gsh-teacher-password">Senha</label><input id="gsh-teacher-password" name="password" type="password" autocomplete="current-password" required autofocus>${this.teacherAuthError ? `<p class="gsc-auth-error" role="alert">${escapeHtml(this.teacherAuthError)}</p>` : ""}<button class="gsc-primary" type="submit">Entrar</button></form></section></div>`;
    if (!this.teacherOpen || !this.teacherUnlocked) return "";
    const stats = courseStats(this.state);
    const modules = [...new Set(googleSheetsLessons.map((lesson) => lesson.module))];
    const lessons = this.teacherModuleFilter === "all" ? googleSheetsLessons : googleSheetsLessons.filter((lesson) => lesson.module === this.teacherModuleFilter);
    return `<div class="gsc-dialog-backdrop"><section class="gsc-teacher-dialog gsh-teacher-dialog" role="dialog" aria-modal="true" aria-labelledby="gsh-teacher-title"><button class="gsc-dialog-close" type="button" data-action="close-teacher" aria-label="Fechar">×</button><span class="gsc-stage-kicker">Ferramentas da aula</span><h2 id="gsh-teacher-title">Modo Professor</h2><div class="gsc-teacher-summary"><span><strong>${stats.completedLessons}/30</strong> aulas</span><span><strong>${stats.accuracy}%</strong> precisão</span><span><strong>${stats.completedPractices}</strong> práticas</span></div>
      <div class="gsc-teacher-tools"><label>Filtrar módulo<select data-teacher-module-filter><option value="all">Todos os módulos</option>${modules.map((module) => `<option value="${escapeHtml(module)}" ${module === this.teacherModuleFilter ? "selected" : ""}>${escapeHtml(module)}</option>`).join("")}</select></label><button type="button" data-action="teacher-challenge">Abrir desafio final</button><button type="button" data-action="teacher-reset-course">${this.confirmReset ? "Confirmar limpeza" : "Limpar todo o progresso"}</button></div>
      <div class="gsc-teacher-lessons">${lessons.map((lesson) => { const progress = this.state.lessons[lesson.id]; return `<article><div><small>Aula ${lesson.id}</small><strong>${escapeHtml(lesson.title)}</strong><span>${progress.completed ? progress.completedByTeacher ? "Concluída pelo professor" : "Concluída pelo aluno" : "Pendente"}</span></div><div><button type="button" data-action="teacher-preview" data-lesson-id="${lesson.id}">Prévia</button>${progress.completed ? `<button type="button" data-action="teacher-reset-lesson" data-lesson-id="${lesson.id}">Reabrir</button>` : `<button type="button" data-action="teacher-complete-lesson" data-lesson-id="${lesson.id}">Marcar concluída</button>`}</div></article>`; }).join("")}</div></section></div>`;
  }

  openTeacherPreview(lessonId) {
    this.teacherOpen = false;
    this.teacherPreview = { lessonId, stage: "watch", progress: createLessonProgress(lessonId) };
    this.teacherChallengePreview = false;
    this.simulatorState = this.teacherPreview.progress.practiceState;
    this.renderLesson();
  }
  openTeacherChallenge() {
    this.teacherOpen = false;
    this.teacherPreview = null;
    this.teacherChallengePreview = true;
    this.teacherChallengeProgress = updateFinalChallenge({ state: createSpreadsheetState(), goals: {}, completed: false, completedAt: null }, { type: "cell:select", payload: { cell: "A1" } });
    this.renderChallenge();
  }

  async handleSubmit(event) {
    if (!event.target.matches("[data-teacher-password-form]")) return;
    event.preventDefault();
    const password = new FormData(event.target).get("password") || "";
    if (await hashText(password) === TEACHER_PASSWORD_HASH) {
      this.teacherUnlocked = true;
      this.teacherAuthOpen = false;
      this.teacherAuthError = "";
      this.teacherOpen = true;
    } else this.teacherAuthError = "Senha incorreta.";
    this.render();
    this.root.querySelector(this.teacherOpen ? "#gsh-teacher-title" : "#gsh-teacher-password")?.focus();
  }

  handleChange(event) {
    if (event.target.matches("[data-teacher-module-filter]")) { this.teacherModuleFilter = event.target.value; this.render(); return; }
    if (event.target.matches("[data-formula-input]")) {
      const input = event.target.value;
      const active = this.simulatorState.activeCell;
      const previous = this.simulatorState.cells[active]?.input || "";
      const type = input.startsWith("=") ? "formula:input" : previous ? "cell:edit" : "cell:input";
      this.applySimulatorEvent({ type, payload: { cell: active, input } });
      return;
    }
    if (event.target.matches("[data-cell-editor]")) {
      const address = event.target.dataset.cellEditor;
      const previous = this.simulatorState.cells[address]?.input || "";
      this.editingCell = null;
      this.applySimulatorEvent({ type: previous ? "cell:edit" : "cell:input", payload: { cell: address, input: event.target.value } });
    }
  }

  async handleClick(event) {
    if (event.target.matches("[data-formula-input]")) {
      if (this.currentLesson().id === 6) this.applySimulatorEvent({ type: "formula-bar:identify" });
      return;
    }
    const button = event.target.closest("button, a");
    if (!button || !this.root.contains(button)) return;
    const action = button.dataset.action;
    if (action === "start-course") {
      await this.requestCourseFullscreen();
      this.state.view = "lesson";
      const firstIncomplete = googleSheetsLessons.find((lesson) => !this.state.lessons[lesson.id].completed);
      this.state.currentLessonId = firstIncomplete?.id || 1;
      this.state.stage = this.state.lessons[this.state.currentLessonId].watched ? (this.state.lessons[this.state.currentLessonId].questionCompleted ? "practice" : "question") : "watch";
      this.saveState(); this.renderLesson();
      this.root.querySelector('[data-action="toggle-demo"], [data-action="next-demo-step"]')?.focus();
      return;
    }
    if (action === "enter-fullscreen") { await this.requestCourseFullscreen(); this.handleFullscreenChange(); return; }
    if (action === "retry-offline") { document.getElementById("retry-offline")?.click(); return; }
    if (action === "toggle-demo") { this.demoPlaying ? this.pauseDemo() : this.playDemo(); return; }
    if (action === "repeat-demo") { this.repeatDemo(); return; }
    if (action === "next-demo-step") { this.nextDemoStep(); return; }
    if (action === "previous-demo-step") { this.previousDemoStep(); return; }
    if (action === "go-question") { this.setStage("question"); return; }
    if (action === "answer-question") { this.answerQuestion(Number(button.dataset.answer)); return; }
    if (action === "go-practice") { this.setStage("practice"); return; }
    if (action === "next-lesson") { this.nextLesson(); return; }
    if (action === "finish-course") { if (!this.teacherChallengePreview) { this.state.view = "result"; this.saveState(); this.renderResult(); } return; }
    if (action === "restart-course") { this.state = createInitialCourseState(); this.saveState(); this.renderIntro(); return; }
    if (action === "open-teacher") { if (this.teacherUnlocked) this.teacherOpen = true; else this.teacherAuthOpen = true; this.teacherAuthError = ""; this.render(); this.root.querySelector("#gsh-teacher-password")?.focus(); return; }
    if (action === "close-teacher") { this.teacherOpen = false; this.teacherAuthOpen = false; this.teacherAuthError = ""; this.confirmReset = false; this.render(); return; }
    if (action === "teacher-preview") { this.openTeacherPreview(Number(button.dataset.lessonId)); return; }
    if (action === "teacher-challenge") { this.openTeacherChallenge(); return; }
    if (action === "exit-teacher-preview") { this.teacherPreview = null; this.teacherChallengePreview = false; this.teacherOpen = true; this.render(); return; }
    if (action === "teacher-complete-lesson") { this.state = markLessonCompleteByTeacher(this.state, Number(button.dataset.lessonId)); this.saveState(); this.render(); return; }
    if (action === "teacher-reset-lesson") { this.state = resetLessonInState(this.state, Number(button.dataset.lessonId)); this.saveState(); this.render(); return; }
    if (action === "teacher-reset-course") { if (!this.confirmReset) { this.confirmReset = true; this.render(); } else { this.state = createInitialCourseState(); this.saveState(); this.confirmReset = false; this.render(); } return; }

    if (button.dataset.menu) {
      this.openMenu = this.openMenu === button.dataset.menu ? null : button.dataset.menu;
      this.openSubmenu = null;
      this.refreshSimulator();
      return;
    }
    if (button.dataset.submenu) { this.openSubmenu = button.dataset.submenu; this.refreshSimulator(); return; }
    const sheetEvent = this.simulatorPayload(button);
    if (sheetEvent) { this.openMenu = null; this.openSubmenu = null; this.applySimulatorEvent(sheetEvent); return; }
    if (button.dataset.simAction === "identify-app") { this.applySimulatorEvent({ type: "app:identify" }); return; }
    if (button.dataset.simAction === "identify-name-box") { this.applySimulatorEvent({ type: "name-box:identify" }); return; }
    if (button.dataset.row) {
      this.applySimulatorEvent({ type: this.currentLesson().id === 2 ? "row:identify" : "row:select", payload: { row: Number(button.dataset.row) } }); return;
    }
    if (button.dataset.column) {
      this.applySimulatorEvent({ type: this.currentLesson().id === 3 ? "column:identify" : "column:select", payload: { column: button.dataset.column } }); return;
    }
    if (button.dataset.cell && !this.rangeAnchor) {
      if (event.ctrlKey) this.applySimulatorEvent({ type: "multi:select", payload: { cell: button.dataset.cell, ctrlKey: true } });
      else this.applySimulatorEvent({ type: this.currentLesson().id === 4 ? "cell:identify" : "cell:select", payload: { cell: button.dataset.cell } });
    }
  }

  handlePointerDown(event) {
    const cell = event.target.closest("[data-cell]");
    if (!cell || event.ctrlKey || this.currentStage() !== "practice") return;
    this.rangeAnchor = cell.dataset.cell;
    this.rangeCurrent = cell.dataset.cell;
  }
  handlePointerOver(event) {
    if (!this.rangeAnchor) return;
    const cell = event.target.closest("[data-cell]");
    if (cell) this.rangeCurrent = cell.dataset.cell;
  }
  handlePointerUp() {
    if (!this.rangeAnchor) return;
    const start = this.rangeAnchor;
    const end = this.rangeCurrent;
    this.rangeAnchor = null;
    this.rangeCurrent = null;
    if (start !== end) this.applySimulatorEvent({ type: "range:select", payload: { start, end } });
  }

  handleDoubleClick(event) {
    const cell = event.target.closest("[data-cell]");
    if (!cell || this.currentStage() !== "practice") return;
    event.preventDefault();
    this.editingCell = cell.dataset.cell;
    this.simulatorState.activeCell = cell.dataset.cell;
    this.refreshSimulator();
    this.root.querySelector(`[data-cell-editor="${CSS.escape(cell.dataset.cell)}"]`)?.focus();
  }

  handleKeydown(event) {
    if (event.key === "Escape") {
      if (this.teacherAuthOpen || this.teacherOpen) { event.preventDefault(); this.teacherAuthOpen = false; this.teacherOpen = false; this.teacherAuthError = ""; this.render(); }
      else if (this.openMenu) { this.openMenu = null; this.openSubmenu = null; this.refreshSimulator(); }
      return;
    }
    const editor = event.target.closest("input, select, textarea");
    if (editor?.matches("[data-formula-input], [data-cell-editor]")) {
      if (event.key === "Enter") { event.preventDefault(); editor.blur(); }
      return;
    }
    if (!event.target.closest("[data-gsh-simulator]")) return;
    if (event.ctrlKey && ["c", "x", "v"].includes(event.key.toLowerCase())) {
      event.preventDefault();
      const type = event.key.toLowerCase() === "c" ? "clipboard:copy" : event.key.toLowerCase() === "x" ? "clipboard:cut" : "clipboard:paste";
      this.applySimulatorEvent({ type, payload: type === "clipboard:paste" ? { target: this.simulatorState.activeCell } : {} });
      return;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Enter"].includes(event.key)) {
      event.preventDefault(); this.applySimulatorEvent({ type: "navigation:key", payload: { key: event.key } }); return;
    }
    if (["Backspace", "Delete"].includes(event.key)) {
      event.preventDefault(); this.applySimulatorEvent({ type: "cell:clear", payload: { cell: this.simulatorState.activeCell } }); return;
    }
    if (event.key.length === 1 && !event.altKey && !event.metaKey && !event.ctrlKey && this.currentStage() === "practice") {
      event.preventDefault();
      this.editingCell = this.simulatorState.activeCell;
      this.refreshSimulator();
      const input = this.root.querySelector(`[data-cell-editor="${CSS.escape(this.editingCell)}"]`);
      if (input) { input.value = event.key; input.focus(); input.setSelectionRange(1, 1); }
    }
  }
}

export const googleSheetsCourseGame = new GoogleSheetsCourseGame();

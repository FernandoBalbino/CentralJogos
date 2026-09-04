import { demoStepCount, googleSlidesFinalChallenge, googleSlidesLessons } from "./google-slides-course-data.mjs";
import {
  GOOGLE_SLIDES_COURSE_STORAGE_KEY,
  courseStats,
  createInitialCourseState,
  createFinalChallengeProgress,
  createLessonPresentationState,
  createLessonProgress,
  createPresentationState,
  markLessonCompleteByTeacher,
  practiceMatches,
  rebuildDemoState,
  reducePresentation,
  resetLessonInState,
  sanitizeCourseState,
  updateFinalChallenge
} from "./google-slides-course-core.mjs";

const ICONS = "./assets/side-game/icons";
const icon = (name, alt = "") => `<img src="${ICONS}/${name}.svg" alt="${alt}">`;
const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

class GoogleSlidesCourseGame {
  constructor() {
    this.root = null;
    this.active = false;
    this.state = this.loadState();
    this.bus = new EventTarget();
    this.simulatorState = createPresentationState();
    this.openMenu = null;
    this.demoPlaying = false;
    this.demoRunId = 0;
    this.questionFeedback = null;
    this.practiceMessage = "";
    this.practiceMessageKind = "guidance";
    this.teacherOpen = false;
    this.teacherConfirmReset = false;
    this.teacherPreview = null;
    this.teacherChallengePreview = null;
    this.teacherModuleFilter = "all";
    this.reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleCourseAction = this.handleCourseAction.bind(this);
    this.bus.addEventListener("course-action", this.handleCourseAction);
  }

  loadState() {
    try {
      return sanitizeCourseState(JSON.parse(localStorage.getItem(GOOGLE_SLIDES_COURSE_STORAGE_KEY)));
    } catch {
      return createInitialCourseState();
    }
  }

  saveState() {
    if (this.teacherPreview || this.teacherChallengePreview) return;
    try {
      localStorage.setItem(GOOGLE_SLIDES_COURSE_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn("Não foi possível salvar o progresso de Google Apresentações na Prática.", error);
    }
  }

  mount(root) {
    this.root = root;
    this.root?.addEventListener("click", this.handleClick);
    this.root?.addEventListener("keydown", this.handleKeydown);
    this.root?.addEventListener("change", this.handleChange);
    document.addEventListener("central-offline-status", (event) => {
      const status = this.root?.querySelector("[data-gs-offline]");
      const label = status?.querySelector("span");
      const state = event.detail?.state || this.offlineState();
      if (status) status.dataset.state = state;
      if (label) label.textContent = this.offlineLabel(state);
    });
  }

  enter() {
    if (!this.root) return;
    this.active = true;
    document.body.classList.add("google-slides-course-active");
    this.render();
  }

  leave() {
    this.active = false;
    document.body.classList.remove("google-slides-course-active");
    this.pauseDemo();
    this.openMenu = null;
    this.teacherOpen = false;
    this.teacherPreview = null;
    this.teacherChallengePreview = null;
    this.saveState();
  }

  offlineState() {
    return document.documentElement.dataset.offlineState || "preparing";
  }

  offlineLabel(state = this.offlineState()) {
    if (state === "ready") return "Pronto para usar offline";
    if (state === "error") return "Modo offline incompleto";
    return "Preparando modo offline";
  }

  currentLesson() {
    const id = this.teacherPreview?.lessonId || this.state.currentLessonId;
    return googleSlidesLessons.find((lesson) => lesson.id === id) || googleSlidesLessons[0];
  }

  currentProgress() {
    if (this.teacherPreview) return this.teacherPreview.progress;
    return this.state.lessons[this.currentLesson().id];
  }

  currentStage() {
    return this.teacherPreview?.stage || this.state.stage;
  }

  setStage(stage) {
    if (this.teacherPreview) this.teacherPreview.stage = stage;
    else this.state.stage = stage;
    this.questionFeedback = null;
    this.practiceMessage = "";
    this.practiceMessageKind = "guidance";
    this.openMenu = null;
    this.saveState();
    this.render();
  }

  render() {
    if (!this.root || !this.active) return;
    this.pauseDemo();
    if (this.teacherChallengePreview || this.state.view === "challenge") this.renderChallenge();
    else if (this.teacherPreview || this.state.view === "lesson") this.renderLesson();
    else if (this.state.view === "result") this.renderResult();
    else this.renderIntro();
  }

  topbar({ title = "Google Apresentações na Prática", showProgress = false, challenge = false } = {}) {
    const lesson = this.currentLesson();
    const lessonIndex = googleSlidesLessons.findIndex((item) => item.id === lesson.id);
    const progress = challenge ? `<div class="gsc-course-progress" aria-label="Desafio final">
      <strong>DESAFIO <em>FINAL</em></strong><span><i style="width:100%"></i></span>
    </div>` : showProgress ? `<div class="gsc-course-progress" aria-label="Aula ${lessonIndex + 1} de ${googleSlidesLessons.length}">
      <strong>AULA <em>${String(lessonIndex + 1).padStart(2, "0")}</em> DE ${String(googleSlidesLessons.length).padStart(2, "0")}</strong>
      <span><i style="width:${((lessonIndex + 1) / googleSlidesLessons.length) * 100}%"></i></span>
    </div>` : "";
    return `<header class="gsc-topbar">
      <a class="gsc-games-link" href="#/">${icon("arrow_back")}<span>Jogos</span></a>
      <div class="gsc-brand"><span class="gsc-brand-icon" aria-hidden="true">▰</span><div><small>Curso interativo</small><strong>${escapeHtml(title)}</strong></div></div>
      ${progress}
      <div class="gsc-top-actions">
        ${this.teacherPreview || this.teacherChallengePreview ? '<button class="gsc-teacher-button is-preview" type="button" data-action="exit-teacher-preview">Sair da prévia</button>' : '<button class="gsc-teacher-button" type="button" data-action="open-teacher">Modo Professor</button>'}
        <div class="gsc-offline" data-gs-offline data-state="${this.offlineState()}">${icon("wifi")}<span>${escapeHtml(this.offlineLabel())}</span><button type="button" data-action="retry-offline">Tentar novamente</button></div>
      </div>
    </header>`;
  }

  renderIntro() {
    const stats = courseStats(this.state);
    const started = Object.values(this.state.lessons).some((item) => item.watched || item.questionAttempts || item.practiceCompleted);
    this.simulatorState = createPresentationState(2, "slide-1");
    this.openMenu = null;
    this.root.innerHTML = `<div class="gsc-shell gsc-intro-shell">
      ${this.topbar()}
      <main class="gsc-intro">
        <section class="gsc-intro-simulator" aria-label="Prévia do simulador do Google Apresentações">
          ${this.renderSimulator(this.simulatorState, "preview")}
          <div class="gsc-intro-badge"><strong>30 aulas + desafio final</strong><span>Assista · Responda · Faça</span></div>
        </section>
        <section class="gsc-intro-copy">
          <span class="gsc-eyebrow"><i></i> Aprenda fazendo</span>
          <h1>Domine suas apresentações.</h1>
          <p>Aprenda do primeiro slide até a apresentação final, sempre observando e praticando.</p>
          <div class="gsc-intro-steps" aria-label="Etapas de cada aula">
            <span><b>1</b> Assista</span><span><b>2</b> Responda</span><span><b>3</b> Faça</span>
          </div>
          <button class="gsc-primary" type="button" data-action="start-course">${icon("play_arrow")} ${started ? "Continuar treinamento" : "Começar treinamento"}</button>
          ${started ? `<p class="gsc-resume-note">${stats.completedLessons} de ${googleSlidesLessons.length} aulas concluídas neste Chromebook.</p>` : ""}
          <p class="gsc-save-note">${icon("check_circle")} Seu progresso fica salvo somente neste dispositivo.</p>
        </section>
      </main>
      ${this.teacherPanel()}
    </div>`;
  }

  renderLesson() {
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    const stage = this.currentStage();
    this.simulatorState = stage === "watch"
      ? rebuildDemoState(lesson, progress.demoStep)
      : progress.practiceState;
    this.root.innerHTML = `<div class="gsc-shell gsc-lesson-shell ${this.teacherPreview ? "is-teacher-preview" : ""}">
      ${this.topbar({ showProgress: true })}
      <main class="gsc-lesson-layout">
        <section class="gsc-simulator-column" aria-labelledby="gsc-simulator-title">
          <div class="gsc-simulator-heading">
            <div><span class="gsc-eyebrow"><i></i> ${stage === "practice" ? "Agora é com você" : "Observe a ação"}</span><h1 id="gsc-simulator-title">${escapeHtml(lesson.title)}</h1></div>
            ${this.teacherPreview ? '<span class="gsc-preview-chip">Prévia sem salvar</span>' : ""}
          </div>
          <div data-simulator-host>${stage === "watch" && lesson.demo.type === "webm" ? this.renderVideoDemo(lesson) : this.renderSimulator(this.simulatorState, stage === "practice" ? "practice" : "demo")}</div>
          ${stage === "watch" ? this.demoControls(lesson, progress) : ""}
        </section>
        <aside class="gsc-learning-panel">
          ${this.stepper(stage, progress)}
          <div class="gsc-stage-content" data-stage-content>
            ${stage === "watch" ? this.watchPanel(lesson, progress) : stage === "question" ? this.questionPanel(lesson, progress) : this.practicePanel(lesson, progress)}
          </div>
        </aside>
      </main>
      ${this.teacherPanel()}
    </div>`;
    if (stage === "watch" && lesson.demo.type === "webm") this.attachVideoDemo(lesson, progress);
  }

  stepper(stage, progress) {
    const stages = [
      { id: "watch", number: 1, label: "Assista", done: progress.watched },
      { id: "question", number: 2, label: "Responda", done: progress.questionCompleted },
      { id: "practice", number: 3, label: "Faça", done: progress.practiceCompleted }
    ];
    return `<ol class="gsc-stepper" aria-label="Progresso da aula">${stages.map((item) => `<li class="${stage === item.id ? "is-active" : ""} ${item.done ? "is-done" : ""}"><span>${item.done ? "✓" : item.number}</span><strong>${item.label}</strong></li>`).join("")}</ol>`;
  }

  watchPanel(lesson, progress) {
    const total = demoStepCount(lesson.demo);
    const count = Math.min(progress.demoStep, total);
    return `<span class="gsc-stage-kicker">Etapa 1</span>
      <h2>Assista e aprenda</h2>
      <p>${escapeHtml(lesson.objective)}</p>
      <div class="gsc-observation-card">
        <strong>${this.reducedMotion ? "Demonstração passo a passo" : "Observe a ação"}</strong>
        <p data-demo-caption>${escapeHtml(this.demoCaption(lesson, count))}</p>
        <span data-demo-step>Passo ${count} de ${total}</span>
      </div>
      ${progress.watched ? `<div class="gsc-stage-success" role="status"><strong>✓ Demonstração concluída</strong><p>${escapeHtml(lesson.demo.caption)}</p></div>
        <button class="gsc-primary gsc-next-stage" type="button" data-action="go-question">Responder pergunta ${icon("arrow_forward")}</button>` : '<p class="gsc-stage-hint">Conclua a demonstração para liberar a pergunta.</p>'}`;
  }

  demoControls(lesson, progress) {
    if (lesson.demo.type === "webm") {
      return `<div class="gsc-demo-controls" aria-label="Controles da demonstração em vídeo">
        <button class="is-primary" type="button" data-action="toggle-video-demo">${icon("play_arrow")} <span data-demo-play-label>${progress.watched ? "Reproduzir novamente" : "Reproduzir"}</span></button>
        <button type="button" data-action="repeat-video-demo">${icon("restart_alt")} Repetir demonstração</button>
      </div>`;
    }
    if (this.reducedMotion) {
      return `<div class="gsc-demo-controls" aria-label="Controles da demonstração passo a passo">
        <button type="button" data-action="previous-demo-step" ${progress.demoStep ? "" : "disabled"}>${icon("arrow_back")} Anterior</button>
        <button type="button" data-action="repeat-demo">${icon("restart_alt")} Recomeçar</button>
        <button class="is-primary" type="button" data-action="next-demo-step" ${progress.demoStep >= lesson.demo.steps.length ? "disabled" : ""}>Próximo passo ${icon("arrow_forward")}</button>
      </div>`;
    }
    const playLabel = this.demoPlaying ? "Pausar" : progress.demoStep >= demoStepCount(lesson.demo) ? "Reproduzir novamente" : progress.demoStep ? "Continuar" : "Reproduzir";
    return `<div class="gsc-demo-controls" aria-label="Controles da demonstração">
      <button class="is-primary" type="button" data-action="toggle-demo">${icon(this.demoPlaying ? "pause" : "play_arrow")} <span data-demo-play-label>${playLabel}</span></button>
      <button type="button" data-action="repeat-demo">${icon("restart_alt")} Repetir demonstração</button>
    </div>`;
  }

  questionPanel(lesson, progress) {
    const feedback = progress.questionCompleted
      ? `<div class="gsc-feedback is-success" role="status"><strong>✓ Correto!</strong><p>${escapeHtml(lesson.question.explanation)}</p></div>`
      : this.questionFeedback
        ? `<div class="gsc-feedback is-guidance" role="status"><strong>Ainda não.</strong><p>${escapeHtml(lesson.question.hint)}</p>${progress.incorrectAttempts >= 2 ? '<button class="gsc-secondary" type="button" data-action="review-demo">Rever demonstração</button>' : ""}</div>`
        : "";
    return `<span class="gsc-stage-kicker">Etapa 2</span>
      <h2>Responda</h2>
      <p class="gsc-question">${escapeHtml(lesson.question.prompt)}</p>
      <div class="gsc-answer-list">${lesson.question.options.map((option, index) => `<button type="button" data-answer-index="${index}" ${progress.questionCompleted ? "disabled" : ""} class="${progress.questionCompleted && index === lesson.question.answer ? "is-correct" : ""}"><span>${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(option)}</strong></button>`).join("")}</div>
      ${feedback}
      ${progress.questionCompleted ? `<button class="gsc-primary gsc-next-stage" type="button" data-action="go-practice">Fazer atividade ${icon("arrow_forward")}</button>` : ""}`;
  }

  practicePanel(lesson, progress) {
    const feedback = progress.practiceCompleted
      ? `<div class="gsc-feedback is-success" role="status"><strong>✓ Muito bem!</strong><p>${escapeHtml(lesson.practice.successMessage)}</p></div>`
      : this.practiceMessage
        ? `<div class="gsc-feedback ${this.practiceMessageKind === "progress" ? "is-progress" : "is-guidance"}" role="status"><strong>${this.practiceMessageKind === "progress" ? "Continue." : "Ainda não."}</strong><p>${escapeHtml(this.practiceMessage)}</p></div>`
        : '<p class="gsc-practice-hint">Use o simulador à esquerda. A atividade só termina quando a ação realmente acontecer.</p>';
    const lastLesson = lesson.id === googleSlidesLessons.at(-1).id;
    return `<span class="gsc-stage-kicker">Etapa 3</span>
      <h2>Faça você mesmo</h2>
      <div class="gsc-task-card"><span>Sua tarefa</span><strong>${escapeHtml(lesson.practice.instruction)}</strong></div>
      ${feedback}
      ${progress.practiceCompleted ? `<button class="gsc-primary gsc-next-stage" type="button" data-action="next-lesson">${this.teacherPreview ? "Voltar ao Modo Professor" : lastLesson ? "Ir ao desafio final" : "Próxima aula"} ${icon("arrow_forward")}</button>` : ""}`;
  }

  renderChallenge() {
    const progress = this.teacherChallengePreview || this.state.finalChallenge;
    this.simulatorState = progress.state;
    const completedGoals = Object.values(progress.goals).filter(Boolean).length;
    this.root.innerHTML = `<div class="gsc-shell gsc-lesson-shell ${this.teacherChallengePreview ? "is-teacher-preview" : ""}">
      ${this.topbar({ challenge: true })}
      <main class="gsc-lesson-layout gsc-challenge-layout">
        <section class="gsc-simulator-column" aria-labelledby="gsc-simulator-title">
          <div class="gsc-simulator-heading"><div><span class="gsc-eyebrow"><i></i> Missão final</span><h1 id="gsc-simulator-title">${escapeHtml(googleSlidesFinalChallenge.title)}</h1></div>${this.teacherChallengePreview ? '<span class="gsc-preview-chip">Prévia sem salvar</span>' : ""}</div>
          <div data-simulator-host>${this.renderSimulator(this.simulatorState, "challenge")}</div>
        </section>
        <aside class="gsc-learning-panel gsc-challenge-panel">
          <span class="gsc-stage-kicker">Desafio final</span>
          <h2>Prepare os slides</h2>
          <p>${escapeHtml(googleSlidesFinalChallenge.instruction)}</p>
          <div class="gsc-challenge-progress"><strong>${completedGoals}/${googleSlidesFinalChallenge.goals.length}</strong><span>objetivos concluídos</span><i><b style="width:${completedGoals / googleSlidesFinalChallenge.goals.length * 100}%"></b></i></div>
          <ul class="gsc-challenge-checklist" aria-label="Objetivos do desafio">${googleSlidesFinalChallenge.goals.map((goal) => `<li class="${progress.goals[goal.id] ? "is-done" : ""}"><span>${progress.goals[goal.id] ? "✓" : "○"}</span>${escapeHtml(goal.label)}</li>`).join("")}</ul>
          ${progress.completed ? `<div class="gsc-feedback is-success" role="status"><strong>✓ Missão concluída!</strong><p>Sua apresentação cumpriu todos os objetivos.</p></div><button class="gsc-primary gsc-next-stage" type="button" data-action="finish-course">Ver conclusão ${icon("arrow_forward")}</button>` : '<p class="gsc-practice-hint" role="status">Use as ferramentas no simulador. O checklist é atualizado após cada ação real.</p>'}
        </aside>
      </main>
    </div>`;
  }

  renderResult() {
    const stats = courseStats(this.state);
    this.root.innerHTML = `<div class="gsc-shell gsc-result-shell">
      ${this.topbar({ title: "Curso concluído" })}
      <main class="gsc-result">
        <div class="gsc-result-mark" aria-hidden="true">✓</div>
        <span class="gsc-eyebrow"><i></i> 30 aulas + desafio final</span>
        <h1>Curso concluído!</h1>
        <p>Você já conhece os principais recursos do Google Apresentações.</p>
        <div class="gsc-stat-grid" aria-label="Resultado do treinamento">
          <article><strong>${stats.completedLessons}/${googleSlidesLessons.length}</strong><span>Aulas concluídas</span></article>
          <article><strong>${stats.correctAnswers}</strong><span>Perguntas acertadas</span></article>
          <article><strong>${stats.accuracy}%</strong><span>Precisão</span></article>
          <article><strong>${stats.completedPractices}</strong><span>Práticas concluídas</span></article>
        </div>
        ${stats.teacherCompleted ? `<p class="gsc-teacher-note">${stats.teacherCompleted} ${stats.teacherCompleted === 1 ? "aula foi concluída" : "aulas foram concluídas"} pelo professor e não entrou na precisão.</p>` : ""}
        <div class="gsc-result-actions"><button class="gsc-primary" type="button" data-action="review-course">${icon("restart_alt")} Rever treinamento</button><a class="gsc-secondary" href="#/">Voltar aos jogos</a></div>
      </main>
      ${this.teacherPanel()}
    </div>`;
  }

  renderSimulator(state, mode) {
    const challengeProgress = this.teacherChallengePreview || this.state.finalChallenge;
    const interactive = mode === "challenge" ? !challengeProgress.completed : mode === "practice" && !this.currentProgress()?.practiceCompleted;
    const tab = interactive ? "0" : "-1";
    const selected = state.slides.find((slide) => slide.id === state.selectedSlideId);
    const button = (label, action, target = "", content = label, extra = "") => `<button type="button" tabindex="${tab}" aria-label="${escapeHtml(label)}" data-sim-action="${action}" ${target ? `data-demo-target="${target}"` : ""} ${extra}>${content}</button>`;
    const simMenu = (name, label, target = "") => button(label, `menu:${name}`, target, label, `aria-haspopup="menu" aria-expanded="${this.openMenu === name}"`);
    const textStyle = (text) => `font-size:${text.fontSize}px;font-family:${escapeHtml(text.font)};font-weight:${text.bold ? 700 : 400};font-style:${text.italic ? "italic" : "normal"};text-decoration:${text.underline ? "underline" : "none"};color:${escapeHtml(text.color)};text-align:${escapeHtml(text.align)}`;
    const canvas = selected ? `<div class="gsc-slide-canvas layout-${escapeHtml(selected.layout)} theme-${escapeHtml(state.theme || "padrao")}" style="background:${escapeHtml(selected.background)}">
      ${button("Área branca do slide", "canvas:focus", "slide-canvas", "", `class="gsc-canvas-focus-layer ${state.focusedRegion === "canvas" ? "is-focused" : ""}"`)}
      ${button(selected.title ? `Editar título: ${selected.title}` : "Adicionar título", "text:title", "title-placeholder", escapeHtml(selected.title || "Clique para adicionar um título"), `class="gsc-title-placeholder ${selected.title ? "has-content" : ""}"`)}
      ${selected.textElements.length ? selected.textElements.map((text, index) => button(`Selecionar texto: ${text.value}`, "text:select", index === 0 ? "text-element-1" : "", escapeHtml(text.value), `class="gsc-text-element ${state.selectedTextId === text.id ? "is-selected" : ""} role-${text.role}" data-text-id="${escapeHtml(text.id)}" style="${textStyle(text)}"`)).join("") : button("Adicionar texto", "text:create", "body-placeholder", "Clique para adicionar texto", 'class="gsc-subtitle-placeholder"')}
      ${selected.images.map((image) => `<span class="gsc-sim-image ${state.selectedImageId === image.id ? "is-selected" : ""}" style="left:${image.x}%;top:${image.y}%;width:${image.width * image.scale}%;height:${image.height * image.scale}%" aria-label="Imagem inserida"><i aria-hidden="true">▧</i><small>Imagem</small></span>`).join("")}
      ${selected.shapes.map((shape) => shape.kind === "arrow" ? `<span class="gsc-sim-arrow" style="left:${shape.x}%;top:${shape.y}%" aria-label="Seta inserida">➜</span>` : `<span class="gsc-sim-shape" style="left:${shape.x}%;top:${shape.y}%" aria-label="Forma retangular inserida"></span>`).join("")}
      ${selected.transition ? `<span class="gsc-canvas-chip">Transição: ${escapeHtml(selected.transition)}</span>` : ""}
    </div>` : '<div class="gsc-empty-slide"><strong>Nenhum slide</strong><span>Use + para adicionar um slide.</span></div>';
    return `<div class="gsc-simulator ${interactive ? "is-interactive" : "is-demo"} ${state.presenting ? "is-presenting" : ""}" data-simulator aria-label="Simulação local do Google Apresentações">
      <div class="gsc-app-titlebar">
        ${button("Identificar Google Apresentações", "app:identify", "slides-mark", "▰", `class="gsc-slides-mark ${state.identifiedApp ? "is-identified" : ""}"`)}
        <div><strong>Apresentação sem título</strong><span aria-hidden="true">☆　☁</span></div>
        ${button("Adicionar comentário", "comment:add", "comment", "＋ comentário", 'class="gsc-title-action"')}
        ${button("Iniciar apresentação", "presentation:start", "present", "▶ Apresentar", 'class="gsc-title-action"')}
        ${button("Compartilhar apresentação", "share:open", "share", "🔒 Compartilhar", 'class="gsc-share-button"')}
      </div>
      <div class="gsc-menu-row" role="menubar" aria-label="Menus do Google Apresentações">
        ${["Arquivo", "Editar", "Ver"].map((name) => button(name, "unsupported", "", name, `data-hint="O menu ${name} não realiza a tarefa desta aula."`)).join("")}
        ${simMenu("insert", "Inserir", "insert-menu")}${simMenu("format", "Formatar", "format-menu")}${simMenu("slide", "Slide", "slide-menu")}
        ${["Organizar", "Ferramentas", "Extensões", "Ajuda"].map((name) => button(name, "unsupported", "", name, `data-hint="O menu ${name} não é necessário nesta atividade."`)).join("")}
      </div>
      <div class="gsc-toolbar" role="toolbar" aria-label="Barra de ferramentas">
        ${button("Adicionar novo slide", "slide:create", "new-slide", '<span class="gsc-plus">＋</span>')}
        ${button("Caixa de texto", "textbox:insert", "text-box", "T")}${button("Inserir linha ou seta", "line:insert", "line", "➜")}
        ${button("Redimensionar imagem", "image:resize", "image-resize", "↔", `class="${selected?.images.length ? "" : "is-muted"}"`)}
        ${button("Mover imagem", "image:move", "image-move", "✥", `class="${selected?.images.length ? "" : "is-muted"}"`)}
        ${button("Adicionar animação", "animation:add", "animate", "✦")}
        <span class="gsc-toolbar-spacer"></span>
        ${button("Alterar plano de fundo", "background:change", "background", "Plano de fundo", 'class="gsc-text-tool"')}
        ${button("Alterar layout", "layout:change", "layout", "Layout", 'class="gsc-text-tool"')}
        ${button("Aplicar tema", "theme:change", "theme", "Tema", 'class="gsc-text-tool"')}
        ${button("Adicionar transição", "transition:change", "transition", "Transição", 'class="gsc-text-tool"')}
      </div>
      <div class="gsc-slide-workspace">
        <aside class="gsc-thumbnails ${state.focusedRegion === "thumbnails" ? "is-focused" : ""}" aria-label="Painel de miniaturas">
          ${button("Identificar painel de miniaturas", "thumbnails:focus", "thumbnails-panel", "Miniaturas", 'class="gsc-thumbnails-label"')}
          ${state.slides.map((slide, index) => button(`Selecionar slide ${index + 1}`, "slide:select", `slide-thumb-${index + 1}`, `<span>${index + 1}</span><i><b>${escapeHtml(slide.title.slice(0, 1))}</b><small></small></i>`, `data-slide-id="${slide.id}" class="${slide.id === state.selectedSlideId ? "is-selected" : ""}"`)).join("")}
        </aside>
        <div class="gsc-canvas-area">${canvas}</div>
      </div>
      ${this.openMenu === "slide" ? `<div class="gsc-slide-menu gsc-floating-menu" role="menu" data-sim-menu="slide" aria-label="Menu Slide">
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="slide:create">Novo slide <kbd>Ctrl+M</kbd></button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="slide:duplicate" data-demo-target="duplicate-slide">Duplicar slide</button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="slide:reorder" data-demo-target="reorder-slide">Mover para o início</button><span></span>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="slide:delete" data-demo-target="delete-slide">Excluir slide</button>
      </div>` : ""}
      ${this.openMenu === "insert" ? `<div class="gsc-insert-menu gsc-floating-menu" role="menu" data-sim-menu="insert" aria-label="Menu Inserir">
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="image:insert" data-demo-target="insert-image">Imagem</button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="shape:insert" data-demo-target="insert-shape">Forma</button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="textbox:insert">Caixa de texto</button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="line:insert">Linha ou seta</button>
      </div>` : ""}
      ${this.openMenu === "format" ? `<div class="gsc-format-menu gsc-floating-menu" role="menu" data-sim-menu="format" aria-label="Menu Formatar">
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="text:font-size" data-demo-target="font-size">Tamanho 28</button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="text:font" data-demo-target="font-family">Fonte Verdana</button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="text:style" data-demo-target="text-style"><b>B</b> <i>I</i> <u>U</u></button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="text:color" data-demo-target="text-color">Cor azul</button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="text:align" data-demo-target="text-align">Centralizar</button>
      </div>` : ""}
      ${state.comments.length ? `<span class="gsc-comment-badge">💬 ${state.comments.length}</span>` : ""}
      ${state.shareOpen ? '<div class="gsc-share-popover" role="status"><strong>Compartilhamento</strong><span>Opções abertas apenas nesta simulação local.</span></div>' : ""}
      ${state.presenting ? `<div class="gsc-present-overlay" role="status"><strong>${escapeHtml(selected?.title || "Minha apresentação")}</strong><span>Apresentação iniciada</span></div>` : ""}
      ${mode === "demo" ? '<span class="gsc-demo-cursor" data-demo-cursor aria-hidden="true">➤</span><span class="gsc-click-ring" data-click-ring aria-hidden="true"></span>' : ""}
    </div>`;
  }

  renderVideoDemo(lesson) {
    const poster = lesson.demo.poster ? ` poster="${escapeHtml(lesson.demo.poster)}"` : "";
    return `<div class="gsc-video-demo">
      <video data-demo-video controls preload="metadata" src="${escapeHtml(lesson.demo.src)}"${poster} aria-label="Demonstração: ${escapeHtml(lesson.title)}"></video>
      <p>${escapeHtml(lesson.demo.description || lesson.demo.caption)}</p>
    </div>`;
  }

  attachVideoDemo(lesson, progress) {
    const video = this.root?.querySelector("[data-demo-video]");
    if (!video) return;
    video.addEventListener("play", () => this.updateVideoPlayButton(false));
    video.addEventListener("pause", () => this.updateVideoPlayButton(true));
    video.addEventListener("ended", () => {
      progress.demoStep = demoStepCount(lesson.demo);
      progress.watched = true;
      this.saveState();
      this.renderLesson();
    }, { once: true });
  }

  updateVideoPlayButton(paused) {
    const label = this.root?.querySelector("[data-demo-play-label]");
    if (label) label.textContent = paused ? "Continuar" : "Pausar";
  }

  async toggleVideoDemo() {
    const video = this.root?.querySelector("[data-demo-video]");
    if (!video) return;
    if (video.ended) video.currentTime = 0;
    if (video.paused) await video.play().catch(() => {});
    else video.pause();
  }

  async repeatVideoDemo() {
    const video = this.root?.querySelector("[data-demo-video]");
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    await video.play().catch(() => {});
  }

  refreshSimulator() {
    const host = this.root?.querySelector("[data-simulator-host]");
    if (!host) return;
    const challenge = Boolean(this.teacherChallengePreview || this.state.view === "challenge");
    host.innerHTML = this.renderSimulator(this.simulatorState, challenge ? "challenge" : this.currentStage() === "practice" ? "practice" : "demo");
  }

  demoCaption(lesson, completedSteps) {
    if (lesson.demo.type === "webm") return completedSteps ? lesson.demo.caption : "Pressione Reproduzir e acompanhe a demonstração.";
    const announcements = lesson.demo.steps.slice(0, completedSteps).filter((step) => step.action === "announce");
    return announcements.at(-1)?.text || "Pressione Reproduzir e acompanhe o cursor.";
  }

  async executeDemoStep(step, instant = false) {
    const simulator = this.root?.querySelector("[data-simulator]");
    if (!simulator) return;
    const target = step.target ? simulator.querySelector(`[data-demo-target="${step.target}"]`) : null;
    const cursor = simulator.querySelector("[data-demo-cursor]");
    const duration = instant ? 40 : Number(step.duration) || 350;

    if (step.action === "announce") {
      const caption = this.root.querySelector("[data-demo-caption]");
      if (caption) caption.textContent = step.text;
      await wait(instant ? 60 : 500);
      return;
    }

    if (step.action === "move" && target && cursor) {
      const simulatorBox = simulator.getBoundingClientRect();
      const targetBox = target.getBoundingClientRect();
      cursor.style.transitionDuration = `${duration}ms`;
      cursor.style.transform = `translate(${targetBox.left - simulatorBox.left + targetBox.width / 2}px, ${targetBox.top - simulatorBox.top + targetBox.height / 2}px)`;
      await wait(duration + 40);
      return;
    }

    if (["click", "double-click", "drag", "select-text", "type"].includes(step.action)) {
      if (target) {
        target.classList.add("is-demo-clicked");
        if (step.action === "double-click") target.classList.add("is-demo-double-clicked");
        if (step.action === "drag") target.classList.add("is-demo-dragged");
        await wait(instant ? 45 : step.action === "drag" ? 320 : 180);
      }
      if (step.effect) {
        this.simulatorState = reducePresentation(this.simulatorState, step.effect);
        this.refreshSimulator();
      }
      await wait(instant ? 40 : 180);
      return;
    }

    if (step.action === "open-menu") {
      this.openMenu = step.menu;
      this.refreshSimulator();
      await wait(instant ? 50 : 280);
      return;
    }

    if (step.action === "select-option") {
      if (target) target.classList.add("is-demo-clicked");
      await wait(instant ? 40 : 180);
      if (step.effect) this.simulatorState = reducePresentation(this.simulatorState, step.effect);
      this.openMenu = null;
      this.refreshSimulator();
      await wait(instant ? 40 : 180);
      return;
    }

    if (step.action === "highlight" && target) {
      target.classList.add("is-demo-highlighted");
      await wait(duration);
      target.classList.remove("is-demo-highlighted");
      return;
    }

    if (step.action === "wait") await wait(instant ? 40 : duration);
  }

  async playDemo() {
    if (this.demoPlaying || this.reducedMotion) return;
    const lesson = this.currentLesson();
    if (lesson.demo.type !== "script") return;
    const progress = this.currentProgress();
    if (progress.demoStep >= demoStepCount(lesson.demo)) progress.demoStep = 0;
    this.simulatorState = rebuildDemoState(lesson, progress.demoStep);
    this.openMenu = null;
    this.refreshSimulator();
    this.demoPlaying = true;
    const runId = ++this.demoRunId;
    this.updateDemoPlayButton();
    while (this.active && this.demoPlaying && runId === this.demoRunId && progress.demoStep < demoStepCount(lesson.demo)) {
      await this.executeDemoStep(lesson.demo.steps[progress.demoStep]);
      if (!this.demoPlaying || runId !== this.demoRunId) return;
      progress.demoStep += 1;
      this.updateDemoProgress(lesson, progress);
      this.saveState();
    }
    if (runId !== this.demoRunId) return;
    this.demoPlaying = false;
    if (progress.demoStep >= demoStepCount(lesson.demo)) progress.watched = true;
    this.saveState();
    this.renderLesson();
  }

  pauseDemo() {
    this.demoPlaying = false;
    this.demoRunId += 1;
    this.updateDemoPlayButton();
  }

  updateDemoPlayButton() {
    const label = this.root?.querySelector("[data-demo-play-label]");
    const button = label?.closest("button");
    if (label) {
      const progress = this.currentProgress();
      const lesson = this.currentLesson();
      label.textContent = this.demoPlaying ? "Pausar" : progress?.demoStep >= demoStepCount(lesson.demo) ? "Reproduzir novamente" : progress?.demoStep ? "Continuar" : "Reproduzir";
    }
    if (button) button.setAttribute("aria-pressed", String(this.demoPlaying));
  }

  updateDemoProgress(lesson, progress) {
    const step = this.root?.querySelector("[data-demo-step]");
    const caption = this.root?.querySelector("[data-demo-caption]");
    if (step) step.textContent = `Passo ${progress.demoStep} de ${demoStepCount(lesson.demo)}`;
    if (caption) caption.textContent = this.demoCaption(lesson, progress.demoStep);
  }

  repeatDemo() {
    this.pauseDemo();
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    progress.demoStep = 0;
    this.simulatorState = createLessonPresentationState(lesson.id);
    this.openMenu = null;
    this.saveState();
    this.renderLesson();
  }

  async nextDemoStep() {
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    if (lesson.demo.type !== "script" || progress.demoStep >= demoStepCount(lesson.demo)) return;
    this.simulatorState = rebuildDemoState(lesson, progress.demoStep);
    await this.executeDemoStep(lesson.demo.steps[progress.demoStep], true);
    progress.demoStep += 1;
    if (progress.demoStep >= demoStepCount(lesson.demo)) progress.watched = true;
    this.saveState();
    this.renderLesson();
  }

  previousDemoStep() {
    const progress = this.currentProgress();
    progress.demoStep = Math.max(0, progress.demoStep - 1);
    this.openMenu = null;
    this.saveState();
    this.renderLesson();
  }

  answerQuestion(index) {
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    if (!progress.watched || progress.questionCompleted) return;
    progress.questionAttempts += 1;
    if (index === lesson.question.answer) {
      progress.questionCompleted = true;
      progress.questionCompletedByStudent = true;
      this.questionFeedback = { correct: true };
    } else {
      progress.incorrectAttempts += 1;
      this.questionFeedback = { correct: false };
    }
    this.saveState();
    this.renderLesson();
  }

  handleSimulatorAction(button) {
    const challenge = Boolean(this.teacherChallengePreview || this.state.view === "challenge");
    if (!challenge && this.currentStage() !== "practice") return;
    const progress = challenge ? this.teacherChallengePreview || this.state.finalChallenge : this.currentProgress();
    if (progress.completed || progress.practiceCompleted) return;
    const action = button.dataset.simAction;
    if (action.startsWith("menu:")) {
      const menu = action.split(":")[1];
      this.openMenu = this.openMenu === menu ? null : menu;
      if (challenge) this.renderChallenge();
      else this.renderLesson();
      if (this.openMenu) this.root.querySelector(`[data-sim-menu="${menu}"] [role="menuitem"]`)?.focus();
      return;
    }
    if (action === "unsupported") {
      this.practiceMessageKind = "guidance";
      this.practiceMessage = button.dataset.hint || "Essa ferramenta não realiza a tarefa desta aula. Tente novamente.";
      if (challenge) this.renderChallenge();
      else this.renderLesson();
      return;
    }
    const previous = challenge ? progress.state : progress.practiceState;
    const selectedIndex = previous.slides.findIndex((slide) => slide.id === previous.selectedSlideId);
    const payloads = {
      "text:title": { value: "Minha apresentação" },
      "text:create": { value: "Conteúdo da aula" },
      "text:font-size": { size: 28 },
      "text:font": { font: "Verdana" },
      "text:color": { color: "#1a73e8" },
      "text:align": { align: "center" },
      "layout:change": { layout: "title-body" },
      "background:change": { color: "#fff2cc" },
      "theme:change": { theme: "dourado" },
      "image:resize": { scale: 1.25 },
      "image:move": { x: 62, y: 48 },
      "shape:insert": { kind: "rectangle" },
      "textbox:insert": { value: "Nova caixa de texto" },
      "line:insert": { kind: "arrow" },
      "transition:change": { transition: "dissolver" },
      "animation:add": { animation: "aparecer" },
      "comment:add": { value: "Revise este slide" }
    };
    const payload = action === "slide:select" ? { id: button.dataset.slideId }
      : action === "text:select" ? { id: button.dataset.textId }
        : action === "slide:delete" ? { deletedSlideId: previous.selectedSlideId }
          : action === "slide:reorder" ? { id: previous.selectedSlideId, toIndex: selectedIndex === 0 && previous.slides.length > 1 ? 1 : 0 }
            : payloads[action] || {};
    const event = { type: action, payload };
    const next = reducePresentation(previous, event);
    this.openMenu = null;
    if (challenge) {
      const updated = updateFinalChallenge(progress, event);
      if (this.teacherChallengePreview) this.teacherChallengePreview = updated;
      else this.state.finalChallenge = updated;
      this.simulatorState = updated.state;
      this.saveState();
      this.renderChallenge();
      return;
    }
    progress.practiceState = next;
    this.bus.dispatchEvent(new CustomEvent("course-action", {
      detail: { lesson: this.currentLesson(), type: event.type, payload: event.payload, state: next, previous }
    }));
  }

  handleCourseAction(customEvent) {
    const { lesson, type, payload, state: next, previous } = customEvent.detail;
    const event = { type, payload };
    const progress = this.currentProgress();
    if (practiceMatches(lesson, event, previous, next)) {
      progress.practiceCompleted = true;
      progress.practiceCompletedByStudent = true;
      progress.completed = progress.watched && progress.questionCompleted;
      progress.completedByTeacher = false;
      this.practiceMessage = lesson.practice.successMessage;
      this.practiceMessageKind = "success";
    } else if (lesson.id === 6 && event.type === "slide:select" && event.payload?.id === "slide-2") {
      this.practiceMessage = "Segundo slide selecionado. Agora abra o menu Slide e escolha Excluir slide.";
      this.practiceMessageKind = "progress";
    } else {
      this.practiceMessage = "Essa ação funcionou no simulador, mas não conclui a tarefa pedida. Tente novamente.";
      this.practiceMessageKind = "guidance";
    }
    this.saveState();
    this.renderLesson();
  }

  nextLesson() {
    if (this.teacherPreview) {
      this.teacherPreview = null;
      this.teacherOpen = true;
      this.render();
      return;
    }
    const lesson = this.currentLesson();
    const progress = this.currentProgress();
    if (!progress.completed) return;
    const index = googleSlidesLessons.findIndex((item) => item.id === lesson.id);
    const nextLesson = googleSlidesLessons[index + 1];
    if (!nextLesson) {
      this.state.view = "challenge";
    } else {
      this.state.currentLessonId = nextLesson.id;
      this.state.stage = "watch";
    }
    this.questionFeedback = null;
    this.practiceMessage = "";
    this.practiceMessageKind = "guidance";
    this.saveState();
    this.render();
  }

  teacherPanel() {
    if (!this.teacherOpen || this.teacherPreview || this.teacherChallengePreview) return "";
    const stats = courseStats(this.state);
    const modules = [...new Set(googleSlidesLessons.map((lesson) => lesson.module))];
    const visibleLessons = this.teacherModuleFilter === "all" ? googleSlidesLessons : googleSlidesLessons.filter((lesson) => lesson.module === this.teacherModuleFilter);
    return `<div class="gsc-modal-backdrop">
      <section class="gsc-teacher-panel" role="dialog" aria-modal="true" aria-labelledby="gsc-teacher-title">
        <header><div><span class="gsc-stage-kicker">Acompanhamento local</span><h2 id="gsc-teacher-title" tabindex="-1">Modo Professor</h2></div><button type="button" data-action="close-teacher" aria-label="Fechar Modo Professor">×</button></header>
        <div class="gsc-teacher-summary"><strong>${stats.completedLessons}/${googleSlidesLessons.length}</strong><span>aulas concluídas neste Chromebook</span><b>${stats.accuracy}% de precisão</b></div>
        <div class="gsc-teacher-tools"><label for="gsc-module-filter">Selecionar módulo</label><select id="gsc-module-filter" data-action="teacher-module-filter"><option value="all">Todos os módulos</option>${modules.map((module) => `<option value="${escapeHtml(module)}" ${module === this.teacherModuleFilter ? "selected" : ""}>${escapeHtml(module)}</option>`).join("")}</select><button type="button" data-action="teacher-challenge">Abrir desafio final</button></div>
        <div class="gsc-teacher-lessons">${visibleLessons.map((lesson) => {
          const progress = this.state.lessons[lesson.id];
          return `<article><div><span>Aula ${String(lesson.id).padStart(2, "0")}</span><strong>${escapeHtml(lesson.title)}</strong><small>${progress.completedByTeacher ? "Concluída pelo professor" : progress.completed ? "Concluída pelo aluno" : "Em andamento"}</small></div><div><button type="button" data-action="teacher-preview" data-lesson-id="${lesson.id}">Abrir prévia</button><button type="button" data-action="teacher-complete" data-lesson-id="${lesson.id}" ${progress.completed ? "disabled" : ""}>Marcar concluída</button><button type="button" data-action="teacher-reset-lesson" data-lesson-id="${lesson.id}">Reiniciar</button></div></article>`;
        }).join("")}</div>
        <footer>${this.teacherConfirmReset ? '<p role="alert">Todo o progresso local será apagado. Confirmar?</p><button class="is-danger" type="button" data-action="teacher-confirm-reset">Sim, reiniciar curso</button><button type="button" data-action="teacher-cancel-reset">Cancelar</button>' : '<button class="is-danger" type="button" data-action="teacher-reset-course">Reiniciar curso inteiro</button>'}</footer>
      </section>
    </div>`;
  }

  openTeacherPreview(lessonId) {
    const lesson = googleSlidesLessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    this.teacherOpen = false;
    this.teacherPreview = { lessonId, stage: "watch", progress: createLessonProgress(lessonId) };
    this.questionFeedback = null;
    this.practiceMessage = "";
    this.practiceMessageKind = "guidance";
    this.render();
  }

  openTeacherChallenge() {
    this.teacherOpen = false;
    this.teacherChallengePreview = createFinalChallengeProgress();
    this.practiceMessage = "";
    this.openMenu = null;
    this.render();
  }

  handleChange(event) {
    if (event.target.matches('[data-action="teacher-module-filter"]')) {
      this.teacherModuleFilter = event.target.value;
      this.render();
      this.root.querySelector("#gsc-module-filter")?.focus();
    }
  }

  handleClick(event) {
    const answer = event.target.closest("[data-answer-index]");
    if (answer) return this.answerQuestion(Number(answer.dataset.answerIndex));
    const simulatorButton = event.target.closest("[data-sim-action]");
    if (simulatorButton) return this.handleSimulatorAction(simulatorButton);
    const actionElement = event.target.closest("[data-action]");
    const action = actionElement?.dataset.action;
    if (!action) return;

    if (action === "start-course") {
      const allLessonsCompleted = googleSlidesLessons.every((lesson) => this.state.lessons[lesson.id].completed);
      this.state.view = allLessonsCompleted ? this.state.finalChallenge.completed ? "result" : "challenge" : "lesson";
      this.saveState();
      this.render();
    } else if (action === "toggle-demo") {
      if (this.demoPlaying) this.pauseDemo();
      else this.playDemo();
    } else if (action === "toggle-video-demo") this.toggleVideoDemo();
    else if (action === "repeat-video-demo") this.repeatVideoDemo();
    else if (action === "repeat-demo") this.repeatDemo();
    else if (action === "next-demo-step") this.nextDemoStep();
    else if (action === "previous-demo-step") this.previousDemoStep();
    else if (action === "go-question") this.setStage("question");
    else if (action === "go-practice") this.setStage("practice");
    else if (action === "review-demo") this.setStage("watch");
    else if (action === "next-lesson") this.nextLesson();
    else if (action === "finish-course") {
      if (this.teacherChallengePreview) {
        this.teacherChallengePreview = null;
        this.teacherOpen = true;
      } else if (this.state.finalChallenge.completed) this.state.view = "result";
      this.saveState();
      this.render();
    }
    else if (action === "review-course") {
      this.state.view = "lesson";
      this.state.currentLessonId = googleSlidesLessons[0].id;
      this.state.stage = "watch";
      this.saveState();
      this.render();
    } else if (action === "retry-offline") window.dispatchEvent(new CustomEvent("central-retry-offline"));
    else if (action === "open-teacher") {
      this.teacherOpen = true;
      this.teacherConfirmReset = false;
      this.render();
      this.root.querySelector("#gsc-teacher-title")?.focus();
    } else if (action === "close-teacher") {
      this.teacherOpen = false;
      this.render();
    } else if (action === "teacher-preview") this.openTeacherPreview(Number(actionElement.dataset.lessonId));
    else if (action === "exit-teacher-preview") {
      this.teacherPreview = null;
      this.teacherChallengePreview = null;
      this.teacherOpen = true;
      this.render();
    } else if (action === "teacher-challenge") {
      this.openTeacherChallenge();
    } else if (action === "teacher-complete") {
      this.state = markLessonCompleteByTeacher(this.state, Number(actionElement.dataset.lessonId));
      this.saveState();
      this.render();
    } else if (action === "teacher-reset-lesson") {
      this.state = resetLessonInState(this.state, Number(actionElement.dataset.lessonId));
      this.saveState();
      this.render();
    } else if (action === "teacher-reset-course") {
      this.teacherConfirmReset = true;
      this.render();
    } else if (action === "teacher-cancel-reset") {
      this.teacherConfirmReset = false;
      this.render();
    } else if (action === "teacher-confirm-reset") {
      this.state = createInitialCourseState();
      this.teacherConfirmReset = false;
      this.saveState();
      this.render();
    }
  }

  handleKeydown(event) {
    if (event.key === "Escape") {
      if (this.openMenu) {
        const menu = this.openMenu;
        this.openMenu = null;
        if (this.teacherChallengePreview || this.state.view === "challenge") this.renderChallenge();
        else this.renderLesson();
        this.root.querySelector(`[data-sim-action="menu:${menu}"]`)?.focus();
      } else if (this.teacherOpen) {
        this.teacherOpen = false;
        this.render();
      }
      return;
    }
    const menuItem = event.target.closest('[data-sim-menu] [role="menuitem"]');
    if (menuItem && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const items = [...menuItem.closest("[data-sim-menu]").querySelectorAll('[role="menuitem"]')];
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(items.indexOf(menuItem) + direction + items.length) % items.length]?.focus();
      return;
    }
    const thumbnail = event.target.closest(".gsc-thumbnails button");
    if (thumbnail && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const items = [...this.root.querySelectorAll(".gsc-thumbnails button")];
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(items.indexOf(thumbnail) + direction + items.length) % items.length]?.focus();
    }
  }
}

export const googleSlidesCourseGame = new GoogleSlidesCourseGame();

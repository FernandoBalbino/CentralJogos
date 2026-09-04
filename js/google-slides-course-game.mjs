import { demoStepCount, googleSlidesLessons } from "./google-slides-course-data.mjs";
import {
  GOOGLE_SLIDES_COURSE_STORAGE_KEY,
  courseStats,
  createInitialCourseState,
  createLessonPresentationState,
  createLessonProgress,
  createPresentationState,
  markLessonCompleteByTeacher,
  practiceMatches,
  rebuildDemoState,
  reducePresentation,
  resetLessonInState,
  sanitizeCourseState
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
    this.reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
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
    if (this.teacherPreview) return;
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
    if (this.teacherPreview || this.state.view === "lesson") this.renderLesson();
    else if (this.state.view === "result") this.renderResult();
    else this.renderIntro();
  }

  topbar({ title = "Google Apresentações na Prática", showProgress = false } = {}) {
    const lesson = this.currentLesson();
    const lessonIndex = googleSlidesLessons.findIndex((item) => item.id === lesson.id);
    const progress = showProgress ? `<div class="gsc-course-progress" aria-label="Aula ${lessonIndex + 1} de ${googleSlidesLessons.length}">
      <strong>AULA <em>${String(lessonIndex + 1).padStart(2, "0")}</em> DE ${String(googleSlidesLessons.length).padStart(2, "0")}</strong>
      <span><i style="width:${((lessonIndex + 1) / googleSlidesLessons.length) * 100}%"></i></span>
    </div>` : "";
    return `<header class="gsc-topbar">
      <a class="gsc-games-link" href="#/">${icon("arrow_back")}<span>Jogos</span></a>
      <div class="gsc-brand"><span class="gsc-brand-icon" aria-hidden="true">▰</span><div><small>Curso interativo</small><strong>${escapeHtml(title)}</strong></div></div>
      ${progress}
      <div class="gsc-top-actions">
        ${this.teacherPreview ? '<button class="gsc-teacher-button is-preview" type="button" data-action="exit-teacher-preview">Sair da prévia</button>' : '<button class="gsc-teacher-button" type="button" data-action="open-teacher">Modo Professor</button>'}
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
          <div class="gsc-intro-badge"><strong>3 aulas práticas</strong><span>Assista · Responda · Faça</span></div>
        </section>
        <section class="gsc-intro-copy">
          <span class="gsc-eyebrow"><i></i> Aprenda fazendo</span>
          <h1>Crie seus primeiros slides.</h1>
          <p>Observe uma ação, responda uma pergunta curta e depois repita tudo no simulador.</p>
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
      ${progress.practiceCompleted ? `<button class="gsc-primary gsc-next-stage" type="button" data-action="next-lesson">${this.teacherPreview ? "Voltar ao Modo Professor" : lastLesson ? "Ver meu resultado" : "Próxima aula"} ${icon("arrow_forward")}</button>` : ""}`;
  }

  renderResult() {
    const stats = courseStats(this.state);
    this.root.innerHTML = `<div class="gsc-shell gsc-result-shell">
      ${this.topbar({ title: "Treinamento inicial concluído" })}
      <main class="gsc-result">
        <div class="gsc-result-mark" aria-hidden="true">✓</div>
        <span class="gsc-eyebrow"><i></i> Fase 1 concluída</span>
        <h1>Você já começou a criar apresentações!</h1>
        <p>Você reconheceu a área do slide e aprendeu a criar e excluir slides.</p>
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
    const interactive = mode === "practice" && !this.currentProgress()?.practiceCompleted;
    const tab = interactive ? "0" : "-1";
    const selected = state.slides.find((slide) => slide.id === state.selectedSlideId);
    const button = (label, action, target = "", content = label, extra = "") => `<button type="button" tabindex="${tab}" aria-label="${escapeHtml(label)}" data-sim-action="${action}" ${target ? `data-demo-target="${target}"` : ""} ${extra}>${content}</button>`;
    return `<div class="gsc-simulator ${interactive ? "is-interactive" : "is-demo"}" data-simulator aria-label="Simulação local do Google Apresentações">
      <div class="gsc-app-titlebar"><span class="gsc-slides-mark" aria-hidden="true">▰</span><div><strong>Apresentação sem título</strong><span aria-hidden="true">☆　☁</span></div><button type="button" tabindex="-1" aria-label="Compartilhar, indisponível nesta simulação">🔒 Compartilhar</button></div>
      <div class="gsc-menu-row" role="menubar" aria-label="Menus do Google Apresentações">
        ${["Arquivo", "Editar", "Ver", "Inserir", "Formatar"].map((name) => button(name, "unsupported", "", name, `data-hint="O menu ${name} não é necessário nesta atividade."`)).join("")}
        ${button("Slide", "menu:slide", "slide-menu", "Slide", `aria-haspopup="menu" aria-expanded="${this.openMenu === "slide"}"`)}
        ${["Organizar", "Ferramentas", "Extensões", "Ajuda"].map((name) => button(name, "unsupported", "", name, `data-hint="O menu ${name} não é necessário nesta atividade."`)).join("")}
      </div>
      <div class="gsc-toolbar" role="toolbar" aria-label="Barra de ferramentas">
        ${button("Adicionar novo slide", "slide:create", "new-slide", '<span class="gsc-plus">＋</span>')}
        <span class="gsc-tool-divider"></span>
        ${button("Desfazer, indisponível", "unsupported", "", "↶", 'data-hint="Este botão não realiza a tarefa desta aula."')}
        ${button("Refazer, indisponível", "unsupported", "", "↷", 'data-hint="Este botão não realiza a tarefa desta aula."')}
        ${button("Imprimir, indisponível", "unsupported", "", "▣", 'data-hint="Este botão não realiza a tarefa desta aula."')}
        <span class="gsc-zoom">100%⌄</span><span class="gsc-tool-divider"></span>
        ${button("Selecionar, indisponível", "unsupported", "", "➤", 'data-hint="Clique diretamente na área solicitada."')}
        ${button("Caixa de texto, indisponível", "unsupported", "", "T", 'data-hint="A caixa de texto será ensinada em outra aula."')}
        ${button("Inserir imagem, indisponível", "unsupported", "", "▧", 'data-hint="Inserir imagem será ensinado em outra aula."')}
        ${button("Inserir linha, indisponível", "unsupported", "", "╱", 'data-hint="Inserir linha será ensinado em outra aula."')}
        <span class="gsc-toolbar-spacer"></span>
        <span>Plano de fundo</span><span>Layout</span><span>Tema</span><span>Transição</span>
      </div>
      <div class="gsc-slide-workspace">
        <aside class="gsc-thumbnails" aria-label="Painel de miniaturas">${state.slides.map((slide, index) => button(`Selecionar slide ${index + 1}`, "slide:select", `slide-thumb-${index + 1}`, `<span>${index + 1}</span><i><b></b><small></small></i>`, `data-slide-id="${slide.id}" class="${slide.id === state.selectedSlideId ? "is-selected" : ""}"`)).join("")}</aside>
        <div class="gsc-canvas-area">
          ${selected ? button("Área branca do slide", "canvas:focus", "slide-canvas", '<span class="gsc-title-placeholder">Clique para adicionar um título</span><span class="gsc-subtitle-placeholder">Clique para adicionar uma legenda</span>', `class="gsc-slide-canvas ${state.focusedRegion === "canvas" ? "is-focused" : ""}"`) : '<div class="gsc-empty-slide"><strong>Nenhum slide</strong><span>Use + para adicionar um slide.</span></div>'}
        </div>
      </div>
      ${this.openMenu === "slide" ? `<div class="gsc-slide-menu" role="menu" aria-label="Menu Slide">
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="unsupported" data-hint="Use o comando Excluir slide nesta atividade.">Novo slide <kbd>Ctrl+M</kbd></button>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="unsupported" data-hint="Use o comando Excluir slide nesta atividade.">Duplicar slide</button>
        <span></span>
        <button type="button" tabindex="${tab}" role="menuitem" data-sim-action="slide:delete" data-demo-target="delete-slide">Excluir slide</button>
      </div>` : ""}
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
    host.innerHTML = this.renderSimulator(this.simulatorState, this.currentStage() === "practice" ? "practice" : "demo");
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

    if (step.action === "click") {
      if (target) {
        target.classList.add("is-demo-clicked");
        await wait(instant ? 45 : 180);
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
    if (this.currentStage() !== "practice") return;
    const progress = this.currentProgress();
    if (progress.practiceCompleted) return;
    const action = button.dataset.simAction;
    if (action === "menu:slide") {
      this.openMenu = this.openMenu === "slide" ? null : "slide";
      this.renderLesson();
      if (this.openMenu) this.root.querySelector('.gsc-slide-menu [role="menuitem"]')?.focus();
      return;
    }
    if (action === "unsupported") {
      this.practiceMessageKind = "guidance";
      this.practiceMessage = button.dataset.hint || "Essa ferramenta não realiza a tarefa desta aula. Tente novamente.";
      this.renderLesson();
      return;
    }
    const previous = progress.practiceState;
    const payload = action === "slide:select"
      ? { id: button.dataset.slideId }
      : action === "slide:delete"
        ? { deletedSlideId: previous.selectedSlideId }
        : {};
    const event = { type: action, payload };
    const next = reducePresentation(previous, event);
    progress.practiceState = next;
    this.openMenu = null;
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
    } else if (lesson.id === 3 && event.type === "slide:select" && event.payload?.id === "slide-2") {
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
      this.state.view = "result";
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
    if (!this.teacherOpen || this.teacherPreview) return "";
    const stats = courseStats(this.state);
    return `<div class="gsc-modal-backdrop">
      <section class="gsc-teacher-panel" role="dialog" aria-modal="true" aria-labelledby="gsc-teacher-title">
        <header><div><span class="gsc-stage-kicker">Acompanhamento local</span><h2 id="gsc-teacher-title" tabindex="-1">Modo Professor</h2></div><button type="button" data-action="close-teacher" aria-label="Fechar Modo Professor">×</button></header>
        <div class="gsc-teacher-summary"><strong>${stats.completedLessons}/${googleSlidesLessons.length}</strong><span>aulas concluídas neste Chromebook</span><b>${stats.accuracy}% de precisão</b></div>
        <div class="gsc-teacher-lessons">${googleSlidesLessons.map((lesson) => {
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

  handleClick(event) {
    const answer = event.target.closest("[data-answer-index]");
    if (answer) return this.answerQuestion(Number(answer.dataset.answerIndex));
    const simulatorButton = event.target.closest("[data-sim-action]");
    if (simulatorButton) return this.handleSimulatorAction(simulatorButton);
    const actionElement = event.target.closest("[data-action]");
    const action = actionElement?.dataset.action;
    if (!action) return;

    if (action === "start-course") {
      this.state.view = "lesson";
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
      this.teacherOpen = true;
      this.render();
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
        this.openMenu = null;
        this.renderLesson();
        this.root.querySelector('[data-sim-action="menu:slide"]')?.focus();
      } else if (this.teacherOpen) {
        this.teacherOpen = false;
        this.render();
      }
      return;
    }
    const menuItem = event.target.closest('.gsc-slide-menu [role="menuitem"]');
    if (menuItem && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const items = [...this.root.querySelectorAll('.gsc-slide-menu [role="menuitem"]')];
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

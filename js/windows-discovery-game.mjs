import { windowsDiscoveryLessons } from "./windows-discovery-data.mjs";
import {
  WORD_SEARCH_COUNT,
  WORD_SEARCH_HIDDEN_COUNT,
  WORD_SEARCH_VISIBLE_COUNT,
  WINDOWS_DISCOVERY_STORAGE_KEY,
  appendSelection,
  buildQuizOrder,
  createInitialDiscoveryState,
  createRandomSeed,
  createWordSearch,
  keyForCell,
  matchSelection,
  partitionPuzzleWords,
  sanitizeDiscoveryState,
  undoSelection
} from "./windows-discovery-core.mjs";

const ICONS = "./assets/side-game/icons";
const icon = (name, alt = "") => `<img src="${ICONS}/${name}.svg" alt="${alt}">`;

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

class WindowsDiscoveryGame {
  constructor() {
    this.root = null;
    this.active = false;
    this.timer = null;
    this.lessonReady = false;
    this.quizAnswered = null;
    this.lastFound = null;
    this.state = this.loadState();
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  loadState() {
    try {
      return sanitizeDiscoveryState(JSON.parse(localStorage.getItem(WINDOWS_DISCOVERY_STORAGE_KEY)), windowsDiscoveryLessons.length);
    } catch {
      return createInitialDiscoveryState();
    }
  }

  saveState() {
    try {
      localStorage.setItem(WINDOWS_DISCOVERY_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn("Não foi possível salvar o progresso de Descubra o Windows.", error);
    }
  }

  mount(root) {
    this.root = root;
    this.root?.addEventListener("click", this.handleClick);
    this.root?.addEventListener("keydown", this.handleKeydown);
    document.addEventListener("central-offline-status", (event) => {
      const container = this.root?.querySelector("[data-discovery-offline]");
      const label = container?.querySelector("span");
      if (container) container.dataset.state = event.detail?.state || this.offlineState();
      if (label) label.textContent = event.detail?.label || this.offlineLabel();
    });
  }

  enter() {
    if (!this.root) return;
    this.active = true;
    document.body.classList.add("windows-discovery-active");
    this.render();
  }

  leave() {
    this.active = false;
    document.body.classList.remove("windows-discovery-active");
    this.stopTimer();
    this.pauseVideo();
    this.saveState();
  }

  pauseVideo() {
    const video = this.root?.querySelector("[data-discovery-video]");
    if (video) video.pause();
  }

  offlineLabel() {
    const state = document.documentElement.dataset.offlineState;
    if (state === "ready") return "Pronto para usar offline";
    if (state === "error") return "Modo offline incompleto";
    return "Preparando modo offline";
  }

  offlineState() {
    return document.documentElement.dataset.offlineState || "preparing";
  }

  render() {
    if (!this.root || !this.active) return;
    this.stopTimer();
    this.lessonReady = false;
    this.quizAnswered = null;
    if (this.state.view === "quiz") this.renderQuiz();
    else if (this.state.view === "quiz-result") this.renderQuizResult();
    else if (this.state.view === "word-search") this.renderWordSearch();
    else if (this.state.view === "word-result") this.renderWordResult();
    else this.renderIntro();
  }

  topbar({ progress = "", title = "Descubra o Windows", compact = false } = {}) {
    return `<header class="wd-topbar ${compact ? "is-compact" : ""}">
      <a class="wd-games-link" href="#/">${icon("arrow_back", "")}<span>Jogos</span></a>
      <div class="wd-brand-block"><span><i></i> Cinema da Aula</span><strong>${escapeHtml(title)}</strong></div>
      ${progress ? `<div class="wd-top-progress">${progress}</div>` : ""}
      <div class="wd-offline" data-discovery-offline data-state="${this.offlineState()}">${icon("wifi", "")}<span>${escapeHtml(this.offlineLabel())}</span><button type="button" data-action="retry-offline">Tentar novamente</button></div>
    </header>`;
  }

  renderIntro() {
    const completed = this.state.quizCompleted;
    this.root.innerHTML = `<div class="wd-shell wd-intro-shell">
      ${this.topbar({ title: "Descubra o Windows" })}
      <main class="wd-intro">
        <section class="wd-intro-media">
          <img src="./assets/windows-discovery/scene-desktop.png" alt="Área de Trabalho limpa do Windows 11">
          <div class="wd-intro-media-label"><span>30 animações</span><strong>Veja o Windows em ação</strong></div>
        </section>
        <section class="wd-intro-copy">
          <span class="wd-eyebrow"><i></i> Aprenda antes de jogar</span>
          <h1>Assista, responda e encontre.</h1>
          <p>Conheça 30 elementos básicos do Windows 11 em demonstrações rápidas. Depois, encontre 15 termos em uma grade diferente para cada aluno.</p>
          <div class="wd-intro-steps" aria-label="Etapas do jogo">
            <span><b>1</b> Veja a ação</span><span><b>2</b> Responda</span><span><b>3</b> Caça-palavras</span>
          </div>
          <div class="wd-intro-actions">
            ${completed ? `<button class="wd-primary" type="button" data-action="new-puzzle">${icon("play_arrow", "")} Novo caça-palavras</button>
              <button class="wd-secondary" type="button" data-action="review-quiz">${icon("restart_alt", "")} Revisar aula</button>` : `<button class="wd-primary" type="button" data-action="start-quiz">${icon("play_arrow", "")} Começar aula</button>`}
          </div>
          <p class="wd-save-note">${icon("check_circle", "")} Seu progresso fica salvo neste Chromebook.</p>
        </section>
      </main>
    </div>`;
  }

  quizProgress(index) {
    const percent = Math.round(((index + 1) / windowsDiscoveryLessons.length) * 100);
    return `<div class="wd-lesson-progress" aria-label="Aula ${index + 1} de ${windowsDiscoveryLessons.length}">
      <strong>AULA <em>${String(index + 1).padStart(2, "0")}</em> DE ${windowsDiscoveryLessons.length}</strong>
      <span><i style="width:${percent}%"></i></span>
    </div>`;
  }

  renderQuiz() {
    const lesson = windowsDiscoveryLessons[this.state.lessonIndex];
    const options = buildQuizOrder(lesson, this.state.quizSeed);
    this.root.innerHTML = `<div class="wd-shell wd-quiz-shell">
      ${this.topbar({ progress: this.quizProgress(this.state.lessonIndex) })}
      <main class="wd-quiz-layout">
        <section class="wd-video-column" aria-labelledby="wd-video-title">
          <h1 id="wd-video-title" class="sr-only">Demonstração: ${escapeHtml(lesson.term)}</h1>
          <div class="wd-video-frame">
            <video data-discovery-video muted playsinline preload="auto" poster="${lesson.poster}" aria-describedby="wd-demo-description">
              <source src="${lesson.video}" type="video/webm">
            </video>
            <button class="wd-video-play" type="button" data-action="play-video">${icon("play_arrow", "")} Reproduzir demonstração</button>
            <div class="wd-video-wait" data-video-wait><span></span><strong>Observe a ação</strong></div>
          </div>
          <div class="wd-video-controls">
            <span id="wd-demo-description">${escapeHtml(lesson.demoDescription)}</span>
            <button type="button" data-action="replay-video">${icon("restart_alt", "")} Repetir animação</button>
          </div>
        </section>
        <section class="wd-question-column" aria-labelledby="wd-question-title">
          <span class="wd-eyebrow"><i></i> Assista e responda</span>
          <h2 id="wd-question-title">${escapeHtml(lesson.question)}</h2>
          <div class="wd-answer-lock" data-answer-lock>${icon("visibility", "")} As alternativas aparecem após a animação.</div>
          <div class="wd-answers" data-answers hidden>
            ${options.map((option, index) => `<button type="button" data-answer="${escapeHtml(option)}"><span>${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(option)}</strong></button>`).join("")}
          </div>
          <div class="wd-answer-feedback" data-answer-feedback role="status" aria-live="polite" hidden></div>
        </section>
      </main>
    </div>`;
    this.bindVideo();
  }

  bindVideo() {
    const video = this.root.querySelector("[data-discovery-video]");
    if (!video) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    video.addEventListener("ended", () => this.unlockAnswers());
    video.addEventListener("error", () => this.unlockAnswers(true));
    video.addEventListener("playing", () => this.root.querySelector("[data-video-wait]")?.classList.add("is-playing"));
    if (reducedMotion) {
      this.root.querySelector("[data-video-wait] strong").textContent = "Movimento reduzido ativo";
      this.unlockAnswers(true);
      return;
    }
    video.play().catch(() => this.root.querySelector(".wd-video-play")?.classList.add("is-visible"));
  }

  unlockAnswers(fallback = false) {
    if (this.lessonReady) return;
    this.lessonReady = true;
    const answers = this.root.querySelector("[data-answers]");
    const lock = this.root.querySelector("[data-answer-lock]");
    if (answers) answers.hidden = false;
    if (lock) lock.hidden = true;
    if (fallback) {
      const wait = this.root.querySelector("[data-video-wait] strong");
      if (wait) wait.textContent = "Use a descrição da ação";
    }
    answers?.querySelector("button")?.focus({ preventScroll: true });
  }

  answerQuiz(answer) {
    if (!this.lessonReady || this.quizAnswered) return;
    const lesson = windowsDiscoveryLessons[this.state.lessonIndex];
    const correct = answer === lesson.correctOption;
    this.quizAnswered = answer;
    if (correct) this.state.quizCorrect += 1;
    this.root.querySelectorAll("[data-answer]").forEach((button) => {
      button.disabled = true;
      if (button.dataset.answer === lesson.correctOption) button.classList.add("is-correct");
      else if (button.dataset.answer === answer) button.classList.add("is-wrong");
    });
    const feedback = this.root.querySelector("[data-answer-feedback]");
    this.root.querySelector(".wd-question-column")?.classList.add("has-feedback");
    feedback.hidden = false;
    feedback.className = `wd-answer-feedback ${correct ? "is-correct" : "is-wrong"}`;
    feedback.innerHTML = `<strong>${correct ? "Muito bem!" : "Quase lá!"}</strong><p>${escapeHtml(lesson.explanation)}</p><button class="wd-primary" type="button" data-action="next-lesson">${this.state.lessonIndex === windowsDiscoveryLessons.length - 1 ? "Ver resultado" : "Próxima aula"} ${icon("arrow_forward", "")}</button>`;
    this.saveState();
  }

  renderQuizResult() {
    this.root.innerHTML = `<div class="wd-shell">
      ${this.topbar({ title: "Aula concluída" })}
      <main class="wd-result">
        <img src="${ICONS}/check_circle.svg" alt="">
        <span class="wd-eyebrow"><i></i> 30 conceitos apresentados</span>
        <h1>Você já pode praticar!</h1>
        <p>Você acertou <strong>${this.state.quizCorrect} de ${windowsDiscoveryLessons.length}</strong>. A pontuação é informativa: o importante é reconhecer os elementos durante a atividade.</p>
        <div class="wd-result-actions">
          <button class="wd-primary" type="button" data-action="new-puzzle">${icon("play_arrow", "")} Gerar caça-palavras</button>
          <button class="wd-secondary" type="button" data-action="review-quiz">${icon("restart_alt", "")} Revisar aula</button>
        </div>
      </main>
    </div>`;
  }

  renderWordSearch() {
    const puzzle = this.state.puzzle;
    if (!puzzle) return this.createNewPuzzle();
    const found = new Set(this.state.foundIds);
    const { visibleWords, hiddenWords } = partitionPuzzleWords(puzzle);
    const hiddenFound = hiddenWords.filter((item) => found.has(item.id));
    const hiddenRemaining = WORD_SEARCH_HIDDEN_COUNT - hiddenFound.length;
    const surpriseHelp = hiddenFound.length === 0
      ? `Além das ${WORD_SEARCH_VISIBLE_COUNT} palavras da lista, há ${WORD_SEARCH_HIDDEN_COUNT} palavras-surpresa escondidas na grade.`
      : hiddenRemaining > 0
        ? `Você encontrou 1 surpresa. Ainda há ${hiddenRemaining} palavra-surpresa escondida na grade.`
        : `As ${WORD_SEARCH_HIDDEN_COUNT} palavras-surpresa foram encontradas.`;
    const selected = new Set(this.state.selection.map(keyForCell));
    const foundCells = new Set(puzzle.placements.filter((item) => found.has(item.id)).flatMap((item) => item.cells.map(keyForCell)));
    this.root.innerHTML = `<div class="wd-shell wd-word-shell">
      ${this.topbar({ title: "Caça-palavras do Windows", progress: `<div class="wd-found-progress"><strong>${found.size}/15</strong><span>encontradas</span></div>`, compact: true })}
      <main class="wd-word-layout">
        <section class="wd-grid-panel" aria-labelledby="wd-grid-title">
          <div class="wd-grid-heading"><div><span class="wd-eyebrow"><i></i> Clique letra por letra</span><h1 id="wd-grid-title">Encontre os 15 termos</h1></div><div><span>Tempo</span><strong data-word-time>${formatTime(this.state.elapsedSeconds)}</strong></div></div>
          <div class="wd-letter-grid" role="grid" aria-label="Caça-palavras com 20 linhas e 20 colunas">
            ${puzzle.grid.map((row, rowIndex) => row.map((letter, columnIndex) => {
              const key = `${rowIndex}:${columnIndex}`;
              const className = foundCells.has(key) ? "is-found" : selected.has(key) ? "is-selected" : "";
              return `<button class="${className}" type="button" role="gridcell" data-cell-row="${rowIndex}" data-cell-column="${columnIndex}" aria-label="Letra ${letter}, linha ${rowIndex + 1}, coluna ${columnIndex + 1}">${letter}</button>`;
            }).join("")).join("")}
          </div>
        </section>
        <aside class="wd-word-panel" aria-labelledby="wd-list-title">
          <span class="wd-eyebrow"><i></i> ${WORD_SEARCH_VISIBLE_COUNT} palavras da rodada</span>
          <h2 id="wd-list-title">Encontradas: ${found.size}/15</h2>
          <p class="wd-word-help"><strong>Atenção:</strong> ${surpriseHelp}</p>
          ${hiddenFound.length ? `<div class="wd-surprise-found">${icon("visibility", "")} <span><strong>${hiddenFound.length === 1 ? "Surpresa encontrada" : "Surpresas encontradas"}:</strong> ${hiddenFound.map((item) => escapeHtml(item.term)).join(" e ")}</span></div>` : ""}
          <ol class="wd-word-list">
            ${visibleWords.map((item) => `<li class="${found.has(item.id) ? "is-found" : ""}">${icon(found.has(item.id) ? "check_circle" : "visibility", "")}<span>${escapeHtml(item.term)}</span></li>`).join("")}
          </ol>
          <div class="wd-selection-preview"><span>Seleção atual</span><strong>${this.selectionText() || "Escolha a primeira letra"}</strong></div>
          <div class="wd-word-message ${this.lastFound ? "is-success" : ""}" data-word-message role="status" aria-live="polite">${this.lastFound ? `${this.lastFound.hidden ? "Palavra-surpresa" : "Palavra"} encontrada: ${escapeHtml(this.lastFound.term)}!` : this.state.selection.length ? "Continue na mesma direção." : "Comece clicando em uma letra da grade."}</div>
          <div class="wd-word-actions">
            <button type="button" data-action="undo-letter" ${this.state.selection.length ? "" : "disabled"}>${icon("restart_alt", "")} Desfazer letra</button>
            <button type="button" data-action="clear-selection" ${this.state.selection.length ? "" : "disabled"}>${icon("close", "")} Limpar seleção</button>
          </div>
        </aside>
      </main>
    </div>`;
    this.startTimer();
  }

  selectionText() {
    const grid = this.state.puzzle?.grid;
    return this.state.selection.map(({ row, column }) => grid?.[row]?.[column] || "").join("");
  }

  clickCell(row, column) {
    if (this.state.view !== "word-search") return;
    this.lastFound = null;
    const last = this.state.selection[this.state.selection.length - 1];
    if (last?.row === row && last?.column === column) {
      this.state.selection = undoSelection(this.state.selection);
      this.saveState();
      this.renderWordSearch();
      return;
    }
    const result = appendSelection(this.state.selection, { row, column });
    if (!result.ok) {
      const message = this.root.querySelector("[data-word-message]");
      if (message) {
        message.textContent = result.reason;
        message.classList.add("is-warning");
      }
      return;
    }
    this.state.selection = result.selection;
    const match = matchSelection(this.state.selection, this.state.puzzle, this.state.foundIds);
    if (match) {
      const hiddenIds = new Set(partitionPuzzleWords(this.state.puzzle).hiddenWords.map((item) => item.id));
      this.lastFound = { term: match.term, hidden: hiddenIds.has(match.id) };
      this.state.foundIds = [...this.state.foundIds, match.id];
      this.state.selection = [];
      if (this.state.foundIds.length === WORD_SEARCH_COUNT) {
        this.state.view = "word-result";
        this.stopTimer();
      }
    }
    this.saveState();
    this.render();
  }

  renderWordResult() {
    this.root.innerHTML = `<div class="wd-shell">
      ${this.topbar({ title: "Caça-palavras concluído" })}
      <main class="wd-result wd-word-result">
        <img src="${ICONS}/check_circle.svg" alt="">
        <span class="wd-eyebrow"><i></i> 15 de 15 encontradas</span>
        <h1>Missão cumprida!</h1>
        <p>Você encontrou todos os termos em <strong>${formatTime(this.state.elapsedSeconds)}</strong>. Cada nova grade usa outra combinação.</p>
        <div class="wd-result-actions">
          <button class="wd-primary" type="button" data-action="new-puzzle">${icon("restart_alt", "")} Nova grade</button>
          <button class="wd-secondary" type="button" data-action="review-quiz">${icon("visibility", "")} Revisar aula</button>
        </div>
      </main>
    </div>`;
  }

  startQuiz() {
    this.state.view = "quiz";
    this.state.lessonIndex = 0;
    this.state.quizCorrect = 0;
    this.state.quizSeed = createRandomSeed();
    this.saveState();
    this.render();
  }

  nextLesson() {
    if (!this.quizAnswered) return;
    if (this.state.lessonIndex >= windowsDiscoveryLessons.length - 1) {
      this.state.quizCompleted = true;
      this.state.view = "quiz-result";
    } else {
      this.state.lessonIndex += 1;
    }
    this.saveState();
    this.render();
  }

  createNewPuzzle() {
    this.state.puzzle = createWordSearch(windowsDiscoveryLessons, createRandomSeed());
    this.state.foundIds = [];
    this.state.selection = [];
    this.state.elapsedSeconds = 0;
    this.state.view = "word-search";
    this.lastFound = null;
    this.saveState();
    this.render();
  }

  startTimer() {
    this.stopTimer();
    this.timer = window.setInterval(() => {
      if (!this.active || this.state.view !== "word-search") return;
      this.state.elapsedSeconds += 1;
      const target = this.root?.querySelector("[data-word-time]");
      if (target) target.textContent = formatTime(this.state.elapsedSeconds);
      if (this.state.elapsedSeconds % 5 === 0) this.saveState();
    }, 1000);
  }

  stopTimer() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }

  playVideo(replay = false) {
    const video = this.root?.querySelector("[data-discovery-video]");
    if (!video) return;
    if (replay) video.currentTime = 0;
    if (!this.quizAnswered) {
      this.lessonReady = false;
      const answers = this.root.querySelector("[data-answers]");
      const lock = this.root.querySelector("[data-answer-lock]");
      if (answers) answers.hidden = true;
      if (lock) lock.hidden = false;
    }
    video.play().then(() => this.root.querySelector(".wd-video-play")?.classList.remove("is-visible")).catch(() => this.unlockAnswers(true));
  }

  handleClick(event) {
    const answerButton = event.target.closest("[data-answer]");
    if (answerButton) return this.answerQuiz(answerButton.dataset.answer);
    const cell = event.target.closest("[data-cell-row]");
    if (cell) return this.clickCell(Number(cell.dataset.cellRow), Number(cell.dataset.cellColumn));
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "start-quiz" || action === "review-quiz") this.startQuiz();
    else if (action === "next-lesson") this.nextLesson();
    else if (action === "new-puzzle") this.createNewPuzzle();
    else if (action === "play-video") this.playVideo(false);
    else if (action === "replay-video") this.playVideo(true);
    else if (action === "retry-offline") window.dispatchEvent(new CustomEvent("central-retry-offline"));
    else if (action === "undo-letter") {
      this.state.selection = undoSelection(this.state.selection);
      this.saveState();
      this.renderWordSearch();
    } else if (action === "clear-selection") {
      this.state.selection = [];
      this.saveState();
      this.renderWordSearch();
    }
  }

  handleKeydown(event) {
    const cell = event.target.closest("[data-cell-row]");
    if (!cell || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const row = Number(cell.dataset.cellRow) + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0);
    const column = Number(cell.dataset.cellColumn) + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0);
    this.root.querySelector(`[data-cell-row="${row}"][data-cell-column="${column}"]`)?.focus();
  }
}

export const windowsDiscoveryGame = new WindowsDiscoveryGame();

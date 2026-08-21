import { memoryGamePairs } from "./memory-game-data.mjs?v=1.0.2";
import {
  evaluateEntry,
  generateCrossword,
  normalizeCrosswordAnswer,
  revealHint
} from "./crossword-core.mjs?v=1.0.1";

const SESSION_KEY = "central-jogos-crossword-session-v1";
const LAST_SIGNATURE_KEY = "central-jogos-crossword-last-signature-v1";
const TEACHER_PASSWORD_HASH = "8509bbd7680391aceb4a2ed1ca6ed5685e84d85076b840b8199b1147bb252fb2";
const MAX_HINTS = 3;

const escapeHTML = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const icon = (name) => `<img class="crossword-icon" src="./assets/side-game/icons/${name}.svg" alt="" aria-hidden="true">`;

const cryptoRandom = () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 4294967296;
};

const formatTime = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

const hashText = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

class CrosswordGameController {
  constructor() {
    this.root = null;
    this.active = false;
    this.state = null;
    this.timers = new Set();
    this.clock = null;
    this.teacherClicks = [];
    this.boundClick = (event) => this.handleClick(event);
    this.boundInput = (event) => this.handleInput(event);
    this.boundKeydown = (event) => this.handleKeydown(event);
    this.boundSubmit = (event) => this.handleSubmit(event);
    this.boundBlockCopy = (event) => {
      if (event.target.closest(".crossword-play-shell")) event.preventDefault();
    };
    this.boundResize = () => this.updateBoardCellSize();
  }

  mount(root) {
    this.root = root;
  }

  enter() {
    if (!this.root || this.active) return;
    this.active = true;
    document.body.classList.add("crossword-game-active");
    this.root.addEventListener("click", this.boundClick);
    this.root.addEventListener("input", this.boundInput);
    this.root.addEventListener("keydown", this.boundKeydown);
    this.root.addEventListener("submit", this.boundSubmit);
    for (const eventName of ["copy", "cut", "contextmenu", "dragstart"]) {
      this.root.addEventListener(eventName, this.boundBlockCopy);
    }
    window.addEventListener("resize", this.boundResize);
    this.state = this.restoreSession() || this.createIntroState();
    this.render();
  }

  leave() {
    if (!this.active) return;
    this.saveSession();
    this.active = false;
    this.clearTimers();
    this.stopClock();
    document.body.classList.remove("crossword-game-active");
    this.root?.removeEventListener("click", this.boundClick);
    this.root?.removeEventListener("input", this.boundInput);
    this.root?.removeEventListener("keydown", this.boundKeydown);
    this.root?.removeEventListener("submit", this.boundSubmit);
    for (const eventName of ["copy", "cut", "contextmenu", "dragstart"]) {
      this.root?.removeEventListener(eventName, this.boundBlockCopy);
    }
    window.removeEventListener("resize", this.boundResize);
    if (this.root) this.root.innerHTML = "";
    this.state = null;
    this.teacherClicks = [];
  }

  createIntroState(studentName = "") {
    return {
      version: 1,
      phase: "intro",
      studentName,
      puzzle: null,
      values: {},
      solvedIds: [],
      invalidIds: [],
      hintedCells: [],
      hintsUsed: 0,
      activeEntryId: null,
      startedAt: null,
      assistedByTeacher: false,
      finishedAt: null,
      teacherModalOpen: false,
      teacherError: "",
      confirmNewOpen: false,
      resultOpen: false,
      generationError: ""
    };
  }

  restoreSession() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (!saved || saved.version !== 1 || !["playing", "complete"].includes(saved.phase)) return null;
      if (!saved.puzzle || saved.puzzle.entries?.length !== 10 || !Array.isArray(saved.puzzle.cells)) return null;
      const eligibleIds = new Set(memoryGamePairs.map((pair) => pair.id));
      if (!saved.puzzle.entries.every((entry) => eligibleIds.has(entry.id))) return null;
      return {
        ...this.createIntroState(saved.studentName),
        ...saved,
        invalidIds: [],
        teacherModalOpen: false,
        teacherError: "",
        confirmNewOpen: false,
        resultOpen: Boolean(saved.resultOpen)
      };
    } catch {
      return null;
    }
  }

  saveSession() {
    if (!this.state || !["playing", "complete"].includes(this.state.phase)) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        ...this.state,
        invalidIds: [],
        teacherModalOpen: false,
        teacherError: "",
        confirmNewOpen: false
      }));
    } catch {
      // A partida continua funcionando mesmo se o armazenamento estiver indisponível.
    }
  }

  setTimer(callback, delay) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      if (this.active) callback();
    }, reducedMotion ? Math.min(delay, 100) : delay);
    this.timers.add(timer);
    return timer;
  }

  clearTimers() {
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
  }

  startClock() {
    this.stopClock();
    this.updateClock();
    this.clock = window.setInterval(() => this.updateClock(), 1000);
  }

  stopClock() {
    if (this.clock) window.clearInterval(this.clock);
    this.clock = null;
  }

  elapsedSeconds() {
    if (!this.state?.startedAt) return 0;
    return Math.max(0, Math.floor(((this.state.finishedAt || Date.now()) - this.state.startedAt) / 1000));
  }

  updateClock() {
    const target = this.root?.querySelector("[data-crossword-clock]");
    if (target) target.textContent = formatTime(this.elapsedSeconds());
  }

  render() {
    if (!this.root || !this.state) return;
    this.stopClock();
    if (this.state.phase === "intro") this.renderIntro();
    else if (this.state.phase === "loading") this.renderLoading();
    else this.renderGame();
  }

  renderIntro() {
    const savedName = escapeHTML(this.state.studentName);
    this.root.innerHTML = `
      <div class="crossword-shell crossword-intro-shell">
        <a class="crossword-back-link" href="#/">${icon("arrow_back")} Voltar para os jogos</a>
        <section class="crossword-intro-card" aria-labelledby="crossword-intro-title">
          <div class="crossword-intro-copy">
            <span class="crossword-game-badge">Jogo 06 • Vocabulário</span>
            <span class="crossword-grid-mark" aria-hidden="true">${icon("apps")}</span>
            <h1 id="crossword-intro-title">Cruzadinha <em>Tech</em></h1>
            <p>Leia as dez definições, descubra os conceitos e complete uma grade criada especialmente para esta partida.</p>
            <div class="crossword-feature-row" aria-label="Características da atividade">
              <span><b>10</b> palavras</span><span><b>3</b> dicas</span><span><b>1</b> grade única</span>
            </div>
          </div>
          <form class="crossword-name-form" data-crossword-form="name" novalidate>
            <label for="crossword-student-name">Qual é o seu nome?</label>
            <div class="crossword-name-input-wrap">
              ${icon("person")}
              <input id="crossword-student-name" name="studentName" type="text" minlength="2" maxlength="40" autocomplete="name" value="${savedName}" placeholder="Digite seu nome" required>
            </div>
            <p class="crossword-form-error" data-name-error role="alert">${escapeHTML(this.state.generationError)}</p>
            <button class="crossword-primary-button" type="submit">${icon("play_arrow")} Jogar</button>
            <small>Seu nome fica somente neste Chromebook durante a partida.</small>
          </form>
        </section>
        ${this.renderTeacherModal()}
      </div>`;
  }

  renderLoading() {
    this.root.innerHTML = `
      <div class="crossword-shell crossword-loading-shell" aria-live="polite">
        <div class="crossword-loader" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <span class="crossword-overline">Preparando a atividade de ${escapeHTML(this.state.studentName)}</span>
        <h1>Gerando palavras…</h1>
        <p data-loading-message>Sorteando dez termos do banco.</p>
        <div class="crossword-loading-track"><span data-loading-progress></span></div>
      </div>`;
  }

  async beginGeneration(studentName) {
    this.clearTimers();
    this.state = { ...this.createIntroState(studentName), phase: "loading" };
    this.renderLoading();
    const message = () => this.root?.querySelector("[data-loading-message]");
    const progress = () => this.root?.querySelector("[data-loading-progress]");

    let puzzle;
    this.setTimer(() => {
      try {
        puzzle = generateCrossword({
          items: memoryGamePairs,
          wordCount: 10,
          random: cryptoRandom,
          previousSignature: sessionStorage.getItem(LAST_SIGNATURE_KEY) || ""
        });
      } catch (error) {
        this.state = { ...this.createIntroState(studentName), generationError: error.message };
        this.renderIntro();
      }
    }, 60);
    this.setTimer(() => {
      if (message()) message().textContent = "Cruzando as palavras na grade.";
      if (progress()) progress().style.width = "66%";
    }, 470);
    this.setTimer(() => {
      if (message()) message().textContent = "Numerando as definições.";
      if (progress()) progress().style.width = "100%";
    }, 940);
    this.setTimer(() => {
      if (!puzzle || this.state.phase !== "loading") return;
      sessionStorage.setItem(LAST_SIGNATURE_KEY, puzzle.signature);
      this.state = {
        ...this.createIntroState(studentName),
        phase: "playing",
        puzzle,
        activeEntryId: puzzle.entries[0]?.id || null,
        startedAt: Date.now()
      };
      this.saveSession();
      this.renderGame();
    }, 1420);
  }

  get entryMap() {
    return new Map((this.state?.puzzle?.entries || []).map((entry) => [entry.id, entry]));
  }

  get solvedSet() {
    return new Set(this.state.solvedIds);
  }

  get hintedSet() {
    return new Set(this.state.hintedCells);
  }

  lockedCells() {
    const locked = this.hintedSet;
    const entryMap = this.entryMap;
    for (const id of this.state.solvedIds) {
      for (const cell of entryMap.get(id)?.cells || []) locked.add(cell.key);
    }
    return locked;
  }

  renderGame() {
    const { puzzle } = this.state;
    const solved = this.solvedSet;
    const invalid = new Set(this.state.invalidIds);
    const locked = this.lockedCells();
    const hinted = this.hintedSet;
    const activeEntry = this.entryMap.get(this.state.activeEntryId) || puzzle.entries[0];
    this.state.activeEntryId = activeEntry?.id || null;
    const activeKeys = new Set(activeEntry?.cells.map((cell) => cell.key) || []);
    const complete = solved.size === puzzle.entries.length;
    const hintsRemaining = Math.max(0, MAX_HINTS - this.state.hintsUsed);

    const cells = puzzle.cells.map((cell) => {
      const classes = ["crossword-cell"];
      if (activeKeys.has(cell.key)) classes.push("is-active");
      if (locked.has(cell.key)) classes.push("is-locked");
      if (hinted.has(cell.key) && !cell.entryIds.some((id) => solved.has(id))) classes.push("is-hint");
      if (cell.entryIds.some((id) => solved.has(id))) classes.push("is-correct");
      if (cell.entryIds.some((id) => invalid.has(id))) classes.push("is-invalid");
      const value = escapeHTML(this.state.values[cell.key] || "");
      const entryNumbers = cell.entryIds.map((id) => this.entryMap.get(id)?.number).filter(Boolean).join(" e ");
      return `<label class="${classes.join(" ")}" data-cell-wrap="${cell.key}" style="grid-row:${cell.row + 1};grid-column:${cell.column + 1}">
        ${cell.number ? `<span class="crossword-cell-number" aria-hidden="true">${cell.number}</span>` : ""}
        <input data-cell-key="${cell.key}" maxlength="1" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${value}" ${locked.has(cell.key) ? "readonly tabindex=\"-1\"" : ""} aria-label="Casa da palavra ${entryNumbers || "selecionada"}, linha ${cell.row + 1}, coluna ${cell.column + 1}">
      </label>`;
    }).join("");

    const clues = puzzle.entries.map((entry) => {
      const isSolved = solved.has(entry.id);
      const isInvalid = invalid.has(entry.id);
      const isActive = entry.id === this.state.activeEntryId;
      const classes = ["crossword-clue"];
      if (isSolved) classes.push("is-solved");
      if (isInvalid) classes.push("is-invalid");
      if (isActive) classes.push("is-active");
      return `<button class="${classes.join(" ")}" type="button" data-action="select-entry" data-entry-id="${entry.id}" aria-pressed="${isActive}">
        <span class="crossword-clue-number">${entry.number}</span>
        <span class="crossword-clue-copy"><small>${entry.direction === "across" ? "Horizontal" : "Vertical"} • ${entry.answer.length} caracteres</small><span>${escapeHTML(entry.definition)}</span></span>
        <span class="crossword-clue-status" aria-label="${isSolved ? "Correta" : isInvalid ? "Revise" : "Pendente"}">${isSolved ? icon("check_circle") : ""}</span>
      </button>`;
    }).join("");

    this.root.innerHTML = `
      <div class="crossword-shell crossword-play-shell">
        <header class="crossword-hud">
          <a class="crossword-hud-back" href="#/">${icon("arrow_back")} <span>Jogos</span></a>
          <div class="crossword-player"><span>Aluno</span><strong>${escapeHTML(this.state.studentName)}</strong></div>
          <div class="crossword-hud-stat"><span>Progresso</span><strong data-crossword-progress>${solved.size}/10</strong></div>
          <div class="crossword-hud-stat"><span>Tempo</span><strong data-crossword-clock>${formatTime(this.elapsedSeconds())}</strong></div>
          <button class="crossword-hint-button" type="button" data-action="hint" ${hintsRemaining === 0 || complete ? "disabled" : ""}>${icon("visibility")} <span>Dica</span><b>${hintsRemaining}</b></button>
          <button class="crossword-new-button" type="button" data-action="new-game">${icon("restart_alt")} <span>Nova</span></button>
        </header>

        <main class="crossword-workspace">
          <section class="crossword-board-panel" aria-label="Grade da cruzadinha">
            <div class="crossword-board-heading">
              <div><button class="crossword-game-badge" type="button" data-action="teacher-trigger" aria-label="Jogo 06">Jogo 06</button><h1>Cruzadinha Tech</h1></div>
              <p>Selecione uma definição e digite na grade.</p>
            </div>
            <div class="crossword-board-scroll">
              <div class="crossword-board" style="--crossword-columns:${puzzle.columns};--crossword-rows:${puzzle.rows}" role="group" aria-label="Grade com ${puzzle.rows} linhas e ${puzzle.columns} colunas">${cells}</div>
            </div>
            <div class="crossword-board-footer">
              <span data-crossword-feedback role="status" aria-live="polite">${complete ? "Todas as palavras estão corretas!" : "As palavras corretas ficam travadas automaticamente."}</span>
              <button class="crossword-primary-button" type="button" data-action="show-result" ${complete ? "" : "disabled"}>${icon("check_circle")} Ver resultado</button>
            </div>
          </section>

          <aside class="crossword-clues-panel" aria-labelledby="crossword-clues-title">
            <div class="crossword-clues-heading"><div><span class="crossword-overline">Leia e descubra</span><h2 id="crossword-clues-title">10 definições</h2></div><span>${solved.size}/10</span></div>
            <div class="crossword-clue-list">${clues}</div>
          </aside>
        </main>

        ${this.renderTeacherModal()}
        ${this.renderConfirmNew()}
        ${this.renderResultModal()}
      </div>`;
    if (this.state.phase === "playing") this.startClock();
    else this.updateClock();
    this.updateBoardCellSize();
  }

  renderTeacherModal() {
    if (!this.state.teacherModalOpen) return "";
    return `<div class="crossword-modal-layer" role="presentation">
      <section class="crossword-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-modal-title">
        <button class="crossword-modal-close" type="button" data-action="close-teacher" aria-label="Fechar">×</button>
        <span class="crossword-modal-icon">${icon("vpn_key")}</span>
        <span class="crossword-overline">Acesso reservado</span>
        <h2 id="teacher-modal-title">Modo professor</h2>
        <p>Digite a senha para revelar e completar toda a atividade.</p>
        <form data-crossword-form="teacher">
          <label for="crossword-teacher-password">Senha do professor</label>
          <input id="crossword-teacher-password" name="password" type="password" autocomplete="off" required autofocus>
          <p class="crossword-form-error" role="alert">${escapeHTML(this.state.teacherError)}</p>
          <button class="crossword-primary-button" type="submit">Completar cruzadinha</button>
        </form>
      </section>
    </div>`;
  }

  renderConfirmNew() {
    if (!this.state.confirmNewOpen) return "";
    return `<div class="crossword-modal-layer" role="presentation">
      <section class="crossword-modal" role="dialog" aria-modal="true" aria-labelledby="new-modal-title">
        <span class="crossword-modal-icon">${icon("restart_alt")}</span>
        <h2 id="new-modal-title">Gerar outra cruzadinha?</h2>
        <p>O progresso atual será apagado e uma nova combinação de dez palavras será criada.</p>
        <div class="crossword-modal-actions"><button class="crossword-secondary-button" type="button" data-action="cancel-new">Continuar nesta</button><button class="crossword-primary-button" type="button" data-action="confirm-new">Gerar nova</button></div>
      </section>
    </div>`;
  }

  renderResultModal() {
    if (!this.state.resultOpen || this.state.solvedIds.length !== 10) return "";
    return `<div class="crossword-modal-layer" role="presentation">
      <section class="crossword-modal crossword-result-modal" role="dialog" aria-modal="true" aria-labelledby="result-modal-title">
        <button class="crossword-modal-close" type="button" data-action="close-result" aria-label="Fechar">×</button>
        <span class="crossword-result-seal">${icon("check_circle")}</span>
        <span class="crossword-overline">Atividade concluída</span>
        <h2 id="result-modal-title">Parabéns, ${escapeHTML(this.state.studentName)}!</h2>
        <p>${this.state.assistedByTeacher ? "Cruzadinha concluída com ajuda do professor." : "Você encontrou corretamente todos os conceitos."}</p>
        <div class="crossword-result-stats"><div><strong>10/10</strong><span>palavras</span></div><div><strong>${formatTime(this.elapsedSeconds())}</strong><span>tempo</span></div><div><strong>${this.state.hintsUsed}</strong><span>dicas usadas</span></div></div>
        ${this.state.assistedByTeacher ? "<div class=\"crossword-assisted-badge\">Apoio do professor registrado</div>" : ""}
        <div class="crossword-modal-actions"><button class="crossword-secondary-button" type="button" data-action="close-result">Rever grade</button><button class="crossword-primary-button" type="button" data-action="play-again">Jogar novamente</button></div>
      </section>
    </div>`;
  }

  handleSubmit(event) {
    const form = event.target.closest("[data-crossword-form]");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.crosswordForm === "name") {
      const name = String(new FormData(form).get("studentName") || "").trim().replace(/\s+/g, " ");
      const error = this.root.querySelector("[data-name-error]");
      if (name.length < 2 || name.length > 40) {
        if (error) error.textContent = "Digite um nome com 2 a 40 caracteres.";
        this.root.querySelector("#crossword-student-name")?.focus();
        return;
      }
      this.beginGeneration(name);
    } else if (form.dataset.crosswordForm === "teacher") {
      this.verifyTeacherPassword(String(new FormData(form).get("password") || ""));
    }
  }

  handleClick(event) {
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) {
      const cellInput = event.target.closest("[data-cell-key]");
      if (cellInput) this.selectEntryFromCell(cellInput.dataset.cellKey);
      return;
    }
    const { action } = actionTarget.dataset;
    if (action === "teacher-trigger") this.registerTeacherClick();
    if (action === "select-entry") this.selectEntry(actionTarget.dataset.entryId);
    if (action === "hint") this.useHint();
    if (action === "new-game") {
      this.state.confirmNewOpen = true;
      this.renderGame();
    }
    if (action === "cancel-new") {
      this.state.confirmNewOpen = false;
      this.renderGame();
    }
    if (action === "confirm-new" || action === "play-again") this.resetToIntro();
    if (action === "show-result") {
      this.state.resultOpen = true;
      this.saveSession();
      this.renderGame();
    }
    if (action === "close-result") {
      this.state.resultOpen = false;
      this.saveSession();
      this.renderGame();
    }
    if (action === "close-teacher") {
      this.state.teacherModalOpen = false;
      this.state.teacherError = "";
      this.render();
    }
  }

  handleInput(event) {
    const input = event.target.closest("[data-cell-key]");
    if (!input || !this.state?.puzzle) return;
    const key = input.dataset.cellKey;
    if (this.lockedCells().has(key)) return;
    const value = normalizeCrosswordAnswer(input.value).slice(-1);
    input.value = value;
    this.state.values[key] = value;
    input.closest(".crossword-cell")?.classList.add("is-typed");
    this.setTimer(() => input.closest(".crossword-cell")?.classList.remove("is-typed"), 210);
    this.checkAffectedEntries(key);
    this.saveSession();
    if (value) this.focusNextCell(key);
  }

  handleKeydown(event) {
    const input = event.target.closest("[data-cell-key]");
    if ((event.ctrlKey || event.metaKey) && ["c", "x"].includes(event.key.toLowerCase())) {
      event.preventDefault();
      return;
    }
    if (!input || !this.state?.puzzle) return;
    const key = input.dataset.cellKey;
    if (event.key === "Backspace" && !this.lockedCells().has(key)) {
      event.preventDefault();
      if (this.state.values[key]) {
        this.state.values[key] = "";
        input.value = "";
        this.checkAffectedEntries(key, false);
      } else {
        const previous = this.findRelativeEntryCell(key, -1);
        if (previous && !this.lockedCells().has(previous.key)) {
          this.state.values[previous.key] = "";
          const previousInput = this.root.querySelector(`[data-cell-key="${previous.key}"]`);
          if (previousInput) previousInput.value = "";
          this.checkAffectedEntries(previous.key, false);
          previousInput?.focus();
        }
      }
      this.saveSession();
    }

    const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (directions[event.key]) {
      event.preventDefault();
      this.focusGridNeighbor(key, ...directions[event.key]);
    }
  }

  selectEntryFromCell(key) {
    const boardCell = this.state.puzzle.cells.find((cell) => cell.key === key);
    if (!boardCell) return;
    const unsolved = boardCell.entryIds.find((id) => !this.solvedSet.has(id));
    const nextId = unsolved || boardCell.entryIds[0];
    if (nextId && nextId !== this.state.activeEntryId) {
      this.state.activeEntryId = nextId;
      this.syncGameDom();
    }
  }

  selectEntry(entryId) {
    if (!this.entryMap.has(entryId)) return;
    this.state.activeEntryId = entryId;
    this.syncGameDom();
    const entry = this.entryMap.get(entryId);
    const target = entry.cells.find((cell) => !this.lockedCells().has(cell.key) && !this.state.values[cell.key])
      || entry.cells.find((cell) => !this.lockedCells().has(cell.key));
    this.root.querySelector(`[data-cell-key="${target?.key}"]`)?.focus();
  }

  checkAffectedEntries(key, animateWrong = true) {
    const boardCell = this.state.puzzle.cells.find((cell) => cell.key === key);
    if (!boardCell) return;
    const invalid = new Set(this.state.invalidIds);
    const solved = new Set(this.state.solvedIds);
    let correctId = null;
    let wrongId = null;

    for (const entryId of boardCell.entryIds) {
      if (solved.has(entryId)) continue;
      const entry = this.entryMap.get(entryId);
      const filled = entry.cells.every((cell) => Boolean(this.state.values[cell.key]));
      invalid.delete(entryId);
      if (!filled) continue;
      if (evaluateEntry(entry, this.state.values)) {
        solved.add(entryId);
        correctId = entryId;
      } else {
        invalid.add(entryId);
        wrongId = entryId;
      }
    }

    this.state.solvedIds = [...solved];
    this.state.invalidIds = [...invalid];
    if (solved.size === this.state.puzzle.entries.length) {
      this.state.phase = "complete";
      this.state.finishedAt = Date.now();
      this.stopClock();
    }
    this.syncGameDom();
    if (correctId) this.animateEntry(correctId, "correct");
    if (wrongId && animateWrong) this.animateEntry(wrongId, "wrong");
  }

  animateEntry(entryId, type) {
    const entry = this.entryMap.get(entryId);
    const clue = this.root.querySelector(`[data-entry-id="${entryId}"]`);
    const cells = entry.cells.map((cell) => this.root.querySelector(`[data-cell-wrap="${cell.key}"]`)).filter(Boolean);
    clue?.classList.add(type === "correct" ? "is-celebrating" : "is-shaking");
    cells.forEach((cell, index) => this.setTimer(() => cell.classList.add(type === "correct" ? "is-celebrating" : "is-shaking"), index * 24));
    this.setTimer(() => {
      clue?.classList.remove("is-celebrating", "is-shaking");
      cells.forEach((cell) => cell.classList.remove("is-celebrating", "is-shaking"));
    }, 620);
    this.setFeedback(type === "correct"
      ? `Palavra ${entry.number} correta!`
      : `A palavra ${entry.number} ainda não está correta. Revise as letras.`, type);
  }

  setFeedback(message, type = "neutral") {
    const feedback = this.root.querySelector("[data-crossword-feedback]");
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.type = type;
  }

  syncGameDom() {
    if (!this.state?.puzzle || !this.root.querySelector(".crossword-board")) return;
    const solved = this.solvedSet;
    const invalid = new Set(this.state.invalidIds);
    const locked = this.lockedCells();
    const hinted = this.hintedSet;
    const active = this.entryMap.get(this.state.activeEntryId);
    const activeKeys = new Set(active?.cells.map((cell) => cell.key) || []);

    for (const cell of this.state.puzzle.cells) {
      const wrapper = this.root.querySelector(`[data-cell-wrap="${cell.key}"]`);
      const input = wrapper?.querySelector("input");
      if (!wrapper || !input) continue;
      wrapper.classList.toggle("is-active", activeKeys.has(cell.key));
      wrapper.classList.toggle("is-locked", locked.has(cell.key));
      wrapper.classList.toggle("is-hint", hinted.has(cell.key) && !cell.entryIds.some((id) => solved.has(id)));
      wrapper.classList.toggle("is-correct", cell.entryIds.some((id) => solved.has(id)));
      wrapper.classList.toggle("is-invalid", cell.entryIds.some((id) => invalid.has(id)));
      input.readOnly = locked.has(cell.key);
      input.tabIndex = locked.has(cell.key) ? -1 : 0;
      input.value = this.state.values[cell.key] || "";
    }

    for (const entry of this.state.puzzle.entries) {
      const clue = this.root.querySelector(`[data-entry-id="${entry.id}"]`);
      if (!clue) continue;
      clue.classList.toggle("is-active", entry.id === this.state.activeEntryId);
      clue.classList.toggle("is-solved", solved.has(entry.id));
      clue.classList.toggle("is-invalid", invalid.has(entry.id));
      clue.setAttribute("aria-pressed", String(entry.id === this.state.activeEntryId));
      const status = clue.querySelector(".crossword-clue-status");
      if (status) {
        status.setAttribute("aria-label", solved.has(entry.id) ? "Correta" : invalid.has(entry.id) ? "Revise" : "Pendente");
        if (solved.has(entry.id) && !status.querySelector("img")) status.innerHTML = icon("check_circle");
      }
    }

    const progress = this.root.querySelector("[data-crossword-progress]");
    if (progress) progress.textContent = `${solved.size}/10`;
    const cluesProgress = this.root.querySelector(".crossword-clues-heading > span");
    if (cluesProgress) cluesProgress.textContent = `${solved.size}/10`;
    const resultButton = this.root.querySelector('[data-action="show-result"]');
    if (resultButton) resultButton.disabled = solved.size !== 10;
    if (solved.size === 10) this.setFeedback("Todas as palavras estão corretas! Veja o resultado.", "correct");
  }

  findRelativeEntryCell(key, offset) {
    const entry = this.entryMap.get(this.state.activeEntryId);
    if (!entry) return null;
    const index = entry.cells.findIndex((cell) => cell.key === key);
    if (index < 0) return null;
    for (let nextIndex = index + offset; nextIndex >= 0 && nextIndex < entry.cells.length; nextIndex += offset) {
      if (!this.lockedCells().has(entry.cells[nextIndex].key)) return entry.cells[nextIndex];
    }
    return null;
  }

  focusNextCell(key) {
    const next = this.findRelativeEntryCell(key, 1);
    this.root.querySelector(`[data-cell-key="${next?.key}"]`)?.focus();
  }

  focusGridNeighbor(key, rowStep, columnStep) {
    const current = this.state.puzzle.cells.find((cell) => cell.key === key);
    if (!current) return;
    let row = current.row + rowStep;
    let column = current.column + columnStep;
    for (let distance = 0; distance < Math.max(this.state.puzzle.rows, this.state.puzzle.columns); distance += 1) {
      const candidate = this.state.puzzle.cells.find((cell) => cell.row === row && cell.column === column);
      if (candidate) {
        this.selectEntryFromCell(candidate.key);
        this.root.querySelector(`[data-cell-key="${candidate.key}"]`)?.focus();
        return;
      }
      row += rowStep;
      column += columnStep;
    }
  }

  useHint() {
    if (this.state.hintsUsed >= MAX_HINTS || this.state.solvedIds.length === 10) return;
    const entry = this.entryMap.get(this.state.activeEntryId);
    if (!entry || this.solvedSet.has(entry.id)) {
      this.setFeedback("Selecione primeiro uma definição que ainda não foi resolvida.", "warning");
      return;
    }
    const hint = revealHint({
      entry,
      cellValues: this.state.values,
      lockedCells: this.lockedCells(),
      random: cryptoRandom
    });
    if (!hint) {
      this.setFeedback("Essa palavra não possui uma letra disponível para dica.", "warning");
      return;
    }
    this.state.values[hint.key] = hint.value;
    this.state.hintedCells = [...new Set([...this.state.hintedCells, hint.key])];
    this.state.hintsUsed += 1;
    this.checkAffectedEntries(hint.key, false);
    this.saveSession();
    this.renderGame();
    const hintedCell = this.root.querySelector(`[data-cell-wrap="${hint.key}"]`);
    hintedCell?.classList.add("is-revealing");
    this.setFeedback(`Dica usada na palavra ${entry.number}. Restam ${MAX_HINTS - this.state.hintsUsed}.`, "hint");
  }

  registerTeacherClick() {
    const now = Date.now();
    this.teacherClicks = [...this.teacherClicks.filter((time) => now - time <= 4000), now];
    if (this.teacherClicks.length < 5) return;
    this.teacherClicks = [];
    this.state.teacherModalOpen = true;
    this.state.teacherError = "";
    this.render();
    this.setTimer(() => this.root.querySelector("#crossword-teacher-password")?.focus(), 30);
  }

  async verifyTeacherPassword(password) {
    const digest = await hashText(password);
    if (digest !== TEACHER_PASSWORD_HASH) {
      this.state.teacherError = "Senha incorreta.";
      this.render();
      this.setTimer(() => this.root.querySelector("#crossword-teacher-password")?.focus(), 30);
      return;
    }
    this.state.teacherModalOpen = false;
    this.state.teacherError = "";
    if (!this.state.puzzle) return;
    this.completeWithTeacher();
  }

  completeWithTeacher() {
    const cells = [...this.state.puzzle.cells].sort((left, right) => left.row - right.row || left.column - right.column);
    this.state.assistedByTeacher = true;
    cells.forEach((cell, index) => {
      this.setTimer(() => {
        this.state.values[cell.key] = cell.solution;
        const input = this.root.querySelector(`[data-cell-key="${cell.key}"]`);
        const wrapper = input?.closest(".crossword-cell");
        if (input) input.value = cell.solution;
        wrapper?.classList.add("is-teacher-fill");
      }, index * 34);
    });
    this.setTimer(() => {
      this.state.solvedIds = this.state.puzzle.entries.map((entry) => entry.id);
      this.state.invalidIds = [];
      this.state.phase = "complete";
      this.state.finishedAt = Date.now();
      this.state.resultOpen = true;
      this.saveSession();
      this.renderGame();
    }, (cells.length * 34) + 380);
  }

  resetToIntro() {
    const name = this.state.studentName;
    this.clearTimers();
    this.stopClock();
    sessionStorage.removeItem(SESSION_KEY);
    this.state = this.createIntroState(name);
    this.renderIntro();
    this.setTimer(() => this.root.querySelector("#crossword-student-name")?.focus(), 40);
  }

  updateBoardCellSize() {
    const board = this.root?.querySelector(".crossword-board");
    const scroll = this.root?.querySelector(".crossword-board-scroll");
    if (!board || !scroll || !this.state?.puzzle) return;
    const horizontalChrome = 16 + (Math.max(0, this.state.puzzle.columns - 1) * 2);
    const verticalChrome = 16 + (Math.max(0, this.state.puzzle.rows - 1) * 2);
    const availableWidth = Math.max(260, scroll.clientWidth - 28 - horizontalChrome);
    const availableHeight = Math.max(240, scroll.clientHeight - 28 - verticalChrome);
    const widthSize = Math.floor(availableWidth / this.state.puzzle.columns);
    const heightSize = Math.floor(availableHeight / this.state.puzzle.rows);
    const size = Math.max(20, Math.min(43, widthSize, heightSize));
    board.style.setProperty("--crossword-cell-size", `${size}px`);
  }
}

export const crosswordGame = new CrosswordGameController();

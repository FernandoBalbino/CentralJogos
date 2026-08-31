import { desafioCategories, desafioFinalQuestions, desafioQuestions } from "./desafio-ti-data.mjs?v=1.0.0";
import {
  DESAFIO_STATE_VERSION,
  buildMatchBoard,
  getNextTeamId,
  isBoardComplete,
  rankTeams,
  sanitizeStoredState,
  scoreAttempt,
  scoreFinalRound
} from "./desafio-ti-core.mjs?v=1.0.0";

const SESSION_KEY = "central-jogos-desafio-ti-session-v1";
const TEAM_COLORS = ["#58d6ff", "#fb7185", "#4ade80", "#c084fc", "#fb923c", "#facc15"];

const escapeHTML = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const cryptoRandom = () => {
  if (!globalThis.crypto?.getRandomValues) return Math.random();
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 4294967296;
};

const formatScore = (score) => new Intl.NumberFormat("pt-BR").format(score);

class DesafioTiController {
  constructor() {
    this.root = null;
    this.active = false;
    this.state = null;
    this.savedSession = null;
    this.setupDraft = this.createSetupDraft();
    this.clock = null;
    this.uiTimers = new Set();
    this.audioContext = null;
    this.helpOpen = false;
    this.boundClick = (event) => this.handleClick(event);
    this.boundInput = (event) => this.handleInput(event);
    this.boundKeydown = (event) => this.handleKeydown(event);
    this.boundFullscreen = () => this.updateFullscreenLabel();
  }

  mount(root) {
    this.root = root;
  }

  createSetupDraft() {
    return {
      teamCount: 4,
      names: Array.from({ length: 6 }, (_, index) => `Equipe ${index + 1}`),
      timerDuration: 30,
      soundEnabled: true,
      firstTeamIndex: null
    };
  }

  enter() {
    if (!this.root || this.active) return;
    this.active = true;
    this.savedSession = this.loadSession();
    this.state = { phase: "setup" };
    this.root.addEventListener("click", this.boundClick);
    this.root.addEventListener("input", this.boundInput);
    document.addEventListener("keydown", this.boundKeydown);
    document.addEventListener("fullscreenchange", this.boundFullscreen);
    document.body.classList.add("desafio-ti-active");
    this.render();
  }

  leave() {
    if (!this.active) return;
    this.saveSession();
    this.active = false;
    this.stopClock();
    this.clearUiTimers();
    this.root?.removeEventListener("click", this.boundClick);
    this.root?.removeEventListener("input", this.boundInput);
    document.removeEventListener("keydown", this.boundKeydown);
    document.removeEventListener("fullscreenchange", this.boundFullscreen);
    document.body.classList.remove("desafio-ti-active");
    if (document.fullscreenElement?.closest?.("#desafio-ti-app")) document.exitFullscreen().catch(() => {});
    if (this.root) this.root.innerHTML = "";
    this.state = null;
    this.helpOpen = false;
  }

  handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target || !this.root?.contains(target)) return;
    const { action } = target.dataset;
    const actions = {
      "start-match": () => this.startMatch(),
      "raffle-team": () => this.raffleFirstTeam(),
      "resume-match": () => this.resumeMatch(),
      "discard-save": () => this.discardSavedMatch(),
      "open-cell": () => this.openCell(target.dataset.cellId),
      "set-current-team": () => this.setCurrentTeam(target.dataset.teamId),
      "score-delta": () => this.adjustScore(target.dataset.teamId, Number(target.dataset.delta)),
      "score-edit": () => this.editScore(target.dataset.teamId),
      "toggle-timer": () => this.toggleTimer(),
      "reset-timer": () => this.resetTimer(),
      "reveal-answer": () => this.revealAnswer(),
      "mark-correct": () => this.markAttempt(true),
      "mark-wrong": () => this.markAttempt(false),
      "choose-steal": () => this.chooseSteal(target.dataset.teamId),
      "show-steal-options": () => this.showStealOptions(),
      "finish-no-steal": () => this.finishNoSteal(),
      "back-board": () => this.backToBoard(),
      "open-help": () => this.openHelp(),
      "close-help": () => this.closeHelp(),
      "toggle-sound": () => this.toggleSound(),
      "toggle-fullscreen": () => this.toggleFullscreen(),
      "restart-match": () => this.restartMatch(),
      "start-final": () => this.startFinal(),
      "reveal-final": () => this.revealFinal(),
      "final-result": () => this.setFinalResult(target.dataset.teamId, target.dataset.result),
      "finish-final": () => this.finishFinal(),
      "new-match": () => this.newMatch(),
      "go-home": () => { window.location.hash = "#/"; }
    };
    actions[action]?.();
  }

  handleInput(event) {
    const target = event.target;
    if (target.matches("[data-team-name]")) {
      this.setupDraft.names[Number(target.dataset.teamName)] = target.value;
      return;
    }
    if (target.matches("[data-team-count]")) {
      this.captureSetupNames();
      this.setupDraft.teamCount = Number(target.value);
      if (this.setupDraft.firstTeamIndex >= this.setupDraft.teamCount) this.setupDraft.firstTeamIndex = null;
      this.render();
      return;
    }
    if (target.matches("[data-timer-duration]")) this.setupDraft.timerDuration = Number(target.value);
    if (target.matches("[data-sound-enabled]")) this.setupDraft.soundEnabled = target.checked;
  }

  handleKeydown(event) {
    if (!this.active) return;
    const typing = event.target.matches?.("input,textarea,select,[contenteditable='true']");
    if (event.key === "Escape" && this.helpOpen) {
      event.preventDefault();
      this.closeHelp();
      return;
    }
    if (typing) return;
    const key = event.key.toLocaleLowerCase("pt-BR");
    if (key === "f") this.toggleFullscreen();
    if (key === "m") this.toggleSound();
    if (key === "r" && this.state?.phase === "question") this.revealAnswer();
    if (event.code === "Space" && this.state?.phase === "question") {
      event.preventDefault();
      this.toggleTimer();
    }
    if (event.key === "Escape" && this.state?.phase === "question") {
      event.preventDefault();
      this.backToBoard();
    }
  }

  captureSetupNames() {
    this.root?.querySelectorAll("[data-team-name]").forEach((input) => {
      this.setupDraft.names[Number(input.dataset.teamName)] = input.value;
    });
  }

  raffleFirstTeam() {
    this.captureSetupNames();
    this.setupDraft.firstTeamIndex = Math.floor(cryptoRandom() * this.setupDraft.teamCount);
    this.playSound("select", true);
    this.render();
  }

  startMatch() {
    this.captureSetupNames();
    const { categories, cells } = buildMatchBoard({
      categories: desafioCategories,
      questions: desafioQuestions,
      random: cryptoRandom
    });
    const teams = Array.from({ length: this.setupDraft.teamCount }, (_, index) => ({
      id: `team-${index + 1}`,
      name: this.setupDraft.names[index].trim() || `Equipe ${index + 1}`,
      score: 0,
      color: TEAM_COLORS[index]
    }));
    const firstTeamIndex = this.setupDraft.firstTeamIndex ?? Math.floor(cryptoRandom() * teams.length);
    this.state = {
      version: DESAFIO_STATE_VERSION,
      phase: "board",
      teams,
      currentTeamId: teams[firstTeamIndex].id,
      categoryIds: categories.map((category) => category.id),
      cells,
      settings: {
        timerDuration: this.setupDraft.timerDuration,
        soundEnabled: this.setupDraft.soundEnabled
      },
      timer: {
        duration: this.setupDraft.timerDuration,
        remaining: this.setupDraft.timerDuration,
        status: "paused"
      },
      active: null,
      final: null,
      announcement: `${teams[firstTeamIndex].name} começa a partida.`
    };
    this.savedSession = null;
    this.playSound("start");
    this.saveSession();
    this.render();
  }

  resumeMatch() {
    if (!this.savedSession) return;
    this.state = this.savedSession;
    this.savedSession = null;
    this.state.announcement = "Partida restaurada. O cronômetro está pausado.";
    this.render();
  }

  discardSavedMatch() {
    if (!window.confirm("Apagar a partida salva e manter esta configuração nova?")) return;
    localStorage.removeItem(SESSION_KEY);
    this.savedSession = null;
    this.render();
  }

  openCell(cellId) {
    if (this.state.phase !== "board") return;
    const cell = this.state.cells.find((item) => item.id === cellId);
    if (!cell || cell.status !== "available") return;
    cell.status = "active";
    this.state.phase = "question";
    this.state.active = {
      cellId,
      questionId: cell.questionId,
      chooserTeamId: this.state.currentTeamId,
      answeringTeamId: this.state.currentTeamId,
      role: "original",
      stage: "prompt",
      originalWrong: false,
      answerRevealed: false,
      outcome: null
    };
    this.resetTimer(false);
    this.playSound("select");
    this.saveSession();
    this.render();
  }

  setCurrentTeam(teamId) {
    if (!this.state?.teams?.some((team) => team.id === teamId)) return;
    if (this.state.phase === "question") return;
    this.state.currentTeamId = teamId;
    this.state.announcement = `${this.teamById(teamId).name} agora está com a vez.`;
    this.playSound("select");
    this.saveSession();
    this.render();
  }

  adjustScore(teamId, delta) {
    const team = this.teamById(teamId);
    if (!team || !Number.isFinite(delta)) return;
    team.score += delta;
    this.state.announcement = `${team.name}: ${delta > 0 ? "+" : ""}${delta} pontos. Total ${team.score}.`;
    this.saveSession();
    this.render();
  }

  editScore(teamId) {
    const team = this.teamById(teamId);
    if (!team) return;
    const next = window.prompt(`Nova pontuação de ${team.name}:`, String(team.score));
    if (next === null || !/^-?\d+$/.test(next.trim())) return;
    team.score = Number(next);
    this.state.announcement = `Pontuação de ${team.name} alterada para ${team.score}.`;
    this.saveSession();
    this.render();
  }

  revealAnswer() {
    const active = this.state?.active;
    if (this.state?.phase !== "question" || !active || active.stage === "outcome") return;
    active.answerRevealed = true;
    if (active.stage === "after-wrong" || active.stage === "steal-select") {
      this.finishNoSteal();
      return;
    }
    this.stopClock();
    this.state.timer.status = "paused";
    this.playSound("reveal");
    this.state.announcement = `Resposta: ${this.activeQuestion().answer}.`;
    this.saveSession();
    this.render();
  }

  markAttempt(correct) {
    const active = this.state?.active;
    if (this.state?.phase !== "question" || !active || !["prompt"].includes(active.stage)) return;
    this.stopClock();
    const cell = this.activeCell();
    const result = scoreAttempt({
      teams: this.state.teams,
      teamId: active.answeringTeamId,
      correct,
      value: cell.value,
      isDouble: cell.isDouble
    });
    this.state.teams = result.teams;
    const team = this.teamById(active.answeringTeamId);
    const isSteal = active.role === "steal";

    if (correct) {
      this.state.currentTeamId = active.answeringTeamId;
      this.completeActiveCell();
      active.answerRevealed = true;
      active.stage = "outcome";
      active.outcome = { correct: true, delta: result.delta, teamName: team.name, label: isSteal ? "Roubo certeiro!" : "Resposta certa!" };
      this.state.announcement = `${team.name} acertou e ganhou ${result.delta} pontos.`;
      this.playSound("correct");
      this.saveSession();
      this.render();
      this.scheduleQuestionFinish();
      return;
    }

    this.state.announcement = `${team.name} errou e perdeu ${Math.abs(result.delta)} pontos.`;
    this.playSound("wrong");
    if (isSteal || active.answerRevealed) {
      this.state.currentTeamId = getNextTeamId(this.state.teams, active.chooserTeamId);
      this.completeActiveCell();
      active.answerRevealed = true;
      active.stage = "outcome";
      active.outcome = { correct: false, delta: result.delta, teamName: team.name, label: isSteal ? "Roubo incorreto" : "Resposta incorreta" };
      this.saveSession();
      this.render();
      this.scheduleQuestionFinish();
    } else {
      active.originalWrong = true;
      active.stage = "after-wrong";
      this.state.timer.status = "paused";
      this.saveSession();
      this.render();
    }
  }

  showStealOptions() {
    if (this.state?.active?.stage !== "after-wrong") return;
    this.state.active.stage = "steal-select";
    this.saveSession();
    this.render();
  }

  chooseSteal(teamId) {
    const active = this.state?.active;
    if (active?.stage !== "steal-select" || teamId === active.chooserTeamId || !this.teamById(teamId)) return;
    active.answeringTeamId = teamId;
    active.role = "steal";
    active.stage = "prompt";
    active.answerRevealed = false;
    this.resetTimer(false);
    this.state.announcement = `${this.teamById(teamId).name} vai tentar roubar a pergunta.`;
    this.playSound("select");
    this.saveSession();
    this.render();
  }

  finishNoSteal() {
    const active = this.state?.active;
    if (!active || !["after-wrong", "steal-select"].includes(active.stage)) return;
    this.state.currentTeamId = getNextTeamId(this.state.teams, active.chooserTeamId);
    this.completeActiveCell();
    active.answerRevealed = true;
    active.stage = "outcome";
    active.outcome = { correct: false, delta: 0, teamName: "", label: "Pergunta encerrada" };
    this.state.announcement = `Pergunta encerrada. ${this.teamById(this.state.currentTeamId).name} fica com a vez.`;
    this.playSound("reveal");
    this.saveSession();
    this.render();
    this.scheduleQuestionFinish();
  }

  backToBoard() {
    const active = this.state?.active;
    if (this.state?.phase !== "question" || !active || active.stage === "outcome") return;
    if (active.originalWrong) {
      window.alert("Depois de registrar um erro, encerre a pergunta ou escolha uma equipe para o roubo.");
      return;
    }
    const revealed = active.answerRevealed;
    const message = revealed
      ? "A resposta já foi mostrada. Encerrar esta pergunta sem pontuar e marcar a casa como usada?"
      : "Voltar ao tabuleiro? Esta pergunta continuará disponível.";
    if (!window.confirm(message)) return;
    this.stopClock();
    if (revealed) {
      this.state.currentTeamId = getNextTeamId(this.state.teams, active.chooserTeamId);
      this.completeActiveCell();
    } else {
      this.activeCell().status = "available";
    }
    this.state.active = null;
    this.state.phase = isBoardComplete(this.state.cells) ? "final" : "board";
    if (this.state.phase === "final") this.prepareFinal();
    this.saveSession();
    this.render();
  }

  completeActiveCell() {
    const cell = this.activeCell();
    if (cell) cell.status = "used";
  }

  scheduleQuestionFinish() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      this.uiTimers.delete(timer);
      if (this.active) this.finishQuestion();
    }, reduced ? 120 : 1900);
    this.uiTimers.add(timer);
  }

  finishQuestion() {
    if (this.state?.phase !== "question" || this.state.active?.stage !== "outcome") return;
    this.state.active = null;
    if (isBoardComplete(this.state.cells)) {
      this.state.phase = "final";
      this.prepareFinal();
    } else {
      this.state.phase = "board";
    }
    this.saveSession();
    this.render();
  }

  prepareFinal() {
    if (this.state.final) return;
    const question = desafioFinalQuestions[Math.floor(cryptoRandom() * desafioFinalQuestions.length)];
    this.state.final = { stage: "intro", questionId: question.id, results: {} };
  }

  startFinal() {
    if (this.state?.phase !== "final") return;
    this.state.final.stage = "prompt";
    this.resetTimer(false);
    this.playSound("start");
    this.saveSession();
    this.render();
  }

  revealFinal() {
    if (this.state?.phase !== "final" || this.state.final.stage !== "prompt") return;
    this.stopClock();
    this.state.final.stage = "grading";
    this.playSound("reveal");
    this.saveSession();
    this.render();
  }

  setFinalResult(teamId, result) {
    if (this.state?.phase !== "final" || this.state.final.stage !== "grading" || !["correct", "wrong"].includes(result)) return;
    this.state.final.results[teamId] = result;
    this.saveSession();
    this.render();
  }

  finishFinal() {
    if (this.state?.phase !== "final" || this.state.final.stage !== "grading") return;
    if (!this.state.teams.every((team) => this.state.final.results[team.id])) return;
    this.state.teams = scoreFinalRound(this.state.teams, this.state.final.results);
    this.state.phase = "result";
    this.state.final.stage = "complete";
    this.playSound("victory");
    this.saveSession();
    this.render();
  }

  newMatch() {
    localStorage.removeItem(SESSION_KEY);
    this.stopClock();
    this.clearUiTimers();
    this.setupDraft = this.createSetupDraft();
    this.savedSession = null;
    this.state = { phase: "setup" };
    this.render();
  }

  restartMatch() {
    if (!window.confirm("Reiniciar a partida? Equipes, pontos e perguntas utilizadas serão apagados.")) return;
    this.newMatch();
  }

  toggleTimer() {
    if (!this.state || !["question", "final"].includes(this.state.phase)) return;
    if (this.state.timer.status === "running") {
      this.stopClock();
      this.state.timer.status = "paused";
      this.saveSession();
      this.updateTimerDisplay();
      return;
    }
    if (this.state.timer.remaining <= 0) this.state.timer.remaining = this.state.timer.duration;
    this.state.timer.status = "running";
    this.clock = window.setInterval(() => this.tickTimer(), 1000);
    this.updateTimerDisplay();
  }

  resetTimer(render = true) {
    this.stopClock();
    if (!this.state?.timer) return;
    this.state.timer.duration = this.state.settings.timerDuration;
    this.state.timer.remaining = this.state.settings.timerDuration;
    this.state.timer.status = "paused";
    this.saveSession();
    if (render) this.render();
  }

  tickTimer() {
    if (!this.active || this.state?.timer?.status !== "running") return;
    this.state.timer.remaining = Math.max(0, this.state.timer.remaining - 1);
    if (this.state.timer.remaining <= 5 && this.state.timer.remaining > 0) this.playSound("tick");
    if (this.state.timer.remaining === 0) {
      this.stopClock();
      this.state.timer.status = "expired";
      this.state.announcement = "Tempo esgotado!";
      this.playSound("expired");
    }
    this.saveSession();
    this.updateTimerDisplay();
  }

  stopClock() {
    if (this.clock) window.clearInterval(this.clock);
    this.clock = null;
  }

  updateTimerDisplay() {
    const element = this.root?.querySelector("[data-timer-display]");
    if (!element || !this.state?.timer) return;
    element.textContent = String(this.state.timer.remaining).padStart(2, "0");
    const timer = element.closest(".dt-timer");
    timer?.classList.toggle("is-warning", this.state.timer.remaining <= 5 && this.state.timer.remaining > 0);
    timer?.classList.toggle("is-expired", this.state.timer.status === "expired");
    const button = this.root.querySelector('[data-action="toggle-timer"]');
    if (button) button.textContent = this.state.timer.status === "running" ? "Pausar" : this.state.timer.status === "expired" ? "Reiniciar" : "Iniciar tempo";
  }

  toggleSound() {
    if (this.state?.phase === "setup") {
      this.setupDraft.soundEnabled = !this.setupDraft.soundEnabled;
      this.render();
      return;
    }
    if (!this.state?.settings) return;
    this.state.settings.soundEnabled = !this.state.settings.soundEnabled;
    if (this.state.settings.soundEnabled) this.playSound("select");
    this.saveSession();
    this.render();
  }

  playSound(type, setup = false) {
    const enabled = setup ? this.setupDraft.soundEnabled : this.state?.settings?.soundEnabled;
    if (!enabled || !globalThis.AudioContext && !globalThis.webkitAudioContext) return;
    try {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      this.audioContext ||= new AudioContextClass();
      const now = this.audioContext.currentTime;
      const notes = {
        select: [[520,.06]], start: [[330,.08],[495,.1]], reveal: [[430,.08],[650,.12]],
        correct: [[523,.08],[659,.08],[784,.18]], wrong: [[220,.12],[165,.2]],
        tick: [[760,.05]], expired: [[260,.12],[210,.2]], victory: [[523,.1],[659,.1],[784,.1],[1046,.3]]
      }[type] || [[440,.06]];
      notes.forEach(([frequency, duration], index) => {
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        oscillator.type = type === "wrong" ? "sawtooth" : "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, now + index * .09);
        gain.gain.exponentialRampToValueAtTime(.12, now + index * .09 + .01);
        gain.gain.exponentialRampToValueAtTime(.0001, now + index * .09 + duration);
        oscillator.connect(gain).connect(this.audioContext.destination);
        oscillator.start(now + index * .09);
        oscillator.stop(now + index * .09 + duration + .02);
      });
    } catch {}
  }

  toggleFullscreen() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else this.root?.requestFullscreen().catch(() => {});
  }

  updateFullscreenLabel() {
    const button = this.root?.querySelector('[data-action="toggle-fullscreen"]');
    if (button) button.setAttribute("aria-label", document.fullscreenElement ? "Sair da tela cheia" : "Entrar em tela cheia");
  }

  openHelp() {
    this.helpOpen = true;
    this.render();
    this.root?.querySelector('[data-action="close-help"]')?.focus();
  }

  closeHelp() {
    this.helpOpen = false;
    this.render();
    this.root?.querySelector('[data-action="open-help"]')?.focus();
  }

  saveSession() {
    if (!this.state || this.state.phase === "setup" || !this.state.version) return;
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(this.state)); } catch {}
  }

  loadSession() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SESSION_KEY));
      return sanitizeStoredState(parsed);
    } catch {
      return null;
    }
  }

  clearUiTimers() {
    for (const timer of this.uiTimers) window.clearTimeout(timer);
    this.uiTimers.clear();
  }

  teamById(teamId) {
    return this.state?.teams?.find((team) => team.id === teamId) || null;
  }

  categoryById(categoryId) {
    return desafioCategories.find((category) => category.id === categoryId);
  }

  activeCell() {
    return this.state?.cells?.find((cell) => cell.id === this.state.active?.cellId) || null;
  }

  activeQuestion() {
    return desafioQuestions.find((question) => question.id === this.state.active?.questionId) || null;
  }

  finalQuestion() {
    return desafioFinalQuestions.find((question) => question.id === this.state.final?.questionId) || desafioFinalQuestions[0];
  }

  render() {
    if (!this.root || !this.state) return;
    if (this.state.phase === "setup") this.root.innerHTML = this.renderSetup();
    else if (this.state.phase === "result") this.root.innerHTML = this.renderResult();
    else this.root.innerHTML = this.renderGame();
    if (this.helpOpen) this.root.insertAdjacentHTML("beforeend", this.renderHelp());
    this.updateTimerDisplay();
  }

  renderSetup() {
    const fields = Array.from({ length: this.setupDraft.teamCount }, (_, index) => `
      <div class="dt-team-field" style="--team-color:${TEAM_COLORS[index]}">
        <i aria-hidden="true"></i>
        <label>Equipe ${index + 1}
          <input type="text" maxlength="24" value="${escapeHTML(this.setupDraft.names[index])}" data-team-name="${index}" aria-label="Nome da equipe ${index + 1}">
        </label>
      </div>
    `).join("");
    const raffled = this.setupDraft.firstTeamIndex === null ? "Nenhuma equipe sorteada ainda." : `${this.setupDraft.names[this.setupDraft.firstTeamIndex] || `Equipe ${this.setupDraft.firstTeamIndex + 1}`} começará!`;
    return `
      <div class="dt-shell dt-setup-shell">
        <header class="dt-setup-header">
          <span class="dt-kicker">Competição em equipes</span>
          <h1>DESAFIO <span>TI</span></h1>
          <p>Escolha uma categoria, arrisque os pontos e mostre o que você aprendeu!</p>
        </header>
        <div class="dt-setup-layout">
          <section class="dt-panel dt-config-panel" aria-labelledby="dt-config-title">
            <div class="dt-panel-heading">
              <div><h2 id="dt-config-title">Prepare as equipes</h2><p>Personalize os nomes ou mantenha o padrão.</p></div>
              <select class="dt-team-count" data-team-count aria-label="Quantidade de equipes">
                ${[2,3,4,5,6].map((count) => `<option value="${count}" ${count === this.setupDraft.teamCount ? "selected" : ""}>${count} equipes</option>`).join("")}
              </select>
            </div>
            <div class="dt-team-fields">${fields}</div>
            <div class="dt-settings-row">
              <div class="dt-setting"><label for="dt-duration">Tempo padrão</label><select id="dt-duration" data-timer-duration>${[15,30,45,60].map((duration) => `<option value="${duration}" ${duration === this.setupDraft.timerDuration ? "selected" : ""}>${duration} segundos</option>`).join("")}</select></div>
              <div class="dt-setting dt-toggle"><label for="dt-sound">Sons da partida</label><input id="dt-sound" type="checkbox" data-sound-enabled ${this.setupDraft.soundEnabled ? "checked" : ""}></div>
            </div>
            <div class="dt-setup-actions">
              <button class="dt-button dt-button-ghost" type="button" data-action="raffle-team">Sortear primeira equipe</button>
              <button class="dt-button dt-button-primary" type="button" data-action="start-match">Iniciar desafio</button>
            </div>
            <p class="dt-helper" role="status">${escapeHTML(raffled)}</p>
          </section>
          <aside class="dt-panel dt-info-panel">
            <div><h2>Como pontuar</h2></div>
            <ul class="dt-rules">
              <li><strong>+</strong><span>Acertou: ganha o valor da pergunta.</span></li>
              <li><strong>−</strong><span>Errou: perde o valor, inclusive no roubo.</span></li>
              <li><strong>2×</strong><span>Surpresa: o acerto vale o dobro.</span></li>
              <li><strong>→</strong><span>Quem acerta escolhe a próxima pergunta.</span></li>
            </ul>
            ${this.savedSession ? `<div class="dt-saved-card"><strong>Partida em andamento</strong><p>${this.savedSession.teams.length} equipes e ${this.savedSession.cells.filter((cell) => cell.status === "used").length} de 30 perguntas concluídas.</p><button class="dt-button dt-button-cyan" type="button" data-action="resume-match">Continuar partida</button> <button class="dt-button dt-button-ghost" type="button" data-action="discard-save">Apagar</button></div>` : ""}
            <a class="dt-button dt-button-ghost" href="#/">Voltar para a Central</a>
          </aside>
        </div>
      </div>
    `;
  }

  renderGame() {
    const used = this.state.cells.filter((cell) => cell.status === "used").length;
    const current = this.teamById(this.state.currentTeamId);
    const answeringId = this.state.phase === "question" ? this.state.active?.answeringTeamId : null;
    return `
      <div class="dt-shell dt-game-shell">
        <header class="dt-topbar">
          <div class="dt-brand"><span class="dt-brand-mark">TI</span><span><strong>Desafio TI</strong><small>Valendo pontos</small></span></div>
          <div class="dt-round-status"><strong>${this.state.phase === "final" ? "Desafio Final" : `${used} de 30 perguntas`}</strong><span>${current ? `${escapeHTML(current.name)} está com a vez` : "Rodada final"}</span></div>
          <div class="dt-toolbar">
            <button class="dt-icon-button" type="button" data-action="toggle-sound" aria-label="${this.state.settings.soundEnabled ? "Desativar som" : "Ativar som"}">${this.state.settings.soundEnabled ? "Som: sim" : "Som: não"}</button>
            <button class="dt-icon-button" type="button" data-action="toggle-fullscreen" aria-label="Entrar em tela cheia">Tela cheia</button>
            <button class="dt-icon-button" type="button" data-action="open-help" aria-label="Abrir ajuda">Ajuda</button>
            <button class="dt-icon-button" type="button" data-action="restart-match" aria-label="Reiniciar partida">Reiniciar</button>
          </div>
        </header>
        ${this.renderScoreboard(answeringId)}
        ${this.state.phase === "board" ? this.renderBoard() : this.state.phase === "question" ? this.renderQuestion() : this.renderFinal()}
        <p class="dt-announcer" aria-live="assertive">${escapeHTML(this.state.announcement || "")}</p>
      </div>
    `;
  }

  renderScoreboard(answeringId = null) {
    return `<section class="dt-scoreboard" style="--team-count:${this.state.teams.length}" aria-label="Placar das equipes">
      ${this.state.teams.map((team) => {
        const current = team.id === this.state.currentTeamId;
        const answering = team.id === answeringId;
        return `<article class="dt-team-score ${current ? "is-current" : ""} ${answering ? "is-answering" : ""}" style="--team-color:${team.color}">
          <button class="dt-team-select" type="button" data-action="set-current-team" data-team-id="${team.id}" ${this.state.phase === "question" ? "disabled" : ""} aria-label="Dar a vez para ${escapeHTML(team.name)}">
            <span class="dt-team-score-name"><span>${escapeHTML(team.name)}</span>${current ? '<em class="dt-current-label">VEZ</em>' : ""}</span>
            <span class="dt-team-score-value"><strong>${formatScore(team.score)}</strong><small>pontos</small></span>
          </button>
          <span class="dt-team-tools">
            <button class="dt-mini-button" type="button" data-action="score-delta" data-team-id="${team.id}" data-delta="100" aria-label="Somar 100 pontos a ${escapeHTML(team.name)}">+100</button>
            <button class="dt-mini-button" type="button" data-action="score-delta" data-team-id="${team.id}" data-delta="-100" aria-label="Retirar 100 pontos de ${escapeHTML(team.name)}">−100</button>
            <button class="dt-mini-button" type="button" data-action="score-edit" data-team-id="${team.id}" aria-label="Editar pontuação de ${escapeHTML(team.name)}">Editar</button>
          </span>
        </article>`;
      }).join("")}
    </section>`;
  }

  renderBoard() {
    const categories = this.state.categoryIds.map((id) => this.categoryById(id));
    return `<main class="dt-board-area"><div class="dt-board" role="grid" aria-label="Tabuleiro com seis categorias e trinta perguntas">
      ${categories.map((category) => `<div class="dt-category-card" style="--category-color:${category.color}" role="columnheader"><strong>${escapeHTML(category.shortLabel)}</strong></div>`).join("")}
      ${[100,200,300,400,500].flatMap((value) => categories.map((category) => {
        const cell = this.state.cells.find((item) => item.categoryId === category.id && item.value === value);
        const used = cell.status === "used";
        return `<button class="dt-value-card ${used ? "is-used" : ""} ${cell.isDouble && !used ? "is-surprise" : ""}" type="button" role="gridcell" data-action="open-cell" data-cell-id="${cell.id}" ${used ? "disabled" : ""} aria-label="${used ? "Pergunta utilizada" : `${category.label} por ${value}${cell.isDouble ? ", desafio surpresa" : ""}`}">${used ? "" : cell.isDouble ? "?" : value}</button>`;
      })).join("")}
    </div></main>`;
  }

  renderQuestion() {
    const question = this.activeQuestion();
    const cell = this.activeCell();
    const category = this.categoryById(cell.categoryId);
    const active = this.state.active;
    const answering = this.teamById(active.answeringTeamId);
    const showAnswer = active.answerRevealed || active.stage === "outcome";
    const controls = this.renderQuestionControls();
    return `<main class="dt-question-area"><section class="dt-question-card ${showAnswer ? "has-answer" : ""}" style="--question-color:${category.color}" aria-labelledby="dt-question-text">
      <div class="dt-question-meta"><span>${escapeHTML(category.label)}</span><strong>${cell.value} pontos</strong></div>
      ${cell.isDouble ? `<div class="dt-double-banner">Desafio surpresa: vale o dobro no acerto</div>` : ""}
      <p class="dt-answering-banner">${active.role === "steal" ? "Chance de roubo" : "Respondendo"}: ${escapeHTML(answering.name)}</p>
      <h1 class="dt-question-text" id="dt-question-text">${escapeHTML(question.prompt)}</h1>
      ${showAnswer ? `<div class="dt-answer-panel"><span>Resposta correta</span><strong>${escapeHTML(question.answer)}</strong><p>${escapeHTML(question.explanation)}</p></div>` : ""}
      ${active.stage === "outcome" ? `<div class="dt-outcome ${active.outcome.correct ? "is-correct" : "is-wrong"}"><strong>${active.outcome.delta ? `${active.outcome.delta > 0 ? "+" : ""}${active.outcome.delta} pontos` : escapeHTML(active.outcome.label)}</strong><span>${active.outcome.teamName ? `${escapeHTML(active.outcome.teamName)} — ${escapeHTML(active.outcome.label)}` : "Voltando ao tabuleiro..."}</span></div>` : controls}
    </section></main>`;
  }

  renderQuestionControls() {
    const active = this.state.active;
    if (active.stage === "after-wrong") return `<div class="dt-question-controls"><button class="dt-button dt-button-cyan" type="button" data-action="show-steal-options">Passar para outra equipe</button><button class="dt-button dt-button-ghost" type="button" data-action="finish-no-steal">Encerrar e mostrar resposta</button></div><p class="dt-helper">A equipe que escolheu já perdeu os pontos. O roubo também tem risco.</p>`;
    if (active.stage === "steal-select") return `<div><p class="dt-helper">Escolha uma equipe para uma única chance de roubo:</p><div class="dt-steal-grid">${this.state.teams.filter((team) => team.id !== active.chooserTeamId).map((team) => `<button class="dt-steal-team" style="--team-color:${team.color}" type="button" data-action="choose-steal" data-team-id="${team.id}">${escapeHTML(team.name)} — ${formatScore(team.score)}</button>`).join("")}</div><div class="dt-question-controls"><button class="dt-button dt-button-ghost" type="button" data-action="finish-no-steal">Encerrar sem roubo</button></div></div>`;
    const revealedNote = active.answerRevealed ? "A resposta já foi revelada; um erro encerrará a pergunta sem roubo." : "Marque o resultado sem revelar para manter a possibilidade de roubo.";
    return `<div class="dt-question-controls">
      <div class="dt-timer ${this.state.timer.remaining <= 5 && this.state.timer.remaining > 0 ? "is-warning" : ""} ${this.state.timer.status === "expired" ? "is-expired" : ""}"><strong data-timer-display>${String(this.state.timer.remaining).padStart(2,"0")}</strong><button class="dt-button dt-button-ghost" type="button" data-action="toggle-timer">${this.state.timer.status === "running" ? "Pausar" : "Iniciar tempo"}</button><button class="dt-icon-button" type="button" data-action="reset-timer" aria-label="Reiniciar cronômetro">↻</button></div>
      ${!active.answerRevealed ? '<button class="dt-button dt-button-cyan" type="button" data-action="reveal-answer">Mostrar resposta</button>' : ""}
      <button class="dt-button dt-button-ghost" type="button" data-action="back-board">Voltar ao tabuleiro</button>
    </div>
    <div class="dt-teacher-actions"><button class="dt-button dt-button-success" type="button" data-action="mark-correct">Acertou</button><button class="dt-button dt-button-danger" type="button" data-action="mark-wrong">Errou</button></div>
    <p class="dt-helper">${revealedNote}</p>`;
  }

  renderFinal() {
    const final = this.state.final;
    const question = this.finalQuestion();
    if (final.stage === "intro") return `<main class="dt-question-area"><section class="dt-question-card dt-final-card dt-final-intro"><span class="dt-trophy">★</span><span class="dt-kicker">A última rodada</span><h1>DESAFIO FINAL</h1><p>Todas as equipes respondem. Acerto vale +500 pontos e erro vale −500 pontos.</p><button class="dt-button dt-button-primary" type="button" data-action="start-final">Abrir pergunta final</button></section></main>`;
    const answer = final.stage === "grading" ? `<div class="dt-answer-panel"><span>Resposta correta</span><strong>${escapeHTML(question.answer)}</strong><p>${escapeHTML(question.explanation)}</p></div>` : "";
    const grading = final.stage === "grading" ? `<div class="dt-final-grading">${this.state.teams.map((team) => `<div class="dt-final-team"><strong>${escapeHTML(team.name)}</strong><div class="dt-final-team-actions"><button class="dt-final-choice ${final.results[team.id] === "correct" ? "is-selected" : ""}" type="button" data-action="final-result" data-team-id="${team.id}" data-result="correct">Acertou</button><button class="dt-final-choice ${final.results[team.id] === "wrong" ? "is-selected" : ""}" type="button" data-action="final-result" data-team-id="${team.id}" data-result="wrong">Errou</button></div></div>`).join("")}</div><div class="dt-question-controls"><button class="dt-button dt-button-primary" type="button" data-action="finish-final" ${this.state.teams.every((team) => final.results[team.id]) ? "" : "disabled"}>Ver resultado final</button></div>` : "";
    return `<main class="dt-question-area"><section class="dt-question-card dt-final-card"><div class="dt-question-meta"><span>Desafio Final</span><strong>500 pontos</strong></div><h1 class="dt-question-text">${escapeHTML(question.prompt)}</h1>${answer}${grading}${final.stage === "prompt" ? `<div class="dt-question-controls"><div class="dt-timer"><strong data-timer-display>${String(this.state.timer.remaining).padStart(2,"0")}</strong><button class="dt-button dt-button-ghost" type="button" data-action="toggle-timer">${this.state.timer.status === "running" ? "Pausar" : "Iniciar tempo"}</button><button class="dt-icon-button" type="button" data-action="reset-timer">↻</button></div><button class="dt-button dt-button-cyan" type="button" data-action="reveal-final">Mostrar resposta</button></div>` : ""}</section></main>`;
  }

  renderResult() {
    const ranking = rankTeams(this.state.teams);
    const champions = ranking.filter((team) => team.rank === 1);
    const confetti = Array.from({ length: 50 }, (_, index) => `<i style="--x:${(index * 37) % 100}%;--color:${["#ffd76a","#58d6ff","#fb7185","#6ee7b7","#c084fc"][index % 5]};--rotation:${index * 29}deg;--duration:${2.8 + (index % 7) * .18}s;--delay:${(index % 9) * .08}s"></i>`).join("");
    return `<div class="dt-shell dt-setup-shell"><section class="dt-result-card"><div class="dt-confetti" aria-hidden="true">${confetti}</div><span class="dt-kicker">Fim de jogo</span><h1>${champions.length > 1 ? "CAMPEÕES" : "CAMPEÃ"}<span>${champions.map((team) => escapeHTML(team.name)).join(" + ")}</span></h1><div class="dt-ranking">${ranking.map((team) => `<div class="dt-rank-row ${team.rank === 1 ? "is-winner" : ""}"><span class="dt-rank-number">${team.rank}º</span><span class="dt-rank-name">${escapeHTML(team.name)}</span><strong class="dt-rank-score">${formatScore(team.score)}</strong></div>`).join("")}</div><div class="dt-question-controls"><button class="dt-button dt-button-primary" type="button" data-action="new-match">Nova partida</button><button class="dt-button dt-button-ghost" type="button" data-action="go-home">Voltar para a Central</button></div></section><p class="dt-announcer" aria-live="assertive">${champions.length > 1 ? "Temos campeões empatados" : `${champions[0].name} venceu o Desafio TI`}.</p></div>`;
  }

  renderHelp() {
    return `<div class="dt-modal-backdrop" role="presentation"><section class="dt-modal" role="dialog" aria-modal="true" aria-labelledby="dt-help-title"><h2 id="dt-help-title">Controles rápidos</h2><p>Atalhos funcionam quando você não está digitando em um campo.</p><div class="dt-shortcuts"><kbd>F</kbd><span>Entrar ou sair da tela cheia</span><kbd>M</kbd><span>Ativar ou desativar sons</span><kbd>Espaço</kbd><span>Iniciar ou pausar o cronômetro</span><kbd>R</kbd><span>Revelar a resposta</span><kbd>Esc</kbd><span>Voltar ao tabuleiro quando seguro</span></div><p>Você pode clicar em uma equipe no placar para mudar manualmente a vez. Os botões +100, −100 e Editar corrigem a pontuação.</p><button class="dt-button dt-button-primary" type="button" data-action="close-help">Entendi</button></section></div>`;
  }
}

export const desafioTiGame = new DesafioTiController();

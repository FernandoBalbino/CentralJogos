import { memoryCategories, memoryGamePairs } from "./memory-game-data.mjs?v=1.0.3";
import {
  advanceTeamIndex,
  buildMemoryDeck,
  getGridDimensions,
  getLeaders,
  isMatchingPair,
  rankTeams,
  selectRoundPairs
} from "./memory-game-core.mjs";

const TEAM_COLORS = [
  { name: "Azul", value: "#3b82f6", tint: "#e8f1ff" },
  { name: "Vermelho", value: "#ef4444", tint: "#fff0f0" },
  { name: "Verde", value: "#16a66a", tint: "#e7f8f0" },
  { name: "Roxo", value: "#8b5cf6", tint: "#f2edff" },
  { name: "Laranja", value: "#f07818", tint: "#fff2e5" },
  { name: "Amarelo", value: "#c58a00", tint: "#fff8d9" },
  { name: "Rosa", value: "#db3f87", tint: "#ffedf5" },
  { name: "Ciano", value: "#0795a5", tint: "#e4f9fb" }
];

const MISMATCH_READ_TIME_MS = 3200;

const escapeHTML = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

class MemoryGameController {
  constructor() {
    this.root = null;
    this.state = null;
    this.active = false;
    this.busy = false;
    this.selectedCards = [];
    this.timers = new Set();
    this.audioContext = null;
    this.boundClick = (event) => this.handleClick(event);
    this.boundInput = (event) => this.handleInput(event);
    this.boundFullscreen = () => this.updateFullscreenButton();
  }

  createInitialState() {
    return {
      phase: "intro",
      teams: [this.createTeam(0), this.createTeam(1)],
      settings: {
        categoryIds: memoryCategories.map((category) => category.id),
        pairCount: 12,
        replayOnMatch: true,
        soundEnabled: true
      },
      currentTeamIndex: 0,
      round: 0,
      usedPairIds: [],
      roundPairs: [],
      deck: [],
      remainingPairs: 0,
      remainingFreshCount: memoryGamePairs.length,
      streak: 0
    };
  }

  createTeam(index) {
    return {
      id: `team-${crypto.randomUUID?.() || `${Date.now()}-${index}`}`,
      name: "",
      members: "",
      color: TEAM_COLORS[index].value,
      tint: TEAM_COLORS[index].tint,
      score: 0
    };
  }

  enter() {
    this.root = document.getElementById("memory-game-app");
    if (!this.root || this.active) return;
    this.active = true;
    this.state = this.createInitialState();
    this.root.addEventListener("click", this.boundClick);
    this.root.addEventListener("input", this.boundInput);
    document.addEventListener("fullscreenchange", this.boundFullscreen);
    document.body.classList.add("memory-game-active");
    this.renderIntro();
  }

  leave() {
    if (!this.active) return;
    this.active = false;
    this.clearTimers();
    this.root?.removeEventListener("click", this.boundClick);
    this.root?.removeEventListener("input", this.boundInput);
    document.removeEventListener("fullscreenchange", this.boundFullscreen);
    document.body.classList.remove("memory-game-active");
    if (document.fullscreenElement?.closest?.("#memory-game-app")) document.exitFullscreen().catch(() => {});
    if (this.root) this.root.innerHTML = "";
    this.root = null;
    this.state = null;
    this.selectedCards = [];
    this.busy = false;
  }

  setTimer(callback, delay) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      if (this.active) callback();
    }, reduced ? Math.min(delay, 90) : delay);
    this.timers.add(timer);
    return timer;
  }

  clearTimers() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  renderIntro() {
    this.state.phase = "intro";
    this.root.innerHTML = `
      <div class="memory-shell memory-intro-shell">
        <a class="memory-back-link" href="#/">← Central de Jogos</a>
        <div class="memory-intro-art" aria-hidden="true">
          <span class="memory-intro-card intro-card-one">?</span>
          <span class="memory-intro-card intro-card-two">▦</span>
          <span class="memory-intro-card intro-card-three"><i></i><i></i><i></i></span>
          <span class="memory-intro-path"></span>
        </div>
        <div class="memory-intro-copy">
          <span class="memory-overline">Jogo 05 • competição em equipes</span>
          <h1>Ache os Pares <em>Desafio TI</em></h1>
          <p>Descubra qual imagem combina com cada definição. Acerte, marque pontos e continue jogando.</p>
          <div class="memory-feature-row" aria-label="Destaques do jogo">
            <span><b>68</b> conceitos</span><span><b>8</b> assuntos</span><span><b>2–8</b> equipes</span>
          </div>
          <button class="memory-primary-button memory-start-button" type="button" data-action="open-setup">Preparar equipes <span aria-hidden="true">→</span></button>
        </div>
      </div>`;
  }

  renderSetup() {
    this.state.phase = "setup";
    const usedColors = new Set(this.state.teams.map((team) => team.color));
    this.root.innerHTML = `
      <div class="memory-shell memory-setup-shell">
        <div class="memory-setup-header">
          <button class="memory-text-button" type="button" data-action="back-intro">← Voltar</button>
          <div><span class="memory-overline">Antes da rodada</span><h1>Prepare as equipes</h1><p>Cadastre os grupos que vão disputar o Desafio TI.</p></div>
          <span class="memory-team-count">${this.state.teams.length}/8 equipes</span>
        </div>
        <div class="memory-setup-content">
          <section class="memory-team-editor" aria-label="Equipes participantes">
            <div class="memory-team-list">
              ${this.state.teams.map((team, index) => this.teamEditorMarkup(team, index, usedColors)).join("")}
            </div>
            <button class="memory-add-team" type="button" data-action="add-team" ${this.state.teams.length >= 8 ? "disabled" : ""}>＋ Adicionar equipe</button>
          </section>
          <aside class="memory-match-options">
            <details>
              <summary>⚙ Configurações da partida</summary>
              <fieldset>
                <legend>Assuntos</legend>
                <div class="memory-category-options">
                  ${memoryCategories.map((category) => `
                    <label><input type="checkbox" data-category-id="${category.id}" ${this.state.settings.categoryIds.includes(category.id) ? "checked" : ""}><span>${category.icon}</span><b>${category.label}</b><small>${category.description}</small></label>`).join("")}
                </div>
              </fieldset>
              <fieldset class="memory-size-options">
                <legend>Pares por rodada</legend>
                ${[8, 10, 12, 15].map((count) => `<label><input type="radio" name="memory-pair-count" value="${count}" ${this.state.settings.pairCount === count ? "checked" : ""}> ${count}</label>`).join("")}
              </fieldset>
              <label class="memory-replay-option"><input type="checkbox" data-setting="replay" ${this.state.settings.replayOnMatch ? "checked" : ""}> Quem acerta joga novamente</label>
            </details>
            <div class="memory-setup-summary"><span>Partida padrão</span><strong>${this.state.settings.pairCount} pares • ${this.state.settings.pairCount * 2} cartas</strong><p>O placar continua acumulado entre as rodadas.</p></div>
            <p class="memory-form-error" data-form-error role="alert"></p>
            <button class="memory-primary-button" type="button" data-action="start-match">Iniciar partida <span aria-hidden="true">→</span></button>
          </aside>
        </div>
      </div>`;
  }

  teamEditorMarkup(team, index, usedColors) {
    return `
      <article class="memory-team-editor-card" data-team-editor="${team.id}" style="--team-color:${team.color};--team-tint:${team.tint}">
        <div class="memory-team-number">${String(index + 1).padStart(2, "0")}</div>
        <div class="memory-team-fields">
          <label>Nome do grupo<input type="text" maxlength="24" autocomplete="off" placeholder="Ex.: Equipe Byte" data-team-input="name" data-team-id="${team.id}" value="${escapeHTML(team.name)}"></label>
          <label>Integrantes<input type="text" maxlength="80" autocomplete="off" placeholder="Ex.: Ana, João" data-team-input="members" data-team-id="${team.id}" value="${escapeHTML(team.members)}"></label>
        </div>
        <div class="memory-color-field"><span>Cor da equipe</span><div class="memory-color-palette">
          ${TEAM_COLORS.map((color) => {
            const unavailable = usedColors.has(color.value) && team.color !== color.value;
            return `<button type="button" data-action="team-color" data-team-id="${team.id}" data-color="${color.value}" aria-label="${color.name}" title="${color.name}" class="${team.color === color.value ? "is-selected" : ""}" style="--swatch:${color.value}" ${unavailable ? "disabled" : ""}></button>`;
          }).join("")}
        </div></div>
        <div class="memory-team-preview"><span class="memory-team-dot"></span><div><strong>${escapeHTML(team.name || `Equipe ${index + 1}`)}</strong><small>${escapeHTML(team.members || "Integrantes")}</small></div></div>
        ${this.state.teams.length > 2 ? `<button class="memory-remove-team" type="button" data-action="remove-team" data-team-id="${team.id}" aria-label="Remover ${escapeHTML(team.name || `equipe ${index + 1}`)}">×</button>` : ""}
      </article>`;
  }

  handleInput(event) {
    if (!this.state) return;
    const teamInput = event.target.closest("[data-team-input]");
    if (teamInput) {
      const team = this.state.teams.find((item) => item.id === teamInput.dataset.teamId);
      if (!team) return;
      team[teamInput.dataset.teamInput] = teamInput.value;
      const preview = this.root.querySelector(`[data-team-editor="${team.id}"] .memory-team-preview`);
      if (preview) {
        preview.querySelector("strong").textContent = team.name || `Equipe ${this.state.teams.indexOf(team) + 1}`;
        preview.querySelector("small").textContent = team.members || "Integrantes";
      }
      return;
    }

    const categoryInput = event.target.closest("[data-category-id]");
    if (categoryInput) {
      const selected = [...this.root.querySelectorAll("[data-category-id]:checked")].map((input) => input.dataset.categoryId);
      this.state.settings.categoryIds = selected;
      return;
    }

    if (event.target.name === "memory-pair-count") {
      this.state.settings.pairCount = Number(event.target.value);
      const summary = this.root.querySelector(".memory-setup-summary strong");
      if (summary) summary.textContent = `${event.target.value} pares • ${Number(event.target.value) * 2} cartas`;
      return;
    }

    if (event.target.matches("[data-setting='replay']")) {
      this.state.settings.replayOnMatch = event.target.checked;
    }
  }

  handleClick(event) {
    const card = event.target.closest("[data-card-key]");
    if (card) {
      this.revealCard(card.dataset.cardKey);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "open-setup") this.renderSetup();
    if (action === "back-intro") this.renderIntro();
    if (action === "add-team") this.addTeam();
    if (action === "remove-team") this.removeTeam(actionButton.dataset.teamId);
    if (action === "team-color") this.setTeamColor(actionButton.dataset.teamId, actionButton.dataset.color);
    if (action === "start-match") this.startMatch();
    if (action === "toggle-sound") this.toggleSound();
    if (action === "fullscreen") this.toggleFullscreen();
    if (action === "next-round") this.startNextRound();
    if (action === "end-match") this.finishMatch();
    if (action === "end-playing" && window.confirm("Encerrar a partida e mostrar o placar atual?")) this.finishMatch();
    if (action === "replay-teams") this.replayWithTeams();
    if (action === "new-match") this.newMatch();
  }

  addTeam() {
    if (this.state.teams.length >= 8) return;
    const used = new Set(this.state.teams.map((team) => team.color));
    const freeIndex = TEAM_COLORS.findIndex((color) => !used.has(color.value));
    this.state.teams.push(this.createTeam(freeIndex));
    this.renderSetup();
  }

  removeTeam(teamId) {
    if (this.state.teams.length <= 2) return;
    this.state.teams = this.state.teams.filter((team) => team.id !== teamId);
    this.renderSetup();
  }

  setTeamColor(teamId, colorValue) {
    if (this.state.teams.some((team) => team.id !== teamId && team.color === colorValue)) return;
    const team = this.state.teams.find((item) => item.id === teamId);
    const color = TEAM_COLORS.find((item) => item.value === colorValue);
    if (!team || !color) return;
    team.color = color.value;
    team.tint = color.tint;
    this.renderSetup();
  }

  validateSetup() {
    if (this.state.settings.categoryIds.length === 0) return "Selecione pelo menos um assunto.";
    if (this.state.teams.some((team) => !team.name.trim())) return "Digite o nome de todas as equipes.";
    if (this.state.teams.some((team) => !team.members.trim())) return "Digite os integrantes de todas as equipes.";
    const normalizedNames = this.state.teams.map((team) => team.name.trim().toLocaleLowerCase("pt-BR"));
    if (new Set(normalizedNames).size !== normalizedNames.length) return "Use um nome diferente para cada equipe.";
    if (new Set(this.state.teams.map((team) => team.color)).size !== this.state.teams.length) return "Cada equipe precisa de uma cor diferente.";
    const availableCount = memoryGamePairs.filter((pair) => this.state.settings.categoryIds.includes(pair.category)).length;
    if (availableCount < this.state.settings.pairCount) return `Os assuntos selecionados oferecem apenas ${availableCount} pares. Selecione mais assuntos ou reduza a rodada.`;
    return "";
  }

  startMatch() {
    const error = this.validateSetup();
    const errorElement = this.root.querySelector("[data-form-error]");
    if (error) {
      if (errorElement) errorElement.textContent = error;
      return;
    }
    this.state.teams = this.state.teams.map((team) => ({ ...team, name: team.name.trim(), members: team.members.trim(), score: 0 }));
    this.state.currentTeamIndex = 0;
    this.state.round = 0;
    this.state.usedPairIds = [];
    this.state.streak = 0;
    this.startNextRound();
  }

  async startNextRound() {
    if (!this.active) return;
    this.clearTimers();
    this.busy = true;
    this.selectedCards = [];
    this.state.phase = "loading";
    this.state.round += 1;
    const selection = selectRoundPairs({
      items: memoryGamePairs,
      categoryIds: this.state.settings.categoryIds,
      pairCount: this.state.settings.pairCount,
      usedIds: this.state.usedPairIds
    });
    this.state.roundPairs = selection.pairs;
    this.state.usedPairIds = selection.usedIds;
    this.state.remainingFreshCount = selection.remainingFreshCount;
    this.state.remainingPairs = selection.pairs.length;
    this.state.deck = buildMemoryDeck(selection.pairs).map((card) => ({ ...card, faceUp: false, matched: false, ownerId: null }));
    this.state.streak = 0;
    this.renderLoading();
    await this.preloadRoundAssets(selection.pairs);
    if (!this.active) return;
    this.state.phase = "playing";
    this.busy = false;
    this.renderGame();
    this.showTurnBanner();
  }

  renderLoading() {
    this.root.innerHTML = `<div class="memory-shell memory-loading"><span class="memory-loader" aria-hidden="true"></span><p>Preparando a rodada ${this.state.round}…</p><small>Embaralhando ${this.state.settings.pairCount * 2} cartas</small></div>`;
  }

  preloadRoundAssets(pairs) {
    const sources = [...new Set(pairs.filter((pair) => pair.visual.type === "image").map((pair) => pair.visual.src))];
    return Promise.all(sources.map((src) => new Promise((resolve) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      image.src = src;
    })));
  }

  renderGame() {
    const team = this.currentTeam();
    const dimensions = getGridDimensions(this.state.deck.length);
    this.root.innerHTML = `
      <div class="memory-shell memory-game-shell" style="--active-team:${team.color};--active-team-tint:${team.tint}">
        <header class="memory-hud">
          <div class="memory-round-status"><span>Rodada ${this.state.round}</span><strong><b data-remaining-pairs>${this.state.remainingPairs}</b> pares restantes</strong></div>
          <div class="memory-current-team" data-current-team><small>Vez da</small><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.members)}</span></div>
          <div class="memory-hud-actions">
            <button type="button" data-action="toggle-sound" aria-label="${this.state.settings.soundEnabled ? "Desativar" : "Ativar"} som">${this.state.settings.soundEnabled ? "♪" : "♩̸"}<span>Som</span></button>
            <button type="button" data-action="fullscreen" aria-label="Entrar em tela cheia">⛶<span>Tela cheia</span></button>
            <button type="button" data-action="end-playing">■<span>Encerrar</span></button>
          </div>
          <div class="memory-score-strip" aria-label="Placar da partida">
            ${this.state.teams.map((item) => `<div class="${item.id === team.id ? "is-current" : ""}" data-score-entry="${item.id}" style="--team-color:${item.color};--team-tint:${item.tint}"><i></i><span>${escapeHTML(item.name)}</span><strong data-score-team="${item.id}">${item.score}</strong></div>`).join("")}
          </div>
        </header>
        <div class="memory-board-wrap" role="main">
          <div class="memory-board" role="grid" aria-label="Tabuleiro com ${this.state.deck.length} cartas" style="--memory-columns:${dimensions.columns};--memory-rows:${dimensions.rows}">
            ${this.state.deck.map((card) => this.cardMarkup(card)).join("")}
          </div>
        </div>
        <div class="memory-feedback" data-memory-feedback role="status" aria-live="assertive"></div>
        <div class="memory-live-region" data-memory-live role="status" aria-live="polite"></div>
      </div>`;
  }

  cardMarkup(card) {
    const imageFace = card.item.visual.type === "image"
      ? `<img src="${card.item.visual.src}" alt="${escapeHTML(card.item.alt)}" draggable="false">`
      : `<svg class="memory-card-visual" role="img" aria-label="${escapeHTML(card.item.alt)}" viewBox="0 0 240 160"><use href="${card.item.visual.src}#${card.item.visual.id}"></use></svg>`;
    const front = card.type === "image"
      ? `<div class="memory-image-face">${imageFace}<strong>${escapeHTML(card.item.name)}</strong></div>`
      : `<div class="memory-definition-face"><span>Definição</span><p>${escapeHTML(card.item.definition)}</p></div>`;
    return `
      <button class="memory-card" type="button" role="gridcell" data-card-key="${card.key}" aria-label="Carta fechada">
        <span class="memory-card-inner">
          <span class="memory-card-side memory-card-back" aria-hidden="true"><b>?</b><i>TI</i></span>
          <span class="memory-card-side memory-card-front">${front}<span class="memory-owner-badge" hidden></span></span>
        </span>
      </button>`;
  }

  revealCard(key) {
    if (this.state?.phase !== "playing" || this.busy) return;
    const card = this.state.deck.find((item) => item.key === key);
    if (!card || card.faceUp || card.matched) return;
    card.faceUp = true;
    const element = this.cardElement(key);
    element?.classList.add("is-flipped");
    element?.setAttribute("aria-label", card.type === "image" ? `${card.item.name}. Carta de imagem.` : card.item.definition);
    this.playSound("flip");
    this.selectedCards.push(card);
    if (this.selectedCards.length === 2) {
      this.busy = true;
      this.setTimer(() => this.evaluateSelection(), 590);
    }
  }

  evaluateSelection() {
    const [first, second] = this.selectedCards;
    if (isMatchingPair(first, second)) this.handleMatch(first, second);
    else this.handleMiss(first, second);
  }

  handleMatch(first, second) {
    const team = this.currentTeam();
    first.matched = true;
    second.matched = true;
    first.ownerId = team.id;
    second.ownerId = team.id;
    team.score += 1;
    this.state.streak += 1;
    this.state.remainingPairs -= 1;
    const elements = [this.cardElement(first.key), this.cardElement(second.key)].filter(Boolean);
    elements.forEach((element) => element.classList.add("is-correct"));
    this.updateScoreboard();
    this.showFeedback(this.state.streak >= 3 ? `🔥 ${this.state.streak} acertos seguidos!` : "✨ Acertou! Jogue novamente.", "success");
    this.playSound("success");
    this.burstConfetti(18, team.color);
    this.setTimer(() => {
      elements.forEach((element) => {
        element.classList.remove("is-correct");
        this.applyOwner(element, team);
      });
      this.selectedCards = [];
      this.busy = false;
      if (this.state.remainingPairs === 0) {
        this.busy = true;
        this.playSound("victory");
        this.burstConfetti(50, team.color);
        this.setTimer(() => this.showRoundComplete(), 900);
      } else if (!this.state.settings.replayOnMatch) {
        this.advanceTurn();
      }
    }, 500);
  }

  handleMiss(first, second) {
    const elements = [this.cardElement(first?.key), this.cardElement(second?.key)].filter(Boolean);
    elements.forEach((element) => element.classList.add("is-wrong"));
    this.state.streak = 0;
    this.showFeedback("Não foi dessa vez!", "error");
    this.playSound("error");
    this.setTimer(() => {
      elements.forEach((element) => element.classList.remove("is-wrong", "is-flipped"));
      if (first) first.faceUp = false;
      if (second) second.faceUp = false;
      this.selectedCards = [];
      this.busy = false;
      this.advanceTurn();
    }, MISMATCH_READ_TIME_MS);
  }

  applyOwner(element, team) {
    if (!element) return;
    element.classList.add("is-matched");
    element.style.setProperty("--owner-color", team.color);
    element.style.setProperty("--owner-tint", team.tint);
    const badge = element.querySelector(".memory-owner-badge");
    badge.hidden = false;
    badge.textContent = `✓ ${team.name}`;
  }

  advanceTurn() {
    this.state.currentTeamIndex = advanceTeamIndex(this.state.currentTeamIndex, this.state.teams.length);
    this.updateCurrentTeam();
    this.showTurnBanner();
  }

  currentTeam() {
    return this.state.teams[this.state.currentTeamIndex];
  }

  updateScoreboard() {
    for (const team of this.state.teams) {
      const score = this.root.querySelector(`[data-score-team="${team.id}"]`);
      if (score) score.textContent = team.score;
    }
    const remaining = this.root.querySelector("[data-remaining-pairs]");
    if (remaining) remaining.textContent = this.state.remainingPairs;
    if (this.state.remainingPairs <= 3 && this.state.remainingPairs > 0) this.showFeedback(`🔥 Últimos ${this.state.remainingPairs} pares!`, "warning");
  }

  updateCurrentTeam() {
    const team = this.currentTeam();
    const shell = this.root.querySelector(".memory-game-shell");
    shell?.style.setProperty("--active-team", team.color);
    shell?.style.setProperty("--active-team-tint", team.tint);
    const current = this.root.querySelector("[data-current-team]");
    if (current) current.innerHTML = `<small>Vez da</small><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.members)}</span>`;
    this.root.querySelectorAll("[data-score-entry]").forEach((entry) => entry.classList.toggle("is-current", entry.dataset.scoreEntry === team.id));
  }

  showTurnBanner() {
    const team = this.currentTeam();
    this.showFeedback(`Vez da ${team.name}`, "turn", team.color);
    const live = this.root.querySelector("[data-memory-live]");
    if (live) live.textContent = `Vez da equipe ${team.name}. ${team.members}`;
  }

  showFeedback(message, type, color = "") {
    const element = this.root.querySelector("[data-memory-feedback]");
    if (!element) return;
    element.textContent = message;
    element.className = `memory-feedback is-visible is-${type}`;
    if (color) element.style.setProperty("--feedback-color", color);
    this.setTimer(() => element.classList.remove("is-visible"), type === "turn" ? 1050 : 1350);
  }

  showRoundComplete() {
    if (!this.active) return;
    this.state.phase = "round-complete";
    this.busy = false;
    const ranking = rankTeams(this.state.teams);
    const layer = document.createElement("div");
    layer.className = "memory-modal-layer";
    layer.innerHTML = `
      <section class="memory-result-modal" role="dialog" aria-modal="true" aria-labelledby="memory-round-title">
        <span class="memory-result-icon">✓</span><span class="memory-overline">Todos os pares encontrados</span>
        <h2 id="memory-round-title">Rodada concluída!</h2>
        <p>Pontuação total acumulada após ${this.state.round} ${this.state.round === 1 ? "rodada" : "rodadas"}.</p>
        <div class="memory-ranking">${ranking.map((team) => this.rankingMarkup(team)).join("")}</div>
        <div class="memory-new-content"><b>${this.state.remainingFreshCount}</b><span>conceitos inéditos disponíveis nos assuntos selecionados</span></div>
        <div class="memory-result-actions"><button class="memory-primary-button" type="button" data-action="next-round">Próxima rodada →</button><button class="memory-secondary-button" type="button" data-action="end-match">Encerrar partida</button></div>
      </section>`;
    this.root.appendChild(layer);
    layer.querySelector("button")?.focus();
  }

  rankingMarkup(team) {
    const medal = team.rank === 1 ? "🥇" : team.rank === 2 ? "🥈" : team.rank === 3 ? "🥉" : `${team.rank}º`;
    return `<div style="--team-color:${team.color};--team-tint:${team.tint}"><span>${medal}</span><i></i><strong>${escapeHTML(team.name)}</strong><b>${team.score} ${team.score === 1 ? "par" : "pares"}</b></div>`;
  }

  finishMatch() {
    this.clearTimers();
    this.busy = false;
    this.state.phase = "finished";
    const leaders = getLeaders(this.state.teams);
    const ranking = rankTeams(this.state.teams);
    const tied = leaders.length > 1;
    const headline = tied ? "Empate!" : `🏆 ${escapeHTML(leaders[0].name)} venceu!`;
    const subtitle = tied
      ? `${leaders.map((team) => escapeHTML(team.name)).join(" • ")} dividem a liderança.`
      : `${escapeHTML(leaders[0].members)} • ${leaders[0].score} ${leaders[0].score === 1 ? "par encontrado" : "pares encontrados"}`;
    this.root.innerHTML = `
      <div class="memory-shell memory-final-shell">
        <div class="memory-final-confetti" aria-hidden="true">✦　•　✦　•　✦</div>
        <span class="memory-overline">Resultado final • ${this.state.round} ${this.state.round === 1 ? "rodada" : "rodadas"}</span>
        <h1>${headline}</h1><p class="memory-final-subtitle">${subtitle}</p>
        <section class="memory-podium" aria-label="Classificação final">
          ${ranking.map((team) => `<article class="rank-${Math.min(team.rank, 4)} ${team.rank === 1 ? "is-leader" : ""}" style="--team-color:${team.color};--team-tint:${team.tint}"><span>${team.rank <= 3 ? ["🥇", "🥈", "🥉"][team.rank - 1] : `${team.rank}º`}</span><i></i><h2>${escapeHTML(team.name)}</h2><p>${escapeHTML(team.members)}</p><strong>${team.score} ${team.score === 1 ? "par" : "pares"}</strong></article>`).join("")}
        </section>
        <div class="memory-final-actions"><button class="memory-primary-button" type="button" data-action="replay-teams">Jogar novamente com as mesmas equipes</button><button class="memory-secondary-button" type="button" data-action="new-match">Nova partida</button><a class="memory-secondary-button" href="#/">Voltar para a Central de Jogos</a></div>
      </div>`;
    this.playSound("victory");
    this.burstConfetti(70, leaders[0]?.color || "#ffd267");
  }

  replayWithTeams() {
    this.state.teams = this.state.teams.map((team) => ({ ...team, score: 0 }));
    this.state.currentTeamIndex = 0;
    this.state.round = 0;
    this.state.usedPairIds = [];
    this.state.streak = 0;
    this.startNextRound();
  }

  newMatch() {
    this.state = this.createInitialState();
    this.renderSetup();
  }

  toggleSound() {
    this.state.settings.soundEnabled = !this.state.settings.soundEnabled;
    const button = this.root.querySelector("[data-action='toggle-sound']");
    if (button) {
      button.innerHTML = `${this.state.settings.soundEnabled ? "♪" : "♩̸"}<span>Som</span>`;
      button.setAttribute("aria-label", `${this.state.settings.soundEnabled ? "Desativar" : "Ativar"} som`);
    }
    if (this.state.settings.soundEnabled) this.playSound("flip");
  }

  playSound(kind) {
    if (!this.state?.settings.soundEnabled) return;
    try {
      this.audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const context = this.audioContext;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const settings = {
        flip: [320, 0.035, "sine"],
        success: [660, 0.13, "triangle"],
        error: [150, 0.12, "sawtooth"],
        victory: [880, 0.22, "triangle"]
      }[kind] || [320, 0.04, "sine"];
      oscillator.frequency.setValueAtTime(settings[0], context.currentTime);
      if (kind === "success" || kind === "victory") oscillator.frequency.exponentialRampToValueAtTime(settings[0] * 1.45, context.currentTime + settings[1]);
      oscillator.type = settings[2];
      gain.gain.setValueAtTime(0.055, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + settings[1]);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + settings[1]);
    } catch {
      // O áudio é progressivo; a partida continua normalmente sem ele.
    }
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.root.requestFullscreen();
    } catch {
      this.showFeedback("Tela cheia não disponível neste navegador.", "error");
    } finally {
      this.updateFullscreenButton();
      this.setTimer(() => this.updateFullscreenButton(), 350);
    }
  }

  updateFullscreenButton() {
    const button = this.root?.querySelector("[data-action='fullscreen']");
    if (!button) return;
    const active = Boolean(document.fullscreenElement);
    button.innerHTML = `${active ? "⛶" : "⛶"}<span>${active ? "Sair da tela cheia" : "Tela cheia"}</span>`;
    button.setAttribute("aria-label", active ? "Sair da tela cheia" : "Entrar em tela cheia");
  }

  cardElement(key) {
    return this.root.querySelector(`[data-card-key="${key}"]`);
  }

  burstConfetti(amount, color) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "memory-confetti";
    layer.setAttribute("aria-hidden", "true");
    const palette = [color, "#ffd267", "#27c2b5", "#fff", "#ff6f69"];
    for (let index = 0; index < amount; index += 1) {
      const piece = document.createElement("i");
      piece.style.setProperty("--x", `${Math.random() * 100}%`);
      piece.style.setProperty("--delay", `${Math.random() * .35}s`);
      piece.style.setProperty("--fall", `${55 + Math.random() * 45}vh`);
      piece.style.setProperty("--spin", `${180 + Math.random() * 720}deg`);
      piece.style.background = palette[index % palette.length];
      layer.appendChild(piece);
    }
    this.root.appendChild(layer);
    this.setTimer(() => layer.remove(), 2100);
  }
}

export const memoryGame = new MemoryGameController();

import {
  supportCards,
  supportSlotTypes,
  supportTickets
} from "./support-game-data.mjs";
import {
  buildSupportSlotId,
  countMissingSupportSlots,
  createSupportState,
  evaluateSupportPlacements,
  locateSupportCard,
  moveSupportCard,
  returnSupportCardToTray,
  shuffleSupportCardIds
} from "./support-game-core.mjs";

const TOTAL_SLOTS = supportTickets.length * supportSlotTypes.length;
const ANALYSIS_DELAY = 1200;
const ERROR_RETURN_DELAY = 1050;
const iconPath = (name) => `./assets/side-game/icons/${name}.svg`;

const escapeHtml = (value) => String(value).replace(
  /[&<>'"]/g,
  (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]
);

const supportGame = {
  root: null,
  state: null,
  draggedCard: null,
  analysisTimer: null,
  feedbackTimer: null,
  toastTimer: null,

  mount(root) {
    this.root = root;
    this.state = this.createState();
    root.addEventListener("click", (event) => this.handleClick(event));
    root.addEventListener("keydown", (event) => this.handleKeydown(event));
    root.addEventListener("dragstart", (event) => this.handleDragStart(event));
    root.addEventListener("dragend", (event) => this.handleDragEnd(event));
    root.addEventListener("dragover", (event) => this.handleDragOver(event));
    root.addEventListener("dragleave", (event) => this.handleDragLeave(event));
    root.addEventListener("drop", (event) => this.handleDrop(event));
  },

  createState() {
    const state = createSupportState(supportCards.map((card) => card.id));
    state.trayOrder = shuffleSupportCardIds(state.trayOrder, supportCards);
    return state;
  },

  enter() {
    document.body.classList.add("support-game-active");
    this.render();
  },

  leave() {
    document.body.classList.remove("support-game-active");
    this.clearTimers();
    if (this.state.phase === "feedback") this.returnIncorrectCards(false);
    if (this.state.phase === "analyzing") {
      this.state.phase = "playing";
      this.state.feedback.clear();
    }
  },

  clearTimers() {
    clearTimeout(this.analysisTimer);
    clearTimeout(this.feedbackTimer);
    this.analysisTimer = null;
    this.feedbackTimer = null;
  },

  cardById(cardId) {
    return supportCards.find((card) => card.id === cardId);
  },

  isCardLocked(cardId) {
    const location = locateSupportCard(this.state.placements, cardId);
    return location !== "tray" && this.state.lockedSlots.has(location);
  },

  showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  },

  renderCard(cardId, slotId = null) {
    const card = this.cardById(cardId);
    const selected = this.state.selectedCard === cardId;
    const locked = slotId ? this.state.lockedSlots.has(slotId) : false;
    const feedback = slotId ? this.state.feedback.get(slotId) : undefined;
    const classes = ["support-answer-card"];
    if (selected) classes.push("is-selected");
    if (locked) classes.push("is-locked");
    if (feedback === true) classes.push("is-correct");
    if (feedback === false) classes.push("is-wrong");

    return `
      <button
        class="${classes.join(" ")}"
        type="button"
        data-card-id="${escapeHtml(card.id)}"
        draggable="${locked || this.state.phase !== "playing" ? "false" : "true"}"
        aria-pressed="${selected}"
        aria-label="${escapeHtml(card.text)} ${locked ? "Resposta correta e bloqueada." : "Selecione para mover."}"
      >
        <img src="${iconPath(card.icon)}" alt="" aria-hidden="true" draggable="false">
        <span>${escapeHtml(card.text)}</span>
        ${feedback === true ? '<b class="support-feedback-badge correct" aria-label="Resposta correta">✓</b>' : ""}
        ${feedback === false ? '<b class="support-feedback-badge wrong" aria-label="Resposta incorreta">✕</b>' : ""}
      </button>
    `;
  },

  renderSlot(ticket, slotType) {
    const slotId = buildSupportSlotId(ticket.id, slotType.id);
    const cardId = this.state.placements.get(slotId);
    const locked = this.state.lockedSlots.has(slotId);
    const feedback = this.state.feedback.get(slotId);
    const classes = ["support-slot"];
    if (cardId) classes.push("has-card");
    if (locked) classes.push("is-locked");
    if (feedback === true) classes.push("is-correct");
    if (feedback === false) classes.push("is-wrong");

    return `
      <div
        class="${classes.join(" ")}"
        data-slot-id="${slotId}"
        role="${cardId ? "group" : "button"}"
        tabindex="${cardId ? "-1" : "0"}"
        aria-label="${escapeHtml(slotType.label)} do chamado ${ticket.number}. ${cardId ? "Resposta posicionada." : "Espaço vazio. Selecione uma resposta e ative este espaço."}"
      >
        <div class="support-slot-label">
          <img src="${iconPath(slotType.icon)}" alt="" aria-hidden="true">
          <span><strong>${escapeHtml(slotType.label)}</strong><small>${escapeHtml(slotType.hint)}</small></span>
          ${locked ? '<b class="support-slot-check" aria-label="Etapa correta">✓</b>' : ""}
        </div>
        <div class="support-slot-content">
          ${cardId
            ? this.renderCard(cardId, slotId)
            : '<span class="support-slot-placeholder">Solte ou clique para colocar</span>'}
        </div>
        ${feedback === false
          ? '<p class="support-error-note"><span aria-hidden="true">✕</span> Essa resposta não corresponde a esta etapa.</p>'
          : ""}
      </div>
    `;
  },

  renderTicket(ticket) {
    const ticketSlots = supportSlotTypes.map((type) => buildSupportSlotId(ticket.id, type.id));
    const resolved = ticketSlots.every((slotId) => this.state.lockedSlots.has(slotId));
    return `
      <article class="support-ticket ${resolved ? "is-resolved" : ""}">
        <header class="support-ticket-header">
          <div class="support-ticket-number">
            <span>Chamado #${ticket.number}</span>
            <strong>${escapeHtml(ticket.title)}</strong>
          </div>
          <div class="support-ticket-icon"><img src="${iconPath(ticket.icon)}" alt="" aria-hidden="true"></div>
          <span class="support-ticket-status">${resolved ? "✓ Resolvido" : "Aberto"}</span>
        </header>
        <blockquote>“${escapeHtml(ticket.message)}”</blockquote>
        <div class="support-ticket-flow" aria-label="Etapas do diagnóstico">
          <span>Verificar</span><i>→</i><span>Identificar</span><i>→</i><span>Solucionar</span>
        </div>
        <div class="support-ticket-slots">
          ${supportSlotTypes.map((type) => this.renderSlot(ticket, type)).join("")}
        </div>
      </article>
    `;
  },

  renderCompletion() {
    if (this.state.phase !== "completed") return "";
    return `
      <div class="support-completion-backdrop">
        <section class="support-completion" role="dialog" aria-modal="true" aria-labelledby="support-completion-title">
          <div class="support-completion-emblem" aria-hidden="true">✓</div>
          <span class="section-label">Atividade concluída</span>
          <h2 id="support-completion-title">Central de Suporte concluída!</h2>
          <p class="support-completion-lead">Você resolveu os 3 chamados.</p>
          <div class="support-completion-stats">
            <div><strong>9/9</strong><span>diagnósticos corretos</span></div>
            <div><strong>${this.state.attempts}</strong><span>${this.state.attempts === 1 ? "tentativa" : "tentativas"}</span></div>
          </div>
          <p class="support-reasoning-title">Verificar → identificar → solucionar</p>
          <div class="support-summary-grid">
            ${supportTickets.map((ticket) => `
              <article>
                <img src="${iconPath(ticket.icon)}" alt="" aria-hidden="true">
                <div>
                  <strong>${escapeHtml(ticket.title.replace("Computador ", ""))}</strong>
                  <p><b>Verificar:</b> ${escapeHtml(ticket.summary.verificar)} <span>→</span> <b>Causa:</b> ${escapeHtml(ticket.summary.causa)} <span>→</span> <b>Solução:</b> ${escapeHtml(ticket.summary.solucao)}</p>
                </div>
              </article>
            `).join("")}
          </div>
          <div class="support-completion-actions">
            <button class="primary-button" type="button" data-action="restart">Jogar novamente</button>
            <a class="secondary-button" href="#/">Voltar para os jogos</a>
          </div>
        </section>
      </div>
    `;
  },

  renderAnalysis() {
    if (this.state.phase !== "analyzing") return "";
    return `
      <div class="support-analysis-backdrop" role="status" aria-live="assertive">
        <div class="support-analysis-card">
          <div class="support-scanner" aria-hidden="true">
            <img src="${iconPath("visibility")}" alt="">
            <span></span>
          </div>
          <strong>Analisando chamados...</strong>
          <p>Conferindo as nove etapas do diagnóstico</p>
          <div class="support-analysis-progress"><span></span></div>
        </div>
      </div>
    `;
  },

  render() {
    if (!this.root || !this.state) return;
    const progress = this.state.lockedSlots.size;
    const missing = countMissingSupportSlots(this.state.placements, TOTAL_SLOTS);
    const selectedLocation = this.state.selectedCard
      ? locateSupportCard(this.state.placements, this.state.selectedCard)
      : null;
    const canReturnSelected = Boolean(
      this.state.selectedCard
      && selectedLocation !== "tray"
      && !this.state.lockedSlots.has(selectedLocation)
      && this.state.phase === "playing"
    );
    const canSubmit = missing === 0 && this.state.phase === "playing" && progress < TOTAL_SLOTS;
    const helpText = this.state.phase === "analyzing"
      ? "Analisando os diagnósticos..."
      : this.state.phase === "feedback"
        ? "Confira as marcações. As respostas incorretas voltarão para a bandeja."
        : missing === 0
          ? "Tudo pronto! Envie os diagnósticos para conferir."
          : `Faltam ${missing} ${missing === 1 ? "resposta" : "respostas"} para completar os diagnósticos.`;

    this.root.innerHTML = `
      <div class="support-game-shell">
        <header class="support-game-heading">
          <div>
            <a class="back-link" href="#/">← Voltar para os jogos</a>
            <span class="eyebrow">Jogo de diagnóstico</span>
            <h1>Central de Suporte</h1>
            <p>Três usuários abriram chamados. Analise cada situação e monte o diagnóstico correto.</p>
          </div>
          <div class="progress-card" aria-live="polite">
            <span>Progresso</span>
            <strong>${progress} de ${TOTAL_SLOTS}</strong>
            <div class="progress-track"><span style="width:${(progress / TOTAL_SLOTS) * 100}%"></span></div>
          </div>
        </header>

        <aside class="support-instructions" aria-label="Como jogar">
          <div class="support-steps">
            <span class="instruction-number">1</span><p>Escolha uma resposta</p><i aria-hidden="true">→</i>
            <span class="instruction-number">2</span><p>Coloque no chamado correto</p><i aria-hidden="true">→</i>
            <span class="instruction-number">3</span><p>Envie o diagnóstico</p>
          </div>
          <p class="support-distractor-warning"><strong>Atenção:</strong> nem todas as respostas serão utilizadas.</p>
        </aside>

        <div class="support-workspace">
          <section class="support-tray-section" data-drop-zone="tray" aria-labelledby="support-tray-title">
            <div class="support-section-title">
              <div><span class="section-label">Respostas disponíveis</span><h2 id="support-tray-title">Bandeja de respostas</h2></div>
              <div class="support-tray-actions">
                <button class="ghost-button" type="button" data-action="return-selected" ${canReturnSelected ? "" : "disabled"}>↩ Devolver</button>
                <button class="ghost-button" type="button" data-action="shuffle">↻ Embaralhar</button>
              </div>
            </div>
            <p class="support-tray-help">Arraste ou clique em um cartão. Para devolver, solte-o aqui ou use o botão acima.</p>
            <div class="support-answer-grid" role="list">
              ${this.state.trayOrder.length
                ? this.state.trayOrder.map((cardId) => this.renderCard(cardId)).join("")
                : '<p class="support-tray-empty">Todos os cartões escolhidos estão nos chamados.</p>'}
            </div>
          </section>

          <section class="support-board" aria-label="Três chamados de suporte técnico">
            ${supportTickets.map((ticket) => this.renderTicket(ticket)).join("")}
          </section>
        </div>

        <div class="support-sticky-actions">
          <p aria-live="polite">${escapeHtml(helpText)}</p>
          <div>
            <button class="secondary-button" type="button" data-action="reset">Recomeçar</button>
            <button class="primary-button" type="button" data-action="submit" ${canSubmit ? "" : "disabled"}>${this.state.attempts > 0 ? "Reenviar diagnósticos" : "Enviar diagnósticos"}</button>
          </div>
        </div>

        ${this.renderAnalysis()}
        ${this.renderCompletion()}
      </div>
    `;

    if (this.state.phase === "completed") {
      requestAnimationFrame(() => this.root.querySelector('[data-action="restart"]')?.focus());
    }
  },

  handleClick(event) {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action) {
      if (action === "shuffle") this.shuffleTray();
      if (action === "return-selected") this.returnSelectedToTray();
      if (action === "reset" || action === "restart") this.reset();
      if (action === "submit") this.evaluate();
      return;
    }

    const cardElement = event.target.closest("[data-card-id]");
    if (cardElement) {
      const cardId = cardElement.dataset.cardId;
      const location = locateSupportCard(this.state.placements, cardId);
      if (this.state.phase !== "playing") return;
      if (this.isCardLocked(cardId)) {
        this.showToast("Essa resposta está correta e ficou bloqueada.");
        return;
      }
      if (this.state.selectedCard && this.state.selectedCard !== cardId && location !== "tray") {
        this.placeCard(this.state.selectedCard, location);
      } else {
        this.selectCard(cardId);
      }
      return;
    }

    const slot = event.target.closest("[data-slot-id]");
    if (slot) {
      this.activateSlot(slot.dataset.slotId);
      return;
    }

    if (event.target.closest('[data-drop-zone="tray"]') && this.state.selectedCard) {
      this.returnSelectedToTray();
    }
  },

  handleKeydown(event) {
    if (!['Enter', ' '].includes(event.key)) return;
    const slot = event.target.closest("[data-slot-id]");
    if (!slot || event.target.closest("[data-card-id]")) return;
    event.preventDefault();
    this.activateSlot(slot.dataset.slotId);
  },

  selectCard(cardId) {
    if (this.state.phase !== "playing" || this.isCardLocked(cardId)) return;
    this.state.selectedCard = this.state.selectedCard === cardId ? null : cardId;
    this.render();
    if (this.state.selectedCard) {
      const location = locateSupportCard(this.state.placements, cardId);
      this.showToast(location === "tray"
        ? "Resposta selecionada. Agora clique em uma etapa do chamado."
        : "Resposta selecionada. Escolha outro espaço ou devolva à bandeja.");
    }
  },

  activateSlot(slotId) {
    if (this.state.phase !== "playing") return;
    if (this.state.selectedCard) {
      this.placeCard(this.state.selectedCard, slotId);
      return;
    }
    const cardId = this.state.placements.get(slotId);
    if (cardId) this.selectCard(cardId);
    else this.showToast("Primeiro selecione uma resposta na bandeja.");
  },

  placeCard(cardId, slotId) {
    if (this.state.phase !== "playing") return;
    const result = moveSupportCard(this.state, cardId, slotId);
    if (!result.changed) {
      if (result.reason === "target-locked") this.showToast("Essa etapa já está correta e ficou bloqueada.");
      return;
    }
    this.state = result.state;
    this.render();
  },

  returnSelectedToTray() {
    if (!this.state.selectedCard || this.state.phase !== "playing") return;
    const result = returnSupportCardToTray(this.state, this.state.selectedCard);
    if (!result.changed) {
      if (result.reason === "card-locked") this.showToast("Essa resposta está correta e ficou bloqueada.");
      return;
    }
    this.state = result.state;
    this.render();
    this.showToast("A resposta voltou para a bandeja.");
  },

  shuffleTray() {
    if (this.state.phase !== "playing") return;
    this.state.trayOrder = shuffleSupportCardIds(this.state.trayOrder, supportCards);
    this.render();
    this.showToast("As respostas disponíveis foram embaralhadas.");
  },

  evaluate() {
    if (this.state.phase !== "playing" || this.state.placements.size !== TOTAL_SLOTS) return;
    this.state.phase = "analyzing";
    this.state.selectedCard = null;
    this.state.attempts += 1;
    this.render();

    this.analysisTimer = setTimeout(() => {
      const result = evaluateSupportPlacements(this.state.placements, supportCards);
      this.state.lockedSlots = result.correctSlots;
      this.state.feedback = new Map(
        [...this.state.placements.keys()].map((slotId) => [slotId, result.correctSlots.has(slotId)])
      );
      this.state.phase = result.score === TOTAL_SLOTS ? "completed" : "feedback";
      this.render();
      if (this.state.phase === "feedback") {
        this.feedbackTimer = setTimeout(() => this.returnIncorrectCards(), ERROR_RETURN_DELAY);
      }
    }, ANALYSIS_DELAY);
  },

  returnIncorrectCards(shouldRender = true) {
    const incorrectSlots = [...this.state.feedback.entries()]
      .filter(([, correct]) => correct === false)
      .map(([slotId]) => slotId);
    const returnedCards = [];
    for (const slotId of incorrectSlots) {
      const cardId = this.state.placements.get(slotId);
      if (cardId) returnedCards.push(cardId);
      this.state.placements.delete(slotId);
      this.state.feedback.delete(slotId);
    }
    this.state.trayOrder = [...returnedCards, ...this.state.trayOrder.filter((id) => !returnedCards.includes(id))];
    this.state.phase = "playing";
    this.state.selectedCard = null;
    if (shouldRender) {
      this.render();
      this.showToast("Os acertos ficaram bloqueados. Tente novamente nas etapas restantes.");
    }
  },

  reset() {
    this.clearTimers();
    this.state = this.createState();
    this.render();
    document.getElementById("support-game-screen")?.scrollIntoView({ behavior: "smooth" });
    this.showToast("Nova rodada iniciada. As respostas foram embaralhadas.");
  },

  handleDragStart(event) {
    const card = event.target.closest("[data-card-id]");
    if (!card) return;
    const cardId = card.dataset.cardId;
    if (this.state.phase !== "playing" || this.isCardLocked(cardId)) {
      event.preventDefault();
      return;
    }
    this.draggedCard = cardId;
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", cardId);
  },

  handleDragEnd(event) {
    this.draggedCard = null;
    event.target.closest("[data-card-id]")?.classList.remove("is-dragging");
    this.root.querySelectorAll(".is-drag-over").forEach((element) => element.classList.remove("is-drag-over"));
  },

  handleDragOver(event) {
    if (this.state.phase !== "playing") return;
    const slot = event.target.closest("[data-slot-id]");
    const tray = event.target.closest('[data-drop-zone="tray"]');
    if (slot && this.state.lockedSlots.has(slot.dataset.slotId)) return;
    const target = slot || tray;
    if (!target) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    target.classList.add("is-drag-over");
  },

  handleDragLeave(event) {
    const target = event.target.closest('[data-slot-id], [data-drop-zone="tray"]');
    if (target && !target.contains(event.relatedTarget)) target.classList.remove("is-drag-over");
  },

  handleDrop(event) {
    if (this.state.phase !== "playing") return;
    const slot = event.target.closest("[data-slot-id]");
    const tray = event.target.closest('[data-drop-zone="tray"]');
    if (!slot && !tray) return;
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain") || this.draggedCard;
    if (!cardId) return;
    if (slot) this.placeCard(cardId, slot.dataset.slotId);
    if (tray) {
      this.state.selectedCard = cardId;
      this.returnSelectedToTray();
    }
    this.draggedCard = null;
  }
};

export { supportGame };

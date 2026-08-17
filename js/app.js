import { sideGame } from "./side-game.mjs";
import { sideGameItems } from "./side-game-data.mjs";
import { supportGame } from "./support-game.mjs";

(function () {
  "use strict";

  const { categoryInfo, classificationItems, hangmanTerms, normalizeTerm } = window.gameData;
  const screens = [...document.querySelectorAll("[data-screen]")];
  const routeLinks = [...document.querySelectorAll("[data-route-link]")];
  const toastElement = document.getElementById("toast");
  let toastTimer;
  let activeRoute = null;

  const shuffle = (values) => {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  };

  const showToast = (message) => {
    toastElement.textContent = message;
    toastElement.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.remove("show"), 2600);
  };

  const getRoute = () => {
    const hash = window.location.hash || "#/";
    if (hash.startsWith("#/classificacao")) return "classification";
    if (hash.startsWith("#/forca")) return "hangman";
    if (hash.startsWith("#/escolha-seu-lado")) return "side-game";
    if (hash.startsWith("#/suporte-tecnico")) return "support-game";
    return "home";
  };

  const renderRoute = () => {
    const route = getRoute();
    if (activeRoute === "side-game" && route !== "side-game") sideGame.leave();
    if (activeRoute === "support-game" && route !== "support-game") supportGame.leave();
    screens.forEach((screen) => {
      screen.hidden = screen.dataset.screen !== route;
    });
    routeLinks.forEach((link) => {
      const active = link.dataset.routeLink === route;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.title = route === "classification"
      ? "Classifique os itens — Central de Jogos"
      : route === "hangman"
        ? "Forca do Sistema Operacional — Central de Jogos"
        : route === "side-game"
          ? "Escolha seu lado — Central de Jogos"
        : route === "support-game"
          ? "Central de Suporte — Central de Jogos"
        : "Central de Jogos — Fundamentos de Informática";
    if (route !== "side-game") window.scrollTo({ top: 0, behavior: "smooth" });
    if (route === "classification") classification.render();
    if (route === "hangman") hangman.render();
    if (route === "side-game" && activeRoute !== "side-game") sideGame.enter();
    if (route === "support-game" && activeRoute !== "support-game") supportGame.enter();
    activeRoute = route;
  };

  const classification = {
    state: null,
    draggedItem: null,

    createState() {
      return {
        trayOrder: shuffle(classificationItems.map((item) => item.id)),
        placements: new Map(),
        selectedItem: null,
        phase: "playing",
        lockedItems: new Set(),
        feedback: new Map(),
        attempts: 0
      };
    },

    ensureState() {
      if (!this.state) this.state = this.createState();
    },

    itemById(id) {
      return classificationItems.find((item) => item.id === id);
    },

    locateItem(id) {
      for (const [slotId, itemId] of this.state.placements.entries()) {
        if (itemId === id) return slotId;
      }
      return "tray";
    },

    getPlacedCount() {
      return this.state.placements.size;
    },

    createItemCard(itemId) {
      const item = this.itemById(itemId);
      const feedback = this.state.feedback.get(itemId);
      const locked = this.state.lockedItems.has(itemId) || this.state.phase === "evaluated";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "item-card";
      button.dataset.itemId = item.id;
      button.draggable = !locked;
      button.setAttribute("role", "listitem");
      button.setAttribute("aria-label", `${item.nome}. ${locked ? "Item bloqueado após a correção." : "Selecione para mover."}`);
      if (this.state.selectedItem === item.id) button.classList.add("is-selected");
      if (locked) button.classList.add("is-locked");
      if (feedback === true) button.classList.add("is-correct");
      if (feedback === false) button.classList.add("is-wrong");

      const image = document.createElement("img");
      image.src = item.imagem;
      image.alt = item.alt;
      image.loading = "eager";
      image.draggable = false;
      image.addEventListener("error", () => {
        image.alt = `Imagem indisponível: ${item.nome}`;
        button.classList.add("image-error");
      }, { once: true });

      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = item.nome;
      button.append(image, name);

      if (feedback !== undefined) {
        const badge = document.createElement("span");
        badge.className = `feedback-badge ${feedback ? "correct" : "wrong"}`;
        badge.textContent = feedback ? "✓" : "×";
        badge.setAttribute("aria-label", feedback ? "Resposta correta" : "Resposta incorreta");
        button.appendChild(badge);
      }

      button.addEventListener("click", () => {
        const itemLocation = this.locateItem(item.id);
        if (this.state.selectedItem && this.state.selectedItem !== item.id && itemLocation !== "tray") {
          this.placeItem(this.state.selectedItem, itemLocation);
        } else {
          this.selectItem(item.id);
        }
      });
      button.addEventListener("dragstart", (event) => {
        if (locked) {
          event.preventDefault();
          return;
        }
        this.draggedItem = item.id;
        button.classList.add("dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
      });
      button.addEventListener("dragend", () => {
        this.draggedItem = null;
        button.classList.remove("dragging");
        document.querySelectorAll(".drag-over").forEach((slot) => slot.classList.remove("drag-over"));
      });
      return button;
    },

    render() {
      this.ensureState();
      this.renderTray();
      this.renderCategories();
      this.renderProgress();
      this.renderResult();
    },

    renderTray() {
      const tray = document.getElementById("items-tray");
      tray.innerHTML = "";
      const visibleItems = this.state.trayOrder.filter((id) => this.locateItem(id) === "tray");
      tray.classList.toggle("is-empty", visibleItems.length === 0);
      tray.closest(".items-tray-section")?.classList.toggle("tray-complete", visibleItems.length === 0);
      if (visibleItems.length === 0) {
        const message = document.createElement("p");
        message.textContent = "Todos os cartões foram colocados. Agora confira e envie suas respostas!";
        tray.appendChild(message);
      } else {
        visibleItems.forEach((itemId) => tray.appendChild(this.createItemCard(itemId)));
      }
      tray.ondragover = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      };
      tray.ondrop = (event) => {
        event.preventDefault();
        const itemId = event.dataTransfer.getData("text/plain") || this.draggedItem;
        if (itemId) this.returnToTray(itemId);
      };
    },

    renderCategories() {
      const grid = document.getElementById("category-grid");
      grid.innerHTML = "";
      Object.entries(categoryInfo).forEach(([categoryId, info]) => {
        const panel = document.createElement("article");
        panel.className = "category-panel";
        panel.style.setProperty("--category-color", info.color);
        panel.innerHTML = `
          <header class="category-header">
            <span class="category-icon" aria-hidden="true">${info.icon}</span>
            <small>${info.eyebrow}</small>
            <h3>${info.name}</h3>
            <p>${info.description}</p>
          </header>
        `;
        const slots = document.createElement("div");
        slots.className = "category-slots";
        slots.setAttribute("role", "list");
        slots.setAttribute("aria-label", `Quadrados da categoria ${info.name}`);
        for (let index = 0; index < 8; index += 1) {
          const slotId = `${categoryId}-${index}`;
          const itemId = this.state.placements.get(slotId);
          const slot = document.createElement("button");
          slot.type = "button";
          slot.className = "category-slot";
          slot.dataset.slotId = slotId;
          slot.dataset.category = categoryId;
          slot.dataset.number = String(index + 1).padStart(2, "0");
          slot.setAttribute("role", "listitem");
          slot.setAttribute("aria-label", itemId
            ? `${this.itemById(itemId).nome} na categoria ${info.name}. Clique para selecionar.`
            : `Quadrado vazio ${index + 1} da categoria ${info.name}`);

          if (itemId) {
            slot.appendChild(this.createItemCard(itemId));
            const feedback = this.state.feedback.get(itemId);
            if (feedback === false) {
              const note = document.createElement("span");
              note.className = "correct-answer-note";
              note.textContent = `Correto: ${categoryInfo[this.itemById(itemId).categoria].name}`;
              slot.appendChild(note);
            }
          }

          slot.addEventListener("click", (event) => {
            if (event.target.closest(".item-card")) return;
            this.activateSlot(slotId);
          });
          slot.addEventListener("dragover", (event) => {
            event.preventDefault();
            slot.classList.add("drag-over");
            event.dataTransfer.dropEffect = "move";
          });
          slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
          slot.addEventListener("drop", (event) => {
            event.preventDefault();
            slot.classList.remove("drag-over");
            const draggedId = event.dataTransfer.getData("text/plain") || this.draggedItem;
            if (draggedId) this.placeItem(draggedId, slotId);
          });
          slots.appendChild(slot);
        }
        panel.appendChild(slots);
        grid.appendChild(panel);
      });
    },

    selectItem(itemId) {
      if (this.state.phase === "evaluated" || this.state.lockedItems.has(itemId)) {
        showToast("Esse item já foi corrigido e está bloqueado.");
        return;
      }
      this.state.selectedItem = this.state.selectedItem === itemId ? null : itemId;
      this.render();
      if (this.state.selectedItem) showToast("Item selecionado. Agora escolha um quadrado.");
    },

    activateSlot(slotId) {
      const targetItem = this.state.placements.get(slotId);
      if (this.state.selectedItem) {
        this.placeItem(this.state.selectedItem, slotId);
      } else if (targetItem) {
        this.selectItem(targetItem);
      } else {
        showToast("Primeiro selecione um cartão.");
      }
    },

    placeItem(itemId, targetSlot) {
      if (this.state.phase === "evaluated" || this.state.lockedItems.has(itemId)) return;
      const currentLocation = this.locateItem(itemId);
      const targetItem = this.state.placements.get(targetSlot);

      if (targetItem && this.state.lockedItems.has(targetItem)) {
        showToast("Esse quadrado contém um acerto bloqueado. Escolha outro destino.");
        return;
      }

      if (currentLocation !== "tray") this.state.placements.delete(currentLocation);
      this.state.trayOrder = this.state.trayOrder.filter((id) => id !== itemId);

      if (targetItem && targetItem !== itemId) {
        if (currentLocation === "tray") {
          this.state.trayOrder.unshift(targetItem);
        } else {
          this.state.placements.set(currentLocation, targetItem);
        }
      }
      this.state.placements.set(targetSlot, itemId);
      this.state.selectedItem = null;
      this.state.feedback.delete(itemId);
      this.render();
    },

    returnToTray(itemId) {
      if (this.state.phase === "evaluated" || this.state.lockedItems.has(itemId)) return;
      const currentLocation = this.locateItem(itemId);
      if (currentLocation === "tray") return;
      this.state.placements.delete(currentLocation);
      this.state.trayOrder.unshift(itemId);
      this.state.selectedItem = null;
      this.state.feedback.delete(itemId);
      this.render();
    },

    renderProgress() {
      const count = this.getPlacedCount();
      const remaining = classificationItems.length - count;
      document.getElementById("classification-progress").textContent = `${count} de ${classificationItems.length}`;
      document.getElementById("classification-progress-bar").style.width = `${(count / classificationItems.length) * 100}%`;
      const help = document.getElementById("classification-help");
      const submit = document.getElementById("submit-classification");
      if (this.state.phase === "evaluated") {
        help.textContent = "Confira as marcações e a categoria correta dos itens em vermelho.";
        submit.disabled = true;
        submit.textContent = "Respostas conferidas";
      } else {
        help.textContent = remaining === 0
          ? "Tudo pronto! Envie suas respostas para conferir."
          : `Faltam ${remaining} ${remaining === 1 ? "item" : "itens"} para completar a atividade.`;
        submit.disabled = remaining !== 0;
        submit.textContent = this.state.attempts > 0 ? "Reenviar respostas" : "Enviar respostas";
      }
    },

    evaluate() {
      if (this.getPlacedCount() !== classificationItems.length) return;
      this.state.feedback.clear();
      this.state.lockedItems.clear();
      for (const [slotId, itemId] of this.state.placements.entries()) {
        const categoryId = slotId.split("-").slice(0, -1).join("-");
        const correct = this.itemById(itemId).categoria === categoryId;
        this.state.feedback.set(itemId, correct);
        if (correct) this.state.lockedItems.add(itemId);
      }
      this.state.attempts += 1;
      this.state.phase = "evaluated";
      this.state.selectedItem = null;
      this.render();
      document.getElementById("classification-result").scrollIntoView({ behavior: "smooth", block: "center" });
    },

    retryErrors() {
      this.state.phase = "retry";
      for (const [itemId, isCorrect] of [...this.state.feedback.entries()]) {
        if (!isCorrect) this.state.feedback.delete(itemId);
      }
      this.render();
      showToast("Os acertos ficaram bloqueados. Mova apenas os itens que estavam incorretos.");
    },

    renderResult() {
      const panel = document.getElementById("classification-result");
      if (this.state.phase !== "evaluated") {
        panel.hidden = true;
        panel.innerHTML = "";
        return;
      }
      const score = [...this.state.feedback.values()].filter(Boolean).length;
      const perfect = score === classificationItems.length;
      panel.hidden = false;
      panel.innerHTML = `
        <div class="result-grid">
          <div class="result-score"><strong>${score}/40</strong></div>
          <div>
            <span class="section-label">Resultado da rodada</span>
            <h2>${perfect ? "Classificação perfeita!" : "Boa tentativa — vamos revisar?"}</h2>
            <p>${perfect
              ? "Todos os itens foram classificados corretamente. Excelente trabalho!"
              : `${classificationItems.length - score} ${classificationItems.length - score === 1 ? "item precisa" : "itens precisam"} mudar de categoria. Os acertos ficarão preservados.`}</p>
          </div>
        </div>
        ${perfect
          ? '<button class="primary-button result-action" type="button" data-result-action="restart">Jogar novamente</button>'
          : '<button class="primary-button result-action" type="button" data-result-action="retry">Corrigir meus erros</button>'}
      `;
      panel.querySelector("[data-result-action]").addEventListener("click", () => {
        if (perfect) this.reset();
        else this.retryErrors();
      });
    },

    reset() {
      this.state = this.createState();
      this.render();
      document.getElementById("classification-screen").scrollIntoView({ behavior: "smooth" });
    },

    shuffleTray() {
      if (this.state.phase === "evaluated") return;
      this.state.trayOrder = shuffle(this.state.trayOrder);
      this.renderTray();
      showToast("Os cartões disponíveis foram embaralhados.");
    }
  };

  const hangman = {
    state: {
      phase: "choose",
      selectedId: null,
      guessed: new Set(),
      errors: 0,
      message: "",
      result: null,
      search: ""
    },

    selectedTerm() {
      return hangmanTerms.find((term) => term.id === this.state.selectedId);
    },

    render() {
      const app = document.getElementById("hangman-app");
      if (this.state.phase === "choose") this.renderChoose(app);
      if (this.state.phase === "ready") this.renderReady(app);
      if (this.state.phase === "play") this.renderPlay(app);
      if (this.state.phase === "result") this.renderResult(app);
    },

    renderChoose(app) {
      app.innerHTML = `
        <div class="hangman-heading">
          <div>
            <a class="back-link" href="#/">← Voltar para os jogos</a>
            <span class="eyebrow">Preparação da partida</span>
            <h1>Professor, escolha o termo.</h1>
            <p>Faça a escolha antes de transmitir a tela. Depois, a palavra será escondida em uma etapa segura.</p>
          </div>
          <span class="teacher-badge">Área do professor</span>
        </div>
        <div class="term-toolbar">
          <input id="term-search" class="term-search" type="search" placeholder="Buscar entre os 30 termos..." aria-label="Buscar termo da forca" value="${this.escape(this.state.search)}">
          <span id="term-count" class="term-count"></span>
        </div>
        <div id="term-grid" class="term-grid" role="list"></div>
        <div class="teacher-actions">
          <p id="teacher-selection-text">${this.state.selectedId ? "Termo selecionado. Quando estiver pronto, prepare a partida." : "Selecione uma palavra ou expressão para continuar."}</p>
          <button id="prepare-hangman" class="primary-button" type="button" ${this.state.selectedId ? "" : "disabled"}>Ocultar e preparar partida</button>
        </div>
      `;
      const searchInput = app.querySelector("#term-search");
      searchInput.addEventListener("input", (event) => {
        this.state.search = event.target.value;
        this.renderTerms();
      });
      app.querySelector("#prepare-hangman").addEventListener("click", () => this.prepare());
      this.renderTerms();
    },

    renderTerms() {
      const grid = document.getElementById("term-grid");
      if (!grid) return;
      const query = normalizeTerm(this.state.search.trim());
      const visible = hangmanTerms.filter((term) => term.termoNormalizado.includes(query));
      document.getElementById("term-count").textContent = `${visible.length} ${visible.length === 1 ? "termo" : "termos"}`;
      grid.innerHTML = "";
      visible.forEach((term, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "term-card";
        button.dataset.termId = term.id;
        button.setAttribute("role", "listitem");
        button.setAttribute("aria-pressed", String(this.state.selectedId === term.id));
        if (this.state.selectedId === term.id) button.classList.add("is-selected");
        button.innerHTML = `<small>TERMO ${String(index + 1).padStart(2, "0")}</small><strong>${term.termo}</strong><span class="selected-check" aria-hidden="true">✓</span>`;
        button.addEventListener("click", () => {
          this.state.selectedId = term.id;
          this.render();
          document.getElementById("prepare-hangman")?.focus();
        });
        grid.appendChild(button);
      });
      if (visible.length === 0) grid.innerHTML = '<p>Nenhum termo encontrado. Tente outra busca.</p>';
    },

    prepare() {
      if (!this.selectedTerm()) return;
      this.state.phase = "ready";
      this.state.search = "";
      document.title = "Partida preparada — Central de Jogos";
      this.render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    renderReady(app) {
      app.innerHTML = `
        <div class="ready-screen">
          <div class="ready-card">
            <div class="ready-symbol" aria-hidden="true">✓</div>
            <span class="eyebrow">Palavra protegida</span>
            <h1>Pronto para compartilhar!</h1>
            <p>O termo do professor não está mais visível. Agora você pode transmitir esta tela para a turma e iniciar o desafio.</p>
            <button id="start-hangman" class="primary-button" type="button">Começar com a turma <span aria-hidden="true">→</span></button>
          </div>
        </div>
      `;
      app.querySelector("#start-hangman").addEventListener("click", () => this.start());
    },

    start() {
      this.state.phase = "play";
      this.state.guessed = new Set();
      this.state.errors = 0;
      this.state.message = "Escolha uma letra para começar.";
      this.state.result = null;
      document.title = "Forca em andamento — Central de Jogos";
      this.render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    renderPlay(app) {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      const term = this.selectedTerm();
      app.innerHTML = `
        <div class="hangman-heading">
          <div>
            <a class="back-link" href="#/">← Encerrar e voltar</a>
            <span class="eyebrow">Desafio da turma</span>
            <h1>Forca do sistema operacional</h1>
            <p>Descubram o termo antes que as seis partes do personagem apareçam.</p>
          </div>
        </div>
        <div class="hangman-play-layout">
          <section class="hangman-visual-panel" aria-label="Desenho da forca e tentativas restantes">
            <div class="attempt-counter">
              <span>${6 - this.state.errors} ${6 - this.state.errors === 1 ? "tentativa restante" : "tentativas restantes"}</span>
              <div class="life-dots" aria-hidden="true">${Array.from({length: 6}, (_, index) => `<span class="life-dot ${index < this.state.errors ? "lost" : ""}"></span>`).join("")}</div>
            </div>
            <div class="hangman-stage" aria-label="${this.state.errors} de 6 partes do corpo visíveis">
              <img src="./assets/hangman/gallows.png" alt="Estrutura da forca">
              ${Array.from({length: 6}, (_, index) => `<img class="body-part ${index < this.state.errors ? "visible" : ""}" src="./assets/hangman/part-${index + 1}.png" alt="" aria-hidden="true">`).join("")}
            </div>
          </section>
          <section class="word-panel">
            <div class="round-label"><span>Descubra a palavra</span><span class="used-letters">${this.state.guessed.size ? `Usadas: ${[...this.state.guessed].join(" ")}` : "Nenhuma letra usada"}</span></div>
            <div class="word-display" aria-label="Palavra com letras ocultas">${this.wordMarkup(term)}</div>
            <p class="keyboard-label">Escolha uma letra</p>
            <div class="letter-keyboard" aria-label="Teclado de letras">
              ${alphabet.map((letter) => {
                const used = this.state.guessed.has(letter);
                const correct = term.termoNormalizado.includes(letter);
                return `<button class="letter-key ${used ? (correct ? "correct" : "wrong") : ""}" type="button" data-letter="${letter}" ${used ? "disabled" : ""} aria-label="Letra ${letter}${used ? (correct ? ", correta" : ", incorreta") : ""}">${letter}</button>`;
              }).join("")}
            </div>
            <p class="hangman-message" role="status">${this.state.message}</p>
          </section>
        </div>
      `;
      app.querySelectorAll("[data-letter]").forEach((button) => {
        button.addEventListener("click", () => this.guess(button.dataset.letter));
      });
    },

    wordMarkup(term) {
      return [...term.termo].map((character) => {
        if (/\s/.test(character)) return '<span class="word-character space" aria-hidden="true"></span>';
        if (character === "-") return '<span class="word-character revealed">-</span>';
        const normalized = normalizeTerm(character);
        const revealed = this.state.guessed.has(normalized);
        return `<span class="word-character ${revealed ? "revealed" : ""}">${revealed ? character : ""}</span>`;
      }).join("");
    },

    guess(letter) {
      if (this.state.phase !== "play" || this.state.guessed.has(letter)) return;
      const term = this.selectedTerm();
      this.state.guessed.add(letter);
      const correct = term.termoNormalizado.includes(letter);
      if (correct) {
        this.state.message = `Boa! A letra ${letter} aparece no termo.`;
      } else {
        this.state.errors += 1;
        this.state.message = `A letra ${letter} não aparece. Uma nova parte foi revelada.`;
      }

      const requiredLetters = new Set(term.termoNormalizado.replace(/[^A-Z]/g, "").split(""));
      const won = [...requiredLetters].every((required) => this.state.guessed.has(required));
      const lost = this.state.errors >= 6;
      if (won || lost) {
        this.render();
        window.setTimeout(() => {
          this.state.phase = "result";
          this.state.result = won ? "won" : "lost";
          this.render();
        }, 650);
      } else {
        this.render();
      }
    },

    renderResult(app) {
      const term = this.selectedTerm();
      const won = this.state.result === "won";
      document.title = `${won ? "Vitória" : "Fim da rodada"} — Central de Jogos`;
      app.innerHTML = `
        <div class="ready-screen">
          <div class="game-result-card ${won ? "won" : "lost"}">
            <div class="result-emblem" aria-hidden="true">${won ? "✓" : "×"}</div>
            <div>
              <span class="eyebrow">${won ? "Desafio concluído" : "Vamos aprender com a resposta"}</span>
              <h1>${won ? "A turma acertou!" : "Fim das tentativas"}</h1>
              <span class="answer-reveal">${term.termo}</span>
              <p>${term.explicacao}</p>
              <div class="result-actions">
                <button id="replay-term" class="primary-button" type="button">Jogar novamente</button>
                <button id="choose-another" class="secondary-button" type="button">Escolher outro termo</button>
                <a class="ghost-button" href="#/">Voltar ao início</a>
              </div>
            </div>
          </div>
        </div>
      `;
      app.querySelector("#replay-term").addEventListener("click", () => {
        this.state.phase = "ready";
        this.state.guessed = new Set();
        this.state.errors = 0;
        this.state.result = null;
        this.render();
      });
      app.querySelector("#choose-another").addEventListener("click", () => {
        this.state = { phase: "choose", selectedId: null, guessed: new Set(), errors: 0, message: "", result: null, search: "" };
        this.render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },

    escape(value) {
      return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
    }
  };

  document.addEventListener("keydown", (event) => {
    if (hangman.state.phase !== "play" || getRoute() !== "hangman") return;
    const key = normalizeTerm(event.key);
    if (/^[A-Z]$/.test(key)) {
      event.preventDefault();
      hangman.guess(key);
    }
  });

  document.getElementById("submit-classification").addEventListener("click", () => classification.evaluate());
  document.getElementById("reset-classification").addEventListener("click", () => classification.reset());
  document.getElementById("shuffle-button").addEventListener("click", () => classification.shuffleTray());

  const creditsDialog = document.getElementById("credits-dialog");
  const renderCredits = () => {
    const list = document.getElementById("credits-list");
    list.innerHTML = sideGameItems.map((item) => {
      const detail = item.attribution || window.assetCredits?.[item.creditId || item.id] || {};
      const source = detail.source || "Fonte registrada no projeto";
      const license = detail.license || "Consulte a fonte";
      const isLink = /^https?:/.test(source);
      return `
        <article class="credit-row">
          <div><strong>${item.name}</strong><small>${detail.title || item.alt}</small></div>
          <div><strong>${license}</strong><small>${detail.author || "Autoria na página da fonte"}</small></div>
          ${isLink ? `<a href="${source}" target="_blank" rel="noopener noreferrer">Ver fonte ↗</a>` : "<span>Fonte local</span>"}
        </article>
      `;
    }).join("");
  };
  document.getElementById("open-credits").addEventListener("click", () => {
    renderCredits();
    creditsDialog.showModal();
  });
  document.getElementById("close-credits").addEventListener("click", () => creditsDialog.close());
  creditsDialog.addEventListener("click", (event) => {
    if (event.target === creditsDialog) creditsDialog.close();
  });

  window.addEventListener("hashchange", renderRoute);
  if (!window.location.hash) window.location.hash = "#/";
  sideGame.mount(document.getElementById("side-game-app"));
  supportGame.mount(document.getElementById("support-game-app"));
  classification.ensureState();
  renderRoute();
})();

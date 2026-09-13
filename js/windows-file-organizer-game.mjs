import {
  CATEGORIES,
  CONNECTION_FILES,
  DESKTOP_LEVEL_WITH_EXTENSIONS,
  DESKTOP_LEVEL_WITHOUT_EXTENSIONS,
  FILE_TYPES,
  GUIDED_CHALLENGES,
  MEDIA,
  categoryById
} from "./windows-file-organizer-data.mjs";
import {
  connectFileToCategory,
  createInitialOrganizerState,
  evaluateConnections,
  evaluateDesktop,
  getFolderCounts,
  getGuidedFolderOrder,
  keepCorrectConnections,
  moveOrganizerFile,
  removeConnection,
  removeIncorrectPlacements,
  sanitizeOrganizerState
} from "./windows-file-organizer-core.mjs";

const STORAGE_KEY = "centralJogos.windowsFileOrganizer.progress.v1";
const FOLDER_ICON = "./assets/windows-file-organizer/icons/folder.svg";

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);

const progressForPhase = (phase) => {
  if (["intro", "connections"].includes(phase)) return 1;
  if (["drag-demo", "guided"].includes(phase)) return 2;
  if (["desktop-visible-intro", "desktop-visible", "hidden-intro", "properties-demo"].includes(phase)) return 3;
  if (["desktop-hidden", "final"].includes(phase)) return 4;
  return 0;
};

class WindowsFileOrganizerGame {
  constructor() {
    this.root = null;
    this.active = false;
    this.launched = false;
    this.state = this.loadState();
    this.feedback = null;
    this.desktopFeedback = null;
    this.selectedConnectionFile = null;
    this.selectedFile = null;
    this.openedFolder = null;
    this.contextMenu = null;
    this.propertiesFileId = null;
    this.previousFocus = null;
    this.returnFocusFileId = null;
    this.connectionHistory = [];
    this.pointerDrag = null;
    this.longPressTimer = null;
    this.suppressClickUntil = 0;
    this.fullscreenError = "";
    this.returnFocusFileId = null;
    this.resizeObserver = null;
    this.pendingFocusSelector = null;
    this.handleClick = this.handleClick.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
  }

  mount(root) {
    if (this.root) this.unbindRootEvents();
    this.root = root;
    if (!this.root) return;
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("dblclick", this.handleDoubleClick);
    this.root.addEventListener("keydown", this.handleKeyDown);
    this.root.addEventListener("contextmenu", this.handleContextMenu);
    this.root.addEventListener("pointerdown", this.handlePointerDown);
    this.root.addEventListener("pointermove", this.handlePointerMove);
    this.root.addEventListener("pointerup", this.handlePointerUp);
    this.root.addEventListener("pointercancel", this.handlePointerUp);
  }

  unbindRootEvents() {
    this.root?.removeEventListener("click", this.handleClick);
    this.root?.removeEventListener("dblclick", this.handleDoubleClick);
    this.root?.removeEventListener("keydown", this.handleKeyDown);
    this.root?.removeEventListener("contextmenu", this.handleContextMenu);
    this.root?.removeEventListener("pointerdown", this.handlePointerDown);
    this.root?.removeEventListener("pointermove", this.handlePointerMove);
    this.root?.removeEventListener("pointerup", this.handlePointerUp);
    this.root?.removeEventListener("pointercancel", this.handlePointerUp);
  }

  enter() {
    if (!this.root) return;
    this.active = true;
    this.launched = false;
    this.state = this.loadState();
    this.resetTransientState();
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    this.render();
  }

  leave() {
    this.active = false;
    this.launched = false;
    document.body.classList.remove("windows-file-organizer-active");
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    this.stopPointerInteraction();
    this.disconnectResizeObserver();
    if (document.fullscreenElement === this.root) document.exitFullscreen().catch(() => {});
  }

  resetTransientState() {
    this.feedback = null;
    this.desktopFeedback = null;
    this.selectedConnectionFile = null;
    this.selectedFile = null;
    this.openedFolder = null;
    this.contextMenu = null;
    this.propertiesFileId = null;
    this.connectionHistory = [];
    this.fullscreenError = "";
  }

  loadState() {
    try {
      return sanitizeOrganizerState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch {
      return createInitialOrganizerState();
    }
  }

  saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  setPhase(phase) {
    this.state.phase = phase;
    this.feedback = null;
    this.desktopFeedback = null;
    this.selectedConnectionFile = null;
    this.selectedFile = null;
    this.openedFolder = null;
    this.contextMenu = null;
    this.propertiesFileId = null;
    this.saveState();
    this.render();
  }

  render() {
    if (!this.root || !this.active) return;
    this.disconnectResizeObserver();
    if (!this.launched) {
      document.body.classList.remove("windows-file-organizer-active");
      this.root.innerHTML = this.renderStart();
      return;
    }
    document.body.classList.add("windows-file-organizer-active");
    const progress = progressForPhase(this.state.phase);
    this.root.innerHTML = `
      <div class="wfo-shell">
        <header class="wfo-topbar">
          <a class="wfo-brand" href="#/" aria-label="Voltar para a Central de Jogos">
            <span class="wfo-window-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <span><strong>Organize o Windows</strong><small>Arquivos e Extensões</small></span>
          </a>
          <ol class="wfo-progress" aria-label="Progresso da atividade">
            ${["Extensões", "Mover", "Organizar", "Propriedades"].map((label, index) => `<li class="${progress > index ? "is-active" : ""} ${progress > index + 1 ? "is-complete" : ""}"><span>${progress > index + 1 ? "✓" : index + 1}</span>${label}</li>`).join("")}
          </ol>
          <div class="wfo-toolbar">
            <button type="button" class="wfo-icon-button" data-action="fullscreen" aria-label="Alternar tela cheia">⛶ <span>Tela cheia</span></button>
            <a class="wfo-icon-button" href="#/">✕ <span>Sair</span></a>
          </div>
        </header>
        <main class="wfo-stage">
          ${this.fullscreenError ? `<div class="wfo-fullscreen-banner" role="alert"><span>${escapeHtml(this.fullscreenError)}</span><button type="button" data-action="fullscreen">Tentar tela cheia</button></div>` : ""}
          ${this.renderPhase()}
        </main>
        <div class="wfo-live" aria-live="assertive"></div>
      </div>
    `;
    window.requestAnimationFrame(() => {
      if (this.state.phase === "connections") this.drawConnectionLines();
      this.restoreFocus();
      this.root.querySelectorAll("video[autoplay]").forEach((video) => video.play().catch(() => video.closest(".wfo-media")?.classList.add("is-static")));
    });
  }

  renderStart() {
    const hasProgress = this.state.phase !== "start" && this.state.phase !== "final";
    return `
      <section class="wfo-start" aria-labelledby="wfo-start-title">
        <div class="wfo-start-art" aria-hidden="true">
          <span class="wfo-start-file"><img src="./assets/windows-file-organizer/icons/pdf.svg" alt=""><b>curriculo.pdf</b></span>
          <span class="wfo-start-folder"><img src="${FOLDER_ICON}" alt=""><b>Documentos</b></span>
          <span class="wfo-start-arrow">→</span>
        </div>
        <div class="wfo-start-copy">
          <span class="wfo-kicker">Curso prático • Jogo 12</span>
          <h1 id="wfo-start-title">Organize o Windows</h1>
          <p>Aprenda a reconhecer arquivos e deixe sua Área de Trabalho organizada.</p>
          ${hasProgress ? '<p class="wfo-resume-note">Seu progresso neste Chromebook está pronto para continuar.</p>' : ""}
          ${this.fullscreenError ? `<p class="wfo-fullscreen-warning" role="alert">${escapeHtml(this.fullscreenError)}</p>` : ""}
          <button type="button" class="wfo-primary wfo-start-button" data-action="start">INICIAR ATIVIDADE <span aria-hidden="true">→</span></button>
          ${hasProgress ? '<button type="button" class="wfo-secondary" data-action="restart">RECOMEÇAR</button>' : ""}
        </div>
      </section>
    `;
  }

  renderPhase() {
    switch (this.state.phase) {
      case "intro": return this.renderIntro();
      case "connections": return this.renderConnections();
      case "drag-demo": return this.renderMediaLesson("drag");
      case "guided": return this.renderGuided();
      case "desktop-visible-intro": return this.renderDesktopIntro();
      case "desktop-visible": return this.renderDesktop(DESKTOP_LEVEL_WITH_EXTENSIONS, false);
      case "hidden-intro": return this.renderHiddenIntro();
      case "properties-demo": return this.renderMediaLesson("properties");
      case "desktop-hidden": return this.renderDesktop(DESKTOP_LEVEL_WITHOUT_EXTENSIONS, true);
      case "final": return this.renderFinal();
      default:
        this.state.phase = "intro";
        this.saveState();
        return this.renderIntro();
    }
  }

  renderIntro() {
    return `
      <section class="wfo-lesson-screen" aria-labelledby="wfo-intro-title">
        <header class="wfo-lesson-heading">
          <span class="wfo-kicker">Aprenda rápido</span>
          <h1 id="wfo-intro-title">A extensão mostra o tipo do arquivo</h1>
          <p>Ela aparece depois do ponto e ajuda o Windows a escolher o programa certo.</p>
        </header>
        <div class="wfo-extension-demo" aria-label="Exemplo: curriculo se transforma em curriculo ponto PDF">
          <span>curriculo</span><strong>.pdf</strong>
          <small>A extensão <b>.pdf</b> indica um documento PDF.</small>
        </div>
        <div class="wfo-type-grid">
          ${FILE_TYPES.map((type, index) => `
            <article class="wfo-type-card" style="--delay:${index * 45}ms">
              <img src="${type.icon}" alt="">
              <div><strong>${escapeHtml(type.sampleName)}</strong><span>${escapeHtml(type.title)} • ${escapeHtml(categoryById.get(type.category).label)}</span><p>${escapeHtml(type.explanation)}</p></div>
            </article>
          `).join("")}
        </div>
        <footer class="wfo-stage-actions"><button type="button" class="wfo-primary" data-action="intro-next">PRATICAR AS EXTENSÕES <span aria-hidden="true">→</span></button></footer>
      </section>
    `;
  }

  renderConnections() {
    const evaluation = this.feedback?.kind === "connections" ? this.feedback.evaluation : null;
    const allConnected = Object.keys(this.state.connections).length === CONNECTION_FILES.length;
    return `
      <section class="wfo-match-screen" aria-labelledby="wfo-match-title">
        <header class="wfo-compact-heading">
          <div><span class="wfo-kicker">Etapa 1</span><h1 id="wfo-match-title">Ligue os arquivos às categorias</h1><p>Arraste os pontos ou escolha um arquivo e depois uma categoria. A correção aparece somente no envio.</p></div>
          <div class="wfo-match-tools">
            <button type="button" class="wfo-secondary" data-action="undo-connection" ${this.connectionHistory.length ? "" : "disabled"}>↶ Desfazer</button>
            <button type="button" class="wfo-secondary" data-action="clear-connections" ${Object.keys(this.state.connections).length ? "" : "disabled"}>Limpar ligações</button>
          </div>
        </header>
        <div class="wfo-match-board">
          <svg class="wfo-lines" aria-hidden="true">
            ${Object.entries(this.state.connections).map(([fileId, categoryId]) => {
              const stateClass = evaluation ? (evaluation.results[fileId] ? "is-correct" : "is-wrong") : "";
              return `<g class="${stateClass}"><path class="wfo-line-hit" data-line-file="${fileId}"></path><path class="wfo-line ${stateClass}" data-line-file="${fileId}"></path>${evaluation?.results[fileId] ? '<text class="wfo-line-check">✓</text>' : ""}</g>`;
            }).join("")}
            <path class="wfo-temp-line" hidden></path>
          </svg>
          <div class="wfo-match-column wfo-files-column">
            <h2>Arquivos</h2>
            ${CONNECTION_FILES.map((file) => `
              <div class="wfo-match-item ${this.selectedConnectionFile === file.id ? "is-selected" : ""}">
                <button type="button" class="wfo-file-label" data-action="select-connection-file" data-file-id="${file.id}" ${evaluation ? "disabled" : ""}>
                  <img src="${file.icon}" alt=""><span>${escapeHtml(file.displayName)}</span>
                </button>
                <button type="button" class="wfo-source-dot" data-source-point="${file.id}" data-file-id="${file.id}" aria-label="Ligar ${escapeHtml(file.displayName)}" ${evaluation ? "disabled" : ""}></button>
              </div>
            `).join("")}
          </div>
          <div class="wfo-match-column wfo-categories-column">
            <h2>Categorias</h2>
            ${CATEGORIES.map((category) => `
              <button type="button" class="wfo-category-target" data-action="select-connection-category" data-category-id="${category.id}" ${evaluation ? "disabled" : ""}>
                <span class="wfo-target-dot" data-target-point="${category.id}"></span>
                <img src="${FOLDER_ICON}" alt=""><strong>${escapeHtml(category.label)}</strong>
              </button>
            `).join("")}
          </div>
        </div>
        <div class="wfo-feedback" aria-live="polite">
          ${evaluation ? `
            <strong>${evaluation.passed ? "Excelente!" : `Você acertou ${evaluation.correctCount} de ${evaluation.total}.`}</strong>
            <span>${evaluation.passed ? "Todas as extensões foram ligadas corretamente." : "Observe as extensões que ficaram incorretas e tente novamente."}</span>
          ` : '<span>Você pode refazer uma ligação ou clicar nela para removê-la.</span>'}
        </div>
        <footer class="wfo-stage-actions">
          ${evaluation?.passed
            ? '<button type="button" class="wfo-primary" data-action="connections-next">CONTINUAR <span aria-hidden="true">→</span></button>'
            : evaluation
              ? '<button type="button" class="wfo-primary" data-action="retry-connections">TENTAR NOVAMENTE</button>'
              : `<button type="button" class="wfo-primary" data-action="evaluate-connections" ${allConnected ? "" : "disabled"}>ENVIAR RESPOSTAS</button>`}
        </footer>
      </section>
    `;
  }

  renderMediaLesson(kind) {
    const dragLesson = kind === "drag";
    const media = dragLesson ? MEDIA.drag : MEDIA.properties;
    return `
      <section class="wfo-media-screen" aria-labelledby="wfo-media-title">
        <div class="wfo-media-copy">
          <span class="wfo-kicker">${dragLesson ? "Antes de praticar" : "Nova habilidade"}</span>
          <h1 id="wfo-media-title">${dragLesson ? "Como colocar um arquivo em uma pasta" : "Como descobrir um tipo oculto"}</h1>
          <p>${dragLesson
            ? "Clique e segure o arquivo, arraste até a pasta e solte quando ela ficar destacada."
            : "Clique com o botão direito no arquivo, escolha Propriedades e observe o campo Tipo de arquivo."}</p>
          ${!dragLesson ? '<div class="wfo-touchpad-tip"><span aria-hidden="true">☝☝</span><strong>No Chromebook</strong><p>Toque no touchpad com dois dedos para abrir o menu.</p></div>' : ""}
        </div>
        <div class="wfo-media">
          <video src="${media.video}" poster="${media.poster}" muted autoplay loop playsinline controls aria-label="${dragLesson ? "Demonstração de arrastar um arquivo para uma pasta" : "Demonstração de abrir as Propriedades de um arquivo"}"></video>
          <div class="wfo-media-fallback" aria-hidden="true">
            <span class="${dragLesson ? "is-drag-demo" : "is-properties-demo"}">🗎</span>
            <strong>${dragLesson ? "Arraste e solte" : "Botão direito → Propriedades"}</strong>
          </div>
        </div>
        <footer class="wfo-stage-actions">
          <button type="button" class="wfo-primary" data-action="${dragLesson ? "drag-demo-next" : "properties-demo-next"}">${dragLesson ? "COMEÇAR DESAFIOS" : "COMEÇAR DESAFIO FINAL"} <span aria-hidden="true">→</span></button>
        </footer>
      </section>
    `;
  }

  renderGuided() {
    const challenge = GUIDED_CHALLENGES[this.state.guidedIndex];
    const order = getGuidedFolderOrder(this.state.guidedIndex, this.state.runSeed, challenge.folderIds);
    const correct = this.feedback?.kind === "guided-correct";
    const wrong = this.feedback?.kind === "guided-wrong";
    return `
      <section class="wfo-guided-screen" aria-labelledby="wfo-guided-title">
        <header class="wfo-compact-heading">
          <div><span class="wfo-kicker">Etapa 2 • Desafio ${this.state.guidedIndex + 1} de ${GUIDED_CHALLENGES.length}</span><h1 id="wfo-guided-title">Coloque o arquivo na pasta correta</h1><p>Use o que você aprendeu sobre a extensão. A posição das pastas pode mudar.</p></div>
          <div class="wfo-mini-progress"><span style="width:${((this.state.guidedIndex + (correct ? 1 : 0)) / GUIDED_CHALLENGES.length) * 100}%"></span></div>
        </header>
        <div class="wfo-guided-desktop wfo-desktop-canvas">
          ${!this.state.guidedPlacement ? this.renderFile(challenge.file, false, "guided") : ""}
          <div class="wfo-guided-folders">
            ${order.map((categoryId) => {
              const category = categoryById.get(categoryId);
              const containsFile = this.state.guidedPlacement === categoryId;
              return `
                <button type="button" class="wfo-folder ${containsFile ? "has-file" : ""}" data-action="guided-folder" data-category-id="${category.id}">
                  <img src="${FOLDER_ICON}" alt=""><strong>${escapeHtml(category.label)}</strong>
                  ${containsFile ? `<span><img src="${challenge.file.icon}" alt="">1 arquivo</span>` : "<span>Vazia</span>"}
                </button>
              `;
            }).join("")}
          </div>
        </div>
        <div class="wfo-feedback ${correct ? "is-success" : wrong ? "is-error" : ""}" aria-live="polite">
          ${correct
            ? `<strong>Correto!</strong><span>${escapeHtml(challenge.file.realName)} pertence a ${escapeHtml(categoryById.get(challenge.file.category).label)}.</span>`
            : wrong
              ? "<strong>Ainda não.</strong><span>Observe novamente a extensão do arquivo e tente outra pasta.</span>"
              : "<span>Arraste o arquivo ou selecione-o e escolha uma pasta.</span>"}
        </div>
        <footer class="wfo-stage-actions">
          ${correct
            ? '<button type="button" class="wfo-primary" data-action="guided-next">PRÓXIMO <span aria-hidden="true">→</span></button>'
            : `<button type="button" class="wfo-primary" data-action="guided-submit" ${this.state.guidedPlacement ? "" : "disabled"}>ENVIAR</button>`}
        </footer>
      </section>
    `;
  }

  renderDesktopIntro() {
    return `
      <section class="wfo-transition-screen">
        <div class="wfo-transition-icon" aria-hidden="true"><img src="${FOLDER_ICON}" alt=""><span>20</span></div>
        <span class="wfo-kicker">Etapa 3</span>
        <h1>Agora é com você.</h1>
        <p>Organize toda a Área de Trabalho. Nesta etapa, as extensões estão visíveis e dão a pista de que você precisa.</p>
        <button type="button" class="wfo-primary" data-action="visible-intro-next">ORGANIZAR ÁREA DE TRABALHO <span aria-hidden="true">→</span></button>
      </section>
    `;
  }

  renderHiddenIntro() {
    return `
      <section class="wfo-transition-screen">
        <div class="wfo-hidden-name-demo" aria-label="O nome Currículo ponto PDF passa a aparecer somente como Currículo">
          <span>Currículo<del>.pdf</del></span><strong>Currículo</strong>
        </div>
        <span class="wfo-kicker">Prepare-se para a etapa final</span>
        <h1>Às vezes o Windows não mostra a extensão.</h1>
        <p>Quando o nome não entrega o tipo, você pode consultar as Propriedades do arquivo.</p>
        <button type="button" class="wfo-primary" data-action="hidden-intro-next">APRENDER A CONSULTAR <span aria-hidden="true">→</span></button>
      </section>
    `;
  }

  renderDesktop(files, hiddenNames) {
    const placements = hiddenNames ? this.state.hiddenPlacements : this.state.visiblePlacements;
    const counts = getFolderCounts(files, placements);
    const evaluation = this.desktopFeedback?.evaluation || null;
    const interactionHint = this.desktopFeedback?.hint || "";
    const desktopFiles = files.filter((file) => !placements[file.id]);
    const folderFiles = this.openedFolder ? files.filter((file) => placements[file.id] === this.openedFolder) : [];
    const stageNumber = hiddenNames ? 4 : 3;
    return `
      <section class="wfo-desktop-screen" aria-labelledby="wfo-desktop-title">
        <header class="wfo-desktop-heading">
          <div><span class="wfo-kicker">Etapa ${stageNumber}</span><h1 id="wfo-desktop-title">${hiddenNames ? "Desafio final: extensões ocultas" : "Organize a Área de Trabalho"}</h1></div>
          <p>${hiddenNames ? "Use botão direito → Propriedades para descobrir o tipo antes de mover." : "Arraste os arquivos para as pastas. Abra uma pasta com dois cliques."}</p>
        </header>
        <div class="wfo-desktop-layout">
          <div class="wfo-desktop-canvas" data-desktop-drop="true" aria-label="Área de Trabalho">
            <div class="wfo-wallpaper-shape one" aria-hidden="true"></div><div class="wfo-wallpaper-shape two" aria-hidden="true"></div>
            <div class="wfo-file-grid">
              ${desktopFiles.map((file) => this.renderFile(file, hiddenNames, "desktop", evaluation?.incorrectIds.includes(file.id))).join("")}
            </div>
            ${this.openedFolder ? `
              <section class="wfo-folder-window" role="dialog" aria-modal="false" aria-labelledby="wfo-folder-window-title">
                <header><img src="${FOLDER_ICON}" alt=""><strong id="wfo-folder-window-title">${escapeHtml(categoryById.get(this.openedFolder).label)}</strong><button type="button" data-action="close-folder" aria-label="Fechar pasta">✕</button></header>
                <div class="wfo-folder-window-toolbar"><button type="button" class="wfo-secondary" data-action="move-selected-desktop" ${this.selectedFile ? "" : "disabled"}>← Mover selecionado para a Área de Trabalho</button></div>
                <div class="wfo-folder-file-grid">
                  ${folderFiles.length ? folderFiles.map((file) => this.renderFile(file, hiddenNames, "folder")).join("") : "<p>Esta pasta está vazia.</p>"}
                </div>
              </section>
            ` : ""}
          </div>
          <aside class="wfo-folder-rail" aria-label="Pastas">
            ${CATEGORIES.map((category) => `
              <button type="button" class="wfo-folder ${evaluation?.folderCompletion[category.id] ? "is-complete" : ""}" data-folder-id="${category.id}" data-action="desktop-folder" data-category-id="${category.id}" aria-label="Pasta ${escapeHtml(category.label)}, ${counts[category.id]} arquivos">
                <span class="wfo-folder-check" aria-hidden="true">${evaluation?.folderCompletion[category.id] ? "✓" : ""}</span>
                <img src="${FOLDER_ICON}" alt=""><strong>${escapeHtml(category.label)}</strong><small>${counts[category.id]} ${counts[category.id] === 1 ? "arquivo" : "arquivos"}</small>
              </button>
            `).join("")}
          </aside>
        </div>
        <div class="wfo-desktop-footer">
          <div class="wfo-feedback ${evaluation?.passed ? "is-success" : evaluation ? "is-error" : ""}" aria-live="polite">
            ${interactionHint
              ? `<strong>Dica do touchpad</strong><span>${escapeHtml(interactionHint)}</span>`
              : evaluation
              ? `<strong>${evaluation.correctCount} de ${evaluation.total} arquivos estão organizados corretamente.</strong><span>${evaluation.passed ? "Área de Trabalho organizada!" : hiddenNames ? "Alguns arquivos ainda estão na pasta errada. Use Propriedades para conferir o tipo." : "Os arquivos incorretos voltaram para a Área de Trabalho. Tente novamente."}</span>`
              : `<span>${desktopFiles.length} arquivos ainda estão na Área de Trabalho.</span>`}
          </div>
          ${evaluation?.passed
            ? `<button type="button" class="wfo-primary" data-action="${hiddenNames ? "finish-course" : "visible-complete"}">${hiddenNames ? "VER RESULTADO" : "CONTINUAR"} <span aria-hidden="true">→</span></button>`
            : '<button type="button" class="wfo-primary" data-action="verify-desktop">VERIFICAR ORGANIZAÇÃO</button>'}
        </div>
        ${this.contextMenu ? this.renderContextMenu() : ""}
        ${this.propertiesFileId ? this.renderProperties(files, placements) : ""}
      </section>
    `;
  }

  renderFile(file, hiddenName, location, incorrect = false) {
    const selected = this.selectedFile === file.id;
    const safeLabel = hiddenName
      ? `Arquivo ${file.displayName}. Pressione Shift mais F10 para abrir o menu.`
      : `Arquivo ${file.displayName}`;
    return `
      <button type="button" class="wfo-file ${selected ? "is-selected" : ""} ${incorrect ? "is-incorrect" : ""}" data-action="select-file" data-file-id="${file.id}" data-location="${location}" aria-label="${escapeHtml(safeLabel)}">
        <span class="wfo-file-icon"><img src="${file.icon}" alt=""><i aria-hidden="true">${incorrect ? "!" : ""}</i></span>
        <span class="wfo-file-name">${escapeHtml(file.displayName)}</span>
      </button>
    `;
  }

  renderContextMenu() {
    return `
      <div class="wfo-context-menu" role="menu" aria-label="Menu do arquivo" style="left:${this.contextMenu.x}px;top:${this.contextMenu.y}px">
        <button type="button" role="menuitem" disabled>Abrir</button>
        <hr>
        <button type="button" role="menuitem" disabled>Recortar</button>
        <button type="button" role="menuitem" disabled>Copiar</button>
        <button type="button" role="menuitem" disabled>Renomear</button>
        <hr>
        <button type="button" role="menuitem" data-action="open-properties" data-file-id="${this.contextMenu.fileId}">Propriedades</button>
      </div>
    `;
  }

  renderProperties(files, placements) {
    const file = files.find((item) => item.id === this.propertiesFileId);
    if (!file) return "";
    const destination = placements[file.id];
    const location = destination ? categoryById.get(destination)?.label : "Área de Trabalho";
    return `
      <div class="wfo-modal-backdrop">
        <section class="wfo-properties" role="dialog" aria-modal="true" aria-labelledby="wfo-properties-title">
          <header><img src="${file.icon}" alt=""><strong id="wfo-properties-title">Propriedades de ${escapeHtml(file.displayName)}</strong><button type="button" data-action="close-properties" aria-label="Fechar Propriedades">✕</button></header>
          <div class="wfo-properties-body">
            <div class="wfo-property-file"><img src="${file.icon}" alt=""><strong>${escapeHtml(file.displayName)}</strong></div>
            <dl>
              <div class="is-highlighted"><dt>Tipo de arquivo:</dt><dd>${escapeHtml(file.fileTypeLabel)}</dd></div>
              <div><dt>Local:</dt><dd>${escapeHtml(location)}</dd></div>
              <div><dt>Tamanho:</dt><dd>${escapeHtml(file.sizeLabel)}</dd></div>
            </dl>
          </div>
          <footer><button type="button" class="wfo-primary" data-action="close-properties">OK</button></footer>
        </section>
      </div>
    `;
  }

  renderFinal() {
    return `
      <section class="wfo-final-screen" aria-labelledby="wfo-final-title">
        <div class="wfo-confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, index) => `<i style="--i:${index}"></i>`).join("")}</div>
        <span class="wfo-final-badge" aria-hidden="true">✓</span>
        <span class="wfo-kicker">Atividade concluída</span>
        <h1 id="wfo-final-title">Parabéns!</h1>
        <p>Você aprendeu a identificar e organizar arquivos no Windows.</p>
        <div class="wfo-competencies">
          ${["Extensões", "Mover arquivos", "Organizar pastas", "Usar Propriedades"].map((label) => `<div><span>✓</span><strong>${label}</strong><small>Concluído</small></div>`).join("")}
        </div>
        <div class="wfo-final-actions">
          <button type="button" class="wfo-primary" data-action="play-again">JOGAR NOVAMENTE</button>
          <a class="wfo-secondary" href="#/">VOLTAR À CENTRAL DE JOGOS</a>
        </div>
      </section>
    `;
  }

  handleClick(event) {
    if (Date.now() < this.suppressClickUntil) {
      event.preventDefault();
      return;
    }
    const line = event.target.closest("[data-line-file]");
    if (line && !this.feedback) {
      this.rememberConnections();
      this.state.connections = removeConnection(this.state.connections, line.dataset.lineFile);
      this.saveState();
      this.render();
      return;
    }
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement || actionElement.disabled) {
      if (this.contextMenu && !event.target.closest(".wfo-context-menu")) {
        this.contextMenu = null;
        this.render();
      }
      return;
    }
    const action = actionElement.dataset.action;
    const fileId = actionElement.dataset.fileId;
    const categoryId = actionElement.dataset.categoryId;
    const actions = {
      start: () => this.startActivity(false),
      restart: () => this.startActivity(true),
      fullscreen: () => this.toggleFullscreen(),
      "intro-next": () => this.setPhase("connections"),
      "undo-connection": () => this.undoConnections(),
      "clear-connections": () => this.clearConnections(),
      "select-connection-file": () => this.selectConnectionFile(fileId),
      "select-connection-category": () => this.connectSelected(categoryId),
      "evaluate-connections": () => this.evaluateConnectionStage(),
      "retry-connections": () => this.retryConnections(),
      "connections-next": () => this.setPhase("drag-demo"),
      "drag-demo-next": () => this.setPhase("guided"),
      "guided-folder": () => this.placeGuidedFile(categoryId),
      "guided-submit": () => this.evaluateGuided(),
      "guided-next": () => this.nextGuided(),
      "visible-intro-next": () => this.setPhase("desktop-visible"),
      "hidden-intro-next": () => this.setPhase("properties-demo"),
      "properties-demo-next": () => this.setPhase("desktop-hidden"),
      "select-file": () => this.selectFile(fileId),
      "desktop-folder": () => this.handleFolderClick(categoryId),
      "close-folder": () => this.closeFolder(),
      "move-selected-desktop": () => this.moveSelectedFile("desktop"),
      "verify-desktop": () => this.verifyDesktop(),
      "visible-complete": () => this.setPhase("hidden-intro"),
      "finish-course": () => this.setPhase("final"),
      "open-properties": () => this.openProperties(fileId),
      "close-properties": () => this.closeProperties(),
      "play-again": () => this.playAgain()
    };
    actions[action]?.();
  }

  startActivity(restart) {
    if (restart) {
      this.state = createInitialOrganizerState();
      this.resetTransientState();
      localStorage.removeItem(STORAGE_KEY);
    }
    const fullscreenPromise = this.root.requestFullscreen?.();
    if (fullscreenPromise?.catch) {
      fullscreenPromise.catch(() => {
        this.fullscreenError = "A tela cheia não foi liberada. A atividade continua funcionando; use o botão “Tela cheia” para tentar novamente.";
        this.announce(this.fullscreenError);
        this.render();
      });
    } else if (!this.root.requestFullscreen) {
      this.fullscreenError = "Este navegador não oferece tela cheia. A atividade continuará dentro da janela.";
    }
    this.launched = true;
    if (this.state.phase === "start" || this.state.phase === "final") this.state.phase = "intro";
    this.saveState();
    this.render();
  }

  playAgain() {
    this.state = createInitialOrganizerState();
    this.resetTransientState();
    this.launched = true;
    this.state.phase = "intro";
    this.saveState();
    this.render();
  }

  toggleFullscreen() {
    if (document.fullscreenElement === this.root) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (!this.root.requestFullscreen) {
      this.fullscreenError = "Este navegador não oferece tela cheia.";
      this.announce(this.fullscreenError);
      return;
    }
    this.fullscreenError = "";
    this.root.requestFullscreen().catch(() => {
      this.fullscreenError = "Não foi possível abrir em tela cheia. Continue na janela ou tente novamente.";
      this.announce(this.fullscreenError);
    });
  }

  handleFullscreenChange() {
    const button = this.root?.querySelector("[data-action='fullscreen'] span");
    if (button) button.textContent = document.fullscreenElement === this.root ? "Sair da tela cheia" : "Tela cheia";
  }

  rememberConnections() {
    this.connectionHistory.push({ ...this.state.connections });
    if (this.connectionHistory.length > 20) this.connectionHistory.shift();
  }

  selectConnectionFile(fileId) {
    if (this.feedback) return;
    this.selectedConnectionFile = this.selectedConnectionFile === fileId ? null : fileId;
    this.pendingFocusSelector = `[data-action="select-connection-file"][data-file-id="${fileId}"]`;
    this.render();
  }

  connectSelected(categoryId) {
    if (!this.selectedConnectionFile || this.feedback) {
      this.announce("Escolha primeiro um arquivo.");
      return;
    }
    this.connectFile(this.selectedConnectionFile, categoryId);
  }

  connectFile(fileId, categoryId) {
    this.rememberConnections();
    this.state.connections = connectFileToCategory(this.state.connections, fileId, categoryId);
    this.selectedConnectionFile = null;
    this.saveState();
    this.render();
  }

  clearConnections() {
    if (this.feedback) return;
    this.rememberConnections();
    this.state.connections = {};
    this.selectedConnectionFile = null;
    this.saveState();
    this.render();
  }

  undoConnections() {
    if (!this.connectionHistory.length || this.feedback) return;
    this.state.connections = this.connectionHistory.pop();
    this.selectedConnectionFile = null;
    this.saveState();
    this.render();
  }

  evaluateConnectionStage() {
    this.feedback = { kind: "connections", evaluation: evaluateConnections(this.state.connections) };
    this.render();
  }

  retryConnections() {
    this.state.connections = keepCorrectConnections(this.state.connections);
    this.feedback = null;
    this.connectionHistory = [];
    this.saveState();
    this.render();
  }

  placeGuidedFile(categoryId) {
    if (this.feedback?.kind === "guided-correct") return;
    const challenge = GUIDED_CHALLENGES[this.state.guidedIndex];
    if (!challenge.folderIds.includes(categoryId)) return;
    this.state.guidedPlacement = categoryId;
    this.feedback = null;
    this.selectedFile = null;
    this.saveState();
    this.render();
  }

  evaluateGuided() {
    const challenge = GUIDED_CHALLENGES[this.state.guidedIndex];
    if (!this.state.guidedPlacement) return;
    if (this.state.guidedPlacement === challenge.file.category) {
      this.feedback = { kind: "guided-correct" };
    } else {
      this.state.guidedPlacement = null;
      this.feedback = { kind: "guided-wrong" };
      this.saveState();
    }
    this.render();
  }

  nextGuided() {
    if (this.state.guidedIndex >= GUIDED_CHALLENGES.length - 1) {
      this.state.guidedPlacement = null;
      this.setPhase("desktop-visible-intro");
      return;
    }
    this.state.guidedIndex += 1;
    this.state.guidedPlacement = null;
    this.feedback = null;
    this.saveState();
    this.render();
  }

  currentDesktopContext() {
    const hidden = this.state.phase === "desktop-hidden";
    return {
      hidden,
      files: hidden ? DESKTOP_LEVEL_WITHOUT_EXTENSIONS : DESKTOP_LEVEL_WITH_EXTENSIONS,
      placementsKey: hidden ? "hiddenPlacements" : "visiblePlacements"
    };
  }

  selectFile(fileId) {
    if (!["desktop-visible", "desktop-hidden"].includes(this.state.phase) && this.state.phase !== "guided") return;
    if (this.state.phase === "guided") {
      this.selectedFile = this.selectedFile === fileId ? null : fileId;
      this.render();
      return;
    }
    this.selectedFile = this.selectedFile === fileId ? null : fileId;
    this.desktopFeedback = null;
    this.pendingFocusSelector = `[data-file-id="${fileId}"]`;
    this.render();
    this.announce(this.selectedFile ? "Arquivo selecionado. Escolha uma pasta." : "Seleção cancelada.");
  }

  handleFolderClick(categoryId) {
    if (this.selectedFile) this.moveSelectedFile(categoryId);
  }

  moveSelectedFile(destination) {
    if (!this.selectedFile) return;
    const { files, placementsKey } = this.currentDesktopContext();
    this.state[placementsKey] = moveOrganizerFile(this.state[placementsKey], files, this.selectedFile, destination);
    this.selectedFile = null;
    this.desktopFeedback = null;
    this.saveState();
    this.render();
  }

  handleDoubleClick(event) {
    const folder = event.target.closest("[data-folder-id]");
    if (!folder || !["desktop-visible", "desktop-hidden"].includes(this.state.phase)) return;
    this.openedFolder = folder.dataset.folderId;
    this.selectedFile = null;
    this.contextMenu = null;
    this.render();
  }

  closeFolder() {
    this.openedFolder = null;
    this.selectedFile = null;
    this.render();
  }

  verifyDesktop() {
    const { files, placementsKey } = this.currentDesktopContext();
    const evaluation = evaluateDesktop(files, this.state[placementsKey]);
    if (!evaluation.passed) {
      this.state[placementsKey] = removeIncorrectPlacements(files, this.state[placementsKey]);
      this.openedFolder = null;
      this.selectedFile = null;
      this.saveState();
    }
    this.desktopFeedback = { evaluation };
    this.render();
  }

  handleContextMenu(event) {
    if (this.state.phase !== "desktop-hidden") return;
    const file = event.target.closest(".wfo-file[data-file-id]");
    if (!file) return;
    event.preventDefault();
    this.openContextMenu(file.dataset.fileId, event.clientX, event.clientY);
  }

  openContextMenu(fileId, clientX, clientY) {
    if (this.state.phase !== "desktop-hidden") return;
    this.previousFocus = document.activeElement;
    this.returnFocusFileId = fileId;
    this.contextMenu = {
      fileId,
      x: Math.max(8, Math.min(clientX, window.innerWidth - 224)),
      y: Math.max(8, Math.min(clientY, window.innerHeight - 260))
    };
    if (!this.state.contextHintSeen) {
      this.state.contextHintSeen = true;
      this.saveState();
      this.desktopFeedback = {
        evaluation: null,
        hint: "No Chromebook, toque no touchpad com dois dedos para abrir este menu."
      };
    }
    this.pendingFocusSelector = ".wfo-context-menu [data-action='open-properties']";
    this.render();
  }

  openProperties(fileId) {
    this.propertiesFileId = fileId;
    this.contextMenu = null;
    this.pendingFocusSelector = "[data-action='close-properties']";
    this.render();
  }

  closeProperties() {
    this.propertiesFileId = null;
    this.pendingFocusSelector = this.returnFocusFileId ? `[data-file-id="${this.returnFocusFileId}"]` : null;
    this.render();
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      if (this.propertiesFileId) this.closeProperties();
      else if (this.contextMenu) { this.contextMenu = null; this.render(); }
      else if (this.openedFolder) this.closeFolder();
      return;
    }
    const file = event.target.closest(".wfo-file[data-file-id]");
    if (file && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
      event.preventDefault();
      const rect = file.getBoundingClientRect();
      this.openContextMenu(file.dataset.fileId, rect.left + 28, rect.top + 28);
      return;
    }
    if (file && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      this.selectFile(file.dataset.fileId);
      return;
    }
    const folder = event.target.closest("[data-folder-id]");
    if (folder && event.key === "Enter") {
      event.preventDefault();
      if (this.selectedFile) this.moveSelectedFile(folder.dataset.folderId);
      else {
        this.openedFolder = folder.dataset.folderId;
        this.render();
      }
    }
    if (this.state.phase === "connections" && event.key === "Delete" && this.selectedConnectionFile) {
      this.state.connections = removeConnection(this.state.connections, this.selectedConnectionFile);
      this.selectedConnectionFile = null;
      this.saveState();
      this.render();
    }
  }

  handlePointerDown(event) {
    if (event.button !== 0) return;
    const source = event.target.closest(".wfo-source-dot[data-file-id]");
    if (source && this.state.phase === "connections" && !this.feedback) {
      event.preventDefault();
      this.pointerDrag = { kind: "connection", pointerId: event.pointerId, fileId: source.dataset.fileId, startX: event.clientX, startY: event.clientY, moved: false };
      this.root.setPointerCapture?.(event.pointerId);
      this.updateTemporaryLine(event.clientX, event.clientY);
      return;
    }
    const file = event.target.closest(".wfo-file[data-file-id]");
    if (!file || !["guided", "desktop-visible", "desktop-hidden"].includes(this.state.phase)) return;
    this.pointerDrag = { kind: "file", pointerId: event.pointerId, fileId: file.dataset.fileId, startX: event.clientX, startY: event.clientY, moved: false };
    this.root.setPointerCapture?.(event.pointerId);
    if (this.state.phase === "desktop-hidden" && event.pointerType === "touch") {
      this.longPressTimer = window.setTimeout(() => {
        if (this.pointerDrag && !this.pointerDrag.moved) {
          this.openContextMenu(file.dataset.fileId, event.clientX, event.clientY);
          this.stopPointerInteraction();
          this.suppressClickUntil = Date.now() + 400;
        }
      }, 580);
    }
  }

  handlePointerMove(event) {
    if (!this.pointerDrag || this.pointerDrag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - this.pointerDrag.startX, event.clientY - this.pointerDrag.startY);
    if (distance > 7) {
      this.pointerDrag.moved = true;
      window.clearTimeout(this.longPressTimer);
      this.root.querySelector(`[data-file-id="${this.pointerDrag.fileId}"]`)?.classList.add("is-dragging");
    }
    if (this.pointerDrag.kind === "connection") this.updateTemporaryLine(event.clientX, event.clientY);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".wfo-folder");
    this.root.querySelectorAll(".wfo-folder.is-drop-target").forEach((folder) => folder.classList.remove("is-drop-target"));
    target?.classList.add("is-drop-target");
  }

  handlePointerUp(event) {
    if (!this.pointerDrag || this.pointerDrag.pointerId !== event.pointerId) return;
    const drag = this.pointerDrag;
    window.clearTimeout(this.longPressTimer);
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (drag.kind === "connection") {
      const categoryTarget = target?.closest(".wfo-category-target[data-category-id]");
      if (categoryTarget) this.connectFile(drag.fileId, categoryTarget.dataset.categoryId);
      else this.render();
      this.suppressClickUntil = Date.now() + 250;
    } else if (drag.moved) {
      const folder = target?.closest(".wfo-folder[data-category-id]");
      if (this.state.phase === "guided") {
        if (folder) this.placeGuidedFile(folder.dataset.categoryId);
      } else {
        const { files, placementsKey } = this.currentDesktopContext();
        const destination = folder?.dataset.categoryId || (target?.closest("[data-desktop-drop]") ? "desktop" : null);
        if (destination) {
          this.state[placementsKey] = moveOrganizerFile(this.state[placementsKey], files, drag.fileId, destination);
          this.selectedFile = null;
          this.desktopFeedback = null;
          this.saveState();
          this.render();
        }
      }
      this.suppressClickUntil = Date.now() + 250;
    }
    this.stopPointerInteraction();
  }

  stopPointerInteraction() {
    window.clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
    this.pointerDrag = null;
    this.root?.querySelectorAll(".is-dragging,.is-drop-target").forEach((element) => element.classList.remove("is-dragging", "is-drop-target"));
    const temp = this.root?.querySelector(".wfo-temp-line");
    if (temp) temp.hidden = true;
  }

  drawConnectionLines() {
    const board = this.root?.querySelector(".wfo-match-board");
    const svg = board?.querySelector(".wfo-lines");
    if (!board || !svg) return;
    const boardRect = board.getBoundingClientRect();
    for (const [fileId, categoryId] of Object.entries(this.state.connections)) {
      const source = board.querySelector(`[data-source-point="${fileId}"]`);
      const target = board.querySelector(`[data-target-point="${categoryId}"]`);
      const paths = board.querySelectorAll(`[data-line-file="${fileId}"]`);
      if (!source || !target) continue;
      const start = this.pointForElement(source, boardRect);
      const end = this.pointForElement(target, boardRect);
      const curve = this.connectionPath(start, end);
      paths.forEach((path) => path.setAttribute("d", curve));
      const check = paths[0]?.parentElement?.querySelector("text");
      if (check) {
        check.setAttribute("x", String(end.x - 20));
        check.setAttribute("y", String(end.y - 8));
      }
    }
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.drawConnectionLines());
      this.resizeObserver.observe(board);
    }
  }

  updateTemporaryLine(clientX, clientY) {
    const board = this.root?.querySelector(".wfo-match-board");
    const path = board?.querySelector(".wfo-temp-line");
    const source = board?.querySelector(`[data-source-point="${this.pointerDrag?.fileId}"]`);
    if (!board || !path || !source) return;
    const boardRect = board.getBoundingClientRect();
    const start = this.pointForElement(source, boardRect);
    const end = { x: clientX - boardRect.left, y: clientY - boardRect.top };
    path.setAttribute("d", this.connectionPath(start, end));
    path.hidden = false;
  }

  pointForElement(element, parentRect) {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - parentRect.left, y: rect.top + rect.height / 2 - parentRect.top };
  }

  connectionPath(start, end) {
    const bend = Math.max(40, Math.abs(end.x - start.x) * 0.42);
    return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`;
  }

  disconnectResizeObserver() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  restoreFocus() {
    if (!this.pendingFocusSelector) return;
    this.root.querySelector(this.pendingFocusSelector)?.focus();
    this.pendingFocusSelector = null;
  }

  announce(message) {
    const live = this.root?.querySelector(".wfo-live");
    if (!live) return;
    live.textContent = "";
    window.requestAnimationFrame(() => { live.textContent = message; });
  }
}

export const windowsFileOrganizerGame = new WindowsFileOrganizerGame();

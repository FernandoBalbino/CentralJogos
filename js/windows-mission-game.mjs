import * as THREE from "../vendor/three/three.module.min.js";
import { windowsMissions } from "./windows-mission-data.mjs";
import {
  WINDOWS_MISSION_STATE_VERSION,
  completeMission,
  createMissionOrder,
  evaluateMissionOrder,
  getFirstIncompleteMissionIndex,
  isMissionUnlocked,
  moveMissionAction,
  sanitizeSavedMissionState
} from "./windows-mission-core.mjs";

const STORAGE_KEY = "centralJogos.windowsMission.progress.v1";

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);

const iconPath = (name) => `./assets/side-game/icons/${name}.svg`;
const icon = (name, className = "") => `<img class="${className}" src="${iconPath(name)}" alt="">`;

class WindowsMissionGame {
  constructor() {
    this.root = null;
    this.active = false;
    this.state = this.loadState();
    this.order = createMissionOrder(this.currentMission());
    this.feedback = null;
    this.hintOpen = false;
    this.selectedIndex = null;
    this.dragIndex = null;
    this.lessonSeconds = 45;
    this.lessonTimer = null;
    this.animationFrame = null;
    this.resizeObserver = null;
    this.renderer = null;
    this.scene = null;
    this.sceneGroup = null;
    this.workstationGroups = [];
    this.pointerTarget = { x: 0, y: 0 };
    this.offlineHandler = (event) => this.updateOfflineStatus(event.detail);
  }

  mount(root) {
    this.root = root;
    this.root.innerHTML = "";
  }

  enter() {
    if (!this.root) return;
    this.active = true;
    document.body.classList.add("windows-mission-active");
    document.addEventListener("central-offline-status", this.offlineHandler);
    this.render();
  }

  leave() {
    this.active = false;
    document.body.classList.remove("windows-mission-active");
    document.removeEventListener("central-offline-status", this.offlineHandler);
    this.stopLessonTimer();
    this.disposeScene();
  }

  currentMission() {
    return windowsMissions[this.state.missionIndex] || windowsMissions[0];
  }

  loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed?.version !== WINDOWS_MISSION_STATE_VERSION) {
        return sanitizeSavedMissionState({}, windowsMissions);
      }
      return sanitizeSavedMissionState(parsed, windowsMissions);
    } catch {
      return sanitizeSavedMissionState({}, windowsMissions);
    }
  }

  saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  resetMissionView() {
    this.order = createMissionOrder(this.currentMission());
    this.feedback = null;
    this.hintOpen = false;
    this.selectedIndex = null;
    this.dragIndex = null;
    this.lessonSeconds = 45;
  }

  render() {
    if (!this.root || !this.active) return;
    this.stopLessonTimer();
    this.disposeScene();
    const mission = this.currentMission();
    const completed = new Set(this.state.completedIds);
    const allComplete = this.state.completedIds.length === windowsMissions.length;

    this.root.innerHTML = `
      <div class="wm-shell">
        <header class="wm-topbar">
          <a class="wm-brand" href="#/" aria-label="Voltar para a Central de Jogos">
            <span class="wm-brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <span><strong>Central de Jogos</strong><small>Fundamentos de Informática</small></span>
          </a>
          <nav class="wm-progress" aria-label="Progresso das missões">
            <strong>MISSÃO ${this.state.missionIndex + 1} DE ${windowsMissions.length}</strong>
            <span class="wm-progress-dots">
              ${windowsMissions.map((item, index) => {
                const unlocked = isMissionUnlocked(index, this.state.completedIds, windowsMissions);
                const classes = [index === this.state.missionIndex ? "is-current" : "", completed.has(item.id) ? "is-complete" : ""].filter(Boolean).join(" ");
                return `<button type="button" class="${classes}" data-mission-index="${index}" ${unlocked ? "" : "disabled"} aria-label="${unlocked ? `Abrir missão ${index + 1}: ${escapeHtml(item.shortTitle)}` : `Missão ${index + 1} bloqueada`}"><span>${index + 1}</span></button>`;
              }).join("")}
            </span>
          </nav>
          <div class="wm-toolbar">
            <span class="wm-offline-status" data-offline-state="${document.documentElement.dataset.offlineState || "preparing"}">
              ${icon("wifi")}<span>${this.offlineLabel()}</span>
            </span>
            <button class="wm-icon-button" type="button" data-action="fullscreen" aria-label="Alternar tela cheia">${icon("fullscreen")}</button>
          </div>
        </header>

        <main class="wm-workspace">
          <section class="wm-scene-column" aria-labelledby="wm-ticket-title">
            <article class="wm-ticket">
              <span class="wm-ticket-icon">${icon("description")}</span>
              <div><h1 id="wm-ticket-title">CHAMADO ${mission.number} — ${escapeHtml(mission.title)}</h1><p>${escapeHtml(mission.message)}</p></div>
            </article>
            <div class="wm-scene" data-active-station="${mission.station}">
              <img class="wm-scene-poster" src="./assets/windows-mission/tecnico-em-acao-card.png" alt="Laboratório de informática em estilo 3D com três computadores">
              <canvas class="wm-three-layer" aria-hidden="true"></canvas>
              <span class="wm-station wm-station-one ${mission.station === 0 ? "is-active" : ""}">01</span>
              <span class="wm-station wm-station-two ${mission.station === 1 ? "is-active" : ""}">02</span>
              <span class="wm-station wm-station-three ${mission.station === 2 ? "is-active" : ""}">03</span>
              <p class="wm-speech">${escapeHtml(mission.message)}</p>
              <div class="wm-scene-caption"><strong>TÉCNICO EM AÇÃO 3D</strong><span>Observe o chamado, monte o plano e veja o atendimento acontecer.</span></div>
            </div>
          </section>

          <aside class="wm-panel" aria-label="Plano do atendimento">
            <section class="wm-lesson">
              <header><strong>APRENDA RÁPIDO</strong><span class="wm-lesson-clock">${icon("timer")}<b>00:45</b></span></header>
              <p>${escapeHtml(mission.lesson.lead)}</p>
              <div class="wm-lesson-path">
                ${mission.lesson.path.map((step, index) => `<div><span>${icon(step.icon)}</span><small>${escapeHtml(step.label)}</small></div>${index < mission.lesson.path.length - 1 ? `<i>${icon("arrow_forward")}</i>` : ""}`).join("")}
              </div>
            </section>

            <section class="wm-actions-section">
              <header><strong>AÇÕES — ARRASTE PARA ORDENAR</strong><small>ou use as setas</small></header>
              <div class="wm-action-list" role="list" aria-label="Ações disponíveis"></div>
            </section>

            <section class="wm-plan" aria-live="polite">
              <strong>PLANO DE ATENDIMENTO</strong>
              <div>${this.order.map((_, index) => `<span>${index + 1}</span>${index < this.order.length - 1 ? icon("arrow_forward") : ""}`).join("")}</div>
            </section>

            <div class="wm-feedback-region" aria-live="polite"></div>
            <button class="wm-primary-action" type="button" data-action="evaluate">${icon("play_arrow")}<span>ATENDER CHAMADO</span></button>
            <button class="wm-hint-button" type="button" data-action="hint">${icon("visibility")}<span>Dica</span></button>
            <div class="wm-hint" ${this.hintOpen ? "" : "hidden"}><strong>Como fazer</strong><p>${escapeHtml(mission.hint)}</p></div>
            ${allComplete ? `<p class="wm-complete-note">Todas as seis missões já foram concluídas. Você pode refazê-las quando quiser.</p>` : ""}
          </aside>
        </main>
        <div class="wm-live-region" aria-live="assertive"></div>
      </div>
    `;

    this.bindEvents();
    this.renderActionList();
    this.renderFeedback();
    this.initScene();
    this.startLessonTimer();
  }

  bindEvents() {
    this.root.querySelectorAll("[data-mission-index]").forEach((button) => {
      button.addEventListener("click", () => this.goToMission(Number(button.dataset.missionIndex)));
    });
    this.root.querySelector("[data-action='fullscreen']").addEventListener("click", () => this.toggleFullscreen());
    this.root.querySelector("[data-action='evaluate']").addEventListener("click", () => this.evaluate());
    this.root.querySelector("[data-action='hint']").addEventListener("click", () => this.toggleHint());
  }

  renderActionList() {
    const list = this.root?.querySelector(".wm-action-list");
    if (!list) return;
    const mission = this.currentMission();
    const actionById = new Map(mission.actions.map((action) => [action.id, action]));
    const result = this.feedback?.type === "error" ? this.feedback.result : null;
    list.innerHTML = this.order.map((actionId, index) => {
      const action = actionById.get(actionId);
      const isCorrect = result?.correctPositions.has(index);
      return `
        <article class="wm-action-row ${this.selectedIndex === index ? "is-selected" : ""} ${isCorrect ? "is-correct" : ""}" role="listitem" draggable="true" data-action-index="${index}" tabindex="0" aria-label="Passo ${index + 1}: ${escapeHtml(action.label)}">
          <span class="wm-action-icon">${icon(action.icon)}</span>
          <button class="wm-action-select" type="button" data-action="select" aria-label="Selecionar passo ${index + 1}"><span>${escapeHtml(action.label)}</span></button>
          <span class="wm-action-move">
            <button type="button" data-action="move-up" ${index === 0 ? "disabled" : ""} aria-label="Mover ${escapeHtml(action.label)} para cima">${icon("arrow_downward", "is-up")}</button>
            <button type="button" data-action="move-down" ${index === this.order.length - 1 ? "disabled" : ""} aria-label="Mover ${escapeHtml(action.label)} para baixo">${icon("arrow_downward")}</button>
          </span>
          <span class="wm-drag-handle" aria-hidden="true">${icon("apps")}</span>
        </article>
      `;
    }).join("");

    list.querySelectorAll("[data-action-index]").forEach((row) => {
      const index = Number(row.dataset.actionIndex);
      row.querySelector("[data-action='select']").addEventListener("click", () => this.selectAction(index));
      row.querySelector("[data-action='move-up']").addEventListener("click", () => this.moveAction(index, index - 1));
      row.querySelector("[data-action='move-down']").addEventListener("click", () => this.moveAction(index, index + 1));
      row.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp") { event.preventDefault(); this.moveAction(index, index - 1); }
        if (event.key === "ArrowDown") { event.preventDefault(); this.moveAction(index, index + 1); }
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); this.selectAction(index); }
      });
      row.addEventListener("dragstart", (event) => {
        this.dragIndex = index;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
        row.classList.add("is-dragging");
      });
      row.addEventListener("dragend", () => { this.dragIndex = null; row.classList.remove("is-dragging"); });
      row.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; });
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        const fromIndex = Number(event.dataTransfer.getData("text/plain"));
        this.moveAction(fromIndex, index);
      });
    });
  }

  selectAction(index) {
    if (this.selectedIndex === null) {
      this.selectedIndex = index;
      this.announce(`Passo ${index + 1} selecionado. Escolha outra posição.`);
    } else if (this.selectedIndex === index) {
      this.selectedIndex = null;
    } else {
      const fromIndex = this.selectedIndex;
      this.selectedIndex = null;
      this.moveAction(fromIndex, index);
      return;
    }
    this.renderActionList();
  }

  moveAction(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= this.order.length) return;
    this.order = moveMissionAction(this.order, fromIndex, toIndex);
    this.feedback = null;
    this.selectedIndex = null;
    this.renderActionList();
    this.renderFeedback();
    this.announce(`Ação movida para a posição ${toIndex + 1}.`);
  }

  evaluate() {
    const mission = this.currentMission();
    const result = evaluateMissionOrder(mission, this.order);
    this.state.attempts += 1;
    if (result.passed) {
      this.state.completedIds = completeMission(this.state.completedIds, mission.id, windowsMissions);
      this.feedback = { type: "success", result };
      this.syncProgressButtons();
      this.setActiveStationComplete();
      this.announce(mission.success);
    } else {
      this.feedback = { type: "error", result };
      this.announce(`${result.correctCount} de ${result.total} ações estão na posição correta.`);
    }
    this.saveState();
    this.renderActionList();
    this.renderFeedback();
  }

  renderFeedback() {
    const region = this.root?.querySelector(".wm-feedback-region");
    if (!region) return;
    if (!this.feedback) {
      region.innerHTML = "";
      return;
    }
    const mission = this.currentMission();
    if (this.feedback.type === "error") {
      const { correctCount, total } = this.feedback.result;
      region.innerHTML = `<div class="wm-feedback is-error"><strong>Quase lá!</strong><p>${correctCount} de ${total} ações estão no lugar certo. Ajuste a ordem e tente novamente.</p></div>`;
      return;
    }
    const hasNext = this.state.missionIndex < windowsMissions.length - 1;
    region.innerHTML = `
      <div class="wm-feedback is-success">
        ${icon("check_circle")}
        <div><strong>Chamado resolvido!</strong><p>${escapeHtml(mission.success)}</p></div>
        ${hasNext ? `<button type="button" data-action="next-mission">Próxima missão ${icon("arrow_forward")}</button>` : `<button type="button" data-action="review-missions">Rever missões ${icon("restart_alt")}</button>`}
      </div>
    `;
    const nextButton = region.querySelector("[data-action='next-mission']");
    if (nextButton) nextButton.addEventListener("click", () => this.goToMission(this.state.missionIndex + 1));
    const reviewButton = region.querySelector("[data-action='review-missions']");
    if (reviewButton) reviewButton.addEventListener("click", () => this.goToMission(0));
  }

  syncProgressButtons() {
    const completed = new Set(this.state.completedIds);
    this.root?.querySelectorAll("[data-mission-index]").forEach((button) => {
      const index = Number(button.dataset.missionIndex);
      const mission = windowsMissions[index];
      const unlocked = isMissionUnlocked(index, this.state.completedIds, windowsMissions);
      button.disabled = !unlocked;
      button.classList.toggle("is-complete", completed.has(mission.id));
      button.setAttribute("aria-label", unlocked
        ? `Abrir missão ${index + 1}: ${mission.shortTitle}`
        : `Missão ${index + 1} bloqueada`);
    });
  }

  toggleHint() {
    this.hintOpen = !this.hintOpen;
    const hint = this.root.querySelector(".wm-hint");
    hint.hidden = !this.hintOpen;
    this.root.querySelector("[data-action='hint'] span").textContent = this.hintOpen ? "Ocultar dica" : "Dica";
    if (this.hintOpen) this.announce(this.currentMission().hint);
  }

  goToMission(index) {
    if (!isMissionUnlocked(index, this.state.completedIds, windowsMissions)) {
      this.announce("Conclua a missão anterior para liberar esta etapa.");
      return;
    }
    this.state.missionIndex = index;
    this.saveState();
    this.resetMissionView();
    this.render();
  }

  offlineLabel() {
    const state = document.documentElement.dataset.offlineState;
    if (state === "ready") return "Disponível offline";
    if (state === "error") return "Offline indisponível";
    return "Preparando offline";
  }

  updateOfflineStatus(detail = {}) {
    const badge = this.root?.querySelector(".wm-offline-status");
    if (!badge) return;
    const state = detail.state || document.documentElement.dataset.offlineState || "preparing";
    badge.dataset.offlineState = state;
    const label = badge.querySelector("span");
    if (label) label.textContent = detail.label || this.offlineLabel();
  }

  startLessonTimer() {
    this.stopLessonTimer();
    const update = () => {
      const label = this.root?.querySelector(".wm-lesson-clock b");
      if (!label) return;
      label.textContent = this.lessonSeconds > 0 ? `00:${String(this.lessonSeconds).padStart(2, "0")}` : "PRONTO";
    };
    update();
    this.lessonTimer = window.setInterval(() => {
      if (!this.active || this.lessonSeconds <= 0) {
        this.stopLessonTimer();
        return;
      }
      this.lessonSeconds -= 1;
      update();
    }, 1000);
  }

  stopLessonTimer() {
    if (this.lessonTimer) window.clearInterval(this.lessonTimer);
    this.lessonTimer = null;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) this.root.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  announce(message) {
    const region = this.root?.querySelector(".wm-live-region");
    if (!region) return;
    region.textContent = "";
    requestAnimationFrame(() => { region.textContent = message; });
  }

  initScene() {
    const canvas = this.root?.querySelector(".wm-three-layer");
    const container = this.root?.querySelector(".wm-scene");
    if (!canvas || !container) return;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = false;
      this.scene = new THREE.Scene();
      this.sceneGroup = new THREE.Group();
      this.scene.add(this.sceneGroup);

      const camera = new THREE.OrthographicCamera(-6, 6, 3.5, -3.5, 0.1, 100);
      camera.position.set(0, 3.2, 10);
      camera.lookAt(0, 0, 0);
      this.camera = camera;

      const ambient = new THREE.AmbientLight(0xffffff, 1.8);
      const keyLight = new THREE.DirectionalLight(0xffddaa, 2.2);
      keyLight.position.set(-4, 6, 8);
      this.scene.add(ambient, keyLight);

      const positions = [-3, 0, 3];
      this.workstationGroups = positions.map((x, index) => this.createWorkstationMarker(x, index));
      this.workstationGroups.forEach((group) => this.sceneGroup.add(group));
      this.sceneGroup.position.set(0, -.32, 0);

      const pointerMove = (event) => {
        const bounds = container.getBoundingClientRect();
        this.pointerTarget.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.08;
        this.pointerTarget.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.04;
      };
      container.addEventListener("pointermove", pointerMove);
      this.scenePointerCleanup = () => container.removeEventListener("pointermove", pointerMove);

      this.resizeObserver = new ResizeObserver(() => this.resizeScene());
      this.resizeObserver.observe(container);
      this.resizeScene();
      this.animateScene();
    } catch {
      canvas.hidden = true;
      container.classList.add("is-webgl-fallback");
    }
  }

  createWorkstationMarker(x, index) {
    const group = new THREE.Group();
    group.position.x = x;
    const active = index === this.currentMission().station;
    const completed = this.state.completedIds.includes(this.currentMission().id) && active;
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x172d49, roughness: 0.58, metalness: 0.12 });
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: completed ? 0x29a365 : active ? 0x1fd1cc : 0x2379ca,
      emissive: completed ? 0x116b42 : active ? 0x087f82 : 0x0a2745,
      emissiveIntensity: active ? 2.2 : 0.55,
      roughness: 0.36
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.35, 0.2), frameMaterial);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.83, 1.05, 0.13), screenMaterial);
    screen.position.z = 0.15;
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.16), frameMaterial);
    stem.position.y = -0.92;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.13, 0.45), frameMaterial);
    base.position.y = -1.24;
    const ringMaterial = new THREE.MeshBasicMaterial({ color: active ? 0x38fff5 : 0xffffff, transparent: true, opacity: active ? 0.65 : 0.06 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.045, 8, 48), ringMaterial);
    ring.position.z = -0.03;
    group.add(frame, screen, stem, base, ring);
    group.userData = { active, screenMaterial, ringMaterial, ring };
    group.scale.setScalar(active ? .43 : .28);
    return group;
  }

  animateScene() {
    if (!this.active || !this.renderer || !this.scene || !this.camera) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderFrame = (time = 0) => {
      if (!this.active || !this.renderer) return;
      this.sceneGroup.rotation.y += (this.pointerTarget.x - this.sceneGroup.rotation.y) * 0.06;
      this.sceneGroup.rotation.x += (-this.pointerTarget.y - this.sceneGroup.rotation.x) * 0.06;
      this.workstationGroups.forEach((group, index) => {
        if (!group.userData.active) return;
        const pulse = reduceMotion ? 1 : 1 + Math.sin(time * 0.0035) * 0.045;
        group.userData.ring.scale.setScalar(pulse);
        group.userData.ringMaterial.opacity = reduceMotion ? 0.62 : 0.52 + Math.sin(time * 0.0035) * 0.18;
        group.position.y = reduceMotion ? 0 : Math.sin(time * 0.0018 + index) * 0.07;
      });
      this.renderer.render(this.scene, this.camera);
      this.animationFrame = requestAnimationFrame(renderFrame);
    };
    renderFrame();
  }

  resizeScene() {
    const container = this.root?.querySelector(".wm-scene");
    if (!container || !this.renderer || !this.camera) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const aspect = width / height;
    const viewHeight = 6.4;
    this.camera.left = -(viewHeight * aspect) / 2;
    this.camera.right = (viewHeight * aspect) / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setActiveStationComplete() {
    const active = this.workstationGroups.find((group) => group.userData.active);
    if (!active) return;
    active.userData.screenMaterial.color.setHex(0x29a365);
    active.userData.screenMaterial.emissive.setHex(0x116b42);
    active.userData.ringMaterial.color.setHex(0x65ffad);
  }

  disposeScene() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.scenePointerCleanup?.();
    this.scenePointerCleanup = null;
    if (this.scene) {
      this.scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      });
    }
    this.renderer?.dispose?.();
    this.renderer = null;
    this.scene = null;
    this.sceneGroup = null;
    this.workstationGroups = [];
  }
}

export const windowsMissionGame = new WindowsMissionGame();

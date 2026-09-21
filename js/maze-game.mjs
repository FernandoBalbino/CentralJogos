import {
  INITIAL_FREE_TIME,
  MAZE_TILE_SIZE,
  advanceEventClock,
  advanceTimer,
  applyMeteorPenalty,
  applyCorrectAnswer,
  applyWrongAnswer,
  canRestartChallenge,
  completeMaze,
  createChallengeDeck,
  createGameState,
  createPowerChests,
  createPrizeTrail,
  createSeededRandom,
  createVirusClones,
  createVirusState,
  findShortestPath,
  formatClock,
  freeTimeForStreak,
  generateMaze,
  getWalkableCells,
  movePlayer,
  pickRandomEvent,
  pickPowerChoices,
  positionToCell,
  reachedExit,
  resumeAfterChallenge,
  slowVirusAfterCatch,
  takeNextChallenge,
  teleportPlayer,
  shuffleValues
} from "./maze-game-core.mjs";
import { mazeChallenges, mazeEvents, mazePowers } from "./maze-game-data.mjs";
import { MazeRenderer } from "./maze-game-renderer.mjs";
import { ChallengeManager } from "./maze-game-challenges.mjs";

const SOUND_KEY = "centralJogos.maze.sound.v1";
const TUTORIAL_KEY = "centralJogos.maze.tutorial.v1";
const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]);

class MazeGame {
  constructor() {
    this.root = null;
    this.active = false;
    this.launched = false;
    this.maze = null;
    this.state = null;
    this.renderer = null;
    this.challengeManager = null;
    this.challengeDeck = [];
    this.keys = new Set();
    this.virtualDirection = null;
    this.animationFrame = null;
    this.lastFrame = null;
    this.lastHudSecond = null;
    this.lastStepSound = 0;
    this.resumeTimer = null;
    this.audioContext = null;
    this.eventRandom = Math.random;
    this.powerChoices = [];
    this.seerPath = [];
    this.toastTimer = null;
    this.virusAlertTimer = null;
    this.eventBannerTimer = null;
    this.meteorCounter = 0;
    this.soundEnabled = localStorage.getItem(SOUND_KEY) !== "off";
    this.currentSeed = null;
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);
  }

  mount(root) {
    this.root = root;
    root.addEventListener("click", this.handleClick);
    root.addEventListener("pointerdown", this.handlePointerDown);
    root.addEventListener("pointerup", this.handlePointerUp);
    root.addEventListener("pointercancel", this.handlePointerUp);
    root.addEventListener("pointerleave", this.handlePointerUp);
  }

  enter() {
    if (!this.root) return;
    this.active = true;
    this.launched = false;
    this.renderStart();
  }

  leave() {
    this.active = false;
    this.launched = false;
    this.keys.clear();
    this.virtualDirection = null;
    window.clearTimeout(this.resumeTimer);
    window.clearTimeout(this.toastTimer);
    window.clearTimeout(this.virusAlertTimer);
    window.clearTimeout(this.eventBannerTimer);
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.lastFrame = null;
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("resize", this.handleResize);
    document.body.classList.remove("maze-game-active");
  }

  renderStart() {
    document.body.classList.remove("maze-game-active");
    this.root.innerHTML = `
      <section class="maze-start-screen" aria-labelledby="maze-start-title">
        <a class="maze-back-link" href="#/">← Voltar para os jogos</a>
        <div class="maze-start-art" aria-hidden="true">
          <span class="maze-art-wall wall-a"></span><span class="maze-art-wall wall-b"></span><span class="maze-art-wall wall-c"></span>
          <span class="maze-start-character"></span>
          <span class="maze-start-exit"></span>
          <span class="maze-start-path"></span>
        </div>
        <div class="maze-start-copy">
          <span class="maze-kicker">Jogo 13 • Missão de informática</span>
          <h1 id="maze-start-title">LABIRINTO DA<br><em>INFORMÁTICA</em></h1>
          <p>Encontre a saída antes que seu tempo acabe. Quando o cronômetro zerar, resolva um desafio de informática para continuar explorando.</p>
          <div class="maze-streak-explainer" aria-label="Tempo ganho por acertos consecutivos">
            <span><b>1º</b><strong>20s</strong></span><i>→</i><span><b>2º seguido</b><strong>30s</strong></span><i>→</i><span><b>3º</b><strong>40s</strong></span><i>→</i><span><b>4º</b><strong>50s</strong></span>
          </div>
          <button type="button" class="maze-primary-button" data-maze-action="start">INICIAR MISSÃO <span aria-hidden="true">→</span></button>
          <div class="maze-start-controls"><span>⌨️ Use as setas para andar</span><span>WASD também funciona</span><button type="button" data-maze-action="toggle-sound">${this.soundEnabled ? "🔊 Som ligado" : "🔇 Som desligado"}</button></div>
        </div>
      </section>
    `;
  }

  startGame({ newMaze = true } = {}) {
    if (newMaze || !this.currentSeed) this.currentSeed = `${Date.now()}-${Math.random()}`;
    this.maze = generateMaze({ seed: this.currentSeed });
    const now = performance.now();
    this.eventRandom = createSeededRandom(`${this.currentSeed}:eventos`);
    this.state = createGameState({ maze: this.maze, now, random: this.eventRandom });
    this.challengeDeck = createChallengeDeck(mazeChallenges);
    this.powerChoices = [];
    this.seerPath = [];
    this.launched = true;
    this.keys.clear();
    this.virtualDirection = null;
    this.lastFrame = null;
    this.lastHudSecond = null;
    document.body.classList.add("maze-game-active");
    this.renderGameShell();
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("resize", this.handleResize);
    const tutorialSeen = localStorage.getItem(TUTORIAL_KEY) === "seen";
    if (!tutorialSeen) {
      this.state = { ...this.state, gamePaused: true, phase: "tutorial" };
      this.showTutorial();
    }
    this.updateHud(true);
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = requestAnimationFrame(this.loop);
    this.ensureAudio();
  }

  renderGameShell() {
    this.root.innerHTML = `
      <div class="maze-game-shell">
        <header class="maze-game-topbar">
          <a href="#/" class="maze-game-brand" aria-label="Sair e voltar para a Central de Jogos"><span class="maze-brand-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span><strong>Labirinto da Informática</strong><small>Encontre a saída</small></span></a>
          <div class="maze-game-tools"><button type="button" data-maze-action="toggle-sound">${this.soundEnabled ? "🔊 Som ligado" : "🔇 Som desligado"}</button><button type="button" data-maze-action="fullscreen">⛶ Tela cheia</button></div>
        </header>
        <main class="maze-play-layout">
          <section class="maze-viewport" aria-label="Labirinto jogável">
            <canvas class="maze-canvas" aria-label="Labirinto. Use as setas do teclado para mover o personagem até a saída."></canvas>
            <div class="maze-location-chip"><span aria-hidden="true">⌖</span><strong>LABORATÓRIO DIGITAL</strong></div>
            <div class="maze-tutorial" hidden></div>
            <div class="maze-challenge-layer" hidden><div class="maze-challenge-host"></div></div>
            <div class="maze-power-layer" hidden></div>
            <div class="maze-victory-layer" hidden></div>
            <div class="maze-virus-alert" role="status" aria-live="assertive" hidden></div>
            <div class="maze-power-toast" role="status" aria-live="polite" hidden></div>
            <div class="maze-event-banner" role="status" aria-live="polite" hidden></div>
            <div class="maze-dpad" aria-label="Controles de movimento">
              <button type="button" data-direction="up" aria-label="Mover para cima">▲</button>
              <button type="button" data-direction="left" aria-label="Mover para esquerda">◀</button>
              <button type="button" data-direction="down" aria-label="Mover para baixo">▼</button>
              <button type="button" data-direction="right" aria-label="Mover para direita">▶</button>
            </div>
          </section>
          <aside class="maze-hud" aria-label="Informações da missão">
            <div class="maze-hud-objective"><span>OBJETIVO</span><strong>Encontre a saída!</strong><p>Explore os corredores e guarde o caminho na memória.</p></div>
            <div class="maze-time-card"><span>Tempo para explorar</span><strong data-maze-time>${formatClock(INITIAL_FREE_TIME)}</strong><div class="maze-time-track"><i data-maze-time-bar></i></div></div>
            <div class="maze-streak-card"><span>Sequência de acertos</span><strong><b aria-hidden="true">🔥</b> <i data-maze-streak>0</i></strong><p data-maze-next>Primeiro acerto: 20s</p></div>
            <div class="maze-power-status-card"><span>PODERES E AMEAÇAS</span><strong data-maze-virus-status>Vírus à espreita</strong><p data-maze-power-status>Nenhum poder ativo.</p></div>
            <div class="maze-controls-card"><span>COMO ANDAR</span><div><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></div><small>Segure uma seta para continuar andando.</small></div>
            <div class="maze-status-card" aria-live="polite"><span class="maze-status-dot"></span><strong data-maze-status>Explorando</strong><small data-maze-status-detail>O relógio está correndo.</small></div>
          </aside>
        </main>
      </div>
    `;
    this.renderer = new MazeRenderer(this.root.querySelector(".maze-canvas"));
    this.challengeManager = new ChallengeManager({
      onCorrect: () => this.handleCorrectAnswer(),
      onWrong: () => this.handleWrongAnswer(),
      onRestart: (password) => this.restartChallenge(password),
      playSound: (kind) => this.playSound(kind)
    });
    this.challengeManager.mount(this.root.querySelector(".maze-challenge-host"));
  }

  showTutorial() {
    const tutorial = this.root.querySelector(".maze-tutorial");
    tutorial.hidden = false;
    tutorial.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="maze-tutorial-title">
        <span class="maze-kicker">Tutorial rápido</span><h2 id="maze-tutorial-title">Sua missão em 4 passos</h2>
        <ol><li><b>1</b><span><strong>Use as setas</strong> para mover o personagem.</span></li><li><b>2</b><span><strong>Quando o tempo zerar,</strong> resolva um desafio.</span></li><li><b>3</b><span><strong>Acertos seguidos</strong> liberam cada vez mais tempo.</span></li><li><b>4</b><span><strong>Encontre a saída</strong> para concluir o labirinto.</span></li></ol>
        <button type="button" class="maze-primary-button" data-maze-action="close-tutorial">ENTENDI, VAMOS LÁ!</button>
      </section>
    `;
    requestAnimationFrame(() => tutorial.querySelector("button")?.focus());
  }

  closeTutorial() {
    localStorage.setItem(TUTORIAL_KEY, "seen");
    const tutorial = this.root.querySelector(".maze-tutorial");
    tutorial.hidden = true;
    this.state = { ...this.state, gamePaused: false, phase: "playing" };
    this.lastFrame = performance.now();
    this.updateHud(true);
  }

  loop(timestamp) {
    if (!this.active || !this.launched || !this.state) return;
    const deltaSeconds = this.lastFrame === null ? 0 : Math.min(0.1, (timestamp - this.lastFrame) / 1000);
    this.lastFrame = timestamp;
    if (!this.state.gamePaused && this.state.phase === "playing") {
      const input = this.getMovementInput();
      const playerSpeed = timestamp < this.state.activeEffects.speedUntil ? 296 : undefined;
      this.state = {
        ...this.state,
        playerPosition: movePlayer({ maze: this.maze, position: this.state.playerPosition, input, deltaSeconds, speed: playerSpeed })
      };
      if (this.state.playerPosition.moving && timestamp - this.lastStepSound > 270) {
        this.lastStepSound = timestamp;
        this.playSound("step");
      }
      const eventClock = advanceEventClock(this.state, deltaSeconds);
      this.state = eventClock.state;
      if (eventClock.due) this.triggerRandomEvent(timestamp);
      this.updateActiveEvent(timestamp, deltaSeconds);
      this.updateVirus(timestamp, deltaSeconds);
      this.checkPrizeBitPickup();
      if (this.state.phase === "challenge") {
        this.openChallenge();
      } else {
        const chestOpened = this.checkChestPickup();
        if (!chestOpened && reachedExit(this.state.playerPosition, this.maze)) {
        this.finishMaze(timestamp);
        } else if (!chestOpened && this.state.phase === "playing") {
          this.state = advanceTimer(this.state, deltaSeconds);
          if (this.state.phase === "challenge") this.openChallenge();
        }
      }
    }
    this.renderer?.draw(this.maze, this.state.playerPosition, timestamp, {
      virus: this.state.virus,
      virusFrozen: timestamp < this.state.activeEffects.frozenUntil || this.state.activeEvent?.id === "onda-antivirus",
      eventViruses: this.state.eventViruses,
      chests: this.state.chests,
      meteors: this.state.meteors,
      prizeBits: this.state.prizeBits,
      activeEvent: this.state.activeEvent,
      seerPath: timestamp < this.state.activeEffects.seerUntil ? this.seerPath : [],
      playerShielded: this.state.activeEffects.shieldCharges > 0,
      showCompass: timestamp < this.state.activeEffects.compassUntil
    });
    this.updateHud();
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  getMovementInput() {
    const left = this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A") || this.virtualDirection === "left";
    const right = this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D") || this.virtualDirection === "right";
    const up = this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has("W") || this.virtualDirection === "up";
    const down = this.keys.has("ArrowDown") || this.keys.has("s") || this.keys.has("S") || this.virtualDirection === "down";
    return { x: Number(right) - Number(left), y: Number(down) - Number(up) };
  }

  advanceVirus(virusState, timestamp, deltaSeconds, alwaysChasing = false) {
    let virus = { ...virusState };
    const effects = this.state.activeEffects;
    if (virus.respawnAt && timestamp >= virus.respawnAt) {
      const respawned = createVirusState(this.maze, {
        random: this.eventRandom,
        playerPosition: this.state.playerPosition,
        now: timestamp
      });
      virus = {
        ...respawned,
        id: virus.id,
        caughtCount: virus.caughtCount,
        speed: virus.speed,
        temporary: virus.temporary,
        sprinting: alwaysChasing,
        sprintEndsAt: alwaysChasing ? Number.POSITIVE_INFINITY : respawned.sprintEndsAt
      };
    }
    if (virus.respawnAt > timestamp) return virus;
    const frozenByEvent = this.state.activeEvent?.id === "onda-antivirus";
    if (timestamp < effects.frozenUntil || frozenByEvent || timestamp < effects.invisibleUntil) {
      return { ...virus, moving: false };
    }
    if (alwaysChasing) {
      virus.sprinting = true;
      virus.sprintEndsAt = Number.POSITIVE_INFINITY;
    } else if (!virus.sprinting && timestamp >= virus.nextSprintAt) {
      virus.sprinting = true;
      virus.sprintEndsAt = timestamp + 5000;
      virus.pathRefreshAt = 0;
      this.showToast("⚠️ Corrida do vírus!", "Ele encontrou sua trilha. Continue andando!");
      this.playSound("virus");
    }
    if (!alwaysChasing && virus.sprinting && timestamp >= virus.sprintEndsAt) {
      virus.sprinting = false;
      virus.moving = false;
      virus.nextSprintAt = timestamp + 6500 + this.eventRandom() * 6500;
    }
    if (virus.sprinting) {
      if (timestamp >= virus.pathRefreshAt || !virus.path.length) {
        virus.path = findShortestPath(
          this.maze,
          positionToCell(virus),
          positionToCell(this.state.playerPosition)
        );
        virus.pathRefreshAt = timestamp + 320;
      }
      const currentCell = positionToCell(virus);
      if (virus.path[0]?.x === currentCell.x && virus.path[0]?.y === currentCell.y) virus.path.shift();
      const target = virus.path[0];
      if (target) {
        const targetX = (target.x + 0.5) * MAZE_TILE_SIZE;
        const targetY = (target.y + 0.5) * MAZE_TILE_SIZE;
        const differenceX = targetX - virus.x;
        const differenceY = targetY - virus.y;
        const magnitude = Math.hypot(differenceX, differenceY) || 1;
        const moved = movePlayer({
          maze: this.maze,
          position: virus,
          input: { x: differenceX / magnitude, y: differenceY / magnitude },
          deltaSeconds,
          speed: virus.speed,
          radius: 9
        });
        virus = { ...virus, ...moved };
      }
    }
    return virus;
  }

  updateVirus(timestamp, deltaSeconds) {
    const effects = this.state.activeEffects;
    const virus = this.advanceVirus(this.state.virus, timestamp, deltaSeconds, false);
    const eventViruses = this.state.eventViruses.map((candidate) => (
      this.advanceVirus(candidate, timestamp, deltaSeconds, true)
    ));
    this.state = { ...this.state, virus, eventViruses };
    if (timestamp < this.state.collisionImmuneUntil) return;
    const collision = [virus, ...eventViruses].find((candidate) => (
      candidate.respawnAt <= timestamp
      && Math.hypot(candidate.x - this.state.playerPosition.x, candidate.y - this.state.playerPosition.y) <= 23
    ));
    if (collision) {
      const temporary = Boolean(collision.temporary);
      if (effects.shieldCharges > 0) {
        const repel = (candidate) => candidate.id === collision.id
          ? { ...candidate, sprinting: false, moving: false, respawnAt: timestamp + 3000 }
          : candidate;
        this.state = {
          ...this.state,
          activeEffects: { ...effects, shieldCharges: effects.shieldCharges - 1 },
          collisionImmuneUntil: timestamp + 1500,
          virus: temporary ? virus : repel(virus),
          eventViruses: temporary ? eventViruses.map(repel) : eventViruses
        };
        this.showToast("🛡️ Escudo ativado!", "O vírus foi repelido e não conseguiu capturar você.");
        this.playSound("correct");
      } else {
        this.handleVirusCatch(timestamp, collision);
      }
    }
  }

  handleVirusCatch(timestamp, sourceVirus = this.state.virus) {
    const slowedVirus = slowVirusAfterCatch(sourceVirus);
    const temporary = Boolean(sourceVirus.temporary);
    const playerPosition = teleportPlayer(this.maze, this.eventRandom, [positionToCell(sourceVirus)]);
    const updateCaughtVirus = (candidate) => candidate.id === sourceVirus.id
      ? {
        ...slowedVirus,
        sprinting: false,
        moving: false,
        respawnAt: timestamp + 3200,
        nextSprintAt: timestamp + 8000
      }
      : candidate;
    this.state = {
      ...this.state,
      playerPosition,
      collisionImmuneUntil: timestamp + 1500,
      virus: temporary ? this.state.virus : updateCaughtVirus(this.state.virus),
      eventViruses: temporary ? this.state.eventViruses.map(updateCaughtVirus) : this.state.eventViruses
    };
    this.showVirusAlert(slowedVirus.caughtCount);
    this.playSound("caught");
    this.updateHud(true);
  }

  showVirusAlert(caughtCount) {
    const alert = this.root.querySelector(".maze-virus-alert");
    if (!alert) return;
    alert.innerHTML = `<strong>O VÍRUS PEGOU VOCÊ!</strong><span>Você foi teleportado. O vírus ficou mais lento${caughtCount > 1 ? " novamente" : ""}.</span>`;
    alert.hidden = false;
    window.clearTimeout(this.virusAlertTimer);
    this.virusAlertTimer = window.setTimeout(() => { alert.hidden = true; }, 2800);
  }

  showToast(title, message) {
    const toast = this.root.querySelector(".maze-power-toast");
    if (!toast) return;
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    toast.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3000);
  }

  showEventBanner(event) {
    const banner = this.root.querySelector(".maze-event-banner");
    if (!banner || !event) return;
    banner.className = `maze-event-banner is-${event.kind}`;
    banner.setAttribute("aria-live", event.kind === "threat" ? "assertive" : "polite");
    banner.innerHTML = `
      <span class="maze-event-icon" style="${this.iconStyle(event.icon)}" aria-hidden="true"></span>
      <span><small>${event.kind === "threat" ? "EVENTO DE ALERTA" : "EVENTO FAVORÁVEL"}</small><strong>${event.name}</strong><b>${event.description}</b></span>
    `;
    banner.hidden = false;
    window.clearTimeout(this.eventBannerTimer);
    this.eventBannerTimer = window.setTimeout(() => { banner.hidden = true; }, 3600);
  }

  triggerRandomEvent(timestamp, forcedId = null) {
    if (!this.state || this.state.phase !== "playing") return null;
    const event = forcedId
      ? mazeEvents.find((candidate) => candidate.id === forcedId)
      : pickRandomEvent(mazeEvents, this.state.lastEventId, this.eventRandom);
    if (!event) return null;
    let chests = this.state.chests;
    let eventViruses = [];
    let virus = { ...this.state.virus };
    let activeEffects = { ...this.state.activeEffects };
    let remainingTime = this.state.remainingTime;
    let currentFreeTime = this.state.currentFreeTime;
    const activeEvent = {
      ...event,
      elapsed: 0,
      remaining: event.duration,
      nextWaveIn: 0,
      wavesCreated: 0
    };
    if (event.id === "virus-multiplicado") {
      eventViruses = createVirusClones(this.maze, {
        count: 3,
        random: this.eventRandom,
        playerPosition: this.state.playerPosition,
        now: timestamp,
        existingViruses: [virus]
      });
    }
    if (event.id === "chuva-baus") {
      const bonus = createPowerChests(this.maze, { count: 2, random: this.eventRandom, existing: chests });
      chests = [...chests, ...bonus];
      if (bonus.length < 2) {
        remainingTime += 15;
        currentFreeTime = Math.max(currentFreeTime, remainingTime);
      }
    }
    if (event.id === "onda-antivirus") {
      virus = { ...virus, sprinting: false, moving: false, nextSprintAt: timestamp + 12000 };
    }
    this.state = {
      ...this.state,
      activeEvent,
      lastEventId: event.id,
      eventViruses,
      meteors: [],
      chests,
      virus,
      activeEffects,
      remainingTime,
      currentFreeTime
    };
    this.showEventBanner(event);
    this.playSound(event.kind === "threat" ? "event-danger" : "event-help");
    this.updateHud(true);
    return event;
  }

  createMeteorWave() {
    const playerCell = positionToCell(this.state.playerPosition);
    const candidates = shuffleValues(getWalkableCells(this.maze).filter((cell) => {
      const distance = Math.hypot(cell.x - playerCell.x, cell.y - playerCell.y);
      return distance >= 2 && distance <= 10
        && !(cell.x === this.maze.start.x && cell.y === this.maze.start.y)
        && !(cell.x === this.maze.exit.x && cell.y === this.maze.exit.y);
    }), this.eventRandom);
    return candidates.slice(0, 3).map((cell) => ({
      id: `meteoro-${this.meteorCounter += 1}`,
      ...cell,
      age: 0,
      hitApplied: false
    }));
  }

  updateActiveEvent(timestamp, deltaSeconds) {
    let prizeTrailRemaining = Math.max(0, this.state.prizeTrailRemaining - deltaSeconds);
    let prizeBits = this.state.prizeBits;
    if (this.state.prizeTrailRemaining > 0 && prizeTrailRemaining === 0) prizeBits = [];
    this.state = { ...this.state, prizeTrailRemaining, prizeBits };
    const event = this.state.activeEvent;
    if (!event) return;
    let activeEvent = {
      ...event,
      elapsed: event.elapsed + deltaSeconds,
      remaining: Math.max(0, event.remaining - deltaSeconds)
    };
    let meteors = this.state.meteors;
    let meteorHits = 0;
    if (event.id === "chuva-meteoros") {
      let nextWaveIn = activeEvent.nextWaveIn - deltaSeconds;
      let wavesCreated = activeEvent.wavesCreated;
      while (wavesCreated < 5 && nextWaveIn <= 0) {
        meteors = [...meteors, ...this.createMeteorWave()];
        wavesCreated += 1;
        nextWaveIn += 2.4;
      }
      activeEvent = { ...activeEvent, nextWaveIn, wavesCreated };
      meteors = meteors.map((meteor) => {
        const age = meteor.age + deltaSeconds;
        let hitApplied = meteor.hitApplied;
        if (!hitApplied && meteor.age < 1.2 && age >= 1.2) {
          const impactX = (meteor.x + 0.5) * MAZE_TILE_SIZE;
          const impactY = (meteor.y + 0.5) * MAZE_TILE_SIZE;
          if (Math.hypot(impactX - this.state.playerPosition.x, impactY - this.state.playerPosition.y) <= 22) meteorHits += 1;
          hitApplied = true;
        }
        return { ...meteor, age, hitApplied };
      }).filter((meteor) => meteor.age < 1.8);
    }
    this.state = { ...this.state, activeEvent, meteors };
    if (meteorHits) {
      for (let index = 0; index < meteorHits; index += 1) this.state = applyMeteorPenalty(this.state);
      const shell = this.root.querySelector(".maze-game-shell");
      shell?.classList.add("is-meteor-hit");
      window.setTimeout(() => shell?.classList.remove("is-meteor-hit"), 340);
      this.showToast("☄️ Meteoro atingiu!", `${meteorHits * 3} segundos foram descontados.`);
      this.playSound("caught");
    }
    if (activeEvent.remaining === 0) this.endActiveEvent();
  }

  endActiveEvent() {
    if (!this.state?.activeEvent) return;
    const eventId = this.state.activeEvent.id;
    this.state = {
      ...this.state,
      activeEvent: null,
      eventViruses: eventId === "virus-multiplicado" ? [] : this.state.eventViruses,
      meteors: eventId === "chuva-meteoros" ? [] : this.state.meteors
    };
  }

  clearTransientEvents() {
    if (!this.state) return;
    this.state = { ...this.state, activeEvent: null, eventViruses: [], meteors: [] };
    const banner = this.root.querySelector(".maze-event-banner");
    if (banner) banner.hidden = true;
    window.clearTimeout(this.eventBannerTimer);
  }

  checkPrizeBitPickup() {
    const bit = this.state.prizeBits.find((candidate) => (
      !candidate.collected
      && Math.hypot(
        this.state.playerPosition.x - (candidate.x + 0.5) * MAZE_TILE_SIZE,
        this.state.playerPosition.y - (candidate.y + 0.5) * MAZE_TILE_SIZE
      ) <= 20
    ));
    if (!bit) return false;
    const remainingTime = this.state.remainingTime + 2;
    this.state = {
      ...this.state,
      remainingTime,
      currentFreeTime: Math.max(this.state.currentFreeTime, remainingTime),
      prizeBits: this.state.prizeBits.map((candidate) => candidate.id === bit.id ? { ...candidate, collected: true } : candidate)
    };
    this.showToast("◆ Bit premiado", "+2 segundos no cronômetro.");
    this.playSound("power");
    return true;
  }

  checkChestPickup() {
    const chest = this.state.chests.find((candidate) => (
      !candidate.opened
      && Math.hypot(
        this.state.playerPosition.x - (candidate.x + 0.5) * MAZE_TILE_SIZE,
        this.state.playerPosition.y - (candidate.y + 0.5) * MAZE_TILE_SIZE
      ) <= 20
    ));
    if (!chest) return false;
    this.state = {
      ...this.state,
      gamePaused: true,
      phase: "power-choice",
      chests: this.state.chests.map((candidate) => candidate.id === chest.id ? { ...candidate, opened: true } : candidate)
    };
    this.keys.clear();
    this.virtualDirection = null;
    this.openPowerChoice();
    return true;
  }

  iconStyle(icon) {
    const sheets = {
      base: "./assets/maze-game/virus-power-atlas.png",
      "luck-event": "./assets/maze-game/maze-luck-event-atlas.png"
    };
    const column = icon.index % icon.columns;
    const row = Math.floor(icon.index / icon.columns);
    const x = icon.columns > 1 ? column * (100 / (icon.columns - 1)) : 0;
    const y = icon.rows > 1 ? row * (100 / (icon.rows - 1)) : 0;
    return `background-image:url('${sheets[icon.sheet]}');background-size:${icon.columns * 100}% ${icon.rows * 100}%;background-position:${x}% ${y}%`;
  }

  openPowerChoice() {
    this.powerChoices = pickPowerChoices(mazePowers, this.eventRandom, 4);
    const layer = this.root.querySelector(".maze-power-layer");
    layer.hidden = false;
    this.root.querySelector(".maze-game-shell")?.classList.add("is-power-open");
    layer.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="maze-power-title">
        <span class="maze-kicker">Baú encontrado!</span>
        <h2 id="maze-power-title">ESCOLHA 1 DE 4 PODERES</h2>
        <p>Veja o efeito de cada poder e escolha qual deles você quer usar agora.</p>
        <div class="maze-power-options">
          ${this.powerChoices.map((power) => `
            <button type="button" data-power-id="${power.id}">
              <span class="maze-power-icon" style="${this.iconStyle(power.icon)}" aria-hidden="true"></span>
              <strong>${power.name}</strong>
              <small>${power.description}</small>
              <b>ESCOLHER ESTE</b>
            </button>
          `).join("")}
        </div>
      </section>
    `;
    requestAnimationFrame(() => layer.querySelector("button")?.focus());
    this.playSound("chest");
    this.updateHud(true);
  }

  applyPower(powerId) {
    const power = this.powerChoices.find((candidate) => candidate.id === powerId);
    if (!power || this.state.phase !== "power-choice") return;
    const now = performance.now();
    let activeEffects = { ...this.state.activeEffects };
    let virus = { ...this.state.virus };
    let playerPosition = this.state.playerPosition;
    let remainingTime = this.state.remainingTime;
    let currentFreeTime = this.state.currentFreeTime;
    let chests = this.state.chests;
    let prizeBits = this.state.prizeBits;
    let prizeTrailRemaining = this.state.prizeTrailRemaining;
    let outcome = power.description;
    const addTime = (seconds) => {
      remainingTime += seconds;
      currentFreeTime = Math.max(currentFreeTime, remainingTime);
    };
    const applyEffect = (effectId) => {
      if (effectId === "escudo") activeEffects.shieldCharges += 1;
      if (effectId === "turbo") activeEffects.speedUntil = Math.max(activeEffects.speedUntil, now + 10000);
      if (effectId === "antivirus") virus = { ...virus, sprinting: false, moving: false, respawnAt: now + 4500 };
      if (effectId === "vidente") {
        activeEffects.seerUntil = Math.max(activeEffects.seerUntil, now + 5000);
        this.seerPath = findShortestPath(this.maze, positionToCell(playerPosition));
      }
      if (effectId === "tempo") addTime(15);
      if (effectId === "congelar") activeEffects.frozenUntil = Math.max(activeEffects.frozenUntil, now + 8000);
      if (effectId === "teleporte") {
        const path = findShortestPath(this.maze, positionToCell(playerPosition));
        const destination = path[Math.min(14, Math.max(1, path.length - 2))];
        if (destination) playerPosition = { x: (destination.x + 0.5) * MAZE_TILE_SIZE, y: (destination.y + 0.5) * MAZE_TILE_SIZE, direction: "down", moving: false };
      }
      if (effectId === "invisibilidade") activeEffects.invisibleUntil = Math.max(activeEffects.invisibleUntil, now + 8000);
      if (effectId === "bussola") activeEffects.compassUntil = Math.max(activeEffects.compassUntil, now + 10000);
      if (effectId === "lentidao") virus.speed = Math.max(72, virus.speed * 0.72);
    };
    if (!power.lucky) applyEffect(power.id);
    if (power.id === "dado-tempo") {
      const award = [10, 20, 30][Math.floor(this.eventRandom() * 3)];
      addTime(award);
      outcome = `A sorte concedeu ${award} segundos extras!`;
    }
    if (power.id === "salto-sorte") {
      const steps = 12 + Math.floor(this.eventRandom() * 19);
      const path = findShortestPath(this.maze, positionToCell(playerPosition));
      const destinationIndex = Math.min(steps, Math.max(1, path.length - 2));
      const destination = path[destinationIndex];
      if (destination) playerPosition = { x: (destination.x + 0.5) * MAZE_TILE_SIZE, y: (destination.y + 0.5) * MAZE_TILE_SIZE, direction: "down", moving: false };
      outcome = `Você avançou ${destinationIndex} corredores na direção da saída.`;
    }
    if (power.id === "bau-duplicador") {
      const bonus = createPowerChests(this.maze, { count: 2, random: this.eventRandom, existing: chests });
      chests = [...chests, ...bonus];
      if (bonus.length < 2) addTime(15);
      outcome = bonus.length === 2 ? "Dois novos baús apareceram no labirinto." : "Sem espaço para novos baús: você ganhou 15 segundos.";
    }
    if (power.id === "combo-surpresa") {
      const safeIds = new Set(["escudo", "turbo", "vidente", "congelar", "invisibilidade", "bussola", "lentidao"]);
      const combo = pickPowerChoices(mazePowers.filter((candidate) => safeIds.has(candidate.id)), this.eventRandom, 2);
      combo.forEach((candidate) => applyEffect(candidate.id));
      outcome = `Combo ativado: ${combo.map((candidate) => candidate.name).join(" + ")}.`;
    }
    if (power.id === "trilha-premiada") {
      prizeBits = createPrizeTrail(this.maze, playerPosition, { count: 5 });
      prizeTrailRemaining = 20;
      if (!prizeBits.length) addTime(10);
      outcome = prizeBits.length ? "Colete os cinco bits em até 20 segundos ativos." : "Você já estava perto da saída e ganhou 10 segundos.";
    }
    if (!virus.sprinting && virus.respawnAt <= now) virus.nextSprintAt = Math.max(virus.nextSprintAt, now + 2500);
    this.state = {
      ...this.state,
      activeEffects,
      virus,
      playerPosition,
      remainingTime,
      currentFreeTime,
      chests,
      prizeBits,
      prizeTrailRemaining,
      gamePaused: false,
      phase: "playing"
    };
    const layer = this.root.querySelector(".maze-power-layer");
    layer.hidden = true;
    layer.innerHTML = "";
    this.root.querySelector(".maze-game-shell")?.classList.remove("is-power-open");
    this.lastFrame = now;
    this.playSound("power");
    this.showToast(`✨ ${power.name}`, outcome);
    this.updateHud(true);
    this.root.querySelector(".maze-canvas")?.focus();
  }

  openChallenge() {
    this.keys.clear();
    this.virtualDirection = null;
    this.clearTransientEvents();
    const selection = takeNextChallenge({
      deck: this.challengeDeck,
      challenges: mazeChallenges,
      lastChallengeId: this.state.lastChallengeId
    });
    this.challengeDeck = selection.deck;
    this.state = { ...this.state, lastChallengeId: selection.challenge.id, gamePaused: true, phase: "challenge" };
    this.root.querySelector(".maze-game-shell")?.classList.add("is-challenge-open");
    const layer = this.root.querySelector(".maze-challenge-layer");
    layer.hidden = false;
    this.challengeManager.show(selection.challenge);
    this.playSound("challenge");
    this.updateHud(true);
  }

  handleCorrectAnswer() {
    this.state = applyCorrectAnswer(this.state);
    this.updateHud(true);
    window.clearTimeout(this.resumeTimer);
    const award = this.state.currentFreeTime;
    this.resumeTimer = window.setTimeout(() => {
      if (!this.active || !this.launched || this.state.phase !== "challenge-success") return;
      this.challengeManager.hide();
      this.root.querySelector(".maze-challenge-layer").hidden = true;
      this.root.querySelector(".maze-game-shell")?.classList.remove("is-challenge-open");
      this.state = { ...this.state, gamePaused: false, phase: "playing", remainingTime: award };
      this.lastFrame = performance.now();
      this.updateHud(true);
      this.root.querySelector(".maze-canvas")?.focus();
    }, window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 350 : 700);
    return `Você ganhou ${award} segundos para explorar! ${this.state.correctStreak > 1 ? `${this.state.correctStreak} acertos seguidos.` : "Sua sequência começou."}`;
  }

  handleWrongAnswer() {
    this.state = applyWrongAnswer(this.state);
    this.updateHud(true);
  }

  restartChallenge(password) {
    if (!canRestartChallenge(password)) return false;
    window.clearTimeout(this.resumeTimer);
    this.challengeManager.hide();
    const layer = this.root.querySelector(".maze-challenge-layer");
    layer.hidden = true;
    this.root.querySelector(".maze-game-shell")?.classList.remove("is-challenge-open");
    this.state = resumeAfterChallenge(this.state, 30);
    this.keys.clear();
    this.virtualDirection = null;
    this.lastFrame = performance.now();
    this.showToast("↻ Fluxo reiniciado", "O desafio foi fechado e você ganhou 30 segundos para continuar.");
    this.updateHud(true);
    this.root.querySelector(".maze-canvas")?.focus();
    return true;
  }

  finishMaze(timestamp) {
    if (this.state.mazeCompleted) return;
    this.clearTransientEvents();
    this.state = completeMaze(this.state, timestamp);
    this.keys.clear();
    this.virtualDirection = null;
    this.playSound("victory");
    this.renderVictory();
    this.updateHud(true);
  }

  renderVictory() {
    const layer = this.root.querySelector(".maze-victory-layer");
    const totalSeconds = (this.state.completedAt - this.state.startedAt) / 1000;
    layer.hidden = false;
    layer.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="maze-victory-title">
        <div class="maze-victory-rays" aria-hidden="true"></div><span class="maze-victory-icon" aria-hidden="true">🚪</span>
        <span class="maze-kicker">Missão cumprida</span><h2 id="maze-victory-title">LABIRINTO CONCLUÍDO!</h2><p>Você conseguiu encontrar a saída!</p>
        <dl><div><dt>Tempo total</dt><dd>${formatClock(totalSeconds)}</dd></div><div><dt>Desafios respondidos</dt><dd>${this.state.questionsAnswered}</dd></div><div><dt>Maior sequência</dt><dd>${this.state.highestStreak}</dd></div><div><dt>Erros</dt><dd>${this.state.wrongAnswers}</dd></div></dl>
        <div class="maze-victory-actions"><button type="button" class="maze-primary-button" data-maze-action="play-again">JOGAR NOVAMENTE</button><button type="button" class="maze-secondary-button" data-maze-action="new-maze">GERAR NOVO LABIRINTO</button><a href="#/">Voltar à Central</a></div>
      </section>
    `;
    requestAnimationFrame(() => layer.querySelector("button")?.focus());
  }

  updateHud(force = false) {
    if (!this.state || !this.launched) return;
    const second = Math.ceil(this.state.remainingTime);
    if (!force && second === this.lastHudSecond) return;
    this.lastHudSecond = second;
    const time = this.root.querySelector("[data-maze-time]");
    const bar = this.root.querySelector("[data-maze-time-bar]");
    const timeCard = this.root.querySelector(".maze-time-card");
    const streak = this.root.querySelector("[data-maze-streak]");
    const next = this.root.querySelector("[data-maze-next]");
    const status = this.root.querySelector("[data-maze-status]");
    const detail = this.root.querySelector("[data-maze-status-detail]");
    const virusStatus = this.root.querySelector("[data-maze-virus-status]");
    const powerStatus = this.root.querySelector("[data-maze-power-status]");
    if (time) time.textContent = formatClock(second);
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (this.state.remainingTime / this.state.currentFreeTime) * 100))}%`;
    timeCard?.classList.toggle("is-urgent", second <= 5 && this.state.phase === "playing");
    if (streak) streak.textContent = this.state.correctStreak;
    if (next) {
      const nextTime = freeTimeForStreak(this.state.correctStreak + 1);
      next.textContent = this.state.correctStreak ? `Próximo acerto: ${nextTime}s (+10s)` : "Primeiro acerto: 20s";
    }
    const now = performance.now();
    if (virusStatus) {
      if (this.state.eventViruses.length) virusStatus.textContent = `⚠️ ${this.state.eventViruses.length + 1} vírus no labirinto`;
      else if (this.state.virus.respawnAt > now) virusStatus.textContent = "Vírus reaparecendo longe";
      else if (this.state.activeEffects.frozenUntil > now) virusStatus.textContent = "Vírus congelado";
      else if (this.state.virus.sprinting) virusStatus.textContent = "⚠️ Vírus em perseguição";
      else virusStatus.textContent = `Vírus à espreita • nível ${this.state.virus.caughtCount + 1}`;
    }
    if (powerStatus) {
      const activePowers = [];
      if (this.state.activeEffects.shieldCharges) activePowers.push(`Escudo ×${this.state.activeEffects.shieldCharges}`);
      if (this.state.activeEffects.speedUntil > now) activePowers.push("Turbo");
      if (this.state.activeEffects.seerUntil > now) activePowers.push("Caminho verde");
      if (this.state.activeEffects.frozenUntil > now) activePowers.push("Congelamento");
      if (this.state.activeEffects.invisibleUntil > now) activePowers.push("Fantasma");
      if (this.state.activeEffects.compassUntil > now) activePowers.push("Bússola");
      if (this.state.prizeTrailRemaining > 0) activePowers.push(`Trilha premiada ${Math.ceil(this.state.prizeTrailRemaining)}s`);
      powerStatus.textContent = activePowers.length ? activePowers.join(" • ") : "Encontre um baú para escolher um poder.";
    }
    if (status && detail) {
      if (this.state.phase === "challenge" || this.state.phase === "challenge-success") {
        status.textContent = "Desafio em andamento";
        detail.textContent = "O labirinto e o relógio estão pausados.";
      } else if (this.state.phase === "victory") {
        status.textContent = "Saída encontrada";
        detail.textContent = "Missão concluída!";
      } else if (this.state.phase === "tutorial") {
        status.textContent = "Tutorial";
        detail.textContent = "A partida começa quando você fechar as instruções.";
      } else if (this.state.phase === "power-choice") {
        status.textContent = "Baú de poderes";
        detail.textContent = "Escolha um dos quatro poderes para continuar.";
      } else {
        status.textContent = this.state.activeEvent ? this.state.activeEvent.name : "Explorando";
        detail.textContent = this.state.activeEvent ? this.state.activeEvent.description : "O relógio está correndo.";
      }
    }
  }

  handleClick(event) {
    const powerId = event.target.closest("[data-power-id]")?.dataset.powerId;
    if (powerId) {
      this.applyPower(powerId);
      return;
    }
    const action = event.target.closest("[data-maze-action]")?.dataset.mazeAction;
    if (!action) return;
    if (action === "start") this.startGame({ newMaze: true });
    if (action === "close-tutorial") this.closeTutorial();
    if (action === "toggle-sound") this.toggleSound();
    if (action === "play-again") this.startGame({ newMaze: false });
    if (action === "new-maze") this.startGame({ newMaze: true });
    if (action === "fullscreen") this.toggleFullscreen();
  }

  handleKeyDown(event) {
    if (!this.active || !this.launched || this.state?.phase !== "playing") return;
    if (!MOVE_KEYS.has(event.key) || event.target.matches("input, textarea, select")) return;
    event.preventDefault();
    this.keys.add(event.key);
  }

  handleKeyUp(event) {
    if (!MOVE_KEYS.has(event.key)) return;
    this.keys.delete(event.key);
  }

  handlePointerDown(event) {
    const button = event.target.closest("[data-direction]");
    if (!button || this.state?.phase !== "playing") return;
    event.preventDefault();
    this.virtualDirection = button.dataset.direction;
    button.classList.add("is-pressed");
    button.setPointerCapture?.(event.pointerId);
  }

  handlePointerUp(event) {
    const button = event.target.closest("[data-direction]");
    if (!button) return;
    this.virtualDirection = null;
    button.classList.remove("is-pressed");
    try { button.releasePointerCapture?.(event.pointerId); } catch {}
  }

  handleResize() {
    this.renderer?.resize();
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem(SOUND_KEY, this.soundEnabled ? "on" : "off");
    this.root.querySelectorAll("[data-maze-action='toggle-sound']").forEach((button) => {
      button.textContent = this.soundEnabled ? "🔊 Som ligado" : "🔇 Som desligado";
    });
    if (this.soundEnabled) {
      this.ensureAudio();
      this.playSound("correct");
    }
  }

  ensureAudio() {
    if (!this.soundEnabled) return null;
    try {
      this.audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === "suspended") this.audioContext.resume().catch(() => {});
      return this.audioContext;
    } catch {
      return null;
    }
  }

  playSound(kind) {
    if (!this.soundEnabled) return;
    const context = this.ensureAudio();
    if (!context) return;
    const presets = {
      step: [[120, 0.025]],
      challenge: [[280, 0.08], [390, 0.1]],
      correct: [[480, 0.08], [660, 0.1], [820, 0.12]],
      wrong: [[210, 0.12], [155, 0.16]],
      virus: [[180, 0.08], [240, 0.08], [180, 0.08]],
      caught: [[190, 0.13], [135, 0.2]],
      chest: [[410, 0.07], [560, 0.09], [720, 0.12]],
      power: [[520, 0.06], [700, 0.08], [930, 0.12]],
      "event-danger": [[170, 0.1], [240, 0.08], [170, 0.13], [310, 0.12]],
      "event-help": [[440, 0.07], [620, 0.09], [830, 0.14]],
      victory: [[392, 0.12], [523, 0.12], [659, 0.14], [784, 0.22]]
    };
    let offset = 0;
    (presets[kind] || []).forEach(([frequency, duration]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "step" ? "square" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(kind === "step" ? 0.018 : 0.055, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + offset + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + duration);
      offset += duration * 0.78;
    });
  }

  toggleFullscreen() {
    const shell = this.root.querySelector(".maze-game-shell");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else shell?.requestFullscreen?.().catch(() => {});
  }
}

export const mazeGame = new MazeGame();

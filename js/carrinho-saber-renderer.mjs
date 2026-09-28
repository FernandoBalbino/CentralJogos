import { cartItemMap } from "./carrinho-saber-data.mjs";
import { STATES, objectiveFor } from "./carrinho-saber-core.mjs";

const button = (action, text, secondary = false) => `<button type="button" class="cs-button${secondary ? " cs-secondary" : ""}" data-action="${action}">${text}</button>`;
export class CartRenderer {
  constructor(root) { this.root = root; this.cards = new Map(); this.overlayKey = ""; }
  mount() {
    this.root.innerHTML = `<div class="cs-shell">
      <header class="cs-toolbar"><a href="#/" class="cs-back" aria-label="Voltar à Central de Jogos">← <span>Central de Jogos</span></a><strong>Carrinho do Saber</strong><div class="cs-tools"><button type="button" data-action="sound" aria-pressed="true">Som ligado</button><button type="button" data-action="fullscreen">Tela cheia</button><button type="button" data-action="pause">Pausar</button></div></header>
      <section class="cs-mission" aria-label="Missão atual"><div><span class="cs-eyebrow" data-phase>CONHECIMENTO E MOVIMENTO</span><h1 data-mission>Uma missão. A escolha certa.</h1></div><div class="cs-progress" aria-label="Progresso"><span data-progress>0 de 10 fases</span><div class="cs-dots">${Array.from({length:10},()=>"<i></i>").join("")}</div></div></section>
      <div class="cs-stage" role="region" aria-label="Loja de informática. Use as setas ou A e D para mover o carrinho." tabindex="0">
        <div class="cs-scenery" aria-hidden="true"><div class="cs-shop-sign">TECNO <b>SHOP</b><small>ideias para aprender</small></div><div class="cs-shelf cs-shelf-left"><i class="cs-prop cs-prop-computer"></i><i class="cs-prop cs-prop-laptop"></i><i class="cs-prop cs-prop-printer"></i></div><div class="cs-shelf cs-shelf-right"><i class="cs-prop cs-prop-books"></i><i class="cs-prop cs-prop-computer"></i><i class="cs-prop cs-prop-box"></i></div><div class="cs-floor"></div><div class="cs-floor-line"></div></div>
        <div class="cs-objects" aria-hidden="true"></div>
        <div class="cs-actor" aria-hidden="true"><div class="cs-person"><i class="cs-sprite"></i><i class="cs-arm"></i></div><div class="cs-cart"><i class="cs-handle"></i><div class="cs-basket"><span>★</span></div><div class="cs-rim"></div><i class="cs-wheel cs-wheel-a"></i><i class="cs-wheel cs-wheel-b"></i></div><span class="cs-impact"></span><div class="cs-particles">${Array.from({length:8},(_,i)=>`<i style="--n:${i}"></i>`).join("")}</div></div>
        <div class="cs-overlay" hidden></div>
      </div>
      <footer class="cs-controls"><button type="button" data-move="-1" aria-label="Mover para a esquerda">←</button><p><span>← → ou A / D</span> para mover <b>•</b> Deixe passar o que não serve.</p><button type="button" data-move="1" aria-label="Mover para a direita">→</button></footer>
      <p class="cs-live" aria-live="polite" aria-atomic="true"></p>
    </div>`;
    this.shell = this.root.querySelector(".cs-shell");
    this.stage = this.root.querySelector(".cs-stage");
    this.layer = this.root.querySelector(".cs-objects");
    this.actor = this.root.querySelector(".cs-actor");
    this.sprite = this.root.querySelector(".cs-sprite");
    this.overlay = this.root.querySelector(".cs-overlay");
    this.live = this.root.querySelector(".cs-live");
  }
  measure() { const rect = this.stage.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }
  configure(arena) {
    this.arena = arena;
    for (const [name, value] of Object.entries({ "item-width": arena.itemWidth, "item-height": arena.itemHeight, "basket-width": arena.basketWidth, "person-size": arena.personSize, "catch-y": arena.catchY })) this.stage.style.setProperty(`--${name}`, `${value}px`);
  }
  render(state, { sound, canContinue, fullscreen }) {
    const phaseKey = `${state.phaseIndex}/${state.status === STATES.MENU}/${state.completed.length}`;
    if (this.phaseKey !== phaseKey) {
      this.phaseKey = phaseKey;
      this.root.querySelector("[data-phase]").textContent = state.status === STATES.MENU ? "CONHECIMENTO E MOVIMENTO" : `FASE ${state.phaseIndex + 1} / 10${state.phaseIndex === 9 ? " · DESAFIO FINAL" : ""}`;
      this.root.querySelector("[data-mission]").textContent = state.status === STATES.MENU ? "Uma missão. A escolha certa." : objectiveFor(state).text;
      this.root.querySelector("[data-progress]").textContent = `${state.completed.length} de 10 fases`;
      this.root.querySelectorAll(".cs-dots i").forEach((dot, i) => { dot.classList.toggle("is-done", i < state.completed.length); dot.classList.toggle("is-current", i === state.phaseIndex && i >= state.completed.length); });
    }
    const soundButton = this.root.querySelector('[data-action="sound"]');
    if (this.sound !== sound) { soundButton.textContent = sound ? "Som ligado" : "Som desligado"; soundButton.setAttribute("aria-pressed", String(sound)); this.sound = sound; }
    if (this.fullscreen !== fullscreen) { this.root.querySelector('[data-action="fullscreen"]').textContent = fullscreen ? "Sair da tela cheia" : "Tela cheia"; this.fullscreen = fullscreen; }
    if (this.status !== state.status) {
      this.root.querySelector('[data-action="pause"]').disabled = ![STATES.PLAYING, STATES.COUNTDOWN].includes(state.status);
      this.root.querySelectorAll("[data-move]").forEach(node => { node.disabled = state.status !== STATES.PLAYING; });
      this.status = state.status;
    }
    this.actor.style.transform = `translate3d(${state.player.x}px,${this.arena.catchY}px,0)`;
    const moving = Math.abs(state.player.velocity) > 10 && state.status === STATES.PLAYING;
    const actorClass = `cs-actor${moving ? " is-moving" : ""}${state.player.direction < 0 ? " faces-left" : ""}${state.status === STATES.CORRECT ? " is-happy" : ""}${state.status === STATES.WRONG ? " is-wrong" : ""}`;
    if (this.actor.className !== actorClass) this.actor.className = actorClass;
    const frame = moving ? 1 + Math.floor(state.elapsed * 9) % 3 : 0;
    const spritePosition = `${frame * 100 / 3}% ${state.player.direction < 0 ? 100 / 3 : 200 / 3}%`;
    if (this.spritePosition !== spritePosition) { this.sprite.style.backgroundPosition = spritePosition; this.spritePosition = spritePosition; }
    const ids = new Set(state.objects.map(object => object.id));
    for (const [id, node] of this.cards) if (!ids.has(id)) { node.remove(); this.cards.delete(id); }
    for (const object of state.objects) {
      let node = this.cards.get(object.id);
      if (!node) {
        node = this.root.ownerDocument.createElement("div");
        node.className = "cs-item"; node.dataset.item = object.itemId;
        const item = cartItemMap[object.itemId];
        node.innerHTML = `<img src="${item.image}" alt="" draggable="false"><span>${item.name}</span>`;
        this.layer.append(node); this.cards.set(object.id, node);
      }
      node.style.transform = `translate3d(${object.x - this.arena.itemWidth / 2}px,${object.y}px,0)`;
      node.classList.toggle("is-caught", state.result?.objectId === object.id);
      node.classList.toggle("is-frozen", Boolean(state.result) && state.result.objectId !== object.id);
    }
    this.showOverlay(state, canContinue);
  }
  showOverlay(state, canContinue) {
    const countdown = state.countdown > .6 ? String(Math.ceil(state.countdown - .6)) : "VAI!";
    const key = `${state.status}/${state.phaseIndex}/${state.status === STATES.COUNTDOWN ? countdown : ""}/${state.result?.itemId || ""}`;
    if (key === this.overlayKey) return;
    this.overlayKey = key;
    let html = "", announcement = "";
    const item = cartItemMap[state.result?.itemId];
    if (state.status === STATES.MENU) {
      html = `<div class="cs-panel cs-welcome"><span class="cs-eyebrow">BEM-VINDO À LOJA</span><h2>Carrinho<br>do <em>Saber</em></h2><p>Leia a missão e pegue apenas<br>o item correto!</p><div class="cs-how"><span><b>1</b> Leia com calma</span><span><b>2</b> Mova o carrinho</span><span><b>3</b> Faça sua escolha</span></div><div class="cs-actions">${canContinue ? button("continue", state.completed.length === 10 ? "Ver conclusão" : `Continuar · fase ${state.phaseIndex + 1}`) : ""}${button("new", canContinue ? "Começar novamente" : "Vamos às compras!", canContinue)}</div><small>10 fases • Sem limite de tentativas<br>Seu progresso fica salvo neste dispositivo.</small></div>`;
    } else if (state.status === STATES.INTRO) {
      html = `<div class="cs-panel"><span class="cs-eyebrow">${state.phaseIndex === 9 ? "DESAFIO FINAL" : `SUA MISSÃO · FASE ${state.phaseIndex + 1}`}</span><h2>O que você precisa?</h2><blockquote>${objectiveFor(state).text}</blockquote><p>Espere o item certo e leve o carrinho até ele.<br>Você pode deixar qualquer item passar.</p>${button("start", "Começar →")}<small>Use ← →, A / D ou os botões na tela.</small></div>`;
      announcement = objectiveFor(state).text;
    } else if (state.status === STATES.COUNTDOWN) {
      html = `<div class="cs-countdown"><strong>${countdown}</strong><span>Prepare seu carrinho</span></div>`; announcement = countdown;
    } else if (state.status === STATES.WRONG || state.status === STATES.COMPLETE) {
      const correct = state.status === STATES.COMPLETE;
      html = `<div class="cs-panel cs-feedback ${correct ? "cs-success" : "cs-try"}"><span class="cs-eyebrow">${correct ? "ESCOLHA CERTA!" : "VAMOS PENSAR DE NOVO"}</span><h2>${correct ? "Boa escolha!" : "Ainda não é esse."}</h2><div class="cs-answer"><img src="${item.image}" alt=""><strong>${item.name}</strong></div><p>${item.explanation}</p>${!correct ? `<p class="cs-reminder">${objectiveFor(state).reminder}</p>` : ""}${button(correct ? "next" : "retry", correct ? state.phaseIndex === 9 ? "Ver conclusão →" : "Próxima fase →" : "Tentar novamente")}<small>${correct ? "Pressione Enter para continuar." : "A missão continua a mesma. Sem perder progresso."}</small></div>`;
      announcement = `${correct ? "Boa escolha!" : "Tente novamente."} ${item.name}. ${item.explanation}`;
    } else if (state.status === STATES.PAUSED) {
      html = `<div class="cs-panel"><span class="cs-eyebrow">NO SEU TEMPO</span><h2>Uma pausa nas compras.</h2><p>A missão e os itens estão esperando por você.</p><div class="cs-actions">${button("resume", "Continuar jogando")}${button("retry", "Recomeçar esta fase", true)}</div><a href="#/" class="cs-text-link">Voltar à Central</a></div>`; announcement = "Jogo pausado.";
    } else if (state.status === STATES.VICTORY) {
      html = `<div class="cs-panel cs-victory"><span class="cs-medal" aria-hidden="true">★</span><span class="cs-eyebrow">10 DE 10 FASES CONCLUÍDAS</span><h2>Carrinho cheio<br>de conhecimento!</h2><p>Você relacionou cada necessidade ao equipamento ou programa certo. Leve essas escolhas para o dia a dia!</p><div class="cs-actions">${button("new", "Jogar novamente")}<a class="cs-button cs-secondary" href="#/">Voltar à Central</a></div></div>`; announcement = "Parabéns! Você concluiu as dez fases do Carrinho do Saber.";
    }
    this.overlay.hidden = !html;
    this.overlay.className = `cs-overlay${state.status === STATES.COUNTDOWN ? " cs-counting" : ""}`;
    this.overlay.innerHTML = html;
    this.stage.inert = false;
    if (announcement) this.live.textContent = announcement;
    if (html && state.status !== STATES.COUNTDOWN) this.overlay.querySelector("button, a")?.focus({ preventScroll: true });
    if (state.status === STATES.PLAYING) this.stage.focus({ preventScroll: true });
  }
  announce(message) { this.live.textContent = message; }
  destroy() { this.cards.clear(); this.root.replaceChildren(); }
}

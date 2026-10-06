import { PHASES, CUSTOMER_BY_ID } from "./balcao-informatica-data.mjs";
import { CATEGORIES, PRODUCT_BY_ID, catalogForPhase } from "./balcao-informatica-products.mjs";
import { currentCustomer, queueCustomers, statistics, starsForErrors, scoreOrder, canShop } from "./balcao-informatica-core.mjs";
const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const button = (action, label, extra = "", style = "") => `<button type="button" class="bi-button ${style}" data-action="${action}" data-focus="${action}" ${extra}>${label}</button>`;
const names = ids => ids.map(id => PRODUCT_BY_ID[id].name).join(" + ");
const number = value => value.toLocaleString("pt-BR");

export function person(id, mood = "") {
  const n = [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return `<span class="bi-person bi-hair-${n % 3} ${mood}" style="--skin:${["#edbc98", "#b77551", "#754737", "#d8a078"][n % 4]};--shirt:${["#258a8d", "#7658b8", "#dc7852", "#457ec3", "#ae607d"][n % 5]};--hair:${["#352d34", "#6b4530", "#d9d2c4"][n % 3]}" aria-hidden="true"><i class="bi-head"><i class="bi-eyes"></i><i class="bi-mouth"></i></i><i class="bi-shirt"></i><i class="bi-legs"></i></span>`;
}
function waitingLine(state) {
  const waiting = queueCustomers(state);
  return `<div class="bi-queue-heading"><strong>Fila de clientes</strong><span>${waiting.length}/4</span></div><ol>${waiting.map(c => `<li>${person(c.id)}<span><strong>${esc(c.name)}</strong><small>${esc(c.profile)}</small></span></li>`).join("")}</ol>${!waiting.length ? '<p class="bi-queue-empty">Os próximos clientes estão chegando…</p>' : '<p class="bi-queue-empty">Pode atender com calma. Todos esperam.</p>'}`;
}
function scene(state, preview = false) {
  const customer = !preview && state.status !== "opening" ? currentCustomer(state) : null;
  return `<aside class="bi-scene-column"><div class="bi-room" aria-label="Loja com balcão, entrada e expositores"><div class="bi-awning"></div><div class="bi-store-name">BYTE <b>&</b> CIA.<small>SUA LOJA DE INFORMÁTICA</small></div><span class="bi-open-sign">${state.status === "opening" ? "ABRINDO…" : "ABERTO"}</span><div class="bi-door"><span>ENTRADA</span></div><div class="bi-shelf bi-shelf-one"><img src="./assets/items/monitor.jpg" alt=""><img src="./assets/items/teclado.jpg" alt=""><span>PERIFÉRICOS</span></div><div class="bi-shelf bi-shelf-two"><img src="./assets/items/ssd.jpg" alt=""><img src="./assets/items/memoria-ram.jpg" alt=""><span>PEÇAS & MEMÓRIAS</span></div><div class="bi-floor"></div><div class="bi-clerk">${person("clerk")}</div><div class="bi-counter"><span>ATENDIMENTO</span><i class="bi-register">▰<small>CAIXA</small></i></div><div class="bi-current-person" data-customer="${customer?.id || ""}">${customer ? person(customer.id, state.status === "correct" ? "is-happy" : state.status === "wrong" ? "is-confused" : "") : ""}</div><div class="bi-scene-caption">${customer ? `${esc(customer.name)} está no balcão` : "Sua loja, muitas descobertas."}</div></div>${!preview ? `<div class="bi-queue" data-queue>${waitingLine(state)}</div>` : ""}</aside>`;
}
function menu(state, view) {
  return `<div class="bi-welcome"><div class="bi-welcome-copy"><span class="bi-eyebrow">UM NOVO EXPEDIENTE • JOGO 16</span><h1>Balcão da<br><em>Informática</em></h1><p>Uma loja cheia de histórias.<br>O equipamento certo faz toda a diferença.</p><p class="bi-welcome-detail">Ouça cada cliente, escolha os produtos e prepare a sacola. Aprenda a função de cada peça a cada atendimento.</p><div class="bi-welcome-tags"><span>100 clientes</span><span>5 fases</span><span>50–70 min estimados</span></div>${view.confirmNew ? `<div class="bi-reset-warning" role="alert"><strong>Começar uma nova campanha?</strong><p>O progresso salvo deste jogo será substituído.</p>${button("confirm-new", "SIM, NOVA CAMPANHA", "", "bi-primary")}${button("cancel-new", "MANTER PROGRESSO")}</div>` : `<div class="bi-welcome-actions">${view.canContinue ? button("continue", "CONTINUAR EXPEDIENTE →", "", "bi-primary") : ""}${button("new", view.canContinue ? "NOVA CAMPANHA" : "COMEÇAR EXPEDIENTE →", "", view.canContinue ? "" : "bi-primary")}</div>`}<small>Jogue no seu ritmo. O progresso é salvo neste navegador.</small></div>${scene(state, true)}<div class="bi-phase-map">${PHASES.map((p, i) => `<div><b>0${i + 1}</b><span>${p.title}<small>${p.count} clientes</small></span></div>`).join("")}</div></div>`;
}
function tutorial(state) {
  if (state.status === "trained") return `<div class="bi-centered"><span class="bi-big-icon">✓</span><h1>Sacola pronta!</h1><p>Você já sabe atender. Durante o jogo, descubra os produtos por conta própria: a explicação aparece depois da entrega.</p><p>Você também pode arrastar os produtos, se preferir.</p>${button("open", "ABRIR A LOJA →", "", "bi-primary")}</div>`;
  return `<div class="bi-tutorial"><span class="bi-eyebrow">ANTES DE ABRIR • TREINO SEM PONTOS</span><h1>Dois cliques. Pedido na sacola.</h1><p>Não precisa segurar o botão do touchpad.</p><div class="bi-demo" aria-label="Demonstração: primeiro clique no produto, depois clique na sacola"><span>① Clique no produto</span><i>→</i><span>② Clique na sacola</span><b class="bi-demo-cursor" aria-hidden="true">↖</b></div><p>Vamos praticar: selecione o mouse abaixo e clique na sacola. Depois, entregue o pedido de treino.</p><div class="bi-practice"><button class="bi-product ${state.selected === "mouse" ? "is-selected" : ""}" type="button" data-action="select" data-product="mouse" data-focus="product-mouse" aria-pressed="${state.selected === "mouse"}"><img draggable="false" src="./assets/items/mouse.jpg" alt="Mouse"><strong>Mouse</strong><small>${state.selected === "mouse" ? "Selecionado ✓" : "Clique para selecionar"}</small></button>${bag(state)}</div><p class="bi-tutorial-note">Com teclado: use Tab para navegar e Enter ou Espaço para selecionar e colocar. Esc cancela a seleção.</p></div>`;
}
function bag(state) {
  const editable = canShop(state);
  return `<aside class="bi-bag ${state.bag.length ? "has-items" : ""}" aria-label="Sacola do pedido"><button type="button" class="bi-dropzone ${state.selected ? "is-target" : ""}" data-action="add" data-dropzone data-focus="add" ${!editable ? "disabled" : ""} aria-label="${state.selected ? `Colocar ${PRODUCT_BY_ID[state.selected].name} na sacola` : "Sacola: selecione um produto e clique aqui"}"><span class="bi-bag-icon" aria-hidden="true">♧</span><span><strong>Sacola do pedido</strong><small>${state.bag.length}/3 produtos</small></span><b>${state.selected ? "CLIQUE AQUI PARA COLOCAR ↓" : "Clique ou solte aqui"}</b></button><ul class="bi-bag-items">${state.bag.map(id => `<li><img src="${PRODUCT_BY_ID[id].image}" alt=""><span>${PRODUCT_BY_ID[id].name}</span><button type="button" data-action="remove" data-product="${id}" data-focus="remove-${id}" aria-label="Remover ${PRODUCT_BY_ID[id].name}" ${!editable ? "disabled" : ""}>×</button></li>`).join("")}</ul>${!state.bag.length ? '<p class="bi-bag-empty">Seu pedido começa aqui.<br>Escolha um produto no catálogo.</p>' : ""}${button("deliver", "ENTREGAR PEDIDO →", !editable || !state.bag.length ? "disabled" : "", "bi-primary bi-deliver")}<small class="bi-bag-tip">Você pode remover itens antes de entregar.</small></aside>`;
}
export function dialogue(state) {
  if (state.status === "opening") return `<div class="bi-dialogue bi-opening" role="status"><span class="bi-eyebrow">ABRINDO A LOJA…</span><h2>Vamos receber o próximo cliente.</h2><p>Organize o balcão. Ele já está chegando!</p></div>`;
  const c = currentCustomer(state);
  if (state.status === "wrong") return `<section class="bi-dialogue bi-feedback is-wrong" aria-labelledby="bi-feedback-title"><span class="bi-eyebrow">VAMOS REVER O PEDIDO</span><h2 id="bi-feedback-title">“Hum… isso ainda não resolve meu pedido.”</h2><div class="bi-comparison"><p><b>Você entregou:</b> ${esc(names(state.bag))}</p><p><b>O cliente precisava:</b> ${esc(names(c.products))}</p></div><p class="bi-explanation">${esc(c.explanation)}</p>${button("retry", "TENTAR NOVAMENTE", "", "bi-primary")}</section>`;
  if (state.status === "correct") {
    const stats = statistics(state.results);
    const combo = ({ 2: "Bom atendimento!", 3: "Especialista em Hardware!", 5: "Atendente nota 10!" })[stats.streak];
    return `<section class="bi-dialogue bi-feedback is-correct" aria-labelledby="bi-feedback-title"><span class="bi-eyebrow">PEDIDO CORRETO</span><h2 id="bi-feedback-title">“Perfeito! Era isso que eu precisava!”</h2><div class="bi-reward"><span aria-label="${starsForErrors(state.errors)} estrelas">${"★".repeat(starsForErrors(state.errors))}${"☆".repeat(3 - starsForErrors(state.errors))}</span><b>+${scoreOrder(c.products.length, state.errors)} pontos</b>${combo ? `<strong>${combo}</strong>` : ""}</div><p class="bi-explanation">${esc(c.explanation)}</p>${button("next", state.cursor + 1 === PHASES[state.phase].count ? "ENCERRAR EXPEDIENTE →" : "PRÓXIMO CLIENTE →", "", "bi-primary")}</section>`;
  }
  return `<section class="bi-dialogue"><div class="bi-customer-label">${person(c.id)}<span><strong>${esc(c.name)}</strong><small>${esc(c.profile)} • no balcão</small></span><b>Pedido ${state.cursor + 1}/${PHASES[state.phase].count}</b></div><p class="bi-speech">“${esc(c.speech)}”</p>${state.status === "greeting" ? button("serve", "COMEÇAR ATENDIMENTO →", "", "bi-primary") : '<small class="bi-dialogue-hint">Leia com atenção e escolha os equipamentos. A correção aparece após a entrega.</small>'}</section>`;
}
function catalog(state, view) {
  const products = catalogForPhase(state.phase);
  const categories = ["all", ...new Set(products.map(p => p.category))];
  return `<section class="bi-catalog" aria-label="Catálogo da loja"><div class="bi-catalog-title"><h2>Escolha nas prateleiras</h2><span>${products.length} produtos</span></div><div class="bi-categories" aria-label="Setores da loja">${categories.map(id => `<button type="button" data-action="category" data-category="${id}" data-focus="category-${id}" aria-pressed="${view.category === id}">${CATEGORIES[id]}</button>`).join("")}</div><div class="bi-products" data-catalog-scroll>${products.filter(p => view.category === "all" || p.category === view.category).map(p => `<button type="button" class="bi-product ${state.selected === p.id ? "is-selected" : ""}" data-action="select" data-product="${p.id}" data-focus="product-${p.id}" aria-pressed="${state.selected === p.id}" ${!canShop(state) ? "disabled" : ""}><img src="${p.image}" alt="${esc(p.alt)}" draggable="false"><strong>${p.name}</strong><small>${state.selected === p.id ? "Selecionado ✓" : state.bag.includes(p.id) ? "Na sacola" : "Selecionar"}</small></button>`).join("")}</div></section>`;
}
function summary(state) {
  const results = state.results.filter(r => CUSTOMER_BY_ID[r.id].phase === state.phase), stats = statistics(results), total = statistics(state.results);
  const learned = [...new Set(results.flatMap(r => CUSTOMER_BY_ID[r.id].products))];
  return `<div class="bi-summary" data-summary-scroll><span class="bi-eyebrow">FASE ${state.phase + 1} CONCLUÍDA${state.phase === 4 ? " • CAMPANHA COMPLETA!" : ""}</span><h1>Expediente encerrado</h1><p class="bi-medal">${stats.medal}</p><div class="bi-summary-stats">${[["Clientes satisfeitos", stats.attended], ["Acertos de primeira", stats.first], ["Com nova tentativa", stats.retried], ["Pontos nesta fase", number(stats.points)], ["Precisão", `${stats.accuracy}%`], ["Melhor sequência", stats.best]].map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join("")}</div><p>Campanha: <strong>${total.attended}/100 clientes</strong> • <strong>${number(total.points)} pontos</strong> • precisão ${total.accuracy}% • melhor sequência ${total.best}</p><div class="bi-summary-actions">${state.phase < 4 ? button("phase", "PRÓXIMA FASE →", "", "bi-primary") : ""}${button("replay", "JOGAR NOVAMENTE ESTA FASE")}<a class="bi-button" href="#/">VOLTAR À CENTRAL</a></div><p class="bi-replay-note">Rejogar substitui o resultado desta fase; não soma pontos em duplicidade.</p><h2>Conhecimentos adquiridos</h2><div class="bi-knowledge">${learned.map(id => { const p = PRODUCT_BY_ID[id]; return `<article><img src="${p.image}" alt="${p.alt}"><div><h3>${p.name}</h3><small>✓ ${CATEGORIES[p.category]}</small><p>${p.knowledge}</p></div></article>`; }).join("")}</div></div>`;
}
export class ShopRenderer {
  constructor(root) { this.root = root; }
  mount() {
    this.root.innerHTML = '<div class="bi-shell"><div data-content></div><div class="bi-announcer" role="status" aria-live="polite" aria-atomic="true"></div></div>';
    this.shell = this.root.querySelector(".bi-shell"); this.content = this.root.querySelector("[data-content]");
  }
  render(state, view, focus) {
    const previousCustomer = this.root.querySelector("[data-customer]")?.dataset.customer;
    const active = this.root.ownerDocument.activeElement;
    const previousFocus = active?.dataset?.focus;
    const scroll = this.root.querySelector("[data-catalog-scroll]")?.scrollTop || 0;
    const stats = statistics(state.results);
    this.content.innerHTML = `<header class="bi-toolbar"><a href="#/" data-focus="back">← Central de Jogos</a><strong>Balcão da Informática</strong><div>${button("sound", view.sound ? "Som: ligado" : "Som: desligado", `aria-pressed="${view.sound}"`)}${button("fullscreen", "Tela cheia")}${!view.menu && state.status !== "summary" ? button("pause", state.status === "paused" ? "Retomar" : "Pausar") : ""}</div></header>${view.menu ? menu(state, view) : state.status === "paused" ? `<div class="bi-centered"><span class="bi-eyebrow">SEU BALCÃO ESTÁ RESERVADO</span><h1>Uma pausa para respirar.</h1><p>Os clientes esperam e o seu progresso está guardado.</p>${button("resume", "CONTINUAR ATENDIMENTO →", "", "bi-primary")}</div>` : state.status === "summary" ? summary(state) : ["tutorial", "trained"].includes(state.status) ? tutorial(state) : `<div class="bi-hud"><div><span class="bi-eyebrow">FASE ${state.phase + 1} DE 5</span><h1>${PHASES[state.phase].title}</h1></div><div class="bi-hud-stats"><span><b>${number(stats.points)}</b> pontos</span><span><b>${stats.attended}/100</b> clientes</span><span><b>${state.errors && state.status !== "correct" ? 0 : stats.streak}</b> em sequência</span></div></div><div class="bi-board">${scene(state)}<div class="bi-workspace">${dialogue(state)}<div class="bi-selection-note">${state.selected ? `<strong>Selecionado: ${PRODUCT_BY_ID[state.selected].name}.</strong> Agora clique na sacola. ${button("cancel", "Cancelar")}` : "① Clique no produto  →  ② Clique na sacola. Você também pode arrastar."}</div><div class="bi-shop">${catalog(state, view)}${bag(state)}</div></div></div>`}<footer class="bi-status"><span>${view.storageError ? "Não foi possível salvar neste navegador. Mantenha esta aba aberta." : "Progresso salvo neste navegador • Sem pressa, sem perder clientes"}</span><span data-offline-label></span></footer>`;
    const catalogScroll = this.root.querySelector("[data-catalog-scroll]"); if (catalogScroll) catalogScroll.scrollTop = scroll;
    const actor = this.root.querySelector("[data-customer]");
    if (actor && actor.dataset.customer === previousCustomer) actor.style.animation = "none";
    const target = focus || previousFocus;
    if (target) this.root.querySelector(`[data-focus="${target}"]`)?.focus({ preventScroll: true });
    this.offline();
  }
  queue(state) { const node = this.root.querySelector("[data-queue]"); if (node) node.innerHTML = waitingLine(state); }
  offline() {
    const status = this.root.ownerDocument.getElementById("site-offline-status");
    const node = this.root.querySelector("[data-offline-label]");
    if (node) node.textContent = status?.dataset.offlineState === "ready" ? "Disponível offline ✓" : status?.dataset.offlineState === "error" ? "Preparo offline incompleto. Volte à Central para tentar novamente." : "Preparando uso offline…";
  }
  announce(message) {
    const node = this.root.querySelector(".bi-announcer"), host = this.root.ownerDocument.defaultView;
    host.clearTimeout(this.noticeTimer);
    if (node) { node.hidden = !message; node.textContent = message; if (message) this.noticeTimer = host.setTimeout(() => { node.hidden = true; }, 3500); }
  }
  animateAdd(id, origin) {
    const target = this.root.querySelector("[data-dropzone]");
    if (!target || this.root.ownerDocument.defaultView.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    target.animate?.([{ transform: "rotate(0)" }, { transform: "rotate(-2deg)" }, { transform: "rotate(2deg)" }, { transform: "rotate(0)" }], { duration: 350 });
    if (!origin) return;
    const end = target.getBoundingClientRect(), img = this.root.ownerDocument.createElement("img");
    img.src = PRODUCT_BY_ID[id].image; img.alt = ""; img.className = "bi-flying-product"; img.style.left = `${origin.left}px`; img.style.top = `${origin.top}px`; this.shell.append(img);
    const animation = img.animate?.([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${end.left + end.width / 2 - origin.left}px,${end.top + end.height / 2 - origin.top}px) scale(.2)`, opacity: 0 }], { duration: 420, easing: "ease-in" });
    if (animation) animation.onfinish = () => img.remove(); else img.remove();
  }
  drag(id, x, y) {
    let ghost = this.root.querySelector(".bi-drag-ghost");
    if (!ghost) { ghost = this.root.ownerDocument.createElement("img"); ghost.src = PRODUCT_BY_ID[id].image; ghost.alt = ""; ghost.className = "bi-drag-ghost"; this.shell.append(ghost); }
    ghost.style.left = `${x - 30}px`; ghost.style.top = `${y - 30}px`;
    this.root.querySelector("[data-dropzone]")?.classList.add("is-target");
  }
  clearDrag() { this.root.querySelector(".bi-drag-ghost")?.remove(); this.root.querySelector("[data-dropzone]")?.classList.remove("is-target"); }
  destroy() { this.root.ownerDocument.defaultView.clearTimeout(this.noticeTimer); this.root.innerHTML = ""; }
}

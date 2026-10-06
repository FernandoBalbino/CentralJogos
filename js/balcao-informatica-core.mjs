import { CUSTOMERS, CUSTOMER_BY_ID, PHASES } from "./balcao-informatica-data.mjs";
import { PRODUCT_BY_ID, catalogForPhase } from "./balcao-informatica-products.mjs";

export const STORAGE_KEY = "central-balcao-informatica-v1";
export const SOUND_KEY = "central-balcao-informatica-sound";
export const ACTIVE_STATUSES = ["opening", "greeting", "shopping", "correct", "wrong"];
export const starsForErrors = errors => Math.max(1, 3 - errors);
export const scoreOrder = (count, errors) => 50 * count * starsForErrors(errors);
export const sameProducts = (bag, answer) => bag.length === answer.length && new Set(bag).size === bag.length && answer.every(id => bag.includes(id));
export const currentCustomer = state => CUSTOMER_BY_ID[state.orders[state.phase][state.cursor]];
const shuffle = (items, random) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1)))); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
export function phaseOrder(phase, random = Math.random) {
  const customers = CUSTOMERS.filter(c => c.phase === phase);
  return [...new Set(customers.map(c => c.difficulty))].sort((a, b) => a - b).flatMap(d => shuffle(customers.filter(c => c.difficulty === d).map(c => c.id), random));
}
export function createSession(random = Math.random) {
  return { version: 1, phase: 0, cursor: 0, orders: PHASES.map((_, i) => phaseOrder(i, random)), status: "tutorial", resumeStatus: null, bag: [], selected: null, errors: 0, results: [], arrived: 0, arrivalElapsed: 0, elapsed: 0 };
}
export function startPhase(state, phase = state.phase) {
  return { ...state, phase, cursor: 0, status: "opening", resumeStatus: null, bag: [], selected: null, errors: 0, arrived: 0, arrivalElapsed: 0 };
}
export const canShop = state => ["shopping", "tutorial"].includes(state.status);
export function selectProduct(state, id) {
  if (!canShop(state) || !catalogForPhase(state.phase).some(p => p.id === id) || state.status === "tutorial" && id !== "mouse") return state;
  return { ...state, selected: state.selected === id ? null : id };
}
export function addToBag(state, id = state.selected) {
  if (!canShop(state) || !id || !catalogForPhase(state.phase).some(p => p.id === id) || state.status === "tutorial" && id !== "mouse") return { state, message: "Selecione um produto primeiro." };
  if (state.bag.includes(id)) return { state, message: `${PRODUCT_BY_ID[id].name} já está na sacola.` };
  if (state.bag.length >= 3) return { state, message: "A sacola comporta até três produtos diferentes. Remova um para trocar." };
  return { state: { ...state, bag: [...state.bag, id], selected: null }, message: `${PRODUCT_BY_ID[id].name} colocado na sacola.` };
}
export function removeFromBag(state, id) { return canShop(state) ? { ...state, bag: state.bag.filter(item => item !== id) } : state; }
export function submitOrder(state) {
  if (!canShop(state) || !state.bag.length) return state;
  if (state.status === "tutorial") return { ...state, status: "trained", selected: null, bag: [] };
  const customer = currentCustomer(state);
  if (state.results.some(r => r.id === customer.id)) return state;
  if (!sameProducts(state.bag, customer.products)) return { ...state, status: "wrong", errors: state.errors + 1, selected: null };
  return { ...state, status: "correct", selected: null, results: [...state.results, { id: customer.id, errors: state.errors }] };
}
export function retryOrder(state) { return state.status === "wrong" ? { ...state, status: "shopping" } : state; }
export function nextCustomer(state) {
  if (state.status !== "correct") return state;
  const cursor = state.cursor + 1;
  return { ...state, cursor, status: cursor === state.orders[state.phase].length ? "summary" : state.arrived > cursor ? "greeting" : "opening", bag: [], selected: null, errors: 0, arrivalElapsed: 0 };
}
export function nextPhase(state) { return state.status === "summary" && state.phase < PHASES.length - 1 ? startPhase(state, state.phase + 1) : state; }
export function replayPhase(state, random = Math.random) {
  if (state.status !== "summary") return state;
  return startPhase({ ...state, results: state.results.filter(r => CUSTOMER_BY_ID[r.id].phase !== state.phase), orders: state.orders.map((order, i) => i === state.phase ? phaseOrder(i, random) : order) });
}
export function queueCustomers(state) {
  return state.orders[state.phase].slice(state.cursor + 1, state.arrived).map(id => CUSTOMER_BY_ID[id]);
}
export function tickQueue(state, seconds) {
  if (!ACTIVE_STATUSES.includes(state.status) || !Number.isFinite(seconds) || seconds <= 0) return state;
  const dt = Math.min(seconds, 5), elapsed = state.elapsed + dt;
  const limit = Math.min(state.orders[state.phase].length, state.cursor + 5);
  if (state.arrived >= limit) return { ...state, elapsed };
  const arrivalElapsed = state.arrivalElapsed + dt;
  const delay = state.arrived <= state.cursor ? 1 : 5;
  if (arrivalElapsed < delay) return { ...state, elapsed, arrivalElapsed };
  return { ...state, elapsed, arrived: state.arrived + 1, arrivalElapsed: 0, status: state.status === "opening" ? "greeting" : state.status };
}
export function pauseSession(state) {
  if (["paused", "summary"].includes(state.status)) return state;
  return { ...state, resumeStatus: state.status, status: "paused", selected: null };
}
export function resumeSession(state) { return state.status === "paused" ? { ...state, status: state.resumeStatus, resumeStatus: null } : state; }
export function statistics(results) {
  let points = 0, first = 0, streak = 0, best = 0;
  for (const r of results) {
    points += scoreOrder(CUSTOMER_BY_ID[r.id].products.length, r.errors);
    if (r.errors === 0) { first++; streak++; best = Math.max(best, streak); } else streak = 0;
  }
  const accuracy = results.length ? Math.round(first / results.length * 100) : 0;
  return { attended: results.length, first, retried: results.length - first, points, streak, best, accuracy, medal: accuracy >= 90 ? "🥇 Especialista em Hardware" : accuracy >= 70 ? "🥈 Atendente de destaque" : "🥉 Aprendiz dedicado" };
}
export const serializeSession = state => JSON.stringify({ ...state, selected: null });
// Reconstitui apenas estados coerentes com o catálogo local; nenhuma pontuação
// persistida é aceita: os totais são sempre calculados dos atendimentos válidos.
export function restoreSession(raw) {
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !Number.isInteger(s.phase) || s.phase < 0 || s.phase >= PHASES.length || !Array.isArray(s.orders) || s.orders.length !== PHASES.length) return null;
    for (let p = 0; p < PHASES.length; p++) {
      const order = s.orders[p];
      if (!Array.isArray(order) || order.length !== PHASES[p].count || new Set(order).size !== order.length || order.some((id, i) => CUSTOMER_BY_ID[id]?.phase !== p || i > 0 && CUSTOMER_BY_ID[order[i - 1]].difficulty > CUSTOMER_BY_ID[id].difficulty)) return null;
    }
    if (!Number.isInteger(s.cursor) || s.cursor < 0 || s.cursor > s.orders[s.phase].length || !Number.isInteger(s.errors) || s.errors < 0) return null;
    const statuses = [...ACTIVE_STATUSES, "tutorial", "trained", "summary", "paused"];
    if (!statuses.includes(s.status) || s.status === "paused" && (!statuses.includes(s.resumeStatus) || ["paused", "summary"].includes(s.resumeStatus))) return null;
    const status = s.status === "paused" ? s.resumeStatus : s.status;
    if ((status === "summary") !== (s.cursor === s.orders[s.phase].length) || ["tutorial", "trained"].includes(status) && (s.phase !== 0 || s.cursor !== 0)) return null;
    if (!Array.isArray(s.bag) || s.bag.length > 3 || new Set(s.bag).size !== s.bag.length || s.bag.some(id => !catalogForPhase(s.phase).some(p => p.id === id))) return null;
    if (status === "tutorial" && s.bag.some(id => id !== "mouse") || status === "trained" && s.bag.length) return null;
    if (!Array.isArray(s.results) || s.results.some(r => !CUSTOMER_BY_ID[r.id] || !Number.isInteger(r.errors) || r.errors < 0)) return null;
    const expected = s.orders.slice(0, s.phase).flat().concat(s.orders[s.phase].slice(0, s.cursor + (status === "correct" ? 1 : 0)));
    if (s.results.length !== expected.length || s.results.some((r, i) => r.id !== expected[i])) return null;
    if (status === "correct" && (!sameProducts(s.bag, currentCustomer(s).products) || s.results.at(-1).errors !== s.errors)) return null;
    if (status === "wrong" && (s.errors < 1 || !s.bag.length || sameProducts(s.bag, currentCustomer(s).products))) return null;
    if (!Number.isInteger(s.arrived) || s.arrived < s.cursor || s.arrived > Math.min(s.orders[s.phase].length, s.cursor + 5)) return null;
    if (["greeting", "shopping", "correct", "wrong"].includes(status) && s.arrived <= s.cursor || status === "opening" && s.arrived !== s.cursor) return null;
    if (![s.elapsed, s.arrivalElapsed].every(n => Number.isFinite(n) && n >= 0) || s.arrivalElapsed >= 5) return null;
    return { ...s, selected: null };
  } catch { return null; }
}

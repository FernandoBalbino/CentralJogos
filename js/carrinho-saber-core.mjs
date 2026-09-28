import { cartItems, cartItemMap, cartPhases } from "./carrinho-saber-data.mjs";

export const STORAGE_KEY = "centralJogos.carrinho.progress.v1";
export const SOUND_KEY = "centralJogos.carrinho.sound.v1";
export const STATES = Object.freeze({ MENU: "menu", INTRO: "intro", COUNTDOWN: "countdown", PLAYING: "playing", CORRECT: "correct", WRONG: "wrong", COMPLETE: "phase-complete", PAUSED: "paused", VICTORY: "game-complete" });
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const pick = (values, random) => values[Math.min(values.length - 1, Math.floor(random() * values.length))];
export const objectiveFor = state => cartPhases[state.phaseIndex].objectives.find(item => item.id === state.choices[state.phaseIndex]);
export const isCorrect = (itemId, objective) => Boolean(cartItemMap[itemId]?.capabilities.includes(objective?.capability));

export function createSession(random = Math.random) {
  return { version: 1, status: STATES.MENU, phaseIndex: 0, choices: cartPhases.map(phase => pick(phase.objectives, random).id), completed: [], attempt: 0, objects: [], player: { x: 0, velocity: 0, direction: 1 }, elapsed: 0, wave: 0, withoutCorrect: 0, recent: [], spawnIn: 0, countdown: 3.6, result: null, resumeStatus: null };
}
export function createArena(width, height, phaseIndex = 0) {
  const w = Math.max(300, width), h = Math.max(280, height);
  const itemWidth = clamp(w * .095, 74, 148) * (phaseIndex >= 7 ? .9 : 1);
  const basketWidth = clamp(w * .075, 58, 112);
  const personSize = clamp(w * .1, 76, 144);
  const edge = Math.min(basketWidth / 2 + personSize * .53 + 12, w * .24);
  return { width: w, height: h, itemWidth, itemHeight: itemWidth + 42, hitWidth: itemWidth * .7, basketWidth, personSize, minX: edge, maxX: w - edge, catchY: h - clamp(h * .24, 106, 145), speed: w * .68, acceleration: w * 3.8, deceleration: w * 4.8, fallTime: phaseIndex < 3 ? 7 : phaseIndex < 7 ? 6.5 : 6 };
}
export function beginPhase(state, arena) {
  return { ...state, status: STATES.INTRO, attempt: state.attempt + 1, objects: [], result: null, resumeStatus: null, player: { x: arena.width / 2, velocity: 0, direction: 1 }, elapsed: 0, wave: 0, withoutCorrect: 0, recent: [], spawnIn: 0, countdown: 3.6 };
}
export function startCountdown(state) {
  return state.status === STATES.INTRO ? { ...state, status: STATES.COUNTDOWN, countdown: 3.6 } : state;
}
export function nextPhase(state, arena) {
  if (state.status !== STATES.COMPLETE) return state;
  if (state.phaseIndex === 9) return { ...state, status: STATES.VICTORY, objects: [] };
  return beginPhase({ ...state, phaseIndex: state.phaseIndex + 1 }, arena);
}
export function pauseGame(state) {
  if (![STATES.PLAYING, STATES.COUNTDOWN].includes(state.status)) return state;
  return { ...state, resumeStatus: state.status, status: STATES.PAUSED, player: { ...state.player, velocity: 0 } };
}
export function resumeGame(state) {
  return state.status === STATES.PAUSED ? { ...state, status: state.resumeStatus, resumeStatus: null } : state;
}
export function captureItem(state, object) {
  if (state.status !== STATES.PLAYING) return state;
  const correct = isCorrect(object.itemId, objectiveFor(state));
  return { ...state, status: correct ? STATES.CORRECT : STATES.WRONG, player: { ...state.player, velocity: 0 }, result: { objectId: object.id, itemId: object.itemId, correct, age: 0 }, completed: correct ? [...state.completed, { objectiveId: objectiveFor(state).id, itemId: object.itemId }] : state.completed };
}

// Intervals describe safe basket-center positions, not the character's body.
export function safeIntervals(positions, arena) {
  const radius = (arena.basketWidth + arena.hitWidth) / 2 + 8;
  let free = [[arena.minX, arena.maxX]];
  for (const x of positions) free = free.flatMap(([a, b]) => [[a, Math.min(b, x - radius)], [Math.max(a, x + radius), b]].filter(([l, r]) => r > l));
  return free;
}
export function validPositions(positions, ids, arena, playerX = arena.width / 2, objective) {
  const [a, b] = positions;
  if (positions.some(x => x < arena.minX || x > arena.maxX)) return false;
  if (Math.abs(a - b) < arena.basketWidth + arena.hitWidth + 28) return false;
  const reach = arena.speed * (arena.fallTime - 1);
  if (!safeIntervals(positions, arena).some(([l, r]) => r - l >= 18 && Math.abs(clamp(playerX, l, r) - playerX) <= reach)) return false;
  return ids.every((id, index) => !isCorrect(id, objective) || (Math.abs(positions[index] - playerX) <= reach && ids.every((other, j) => index === j || isCorrect(other, objective) || Math.abs(positions[index] - positions[j]) > (arena.basketWidth + arena.hitWidth) / 2 + 12)));
}
export function samplePositions(ids, arena, playerX, objective, random = Math.random) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const positions = ids.map(() => arena.minX + random() * (arena.maxX - arena.minX));
    if (validPositions(positions, ids, arena, playerX, objective)) return positions;
  }
  const fallback = [arena.minX, arena.maxX];
  if (validPositions(fallback, ids, arena, playerX, objective)) return random() < .5 ? fallback : fallback.reverse();
  throw new RangeError("A área de jogo não comporta uma onda segura.");
}
export function chooseWave(state, random = Math.random) {
  const objective = objectiveFor(state);
  const correct = cartItems.filter(item => isCorrect(item.id, objective));
  const wrong = cartItems.filter(item => !isCorrect(item.id, objective));
  const roll = random();
  const count = state.withoutCorrect >= 2 ? 1 : roll < .38 ? 0 : roll > .9 && correct.length > 1 ? 2 : 1;
  const chosen = [];
  const select = (pool, distractor = false) => {
    let options = pool.filter(item => !chosen.includes(item.id));
    const fresh = options.filter(item => !state.recent.includes(item.id));
    if (fresh.length) options = fresh;
    const related = options.filter(item => objective.distractors.includes(item.id));
    if (distractor && related.length && random() < (state.phaseIndex >= 7 ? .9 : state.phaseIndex >= 3 ? .65 : .3)) options = related;
    const item = pick(options, random); chosen.push(item.id);
  };
  for (let i = 0; i < count; i++) select(correct);
  for (let i = count; i < 2; i++) select(wrong, true);
  if (random() < .5) chosen.reverse();
  return { ids: chosen, withoutCorrect: count ? 0 : state.withoutCorrect + 1, recent: [...state.recent, ...chosen].slice(-6), interval: 4.5 + random() };
}
export function spawnWave(state, arena, random = Math.random) {
  const wave = chooseWave(state, random);
  const positions = samplePositions(wave.ids, arena, state.player.x, objectiveFor(state), random);
  const stagger = .1 + random() * .2;
  // Similar fall durations keep each pair's capture window separate from the next wave.
  const objects = wave.ids.map((itemId, index) => ({ id: `${state.attempt}-${state.wave + 1}-${index}`, itemId, x: positions[index], y: -arena.itemHeight, delay: index * stagger, speed: arena.catchY / (arena.fallTime * (.98 + random() * .04)) }));
  return { ...state, wave: state.wave + 1, withoutCorrect: wave.withoutCorrect, recent: wave.recent, spawnIn: wave.interval, objects: [...state.objects, ...objects] };
}
function step(state, dt, input, arena, random) {
  if (state.status === STATES.COUNTDOWN) return state.countdown - dt <= 0 ? { ...state, countdown: 0, status: STATES.PLAYING, spawnIn: 0 } : { ...state, countdown: state.countdown - dt };
  if ([STATES.CORRECT, STATES.WRONG].includes(state.status)) {
    const result = { ...state.result, age: state.result.age + dt };
    return { ...state, result, status: state.status === STATES.CORRECT && result.age >= .85 ? STATES.COMPLETE : state.status };
  }
  if (state.status !== STATES.PLAYING) return state;
  let next = { ...state, elapsed: state.elapsed + dt, spawnIn: state.spawnIn - dt };
  const target = clamp(input, -1, 1) * arena.speed;
  const delta = (input ? arena.acceleration : arena.deceleration) * dt;
  const velocity = state.player.velocity + clamp(target - state.player.velocity, -delta, delta);
  const rawX = state.player.x + velocity * dt;
  next.player = { x: clamp(rawX, arena.minX, arena.maxX), velocity: rawX < arena.minX || rawX > arena.maxX ? 0 : velocity, direction: input ? Math.sign(input) : state.player.direction };
  if (next.spawnIn <= 0) next = spawnWave(next, arena, random);
  const moved = next.objects.map(object => {
    const activeTime = Math.max(0, dt - Math.max(0, object.delay));
    return { ...object, previousY: object.y, delay: Math.max(0, object.delay - dt), y: object.y + object.speed * activeTime };
  });
  const candidates = moved.filter(object => object.previousY + arena.itemHeight <= arena.catchY && object.y + arena.itemHeight >= arena.catchY).map(object => {
    const fraction = clamp((arena.catchY - arena.itemHeight - object.previousY) / (object.y - object.previousY || 1), 0, 1);
    const cartX = state.player.x + (next.player.x - state.player.x) * fraction;
    return { object, fraction, hits: Math.abs(cartX - object.x) <= (arena.basketWidth + arena.hitWidth) / 2 };
  }).filter(entry => entry.hits).sort((a, b) => a.fraction - b.fraction || a.object.id.localeCompare(b.object.id));
  next.objects = moved.filter(object => object.y < arena.height + arena.itemHeight);
  return candidates.length ? captureItem(next, candidates[0].object) : next;
}
export function stepGame(state, seconds, input, arena, random = Math.random) {
  let next = state, remaining = Math.max(0, seconds);
  while (remaining > 1e-8) { const dt = Math.min(remaining, 1 / 60); next = step(next, dt, input, arena, random); remaining -= dt; }
  return next;
}
export function serializeProgress(state) {
  return JSON.stringify({ version: 1, choices: state.choices, completed: state.completed });
}
export function restoreProgress(value, random = Math.random) {
  const fresh = createSession(random);
  try {
    const saved = typeof value === "string" ? JSON.parse(value) : value;
    if (saved?.version !== 1 || !Array.isArray(saved.choices) || saved.choices.length !== 10 || !saved.choices.every((id, i) => cartPhases[i].objectives.some(objective => objective.id === id))) return fresh;
    fresh.choices = saved.choices;
    for (const entry of Array.isArray(saved.completed) ? saved.completed.slice(0, 10) : []) {
      const index = fresh.completed.length;
      const objective = cartPhases[index].objectives.find(item => item.id === fresh.choices[index]);
      if (entry?.objectiveId !== objective.id || !isCorrect(entry.itemId, objective)) break;
      fresh.completed.push({ objectiveId: entry.objectiveId, itemId: entry.itemId });
    }
    fresh.phaseIndex = Math.min(9, fresh.completed.length);
  } catch { /* An unavailable or damaged save must not prevent a new game. */ }
  return fresh;
}

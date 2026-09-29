import { STATE_VERSION, PHASES, COMPONENTS, INSTALL_ORDER, CASE_BOUNDS, targetComponent, choicesFor } from "./oficina-pc-data.mjs";

export const createState = () => ({ version: STATE_VERSION, phase: "INTRO", installed: [], selectedId: null, hddFound: false, hddRemoved: false, hddDone: false, ramFound: false, ramRemoved: false, ramReplaced: false, ramDone: false, mouseFound: false, mouseConnected: false, mouseTested: false, plugged: false, powerReturn: "POWER_ON", powered: false, completed: false, motion: null, feedback: "" });
export const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const validPosition = (position) => Array.isArray(position) && position.length === 3 && position.every(Number.isFinite);
export const acceptsSnap = (id, position) => Boolean(COMPONENTS[id] && validPosition(position) && distance(position, COMPONENTS[id].snapPosition) <= COMPONENTS[id].snapRadius);
export const outsideCase = (position) => validPosition(position) && position.some((value, index) => value < CASE_BOUNDS.min[index] - .3 || value > CASE_BOUNDS.max[index] + .3);
const changePhase = (state, phase) => ({ ...state, phase, selectedId: null, motion: null, feedback: "" });
const connectFor = (state, powerReturn) => ({ ...changePhase(state, "CONNECT_POWER"), powerReturn, plugged: false, powered: false });

export function transition(state, action) {
  if (action.type === "RESET") return createState();
  if (state.motion && action.type !== "ANIMATION_DONE") return state;
  const expected = targetComponent(state.phase);
  switch (action.type) {
    case "CONTINUE": {
      if (state.phase === "ASSEMBLED") return connectFor(state, "POWER_ON");
      const next = { INTRO: "TUTORIAL", TUTORIAL: "CASE", CASE: "MOTHERBOARD", CLIENT_ORDER: "FIND_HDD", RAM_ORDER: "FIND_RAM", MOUSE_ORDER: "FIND_MOUSE" }[state.phase];
      if (next) return { ...changePhase(state, next), ...(next === "FIND_HDD" || next === "FIND_RAM" ? { powered: false, plugged: false } : {}), ...(next === "FIND_MOUSE" ? { mouseConnected: false, mouseTested: false } : {}) };
      if (state.phase === "POWER_ON" && state.powered) return changePhase(state, "CLIENT_ORDER");
      if (state.phase === "FINAL_TEST" && state.powered) return changePhase(state, "FINAL_QUESTION");
      if (state.phase === "RAM_TEST" && state.powered) return changePhase(state, "RAM_QUESTION");
      if (state.phase === "MOUSE_TEST" && state.mouseTested) return changePhase(state, "MOUSE_QUESTION");
      return state;
    }
    case "SELECT": {
      const id = action.componentId;
      if (!COMPONENTS[id]) return state;
      const find = { FIND_HDD: ["hdd", "REMOVE_HDD", "hddFound"], FIND_RAM: ["ram", "REMOVE_RAM", "ramFound"], FIND_MOUSE: ["mouse", "CONNECT_MOUSE", "mouseFound"] }[state.phase];
      if (find) {
        if (!state.installed.includes(id) && id !== "mouse") return state;
        if (id === find[0]) return { ...changePhase(state, find[1]), selectedId: id, [find[2]]: true, feedback: `${COMPONENTS[id].name} encontrado! ${COMPONENTS[id].purpose}` };
        return { ...state, selectedId: id, feedback: `${COMPONENTS[id].purpose} Continue procurando a peça solicitada.` };
      }
      const upgrade = { SELECT_SSD: "ssd", SELECT_RAM: "ram" }[state.phase];
      if (upgrade && choicesFor(state.phase, state.installed).includes(id)) return { ...state, selectedId: id, feedback: id === upgrade ? COMPONENTS[id].purpose : `${COMPONENTS[id].purpose} Essa peça não atende ao pedido.` };
      if (expected && choicesFor(state.phase, state.installed).includes(id)) return { ...state, selectedId: id, feedback: id === expected ? COMPONENTS[id].purpose : `${COMPONENTS[id].purpose} Procure a peça que atende ao objetivo.` };
      if (["ASSEMBLED", "POWER_ON", "COMPLETED"].includes(state.phase) && (state.installed.includes(id) || id === "mouse")) return { ...state, selectedId: id, feedback: COMPONENTS[id].purpose };
      return state;
    }
    case "INSTALL_SSD":
      return state.phase === "SELECT_SSD" && state.selectedId === "ssd" && state.hddRemoved ? { ...changePhase(state, "INSTALL_SSD"), selectedId: "ssd" } : state;
    case "INSTALL_RAM":
      return state.phase === "SELECT_RAM" && state.selectedId === "ram" && state.ramRemoved ? { ...changePhase(state, "INSTALL_RAM"), selectedId: "ram" } : state;
    case "DROP":
      if (!expected) return state;
      if (action.componentId !== expected || state.selectedId !== expected || !acceptsSnap(expected, action.position)) return { ...state, feedback: "Essa peça não é encaixada aqui. Tente novamente." };
      return { ...state, motion: { kind: ["power-plug", "mouse-usb"].includes(expected) ? "connect" : "install", componentId: expected }, feedback: "Encaixando…" };
    case "REMOVE": {
      const id = state.phase === "REMOVE_HDD" && state.hddFound ? "hdd" : state.phase === "REMOVE_RAM" && state.ramFound ? "ram" : null;
      if (!id || action.componentId !== id) return state;
      if (!outsideCase(action.position)) return { ...state, feedback: "Arraste a peça para fora do gabinete, em direção à bancada." };
      return { ...state, motion: { kind: "remove", componentId: id }, feedback: `Retirando ${COMPONENTS[id].name}…` };
    }
    case "POWER":
      if (!["POWER_ON", "FINAL_TEST", "RAM_TEST"].includes(state.phase) || state.powered || !state.plugged) return state;
      if (state.phase === "FINAL_TEST" && (!state.hddRemoved || !state.installed.includes("ssd"))) return state;
      if (state.phase === "RAM_TEST" && !state.ramReplaced) return state;
      return { ...state, motion: { kind: "power" }, feedback: "Inicializando computador…" };
    case "TEST_MOUSE":
      return state.phase === "MOUSE_TEST" && state.mouseConnected && state.powered && !state.mouseTested ? { ...state, motion: { kind: "mouse-test" }, feedback: "Movendo o ponteiro na tela…" } : state;
    case "ANIMATION_DONE": {
      if (!state.motion || action.kind !== state.motion.kind || (state.motion.componentId && action.componentId !== state.motion.componentId)) return state;
      const id = state.motion.componentId;
      if (state.motion.kind === "power") return { ...state, motion: null, powered: true, feedback: "FUNCIONANDO!" };
      if (state.motion.kind === "mouse-test") return { ...state, motion: null, mouseTested: true, feedback: "O ponteiro se moveu! Mouse funcionando ✓" };
      if (state.motion.kind === "connect") return id === "power-plug" ? { ...changePhase(state, state.powerReturn), plugged: true, feedback: "Cabo conectado à tomada ✓ Agora use Power." } : { ...changePhase(state, "MOUSE_TEST"), mouseConnected: true, feedback: "Mouse conectado à porta USB ✓" };
      if (state.motion.kind === "remove") return { ...changePhase(state, id === "hdd" ? "SELECT_SSD" : "SELECT_RAM"), installed: state.installed.filter((part) => part !== id), [id === "hdd" ? "hddRemoved" : "ramRemoved"]: true, feedback: "Peça removida ✓" };
      const installed = [...new Set([...state.installed, id])];
      if (id === "ssd") return { ...connectFor(state, "FINAL_TEST"), installed };
      if (id === "ram" && state.phase === "INSTALL_RAM") return { ...connectFor(state, "RAM_TEST"), installed, ramReplaced: true };
      const next = id === "gpu" ? "ASSEMBLED" : INSTALL_ORDER[INSTALL_ORDER.indexOf(id) + 1].toUpperCase();
      return { ...changePhase(state, next), installed, powered: false, feedback: `Encaixe concluído: ${COMPONENTS[id].name} ✓` };
    }
    case "ANSWER": {
      const question = { FINAL_QUESTION: ["RAM_ORDER", "hddDone", "O SSD melhora o acesso aos dados, mas não aumenta a capacidade de processamento da CPU."], RAM_QUESTION: ["MOUSE_ORDER", "ramDone", "A RAM é temporária. Os arquivos permanentes ficam no HD ou SSD."], MOUSE_QUESTION: ["COMPLETED", "completed", "O mouse é um dispositivo de entrada: ele controla o ponteiro. O SSD armazena arquivos."] }[state.phase];
      if (!question) return state;
      return action.answer === false ? { ...changePhase(state, question[0]), [question[1]]: true } : { ...state, feedback: `${question[2]} Tente novamente.` };
    }
    default: return state;
  }
}

export const serializeProgress = (state) => JSON.stringify(Object.fromEntries(Object.keys(createState()).filter((key) => !["selectedId", "motion", "feedback"].includes(key)).map((key) => [key, state[key]])));
export function restoreProgress(raw) {
  let saved;
  try { saved = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return createState(); }
  if (!saved || ![1, STATE_VERSION].includes(saved.version) || !PHASES.includes(saved.phase) || !Array.isArray(saved.installed)) return createState();
  const old = saved.version === 1;
  let state = { ...createState(), phase: old && saved.phase === "COMPLETED" ? "RAM_ORDER" : saved.phase, installed: [...new Set(saved.installed.filter((id) => INSTALL_ORDER.includes(id) || id === "ssd"))] };
  for (const key of ["hddFound", "hddRemoved", "hddDone", "ramFound", "ramRemoved", "ramReplaced", "ramDone", "mouseFound", "mouseConnected", "mouseTested", "plugged", "powered", "completed"]) state[key] = saved[key] === true;
  if (old) { state.plugged = state.powered; state.hddDone = saved.phase === "COMPLETED"; state.completed = false; }
  if (["POWER_ON", "FINAL_TEST", "RAM_TEST"].includes(saved.powerReturn)) state.powerReturn = saved.powerReturn;
  const index = PHASES.indexOf(state.phase), removedHdd = state.hddFound && state.hddRemoved, removedRam = state.hddDone && state.ramFound && state.ramRemoved;
  const missing = INSTALL_ORDER.find((id) => !state.installed.includes(id) && !(id === "hdd" && removedHdd) && !(id === "ram" && removedRam));
  if (index >= PHASES.indexOf("ASSEMBLED") && missing) return { ...createState(), phase: missing.toUpperCase(), installed: INSTALL_ORDER.slice(0, INSTALL_ORDER.indexOf(missing)) };
  if (index < PHASES.indexOf("ASSEMBLED")) {
    const required = Math.max(0, INSTALL_ORDER.indexOf(targetComponent(state.phase))), prefix = INSTALL_ORDER.slice(0, required);
    if (!prefix.every((id) => state.installed.includes(id))) return { ...createState(), phase: missing.toUpperCase(), installed: INSTALL_ORDER.slice(0, INSTALL_ORDER.indexOf(missing)) };
    return { ...createState(), phase: state.phase, installed: prefix };
  }
  if (index >= PHASES.indexOf("REMOVE_HDD") && !state.hddFound) state.phase = "FIND_HDD";
  else if (index >= PHASES.indexOf("SELECT_SSD") && !removedHdd) state.phase = "REMOVE_HDD";
  else if (index >= PHASES.indexOf("FINAL_TEST") && !state.installed.includes("ssd")) state.phase = "SELECT_SSD";
  else if (index >= PHASES.indexOf("RAM_ORDER") && !state.hddDone) state.phase = "FINAL_QUESTION";
  else if (index >= PHASES.indexOf("REMOVE_RAM") && !state.ramFound) state.phase = "FIND_RAM";
  else if (index >= PHASES.indexOf("SELECT_RAM") && !removedRam) state.phase = "REMOVE_RAM";
  else if (index >= PHASES.indexOf("RAM_TEST") && (!state.ramReplaced || !state.installed.includes("ram"))) state.phase = "SELECT_RAM";
  else if (index >= PHASES.indexOf("MOUSE_ORDER") && !state.ramDone) state.phase = "RAM_QUESTION";
  else if (index >= PHASES.indexOf("CONNECT_MOUSE") && !state.mouseFound) state.phase = "FIND_MOUSE";
  else if (index >= PHASES.indexOf("MOUSE_TEST") && !state.mouseConnected) state.phase = "CONNECT_MOUSE";
  else if (index >= PHASES.indexOf("MOUSE_QUESTION") && !state.mouseTested) state.phase = "MOUSE_TEST";
  else if (state.phase === "COMPLETED" && !state.completed) state.phase = "MOUSE_QUESTION";
  if (removedHdd) state.installed = state.installed.filter((id) => id !== "hdd");
  if (removedRam && !state.ramReplaced) state.installed = state.installed.filter((id) => id !== "ram");
  if (["FIND_HDD", "REMOVE_HDD", "SELECT_SSD", "INSTALL_SSD", "FIND_RAM", "REMOVE_RAM", "SELECT_RAM", "INSTALL_RAM"].includes(state.phase)) { state.powered = false; state.plugged = false; }
  if (state.phase === "CONNECT_POWER") state.powerReturn = state.ramReplaced ? "RAM_TEST" : state.installed.includes("ssd") ? "FINAL_TEST" : "POWER_ON";
  if (state.powered && !state.plugged) state.powered = false;
  const needsPower = { POWER_ON: "POWER_ON", CLIENT_ORDER: "POWER_ON", FINAL_TEST: "FINAL_TEST", FINAL_QUESTION: "FINAL_TEST", RAM_ORDER: "FINAL_TEST", RAM_TEST: "RAM_TEST", RAM_QUESTION: "RAM_TEST", MOUSE_ORDER: "RAM_TEST", FIND_MOUSE: "RAM_TEST", CONNECT_MOUSE: "RAM_TEST", MOUSE_TEST: "RAM_TEST", MOUSE_QUESTION: "RAM_TEST", COMPLETED: "RAM_TEST" }[state.phase];
  if (needsPower && !state.plugged) state = connectFor(state, needsPower);
  else if (needsPower && !state.powered && !["POWER_ON", "FINAL_TEST", "RAM_TEST"].includes(state.phase)) state.phase = needsPower;
  return state;
}

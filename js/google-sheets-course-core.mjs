import {
  GOOGLE_SHEETS_COURSE_DATA_VERSION,
  GOOGLE_SHEETS_PRACTICE_ACTIONS,
  googleSheetsFinalChallenge,
  googleSheetsLessons
} from "./google-sheets-course-data.mjs";

export const GOOGLE_SHEETS_COURSE_STORAGE_KEY = "central-jogos.google-sheets-course.v1";

const DEFAULT_FORMAT = Object.freeze({
  bold: false,
  italic: false,
  underline: false,
  fontSize: 10,
  textColor: "#202124",
  fillColor: "#ffffff",
  align: "left",
  border: "none",
  numberFormat: "plain"
});

const columnToIndex = (column) => {
  let value = 0;
  for (const character of String(column || "").toUpperCase()) value = value * 26 + character.charCodeAt(0) - 64;
  return value - 1;
};

export const indexToColumn = (index) => {
  let value = Number(index) + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

export const parseCellAddress = (address) => {
  const match = /^([A-Z]+)([1-9]\d*)$/i.exec(String(address || "").trim());
  if (!match) return null;
  return { column: match[1].toUpperCase(), columnIndex: columnToIndex(match[1]), row: Number(match[2]), rowIndex: Number(match[2]) - 1 };
};

export const cellsInRange = (start, end) => {
  const first = parseCellAddress(start);
  const last = parseCellAddress(end);
  if (!first || !last) return [];
  const minColumn = Math.min(first.columnIndex, last.columnIndex);
  const maxColumn = Math.max(first.columnIndex, last.columnIndex);
  const minRow = Math.min(first.row, last.row);
  const maxRow = Math.max(first.row, last.row);
  const cells = [];
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) cells.push(`${indexToColumn(column)}${row}`);
  }
  return cells;
};

const makeCell = (input = "", format = {}) => ({
  input: String(input ?? ""),
  value: String(input ?? ""),
  format: { ...DEFAULT_FORMAT, ...format }
});

export const createSpreadsheetState = ({ rows = 14, columns = 14, cells = {}, activeCell = "A1" } = {}) => ({
  rows,
  columns,
  cells: Object.fromEntries(Object.entries(cells).map(([address, value]) => [address, makeCell(value.input ?? value, value.format)])),
  activeCell,
  selectedCells: [activeCell],
  selectedRange: null,
  selectedRow: null,
  selectedColumn: null,
  identifiedRegion: null,
  clipboard: null,
  navigationKeys: [],
  appliedStyles: [],
  insertedRows: 0,
  insertedColumns: 0,
  lastAction: null
});

const seedCells = (state, entries) => {
  for (const [address, input] of Object.entries(entries)) state.cells[address] = makeCell(input);
  return recalculateSpreadsheet(state);
};

export const createLessonSpreadsheetState = (lessonId) => {
  const state = createSpreadsheetState();
  if ([10, 19, 20, 21, 22, 23].includes(lessonId)) seedCells(state, { A1: lessonId === 10 ? "Nome" : "Título" });
  if (lessonId === 11) seedCells(state, { B2: "Apagar" });
  if ([17, 18].includes(lessonId)) seedCells(state, { A1: "Dados" });
  if (lessonId === 24) seedCells(state, { A1: "Nome", B1: "Turma", C1: "Nota", A2: "Ana", B2: "A", C2: "9" });
  if (lessonId === 26) seedCells(state, { B2: "25" });
  if (lessonId === 27) seedCells(state, { B2: "0,25" });
  if (lessonId === 28) seedCells(state, { B2: "3", C2: "4" });
  if (lessonId === 29) seedCells(state, { B2: "10", B3: "20", B4: "30" });
  if (lessonId === 30) seedCells(state, { C2: "6", C3: "8", C4: "10" });
  if ([9, 11, 26, 27].includes(lessonId)) selectCell(state, "B2");
  if ([7].includes(lessonId)) selectCell(state, "A1");
  if (lessonId === 28) selectCell(state, "D2");
  if (lessonId === 29) selectCell(state, "B5");
  if (lessonId === 30) selectCell(state, "C5");
  return state;
};

const cloneState = (state) => structuredClone(state);

const ensureCell = (state, address) => {
  if (!state.cells[address]) state.cells[address] = makeCell();
  return state.cells[address];
};

const selectCell = (state, address) => {
  if (!parseCellAddress(address)) return false;
  state.activeCell = address;
  state.selectedCells = [address];
  state.selectedRange = null;
  state.selectedRow = null;
  state.selectedColumn = null;
  return true;
};

const numericValue = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

const arithmeticTokens = (expression) => {
  const compact = expression.replace(/\s+/g, "");
  const tokens = compact.match(/\d+(?:\.\d+)?|[()+\-*/]/g) || [];
  return tokens.join("") === compact ? tokens : null;
};

const calculateArithmetic = (expression) => {
  const tokens = arithmeticTokens(expression);
  if (!tokens) return null;
  let cursor = 0;
  const primary = () => {
    const token = tokens[cursor];
    if (token === "(") {
      cursor += 1;
      const value = addition();
      if (tokens[cursor] !== ")") throw new Error("Parêntese inválido");
      cursor += 1;
      return value;
    }
    if (token === "+" || token === "-") {
      cursor += 1;
      const value = primary();
      return token === "-" ? -value : value;
    }
    if (!/^\d/.test(token || "")) throw new Error("Número inválido");
    cursor += 1;
    return Number(token);
  };
  const multiplication = () => {
    let value = primary();
    while (tokens[cursor] === "*" || tokens[cursor] === "/") {
      const operator = tokens[cursor++];
      const right = primary();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };
  const addition = () => {
    let value = multiplication();
    while (tokens[cursor] === "+" || tokens[cursor] === "-") {
      const operator = tokens[cursor++];
      const right = multiplication();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  try {
    const value = addition();
    return cursor === tokens.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

export const evaluateCell = (state, address, stack = new Set()) => {
  const cell = state.cells[address];
  if (!cell) return "";
  const input = String(cell.input ?? "").trim();
  if (!input.startsWith("=")) return input;
  if (stack.has(address)) return "#ERRO!";
  const nextStack = new Set(stack).add(address);
  const functionMatch = /^=(SOMA|MÉDIA|MEDIA)\(([A-Z]+[1-9]\d*):([A-Z]+[1-9]\d*)\)$/i.exec(input);
  if (functionMatch) {
    const values = cellsInRange(functionMatch[2], functionMatch[3]).map((item) => numericValue(evaluateCell(state, item, nextStack)));
    if (!values.length) return "#ERRO!";
    const sum = values.reduce((total, value) => total + value, 0);
    return /^SOMA$/i.test(functionMatch[1]) ? sum : sum / values.length;
  }
  const expression = input.slice(1).replace(/[A-Z]+[1-9]\d*/gi, (reference) => {
    const value = evaluateCell(state, reference.toUpperCase(), nextStack);
    return String(numericValue(value));
  });
  const result = calculateArithmetic(expression.replace(/,/g, "."));
  return result === null ? "#ERRO!" : result;
};

export const recalculateSpreadsheet = (state) => {
  for (const [address, cell] of Object.entries(state.cells)) cell.value = evaluateCell(state, address);
  return state;
};

export const displayCellValue = (cell) => {
  if (!cell) return "";
  const format = cell.format || DEFAULT_FORMAT;
  const raw = cell.value;
  if (format.numberFormat === "currency" && raw !== "" && raw !== "#ERRO!") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numericValue(raw));
  }
  if (format.numberFormat === "percent" && raw !== "" && raw !== "#ERRO!") {
    return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(numericValue(raw));
  }
  if (typeof raw === "number") return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(raw);
  return String(raw ?? "");
};

const selectedAddresses = (state) => {
  if (state.selectedRange) return cellsInRange(state.selectedRange.start, state.selectedRange.end);
  if (state.selectedRow) return Array.from({ length: state.columns }, (_, index) => `${indexToColumn(index)}${state.selectedRow}`);
  if (state.selectedColumn) return Array.from({ length: state.rows }, (_, index) => `${state.selectedColumn}${index + 1}`);
  return state.selectedCells?.length ? state.selectedCells : [state.activeCell];
};

const moveSelection = (state, key) => {
  const current = parseCellAddress(state.activeCell) || parseCellAddress("A1");
  let row = current.row;
  let column = current.columnIndex;
  if (key === "ArrowLeft") column -= 1;
  if (key === "ArrowRight" || key === "Tab") column += 1;
  if (key === "ArrowUp") row -= 1;
  if (key === "ArrowDown" || key === "Enter") row += 1;
  column = Math.max(0, Math.min(state.columns - 1, column));
  row = Math.max(1, Math.min(state.rows, row));
  selectCell(state, `${indexToColumn(column)}${row}`);
};

const shiftForInsertion = (state, kind) => {
  const active = parseCellAddress(state.activeCell) || parseCellAddress("A1");
  const shifted = {};
  for (const [address, cell] of Object.entries(state.cells)) {
    const parsed = parseCellAddress(address);
    if (!parsed) continue;
    const nextAddress = kind === "row" && parsed.row >= active.row
      ? `${parsed.column}${parsed.row + 1}`
      : kind === "column" && parsed.columnIndex >= active.columnIndex
        ? `${indexToColumn(parsed.columnIndex + 1)}${parsed.row}`
        : address;
    shifted[nextAddress] = cell;
  }
  state.cells = shifted;
  if (kind === "row") {
    state.rows += 1;
    state.insertedRows += 1;
  } else {
    state.columns += 1;
    state.insertedColumns += 1;
  }
};

export const reduceSpreadsheet = (state, event) => {
  const next = cloneState(state);
  if (!event || !GOOGLE_SHEETS_PRACTICE_ACTIONS.includes(event.type)) return next;
  const payload = event.payload || {};
  let changed = false;

  if (event.type === "app:identify") { next.identifiedRegion = "app"; changed = true; }
  else if (event.type === "row:identify" && Number(payload.row) > 0) { next.identifiedRegion = `row-${payload.row}`; changed = true; }
  else if (event.type === "column:identify" && /^[A-Z]+$/.test(payload.column || "")) { next.identifiedRegion = `column-${payload.column}`; changed = true; }
  else if (event.type === "cell:identify" && parseCellAddress(payload.cell)) { selectCell(next, payload.cell); next.identifiedRegion = `cell-${payload.cell}`; changed = true; }
  else if (event.type === "name-box:identify") { next.identifiedRegion = "name-box"; changed = true; }
  else if (event.type === "formula-bar:identify") { next.identifiedRegion = "formula-bar"; changed = true; }
  else if (event.type === "cell:select" && parseCellAddress(payload.cell)) changed = selectCell(next, payload.cell);
  else if (["cell:input", "cell:edit", "formula:input"].includes(event.type)) {
    const address = String(payload.cell || next.activeCell).toUpperCase();
    const input = String(payload.input ?? "").slice(0, 200);
    const previousInput = next.cells[address]?.input || "";
    const validInput = event.type === "formula:input" ? input.startsWith("=") : input.trim().length > 0;
    const validEdit = event.type !== "cell:edit" || (previousInput.trim().length > 0 && previousInput !== input);
    if (parseCellAddress(address) && validInput && validEdit) {
      ensureCell(next, address).input = input;
      selectCell(next, address);
      changed = true;
    }
  } else if (event.type === "cell:clear") {
    const address = String(payload.cell || next.activeCell).toUpperCase();
    if (next.cells[address]?.input) {
      next.cells[address] = makeCell();
      selectCell(next, address);
      changed = true;
    }
  } else if (event.type === "navigation:key" && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Enter"].includes(payload.key)) {
    moveSelection(next, payload.key);
    if (!next.navigationKeys.includes(payload.key)) next.navigationKeys.push(payload.key);
    changed = true;
  } else if (event.type === "row:select" && Number(payload.row) > 0) {
    next.selectedRow = Number(payload.row); next.selectedColumn = null; next.selectedRange = null; next.selectedCells = []; next.activeCell = `A${payload.row}`; changed = true;
  } else if (event.type === "column:select" && /^[A-Z]+$/.test(payload.column || "")) {
    next.selectedColumn = payload.column; next.selectedRow = null; next.selectedRange = null; next.selectedCells = []; next.activeCell = `${payload.column}1`; changed = true;
  } else if (event.type === "range:select") {
    const addresses = cellsInRange(payload.start, payload.end);
    if (addresses.length > 1) {
      next.selectedRange = { start: payload.start, end: payload.end }; next.selectedCells = addresses; next.selectedRow = null; next.selectedColumn = null; next.activeCell = payload.start; changed = true;
    }
  } else if (event.type === "multi:select" && parseCellAddress(payload.cell) && payload.ctrlKey) {
    const cells = new Set(next.selectedCells?.length ? next.selectedCells : [next.activeCell]);
    cells.add(payload.cell);
    next.selectedCells = [...cells]; next.selectedRange = null; next.selectedRow = null; next.selectedColumn = null; next.activeCell = payload.cell; changed = cells.size >= 2;
  } else if (["clipboard:copy", "clipboard:cut"].includes(event.type)) {
    const source = next.activeCell;
    const cell = ensureCell(next, source);
    if (cell.input) {
      next.clipboard = { source, mode: event.type === "clipboard:cut" ? "cut" : "copy", cell: cloneState(cell) };
      changed = true;
    }
  } else if (event.type === "clipboard:paste" && next.clipboard) {
    const target = String(payload.target || next.activeCell).toUpperCase();
    if (parseCellAddress(target)) {
      next.cells[target] = cloneState(next.clipboard.cell);
      if (next.clipboard.mode === "cut" && next.clipboard.source !== target) next.cells[next.clipboard.source] = makeCell();
      const mode = next.clipboard.mode;
      next.clipboard = mode === "cut" ? null : next.clipboard;
      selectCell(next, target);
      payload.mode = payload.mode || mode;
      changed = true;
    }
  } else if (event.type === "format:style" && ["bold", "italic", "underline"].includes(payload.style)) {
    for (const address of selectedAddresses(next)) ensureCell(next, address).format[payload.style] = payload.enabled !== false;
    if (!next.appliedStyles.includes(payload.style)) next.appliedStyles.push(payload.style);
    changed = true;
  } else if (event.type === "format:font-size" && Number(payload.size) >= 6 && Number(payload.size) <= 72) {
    for (const address of selectedAddresses(next)) ensureCell(next, address).format.fontSize = Number(payload.size);
    changed = true;
  } else if (event.type === "format:text-color" && /^#[0-9a-f]{6}$/i.test(payload.color || "")) {
    for (const address of selectedAddresses(next)) ensureCell(next, address).format.textColor = payload.color;
    changed = true;
  } else if (event.type === "format:fill-color" && /^#[0-9a-f]{6}$/i.test(payload.color || "")) {
    for (const address of selectedAddresses(next)) ensureCell(next, address).format.fillColor = payload.color;
    changed = true;
  } else if (event.type === "format:align" && ["left", "center", "right"].includes(payload.align)) {
    for (const address of selectedAddresses(next)) ensureCell(next, address).format.align = payload.align;
    changed = true;
  } else if (event.type === "format:border" && payload.border === "all") {
    for (const address of selectedAddresses(next)) ensureCell(next, address).format.border = "all";
    changed = true;
  } else if (event.type === "sheet:insert" && ["row", "column"].includes(payload.kind)) {
    shiftForInsertion(next, payload.kind);
    changed = true;
  } else if (event.type === "format:number" && ["currency", "percent"].includes(payload.format)) {
    for (const address of selectedAddresses(next)) ensureCell(next, address).format.numberFormat = payload.format;
    changed = true;
  }

  if (changed) {
    next.lastAction = { type: event.type, payload: { ...payload } };
    recalculateSpreadsheet(next);
  }
  return next;
};

const normalizedFormula = (input) => String(input || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "");

export const practiceMatches = (lesson, event, previous, next) => {
  if (!lesson || event?.type !== lesson.practice.expectedAction || JSON.stringify(previous) === JSON.stringify(next)) return false;
  const expected = lesson.practice.expectedPayload || {};
  if (!Object.entries(expected).every(([key, value]) => event.payload?.[key] === value)) return false;
  const cell = (address) => next.cells[address] || makeCell();
  switch (lesson.id) {
    case 1: return next.identifiedRegion === "app";
    case 2: return next.identifiedRegion === "row-1";
    case 3: return next.identifiedRegion === "column-A";
    case 4: return next.activeCell === "B3" && next.identifiedRegion === "cell-B3";
    case 5: return next.identifiedRegion === "name-box";
    case 6: return next.identifiedRegion === "formula-bar";
    case 7: return next.activeCell === "C3";
    case 8: return cell("A1").input.trim().length >= 3 && !/^[-+]?\d+(?:[.,]\d+)?$/.test(cell("A1").input.trim());
    case 9: return /^[-+]?\d+(?:[.,]\d+)?$/.test(cell("B2").input.trim());
    case 10: return cell("A1").input.trim().length >= 3 && cell("A1").input !== previous.cells.A1?.input;
    case 11: return !cell("B2").input;
    case 12: return next.navigationKeys.some((key) => key.startsWith("Arrow")) && next.navigationKeys.includes("Tab") && next.navigationKeys.includes("Enter");
    case 13: return next.selectedRow === 1;
    case 14: return next.selectedColumn === "A";
    case 15: return next.selectedRange?.start === "A1" && next.selectedRange?.end === "C3";
    case 16: return next.selectedCells.includes("A1") && next.selectedCells.includes("C3");
    case 17: return cell("A1").input && cell("A1").input === cell("B1").input && next.lastAction?.payload?.mode === "copy";
    case 18: return !cell("A1").input && Boolean(cell("B1").input) && next.lastAction?.payload?.mode === "cut";
    case 19: return ["bold", "italic", "underline"].every((style) => cell("A1").format[style]);
    case 20: return cell("A1").format.fontSize === 14;
    case 21: return cell("A1").format.textColor.toLowerCase() === "#1a73e8";
    case 22: return cell("A1").format.fillColor.toLowerCase() === "#fce8b2";
    case 23: return cell("A1").format.align === "center";
    case 24: return cellsInRange("A1", "C3").every((address) => cell(address).format.border === "all");
    case 25: return next.insertedRows >= 1 && next.insertedColumns >= 1;
    case 26: return cell("B2").format.numberFormat === "currency";
    case 27: return cell("B2").format.numberFormat === "percent";
    case 28: return normalizedFormula(cell("D2").input) === "=B2*C2" && numericValue(cell("D2").value) === 12;
    case 29: return normalizedFormula(cell("B5").input) === "=SOMA(B2:B4)" && numericValue(cell("B5").value) === 60;
    case 30: return normalizedFormula(cell("C5").input) === "=MEDIA(C2:C4)" && numericValue(cell("C5").value) === 8;
    default: return false;
  }
};

export const validateFinalChallenge = (state) => {
  const input = (address) => state.cells[address]?.input?.trim() || "";
  const format = (address) => state.cells[address]?.format || DEFAULT_FORMAT;
  const headings = ["A1", "B1", "C1", "D1"];
  const dataCells = ["A2", "B2", "C2", "A3", "B3", "C3"];
  const formulas = Object.values(state.cells).map((cell) => normalizedFormula(cell.input));
  return {
    headings: headings.every((address) => input(address).length >= 3),
    data: dataCells.filter((address) => input(address)).length >= 6,
    bold: headings.every((address) => format(address).bold),
    fill: headings.every((address) => format(address).fillColor !== "#ffffff"),
    borders: cellsInRange("A1", "D3").every((address) => format(address).border === "all"),
    alignment: headings.every((address) => format(address).align === "center"),
    currency: ["C2", "C3"].every((address) => format(address).numberFormat === "currency"),
    percent: Object.values(state.cells).some((cell) => cell.format?.numberFormat === "percent"),
    multiply: formulas.some((formula) => /^=[A-Z]+\d+\*[A-Z]+\d+$/.test(formula)),
    functions: formulas.some((formula) => formula.startsWith("=SOMA(")) && formulas.some((formula) => formula.startsWith("=MEDIA("))
  };
};

export const createFinalChallengeProgress = () => {
  const state = createSpreadsheetState({ rows: 16, columns: 14 });
  return { state, goals: validateFinalChallenge(state), completed: false, completedAt: null };
};

export const isFinalChallengeComplete = (state) => Object.values(validateFinalChallenge(state)).every(Boolean);

export const createLessonProgress = (lessonId) => ({
  watched: false,
  questionCompleted: false,
  questionCompletedByStudent: false,
  practiceCompleted: false,
  completed: false,
  completedByTeacher: false,
  questionAttempts: 0,
  incorrectAttempts: 0,
  demoStep: 0,
  practiceState: createLessonSpreadsheetState(lessonId)
});

export const createInitialCourseState = (lessons = googleSheetsLessons) => ({
  version: GOOGLE_SHEETS_COURSE_DATA_VERSION,
  view: "intro",
  currentLessonId: lessons[0]?.id || 1,
  stage: "watch",
  lessons: Object.fromEntries(lessons.map((item) => [item.id, createLessonProgress(item.id)])),
  finalChallenge: createFinalChallengeProgress()
});

const sanitizeCell = (value) => makeCell(String(value?.input || "").slice(0, 200), value?.format || {});

const sanitizeSpreadsheet = (value, fallback) => {
  if (!value || typeof value !== "object") return fallback;
  const rows = Math.max(1, Math.min(100, Number(value.rows) || fallback.rows));
  const columns = Math.max(1, Math.min(26, Number(value.columns) || fallback.columns));
  const cells = {};
  for (const [address, cell] of Object.entries(value.cells || {}).slice(0, 2600)) {
    const parsed = parseCellAddress(address);
    if (parsed && parsed.row <= rows && parsed.columnIndex < columns) cells[address] = sanitizeCell(cell);
  }
  const state = createSpreadsheetState({ rows, columns, cells, activeCell: parseCellAddress(value.activeCell) ? value.activeCell : fallback.activeCell });
  state.selectedCells = Array.isArray(value.selectedCells) ? value.selectedCells.filter((address) => parseCellAddress(address)).slice(0, 100) : [state.activeCell];
  state.selectedRange = value.selectedRange && cellsInRange(value.selectedRange.start, value.selectedRange.end).length ? { start: value.selectedRange.start, end: value.selectedRange.end } : null;
  state.selectedRow = Number(value.selectedRow) > 0 ? Number(value.selectedRow) : null;
  state.selectedColumn = /^[A-Z]+$/.test(value.selectedColumn || "") ? value.selectedColumn : null;
  state.identifiedRegion = typeof value.identifiedRegion === "string" ? value.identifiedRegion : null;
  state.navigationKeys = Array.isArray(value.navigationKeys) ? value.navigationKeys.filter((key) => ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Enter"].includes(key)) : [];
  state.appliedStyles = Array.isArray(value.appliedStyles) ? value.appliedStyles.filter((style) => ["bold", "italic", "underline"].includes(style)) : [];
  state.insertedRows = Math.max(0, Number(value.insertedRows) || 0);
  state.insertedColumns = Math.max(0, Number(value.insertedColumns) || 0);
  return recalculateSpreadsheet(state);
};

const sanitizeLessonProgress = (value, lesson) => {
  const initial = createLessonProgress(lesson.id);
  if (!value) return initial;
  const watched = Boolean(value.watched);
  const questionCompleted = watched && Boolean(value.questionCompleted);
  const practiceCompleted = questionCompleted && Boolean(value.practiceCompleted);
  return {
    ...initial,
    watched,
    questionCompleted,
    questionCompletedByStudent: questionCompleted && Boolean(value.questionCompletedByStudent),
    practiceCompleted,
    completed: watched && questionCompleted && practiceCompleted && Boolean(value.completed),
    completedByTeacher: Boolean(value.completedByTeacher),
    questionAttempts: Math.max(0, Number(value.questionAttempts) || 0),
    incorrectAttempts: Math.max(0, Number(value.incorrectAttempts) || 0),
    demoStep: Math.max(0, Number(value.demoStep) || 0),
    practiceState: sanitizeSpreadsheet(value.practiceState, initial.practiceState)
  };
};

export const sanitizeCourseState = (value, lessons = googleSheetsLessons) => {
  const initial = createInitialCourseState(lessons);
  if (!value || value.version !== GOOGLE_SHEETS_COURSE_DATA_VERSION) return initial;
  const lessonProgress = Object.fromEntries(lessons.map((lesson) => [lesson.id, sanitizeLessonProgress(value.lessons?.[lesson.id], lesson)]));
  const firstIncomplete = lessons.findIndex((lesson) => !lessonProgress[lesson.id].completed);
  const requested = lessons.findIndex((lesson) => lesson.id === value.currentLessonId);
  const currentIndex = firstIncomplete < 0 ? Math.max(0, requested) : Math.min(Math.max(0, requested), firstIncomplete);
  const currentLessonId = lessons[currentIndex]?.id || 1;
  const current = lessonProgress[currentLessonId];
  let stage = ["watch", "question", "practice"].includes(value.stage) ? value.stage : "watch";
  if (stage === "question" && !current.watched) stage = "watch";
  if (stage === "practice" && !current.questionCompleted) stage = current.watched ? "question" : "watch";
  const challengeState = sanitizeSpreadsheet(value.finalChallenge?.state, initial.finalChallenge.state);
  const goals = validateFinalChallenge(challengeState);
  const finalChallenge = { state: challengeState, goals, completed: Object.values(goals).every(Boolean), completedAt: value.finalChallenge?.completedAt || null };
  const allCompleted = lessons.every((lesson) => lessonProgress[lesson.id].completed);
  let view = ["intro", "lesson", "challenge", "result"].includes(value.view) ? value.view : "intro";
  if ((view === "challenge" || view === "result") && !allCompleted) view = "lesson";
  if (view === "result" && !finalChallenge.completed) view = "challenge";
  return { ...initial, view, currentLessonId, stage, lessons: lessonProgress, finalChallenge };
};

export const markLessonCompleteByTeacher = (state, lessonId) => {
  if (!state.lessons[lessonId]) return state;
  const next = cloneState(state);
  Object.assign(next.lessons[lessonId], {
    watched: true,
    questionCompleted: true,
    questionCompletedByStudent: false,
    practiceCompleted: true,
    completed: true,
    completedByTeacher: true
  });
  return next;
};

export const resetLessonInState = (state, lessonId) => {
  if (!state.lessons[lessonId]) return state;
  const next = cloneState(state);
  next.lessons[lessonId] = createLessonProgress(lessonId);
  next.currentLessonId = lessonId;
  next.stage = "watch";
  next.view = "lesson";
  next.finalChallenge = createFinalChallengeProgress();
  return next;
};

export const updateFinalChallenge = (progress, event) => {
  const state = reduceSpreadsheet(progress.state, event);
  const goals = validateFinalChallenge(state);
  const completed = Object.values(goals).every(Boolean);
  return { state, goals, completed, completedAt: completed ? progress.completedAt || new Date().toISOString() : null };
};

export const courseStats = (state, lessons = googleSheetsLessons) => {
  const progress = lessons.map((lesson) => state.lessons[lesson.id]);
  const student = progress.filter((item) => !item.completedByTeacher);
  const questionAttempts = student.reduce((total, item) => total + item.questionAttempts, 0);
  const correctAnswers = student.filter((item) => item.questionCompletedByStudent).length;
  return {
    completedLessons: progress.filter((item) => item.completed).length,
    correctAnswers,
    questionAttempts,
    accuracy: questionAttempts ? Math.round((correctAnswers / questionAttempts) * 100) : 0,
    completedPractices: student.filter((item) => item.practiceCompleted).length,
    teacherCompleted: progress.filter((item) => item.completedByTeacher).length,
    finalChallengeCompleted: Boolean(state.finalChallenge.completed)
  };
};

export const rebuildDemoState = (lesson, completedSteps) => {
  let state = createLessonSpreadsheetState(lesson.id);
  for (const step of lesson.demo.steps.slice(0, completedSteps)) {
    if (step.effect) state = reduceSpreadsheet(state, step.effect);
  }
  return state;
};

export { googleSheetsFinalChallenge };

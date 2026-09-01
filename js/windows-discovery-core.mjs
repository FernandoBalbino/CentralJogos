import { WINDOWS_DISCOVERY_DATA_VERSION } from "./windows-discovery-data.mjs";

export const WINDOWS_DISCOVERY_STORAGE_KEY = "central-jogos.windows-discovery.v1";
export const WORD_SEARCH_SIZE = 20;
export const WORD_SEARCH_COUNT = 15;
export const WORD_SEARCH_VISIBLE_COUNT = 13;
export const WORD_SEARCH_HIDDEN_COUNT = WORD_SEARCH_COUNT - WORD_SEARCH_VISIBLE_COUNT;
export const WORD_SEARCH_DIRECTIONS = Object.freeze([
  Object.freeze({ row: 0, column: 1, name: "horizontal" }),
  Object.freeze({ row: 1, column: 0, name: "vertical" }),
  Object.freeze({ row: 1, column: 1, name: "diagonal-direita" }),
  Object.freeze({ row: 1, column: -1, name: "diagonal-esquerda" })
]);

export const normalizeGridWord = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Za-z]/g, "")
  .toUpperCase();

const hashSeed = (seed) => {
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createSeededRandom = (seed) => {
  let value = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

export const createRandomSeed = (cryptoSource = globalThis.crypto) => {
  if (cryptoSource?.getRandomValues) {
    const values = new Uint32Array(4);
    cryptoSource.getRandomValues(values);
    return [...values].map((value) => value.toString(16).padStart(8, "0")).join("");
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

export const shuffleWithRandom = (values, random) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
};

export const buildQuizOrder = (lesson, quizSeed) => shuffleWithRandom(
  lesson.options,
  createSeededRandom(`${quizSeed}:${lesson.id}`)
);

const createEmptyGrid = () => Array.from({ length: WORD_SEARCH_SIZE }, () => Array(WORD_SEARCH_SIZE).fill(""));

const cellKey = ({ row, column }) => `${row}:${column}`;

const buildCells = (startRow, startColumn, direction, length) => Array.from({ length }, (_, index) => ({
  row: startRow + direction.row * index,
  column: startColumn + direction.column * index
}));

const fitsGrid = (cells) => cells.every(({ row, column }) => (
  row >= 0 && row < WORD_SEARCH_SIZE && column >= 0 && column < WORD_SEARCH_SIZE
));

const canPlace = (grid, word, cells) => fitsGrid(cells) && cells.every((cell, index) => {
  const current = grid[cell.row][cell.column];
  return current === "" || current === word[index];
});

const placeWord = (grid, word, cells) => cells.forEach((cell, index) => {
  grid[cell.row][cell.column] = word[index];
});

const findOccurrences = (grid, word) => {
  const results = [];
  for (const direction of WORD_SEARCH_DIRECTIONS) {
    for (let row = 0; row < WORD_SEARCH_SIZE; row += 1) {
      for (let column = 0; column < WORD_SEARCH_SIZE; column += 1) {
        const cells = buildCells(row, column, direction, word.length);
        if (!fitsGrid(cells)) continue;
        if (cells.every((cell, index) => grid[cell.row][cell.column] === word[index])) results.push(cells);
      }
    }
  }
  return results;
};

const sameCells = (left, right) => left.length === right.length && left.every((cell, index) => (
  cell.row === right[index].row && cell.column === right[index].column
));

const fillGrid = (grid, random) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return grid.map((row) => row.map((cell) => cell || alphabet[Math.floor(random() * alphabet.length)]));
};

const selectLessons = (lessons, seed) => {
  const eligible = lessons.filter((item) => normalizeGridWord(item.gridWord || item.term).length <= WORD_SEARCH_SIZE);
  if (eligible.length < WORD_SEARCH_COUNT) throw new Error("O banco precisa ter pelo menos 15 termos compatíveis com a grade.");
  return shuffleWithRandom(eligible, createSeededRandom(`${seed}:selection`)).slice(0, WORD_SEARCH_COUNT);
};

export const createWordSearch = (lessons, seed) => {
  const selected = selectLessons(lessons, seed);
  const ordered = [...selected].sort((left, right) => right.gridWord.length - left.gridWord.length);

  for (let puzzleAttempt = 0; puzzleAttempt < 80; puzzleAttempt += 1) {
    const random = createSeededRandom(`${seed}:puzzle:${puzzleAttempt}`);
    const grid = createEmptyGrid();
    const placements = [];
    let failed = false;

    for (const item of ordered) {
      const candidates = [];
      for (const direction of WORD_SEARCH_DIRECTIONS) {
        for (let row = 0; row < WORD_SEARCH_SIZE; row += 1) {
          for (let column = 0; column < WORD_SEARCH_SIZE; column += 1) {
            const cells = buildCells(row, column, direction, item.gridWord.length);
            if (canPlace(grid, item.gridWord, cells)) {
              const crossings = cells.filter((cell) => grid[cell.row][cell.column] !== "").length;
              candidates.push({ cells, direction, crossings, tie: random() });
            }
          }
        }
      }
      candidates.sort((left, right) => right.crossings - left.crossings || left.tie - right.tie);
      const candidate = candidates[0];
      if (!candidate) {
        failed = true;
        break;
      }
      placeWord(grid, item.gridWord, candidate.cells);
      placements.push({
        id: item.id,
        term: item.term,
        gridWord: item.gridWord,
        direction: candidate.direction.name,
        cells: candidate.cells
      });
    }
    if (failed) continue;

    for (let fillAttempt = 0; fillAttempt < 100; fillAttempt += 1) {
      const filledGrid = fillGrid(grid, createSeededRandom(`${seed}:fill:${puzzleAttempt}:${fillAttempt}`));
      const hasExactOccurrences = placements.every((placement) => {
        const occurrences = findOccurrences(filledGrid, placement.gridWord);
        return occurrences.length === 1 && sameCells(occurrences[0], placement.cells);
      });
      if (!hasExactOccurrences) continue;
      const byId = new Map(selected.map((item) => [item.id, item]));
      return {
        version: WINDOWS_DISCOVERY_DATA_VERSION,
        seed,
        size: WORD_SEARCH_SIZE,
        grid: filledGrid,
        words: selected.map((item) => ({ id: item.id, term: item.term, gridWord: item.gridWord })),
        placements: placements.sort((left, right) => selected.findIndex((item) => item.id === left.id) - selected.findIndex((item) => item.id === right.id)),
        createdAt: Date.now(),
        lessonOrder: [...byId.keys()]
      };
    }
  }
  throw new Error("Não foi possível gerar uma grade válida. Tente uma nova semente.");
};

export const partitionPuzzleWords = (puzzle) => {
  const words = Array.isArray(puzzle?.words) ? puzzle.words : [];
  return {
    visibleWords: words.slice(0, WORD_SEARCH_VISIBLE_COUNT),
    hiddenWords: words.slice(WORD_SEARCH_VISIBLE_COUNT, WORD_SEARCH_COUNT)
  };
};

export const appendSelection = (selection, cell) => {
  const current = Array.isArray(selection) ? selection : [];
  if (!Number.isInteger(cell?.row) || !Number.isInteger(cell?.column)) return { ok: false, reason: "Célula inválida.", selection: current };
  if (cell.row < 0 || cell.row >= WORD_SEARCH_SIZE || cell.column < 0 || cell.column >= WORD_SEARCH_SIZE) return { ok: false, reason: "Célula fora da grade.", selection: current };
  if (current.some((item) => item.row === cell.row && item.column === cell.column)) return { ok: false, reason: "Essa letra já está selecionada.", selection: current };
  if (current.length === 0) return { ok: true, selection: [cell], direction: null };

  const first = current[0];
  const second = current[1];
  const direction = second ? { row: second.row - first.row, column: second.column - first.column } : {
    row: cell.row - first.row,
    column: cell.column - first.column
  };
  if (!WORD_SEARCH_DIRECTIONS.some((item) => item.row === direction.row && item.column === direction.column)) {
    return { ok: false, reason: "Escolha uma letra ao lado, para a direita ou para baixo.", selection: current };
  }
  const previous = current[current.length - 1];
  if (cell.row !== previous.row + direction.row || cell.column !== previous.column + direction.column) {
    return { ok: false, reason: "Continue na mesma direção.", selection: current };
  }
  return { ok: true, selection: [...current, cell], direction };
};

export const undoSelection = (selection) => Array.isArray(selection) ? selection.slice(0, -1) : [];

export const matchSelection = (selection, puzzle, foundIds = []) => {
  const found = new Set(foundIds);
  return puzzle?.placements?.find((placement) => !found.has(placement.id) && sameCells(selection, placement.cells)) || null;
};

const isValidPuzzle = (puzzle) => (
  puzzle
  && puzzle.version === WINDOWS_DISCOVERY_DATA_VERSION
  && typeof puzzle.seed === "string"
  && puzzle.size === WORD_SEARCH_SIZE
  && Array.isArray(puzzle.grid)
  && puzzle.grid.length === WORD_SEARCH_SIZE
  && puzzle.grid.every((row) => Array.isArray(row) && row.length === WORD_SEARCH_SIZE)
  && Array.isArray(puzzle.words)
  && puzzle.words.length === WORD_SEARCH_COUNT
  && Array.isArray(puzzle.placements)
  && puzzle.placements.length === WORD_SEARCH_COUNT
);

export const createInitialDiscoveryState = () => ({
  version: WINDOWS_DISCOVERY_DATA_VERSION,
  view: "intro",
  quizCompleted: false,
  lessonIndex: 0,
  quizCorrect: 0,
  quizSeed: createRandomSeed(),
  puzzle: null,
  foundIds: [],
  selection: [],
  elapsedSeconds: 0
});

export const sanitizeDiscoveryState = (value, lessonCount = 30) => {
  const initial = createInitialDiscoveryState();
  if (!value || value.version !== WINDOWS_DISCOVERY_DATA_VERSION) return initial;
  const quizCompleted = Boolean(value.quizCompleted);
  const lessonIndex = Math.max(0, Math.min(lessonCount - 1, Number.isInteger(value.lessonIndex) ? value.lessonIndex : 0));
  const puzzle = isValidPuzzle(value.puzzle) ? value.puzzle : null;
  const placementIds = new Set(puzzle?.placements?.map((item) => item.id) || []);
  const foundIds = Array.isArray(value.foundIds) ? [...new Set(value.foundIds.filter((id) => placementIds.has(id)))] : [];
  const allowedViews = new Set(["intro", "quiz", "quiz-result", "word-search", "word-result"]);
  let view = allowedViews.has(value.view) ? value.view : "intro";
  if (!quizCompleted && ["quiz-result", "word-search", "word-result"].includes(view)) view = "intro";
  if (!puzzle && ["word-search", "word-result"].includes(view)) view = "intro";
  if (puzzle && foundIds.length < WORD_SEARCH_COUNT && view === "word-result") view = "word-search";
  return {
    ...initial,
    view,
    quizCompleted,
    lessonIndex,
    quizCorrect: Math.max(0, Math.min(lessonCount, Number(value.quizCorrect) || 0)),
    quizSeed: typeof value.quizSeed === "string" ? value.quizSeed : initial.quizSeed,
    puzzle,
    foundIds,
    selection: [],
    elapsedSeconds: Math.max(0, Math.floor(Number(value.elapsedSeconds) || 0))
  };
};

export const coordinatesToWord = (grid, cells) => cells.map(({ row, column }) => grid[row]?.[column] || "").join("");
export const keyForCell = cellKey;

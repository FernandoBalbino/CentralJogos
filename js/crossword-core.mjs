const BLOCKED_IDS = new Set(["network-tcp", "network-udp", "network-nat", "tcp-ip"]);

const cellKey = (row, column) => `${row}:${column}`;
const readValue = (values, key) => values instanceof Map ? values.get(key) : values?.[key];

const randomIndex = (length, random) => {
  const value = Number(random());
  const safe = Number.isFinite(value) ? Math.min(Math.max(value, 0), .999999999999) : 0;
  return Math.floor(safe * length);
};

export const normalizeCrosswordAnswer = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, "");

export const shuffleCrosswordValues = (values, random = Math.random) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const getBounds = (grid) => {
  if (!grid.size) return { minRow: 0, maxRow: 0, minColumn: 0, maxColumn: 0, area: 1 };
  const cells = [...grid.values()];
  const rows = cells.map((cell) => cell.row);
  const columns = cells.map((cell) => cell.column);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minColumn = Math.min(...columns);
  const maxColumn = Math.max(...columns);
  return {
    minRow,
    maxRow,
    minColumn,
    maxColumn,
    area: (maxRow - minRow + 1) * (maxColumn - minColumn + 1)
  };
};

const cloneGrid = (grid) => new Map([...grid].map(([key, cell]) => [key, {
  ...cell,
  entryIds: [...cell.entryIds],
  directions: [...cell.directions]
}]));

const validatePlacement = (grid, answer, row, column, direction) => {
  const rowStep = direction === "down" ? 1 : 0;
  const columnStep = direction === "across" ? 1 : 0;
  const beforeKey = cellKey(row - rowStep, column - columnStep);
  const afterKey = cellKey(row + (rowStep * answer.length), column + (columnStep * answer.length));
  if (grid.has(beforeKey) || grid.has(afterKey)) return null;

  let crossings = 0;
  for (let index = 0; index < answer.length; index += 1) {
    const currentRow = row + (rowStep * index);
    const currentColumn = column + (columnStep * index);
    const key = cellKey(currentRow, currentColumn);
    const existing = grid.get(key);

    if (existing) {
      if (existing.solution !== answer[index] || existing.directions.includes(direction)) return null;
      crossings += 1;
      continue;
    }

    const sideKeys = direction === "across"
      ? [cellKey(currentRow - 1, currentColumn), cellKey(currentRow + 1, currentColumn)]
      : [cellKey(currentRow, currentColumn - 1), cellKey(currentRow, currentColumn + 1)];
    if (sideKeys.some((sideKey) => grid.has(sideKey))) return null;
  }

  if (grid.size && crossings === 0) return null;
  return { row, column, direction, crossings };
};

const findPlacements = (grid, entry, random) => {
  if (!grid.size) return [{ row: 0, column: 0, direction: "across", crossings: 0, score: 0 }];

  const placements = new Map();
  for (const cell of grid.values()) {
    for (let letterIndex = 0; letterIndex < entry.answer.length; letterIndex += 1) {
      if (entry.answer[letterIndex] !== cell.solution) continue;
      const directions = cell.directions.includes("across")
        ? (cell.directions.includes("down") ? [] : ["down"])
        : ["across"];

      for (const direction of directions) {
        const row = direction === "down" ? cell.row - letterIndex : cell.row;
        const column = direction === "across" ? cell.column - letterIndex : cell.column;
        const placement = validatePlacement(grid, entry.answer, row, column, direction);
        if (!placement) continue;
        const id = `${row}:${column}:${direction}`;
        if (placements.has(id)) continue;

        const nextGrid = cloneGrid(grid);
        placeEntry(nextGrid, entry, placement);
        const area = getBounds(nextGrid).area;
        placements.set(id, {
          ...placement,
          score: (placement.crossings * 1000) - area + (Number(random()) * 8)
        });
      }
    }
  }

  return [...placements.values()].sort((left, right) => right.score - left.score);
};

const placeEntry = (grid, entry, placement) => {
  const rowStep = placement.direction === "down" ? 1 : 0;
  const columnStep = placement.direction === "across" ? 1 : 0;
  for (let index = 0; index < entry.answer.length; index += 1) {
    const row = placement.row + (rowStep * index);
    const column = placement.column + (columnStep * index);
    const key = cellKey(row, column);
    const existing = grid.get(key);
    if (existing) {
      existing.entryIds.push(entry.id);
      existing.directions.push(placement.direction);
    } else {
      grid.set(key, {
        key,
        row,
        column,
        solution: entry.answer[index],
        entryIds: [entry.id],
        directions: [placement.direction]
      });
    }
  }
};

const searchLayout = (sample, random, nodeLimit = 12000) => {
  let visitedNodes = 0;
  const starterOrder = shuffleCrosswordValues(sample, random);

  const recurse = (grid, placements, remaining) => {
    visitedNodes += 1;
    if (visitedNodes > nodeLimit) return null;
    if (!remaining.length) return { grid, placements };

    const candidates = [];
    for (const entry of remaining) {
      const options = findPlacements(grid, entry, random);
      if (options.length) candidates.push({ entry, options });
    }
    candidates.sort((left, right) => {
      const optionDifference = left.options.length - right.options.length;
      if (optionDifference) return optionDifference;
      return right.entry.answer.length - left.entry.answer.length;
    });

    for (const candidate of candidates.slice(0, 5)) {
      const nextRemaining = remaining.filter((entry) => entry.id !== candidate.entry.id);
      for (const placement of candidate.options.slice(0, 10)) {
        const nextGrid = cloneGrid(grid);
        placeEntry(nextGrid, candidate.entry, placement);
        const result = recurse(nextGrid, [...placements, { ...candidate.entry, ...placement }], nextRemaining);
        if (result) return result;
      }
    }
    return null;
  };

  for (const starter of starterOrder.slice(0, 5)) {
    const grid = new Map();
    const placement = { row: 0, column: 0, direction: "across", crossings: 0, score: 0 };
    placeEntry(grid, starter, placement);
    const result = recurse(grid, [{ ...starter, ...placement }], sample.filter((entry) => entry.id !== starter.id));
    if (result) return result;
  }
  return null;
};

const finalizeLayout = ({ grid, placements }) => {
  const bounds = getBounds(grid);
  const translateRow = (row) => row - bounds.minRow;
  const translateColumn = (column) => column - bounds.minColumn;

  const cells = [...grid.values()].map((cell) => ({
    ...cell,
    key: cellKey(translateRow(cell.row), translateColumn(cell.column)),
    row: translateRow(cell.row),
    column: translateColumn(cell.column)
  })).sort((left, right) => left.row - right.row || left.column - right.column);

  const cellMap = new Map(cells.map((cell) => [cell.key, cell]));
  const translatedEntries = placements.map((entry) => {
    const row = translateRow(entry.row);
    const column = translateColumn(entry.column);
    const rowStep = entry.direction === "down" ? 1 : 0;
    const columnStep = entry.direction === "across" ? 1 : 0;
    const entryCells = [...entry.answer].map((solution, index) => {
      const cellRow = row + (rowStep * index);
      const cellColumn = column + (columnStep * index);
      return { key: cellKey(cellRow, cellColumn), row: cellRow, column: cellColumn, solution };
    });
    return { ...entry, row, column, cells: entryCells };
  });

  const starts = [...new Set(translatedEntries.map((entry) => cellKey(entry.row, entry.column)))]
    .map((key) => cellMap.get(key))
    .sort((left, right) => left.row - right.row || left.column - right.column);
  const numberByStart = new Map(starts.map((cell, index) => [cell.key, index + 1]));
  const entries = translatedEntries
    .map((entry) => ({ ...entry, number: numberByStart.get(cellKey(entry.row, entry.column)) }))
    .sort((left, right) => left.number - right.number || (left.direction === "across" ? -1 : 1));

  const numberedCells = cells.map((cell) => ({
    ...cell,
    number: numberByStart.get(cell.key) || null
  }));
  const rows = bounds.maxRow - bounds.minRow + 1;
  const columns = bounds.maxColumn - bounds.minColumn + 1;
  const signature = entries
    .map((entry) => `${entry.id}@${entry.row},${entry.column},${entry.direction}`)
    .sort()
    .join("|");

  return { rows, columns, entries, cells: numberedCells, signature };
};

export const generateCrossword = ({
  items,
  wordCount = 10,
  random = Math.random,
  previousSignature = "",
  maxAttempts = 220
}) => {
  const eligible = items
    .filter((item) => !BLOCKED_IDS.has(item.id))
    .map((item) => ({ ...item, answer: normalizeCrosswordAnswer(item.name) }))
    .filter((item) => item.answer.length >= 2);

  if (eligible.length < wordCount) throw new Error("Banco insuficiente para gerar a cruzadinha.");

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const sample = shuffleCrosswordValues(eligible, random).slice(0, wordCount);
    const layout = searchLayout(sample, random);
    if (!layout) continue;
    const puzzle = finalizeLayout(layout);
    if (puzzle.signature !== previousSignature) return puzzle;
  }

  throw new Error("Não foi possível cruzar dez palavras. Tente gerar novamente.");
};

export const evaluateEntry = (entry, cellValues) => entry.cells.every((cell) =>
  normalizeCrosswordAnswer(readValue(cellValues, cell.key)) === cell.solution
);

export const revealHint = ({ entry, cellValues, lockedCells = new Set(), random = Math.random }) => {
  const candidates = entry.cells.filter((cell) => {
    if (lockedCells.has(cell.key)) return false;
    return normalizeCrosswordAnswer(readValue(cellValues, cell.key)) !== cell.solution;
  });
  if (!candidates.length) return null;
  const cell = candidates[randomIndex(candidates.length, random)];
  return { ...cell, value: cell.solution };
};

export const isCrosswordConnected = (puzzle) => {
  if (!puzzle.entries.length) return true;
  const entryById = new Map(puzzle.entries.map((entry) => [entry.id, entry]));
  const visited = new Set();
  const queue = [puzzle.entries[0].id];
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const entry = entryById.get(id);
    for (const cell of entry.cells) {
      const boardCell = puzzle.cells.find((candidate) => candidate.key === cell.key);
      for (const neighborId of boardCell?.entryIds || []) {
        if (!visited.has(neighborId)) queue.push(neighborId);
      }
    }
  }
  return visited.size === puzzle.entries.length;
};

export const CROSSWORD_BLOCKED_IDS = Object.freeze([...BLOCKED_IDS]);

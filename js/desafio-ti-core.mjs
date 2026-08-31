export const DESAFIO_STATE_VERSION = 1;
export const POINT_VALUES = [100, 200, 300, 400, 500];

export const shuffleValues = (values, random = Math.random) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

const pickOne = (values, random) => shuffleValues(values, random)[0];

export const selectMatchCategories = (categories, random = Math.random) => {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const selected = [byId.get("hardware")].filter(Boolean);
  const foundations = categories.filter((category) => ["software", "perifericos"].includes(category.id));
  const protection = categories.filter((category) => ["seguranca", "malware", "firewall-vpn"].includes(category.id));
  const add = (category) => {
    if (category && !selected.some((item) => item.id === category.id)) selected.push(category);
  };

  add(pickOne(foundations, random));
  add(pickOne(protection, random));
  for (const category of shuffleValues(categories, random)) {
    add(category);
    if (selected.length === 6) break;
  }
  return selected;
};

export const buildMatchBoard = ({ categories, questions, random = Math.random }) => {
  const selectedCategories = selectMatchCategories(categories, random);
  const cells = selectedCategories.flatMap((category) => POINT_VALUES.map((value) => {
    const pool = questions.filter((question) => question.categoryId === category.id && question.value === value);
    if (!pool.length) throw new Error(`Sem perguntas para ${category.id} por ${value}`);
    const question = pickOne(pool, random);
    return {
      id: `${category.id}-${value}`,
      categoryId: category.id,
      value,
      questionId: question.id,
      status: "available",
      isDouble: false
    };
  }));

  const surpriseCount = 1 + Math.floor(random() * 2);
  const surpriseCandidates = shuffleValues(cells.filter((cell) => cell.value >= 200), random);
  for (const cell of surpriseCandidates.slice(0, surpriseCount)) cell.isDouble = true;
  return { categories: selectedCategories, cells };
};

export const scoreAttempt = ({ teams, teamId, correct, value, isDouble = false }) => {
  const safeValue = POINT_VALUES.includes(Number(value)) ? Number(value) : 0;
  const delta = correct ? safeValue * (isDouble ? 2 : 1) : -safeValue;
  return {
    delta,
    teams: teams.map((team) => team.id === teamId ? { ...team, score: team.score + delta } : { ...team })
  };
};

export const getNextTeamId = (teams, teamId) => {
  if (!teams.length) return null;
  const currentIndex = Math.max(0, teams.findIndex((team) => team.id === teamId));
  return teams[(currentIndex + 1) % teams.length].id;
};

export const rankTeams = (teams) => {
  const sorted = [...teams].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt-BR"));
  let previousScore = null;
  let previousRank = 0;
  return sorted.map((team, index) => {
    const rank = team.score === previousScore ? previousRank : index + 1;
    previousScore = team.score;
    previousRank = rank;
    return { ...team, rank };
  });
};

export const scoreFinalRound = (teams, results, value = 500) => teams.map((team) => {
  const result = results?.[team.id];
  if (!['correct', 'wrong'].includes(result)) throw new Error(`Resultado final ausente para ${team.id}`);
  return { ...team, score: team.score + (result === "correct" ? value : -value) };
});

export const isBoardComplete = (cells) => Boolean(cells.length) && cells.every((cell) => cell.status === "used");

const validTeam = (team) => team
  && typeof team.id === "string"
  && typeof team.name === "string"
  && Number.isFinite(team.score)
  && typeof team.color === "string";

const validCell = (cell) => cell
  && typeof cell.id === "string"
  && typeof cell.questionId === "string"
  && POINT_VALUES.includes(cell.value)
  && ["available", "active", "used"].includes(cell.status);

export const sanitizeStoredState = (candidate) => {
  if (!candidate || candidate.version !== DESAFIO_STATE_VERSION) return null;
  if (!["setup", "board", "question", "final", "result"].includes(candidate.phase)) return null;
  if (!Array.isArray(candidate.teams) || candidate.teams.length < 2 || candidate.teams.length > 6 || !candidate.teams.every(validTeam)) return null;
  if (!candidate.teams.some((team) => team.id === candidate.currentTeamId)) return null;
  if (!Array.isArray(candidate.cells) || candidate.cells.length !== 30 || !candidate.cells.every(validCell)) return null;
  if (!Array.isArray(candidate.categoryIds) || candidate.categoryIds.length !== 6) return null;
  const duration = [15, 30, 45, 60].includes(candidate.settings?.timerDuration) ? candidate.settings.timerDuration : 30;
  const remaining = Math.max(0, Math.min(duration, Number(candidate.timer?.remaining) || duration));
  return {
    ...candidate,
    teams: candidate.teams.map((team) => ({ ...team, score: Number(team.score) })),
    cells: candidate.cells.map((cell) => ({ ...cell })),
    settings: { timerDuration: duration, soundEnabled: candidate.settings?.soundEnabled !== false },
    timer: { duration, remaining, status: "paused" }
  };
};

export const shuffleValues = (values, random = Math.random) => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

export const selectRoundPairs = ({
  items,
  categoryIds,
  pairCount,
  usedIds = [],
  random = Math.random
}) => {
  const allowedCategories = new Set(categoryIds);
  const available = items.filter((item) => allowedCategories.has(item.category));
  const safeCount = Math.max(1, Math.min(Number(pairCount) || 12, available.length));
  const used = new Set(usedIds);
  const fresh = shuffleValues(available.filter((item) => !used.has(item.id)), random);
  const recycled = shuffleValues(available.filter((item) => used.has(item.id)), random);
  const pairs = [...fresh, ...recycled].slice(0, safeCount);

  return {
    pairs,
    usedIds: [...new Set([...usedIds, ...pairs.map((item) => item.id)])],
    recycledCount: Math.max(0, safeCount - fresh.length),
    remainingFreshCount: Math.max(0, fresh.length - safeCount)
  };
};

export const buildMemoryDeck = (pairs, random = Math.random) => shuffleValues(
  pairs.flatMap((pair) => ([
    { key: `${pair.id}:image`, pairId: pair.id, type: "image", item: pair },
    { key: `${pair.id}:definition`, pairId: pair.id, type: "definition", item: pair }
  ])),
  random
);

export const isMatchingPair = (firstCard, secondCard) => Boolean(
  firstCard
  && secondCard
  && firstCard.key !== secondCard.key
  && firstCard.pairId === secondCard.pairId
  && firstCard.type !== secondCard.type
);

export const advanceTeamIndex = (currentIndex, teamCount) => {
  if (teamCount < 1) return 0;
  return (currentIndex + 1) % teamCount;
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

export const getLeaders = (teams) => {
  const ranked = rankTeams(teams);
  return ranked.filter((team) => team.rank === 1);
};

export const getGridDimensions = (cardCount) => {
  const layouts = {
    16: { columns: 4, rows: 4 },
    20: { columns: 5, rows: 4 },
    24: { columns: 6, rows: 4 },
    30: { columns: 6, rows: 5 }
  };
  return layouts[cardCount] || {
    columns: Math.ceil(Math.sqrt(cardCount * 1.45)),
    rows: Math.ceil(cardCount / Math.ceil(Math.sqrt(cardCount * 1.45)))
  };
};

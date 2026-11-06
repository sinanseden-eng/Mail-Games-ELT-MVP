export const SNIPER_SPOTS = [
  "rooftop",
  "upper-window",
  "broken-wall",
  "supply-crates"
];

const SPOT_DATA = {
  "rooftop": { number: 1, label: "Rooftop", x: 0.19, y: 0.24 },
  "upper-window": { number: 2, label: "Upper Window", x: 0.49, y: 0.35 },
  "broken-wall": { number: 3, label: "Broken Wall", x: 0.76, y: 0.50 },
  "supply-crates": { number: 4, label: "Supply Crates", x: 0.90, y: 0.68 }
};

export function sniperSpot(id) {
  return SPOT_DATA[id] || { number: 0, label: "Unknown position", x: 0.5, y: 0.5 };
}

export function sniperSpotLabel(id) {
  return sniperSpot(id).label;
}

// Matching cover numbers belong to separate, opposing areas of the village.
export function sniperPosition(actor, id) {
  const spot = sniperSpot(id);
  const x = spot.x * 0.5;
  return { ...spot, x: actor === "B" ? 1 - x : x };
}

export function sniperRecentPositions(history = [], actor = "A") {
  const opponent = actor === "B" ? "A" : "B";
  return history.filter(item => item?.gameType === "sniper"
    && SNIPER_SPOTS.includes(item.emergenceA) && SNIPER_SPOTS.includes(item.emergenceB))
    .slice(-3).map(item => ({ round: item.round, spot: item[`emergence${opponent}`] }));
}

export function sniperShotExplanation(replay, actor) {
  if (!replay?.[`active${actor}`]) return "No shot: incorrect English answer.";
  const opponent = actor === "A" ? "B" : "A";
  const guess = sniperSpot(replay[`target${actor}`]).number;
  const actual = sniperSpot(replay[`emergence${opponent}`]).number;
  return replay[`hitBy${actor}`]
    ? `Hit: guessed ${guess}; opponent appeared at ${actual}.`
    : `Miss: guessed ${guess}; opponent appeared at ${actual}.`;
}

export function sniperOutcomeLabel(replay = {}) {
  if (replay.completed) {
    if (replay.winner === "A") return "PLAYER A WINS";
    if (replay.winner === "B") return "PLAYER B WINS";
    return "TRAINING DRAW";
  }
  if (replay.hitByA && replay.hitByB) return "DOUBLE TAG";
  if (replay.hitByA) return "PLAYER A TAGS B";
  if (replay.hitByB) return "PLAYER B TAGS A";
  if (!replay.activeA && !replay.activeB) return "BOTH SHOTS DISABLED";
  return "NO TAG THIS ROUND";
}

export function sniperTone(replay = {}) {
  if (replay.completed) return "finish";
  if (replay.hitByA || replay.hitByB) return "hit";
  if (!replay.activeA || !replay.activeB) return "futile";
  return "miss";
}

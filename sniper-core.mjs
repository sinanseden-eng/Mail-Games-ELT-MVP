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

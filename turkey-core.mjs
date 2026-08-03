export const TURKEY_MOVES = [
  { id: "wing-slap", label: "Wing Slap", type: "attack", icon: "🪽", note: "Wide, powerful attack" },
  { id: "peck", label: "Peck", type: "attack", icon: "⚡", note: "Fast close-range strike" },
  { id: "charge", label: "Charge", type: "attack", icon: "💨", note: "Heavy forward attack" },
  { id: "block", label: "Block", type: "defence", icon: "🛡", note: "Stops slap and peck" },
  { id: "duck", label: "Duck", type: "defence", icon: "↘", note: "Avoids slap and charge" },
  { id: "counter", label: "Counter", type: "defence", icon: "↩", note: "Reads the attack and answers" }
];

export function turkeyMove(id) {
  return TURKEY_MOVES.find(move => move.id === id) || {
    id: String(id || "unknown"),
    label: "Unknown move",
    type: "defence",
    icon: "?",
    note: ""
  };
}

export function turkeyMoveLabel(id) {
  return turkeyMove(id).label;
}

export function turkeyFighterName(actor) {
  return actor === "A" ? "Sir Gobbles" : "Ninja Wing";
}

export function turkeyOutcomeLabel(replay = {}) {
  if (replay.completed) {
    if (replay.winner === "A") return "SIR GOBBLES WINS";
    if (replay.winner === "B") return "NINJA WING WINS";
    return "FIGHT OVER";
  }
  const total = Number(replay.damageToA || 0) + Number(replay.damageToB || 0);
  if (total === 0) return "NO DAMAGE";
  if (replay.damageToA > replay.damageToB) return "NINJA WING LANDS IT";
  if (replay.damageToB > replay.damageToA) return "SIR GOBBLES LANDS IT";
  return "FEATHER CLASH";
}

export function turkeyTone(replay = {}) {
  if (replay.completed) return "finish";
  const total = Number(replay.damageToA || 0) + Number(replay.damageToB || 0);
  return total > 0 ? "hit" : "blocked";
}

export const SHOOTOUT_STORAGE_KEY = "mailgames.shootout.v05e";

// Calibrated goal-mouth contact points. The coordinates sit close to the
// frame while preserving clearance for the radius of a size-five football.
export const ZONES = [
  { id: "top-left", label: "Top left", u: 0.02, v: 0.075 },
  { id: "top-centre", label: "Top centre", u: 0.50, v: 0.070 },
  { id: "top-right", label: "Top right", u: 0.98, v: 0.075 },
  { id: "bottom-left", label: "Bottom left", u: 0.02, v: 0.920 },
  { id: "bottom-centre", label: "Bottom centre", u: 0.50, v: 0.910 },
  { id: "bottom-right", label: "Bottom right", u: 0.98, v: 0.920 }
];

export const CHARACTERS = {
  striker: {
    id: "mina-meteor",
    name: "Mina Meteor",
    role: "Striker",
    tagline: "Quick feet. Cooler finish."
  },
  keeper: {
    id: "zara-zero",
    name: "Zara Zero",
    role: "Goalkeeper",
    tagline: "Reads the game before it happens."
  }
};

export function createInitialShootoutState() {
  return {
    version: 1,
    kickIndex: 0,
    scoreA: 0,
    scoreB: 0,
    phase: "arrival",
    activeRole: "striker",
    shotZone: null,
    shotActive: false,
    keeperZone: null,
    keeperActive: false,
    lastResult: null,
    history: [],
    finished: false
  };
}

export function playersForKick(kickIndex) {
  const playerAIsStriker = kickIndex % 2 === 0;
  return {
    striker: playerAIsStriker ? "Player A" : "Player B",
    keeper: playerAIsStriker ? "Player B" : "Player A",
    strikerKey: playerAIsStriker ? "A" : "B"
  };
}

export function resolvePenaltyRound({
  shotZone,
  keeperZone,
  shotActive,
  keeperActive
}) {
  if (!shotActive) {
    return {
      outcome: "miss",
      reason: keeperActive ? "inactive-shot" : "both-inactive",
      goal: false,
      caption: keeperActive
        ? "OFF TARGET — the answer weakened the shot."
        : "WIDE — both moves lost their power."
    };
  }

  if (!keeperActive) {
    return {
      outcome: "goal",
      reason: "inactive-save",
      goal: true,
      caption: "GOAL — the keeper was too late."
    };
  }

  if (shotZone === keeperZone) {
    return {
      outcome: "save",
      reason: "same-zone",
      goal: false,
      caption: "SAVED — the keeper read it perfectly."
    };
  }

  return {
    outcome: "goal",
    reason: "different-zone",
    goal: true,
    caption: "GOAL — sent the keeper the wrong way."
  };
}

export function applyRoundResult(state, result) {
  const next = structuredClone(state);
  const players = playersForKick(next.kickIndex);

  if (result.goal) {
    if (players.strikerKey === "A") next.scoreA += 1;
    else next.scoreB += 1;
  }

  next.lastResult = {
    ...result,
    shotZone: next.shotZone,
    keeperZone: next.keeperZone,
    striker: players.striker,
    keeper: players.keeper
  };
  next.history.push(next.lastResult);
  next.phase = "result";
  return next;
}

export function advanceAfterReplay(state) {
  const next = structuredClone(state);
  next.kickIndex += 1;
  next.shotZone = null;
  next.shotActive = false;
  next.keeperZone = null;
  next.keeperActive = false;
  next.activeRole = "striker";
  next.finished = next.kickIndex >= 10;
  next.phase = next.finished ? "finished" : "arrival";
  return next;
}

export function getZone(id) {
  return ZONES.find(zone => zone.id === id) || ZONES[4];
}

export function zoneLabel(id) {
  return getZone(id).label;
}

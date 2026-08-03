export const PENALTY_MOVES = [
  "top-left", "top-centre", "top-right",
  "bottom-left", "bottom-centre", "bottom-right"
];

export const TURKEY_MOVES = [
  "wing-slap", "peck", "charge", "block", "duck", "counter"
];

export const SNIPER_SPOTS = [
  "rooftop", "upper-window", "broken-wall", "supply-crates"
];

const TURKEY_DAMAGE = { "wing-slap": 18, peck: 14, charge: 22 };
const TURKEY_LABELS = {
  "wing-slap": "Wing Slap",
  peck: "Peck",
  charge: "Charge",
  block: "Block",
  duck: "Duck",
  counter: "Counter"
};

export function defaultState(gameType) {
  if (gameType === "penalty") {
    return {
      kickIndex: 0,
      scoreA: 0,
      scoreB: 0,
      phase: "striker",
      shot: null,
      shotActive: false,
      shotTurnId: null,
      keeperMove: null,
      keeperActive: false,
      history: [],
      finished: false
    };
  }
  if (gameType === "sniper") {
    return {
      round: 1,
      maxRounds: 5,
      phase: "A",
      healthA: 3,
      healthB: 3,
      streakA: 0,
      streakB: 0,
      emergenceA: null,
      emergenceB: null,
      targetA: null,
      targetB: null,
      activeA: false,
      activeB: false,
      turnAId: null,
      history: [],
      finished: false,
      winner: null
    };
  }
  return {
    round: 1,
    phase: "A",
    healthA: 100,
    healthB: 100,
    streakA: 0,
    streakB: 0,
    moveA: null,
    moveB: null,
    moveATurnId: null,
    activeA: false,
    activeB: false,
    history: [],
    finished: false
  };
}

export function allowedMoves(gameType) {
  if (gameType === "penalty") return PENALTY_MOVES;
  if (gameType === "sniper") return SNIPER_SPOTS;
  return TURKEY_MOVES;
}

export function currentTurn(gameType, state) {
  if (gameType === "penalty") {
    const striker = state.kickIndex % 2 === 0 ? "A" : "B";
    return state.phase === "striker"
      ? { actor: striker, role: "striker" }
      : { actor: striker === "A" ? "B" : "A", role: "keeper" };
  }
  if (gameType === "sniper") return { actor: state.phase, role: "sniper" };
  return { actor: state.phase, role: "fighter" };
}

export function applyTurn(gameType, state, { actor, move, emergence, target, answerCorrect }) {
  const next = structuredClone(state);
  if (gameType === "penalty") return applyPenalty(next, { actor, move, answerCorrect });
  if (gameType === "sniper") return applySniper(next, { actor, emergence, target, answerCorrect });
  return applyTurkey(next, { actor, move, answerCorrect });
}

function applyPenalty(state, turn) {
  const expected = currentTurn("penalty", state);
  assertTurn(expected, turn);

  if (state.phase === "striker") {
    state.shot = turn.move;
    state.shotActive = turn.answerCorrect;
    state.phase = "keeper";
    return {
      state,
      resolved: false,
      message: turn.answerCorrect ? "The shot is live." : "The shot is futile."
    };
  }

  state.keeperMove = turn.move;
  state.keeperActive = turn.answerCorrect;
  const kickIndex = state.kickIndex;
  const striker = kickIndex % 2 === 0 ? "A" : "B";
  const keeper = striker === "A" ? "B" : "A";
  const result = resolvePenaltyResult({
    shotZone: state.shot,
    keeperZone: state.keeperMove,
    shotActive: state.shotActive,
    keeperActive: state.keeperActive
  });

  if (result.goal) state[striker === "A" ? "scoreA" : "scoreB"] += 1;

  const replay = {
    version: 1,
    gameType: "penalty",
    kickIndex,
    striker,
    keeper,
    shotZone: state.shot,
    keeperZone: state.keeperMove,
    shotActive: Boolean(state.shotActive),
    keeperActive: Boolean(state.keeperActive),
    outcome: result.outcome,
    reason: result.reason,
    goal: result.goal,
    caption: result.caption,
    message: result.message,
    scoreA: state.scoreA,
    scoreB: state.scoreB,
    resolvedAt: new Date().toISOString()
  };

  state.history.push(replay);
  state.kickIndex += 1;
  state.phase = "striker";
  state.shot = null;
  state.shotActive = false;
  state.shotTurnId = null;
  state.keeperMove = null;
  state.keeperActive = false;
  state.finished = state.kickIndex >= 10;
  return {
    state,
    resolved: true,
    message: replay.message,
    replay,
    completed: state.finished
  };
}

export function resolvePenaltyResult({ shotZone, keeperZone, shotActive, keeperActive }) {
  if (!shotActive) {
    return {
      outcome: "miss",
      reason: keeperActive ? "inactive-shot" : "both-inactive",
      goal: false,
      caption: keeperActive
        ? "OFF TARGET — the answer weakened the shot."
        : "WIDE — both moves lost their power.",
      message: keeperActive
        ? "The powerless shot is comfortably saved."
        : "Both answers were incorrect; the ball wanders wide."
    };
  }

  if (!keeperActive) {
    return {
      outcome: "goal",
      reason: "inactive-save",
      goal: true,
      caption: "GOAL — the keeper was too late.",
      message: "Goal—the incorrect keeper answer made the save futile."
    };
  }

  if (shotZone === keeperZone) {
    return {
      outcome: "save",
      reason: "same-zone",
      goal: false,
      caption: "SAVED — the keeper read it perfectly.",
      message: "Saved—the keeper predicted the exact zone."
    };
  }

  return {
    outcome: "goal",
    reason: "different-zone",
    goal: true,
    caption: "GOAL — sent the keeper the wrong way.",
    message: "Goal—the striker sent the ball away from the keeper."
  };
}

function applyTurkey(state, turn) {
  const expected = currentTurn("turkey", state);
  assertTurn(expected, turn);
  const isA = turn.actor === "A";
  state[isA ? "moveA" : "moveB"] = turn.move;
  state[isA ? "activeA" : "activeB"] = turn.answerCorrect;
  const streakKey = isA ? "streakA" : "streakB";
  state[streakKey] = turn.answerCorrect ? Number(state[streakKey] || 0) + 1 : 0;

  if (state.phase === "A") {
    state.phase = "B";
    return {
      state,
      resolved: false,
      message: turn.answerCorrect ? "The first move is live." : "The first move is futile."
    };
  }

  const round = Number(state.round || 1);
  const healthBeforeA = Number(state.healthA || 0);
  const healthBeforeB = Number(state.healthB || 0);
  const resultA = turkeyAttack(state.moveA, state.activeA, state.moveB, state.activeB);
  const resultB = turkeyAttack(state.moveB, state.activeB, state.moveA, state.activeA);
  state.healthB = Math.max(0, healthBeforeB - resultA.damage);
  state.healthA = Math.max(0, healthBeforeA - resultB.damage);
  state.finished = state.healthA <= 0 || state.healthB <= 0;

  const winner = state.finished
    ? state.healthA === state.healthB ? null : state.healthA > state.healthB ? "A" : "B"
    : null;
  const message = turkeyRoundMessage({ state, resultA, resultB });
  const caption = turkeyRoundCaption({ state, resultA, resultB, winner });
  const replay = {
    version: 1,
    gameType: "turkey",
    round,
    firstActor: "A",
    secondActor: "B",
    moveA: state.moveA,
    moveB: state.moveB,
    activeA: Boolean(state.activeA),
    activeB: Boolean(state.activeB),
    effectA: resultA.effect,
    effectB: resultB.effect,
    damageToA: resultB.damage,
    damageToB: resultA.damage,
    healthBeforeA,
    healthBeforeB,
    healthA: state.healthA,
    healthB: state.healthB,
    streakA: state.streakA,
    streakB: state.streakB,
    completed: state.finished,
    winner,
    caption,
    message,
    resolvedAt: new Date().toISOString()
  };

  state.history.push(replay);
  state.round = round + 1;
  state.phase = "A";
  state.moveA = null;
  state.moveB = null;
  state.moveATurnId = null;
  state.activeA = false;
  state.activeB = false;

  return {
    state,
    resolved: true,
    message,
    replay,
    completed: state.finished
  };
}

function applySniper(state, turn) {
  const expected = currentTurn("sniper", state);
  assertTurn(expected, turn);
  if (!SNIPER_SPOTS.includes(turn.emergence) || !SNIPER_SPOTS.includes(turn.target)) {
    const error = new Error("Choose a valid emergence position and target prediction");
    error.statusCode = 400;
    throw error;
  }

  const isA = turn.actor === "A";
  state[isA ? "emergenceA" : "emergenceB"] = turn.emergence;
  state[isA ? "targetA" : "targetB"] = turn.target;
  state[isA ? "activeA" : "activeB"] = Boolean(turn.answerCorrect);
  const streakKey = isA ? "streakA" : "streakB";
  state[streakKey] = turn.answerCorrect ? Number(state[streakKey] || 0) + 1 : 0;

  if (state.phase === "A") {
    state.phase = "B";
    return {
      state,
      resolved: false,
      message: turn.answerCorrect
        ? "Player A's training shot is active and both choices are hidden."
        : "Player A will still emerge, but the training shot is disabled."
    };
  }

  const round = Number(state.round || 1);
  const maxRounds = Math.max(1, Number(state.maxRounds || 5));
  const healthBeforeA = Math.max(0, Number(state.healthA ?? 3));
  const healthBeforeB = Math.max(0, Number(state.healthB ?? 3));
  const hitByA = Boolean(state.activeA && state.targetA === state.emergenceB);
  const hitByB = Boolean(state.activeB && state.targetB === state.emergenceA);
  state.healthB = Math.max(0, healthBeforeB - (hitByA ? 1 : 0));
  state.healthA = Math.max(0, healthBeforeA - (hitByB ? 1 : 0));

  const reachedRoundLimit = round >= maxRounds;
  state.finished = state.healthA <= 0 || state.healthB <= 0 || reachedRoundLimit;
  const winner = state.finished
    ? state.healthA === state.healthB ? null : state.healthA > state.healthB ? "A" : "B"
    : null;
  state.winner = winner;

  const caption = sniperRoundCaption({ state, hitByA, hitByB, winner, reachedRoundLimit });
  const message = sniperRoundMessage({ state, hitByA, hitByB });
  const replay = {
    version: 1,
    gameType: "sniper",
    round,
    maxRounds,
    firstActor: "A",
    secondActor: "B",
    emergenceA: state.emergenceA,
    emergenceB: state.emergenceB,
    targetA: state.targetA,
    targetB: state.targetB,
    activeA: Boolean(state.activeA),
    activeB: Boolean(state.activeB),
    hitByA,
    hitByB,
    damageToA: hitByB ? 1 : 0,
    damageToB: hitByA ? 1 : 0,
    healthBeforeA,
    healthBeforeB,
    healthA: state.healthA,
    healthB: state.healthB,
    streakA: state.streakA,
    streakB: state.streakB,
    completed: state.finished,
    winner,
    caption,
    message,
    resolvedAt: new Date().toISOString()
  };

  state.history.push(replay);
  state.round = round + 1;
  state.phase = "A";
  state.emergenceA = null;
  state.emergenceB = null;
  state.targetA = null;
  state.targetB = null;
  state.activeA = false;
  state.activeB = false;
  state.turnAId = null;

  return {
    state,
    resolved: true,
    message,
    replay,
    completed: state.finished
  };
}

function sniperRoundMessage({ state, hitByA, hitByB }) {
  const a = state.activeA
    ? hitByA ? "Player A predicted Player B's position and scores a training tag" : "Player A's prediction misses"
    : "Player A emerges but the incorrect answer disables the shot";
  const b = state.activeB
    ? hitByB ? "Player B predicted Player A's position and scores a training tag" : "Player B's prediction misses"
    : "Player B emerges but the incorrect answer disables the shot";
  return `${a}. ${b}.`;
}

function sniperRoundCaption({ state, hitByA, hitByB, winner, reachedRoundLimit }) {
  if (winner === "A") return "PLAYER A WINS THE TRAINING MATCH.";
  if (winner === "B") return "PLAYER B WINS THE TRAINING MATCH.";
  if (state.finished && reachedRoundLimit) return "TRAINING DRAW — the round limit is reached.";
  if (hitByA && hitByB) return "DOUBLE TAG — both predictions were correct.";
  if (hitByA) return "PLAYER A TAGS THE RIVAL POSITION.";
  if (hitByB) return "PLAYER B TAGS THE RIVAL POSITION.";
  if (!state.activeA && !state.activeB) return "BOTH SHOTS DISABLED — the questions win this round.";
  return "NO TAG — both predictions miss.";
}

export function turkeyAttack(attackerMove, attackerActive, defenderMove, defenderActive) {
  if (!attackerActive || !(attackerMove in TURKEY_DAMAGE)) {
    return { damage: 0, effect: attackerActive ? "defence" : "futile" };
  }
  if (!defenderActive || !["block", "duck", "counter"].includes(defenderMove)) {
    return { damage: TURKEY_DAMAGE[attackerMove], effect: "hit" };
  }
  const counters = {
    block: { "wing-slap": 0, peck: 0, charge: 10 },
    duck: { "wing-slap": 0, peck: 8, charge: 0 },
    counter: { "wing-slap": 12, peck: 0, charge: 0 }
  };
  const damage = counters[defenderMove]?.[attackerMove] ?? TURKEY_DAMAGE[attackerMove];
  return { damage, effect: damage === 0 ? "blocked" : damage < TURKEY_DAMAGE[attackerMove] ? "partial" : "hit" };
}

function turkeyRoundMessage({ state, resultA, resultB }) {
  const a = state.activeA
    ? `${TURKEY_LABELS[state.moveA] || state.moveA}${resultA.damage ? ` deals ${resultA.damage}` : " is stopped"}`
    : `${TURKEY_LABELS[state.moveA] || state.moveA} is futile`;
  const b = state.activeB
    ? `${TURKEY_LABELS[state.moveB] || state.moveB}${resultB.damage ? ` deals ${resultB.damage}` : " is stopped"}`
    : `${TURKEY_LABELS[state.moveB] || state.moveB} is futile`;
  return `Sir Gobbles: ${a}. Ninja Wing: ${b}.`;
}

function turkeyRoundCaption({ state, resultA, resultB, winner }) {
  if (winner === "A") return "SIR GOBBLES WINS — the farm erupts!";
  if (winner === "B") return "NINJA WING WINS — a lightning-fast finish!";
  if (state.finished) return "FIGHT OVER — both fighters are down.";
  if (resultA.damage === 0 && resultB.damage === 0) return "NO DAMAGE — defence rules the round.";
  if (resultA.damage > resultB.damage) return "SIR GOBBLES WINS THE EXCHANGE.";
  if (resultB.damage > resultA.damage) return "NINJA WING WINS THE EXCHANGE.";
  return "FEATHER CLASH — an even exchange.";
}

function assertTurn(expected, turn) {
  if (expected.actor !== turn.actor) {
    const error = new Error("This player is not expected to move now");
    error.statusCode = 409;
    throw error;
  }
}

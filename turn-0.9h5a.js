import { ShootoutScene } from "./shootout-scene-0.9h5a.mjs";
import { createShootoutAudio } from "./shootout-audio-0.9h5a.mjs";
import { zoneLabel } from "./shootout-core.mjs?v=0.9.29";
import { TurkeyFightScene } from "./turkey-scene.mjs?v=0.9.29";
import { createTurkeyAudio } from "./turkey-audio.mjs?v=0.9.29";
import { TURKEY_MOVES, turkeyFighterName, turkeyMove, turkeyMoveLabel, turkeyOutcomeLabel } from "./turkey-core.mjs?v=0.9.29";
import { SniperScene } from "./sniper-scene.mjs?v=0.9.29";
import { createSniperAudio } from "./sniper-audio.mjs?v=0.9.29";
import { SNIPER_SPOTS, sniperOutcomeLabel, sniperSpot, sniperSpotLabel } from "./sniper-core.mjs?v=0.9.29";
import { PENALTY_VIEWERS, perspectiveLabel } from "./penalty-perspective.mjs?v=0.9.29";

const bootState = window.__MAIL_GAMES_TURN_BOOT__ || (window.__MAIL_GAMES_TURN_BOOT__ = {});
bootState.stage = "module-loaded";

function markBoot(stage, ready = false) {
  bootState.stage = stage;
  if (ready) bootState.ready = true;
}

const app = document.getElementById("turn-app");
const token = new URLSearchParams(location.search).get("token") || "";
const elements = {
  body: document.body,
  stage: document.getElementById("game-stage"),
  gameScene: document.getElementById("game-scene"),
  layout: document.getElementById("turn-layout"),
  overlay: document.getElementById("goal-zone-overlay"),
  caption: document.getElementById("scene-caption"),
  shootoutCanvas: document.getElementById("shootout-canvas"),
  turkeyCanvas: document.getElementById("turkey-canvas"),
  turkeyFallback: document.getElementById("turkey-scene-fallback"),
  sniperCanvas: document.getElementById("sniper-canvas"),
  sniperFallback: document.getElementById("sniper-scene-fallback"),
  score: document.getElementById("turn-score"),
  scoreA: document.getElementById("score-a"),
  scoreB: document.getElementById("score-b"),
  healthA: document.getElementById("health-a"),
  healthB: document.getElementById("health-b"),
  healthTrackA: document.getElementById("health-track-a"),
  healthTrackB: document.getElementById("health-track-b"),
  nameA: document.getElementById("name-a"),
  nameB: document.getElementById("name-b"),
  round: document.getElementById("round-badge"),
  status: document.getElementById("match-status"),
  role: document.getElementById("scene-role"),
  player: document.getElementById("scene-player"),
  sound: document.getElementById("sound-toggle"),
  brand: document.getElementById("game-brand"),
  legendA: document.getElementById("legend-a"),
  legendB: document.getElementById("legend-b"),
  legendC: document.getElementById("legend-c")
};

let scene = null;
let audio = null;
let turnData = null;
let selectedAnswer = "";
let selectedMove = "";
let selectedEmergence = "";
let selectedTarget = "";
let submitting = false;

async function load() {
  if (!token) {
    markBoot("missing-token");
    try { configureGame("penalty"); } catch (error) { console.error("Scene startup failed", error); }
    fail("This email link is incomplete.");
    return;
  }

  markBoot("fetching-turn");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/.netlify/functions/get-turn?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "accept": "application/json" }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The turn could not be loaded");
    turnData = data;
    markBoot("starting-scene");
    configureGame(data.match.gameType);
    if (data.match.gameType === "penalty") renderPenaltyTurn();
    else if (data.match.gameType === "sniper") renderSniperTurn();
    else renderTurkeyTurn();
    markBoot("ready", true);
  } catch (error) {
    console.error("Secure turn startup failed", error);
    const message = error?.name === "AbortError"
      ? "The secure turn request took too long. Check the connection and reload the page."
      : (error?.message || "The turn could not be loaded");
    markBoot(error?.name === "AbortError" ? "request-timeout" : "startup-error");
    try { configureGame("penalty"); } catch (sceneError) { console.error("Fallback scene startup failed", sceneError); }
    fail(message, true);
  } finally {
    window.clearTimeout(timeout);
  }
}

function configureGame(gameType) {
  const turkey = gameType === "turkey";
  const sniper = gameType === "sniper";
  const penalty = !turkey && !sniper;

  elements.body.classList.toggle("turkey-fight-page", turkey);
  elements.body.classList.toggle("sniper-game-page", sniper);
  elements.gameScene.classList.toggle("turkey-scene", turkey);
  elements.gameScene.classList.toggle("sniper-scene", sniper);

  elements.shootoutCanvas.hidden = !penalty;
  elements.turkeyCanvas.hidden = !turkey;
  elements.sniperCanvas.hidden = !sniper;
  elements.shootoutCanvas.style.display = penalty ? "block" : "none";
  elements.turkeyCanvas.style.display = turkey ? "block" : "none";
  elements.sniperCanvas.style.display = sniper ? "block" : "none";
  elements.turkeyCanvas.toggleAttribute("aria-hidden", !turkey);
  elements.sniperCanvas.toggleAttribute("aria-hidden", !sniper);

  if (elements.turkeyFallback) {
    elements.turkeyFallback.hidden = !turkey;
    elements.turkeyFallback.toggleAttribute("aria-hidden", !turkey);
  }
  if (elements.sniperFallback) {
    elements.sniperFallback.hidden = !sniper;
    elements.sniperFallback.toggleAttribute("aria-hidden", !sniper);
  }

  elements.overlay.hidden = !penalty;
  elements.score.classList.toggle("turkey-health-score", turkey);
  elements.score.classList.toggle("sniper-health-score", sniper);
  elements.healthTrackA.hidden = penalty;
  elements.healthTrackB.hidden = penalty;

  elements.brand.textContent = penalty ? "Mail Penalty Shootout" : turkey ? "Turkey Fight Mail" : "Sniper Elite!";
  elements.legendA.innerHTML = penalty
    ? '<i class="legend-dot live"></i> Answer and choose on the pitch'
    : turkey
      ? '<i class="legend-dot live"></i> Answer and choose while the farm arena stays visible'
      : '<i class="legend-dot live"></i> Answer, choose cover, and predict the rival position';
  elements.legendB.innerHTML = '<i class="legend-dot futile"></i> Incorrect answers disable the action';
  elements.legendC.innerHTML = penalty
    ? '<i class="legend-dot net"></i> The goalkeeper sees the result immediately'
    : turkey
      ? '<i class="legend-dot net"></i> Player B watches the round; Player A gets a replay email'
      : '<i class="legend-dot net"></i> Both secret choices stay hidden until Player B submits';

  if (turkey) {
    audio = createTurkeyAudio({ button: elements.sound });
    scene = new TurkeyFightScene(elements.turkeyCanvas, elements.caption, {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onEvent: event => audio.handleEvent(event)
    });
  } else if (sniper) {
    audio = createSniperAudio({ button: elements.sound });
    scene = new SniperScene(elements.sniperCanvas, elements.caption, {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onEvent: event => audio.handleEvent(event)
    });
  } else {
    audio = createShootoutAudio({ button: elements.sound });
    scene = new ShootoutScene(elements.shootoutCanvas, elements.caption, {
      overlay: elements.overlay,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onEvent: event => audio.handleEvent(event)
    });
  }
}

function resetSelections() {
  selectedAnswer = "";
  selectedMove = "";
  selectedEmergence = "";
  selectedTarget = "";
  submitting = false;
}

function renderPenaltyTurn() {
  resetSelections();
  const { turn, match } = turnData;
  const player = match.players[turn.actor];
  const roleLabel = turn.role === "keeper" ? "Goalkeeper" : "Striker";
  const moveLabel = turn.role === "keeper" ? "dive" : "shot";
  const state = match.state || {};

  elements.nameA.textContent = match.players.A;
  elements.nameB.textContent = match.players.B;
  elements.scoreA.textContent = Number(state.scoreA || 0);
  elements.scoreB.textContent = Number(state.scoreB || 0);
  elements.round.textContent = `Kick ${Number(state.kickIndex || 0) + 1} of 10`;
  elements.status.textContent = `${player}: English challenge`;
  elements.role.textContent = `${roleLabel} turn`;
  elements.player.textContent = player;
  elements.overlay.hidden = false;
  elements.overlay.setAttribute("aria-hidden", "false");
  elements.overlay.className = "goal-zone-overlay locked game-overlay";
  clearZoneSelection();

  scene.setIdle({ role: turn.role, active: true, caption: `Answer the English question, then choose your ${moveLabel} on the pitch.` });
  const question = turn.question;
  app.innerHTML = `
    <span class="control-eyebrow">${html(roleLabel)} · secure email turn</span>
    <h1 class="control-title">${html(player)}, earn the ${html(moveLabel)}.</h1>
    <p class="control-copy">The pitch stays visible while you answer and choose. Your opponent cannot inspect your selected zone.</p>
    ${questionMarkup(question, "shootout")}
    <div class="selected-zone-card" id="selected-zone-card">Answer first, then select a zone on the goal.</div>
    <div class="control-actions"><button class="primary" id="submit-turn" type="button" disabled>Submit ${html(moveLabel)}</button></div>
    <div class="turn-submit-state" id="status">Choose or type an answer to unlock the six pitch zones.</div>`;

  bindAnswerInputs(unlockPenaltyIfReady);
  elements.overlay.querySelectorAll("[data-zone]").forEach(button => {
    button.onclick = () => {
      if (elements.overlay.classList.contains("locked") || submitting) return;
      selectedMove = button.dataset.zone || "";
      audio.handleEvent({ type: "ui-select" });
      syncZoneSelection();
      scene.setIdle({ role: turn.role, active: true, preview: selectedMove, caption: `${zoneLabel(selectedMove)} selected. Submit when ready.` });
      updatePenaltyReadyState();
    };
  });
  document.getElementById("submit-turn").addEventListener("click", submitPenaltyTurn);
}

function unlockPenaltyIfReady() {
  const ready = Boolean(currentAnswer());
  elements.overlay.classList.toggle("locked", !ready);
  elements.overlay.classList.toggle("ready", ready);
  const statusTarget = document.getElementById("status");
  const card = document.getElementById("selected-zone-card");
  if (!ready) {
    selectedMove = "";
    clearZoneSelection();
    if (statusTarget) statusTarget.textContent = "Choose or type an answer to unlock the six pitch zones.";
    if (card) card.textContent = "Answer first, then select a zone on the goal.";
    scene.setIdle({ role: turnData.turn.role, active: true, preview: null, caption: "Answer first. Aim second." });
  } else {
    if (statusTarget) statusTarget.textContent = selectedMove ? "Ready to submit." : "Now choose one of the six goal zones.";
    if (card && !selectedMove) card.textContent = `Choose your ${turnData.turn.role === "keeper" ? "dive" : "shot"} on the pitch.`;
    scene.setIdle({ role: turnData.turn.role, active: true, preview: selectedMove || null, caption: selectedMove ? `${zoneLabel(selectedMove)} selected.` : "The six zones are unlocked. Choose one." });
  }
  updatePenaltyReadyState();
}

function syncZoneSelection() {
  elements.overlay.querySelectorAll("[data-zone]").forEach(button => button.classList.toggle("selected", button.dataset.zone === selectedMove));
  const card = document.getElementById("selected-zone-card");
  if (card) card.textContent = selectedMove ? `Selected: ${zoneLabel(selectedMove)}` : "No zone selected yet.";
}

function clearZoneSelection() {
  elements.overlay.querySelectorAll("[data-zone]").forEach(button => button.classList.remove("selected"));
}

function updatePenaltyReadyState() {
  const ready = Boolean(currentAnswer() && selectedMove && !submitting);
  setSubmitReady(ready, "Answer and direction selected. Ready to submit.");
}

async function submitPenaltyTurn() {
  const answer = currentAnswer();
  if (!answer || !selectedMove || submitting) return;
  void audio.unlock();
  audio.handleEvent({ type: "ui-lock" });
  submitting = true;
  const button = document.getElementById("submit-turn");
  button.disabled = true;
  button.textContent = "Submitting…";
  elements.overlay.classList.add("resolving");
  scene.setCaption("Sending the move securely…");
  try {
    const data = await postTurn(answer, selectedMove);
    if (data.outcome?.resolved && data.outcome?.replay) await showPenaltyReplay(data);
    else showPenaltyWaiting(data);
  } catch (error) {
    submitting = false;
    elements.overlay.hidden = false;
    elements.overlay.setAttribute("aria-hidden", "false");
    elements.overlay.classList.remove("resolving");
    elements.overlay.classList.add("ready");
    button.disabled = false;
    button.textContent = `Submit ${turnData.turn.role === "keeper" ? "dive" : "shot"}`;
    showStatus(error.message, false);
  }
}

function showPenaltyWaiting(data) {
  elements.overlay.hidden = true;
  elements.overlay.setAttribute("aria-hidden", "true");
  elements.overlay.className = "goal-zone-overlay resolving game-overlay";
  elements.status.textContent = "Waiting for the goalkeeper";
  scene.setIdle({ role: "striker", active: data.answerCorrect, preview: selectedMove, caption: data.answerCorrect ? "Shot locked. The goalkeeper has been emailed." : "Attempt locked, but the incorrect answer made the shot futile." });
  app.innerHTML = waitingMarkup({
    eyebrow: "Shot locked securely",
    title: "Wait for the goalkeeper.",
    feedback: data.answerCorrect ? "Correct answer—the shot is active." : "Incorrect answer—the shot will be futile.",
    correct: data.answerCorrect,
    explanation: data.explanation,
    copy: "When the goalkeeper chooses a direction, you will receive a new email with a Watch the penalty button.",
    delivery: deliveryMessage(data.next?.email, "The goalkeeper has been emailed.")
  });
}

async function showPenaltyReplay(data) {
  const replay = data.outcome.replay;
  const viewerRole = PENALTY_VIEWERS.KEEPER;
  elements.status.textContent = "MAIN CAMERA";
  elements.role.textContent = "GOALKEEPER TURN";
  elements.overlay.hidden = true;
  elements.overlay.setAttribute("aria-hidden", "true");
  elements.overlay.className = "goal-zone-overlay resolving game-overlay";
  elements.body.classList.add("penalty-replay-running");
  app.innerHTML = `<span class="control-eyebrow">Fixed main camera · both moves locked</span><h1 class="control-title">Watch the kick and dive together.</h1><p class="control-copy">The ball travels to the stored shot coordinate while the goalkeeper commits to the stored dive coordinate. Both players watch this same camera.</p><div class="result-summary"><strong>Shot:</strong> ${html(zoneLabel(replay.shotZone))}<br /><strong>Dive:</strong> ${html(zoneLabel(replay.keeperZone))}</div>`;
  try {
    await scene.playReplay(replay, { viewerRole });
  } finally {
    elements.body.classList.remove("penalty-replay-running");
  }
  renderPenaltyResult(data);
}

function renderPenaltyResult(data) {
  const replay = data.outcome.replay;
  elements.overlay.hidden = true;
  elements.overlay.setAttribute("aria-hidden", "true");
  elements.scoreA.textContent = replay.scoreA;
  elements.scoreB.textContent = replay.scoreB;
  elements.status.textContent = replay.caption;
  elements.role.textContent = "GOALKEEPER TURN";
  scene.setResultStill?.(replay, { viewerRole: PENALTY_VIEWERS.KEEPER });
  scene.setIdle({ role: "keeper", active: true, caption: replay.caption });
  scene.setCaption(replay.caption, replay.outcome);
  app.innerHTML = `
    <span class="result-stamp ${attr(replay.outcome)}">${html(replay.outcome)}</span>
    <span class="control-eyebrow">Penalty replay · main camera</span>
    <h1 class="control-title">${html(replay.caption)}</h1>
    <div class="turn-result-grid"><div><small>Shot</small><strong>${html(zoneLabel(replay.shotZone))}</strong></div><div><small>Keeper</small><strong>${html(zoneLabel(replay.keeperZone))}</strong></div><div><small>Shot power</small><strong>${replay.shotActive ? "Active" : "Futile"}</strong></div><div><small>Save power</small><strong>${replay.keeperActive ? "Active" : "Futile"}</strong></div></div>
    ${resultDeliveryMarkup(data, `Score: ${replay.scoreA}–${replay.scoreB}`)}
    <div class="control-actions"><button class="secondary" id="replay-again" type="button">Replay penalty</button><a class="primary button-link" href="/#home">Return home</a></div>`;
  bindReplayAgain(replay);
}

function renderTurkeyTurn() {
  resetSelections();
  const { turn, match } = turnData;
  const state = match.state || {};
  const player = match.players[turn.actor];
  const fighter = turkeyFighterName(turn.actor);
  updateTurkeyScore(match, state);
  elements.round.textContent = `Round ${Number(state.round || 1)}`;
  elements.status.textContent = `${player}: English challenge`;
  elements.role.textContent = `${fighter} · Fighter ${turn.actor}`;
  elements.player.textContent = player;
  scene.setIdle({ actor: turn.actor, active: true, caption: "Answer the English question, then choose an attack or defence move." });

  app.innerHTML = `
    <span class="control-eyebrow">Turkey Fight Mail · secure turn</span>
    <h1 class="control-title">${html(player)}, command ${html(fighter)}.</h1>
    <p class="control-copy">The farm arena stays visible while you answer. Player ${turn.actor === "A" ? "B" : "A"} cannot inspect your move before choosing theirs.</p>
    ${questionMarkup(turn.question, "turkey")}
    <div class="turkey-move-grid" id="turkey-moves">
      ${turn.moves.map(id => {
        const move = turkeyMove(id);
        return `<button type="button" class="turkey-move-button locked" data-move="${attr(move.id)}" data-kind="${attr(move.type)}"><span class="move-icon">${html(move.icon)}</span><strong>${html(move.label)}</strong><small>${html(move.note)}</small></button>`;
      }).join("")}
    </div>
    <div class="turkey-selected-card" id="turkey-selected-card">Answer first, then choose your move.</div>
    <div class="control-actions"><button class="primary" id="submit-turn" type="button" disabled>Lock turkey move</button></div>
    <div class="turn-submit-state" id="status">Choose or type an answer to unlock the six moves.</div>`;

  bindAnswerInputs(unlockTurkeyIfReady);
  app.querySelectorAll("[data-move]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.classList.contains("locked") || submitting) return;
      selectedMove = button.dataset.move || "";
      audio.handleEvent({ type: "ui-select" });
      app.querySelectorAll("[data-move]").forEach(item => item.classList.toggle("selected", item === button));
      const card = document.getElementById("turkey-selected-card");
      if (card) card.textContent = `Selected: ${turkeyMoveLabel(selectedMove)}`;
      scene.setIdle({ actor: turn.actor, active: true, preview: selectedMove, caption: `${turkeyMoveLabel(selectedMove)} selected. Lock it when ready.` });
      updateTurkeyReadyState();
    });
  });
  document.getElementById("submit-turn").addEventListener("click", submitTurkeyTurn);
}

function unlockTurkeyIfReady() {
  const ready = Boolean(currentAnswer());
  app.querySelectorAll("[data-move]").forEach(button => button.classList.toggle("locked", !ready));
  const statusTarget = document.getElementById("status");
  const card = document.getElementById("turkey-selected-card");
  if (!ready) {
    selectedMove = "";
    app.querySelectorAll("[data-move]").forEach(item => item.classList.remove("selected"));
    if (statusTarget) statusTarget.textContent = "Choose or type an answer to unlock the six moves.";
    if (card) card.textContent = "Answer first, then choose your move.";
    scene.setIdle({ actor: turnData.turn.actor, active: true, preview: null, caption: "Answer first. Choose the move second." });
  } else {
    if (statusTarget) statusTarget.textContent = selectedMove ? "Ready to lock the move." : "Choose an attack or defence move.";
    scene.setIdle({ actor: turnData.turn.actor, active: true, preview: selectedMove || null, caption: selectedMove ? `${turkeyMoveLabel(selectedMove)} selected.` : "The six moves are unlocked." });
  }
  updateTurkeyReadyState();
}

function updateTurkeyReadyState() {
  setSubmitReady(Boolean(currentAnswer() && selectedMove && !submitting), "Answer and move selected. Ready to submit.");
}

async function submitTurkeyTurn() {
  const answer = currentAnswer();
  if (!answer || !selectedMove || submitting) return;
  void audio.unlock();
  audio.handleEvent({ type: "ui-lock" });
  submitting = true;
  const button = document.getElementById("submit-turn");
  button.disabled = true;
  button.textContent = "Locking move…";
  scene.setCaption("Sending the move securely…");
  try {
    const data = await postTurn(answer, selectedMove);
    if (data.outcome?.resolved && data.outcome?.replay) await showTurkeyReplay(data);
    else showTurkeyWaiting(data);
  } catch (error) {
    submitting = false;
    button.disabled = false;
    button.textContent = "Lock turkey move";
    showStatus(error.message, false);
  }
}

function showTurkeyWaiting(data) {
  const fighter = turkeyFighterName(turnData.turn.actor);
  elements.status.textContent = "Waiting for Fighter B";
  scene.setIdle({ actor: turnData.turn.actor, active: data.answerCorrect, preview: selectedMove, caption: data.answerCorrect ? `${fighter}'s move is locked. Fighter B has been emailed.` : `${fighter}'s move is locked but futile.` });
  app.innerHTML = waitingMarkup({
    eyebrow: "Move locked secretly",
    title: "Wait for the rival fighter.",
    feedback: data.answerCorrect ? `Correct answer—${fighter}'s move is active.` : `Incorrect answer—${fighter}'s move will be futile.`,
    correct: data.answerCorrect,
    explanation: data.explanation,
    copy: "When Fighter B locks a move, you will receive a new email with a Watch the fight button.",
    delivery: deliveryMessage(data.next?.email, "Fighter B has been emailed.")
  });
}

async function showTurkeyReplay(data) {
  const replay = data.outcome.replay;
  elements.status.textContent = "Fight replay";
  app.innerHTML = `
    <span class="control-eyebrow">Both fighters locked</span>
    <h1 class="control-title">Watch the feathers fly.</h1>
    <p class="control-copy">Your move completed the round. The animation is playing now while Player A receives a result email.</p>
    <div class="result-summary"><strong>Sir Gobbles:</strong> ${html(turkeyMoveLabel(replay.moveA))}<br /><strong>Ninja Wing:</strong> ${html(turkeyMoveLabel(replay.moveB))}</div>`;
  await scene.playReplay(replay);
  renderTurkeyResult(data);
}

function renderTurkeyResult(data) {
  const replay = data.outcome.replay;
  updateTurkeyScore(data.match, replay);
  elements.status.textContent = replay.caption;
  scene.setIdle({ actor: replay.winner || "B", active: true, caption: replay.caption });
  scene.setCaption(replay.caption, replay.completed ? "finish" : (replay.damageToA + replay.damageToB > 0 ? "hit" : "blocked"));
  app.innerHTML = `
    <span class="result-stamp fight-result-stamp">${html(turkeyOutcomeLabel(replay))}</span>
    <h1 class="control-title">${html(replay.caption)}</h1>
    <div class="turn-result-grid turkey-damage-grid">
      <div><small>Sir Gobbles</small><strong>${html(turkeyMoveLabel(replay.moveA))}</strong></div>
      <div><small>Ninja Wing</small><strong>${html(turkeyMoveLabel(replay.moveB))}</strong></div>
      <div><small>Damage to A</small><strong>${Number(replay.damageToA || 0)}</strong></div>
      <div><small>Damage to B</small><strong>${Number(replay.damageToB || 0)}</strong></div>
    </div>
    ${resultDeliveryMarkup(data, `Health: ${replay.healthA}–${replay.healthB}`)}
    <div class="control-actions"><button class="secondary" id="replay-again" type="button">Replay fight</button><a class="primary button-link" href="/#home">Return home</a></div>`;
  bindReplayAgain(replay);
}

function renderSniperTurn() {
  resetSelections();
  const { turn, match } = turnData;
  const state = match.state || {};
  const player = match.players[turn.actor];
  updateSniperScore(match, state);
  elements.round.textContent = `Round ${Number(state.round || 1)} of ${Number(state.maxRounds || 5)}`;
  elements.status.textContent = `${player}: English challenge`;
  elements.role.textContent = `Sniper ${turn.actor} · prediction turn`;
  elements.player.textContent = player;
  scene.setIdle({ actor: turn.actor, active: true, caption: "Answer the English question, then choose where to emerge and where to predict." });

  const spots = (turn.moves?.length ? turn.moves : SNIPER_SPOTS).map(id => sniperSpot(id));
  const spotButtons = group => spots.map(spot => `<button type="button" class="sniper-spot-button locked" data-${group}="${attr(SNIPER_SPOTS[spot.number - 1])}"><strong>${spot.number}</strong><span>${html(spot.label)}</span></button>`).join("");

  app.innerHTML = `
    <span class="control-eyebrow">Sniper Elite! · secure prediction turn</span>
    <h1 class="control-title">${html(player)}, choose two secret positions.</h1>
    <p class="control-copy">This is a non-graphic training exercise. Your emergence spot and prediction remain hidden until both students submit.</p>
    ${questionMarkup(turn.question, "sniper")}
    <section class="sniper-choice-section emergence">
      <h3>Choose your emergence spot</h3>
      <div class="sniper-spot-grid">${spotButtons("emergence")}</div>
    </section>
    <section class="sniper-choice-section target">
      <h3>Predict the opponent's position</h3>
      <div class="sniper-spot-grid">${spotButtons("target")}</div>
    </section>
    <div class="sniper-selection-summary">
      <div><small>Your cover</small><strong id="sniper-emergence-summary">Not selected</strong></div>
      <div><small>Your prediction</small><strong id="sniper-target-summary">Not selected</strong></div>
    </div>
    <div class="control-actions"><button class="primary" id="submit-turn" type="button" disabled>Lock both choices</button></div>
    <div class="turn-submit-state" id="status">Answer first to unlock the four positions.</div>`;

  bindAnswerInputs(unlockSniperIfReady);
  app.querySelectorAll("[data-emergence]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.classList.contains("locked") || submitting) return;
      selectedEmergence = button.dataset.emergence || "";
      audio.handleEvent({ type: "ui-select" });
      app.querySelectorAll("[data-emergence]").forEach(item => item.classList.toggle("selected", item === button));
      syncSniperSelection();
    });
  });
  app.querySelectorAll("[data-target]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.classList.contains("locked") || submitting) return;
      selectedTarget = button.dataset.target || "";
      audio.handleEvent({ type: "ui-select" });
      app.querySelectorAll("[data-target]").forEach(item => item.classList.toggle("selected", item === button));
      syncSniperSelection();
    });
  });
  document.getElementById("submit-turn").addEventListener("click", submitSniperTurn);
}

function unlockSniperIfReady() {
  const ready = Boolean(currentAnswer());
  app.querySelectorAll(".sniper-spot-button").forEach(button => button.classList.toggle("locked", !ready));
  const statusTarget = document.getElementById("status");
  if (!ready) {
    selectedEmergence = "";
    selectedTarget = "";
    app.querySelectorAll(".sniper-spot-button").forEach(button => button.classList.remove("selected"));
    if (statusTarget) statusTarget.textContent = "Answer first to unlock the four positions.";
    scene.setIdle({ actor: turnData.turn.actor, active: true, caption: "Answer first. Choose cover and prediction second." });
  } else {
    if (statusTarget) statusTarget.textContent = selectedEmergence && selectedTarget ? "Ready to lock both choices." : "Choose one emergence spot and one predicted target.";
    scene.setIdle({ actor: turnData.turn.actor, emergence: selectedEmergence || null, target: selectedTarget || null, active: true, caption: "The four positions are unlocked." });
  }
  syncSniperSelection();
}

function syncSniperSelection() {
  const emergenceSummary = document.getElementById("sniper-emergence-summary");
  const targetSummary = document.getElementById("sniper-target-summary");
  if (emergenceSummary) emergenceSummary.textContent = selectedEmergence ? sniperSpotLabel(selectedEmergence) : "Not selected";
  if (targetSummary) targetSummary.textContent = selectedTarget ? sniperSpotLabel(selectedTarget) : "Not selected";
  scene.setIdle({
    actor: turnData.turn.actor,
    emergence: selectedEmergence || null,
    target: selectedTarget || null,
    active: true,
    caption: selectedEmergence && selectedTarget
      ? `${sniperSpotLabel(selectedEmergence)} selected; predicting ${sniperSpotLabel(selectedTarget)}.`
      : "Choose both secret positions."
  });
  setSubmitReady(Boolean(currentAnswer() && selectedEmergence && selectedTarget && !submitting), "Answer and both positions selected. Ready to submit.");
}

async function submitSniperTurn() {
  const answer = currentAnswer();
  if (!answer || !selectedEmergence || !selectedTarget || submitting) return;
  void audio.unlock();
  audio.handleEvent({ type: "ui-lock" });
  submitting = true;
  const button = document.getElementById("submit-turn");
  button.disabled = true;
  button.textContent = "Locking choices…";
  scene.setCaption("Sending both secret choices securely…");
  try {
    const data = await postTurn(answer, "", { emergence: selectedEmergence, target: selectedTarget });
    if (data.outcome?.resolved && data.outcome?.replay) await showSniperReplay(data);
    else showSniperWaiting(data);
  } catch (error) {
    submitting = false;
    button.disabled = false;
    button.textContent = "Lock both choices";
    showStatus(error.message, false);
  }
}

function showSniperWaiting(data) {
  elements.status.textContent = "Waiting for Player B";
  scene.setIdle({
    actor: turnData.turn.actor,
    emergence: selectedEmergence,
    target: selectedTarget,
    active: data.answerCorrect,
    caption: data.answerCorrect
      ? "Both choices are hidden and the training shot is active."
      : "The emergence spot is locked, but the incorrect answer disables the shot."
  });
  app.innerHTML = waitingMarkup({
    eyebrow: "Two choices locked secretly",
    title: "Wait for the rival prediction.",
    feedback: data.answerCorrect ? "Correct answer—the training shot is active." : "Incorrect answer—you will still emerge, but your shot is disabled.",
    correct: data.answerCorrect,
    explanation: data.explanation,
    copy: "Player B cannot see your emergence spot, prediction, or answer result. When Player B submits, you will receive a replay email.",
    delivery: deliveryMessage(data.next?.email, "Player B has been emailed.")
  });
}

async function showSniperReplay(data) {
  const replay = data.outcome.replay;
  elements.status.textContent = "Hybrid scope replay";
  await runTurnSniperReplay(replay);
  renderSniperResult(data);
}

async function runTurnSniperReplay(replay) {
  app.innerHTML = `
    <div class="sniper-playback-card">
      <span class="control-eyebrow">Both players locked · cinematic replay</span>
      <h1 class="control-title">Wide view → scope POV → impact camera</h1>
      <p class="control-copy">Each firing moment switches briefly into that soldier’s scope. The target reaction is then shown clearly without blood or graphic injury.</p>
      <div class="result-summary"><strong>Player A:</strong> ${html(sniperSpotLabel(replay.emergenceA))} → predicts ${html(sniperSpotLabel(replay.targetA))}<br /><strong>Player B:</strong> ${html(sniperSpotLabel(replay.emergenceB))} → predicts ${html(sniperSpotLabel(replay.targetB))}</div>
      <div class="control-actions sniper-playback-controls">
        <button class="secondary" id="sniper-pause" type="button" aria-pressed="false">Pause</button>
        <button class="secondary" id="sniper-skip" type="button">Skip to result</button>
      </div>
    </div>`;

  const pause = document.getElementById("sniper-pause");
  const skip = document.getElementById("sniper-skip");
  pause?.addEventListener("click", event => {
    const paused = scene.togglePause();
    event.currentTarget.setAttribute("aria-pressed", String(paused));
    event.currentTarget.textContent = paused ? "Resume" : "Pause";
    elements.status.textContent = paused ? "Replay paused" : "Hybrid scope replay";
  });
  skip?.addEventListener("click", event => {
    event.currentTarget.disabled = true;
    pause && (pause.disabled = true);
    scene.skipReplay();
    elements.status.textContent = "Showing stored result";
  });

  await scene.playReplay(replay);
}

function renderSniperResult(data) {
  const replay = data.outcome.replay;
  updateSniperScore(data.match, replay);
  elements.status.textContent = replay.caption;
  scene.setIdle({ actor: replay.winner || "A", active: true, caption: replay.caption });
  scene.setCaption(replay.caption, replay.completed ? "finish" : (replay.hitByA || replay.hitByB ? "hit" : "miss"));
  app.innerHTML = `
    <span class="result-stamp sniper-result-stamp">${html(sniperOutcomeLabel(replay))}</span>
    <h1 class="control-title">${html(replay.caption)}</h1>
    <div class="turn-result-grid">
      <div><small>Player A cover</small><strong>${html(sniperSpotLabel(replay.emergenceA))}</strong></div>
      <div><small>Player A prediction</small><strong>${html(sniperSpotLabel(replay.targetA))}</strong></div>
      <div><small>Player B cover</small><strong>${html(sniperSpotLabel(replay.emergenceB))}</strong></div>
      <div><small>Player B prediction</small><strong>${html(sniperSpotLabel(replay.targetB))}</strong></div>
    </div>
    ${resultDeliveryMarkup(data, `Health: ${replay.healthA}–${replay.healthB}`)}
    <div class="control-actions"><button class="secondary" id="replay-again" type="button">Replay scope sequence</button><a class="primary button-link" href="/#home">Return home</a></div>`;
  bindTurnSniperReplayAgain(data);
}

function bindTurnSniperReplayAgain(data) {
  const button = document.getElementById("replay-again");
  button?.addEventListener("click", async event => {
    event.currentTarget.disabled = true;
    await audio.unlock();
    elements.status.textContent = "Hybrid scope replay";
    await runTurnSniperReplay(data.outcome.replay);
    renderSniperResult(data);
  }, { once: true });
}

function questionMarkup(question, theme) {
  const answers = question.type === "gap-fill"
    ? `<label class="question-card"><span class="turn-question-help">Type your answer</span><input id="answer-input" autocomplete="off" placeholder="Your answer" /></label>`
    : `<div class="shootout-answers">${question.options.map(option => `<button type="button" class="shootout-answer" data-answer="${attr(option)}">${html(option)}</button>`).join("")}</div>`;
  return `<div class="question-card ${attr(theme)}-question"><div class="question-meta"><span>${html(question.level || "B1")}</span><span>${html(question.tag || "General English")}</span></div><strong class="turn-question-prompt">${html(question.prompt)}</strong>${answers}</div>`;
}

function bindAnswerInputs(onChange) {
  app.querySelectorAll("[data-answer]").forEach(button => {
    button.addEventListener("click", () => {
      selectedAnswer = button.dataset.answer || "";
      audio.handleEvent({ type: "ui-select" });
      app.querySelectorAll("[data-answer]").forEach(item => item.classList.toggle("selected", item === button));
      onChange();
    });
  });
  document.getElementById("answer-input")?.addEventListener("input", event => {
    selectedAnswer = event.currentTarget.value.trim();
    onChange();
  });
}

function currentAnswer() {
  const input = document.getElementById("answer-input");
  return input ? input.value.trim() : selectedAnswer;
}

function setSubmitReady(ready, message) {
  const button = document.getElementById("submit-turn");
  const statusTarget = document.getElementById("status");
  if (button) button.disabled = !ready;
  if (statusTarget && ready) {
    statusTarget.className = "turn-submit-state ready";
    statusTarget.textContent = message;
  } else if (statusTarget) {
    statusTarget.className = "turn-submit-state";
  }
}

async function postTurn(answer, move, extra = {}) {
  const response = await fetch("/.netlify/functions/submit-turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, answer, move, ...extra })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The turn could not be submitted");
  return data;
}

function waitingMarkup({ eyebrow, title, feedback, correct, explanation, copy, delivery }) {
  return `<div class="handoff-card"><span class="control-eyebrow">${html(eyebrow)}</span><div class="turn-waiting-icon">✉</div><h1 class="control-title">${html(title)}</h1><div class="shootout-feedback ${correct ? "success" : "fail"}">${html(feedback)}</div>${explanation ? `<div class="result-summary"><strong>Why:</strong> ${html(explanation)}</div>` : ""}<p class="control-copy">${copy}</p><div class="turn-email-note">${html(delivery)}</div><div class="control-actions"><a class="secondary button-link" href="/#home">Return home</a></div></div>`;
}

function resultDeliveryMarkup(data, summary) {
  const nextText = data.completed ? "The match is complete." : deliveryMessage(data.next?.email, "The next-turn email has been sent.");
  const replayType = data.outcome.replay.gameType;
  const resultSuccess = replayType === "turkey"
    ? "Player A received the fight replay email."
    : replayType === "sniper"
      ? "Player A received the prediction replay email."
      : "The striker received the replay email.";
  const resultText = deliveryMessage(data.resultEmail, resultSuccess);
  return `<div class="result-summary"><strong>${html(summary)}</strong>${data.explanation ? `<br /><strong>Why:</strong> ${html(data.explanation)}` : ""}</div><div class="turn-email-note">${html(resultText)}<br />${html(nextText)}</div>`;
}

function bindReplayAgain(replay) {
  document.getElementById("replay-again").addEventListener("click", async event => {
    event.currentTarget.disabled = true;
    await audio.unlock();
    const penaltyReplay = replay?.gameType === "penalty" || !replay?.gameType;
    if (penaltyReplay) {
      elements.overlay.hidden = true;
      elements.overlay.setAttribute("aria-hidden", "true");
      elements.body.classList.add("penalty-replay-running");
    }
    try {
      if (penaltyReplay) await scene.playReplay(replay, { viewerRole: PENALTY_VIEWERS.KEEPER });
      else await scene.playReplay(replay);
    } finally {
      if (penaltyReplay) elements.body.classList.remove("penalty-replay-running");
      event.currentTarget.disabled = false;
    }
  });
}

function updateTurkeyScore(match, state) {
  elements.nameA.textContent = `${match.players.A} · Sir Gobbles`;
  elements.nameB.textContent = `${match.players.B} · Ninja Wing`;
  const a = Math.max(0, Number(state.healthA ?? 100));
  const b = Math.max(0, Number(state.healthB ?? 100));
  elements.scoreA.textContent = a;
  elements.scoreB.textContent = b;
  elements.healthA.style.width = `${a}%`;
  elements.healthB.style.width = `${b}%`;
}

function updateSniperScore(match, state) {
  elements.nameA.textContent = `${match.players.A} · Sniper A`;
  elements.nameB.textContent = `${match.players.B} · Sniper B`;
  const a = Math.max(0, Number(state.healthA ?? 3));
  const b = Math.max(0, Number(state.healthB ?? 3));
  elements.scoreA.textContent = a;
  elements.scoreB.textContent = b;
  elements.healthA.style.width = `${(a / 3) * 100}%`;
  elements.healthB.style.width = `${(b / 3) * 100}%`;
}

function deliveryMessage(email, successMessage) {
  if (email?.sent) return successMessage;
  if (email?.reason) return `Email delivery failed: ${email.reason}`;
  return "Email delivery status was not returned.";
}

function showStatus(message, success) {
  const target = document.getElementById("status");
  if (!target) return;
  target.className = `turn-submit-state ${success ? "ready" : "error"}`;
  target.textContent = message;
}

function fail(message, retryable = false) {
  bootState.ready = true;
  elements.overlay.hidden = true;
  elements.overlay.setAttribute("aria-hidden", "true");
  elements.overlay.className = "goal-zone-overlay resolving game-overlay";
  elements.status.textContent = retryable ? "Turn loading interrupted" : "Turn unavailable";
  elements.caption.textContent = retryable ? "Reload to try the secure turn again." : "This secure link cannot be used.";
  scene?.setIdle?.({ role: "striker", actor: "A", active: false, caption: elements.caption.textContent });
  app.innerHTML = `<span class="control-eyebrow">${retryable ? "Loading interrupted" : "Turn unavailable"}</span><h1 class="control-title">${retryable ? "The turn did not finish opening." : "This link cannot be used."}</h1><div class="turn-submit-state error">${html(message)}</div><div class="control-actions">${retryable ? '<button class="primary" id="retry-turn" type="button">Reload turn</button>' : ''}<a class="secondary button-link" href="/#home">Return home</a></div>`;
  document.getElementById("retry-turn")?.addEventListener("click", () => location.reload());
}

function html(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function attr(value) { return html(value).replaceAll("`", "&#096;"); }

load();

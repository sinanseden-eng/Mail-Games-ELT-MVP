import { ShootoutScene } from "./shootout-scene.mjs?v=0.9.23";
import { createShootoutAudio } from "./shootout-audio.mjs?v=0.9.23";
import { zoneLabel } from "./shootout-core.mjs?v=0.9.23";
import { TurkeyFightScene } from "./turkey-scene.mjs?v=0.9.23";
import { createTurkeyAudio } from "./turkey-audio.mjs?v=0.9.23";
import { turkeyMoveLabel, turkeyOutcomeLabel } from "./turkey-core.mjs?v=0.9.23";
import { SniperScene } from "./sniper-scene.mjs?v=0.9.23";
import { createSniperAudio } from "./sniper-audio.mjs?v=0.9.23";
import { sniperOutcomeLabel, sniperSpotLabel } from "./sniper-core.mjs?v=0.9.23";
import { PENALTY_VIEWERS, normalizePenaltyViewer, perspectiveLabel } from "./penalty-perspective.mjs?v=0.9.23";

const app = document.getElementById("replay-app");
const token = new URLSearchParams(location.search).get("token") || "";
const elements = {
  body: document.body,
  gameScene: document.getElementById("game-scene"),
  overlay: document.getElementById("goal-zone-overlay"),
  caption: document.getElementById("scene-caption"),
  shootoutCanvas: document.getElementById("shootout-canvas"),
  turkeyCanvas: document.getElementById("turkey-canvas"),
  turkeyFallback: document.getElementById("turkey-scene-fallback"),
  sniperCanvas: document.getElementById("sniper-canvas"),
  sniperFallback: document.getElementById("sniper-scene-fallback"),
  score: document.getElementById("replay-score"),
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
  legendB: document.getElementById("legend-b")
};

let scene = null;
let audio = null;
let replayData = null;

async function load() {
  if (!token) {
    configureGame("penalty");
    return fail("This replay link is incomplete.");
  }
  try {
    const response = await fetch(`/.netlify/functions/get-replay?token=${encodeURIComponent(token)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The replay could not be loaded");
    replayData = data;
    configureGame(data.replay.gameType);
    if (data.replay.gameType === "turkey") await presentTurkey(data);
    else if (data.replay.gameType === "sniper") await presentSniper(data);
    else await presentPenalty(data);
  } catch (error) {
    if (!scene) configureGame("penalty");
    fail(error.message);
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

  // Replay pages never need the interactive six-zone choice grid.
  elements.overlay.hidden = true;
  elements.overlay.setAttribute("aria-hidden", "true");
  elements.overlay.className = "goal-zone-overlay resolving game-overlay";
  elements.score.classList.toggle("turkey-health-score", turkey);
  elements.score.classList.toggle("sniper-health-score", sniper);
  elements.healthTrackA.hidden = penalty;
  elements.healthTrackB.hidden = penalty;
  elements.brand.textContent = penalty ? "Mail Penalty Shootout" : turkey ? "Turkey Fight Mail" : "Sniper Elite!";
  elements.role.textContent = penalty ? "Penalty replay" : turkey ? "Fight replay" : "Prediction replay";
  elements.legendA.innerHTML = penalty
    ? '<i class="legend-dot live"></i> Shot and dive are already locked'
    : turkey
      ? '<i class="legend-dot live"></i> Both turkey moves are already locked'
      : '<i class="legend-dot live"></i> Both emergence spots and predictions are locked';
  elements.legendB.innerHTML = '<i class="legend-dot net"></i> Replays do not change the result';

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

async function presentPenalty(data) {
  const { replay, match } = data;
  const viewerRole = normalizePenaltyViewer(data.viewer?.role);
  const keeperView = viewerRole === PENALTY_VIEWERS.KEEPER;
  elements.nameA.textContent = match.players.A;
  elements.nameB.textContent = match.players.B;
  elements.scoreA.textContent = replay.scoreA;
  elements.scoreB.textContent = replay.scoreB;
  elements.round.textContent = `Kick ${Number(replay.kickIndex) + 1} of 10`;
  elements.status.textContent = "Penalty ready";
  elements.role.textContent = "MAIN CAMERA";
  elements.player.textContent = keeperView
    ? match.players[replay.keeper]
    : match.players[replay.striker];
  scene.setIdle({
    role: viewerRole,
    active: true,
    caption: keeperView ? "Watch the incoming shot from your goal line." : "Watch your shot from the pitch."
  });

  app.innerHTML = startCard({
    eyebrow: "Penalty replay · main camera",
    title: keeperView ? "Defend the goal again." : "Watch the penalty.",
    copy: "Press play to watch the stored kick and goalkeeper dive together from one fixed camera. The replay cannot change the score.",
    summary: `<strong>${html(match.players[replay.striker])}</strong> aimed ${html(zoneLabel(replay.shotZone))}.<br /><strong>${html(match.players[replay.keeper])}</strong> chose ${html(zoneLabel(replay.keeperZone))}.`,
    button: "Play penalty replay",
    buttonId: "play-penalty"
  });
  bindPlay("play-penalty", async () => {
    elements.status.textContent = "MAIN CAMERA";
    elements.body.classList.add("penalty-replay-running");
    try {
      await scene.playReplay(replay, { viewerRole });
    } finally {
      elements.body.classList.remove("penalty-replay-running");
    }
    renderPenaltyResult(data);
  });
}

function renderPenaltyResult(data) {
  const { replay, match, review } = data;
  const viewerRole = normalizePenaltyViewer(data.viewer?.role);
  const keeperView = viewerRole === PENALTY_VIEWERS.KEEPER;
  scene.setResultStill?.(replay, { viewerRole });
  elements.status.textContent = replay.caption;
  elements.role.textContent = "MAIN CAMERA";
  scene.setIdle({ role: viewerRole, active: true, caption: replay.caption });
  scene.setCaption(replay.caption, replay.outcome);
  app.innerHTML = `
    <span class="result-stamp ${attr(replay.outcome)}">${html(replay.outcome)}</span>
    <span class="control-eyebrow">Penalty replay · main camera</span>
    <h1 class="control-title">${html(replay.caption)}</h1>
    <div class="turn-result-grid"><div><small>${html(match.players[replay.striker])} shot</small><strong>${html(zoneLabel(replay.shotZone))}</strong></div><div><small>${html(match.players[replay.keeper])} dive</small><strong>${html(zoneLabel(replay.keeperZone))}</strong></div><div><small>Shot power</small><strong>${replay.shotActive ? "Active" : "Futile"}</strong></div><div><small>Save power</small><strong>${replay.keeperActive ? "Active" : "Futile"}</strong></div></div>
    <div class="result-summary">Score after the kick: <strong>${replay.scoreA}–${replay.scoreB}</strong></div>
    ${reviewMarkup([review?.striker, review?.keeper], match)}
    ${replayControls("Replay penalty")}`;
  bindReplayAgain(replay, viewerRole);
}

async function presentTurkey(data) {
  const { replay, match } = data;
  updateTurkeyScore(match, replay, true);
  elements.round.textContent = `Round ${Number(replay.round || 1)}`;
  elements.status.textContent = "Fight ready";
  elements.player.textContent = `${match.players.A} vs ${match.players.B}`;
  scene.setIdle({ actor: "A", active: true, caption: "The resolved farm fight is ready." });

  app.innerHTML = startCard({
    eyebrow: "Round result ready",
    title: "Watch the feather fight.",
    copy: "Press play to reveal both secret moves, the damage exchange and the updated health. The replay cannot change the match.",
    summary: `<strong>Sir Gobbles:</strong> ${html(turkeyMoveLabel(replay.moveA))}<br /><strong>Ninja Wing:</strong> ${html(turkeyMoveLabel(replay.moveB))}`,
    button: "Play fight",
    buttonId: "play-fight"
  });
  bindPlay("play-fight", async () => {
    elements.status.textContent = "Turkey fight replay";
    await scene.playReplay(replay);
    renderTurkeyResult(data);
  });
}

function renderTurkeyResult(data) {
  const { replay, match, review } = data;
  updateTurkeyScore(match, replay, false);
  elements.status.textContent = replay.caption;
  scene.setIdle({ actor: replay.winner || "A", active: true, caption: replay.caption });
  scene.setCaption(replay.caption, replay.completed ? "finish" : (Number(replay.damageToA || 0) + Number(replay.damageToB || 0) ? "hit" : "blocked"));
  app.innerHTML = `
    <span class="result-stamp fight-result-stamp">${html(turkeyOutcomeLabel(replay))}</span>
    <h1 class="control-title">${html(replay.caption)}</h1>
    <div class="turn-result-grid turkey-damage-grid"><div><small>Sir Gobbles</small><strong>${html(turkeyMoveLabel(replay.moveA))}</strong></div><div><small>Ninja Wing</small><strong>${html(turkeyMoveLabel(replay.moveB))}</strong></div><div><small>Damage to A</small><strong>${Number(replay.damageToA || 0)}</strong></div><div><small>Damage to B</small><strong>${Number(replay.damageToB || 0)}</strong></div></div>
    <div class="result-summary">Health after the round: <strong>${replay.healthA}–${replay.healthB}</strong></div>
    ${reviewMarkup([review?.A, review?.B], match)}
    ${replayControls("Replay fight")}`;
  bindReplayAgain(replay);
}

async function presentSniper(data) {
  const { replay, match } = data;
  updateSniperScore(match, replay, true);
  elements.round.textContent = `Round ${Number(replay.round || 1)} of ${Number(replay.maxRounds || 5)}`;
  elements.status.textContent = "Prediction round ready";
  elements.player.textContent = `${match.players.A} vs ${match.players.B}`;
  scene.setIdle({ actor: "A", active: true, caption: "The resolved training round is ready." });

  app.innerHTML = startCard({
    eyebrow: "Prediction result ready",
    title: "Watch both positions resolve.",
    copy: "Press play to reveal the locked choices. Each shot briefly switches into the firing soldier’s scope point of view, then cuts to the target reaction. The clean training presentation uses no blood, and the stored result cannot change.",
    summary: `<strong>${html(match.players.A)}:</strong> ${html(sniperSpotLabel(replay.emergenceA))} → predicts ${html(sniperSpotLabel(replay.targetA))}<br /><strong>${html(match.players.B)}:</strong> ${html(sniperSpotLabel(replay.emergenceB))} → predicts ${html(sniperSpotLabel(replay.targetB))}`,
    button: "Play cinematic round",
    buttonId: "play-sniper"
  });
  bindPlay("play-sniper", async () => {
    elements.status.textContent = "Hybrid scope replay";
    await runSniperReplay(replay, match);
    renderSniperResult(data);
  });
}

async function runSniperReplay(replay, match) {
  app.innerHTML = `
    <div class="sniper-playback-card">
      <span class="control-eyebrow">Cinematic replay in progress</span>
      <h1 class="control-title">Wide view → scope POV → impact camera</h1>
      <p class="control-copy">The crosshair follows the stored prediction. Pause to inspect a frame or skip directly to the server-authoritative result.</p>
      <div class="result-summary"><strong>${html(match.players.A)}:</strong> ${html(sniperSpotLabel(replay.emergenceA))} → ${html(sniperSpotLabel(replay.targetA))}<br /><strong>${html(match.players.B)}:</strong> ${html(sniperSpotLabel(replay.emergenceB))} → ${html(sniperSpotLabel(replay.targetB))}</div>
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
  const { replay, match, review } = data;
  updateSniperScore(match, replay, false);
  elements.status.textContent = replay.caption;
  scene.setIdle({ actor: replay.winner || "A", active: true, caption: replay.caption });
  scene.setCaption(replay.caption, replay.completed ? "finish" : (replay.hitByA || replay.hitByB ? "hit" : "miss"));
  app.innerHTML = `
    <span class="result-stamp sniper-result-stamp">${html(sniperOutcomeLabel(replay))}</span>
    <h1 class="control-title">${html(replay.caption)}</h1>
    <div class="turn-result-grid">
      <div><small>${html(match.players.A)} cover</small><strong>${html(sniperSpotLabel(replay.emergenceA))}</strong></div>
      <div><small>${html(match.players.A)} prediction</small><strong>${html(sniperSpotLabel(replay.targetA))}</strong></div>
      <div><small>${html(match.players.B)} cover</small><strong>${html(sniperSpotLabel(replay.emergenceB))}</strong></div>
      <div><small>${html(match.players.B)} prediction</small><strong>${html(sniperSpotLabel(replay.targetB))}</strong></div>
    </div>
    <div class="result-summary">Health after the round: <strong>${replay.healthA}–${replay.healthB}</strong></div>
    ${reviewMarkup([review?.A, review?.B], match)}
    ${replayControls("Replay scope sequence")}`;
  bindSniperReplayAgain(data);
}

function bindSniperReplayAgain(data) {
  const button = document.getElementById("replay-again");
  button?.addEventListener("click", async event => {
    event.currentTarget.disabled = true;
    await audio.unlock();
    elements.status.textContent = "Hybrid scope replay";
    await runSniperReplay(data.replay, data.match);
    renderSniperResult(data);
  }, { once: true });
}

function startCard({ eyebrow, title, copy, summary, button, buttonId }) {
  const playButton = buttonId === "play-penalty"
    ? `<button class="primary" id="play-penalty" type="button">${html(button)}</button>`
    : buttonId === "play-fight"
      ? `<button class="primary" id="play-fight" type="button">${html(button)}</button>`
      : `<button class="primary" id="play-sniper" type="button">${html(button)}</button>`;
  return `<div class="replay-start-card"><span class="control-eyebrow">${html(eyebrow)}</span><h1 class="control-title">${html(title)}</h1><p class="control-copy">${html(copy)}</p><div class="result-summary">${summary}</div>${playButton}</div>`;
}

function bindPlay(buttonId, callback) {
  document.getElementById(buttonId).addEventListener("click", async event => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Playing…";
    await audio.unlock();
    await callback();
  }, { once: true });
}

function replayControls(label) {
  return `<div class="control-actions"><button class="secondary" id="replay-again" type="button">${html(label)}</button><a class="primary button-link" href="/#home">Return home</a></div>`;
}

function bindReplayAgain(replay, viewerRole = null) {
  document.getElementById("replay-again").addEventListener("click", async event => {
    event.currentTarget.disabled = true;
    await audio.unlock();
    elements.body.classList.add("penalty-replay-running");
    try {
      if (viewerRole) await scene.playReplay(replay, { viewerRole });
      else await scene.playReplay(replay);
    } finally {
      elements.body.classList.remove("penalty-replay-running");
      event.currentTarget.disabled = false;
    }
  });
}

function reviewMarkup(rows, match) {
  const valid = rows.filter(Boolean);
  if (!valid.length) return "";
  return `<div class="match-history">${valid.map(item => `<div style="display:block"><strong>${html(match.players[item.actor])} · ${html(item.role)}</strong><p style="margin:.35rem 0">${html(item.question.prompt)}</p><small>${item.answerCorrect ? "Correct—move active" : "Incorrect—move futile"}${item.question.explanation ? ` · ${html(item.question.explanation)}` : ""}</small></div>`).join("")}</div>`;
}

function updateTurkeyScore(match, replay, before) {
  elements.nameA.textContent = `${match.players.A} · Sir Gobbles`;
  elements.nameB.textContent = `${match.players.B} · Ninja Wing`;
  const a = Math.max(0, Number(before ? replay.healthBeforeA : replay.healthA));
  const b = Math.max(0, Number(before ? replay.healthBeforeB : replay.healthB));
  elements.scoreA.textContent = a;
  elements.scoreB.textContent = b;
  elements.healthA.style.width = `${a}%`;
  elements.healthB.style.width = `${b}%`;
}

function updateSniperScore(match, replay, before) {
  elements.nameA.textContent = `${match.players.A} · Sniper A`;
  elements.nameB.textContent = `${match.players.B} · Sniper B`;
  const a = Math.max(0, Number(before ? replay.healthBeforeA : replay.healthA));
  const b = Math.max(0, Number(before ? replay.healthBeforeB : replay.healthB));
  elements.scoreA.textContent = a;
  elements.scoreB.textContent = b;
  elements.healthA.style.width = `${(a / 3) * 100}%`;
  elements.healthB.style.width = `${(b / 3) * 100}%`;
}

function fail(message) {
  elements.status.textContent = "Replay unavailable";
  scene?.setIdle?.({ role: "striker", actor: "A", active: false, caption: "This replay cannot be opened." });
  app.innerHTML = `<span class="control-eyebrow">Replay unavailable</span><h1 class="control-title">This result link cannot be used.</h1><div class="turn-submit-state error">${html(message)}</div><div class="control-actions"><a class="primary button-link" href="/#home">Return home</a></div>`;
}

function html(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function attr(value) { return html(value).replaceAll("`", "&#096;"); }

load();

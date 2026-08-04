import {
  SHOOTOUT_STORAGE_KEY,
  ZONES,
  CHARACTERS,
  createInitialShootoutState,
  playersForKick,
  resolvePenaltyRound,
  applyRoundResult,
  advanceAfterReplay,
  getZone,
  zoneLabel
} from "./shootout-core.mjs?v=0.9.29";
import { ShootoutScene } from "./shootout-scene-0.9h5a.mjs";
import { createShootoutAudio } from "./shootout-audio-0.9h5a.mjs";
import { PENALTY_VIEWERS, perspectiveLabel } from "./penalty-perspective.mjs?v=0.9.29";

const QUESTION_STORAGE_KEY = "mailgames.questions.v1";
const fallbackQuestions = [
  {
    id: "fallback-present-perfect",
    prompt: "She ___ here since 2023.",
    type: "multiple-choice",
    options: ["works", "worked", "has worked", "is working"],
    answer: "has worked",
    explanation: "Use the present perfect with ‘since’ for an action continuing until now.",
    level: "B1",
    tag: "Present Perfect"
  },
  {
    id: "fallback-conditionals",
    prompt: "If I ___ more time, I would learn Italian.",
    type: "multiple-choice",
    options: ["have", "had", "will have", "am having"],
    answer: "had",
    explanation: "The second conditional uses if + past simple, then would + base verb.",
    level: "B1",
    tag: "Conditionals"
  },
  {
    id: "fallback-passive",
    prompt: "‘The homework was completed by Maya’ is a passive sentence.",
    type: "true-false",
    options: ["True", "False"],
    answer: "True",
    explanation: "The subject receives the action in a passive sentence.",
    level: "B1",
    tag: "Passive Voice"
  }
];

const elements = {
  canvas: document.getElementById("shootout-canvas"),
  scene: document.getElementById("shootout-scene"),
  overlay: document.getElementById("goal-zone-overlay"),
  caption: document.getElementById("scene-caption"),
  control: document.getElementById("control-card"),
  scoreA: document.getElementById("score-a"),
  scoreB: document.getElementById("score-b"),
  round: document.getElementById("round-badge"),
  status: document.getElementById("match-status"),
  role: document.getElementById("scene-role"),
  player: document.getElementById("scene-player"),
  reset: document.getElementById("reset-shootout"),
  motion: document.getElementById("motion-toggle"),
  netTest: document.getElementById("net-test"),
  targetGuide: document.getElementById("target-guide"),
  sound: document.getElementById("sound-toggle")
};

let state = loadState();
let activeQuestion = null;
let selectedAnswer = null;
let selectedZone = state.pendingZone || null;
let replayInProgress = false;
let fullTimeSoundPlayed = false;
let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


const audio = createShootoutAudio({ button: elements.sound });
const scene = new ShootoutScene(elements.canvas, elements.caption, {
  overlay: elements.overlay,
  reducedMotion,
  onEvent: event => audio.handleEvent(event)
});

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHOOTOUT_STORAGE_KEY));
    return parsed && typeof parsed === "object" ? { ...createInitialShootoutState(), ...parsed } : createInitialShootoutState();
  } catch {
    return createInitialShootoutState();
  }
}

function saveState() {
  localStorage.setItem(SHOOTOUT_STORAGE_KEY, JSON.stringify(state));
}

function getQuestions() {
  try {
    const questions = JSON.parse(localStorage.getItem(QUESTION_STORAGE_KEY));
    return Array.isArray(questions) && questions.length ? questions : fallbackQuestions;
  } catch {
    return fallbackQuestions;
  }
}

function chooseQuestion() {
  const questions = getQuestions();
  const previous = state.questionId;
  const pool = questions.filter(question => question.id !== previous);
  return (pool.length ? pool : questions)[Math.floor(Math.random() * (pool.length || questions.length))];
}

function questionById(id) {
  return getQuestions().find(question => question.id === id) || chooseQuestion();
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");
}

function render() {
  const players = playersForKick(state.kickIndex);
  elements.scoreA.textContent = state.scoreA;
  elements.scoreB.textContent = state.scoreB;
  elements.round.textContent = state.finished ? "Full time" : `Kick ${state.kickIndex + 1} of 10`;
  elements.player.textContent = state.activeRole === "keeper" ? players.keeper : players.striker;
  elements.role.textContent = state.activeRole === "keeper" ? "Goalkeeper turn" : "Striker turn";
  elements.overlay.hidden = true;
  elements.overlay.classList.remove("futile");
  selectedZone = state.pendingZone || null;
  syncZoneButtons();

  if (state.finished || state.phase === "finished") {
    renderFinished();
    return;
  }

  switch (state.phase) {
    case "question":
      renderQuestion();
      break;
    case "aim":
      renderAim();
      break;
    case "handoff":
      renderHandoff();
      break;
    case "replay":
      renderReplay();
      break;
    case "result":
      renderResult();
      break;
    case "arrival":
    default:
      renderArrival();
      break;
  }
}

function renderArrival() {
  const players = playersForKick(state.kickIndex);
  const character = CHARACTERS.striker;
  elements.status.textContent = `${players.striker} prepares to shoot`;
  scene.setIdle({ role: "striker", active: true, caption: "The striker must earn the shot with English." });
  elements.control.innerHTML = `
    <span class="control-eyebrow">Match arrival</span>
    <h1 class="control-title">Step up to the spot.</h1>
    <p class="control-copy"><strong>${escapeHtml(players.striker)}</strong> is the striker. Answer a question, then lock a secret target before the goalkeeper takes a turn.</p>
    ${characterMarkup(character, "⚡")}
    <div class="result-summary">Current score: <strong>${state.scoreA}–${state.scoreB}</strong><br />The next shot is kick ${state.kickIndex + 1} of 10.</div>
    <div class="control-actions">
      <button type="button" class="primary" id="start-challenge">Start English challenge</button>
    </div>
  `;
  document.getElementById("start-challenge").addEventListener("click", () => {
    const question = chooseQuestion();
    state.questionId = question.id;
    state.answerCorrect = null;
    state.pendingZone = null;
    state.phase = "question";
    saveState();
    render();
  });
}

function renderQuestion() {
  const players = playersForKick(state.kickIndex);
  const isStriker = state.activeRole === "striker";
  const player = isStriker ? players.striker : players.keeper;
  const character = isStriker ? CHARACTERS.striker : CHARACTERS.keeper;
  activeQuestion = questionById(state.questionId);
  selectedAnswer = null;
  elements.status.textContent = `${player}: English challenge`;
  scene.setIdle({
    role: state.activeRole,
    active: true,
    caption: isStriker ? "Answer correctly to activate the shot." : "Answer correctly to activate the save."
  });

  const options = activeQuestion.type === "gap-fill"
    ? `<label>Type your answer<input id="shootout-gap-answer" type="text" autocomplete="off" placeholder="Your answer" /></label>`
    : `<div class="shootout-answers">${(activeQuestion.options || []).map(option => `<button type="button" class="shootout-answer" data-answer="${escapeAttribute(option)}">${escapeHtml(option)}</button>`).join("")}</div>`;

  elements.control.innerHTML = `
    <span class="control-eyebrow">English challenge</span>
    <h1 class="control-title">Earn the ${isStriker ? "shot" : "save"}.</h1>
    ${characterMarkup(character, isStriker ? "⚡" : "🧤")}
    <div class="question-card">
      <div class="question-meta"><span>${escapeHtml(activeQuestion.level || "B1")}</span><span>${escapeHtml(activeQuestion.tag || "General English")}</span></div>
      <strong class="question-prompt">${escapeHtml(activeQuestion.prompt)}</strong>
      ${options}
      <div id="question-feedback"></div>
    </div>
    <div class="control-actions">
      <button type="button" class="primary" id="check-shootout-answer">Check answer</button>
    </div>
  `;

  elements.control.querySelectorAll("[data-answer]").forEach(button => {
    button.addEventListener("click", () => {
      selectedAnswer = button.dataset.answer;
      elements.control.querySelectorAll("[data-answer]").forEach(item => item.classList.toggle("selected", item === button));
    });
  });

  document.getElementById("check-shootout-answer").addEventListener("click", checkAnswer);
}

function checkAnswer() {
  const submitted = activeQuestion.type === "gap-fill"
    ? document.getElementById("shootout-gap-answer")?.value
    : selectedAnswer;
  if (!String(submitted || "").trim()) {
    scene.setCaption("Choose or type an answer first.", "miss");
    return;
  }

  const correct = normalize(submitted) === normalize(activeQuestion.answer);
  audio.handleEvent({ type: correct ? "answer-correct" : "answer-incorrect" });
  state.answerCorrect = correct;
  state.phase = "aim";
  saveState();
  render();
}

function renderAim() {
  const players = playersForKick(state.kickIndex);
  const isStriker = state.activeRole === "striker";
  const player = isStriker ? players.striker : players.keeper;
  const correct = Boolean(state.answerCorrect);
  elements.status.textContent = `${player}: choose a secret ${isStriker ? "target" : "dive"}`;
  elements.overlay.hidden = false;
  elements.overlay.classList.toggle("futile", !correct);
  scene.setIdle({
    role: state.activeRole,
    active: correct,
    preview: selectedZone,
    caption: correct
      ? `${isStriker ? "Shot" : "Save"} active — choose one of six zones.`
      : `${isStriker ? "Shot" : "Save"} futile — choose the attempted zone.`
  });

  const feedbackClass = correct ? "success" : "fail";
  const feedback = correct
    ? `Correct. The ${isStriker ? "shot" : "save"} is fully active.`
    : `Not quite. Correct answer: <strong>${escapeHtml(activeQuestion?.answer || questionById(state.questionId).answer)}</strong>. The move will be futile.`;

  elements.control.innerHTML = `
    <span class="control-eyebrow">${isStriker ? "Aim" : "Predict"} and lock</span>
    <h1 class="control-title">Choose the ${isStriker ? "target" : "dive"}.</h1>
    <p class="control-copy">The opponent will not see this choice. Use the six accessible goal buttons on the stadium.</p>
    <div class="shootout-feedback ${feedbackClass}">${feedback}${activeQuestion?.explanation ? `<br />${escapeHtml(activeQuestion.explanation)}` : ""}</div>
    <div class="selected-zone-card${correct ? "" : " futile"}" id="selected-zone-card">No zone selected yet.</div>
    <div class="control-actions">
      <button type="button" class="primary" id="lock-zone" disabled>Lock ${isStriker ? "shot" : "save"}</button>
    </div>
  `;

  updateSelectedZoneCard();
  document.getElementById("lock-zone").addEventListener("click", lockZone);
}

function syncZoneButtons() {
  elements.overlay.querySelectorAll("[data-zone]").forEach(button => {
    button.classList.toggle("selected", button.dataset.zone === selectedZone);
  });
}

function updateSelectedZoneCard() {
  const card = document.getElementById("selected-zone-card");
  const lock = document.getElementById("lock-zone");
  if (card) card.textContent = selectedZone ? `Selected: ${zoneLabel(selectedZone)}` : "No zone selected yet.";
  if (lock) lock.disabled = !selectedZone;
  scene.setIdle({
    role: state.activeRole,
    active: Boolean(state.answerCorrect),
    preview: selectedZone,
    caption: selectedZone ? `${zoneLabel(selectedZone)} selected. Lock it when ready.` : "Choose one of six zones."
  });
}

function lockZone() {
  if (!selectedZone) return;
  void audio.unlock();
  audio.handleEvent({ type: "ui-lock" });
  if (state.activeRole === "striker") {
    state.shotZone = selectedZone;
    state.shotActive = Boolean(state.answerCorrect);
    state.activeRole = "keeper";
    state.phase = "handoff";
    state.questionId = null;
    state.answerCorrect = null;
    state.pendingZone = null;
  } else {
    state.keeperZone = selectedZone;
    state.keeperActive = Boolean(state.answerCorrect);
    const result = resolvePenaltyRound({
      shotZone: state.shotZone,
      keeperZone: state.keeperZone,
      shotActive: state.shotActive,
      keeperActive: state.keeperActive
    });
    state = applyRoundResult(state, result);
    state.phase = "replay";
    state.pendingZone = null;
  }
  saveState();
  render();
}

function renderHandoff() {
  const players = playersForKick(state.kickIndex);
  elements.status.textContent = `Pass the device to ${players.keeper}`;
  scene.setIdle({ role: "keeper", active: true, caption: "The shot is locked and hidden. Goalkeeper next." });
  elements.control.innerHTML = `
    <div class="handoff-card">
      <span class="control-eyebrow">Secret move locked</span>
      <div class="handoff-icon">↔</div>
      <h1 class="control-title">Pass to ${escapeHtml(players.keeper)}.</h1>
      <p class="control-copy">The striker’s target is hidden. The goalkeeper now answers a different question and predicts one of the six zones.</p>
      <div class="control-actions"><button type="button" class="primary" id="begin-keeper-turn">I am ${escapeHtml(players.keeper)}</button></div>
    </div>
  `;
  document.getElementById("begin-keeper-turn").addEventListener("click", () => {
    const question = chooseQuestion();
    state.questionId = question.id;
    state.answerCorrect = null;
    state.phase = "question";
    saveState();
    render();
  });
}

function renderReplay() {
  const result = state.lastResult;
  elements.status.textContent = "Animated replay";
  elements.control.innerHTML = `
    <span class="control-eyebrow">Penalty replay · main camera</span>
    <h1 class="control-title">Watch the shot from the goal line.</h1>
    <p class="control-copy">The server-style rules have already resolved the round. The current goalkeeper sees the incoming ball and their stored dive.</p>
    <div class="result-summary"><strong>${escapeHtml(result?.striker || "Striker")}</strong> aimed ${escapeHtml(zoneLabel(state.shotZone))}.<br /><strong>${escapeHtml(result?.keeper || "Keeper")}</strong> chose ${escapeHtml(zoneLabel(state.keeperZone))}.</div>
  `;

  if (replayInProgress) return;
  replayInProgress = true;
  elements.role.textContent = "MAIN CAMERA";
  scene.playReplay({
    ...result,
    shotZone: state.shotZone,
    keeperZone: state.keeperZone,
    shotActive: state.shotActive,
    keeperActive: state.keeperActive
  }, { viewerRole: PENALTY_VIEWERS.KEEPER }).then(() => {
    replayInProgress = false;
    state.phase = "result";
    saveState();
    render();
  });
}

function renderResult() {
  const result = state.lastResult;
  elements.status.textContent = result.caption;
  elements.role.textContent = "MAIN CAMERA";
  scene.setResultStill?.(result, { viewerRole: PENALTY_VIEWERS.KEEPER });
  scene.setIdle({ role: "keeper", active: true, caption: result.caption });
  scene.setCaption(result.caption, result.outcome);
  const history = state.history.slice(-5).map((item, index) => `
    <div><span>Kick ${state.history.length - Math.min(5, state.history.length) + index + 1}</span><strong>${item.outcome.toUpperCase()}</strong></div>
  `).join("");
  elements.control.innerHTML = `
    <span class="result-stamp ${escapeAttribute(result.outcome)}">${escapeHtml(result.outcome)}</span>
    <h1 class="control-title">${escapeHtml(result.caption)}</h1>
    <div class="result-summary">
      <strong>${escapeHtml(result.striker)}</strong>: ${escapeHtml(zoneLabel(result.shotZone))} ${state.shotActive ? "(active)" : "(futile)"}<br />
      <strong>${escapeHtml(result.keeper)}</strong>: ${escapeHtml(zoneLabel(result.keeperZone))} ${state.keeperActive ? "(active)" : "(futile)"}<br />
      Score: <strong>${state.scoreA}–${state.scoreB}</strong>
    </div>
    <div class="match-history">${history}</div>
    <div class="control-actions">
      <button type="button" class="primary" id="continue-match">${state.kickIndex >= 9 ? "Show full time" : "Continue to next kick"}</button>
      <button type="button" class="secondary" id="replay-round">Replay penalty</button>
    </div>
  `;
  document.getElementById("continue-match").addEventListener("click", () => {
    state = advanceAfterReplay(state);
    saveState();
    render();
  });
  document.getElementById("replay-round").addEventListener("click", () => {
    state.phase = "replay";
    saveState();
    render();
  });
}

function renderFinished() {
  if (!fullTimeSoundPlayed) {
    fullTimeSoundPlayed = true;
    audio.handleEvent({ type: "full-time" });
  }
  const winner = state.scoreA === state.scoreB ? "The shootout is tied." : `${state.scoreA > state.scoreB ? "Player A" : "Player B"} wins the prototype.`;
  elements.status.textContent = "Full time";
  elements.role.textContent = "Match complete";
  elements.player.textContent = winner;
  scene.setIdle({ role: "striker", active: true, caption: `Full time: ${state.scoreA}–${state.scoreB}` });
  elements.control.innerHTML = `
    <span class="control-eyebrow">Full time</span>
    <h1 class="control-title">${escapeHtml(winner)}</h1>
    <p class="control-copy">The match completed ten alternating kicks with deterministic answer-gated outcomes and the reactive canvas net.</p>
    <div class="result-summary">Final score: <strong>${state.scoreA}–${state.scoreB}</strong><br />Goals: ${state.history.filter(item => item.goal).length}<br />Saves and misses: ${state.history.filter(item => !item.goal).length}</div>
    <div class="control-actions"><button type="button" class="primary" id="new-shootout">Start a new shootout</button></div>
  `;
  document.getElementById("new-shootout").addEventListener("click", resetMatch);
}

function characterMarkup(character, icon) {
  return `
    <div class="character-card">
      <div class="character-avatar">${icon}</div>
      <div><strong>${escapeHtml(character.name)}</strong><small>${escapeHtml(character.role)} · ${escapeHtml(character.tagline)}</small></div>
    </div>
  `;
}

function resetMatch() {
  state = createInitialShootoutState();
  activeQuestion = null;
  selectedAnswer = null;
  selectedZone = null;
  replayInProgress = false;
  fullTimeSoundPlayed = false;
  saveState();
  scene.net.reset();
  render();
}

elements.overlay.querySelectorAll("[data-zone]").forEach(button => {
  button.addEventListener("click", () => {
    if (state.phase !== "aim") return;
    selectedZone = button.dataset.zone;
    audio.handleEvent({ type: "ui-select" });
    state.pendingZone = selectedZone;
    saveState();
    syncZoneButtons();
    updateSelectedZoneCard();
  });
});

elements.reset.addEventListener("click", () => {
  if (window.confirm("Reset the local shootout prototype?")) resetMatch();
});

if (elements.netTest) {
  elements.netTest.addEventListener("click", () => {
    void audio.unlock();
    audio.handleEvent({ type: "impact", outcome: "goal" });
    scene.testNet(selectedZone || "top-right");
  });
}

if (elements.targetGuide) {
  elements.targetGuide.addEventListener("click", () => {
    const visible = scene.toggleTargetGuide();
    elements.targetGuide.setAttribute("aria-pressed", String(visible));
    elements.targetGuide.textContent = visible ? "Hide targets" : "Show targets";
  });
  elements.targetGuide.setAttribute("aria-pressed", String(scene.showTargetGuide));
  elements.targetGuide.textContent = scene.showTargetGuide ? "Hide targets" : "Show targets";
}

elements.motion.setAttribute("aria-pressed", String(reducedMotion));
elements.motion.textContent = reducedMotion ? "Motion reduced" : "Reduce motion";
elements.motion.addEventListener("click", () => {
  reducedMotion = !reducedMotion;
  elements.motion.setAttribute("aria-pressed", String(reducedMotion));
  elements.motion.textContent = reducedMotion ? "Motion reduced" : "Reduce motion";
  scene.setReducedMotion(reducedMotion);
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttribute(value) { return escapeHtml(value).replaceAll("`", "&#096;"); }

render();

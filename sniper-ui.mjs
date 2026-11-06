import { sniperRecentPositions, sniperShotExplanation, sniperSpot } from "./sniper-core.mjs";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function sniperGuideMarkup(maxRounds = 5, open = false) {
  const rounds = Math.max(1, Math.min(20, Number(maxRounds) || 5));
  return `<details class="sniper-guide" ${open ? "open" : ""}><summary>How to play · three simple steps</summary>
    <ol><li><strong>Answer.</strong> A correct English answer lets you fire.</li>
    <li><strong>Hide.</strong> Choose your hiding place on your side.</li>
    <li><strong>Predict.</strong> Guess where your opponent will appear.</li></ol>
    <p>Both choices stay secret until both players lock them. Both shots happen together. A hit removes one life; both players can be hit.</p>
    <p class="sniper-example"><strong>Example:</strong> Hide at 1. Guess 3. If your answer is correct and your opponent appears at 3, they lose one life.</p>
    <p><strong>3 lives each · up to ${rounds} round${rounds === 1 ? "" : "s"}.</strong> The match ends when a player runs out of lives or the round limit is reached. More lives wins; equal lives means a draw.</p>
    <small>All four hiding places are equally safe. Your prediction decides the hit; there is no aiming skill check.</small>
  </details>`;
}

export function sniperHistoryMarkup(history = [], actor = "A") {
  const recent = sniperRecentPositions(history, actor);
  return `<section class="sniper-history" aria-label="Opponent’s recent revealed hiding places"><strong>Opponent’s last revealed positions</strong>
    ${recent.length ? `<ol>${recent.map(item => { const spot = sniperSpot(item.spot); return `<li><small>Round ${esc(item.round)}</small><span>${spot.number} · ${esc(spot.label)}</span></li>`; }).join("")}</ol>`
      : "<p>No revealed positions yet. Watch for patterns after each round.</p>"}
    <small>Past rounds only. Their current hiding place stays secret.</small></section>`;
}

export function sniperResultMarkup(replay) {
  if (!replay?.gameType || replay.gameType !== "sniper") return "";
  return `<section class="sniper-round-result" aria-label="Last round explained"><strong>Round ${esc(replay.round)} · result explained</strong>
    <p><b>Player A:</b> ${esc(sniperShotExplanation(replay, "A"))}</p>
    <p><b>Player B:</b> ${esc(sniperShotExplanation(replay, "B"))}</p>
    <p>Lives remaining: <strong>A ${esc(replay.healthA)} / 3 · B ${esc(replay.healthB)} / 3</strong></p></section>`;
}

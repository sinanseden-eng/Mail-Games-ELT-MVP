// Shared by classroom, app and email games. Limits keep a lesson finite.
export function gameSettings(gameType, input = {}) {
  const bounded = (value, fallback, min, max) => {
    const n = value == null ? fallback : Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw Object.assign(new Error(`Choose a whole number from ${min} to ${max}.`), {statusCode: 400});
    return n;
  };
  if (gameType === 'penalty') {
    const tieMode = input.tieMode ?? 'draw';
    if (!['draw', 'sudden-death'].includes(tieMode)) throw Object.assign(new Error('Choose draw or sudden death.'), {statusCode: 400});
    return {tieMode, extraPairs: bounded(input.extraPairs, 5, 1, 20)};
  }
  return {maxRounds: bounded(input.maxRounds, gameType === 'turkey' ? 8 : 5, 1, 20)};
}
export function footballFinished(state) {
  if (state.kickIndex < 10) return false;
  if (state.tieMode !== 'sudden-death') return true;
  // Always give both players the same number of kicks.
  if (state.kickIndex % 2) return false;
  return state.scoreA !== state.scoreB || state.kickIndex >= 10 + 2 * (state.extraPairs ?? 5);
}
export function footballRoundLabel(state) {
  if (state.finished) return 'Full time';
  return state.kickIndex < 10 ? `Kick ${state.kickIndex + 1} of 10` : `Sudden death · pair ${Math.floor((state.kickIndex - 10) / 2) + 1} of ${state.extraPairs ?? 5}`;
}

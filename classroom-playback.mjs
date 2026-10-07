const MOTION_KEY = 'mailgames.classroom.replayMotion';

export function replayMotionPreference(storage, systemReduced = false) {
  let saved;
  try { saved = storage?.getItem(MOTION_KEY); } catch {}
  return saved === 'full' ? false : saved === 'reduced' ? true : Boolean(systemReduced);
}

export function saveReplayMotion(storage, reduced) {
  try { storage?.setItem(MOTION_KEY, reduced ? 'reduced' : 'full'); } catch {}
}

export function hasNewReplay(previous, next) {
  return Boolean(previous && next && previous.id === next.id && !next.cancelled &&
    next.history.length > previous.history.length);
}

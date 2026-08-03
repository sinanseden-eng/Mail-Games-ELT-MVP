export const PENALTY_VIEWERS = Object.freeze({
  STRIKER: "striker",
  KEEPER: "keeper"
});

export const PENALTY_ZONE_IDS = Object.freeze([
  "top-left", "top-centre", "top-right",
  "bottom-left", "bottom-centre", "bottom-right"
]);

const VALID_ZONES = new Set(PENALTY_ZONE_IDS);
const ZONE_MIRROR = Object.freeze({
  "top-left": "top-right",
  "top-centre": "top-centre",
  "top-right": "top-left",
  "bottom-left": "bottom-right",
  "bottom-centre": "bottom-centre",
  "bottom-right": "bottom-left"
});

export function normalizePenaltyViewer(value) {
  return value === PENALTY_VIEWERS.KEEPER
    ? PENALTY_VIEWERS.KEEPER
    : PENALTY_VIEWERS.STRIKER;
}

export function normalizePenaltyZone(value, fallback = "bottom-centre") {
  const zone = String(value || "");
  return VALID_ZONES.has(zone) ? zone : fallback;
}

export function canonicalPenaltyZone(replay = {}, field = "shotZone") {
  const keeperField = field === "keeperZone";
  const canonicalField = keeperField ? "canonicalKeeperZone" : "canonicalShotZone";
  return normalizePenaltyZone(replay?.[canonicalField] || replay?.[field]);
}

export function zoneForViewer(zoneId, viewerRole = PENALTY_VIEWERS.STRIKER) {
  const normalized = normalizePenaltyViewer(viewerRole);
  const zone = normalizePenaltyZone(zoneId);
  if (normalized !== PENALTY_VIEWERS.KEEPER) return zone;
  return ZONE_MIRROR[zone] || "bottom-centre";
}

// Camera projection is always derived from the immutable/canonical event.
// It never writes a mirrored display zone back into the replay object.
export function zoneForCamera(replay = {}, {
  field = "shotZone",
  cameraRole = PENALTY_VIEWERS.STRIKER
} = {}) {
  return zoneForViewer(canonicalPenaltyZone(replay, field), cameraRole);
}

export function createPenaltyReplaySnapshot(round = {}, viewerRole = PENALTY_VIEWERS.STRIKER) {
  const shotZone = canonicalPenaltyZone(round, "shotZone");
  const keeperZone = canonicalPenaltyZone(round, "keeperZone");
  return {
    ...round,
    shotZone,
    keeperZone,
    canonicalShotZone: shotZone,
    canonicalKeeperZone: keeperZone,
    viewerRole: normalizePenaltyViewer(viewerRole || round?.viewerRole)
  };
}

export function mirrorPointForKeeper(point, canvasWidth = 1280) {
  return {
    ...point,
    x: canvasWidth - Number(point?.x || 0)
  };
}

export function pointForViewer(point, viewerRole = PENALTY_VIEWERS.STRIKER, canvasWidth = 1280) {
  return normalizePenaltyViewer(viewerRole) === PENALTY_VIEWERS.KEEPER
    ? mirrorPointForKeeper(point, canvasWidth)
    : { ...point };
}

export function perspectiveLabel(viewerRole = PENALTY_VIEWERS.STRIKER) {
  return normalizePenaltyViewer(viewerRole) === PENALTY_VIEWERS.KEEPER
    ? "GOALKEEPER VIEW"
    : "PENALTY TAKER VIEW";
}

export function perspectiveAriaLabel(viewerRole = PENALTY_VIEWERS.STRIKER) {
  return normalizePenaltyViewer(viewerRole) === PENALTY_VIEWERS.KEEPER
    ? "Penalty replay from the goalkeeper's perspective"
    : "Penalty replay from the penalty taker's perspective";
}

export function resolvePenaltyViewer({ claimedActor = "", replay = {}, fallback = PENALTY_VIEWERS.STRIKER } = {}) {
  if (claimedActor && replay?.keeper && claimedActor === replay.keeper) return PENALTY_VIEWERS.KEEPER;
  if (claimedActor && replay?.striker && claimedActor === replay.striker) return PENALTY_VIEWERS.STRIKER;
  return normalizePenaltyViewer(fallback);
}

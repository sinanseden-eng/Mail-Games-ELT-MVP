import * as T from "three";
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z),
  clamp = T.MathUtils.clamp;
const times = [0, 0.14, 0.28, 0.4, 0.56, 0.74, 0.94, 1.14, 1.5];
// Pelvis coordinates in metres. Feet remain on the pitch through compression and push-off.
const poses = [
  [0, 0.79, 0, 0, 0],
  [0, 0.67, 0, 0.06, 0.08],
  [0.17, 0.87, 14, 0.25, 0.1],
  [0.66, 1.12, 40, 0.65, 0.16],
  [1.35, 1.12, 67, 1, 0.13],
  [2.04, 0.73, 84, 1, 0.1],
  [2.4, 0.34, 88, 0.94, 0.05],
  [2.47, 0.27, 90, 0.87, 0.03],
  [2.48, 0.26, 90, 0.85, 0.02],
];
function sample(t, keys, values) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1]) i++;
  const u = clamp((t - keys[i]) / (keys[i + 1] - keys[i]), 0, 1);
  const smooth = u * u * (3 - 2 * u);
  return values[i].map((v, k) => T.MathUtils.lerp(v, values[i + 1][k], smooth));
}
function pose(t) {
  return sample(t, times, poses);
}
function world(a, p) {
  return a.group.localToWorld(p.clone());
}
function point(b) {
  return b.getWorldPosition(V());
}
function rotateToward(b, child, target) {
  b.updateWorldMatrix(true, true);
  const origin = point(b);
  const from = point(child).sub(origin).normalize(),
    to = target.clone().sub(origin).normalize();
  const delta = new T.Quaternion().setFromUnitVectors(from, to);
  const q = b.getWorldQuaternion(new T.Quaternion()).premultiply(delta);
  const parent = b.parent.getWorldQuaternion(new T.Quaternion()).invert();
  b.quaternion.copy(parent.multiply(q));
  b.updateWorldMatrix(false, true);
}
function ik(a, upper, lower, end, target, pole) {
  const b = a.bones;
  const u = b[upper],
    l = b[lower],
    e = b[end];
  u.updateWorldMatrix(true, true);
  const start = point(u),
    middle = point(l),
    tip = point(e);
  const l1 = start.distanceTo(middle),
    l2 = middle.distanceTo(tip);
  const delta = target.clone().sub(start);
  const d = clamp(delta.length(), Math.abs(l1 - l2) + 0.0001, l1 + l2 - 0.0001);
  const axis = delta.normalize();
  const bend = pole.clone().sub(start);
  bend.addScaledVector(axis, -bend.dot(axis)).normalize();
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const joint = start
    .clone()
    .addScaledVector(axis, along)
    .addScaledVector(bend, height);
  rotateToward(u, l, joint);
  rotateToward(l, e, target);
}
export function cacheKeeper(a) {
  a.bones = {};
  a.root.traverse((b) => {
    if (b.isBone) a.bones[b.name.replace("mixamorig", "").replace(":", "")] = b;
  });
  a.base = Object.fromEntries(
    Object.entries(a.bones).map(([k, b]) => [
      k,
      { p: b.position.clone(), q: b.quaternion.clone() },
    ]),
  );
  a.root.updateMatrixWorld(true);
  a.footWorld = {};
  for (const name of ["Left", "Right"])
    a.footWorld[name] = a.group
      .getWorldQuaternion(new T.Quaternion())
      .invert()
      .multiply(a.bones[name + "Foot"].getWorldQuaternion(new T.Quaternion()));
  a.hipRotation = a.group
    .getWorldQuaternion(new T.Quaternion())
    .invert()
    .multiply(a.bones.Hips.getWorldQuaternion(new T.Quaternion()));
}
export function applyDive(a, t, side = "left", low = false, settings = {}) {
  const sign = side === "left" ? 1 : -1;
  for (const [k, b] of Object.entries(a.bones)) {
    b.position.copy(a.base[k].p);
    b.quaternion.copy(a.base[k].q);
  }
  const [x, y, deg, reach, z] = (settings.pose || pose)(clamp(t, 0, 1.5));
  const pelvis = V(
    sign * x,
    low && t > 0.28 ? y * (0.75 + 0.25 * clamp((t - 0.74) / 0.4, 0, 1)) : y,
    z,
  );
  const tilt = new T.Quaternion().setFromAxisAngle(
    V(0, 0, 1),
    (-sign * deg * Math.PI) / 180,
  );
  const h = a.bones.Hips;
  h.parent.updateWorldMatrix(true, false);
  h.position.copy(h.parent.worldToLocal(world(a, pelvis)));
  const q = a.group
    .getWorldQuaternion(new T.Quaternion())
    .multiply(tilt)
    .multiply(a.hipRotation);
  h.quaternion.copy(
    h.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q),
  );
  h.updateWorldMatrix(false, true);
  const airborne = clamp((t - 0.28) / 0.12, 0, 1);
  const land = clamp((t - 0.74) / 0.3, 0, 1);
  for (const [name, s] of [
    ["Left", 1],
    ["Right", -1],
  ]) {
    const ground = V(s * 0.17, 0.155, 0.02);
    const offset = V(s * 0.14, -0.72, s === sign ? 0.12 : 0.3).applyQuaternion(
      tilt,
    );
    const flight = pelvis.clone().add(offset);
    let target = ground.lerp(flight, airborne);
    target.y = Math.max(0.155 + land * 0.04, target.y);
    target.z += land * 0.07;
    const pole = world(a, pelvis.clone().add(V(s * 0.2, -0.4, 0.8)));
    ik(a, name + "UpLeg", name + "Leg", name + "Foot", world(a, target), pole);
    const foot = a.bones[name + "Foot"];
    const ft = new T.Quaternion().slerpQuaternions(
      new T.Quaternion(),
      tilt,
      airborne * (1 - land * 0.7),
    );
    const fq = a.group
      .getWorldQuaternion(new T.Quaternion())
      .multiply(ft)
      .multiply(a.footWorld[name]);
    foot.quaternion.copy(
      foot.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(fq),
    );
    foot.updateWorldMatrix(false, true);
  }
  for (const [name, s] of [
    ["Left", 1],
    ["Right", -1],
  ]) {
    const shoulder = point(a.bones[name + "Arm"]);
    const ready = world(a, V(s * 0.28, 0.98, 0.37));
    const travel = V(
      sign * 0.64,
      0.25 * (1 - land),
      0.13 + s * 0.08,
    ).normalize();
    const stretched = shoulder
      .clone()
      .addScaledVector(travel, 0.67 * a.group.scale.x);
    stretched.y = Math.max(0.13, stretched.y);
    const target = settings.handTarget
      ? ready.lerp(world(a, settings.handTarget(pelvis, tilt, s)), reach)
      : ready.lerp(stretched, reach);
    const pole = shoulder.clone().add(V(-sign * 0.12, -0.25, 0.45));
    ik(a, name + "Arm", name + "ForeArm", name + "Hand", target, pole);
  }
  a.root.updateMatrixWorld(true);
}

// Directional catch choreography. Contact happens at motion time .65; no source
// clip root translation is layered on top. The keeper stays on the pitch side.
export function applyShotDive(a, t, side, low, catching) {
  const sign = side === "left" ? 1 : -1,
    contactX = catching ? 2.16 : 1.3,
    landingX = catching ? 2.35 : 1.52;
  const keys = [0, 0.14, 0.28, 0.43, 0.65, 0.78, 1.0, 1.25, 1.5];
  const values = [
    [0, 0.79, 0, 0, 0],
    [0, 0.67, 0, 0.05, 0.04],
    [0.2, 0.88, 16, 0.25, 0.1],
    [0.91, low ? 0.78 : 1.18, 43, 0.7, 0.17],
    [contactX, low ? 0.46 : 1.04, low ? 78 : 68, 1, 0.22],
    [landingX - 0.08, low ? 0.37 : 0.78, 84, 1, 0.22],
    [landingX, 0.34, 88, 1, 0.19],
    [landingX, 0.31, 90, 1, 0.18],
    [landingX, 0.31, 90, 1, 0.18],
  ];
  const settings = { pose: (q) => sample(q, keys, values) };
  if (catching)
    settings.handTarget = (pelvis, tilt, s) => {
      const contact = V(sign * 2.8, low ? 0.32 : 1.45, 0.39);
      const hold = pelvis.clone().add(V(0, 0.46, 0.34).applyQuaternion(tilt));
      const u = clamp((t - 0.65) / 0.6, 0, 1);
      contact.lerp(hold, u * u * (3 - 2 * u));
      return contact.add(V(0, s * 0.055, 0));
    };
  applyDive(a, t, side, false, settings);
}

// Match choices are canonical (from behind the shooter). Left on the pitch is
// the keeper's own right. A centre choice uses a vertical reach, never a side dive.
export function applyMatchKeeper(a, t, plan) {
  const y = plan.keeper.y;
  const contactHip = y > 0.8 ? y - 0.41 : 0.46;
  const keys = [0, 0.14, 0.28, 0.43, 0.65, 0.78, 1, 1.25, 1.5];
  const values = plan.centre
    ? [
        [0, 0.79, 0, 0, 0],
        [0, 0.67, 0, 0.05, 0.04],
        [0, 0.83, 0, 0.25, 0.1],
        [0, y > 0.8 ? 1.02 : 0.6, 0, 0.7, 0.17],
        [0, y > 0.8 ? y - 0.72 : 0.44, 0, 1, 0.22],
        [0, y > 0.8 ? 1.12 : 0.44, 0, 1, 0.22],
        [0, 0.79, 0, 1, 0.19],
        [0, 0.79, 0, 1, 0.18],
        [0, 0.79, 0, 1, 0.18],
      ]
    : [
        [0, 0.79, 0, 0, 0],
        [0, 0.67, 0, 0.05, 0.04],
        [0.2, 0.88, 16, 0.25, 0.1],
        [0.91, y > 0.8 ? Math.max(1.18, contactHip) : 0.78, 43, 0.7, 0.17],
        [2.16, contactHip, plan.low ? 78 : 68, 1, 0.22],
        [2.27, plan.low ? 0.37 : 0.78, 84, 1, 0.22],
        [2.35, 0.34, 88, 1, 0.19],
        [2.35, 0.31, 90, 1, 0.18],
        [2.35, 0.31, 90, 1, 0.18],
      ];
  applyDive(a, t, plan.keeperSide, false, {
    pose: (q) => sample(q, keys, values),
    handTarget: (pelvis, tilt, s) => {
      // Match targets are world metres; model normalization must not move them.
      const scale = a.group.scale.x;
      const contact = V(
        plan.keeper.x / scale,
        (y - a.group.position.y) / scale,
        0.39 / scale,
      );
      const hold = plan.centre
        ? V(0, 0.98, 0.4)
        : pelvis.clone().add(V(0, 0.46, 0.34).applyQuaternion(tilt));
      const u = clamp((t - 0.65) / 0.6, 0, 1);
      contact.lerp(hold, u * u * (3 - 2 * u));
      return contact.add(
        V(plan.centre ? s * 0.055 : 0, plan.centre ? 0 : s * 0.055, 0),
      );
    },
  });
}

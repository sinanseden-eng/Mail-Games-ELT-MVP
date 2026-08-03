import { PENALTY_VIEWERS, normalizePenaltyViewer } from "./penalty-perspective.mjs";

const EPSILON = 1e-7;

export const GOAL = Object.freeze({
  width: 7.32,
  height: 2.44,
  depth: 2.35
});

// Regulation size-five ball radius, used to keep the visible ball inside
// the posts and crossbar even when a player chooses an extreme corner.
export const BALL_RADIUS = 0.11;

export const OBLIQUE_CAMERA = Object.freeze({
  // Pulled back to create a real penalty-distance corridor while preserving
  // the preferred near-right-post three-quarter view.
  position: { x: -9, y: 3.3, z: -14 },
  target: { x: 0, y: 1.0, z: 0.7 },
  up: { x: 0, y: 1, z: 0 },
  fov: 31,
  width: 1280,
  height: 720
});

export const SCENE_LAYOUT = Object.freeze({
  strikerBase: Object.freeze({ x: -4.0, y: 0, z: -9.2 }),
  ballStart: Object.freeze({ x: -3.6, y: 0.12, z: -8.2 }),
  keeperBase: Object.freeze({ x: 0, y: 0, z: 0.12 }),
  strikerScale: 1.18,
  keeperScale: 0.80,
  strikerLift: 214,
  keeperFootOffset: 142
});

export const PITCH_MARKINGS = Object.freeze([
  Object.freeze({ id: "goal-line", start: Object.freeze({ x: 12, y: 0.012, z: 0 }), end: Object.freeze({ x: -8, y: 0.012, z: 0 }) }),
  Object.freeze({ id: "area-far-side", start: Object.freeze({ x: 5.2, y: 0.014, z: 0 }), end: Object.freeze({ x: 5.2, y: 0.014, z: -8.5 }) }),
  Object.freeze({ id: "area-near-side", start: Object.freeze({ x: -5.2, y: 0.014, z: 0 }), end: Object.freeze({ x: -5.2, y: 0.014, z: -8.5 }) }),
  Object.freeze({ id: "area-front", start: Object.freeze({ x: 5.2, y: 0.014, z: -8.5 }), end: Object.freeze({ x: -5.2, y: 0.014, z: -8.5 }) })
]);

export function createCamera(config = OBLIQUE_CAMERA) {
  const position = clone(config.position);
  const target = clone(config.target);
  const up = clone(config.up);
  const forward = normalize(sub(target, position));
  const right = normalize(cross(forward, up));
  const cameraUp = normalize(cross(right, forward));
  const focal = (config.height / 2) / Math.tan((config.fov * Math.PI / 180) / 2);

  return {
    ...config,
    position,
    target,
    forward,
    right,
    cameraUp,
    focal,
    project(point) {
      const relative = sub(point, position);
      const depth = Math.max(EPSILON, dot(relative, forward));
      const horizontal = dot(relative, right);
      const vertical = dot(relative, cameraUp);
      return {
        x: config.width / 2 + focal * horizontal / depth,
        y: config.height / 2 - focal * vertical / depth,
        depth,
        scale: focal / depth
      };
    }
  };
}

export function goalTargetWorld(zone, goal = GOAL) {
  const frameClearance = BALL_RADIUS * 1.62;
  return {
    // Visual left maps to the far world side; visual right maps to the near side.
    x: clamp(
      lerp(goal.width / 2, -goal.width / 2, zone.u),
      -goal.width / 2 + frameClearance,
      goal.width / 2 - frameClearance
    ),
    y: clamp(
      goal.height * (1 - zone.v),
      frameClearance,
      goal.height - frameClearance
    ),
    z: 0
  };
}

// The contact point is where the ball crosses the goal plane. The pocket
// point is deeper in the correct roof/side/back-net pocket, creating the
// visual impression that the shot is buried rather than stopping at z = 0.
export function goalPocketWorld(zone, goal = GOAL) {
  const contact = goalTargetWorld(zone, goal);
  const high = zone.v < 0.35;
  const low = zone.v > 0.65;
  const farSide = zone.u < 0.3;
  const nearSide = zone.u > 0.7;
  const sideInset = BALL_RADIUS * 0.48;

  if (nearSide || farSide) {
    const sideX = nearSide
      ? -goal.width / 2 + sideInset
      : goal.width / 2 - sideInset;
    return {
      x: sideX,
      y: high
        ? goal.height - BALL_RADIUS * 0.88
        : low
          ? BALL_RADIUS * 1.18
          : contact.y,
      z: goal.depth * (high ? 0.50 : low ? 0.72 : 0.64)
    };
  }

  return {
    x: contact.x,
    y: high
      ? goal.height - BALL_RADIUS * 0.82
      : BALL_RADIUS * 1.35,
    z: goal.depth * (high ? 0.56 : 0.86)
  };
}

export function getImpactTargets(zone, goal = GOAL) {
  const contact = goalTargetWorld(zone, goal);
  const pocket = goalPocketWorld(zone, goal);
  const high = zone.v < 0.35;
  const farSide = zone.u < 0.3;
  const nearSide = zone.u > 0.7;
  const targets = [];

  if (nearSide || farSide) {
    targets.push({
      panel: nearSide ? "near-side" : "far-side",
      point: {
        x: nearSide ? -goal.width / 2 : goal.width / 2,
        y: pocket.y,
        z: pocket.z
      },
      weight: 1
    });

    if (high) {
      targets.push({
        panel: "roof",
        point: { x: pocket.x, y: goal.height, z: pocket.z },
        weight: 0.92
      });
    }

    targets.push({
      panel: "back",
      point: {
        x: contact.x * 0.96,
        y: high ? contact.y - 0.08 : contact.y + 0.04,
        z: goal.depth
      },
      weight: high ? 0.34 : 0.54
    });
    return targets;
  }

  if (high) {
    targets.push({
      panel: "roof",
      point: { x: contact.x, y: goal.height, z: pocket.z },
      weight: 1
    });
    targets.push({
      panel: "back",
      point: { x: contact.x, y: contact.y - 0.08, z: goal.depth },
      weight: 0.44
    });
    return targets;
  }

  targets.push({
    panel: "back",
    point: { x: contact.x, y: pocket.y, z: goal.depth },
    weight: 1
  });
  return targets;
}

export class VolumetricGoalNet {
  constructor({ goal = GOAL, camera = createCamera(), quality = "match" } = {}) {
    this.goal = goal;
    this.camera = camera;
    this.quality = quality;
    this.panels = [];
    this.constraints = [];
    this.frameKick = 0;
    this.frameVelocity = 0;
    this.lastImpact = null;
    this.delayedImpulses = [];
    this.elapsed = 0;
    this.build();
  }

  build() {
    this.panels.length = 0;
    this.constraints.length = 0;
    const settings = this.quality === "high"
      ? { back: [31, 17], roof: [31, 9], side: [11, 17] }
      : { back: [25, 14], roof: [25, 8], side: [10, 14] };
    const { width, height, depth } = this.goal;

    this.addPanel("back", settings.back[0], settings.back[1], (u, v) => {
      const slack = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      return {
        x: lerp(width / 2, -width / 2, u),
        y: Math.max(0.02, lerp(height, 0, v) - Math.sin(Math.PI * u) * (0.11 + 0.23 * Math.sin(Math.PI * v) + 0.08 * v)),
        z: depth - slack * 0.42
      };
    });

    this.addPanel("roof", settings.roof[0], settings.roof[1], (u, v) => {
      const slack = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      return {
        x: lerp(width / 2, -width / 2, u),
        y: height - Math.sin(Math.PI * u) * Math.pow(Math.sin(Math.PI * v), 0.80) * 0.39,
        z: lerp(0, depth, v) - slack * 0.055
      };
    });

    this.addPanel("near-side", settings.side[0], settings.side[1], (u, v) => {
      const slack = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      return {
        x: -width / 2 + slack * 0.16,
        y: Math.max(0.02, lerp(height, 0, v) - Math.sin(Math.PI * u) * (0.065 + 0.15 * Math.sin(Math.PI * v))),
        z: lerp(0, depth, u) - slack * 0.035
      };
    });

    this.addPanel("far-side", settings.side[0], settings.side[1], (u, v) => {
      const slack = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      return {
        x: width / 2 - slack * 0.16,
        y: Math.max(0.02, lerp(height, 0, v) - Math.sin(Math.PI * u) * (0.065 + 0.15 * Math.sin(Math.PI * v))),
        z: lerp(0, depth, u) - slack * 0.035
      };
    });
  }

  addPanel(name, cols, rows, pointFactory) {
    const panel = { name, cols, rows, nodes: [], constraints: [] };
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const u = col / (cols - 1);
        const v = row / (rows - 1);
        const rest = pointFactory(u, v);
        const pinned = col === 0 || col === cols - 1 || row === 0 || row === rows - 1;
        panel.nodes.push({
          panel: name,
          col,
          row,
          u,
          v,
          rest: clone(rest),
          position: clone(rest),
          previous: clone(rest),
          pinned
        });
      }
    }

    const index = (col, row) => row * cols + col;
    const connect = (a, b, stiffness) => {
      const nodeA = panel.nodes[a];
      const nodeB = panel.nodes[b];
      const constraint = {
        a: nodeA,
        b: nodeB,
        length: distance(nodeA.rest, nodeB.rest),
        stiffness
      };
      panel.constraints.push(constraint);
      this.constraints.push(constraint);
    };

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (col < cols - 1) connect(index(col, row), index(col + 1, row), 0.95);
        if (row < rows - 1) connect(index(col, row), index(col, row + 1), 0.95);
        if (col < cols - 1 && row < rows - 1) {
          connect(index(col, row), index(col + 1, row + 1), 0.62);
          connect(index(col + 1, row), index(col, row + 1), 0.62);
        }
        if (col < cols - 2) connect(index(col, row), index(col + 2, row), 0.2);
        if (row < rows - 2) connect(index(col, row), index(col, row + 2), 0.2);
      }
    }

    this.panels.push(panel);
  }

  reset() {
    for (const panel of this.panels) {
      for (const node of panel.nodes) {
        node.position = clone(node.rest);
        node.previous = clone(node.rest);
      }
    }
    this.frameKick = 0;
    this.frameVelocity = 0;
    this.lastImpact = null;
    this.delayedImpulses.length = 0;
    this.elapsed = 0;
  }

  impactZone(zone, power = 1, { velocity = null } = {}) {
    const targets = getImpactTargets(zone, this.goal);
    this.lastImpact = targets[0];
    for (const target of targets) {
      this.impactPanel(target.panel, target.point, power * target.weight, 1.22, velocity);
      this.delayedImpulses.push({
        at: this.elapsed + 0.045 + (1 - target.weight) * 0.035,
        panel: target.panel,
        point: target.point,
        power: power * target.weight * 0.34,
        radius: 1.72,
        velocity
      });
    }
    this.frameVelocity += 0.018 * power;
    return targets[0].point;
  }

  impactPanel(panelName, point, power = 1, radius = 1.28, velocity = null) {
    const panel = this.panels.find(item => item.name === panelName);
    if (!panel) return;
    const incoming = velocity ? normalize(velocity) : { x: 0, y: 0, z: 1 };
    const direction = normalize({
      x: incoming.x * 0.38 + point.x * 0.035,
      y: incoming.y * 0.20 - 0.12,
      z: Math.max(0.42, Math.abs(incoming.z)) * (panelName === "back" ? 1 : 0.76)
    });

    for (const node of panel.nodes) {
      if (node.pinned) continue;
      const d = distance(node.position, point);
      if (d >= radius) continue;
      const normalized = 1 - d / radius;
      const falloff = normalized * normalized * (3 - 2 * normalized);
      const ring = Math.sin(normalized * Math.PI) * 0.16;
      const impulse = scale(direction, power * (falloff + ring) * 0.31);
      node.previous = sub(node.previous, impulse);
    }
  }

  update(dt) {
    const safeDt = Math.min(dt, 1 / 30);
    this.elapsed += safeDt;
    if (this.delayedImpulses.length) {
      const pending = [];
      for (const impulse of this.delayedImpulses) {
        if (impulse.at <= this.elapsed) {
          this.impactPanel(impulse.panel, impulse.point, impulse.power, impulse.radius, impulse.velocity);
        } else pending.push(impulse);
      }
      this.delayedImpulses = pending;
    }

    const energetic = this.delayedImpulses.length > 0 || this.energy() > 0.00022;
    const substeps = this.quality === "high" ? (energetic ? 4 : 2) : (energetic ? 3 : 2);
    const iterations = energetic ? 6 : 4;
    const step = safeDt / substeps;
    for (let substep = 0; substep < substeps; substep += 1) {
      this.integrate(step);
      for (let iteration = 0; iteration < iterations; iteration += 1) this.solveConstraints();
      this.restoreShape(step);
    }

    this.frameVelocity += -46 * this.frameKick * safeDt;
    this.frameVelocity *= Math.pow(0.80, safeDt * 60);
    this.frameKick += this.frameVelocity;
    this.frameKick = clamp(this.frameKick, -0.021, 0.021);
  }

  integrate(dt) {
    const gravity = { x: 0, y: -0.62, z: 0 };
    const damping = Math.pow(0.9885, dt * 60);
    const { width, height, depth } = this.goal;
    for (const panel of this.panels) {
      for (const node of panel.nodes) {
        if (node.pinned) continue;
        const velocity = scale(sub(node.position, node.previous), damping);
        const current = clone(node.position);
        node.position = add(add(node.position, velocity), scale(gravity, dt * dt));
        node.position.x = clamp(node.position.x, -width / 2 - 0.28, width / 2 + 0.28);
        node.position.y = clamp(node.position.y, 0.015, height + 0.20);
        node.position.z = clamp(node.position.z, -0.12, depth + 0.48);
        node.previous = current;
      }
    }
  }

  solveConstraints() {
    for (const constraint of this.constraints) {
      const { a, b, length, stiffness } = constraint;
      const delta = sub(b.position, a.position);
      const currentLength = magnitude(delta);
      if (currentLength < EPSILON) continue;
      const correction = scale(delta, ((currentLength - length) / currentLength) * stiffness);
      if (!a.pinned && !b.pinned) {
        a.position = add(a.position, scale(correction, 0.5));
        b.position = sub(b.position, scale(correction, 0.5));
      } else if (!a.pinned) {
        a.position = add(a.position, correction);
      } else if (!b.pinned) {
        b.position = sub(b.position, correction);
      }
    }
  }

  restoreShape(dt) {
    const amount = 1 - Math.pow(0.9942, dt * 60);
    for (const panel of this.panels) {
      for (const node of panel.nodes) {
        if (node.pinned) {
          node.position = clone(node.rest);
          node.previous = clone(node.rest);
          continue;
        }
        node.position = lerpVec(node.position, node.rest, amount);
      }
    }
  }

  energy() {
    let total = 0;
    let count = 0;
    for (const panel of this.panels) {
      for (const node of panel.nodes) {
        total += distance(node.position, node.previous);
        count += 1;
      }
    }
    return count ? total / count : 0;
  }

  panel(name) {
    return this.panels.find(item => item.name === name);
  }

  projectedNode(node) {
    return this.camera.project(node.position);
  }

  draw(ctx, { foreground = false, impactGlow = false } = {}) {
    const sorted = [...this.panels].sort((a, b) => averageDepth(b, this.camera) - averageDepth(a, this.camera));
    for (const panel of sorted) {
      if (foreground && this.lastImpact && panel.name !== this.lastImpact.panel) continue;
      this.drawPanel(ctx, panel, { foreground, impactGlow });
    }
  }

  drawPanel(ctx, panel, { foreground, impactGlow }) {
    const { cols, rows, nodes } = panel;
    const index = (col, row) => row * cols + col;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = foreground ? "screen" : "source-over";

    const drawLine = points => {
      ctx.beginPath();
      points.forEach((point, indexValue) => {
        if (indexValue === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      const averageScale = points.reduce((sum, point) => sum + point.scale, 0) / points.length;
      ctx.lineWidth = clamp(averageScale * 0.0205, 0.82, foreground ? 2.8 : 2.35);
      ctx.strokeStyle = foreground
        ? "rgba(255,255,255,.62)"
        : impactGlow && this.lastImpact?.panel === panel.name
          ? "rgba(255,255,255,.88)"
          : panel.name === "near-side"
            ? "rgba(250,253,255,.82)"
            : "rgba(229,241,248,.64)";
      ctx.stroke();
    };

    // A faint translucent fabric surface makes the four panels read as a
    // volumetric net cage while the individual cords remain visible.
    const cellStep = this.quality === "high" ? 2 : 3;
    ctx.globalCompositeOperation = "source-over";
    for (let row = 0; row < rows - 1; row += cellStep) {
      for (let col = 0; col < cols - 1; col += cellStep) {
        const nextRow = Math.min(rows - 1, row + cellStep);
        const nextCol = Math.min(cols - 1, col + cellStep);
        const corners = [
          this.projectedNode(nodes[index(col, row)]),
          this.projectedNode(nodes[index(nextCol, row)]),
          this.projectedNode(nodes[index(nextCol, nextRow)]),
          this.projectedNode(nodes[index(col, nextRow)])
        ];
        ctx.fillStyle = panel.name === "roof"
          ? "rgba(225,244,252,.026)"
          : panel.name === "near-side"
            ? "rgba(231,248,255,.042)"
            : "rgba(205,230,242,.024)";
        ctx.beginPath();
        corners.forEach((point, cornerIndex) => cornerIndex ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = foreground ? "screen" : "source-over";

    for (let row = 0; row < rows; row += 1) {
      const points = [];
      for (let col = 0; col < cols; col += 1) points.push(this.projectedNode(nodes[index(col, row)]));
      drawLine(points);
    }
    for (let col = 0; col < cols; col += 1) {
      const points = [];
      for (let row = 0; row < rows; row += 1) points.push(this.projectedNode(nodes[index(col, row)]));
      drawLine(points);
    }
    ctx.restore();
  }
}

export function frameSegments(goal = GOAL, frameKick = 0) {
  const { width, height, depth } = goal;
  const nearX = -width / 2;
  const farX = width / 2;
  const kick = frameKick;
  const p = (x, y, z) => ({ x: x + kick * (x < 0 ? 0.35 : 0.12), y, z });
  return {
    rear: [
      [p(farX, 0, depth), p(nearX, 0, depth)],
      [p(farX, height, depth), p(nearX, height, depth)],
      [p(farX, 0, 0), p(farX, 0, depth)],
      [p(nearX, 0, 0), p(nearX, 0, depth)],
      [p(farX, height, 0), p(farX, height, depth)],
      [p(nearX, height, 0), p(nearX, height, depth)],
      [p(farX, 0, depth), p(farX, height, depth)],
      [p(nearX, 0, depth), p(nearX, height, depth)]
    ],
    front: [
      [p(farX, 0, 0), p(farX, height, 0)],
      [p(farX, height, 0), p(nearX, height, 0)],
      [p(nearX, height, 0), p(nearX, 0, 0)]
    ]
  };
}

export function projectGoalZone(camera, zone, { viewerRole = PENALTY_VIEWERS.STRIKER } = {}) {
  const point = camera.project(goalTargetWorld(zone));
  return normalizePenaltyViewer(viewerRole) === PENALTY_VIEWERS.KEEPER
    ? { ...point, x: 1280 - point.x }
    : point;
}

function averageDepth(panel, camera) {
  return panel.nodes.reduce((sum, node) => sum + camera.project(node.position).depth, 0) / panel.nodes.length;
}

export function clone(value) { return { x: value.x, y: value.y, z: value.z }; }
export function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
export function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
export function scale(value, scalar) { return { x: value.x * scalar, y: value.y * scalar, z: value.z * scalar }; }
export function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}
export function magnitude(value) { return Math.sqrt(dot(value, value)); }
export function normalize(value) {
  const length = magnitude(value);
  return length < EPSILON ? { x: 0, y: 0, z: 0 } : scale(value, 1 / length);
}
export function distance(a, b) { return magnitude(sub(a, b)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function lerpVec(a, b, t) { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) }; }
export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

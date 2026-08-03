import test from "node:test";
import assert from "node:assert/strict";
import {
  GOAL,
  BALL_RADIUS,
  OBLIQUE_CAMERA,
  SCENE_LAYOUT,
  PITCH_MARKINGS,
  VolumetricGoalNet,
  createCamera,
  getImpactTargets,
  goalTargetWorld,
  goalPocketWorld,
  projectGoalZone
} from "../shootout-net.mjs";

const topRight = { id: "top-right", u: 0.98, v: 0.075 };
const bottomCentre = { id: "bottom-centre", u: 0.5, v: 0.91 };

test("oblique camera makes the near post appear larger and lower", () => {
  const camera = createCamera(OBLIQUE_CAMERA);
  const nearBottom = camera.project({ x: -GOAL.width / 2, y: 0, z: 0 });
  const farBottom = camera.project({ x: GOAL.width / 2, y: 0, z: 0 });
  assert.ok(nearBottom.x > farBottom.x);
  assert.ok(nearBottom.y > farBottom.y);
  assert.ok(nearBottom.scale > farBottom.scale);
});

test("goal targets remain inside the front frame", () => {
  const point = goalTargetWorld(bottomCentre);
  assert.ok(point.x <= GOAL.width / 2 && point.x >= -GOAL.width / 2);
  assert.ok(point.y > 0 && point.y < GOAL.height);
  assert.equal(point.z, 0);
});

test("top-right shot excites roof and near-side panels", () => {
  const targets = getImpactTargets(topRight);
  assert.ok(targets.some(target => target.panel === "roof"));
  assert.ok(targets.some(target => target.panel === "near-side"));
});

test("centre-low shot primarily hits the back net", () => {
  const targets = getImpactTargets(bottomCentre);
  assert.equal(targets[0].panel, "back");
});

test("impact moves the volumetric net and it remains numerically stable", () => {
  const net = new VolumetricGoalNet();
  const panel = net.panel("back");
  const initial = panel.nodes.map(node => ({ ...node.position }));
  net.impactZone(bottomCentre, 1.1);
  for (let index = 0; index < 15; index += 1) net.update(1 / 60);
  const moved = panel.nodes.some((node, index) => {
    const before = initial[index];
    return Math.abs(node.position.z - before.z) > 0.001 || Math.abs(node.position.y - before.y) > 0.001;
  });
  assert.equal(moved, true);
  for (const currentPanel of net.panels) {
    for (const node of currentPanel.nodes) {
      assert.ok(Number.isFinite(node.position.x));
      assert.ok(Number.isFinite(node.position.y));
      assert.ok(Number.isFinite(node.position.z));
    }
  }
});

test("projected top-right zone is on the visual right side", () => {
  const camera = createCamera();
  const point = projectGoalZone(camera, topRight);
  assert.ok(point.x > OBLIQUE_CAMERA.width / 2);
});


test("0.5D separates the striker, ball and keeper into clear depth planes", () => {
  const camera = createCamera();
  const striker = camera.project(SCENE_LAYOUT.strikerBase);
  const ball = camera.project(SCENE_LAYOUT.ballStart);
  const keeper = camera.project(SCENE_LAYOUT.keeperBase);
  assert.ok(striker.depth < ball.depth);
  assert.ok(ball.depth < keeper.depth);
  assert.ok(striker.y > ball.y);
  assert.ok(ball.y > keeper.y + 180);
  assert.ok(SCENE_LAYOUT.strikerScale > SCENE_LAYOUT.keeperScale);
});

test("projected pitch-area front line sits below the goal line", () => {
  const camera = createCamera();
  const goalLine = PITCH_MARKINGS.find(marking => marking.id === "goal-line");
  const areaFront = PITCH_MARKINGS.find(marking => marking.id === "area-front");
  const goalY = (camera.project(goalLine.start).y + camera.project(goalLine.end).y) / 2;
  const frontY = (camera.project(areaFront.start).y + camera.project(areaFront.end).y) / 2;
  assert.ok(frontY > goalY + 120);
});

test("0.5D goal remains large enough for projected classroom play", () => {
  const camera = createCamera();
  const farPost = camera.project({ x: GOAL.width / 2, y: 0, z: 0 });
  const nearPost = camera.project({ x: -GOAL.width / 2, y: 0, z: 0 });
  assert.ok(nearPost.x - farPost.x > 430);
  assert.ok(nearPost.y - farPost.y > 45);
});


test("0.5D keeper foot anchor sits on the projected goal line", () => {
  const camera = createCamera();
  const ground = camera.project(SCENE_LAYOUT.keeperBase);
  const drawingOriginY = ground.y - SCENE_LAYOUT.keeperFootOffset * SCENE_LAYOUT.keeperScale;
  const reconstructedFeetY = drawingOriginY + SCENE_LAYOUT.keeperFootOffset * SCENE_LAYOUT.keeperScale;
  assert.ok(Math.abs(reconstructedFeetY - ground.y) < 0.001);
  assert.ok(SCENE_LAYOUT.keeperBase.z < 0.2);
});

test("0.5D roof and rear panels have visible natural resting sag", () => {
  const net = new VolumetricGoalNet({ quality: "high" });
  const roof = net.panel("roof");
  const rear = net.panel("back");
  const roofCentre = roof.nodes[Math.floor(roof.rows / 2) * roof.cols + Math.floor(roof.cols / 2)];
  const rearCentre = rear.nodes[Math.floor(rear.rows / 2) * rear.cols + Math.floor(rear.cols / 2)];
  assert.ok(roofCentre.rest.y < GOAL.height - 0.22);
  assert.ok(rearCentre.rest.y < GOAL.height / 2 - 0.12);
  assert.ok(rearCentre.rest.z < GOAL.depth - 0.25);
});


test("0.5E top-right contact sits tight inside the post and crossbar", () => {
  const point = goalTargetWorld(topRight);
  const horizontalGap = point.x - (-GOAL.width / 2);
  const verticalGap = GOAL.height - point.y;
  assert.ok(horizontalGap >= BALL_RADIUS);
  assert.ok(horizontalGap < BALL_RADIUS * 2.1);
  assert.ok(verticalGap >= BALL_RADIUS);
  assert.ok(verticalGap < BALL_RADIUS * 2.1);
});

test("0.5E corner pocket is deeper than the goal-mouth contact", () => {
  const contact = goalTargetWorld(topRight);
  const pocket = goalPocketWorld(topRight);
  assert.equal(contact.z, 0);
  assert.ok(pocket.z > GOAL.depth * 0.45);
  assert.ok(pocket.x < contact.x);
  assert.ok(pocket.y > contact.y);
});

test("0.5E top-right corner distributes impact across side roof and back nets", () => {
  const targets = getImpactTargets(topRight);
  assert.deepEqual(targets.map(target => target.panel), ["near-side", "roof", "back"]);
  assert.ok(targets[0].weight > targets[1].weight);
  assert.ok(targets[1].weight > targets[2].weight);
});

test("0.5E low-centre pocket travels deep into the rear net", () => {
  const contact = goalTargetWorld(bottomCentre);
  const pocket = goalPocketWorld(bottomCentre);
  assert.ok(pocket.z > GOAL.depth * 0.8);
  assert.ok(pocket.y <= contact.y);
});

test("0.7.1 net impact creates a delayed secondary ripple", () => {
  const net = new VolumetricGoalNet({ quality: "high" });
  net.impactZone(topRight, 1.4, { velocity: { x: -0.1, y: 0.08, z: 1 } });
  assert.ok(net.delayedImpulses.length >= 2);
  for (let index = 0; index < 4; index += 1) net.update(1 / 30);
  assert.equal(net.delayedImpulses.length, 0);
});

test("0.7.1 sagging net loses impact energy while remaining stable", () => {
  const net = new VolumetricGoalNet({ quality: "high" });
  net.impactZone(bottomCentre, 1.7, { velocity: { x: 0, y: -0.05, z: 1 } });
  for (let index = 0; index < 8; index += 1) net.update(1 / 60);
  const earlyEnergy = net.energy();
  for (let index = 0; index < 360; index += 1) net.update(1 / 60);
  const lateEnergy = net.energy();
  assert.ok(lateEnergy < earlyEnergy * 0.35);
  for (const panel of net.panels) {
    for (const node of panel.nodes) {
      assert.ok(Number.isFinite(node.position.x));
      assert.ok(node.position.y >= 0);
    }
  }
});

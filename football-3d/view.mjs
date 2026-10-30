import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { cacheKeeper, applyMatchKeeper } from "./dive.mjs";
import { makeStadium, makeNet } from "./stadium.mjs";
import { poseShooter } from "./shooter.mjs";
import {
  replayPlan,
  keeperTime,
  ballPosition,
  zonePoint,
  GOAL_LINE,
  NET_DEPTH,
  BALL_START,
  BALL_RADIUS,
} from "./motion.mjs";
import { TIMING, TARGETS } from "../football-motion.mjs";
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
let modelData;
function models() {
  if (!modelData)
    modelData = Promise.all(
      ["keeper", "shooter"].map(async (actor) => {
        const response = await fetch(`/assets/football/${actor}-v1.glb`, {
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error("Player download unavailable");
        return response.arrayBuffer();
      }),
    ).catch((error) => {
      modelData = null;
      throw error;
    });
  return modelData;
}
function disposeTree(root) {
  const objects = new Set();
  root.traverse((o) => {
    if (o.geometry) objects.add(o.geometry);
    for (const m of [].concat(o.material || [])) {
      objects.add(m);
      for (const value of Object.values(m))
        if (value?.isTexture) objects.add(value);
    }
  });
  for (const object of objects) object.dispose();
}
export class FootballView {
  constructor(canvas, onLost) {
    this.sourceCanvas = canvas;
    this.onLost = onLost;
    this.actors = [];
    this.scene = new T.Scene();
    this.scene.background = new T.Color("#aec6c5");
    this.scene.fog = new T.Fog("#aec6c5", 42, 100);
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.camera = new T.PerspectiveCamera(36, 16 / 9, 0.05, 150);
    this.camera.position.set(-15, 9, 12);
    this.camera.lookAt(0, 0.8, -0.5);
    this.camera.updateMatrixWorld();
    this.scene.add(new T.HemisphereLight(0xd6e9ff, 0x586441, 2.3));
    const sun = new T.DirectionalLight(0xfff6d9, 3.2);
    sun.position.set(-12, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -15,
      right: 15,
      top: 15,
      bottom: -15,
      near: 1,
      far: 70,
    });
    sun.shadow.bias = -0.0003;
    this.scene.add(sun);
    this.wrapper = document.createElement("div");
    Object.assign(this.wrapper.style, {
      position: "relative",
      width: "100%",
      aspectRatio: "16 / 9",
      overflow: "hidden",
      borderRadius: getComputedStyle(canvas).borderRadius,
    });
    canvas.before(this.wrapper);
    this.wrapper.append(canvas);
    this.originalStyle = canvas.getAttribute("style");
    Object.assign(canvas.style, {
      width: "100%",
      height: "100%",
      display: "block",
    });
    this.layer = this.renderer.domElement;
    this.layer.setAttribute("aria-hidden", "true");
    Object.assign(this.layer.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      visibility: "hidden",
    });
    this.wrapper.append(this.layer);
    this.contextLost = (event) => {
      event.preventDefault();
      this.onLost();
    };
    this.layer.addEventListener("webglcontextlost", this.contextLost);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.wrapper);
    this.buildPitch();
    this.resize();
    this.ready = this.load();
  }
  buildPitch() {
    this.stadium = makeStadium(this.scene);
    const goal = new T.Group(),
      netDepth = NET_DEPTH,
      goalLine = GOAL_LINE,
      white = new T.MeshStandardMaterial({ color: 0xecf1e6, roughness: 0.38 });
    this.scene.add(goal);
    goal.position.z = goalLine;
    function bar(a, b, r = 0.05) {
      const delta = V(...b).sub(V(...a));
      const m = new T.Mesh(
        new T.CylinderGeometry(r, r, delta.length(), 10),
        white,
      );
      m.position.copy(
        V(...a)
          .add(V(...b))
          .multiplyScalar(0.5),
      );
      m.quaternion.setFromUnitVectors(V(0, 1, 0), delta.normalize());
      m.castShadow = true;
      goal.add(m);
    }
    bar([-3.66, 0, 0], [-3.66, 2.44, 0]);
    bar([3.66, 0, 0], [3.66, 2.44, 0]);
    bar([-3.66, 2.44, 0], [3.66, 2.44, 0]);
    for (const x of [-3.66, 3.66]) {
      bar([x, 2.44, 0], [x, 2.44, -netDepth], 0.025);
      bar([x, 2.44, -netDepth], [x, 0, -netDepth], 0.025);
      bar([x, 0, 0], [x, 0, -netDepth], 0.025);
    }
    bar([-3.66, 0, -netDepth], [3.66, 0, -netDepth], 0.025);
    this.net = makeNet(goal, netDepth);
    const ballTex = document.createElement("canvas");
    ballTex.width = 256;
    ballTex.height = 128;
    const bctx = ballTex.getContext("2d");
    bctx.fillStyle = "#f2f2e9";
    bctx.fillRect(0, 0, 256, 128);
    bctx.fillStyle = "#283034";
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 6; i++) {
        const x = i * 46 + (j % 2) * 23,
          y = j * 43 + 10;
        bctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k * Math.PI * 2) / 5;
          bctx.lineTo(x + 11 * Math.cos(a), y + 11 * Math.sin(a));
        }
        bctx.closePath();
        bctx.fill();
      }
    const bt = new T.CanvasTexture(ballTex);
    bt.colorSpace = T.SRGBColorSpace;
    this.ball = new T.Mesh(
      new T.SphereGeometry(BALL_RADIUS, 20, 14),
      new T.MeshStandardMaterial({ map: bt, roughness: 0.7 }),
    );
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    this.marker = new T.Mesh(
      new T.RingGeometry(0.1, 0.14, 32),
      new T.MeshBasicMaterial({
        color: 0xf1ef9e,
        side: T.DoubleSide,
        depthTest: false,
      }),
    );
    this.scene.add(this.marker);
    this.marker.visible = false;
    this.guide = new T.Group();
    this.scene.add(this.guide);
    for (const target of TARGETS) {
      const dot = new T.Mesh(
        new T.SphereGeometry(0.045, 8, 6),
        new T.MeshBasicMaterial({ color: 0xf1ef9e }),
      );
      dot.position.copy(V(...Object.values(zonePoint(target.id))));
      this.guide.add(dot);
    }
    this.guide.visible = false;
  }
  async load() {
    const buffers = await models();
    const loader = new GLTFLoader();
    for (const [i, buffer] of buffers.entries()) {
      if (this.destroyed) return;
      const g = await loader.parseAsync(buffer, "");
      if (this.destroyed) {
        disposeTree(g.scene);
        return;
      }
      const group = new T.Group();
      group.add(g.scene);
      this.scene.add(group);
      g.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.frustumCulled = false;
        }
      });
      g.scene.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(g.scene, true);
      group.scale.setScalar((i === 0 ? 1.9 : 1.8) / (box.max.y - box.min.y));
      g.scene.position.y -= box.min.y;
      // The keeper's boot skin extends 18 mm below its ankle-based IK floor.
      group.position.set(0, i === 0 ? 0.025 : 0, i === 0 ? -5 : BALL_START.z + 1.8);
      group.rotation.y = i === 0 ? 0 : Math.PI;
      group.updateMatrixWorld(true);
      const mixer = new T.AnimationMixer(g.scene),
        clip = g.animations.find((c) => c.name === "Kick_a_Soccer_Ball");
      const actor = {
        root: g.scene,
        group,
        mixer,
        action: clip ? mixer.clipAction(clip) : null,
      };
      if (i === 0) cacheKeeper(actor);
      else {
        actor.actions = {};
        for (const [name, clipName] of Object.entries({
          idle: "Idle_9", run: "Running", kick: "Kick_a_Soccer_Ball",
        })) {
          const animation = g.animations.find((c) => c.name === clipName);
          if (!animation) throw new Error(`Missing shooter animation: ${clipName}`);
          const action = mixer.clipAction(animation);
          action.play();
          action.paused = true;
          actor.actions[name] = action;
        }
      }
      this.actors.push(actor);
    }
  }
  resize() {
    if (this.destroyed) return;
    const w = this.wrapper.clientWidth || 1280,
      h = (w * 9) / 16;
    this.renderer.setSize(w, h, false);
    // Always compose at 16:9: the same TV framing on phones and desktops.
    this.camera.aspect = 16 / 9;
    this.camera.updateProjectionMatrix();
    this.needsRender = true;
  }
  gloves() {
    return this.actors[0].bones.LeftHand.getWorldPosition(V())
      .add(this.actors[0].bones.RightHand.getWorldPosition(V()))
      .multiplyScalar(0.5);
  }
  poseKeeper(plan, t) {
    applyMatchKeeper(this.actors[0], keeperTime(t, plan), plan);
  }
  render(
    round,
    time,
    { reducedMotion = false, sag = 1.6, preview = null, guide = false } = {},
  ) {
    if (this.destroyed || this.actors.length !== 2) return;
    const plan = replayPlan(
      round || {
        shotZone: "middle-centre",
        keeperZone: "middle-centre",
        outcome: "save",
      },
    );
    const t = round
      ? reducedMotion
        ? time < TIMING.contact
          ? 0
          : TIMING.end
        : time
      : 0;
    const key = JSON.stringify([plan.data, t, sag, preview, guide]);
    if (!this.needsRender && key === this.frameKey) return;
    this.frameKey = key;
    this.needsRender = false;
    let contact = plan.contact;
    if (round && plan.stopped) {
      this.poseKeeper(plan, TIMING.contact);
      contact = this.gloves();
    }
    this.poseKeeper(plan, t);
    const shooter = this.actors[1];
    const approach = poseShooter(shooter, t, Boolean(round));
    const pos = round
      ? ballPosition(plan, t, contact, this.gloves())
      : BALL_START;
    this.ball.position.set(pos.x, pos.y, pos.z);
    this.ball.rotation.set(t * 8, 0, t * 4);
    this.net.update(
      t,
      round && plan.data.outcome === "goal"
        ? {
            at: TIMING.net,
            x: plan.shot.x,
            y: Math.max(0.11, plan.shot.y - 0.18),
          }
        : null,
      T.MathUtils.clamp(sag, 0.4, 2),
    );
    this.guide.visible = guide && !round;
    this.marker.visible = Boolean(preview) && !round;
    if (this.marker.visible) {
      const p = zonePoint(preview);
      this.marker.position.set(p.x, p.y, p.z + 0.03);
    }
    this.layer.style.visibility = "visible";
    this.renderer.render(this.scene, this.camera);
    this.lastFrame = {
      plan,
      time: t,
      shooter: approach,
      ball: pos,
      gloves: this.gloves().toArray(),
      contact: { x: contact.x, y: contact.y, z: contact.z },
    };
  }
  projectZone(id) {
    const p = zonePoint(id),
      v = V(p.x, p.y, p.z).project(this.camera);
    return { x: (v.x + 1) * 640, y: (1 - v.y) * 360 };
  }
  targetAtScreen(x, y) {
    return TARGETS.map((t) => ({
      ...t,
      d: Math.hypot(x - this.projectZone(t.id).x, y - this.projectZone(t.id).y),
    }))
      .sort((a, b) => a.d - b.d)
      .find((t) => t.d < 60);
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.layer?.removeEventListener("webglcontextlost", this.contextLost);
    for (const a of this.actors) {
      a.mixer.stopAllAction();
      a.mixer.uncacheRoot(a.root);
    }
    disposeTree(this.scene);
    for (const light of this.scene.children) light.shadow?.dispose();
    this.renderer.dispose();
    this.layer?.remove();
    if (this.wrapper?.parentNode) {
      this.wrapper.before(this.sourceCanvas);
      this.wrapper.remove();
    }
    if (this.originalStyle === null) this.sourceCanvas.removeAttribute("style");
    else this.sourceCanvas.setAttribute("style", this.originalStyle);
  }
}

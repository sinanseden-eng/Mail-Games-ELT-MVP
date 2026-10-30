import * as T from "three";
import { BALL_START } from "./motion.mjs";
export function makeStadium(scene) {
  const root = new T.Group();
  scene.add(root);
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const pix = ctx.createImageData(512, 512);
  for (let i = 0; i < pix.data.length; i += 4) {
    const v = rand();
    pix.data[i] = 35 + v * 25;
    pix.data[i + 1] = 78 + v * 35;
    pix.data[i + 2] = 32 + v * 22;
    pix.data[i + 3] = 255;
  }
  ctx.putImageData(pix, 0, 0);
  const texture = new T.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(40, 60);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const grass = new T.Mesh(
    new T.PlaneGeometry(100, 110),
    new T.MeshStandardMaterial({ map: texture, color: 0xb4d58c, roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  root.add(grass);
  for (let i = 0; i < 15; i++) {
    const stripe = new T.Mesh(
      new T.PlaneGeometry(54, 76 / 15),
      new T.MeshStandardMaterial({
        color: i % 2 ? 0x416c31 : 0x244e22,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      }),
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.003, -38 + ((i + 0.5) * 76) / 15);
    root.add(stripe);
  }
  function line(points) {
    const g = new T.BufferGeometry().setFromPoints(
      points.map(([x, z]) => new T.Vector3(x, 0.012, z)),
    );
    const l = new T.Line(g, new T.LineBasicMaterial({ color: 0xc5d9c0 }));
    root.add(l);
  }
  line([
    [-24, -34],
    [24, -34],
    [24, 34],
    [-24, 34],
    [-24, -34],
  ]);
  line([
    [-24, 17],
    [24, 17],
  ]);
  // The penalty end used for the rehearsal: goal line at z=-5.5, spot eleven metres away.
  line([
    [-24, -5.5],
    [24, -5.5],
  ]);
  line([
    [-20.16, -5.5],
    [-20.16, 11],
    [20.16, 11],
    [20.16, -5.5],
  ]);
  line([
    [-9.16, -5.5],
    [-9.16, 0],
    [9.16, 0],
    [9.16, -5.5],
  ]);
  const spot = new T.Mesh(
    new T.CircleGeometry(0.09, 16),
    new T.MeshBasicMaterial({ color: 0xe7eddb }),
  );
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(BALL_START.x, 0.014, BALL_START.z);
  root.add(spot);
  const stands = new T.Group();
  root.add(stands);
  const concrete = new T.MeshStandardMaterial({
    color: 0x364349,
    roughness: 0.95,
  });
  const colors = [0x145a85, 0xd56325, 0xd7d9bd, 0x702e40, 0x324945, 0x1c292c];
  const dummy = new T.Object3D();
  for (const [section, x, z, rot] of [
    [0, 0, -13, 0],
    [1, -29, 7, Math.PI / 2],
    [2, 29, 7, -Math.PI / 2],
  ]) {
    const s = new T.Group();
    s.position.set(x, 0, z);
    s.rotation.y = rot;
    stands.add(s);
    const base = new T.Mesh(new T.BoxGeometry(48, 1, 8), concrete);
    base.position.set(0, 0.5, -3);
    s.add(base);
    for (let row = 0; row < 8; row++) {
      const bench = new T.Mesh(new T.BoxGeometry(48, 0.7, 0.9), concrete);
      bench.position.set(0, 1 + row * 0.75, -row * 0.85);
      s.add(bench);
    }
    const bodies = new T.InstancedMesh(
      new T.BoxGeometry(0.27, 0.4, 0.19),
      new T.MeshStandardMaterial({ roughness: 1 }),
      8 * 100,
    );
    const heads = new T.InstancedMesh(
      new T.SphereGeometry(0.1, 5, 4),
      new T.MeshStandardMaterial({ color: 0xb4977f, roughness: 1 }),
      8 * 100,
    );
    let idx = 0;
    for (let r = 0; r < 8; r++)
      for (let j = 0; j < 100; j++) {
        dummy.position.set(
          (j - 50) * 0.47 + rand() * 0.07,
          1.48 + r * 0.75,
          -r * 0.85,
        );
        dummy.rotation.y = (rand() - 0.5) * 0.3;
        dummy.updateMatrix();
        bodies.setMatrixAt(idx, dummy.matrix);
        bodies.setColorAt(
          idx,
          new T.Color(colors[Math.floor(rand() * colors.length)]),
        );
        dummy.position.y += 0.3;
        dummy.updateMatrix();
        heads.setMatrixAt(idx++, dummy.matrix);
      }
    s.add(bodies, heads);
  }
  const banner = new T.Mesh(
    new T.BoxGeometry(48, 0.7, 0.12),
    new T.MeshStandardMaterial({ color: 0x142f3a }),
  );
  banner.position.set(0, 0.48, -12);
  root.add(banner);
  return {
    root,
    update(t) {
      stands.children.forEach((s, i) => {
        s.position.y = Math.sin(t * 2 + i) * 0.016;
      });
    },
  };
}
export function makeNet(goal, depth = 1.8) {
  const panels = [];
  const mat = new T.LineBasicMaterial({
    color: 0xd9e6db,
    transparent: true,
    opacity: 0.18,
    linewidth: 1,
    depthWrite: false,
  });
  function panel(kind, nx, ny) {
    const points = [],
      uv = [];
    for (let axis = 0; axis < 2; axis++) {
      const n = axis ? ny : nx,
        m = axis ? nx : ny;
      for (let j = 0; j <= n; j++)
        for (let k = 0; k < m; k++) {
          for (const step of [k, k + 1]) {
            const u = axis ? step / m : j / n,
              v = axis ? j / n : step / m;
            uv.push([u, v]);
            points.push(0, 0, 0);
          }
        }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(points, 3));
    const lines = new T.LineSegments(g, mat);
    goal.add(lines);
    panels.push({ g, uv, kind });
  }
  panel("back", 24, 10);
  panel("roof", 24, 6);
  panel("left", 6, 10);
  panel("right", 6, 10);
  function update(t, impact = null, sag = 1.6) {
    for (const { g, uv, kind } of panels) {
      const a = g.attributes.position;
      for (let i = 0; i < uv.length; i++) {
        const [u, v] = uv[i];
        let x, y, z;
        if (kind === "back") {
          x = -3.66 + u * 7.32;
          y = v * 2.44;
          z =
            -depth -
            0.1 * (sag / 1.6) * Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
        } else if (kind === "roof") {
          x = -3.66 + u * 7.32;
          y =
            2.44 -
            0.18 * (sag / 1.6) * Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
          z = -depth * v;
        } else {
          x = kind === "left" ? -3.66 : 3.66;
          y = v * 2.44;
          z = -u * depth;
        }
        if (impact && t > impact.at) {
          const age = t - impact.at;
          const r = Math.hypot(x - impact.x, (y - impact.y) * 1.4);
          const edge = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
          z -=
            0.52 *
            Math.exp(-age * 2.2) *
            Math.exp((-r * r) / 2.2) *
            Math.sin(Math.min(age * 8, Math.PI)) *
            edge;
          z += 0.07 * Math.exp(-age * 2) * Math.sin(r * 7 - age * 16) * edge;
        }
        a.setXYZ(i, x, y, z);
      }
      a.needsUpdate = true;
      g.computeBoundingSphere();
    }
  }
  update(0);
  return { update, depth, panels, material: mat };
}

import * as THREE from "three";
import { COLORS, GROOVE_HALF, LABEL_R, R_OUTER, WALL_H } from "./config";
import type { Chart } from "./chart";
import { floorY, radiusAt, spiralAngle, spiralXZ, waveY } from "./math";

export function makeRecordTexture(side: "A" | "B"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  const cx = 512;
  const cy = 512;
  g.fillStyle = "#efe2c4";
  g.fillRect(0, 0, 1024, 1024);
  for (let r = 508; r > 158; r -= 2.15) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.strokeStyle = r % 7 < 2 ? "rgba(22,18,14,0.28)" : "rgba(22,18,14,0.08)";
    g.lineWidth = 1.1;
    g.stroke();
  }
  g.beginPath();
  g.arc(cx, cy, 156, 0, Math.PI * 2);
  g.fillStyle = "#c41e3a";
  g.fill();
  g.beginPath();
  g.arc(cx, cy, 156, 0, Math.PI * 2);
  g.strokeStyle = "#c4a574";
  g.lineWidth = 5;
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, 148, 0, Math.PI * 2);
  g.strokeStyle = "rgba(244,230,195,0.35)";
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = "#f4e6c3";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "600 18px Figtree, sans-serif";
  g.fillText("RECORD KILLER", cx, cy - 28);
  g.font = "600 42px 'Cormorant Garamond', Georgia, serif";
  g.fillText("33½", cx, cy + 6);
  g.font = "500 13px Figtree, sans-serif";
  g.fillText("MICROGROOVE", cx, cy + 38);
  g.font = "500 12px Figtree, sans-serif";
  g.fillText(side === "B" ? "SIDE B" : "SIDE A", cx, cy + 56);
  g.beginPath();
  g.arc(cx, cy, 13, 0, Math.PI * 2);
  g.fillStyle = "#16120e";
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeCabinet(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: COLORS.walnut });
  const brass = new THREE.MeshLambertMaterial({ color: COLORS.brass });
  const cream = new THREE.MeshLambertMaterial({ color: COLORS.paper });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.55, 11.4), wood);
  plinth.position.y = -0.38;
  g.add(plinth);

  const lip = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.08, 11.6), wood);
  lip.position.y = -0.08;
  g.add(lip);

  const platter = new THREE.Mesh(new THREE.CylinderGeometry(5.15, 5.15, 0.08, 64), cream);
  platter.position.y = -0.02;
  g.add(platter);

  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.1, 16), brass);
  knob.position.set(5.2, 0.02, 5.15);
  g.add(knob);

  return g;
}

export function makeDisc(tex: THREE.Texture): THREE.Mesh {
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(R_OUTER + 0.08, 96), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

export function makeLabelCap(): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.cherry });
  const m = new THREE.Mesh(new THREE.CircleGeometry(LABEL_R, 48), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

const SEG = 280;
const RING = 4;

export class GrooveRibbon {
  mesh: THREE.Mesh;
  private pos: THREE.BufferAttribute;
  private col: THREE.BufferAttribute;
  private kicks: number[] = [];
  private tick = 0;

  constructor() {
    const geo = new THREE.BufferGeometry();
    const verts = SEG * RING;
    const positions = new Float32Array(verts * 3);
    const indices: number[] = [];
    const colors = new Float32Array(verts * 3);
    for (let i = 0; i < SEG; i++) {
      const p = i / (SEG - 1);
      this.writeSlice(positions, colors, i, p, 0, 0);
      if (i < SEG - 1) {
        const a = i * RING;
        const b = (i + 1) * RING;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
        indices.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
        indices.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3);
      }
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    this.pos = geo.getAttribute("position") as THREE.BufferAttribute;
    this.col = geo.getAttribute("color") as THREE.BufferAttribute;
    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 0.025;
  }

  setKicks(kicks: number[]) {
    this.kicks = kicks;
  }

  private writeSlice(
    arr: Float32Array,
    cols: Float32Array,
    i: number,
    p: number,
    t: number,
    intensity: number,
  ) {
    const y = floorY(p, t, intensity, this.kicks);
    const a = spiralAngle(p);
    const r = radiusAt(p);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const half = GROOVE_HALF;
    const lanes = [-half, -half, half, half];
    const ys = [y + WALL_H, y, y, y + WALL_H];
    const wall = [0.42, 0.32, 0.22];
    const floor = [0.91, 0.82, 0.62];
    for (let k = 0; k < RING; k++) {
      const rr = r + lanes[k]!;
      const o = (i * RING + k) * 3;
      arr[o] = ca * rr;
      arr[o + 1] = ys[k]!;
      arr[o + 2] = sa * rr;
      const c = k === 1 || k === 2 ? floor : wall;
      cols[o] = c[0]!;
      cols[o + 1] = c[1]!;
      cols[o + 2] = c[2]!;
    }
  }

  update(t: number, intensity: number) {
    const arr = this.pos.array as Float32Array;
    const cols = this.col.array as Float32Array;
    for (let i = 0; i < SEG; i++) {
      this.writeSlice(arr, cols, i, i / (SEG - 1), t, intensity);
    }
    this.pos.needsUpdate = true;
    this.tick += 1;
    if (this.tick % 3 === 0) this.mesh.geometry.computeVertexNormals();
  }
}

export class Obstacles {
  group = new THREE.Group();
  private ridges: THREE.Mesh[] = [];
  private spikes: THREE.Mesh[] = [];
  private ridgeP: number[] = [];
  private spikeP: number[] = [];
  private spikeSide: number[] = [];
  private ridgeMat: THREE.MeshBasicMaterial;
  private spikeMat: THREE.MeshBasicMaterial;

  constructor() {
    this.ridgeMat = new THREE.MeshBasicMaterial({ color: COLORS.ink });
    this.spikeMat = new THREE.MeshBasicMaterial({ color: COLORS.cherry });
  }

  rebuild(chart: Chart) {
    for (const m of [...this.ridges, ...this.spikes]) {
      this.group.remove(m);
      m.geometry.dispose();
    }
    this.ridges = [];
    this.spikes = [];
    this.ridgeP = chart.kicks.slice();
    this.spikeP = chart.snares.map((s) => s.p);
    this.spikeSide = chart.snares.map((s) => s.side);

    const ridgeGeo = new THREE.BoxGeometry(GROOVE_HALF * 1.7, 0.12, 0.09);
    for (const p of this.ridgeP) {
      const m = new THREE.Mesh(ridgeGeo, this.ridgeMat);
      const [x, z] = spiralXZ(p, 0);
      m.position.set(x, 0.08, z);
      this.ridges.push(m);
      this.group.add(m);
    }
    const spikeGeo = new THREE.ConeGeometry(0.07, 0.22, 5);
    for (let i = 0; i < this.spikeP.length; i++) {
      const m = new THREE.Mesh(spikeGeo, this.spikeMat);
      const p = this.spikeP[i]!;
      const [x, z] = spiralXZ(p, this.spikeSide[i]! * 0.85);
      m.position.set(x, 0.12, z);
      this.spikes.push(m);
      this.group.add(m);
    }
  }

  update(t: number, intensity: number, kicks: number[]) {
    for (let i = 0; i < this.ridges.length; i++) {
      const p = this.ridgeP[i]!;
      const [x, z] = spiralXZ(p, 0);
      const y = floorY(p, t, intensity, kicks) + 0.07;
      const m = this.ridges[i]!;
      m.position.set(x, y, z);
      const a = spiralAngle(p);
      m.rotation.y = -a;
    }
    for (let i = 0; i < this.spikes.length; i++) {
      const p = this.spikeP[i]!;
      const side = this.spikeSide[i]!;
      const [x, z] = spiralXZ(p, side * 0.85);
      const y = waveY(p, t, intensity) + 0.12;
      const m = this.spikes[i]!;
      m.position.set(x, y, z);
    }
  }
}

export class Tonearm {
  root = new THREE.Group();
  private yaw = new THREE.Group();
  private beam: THREE.Mesh;
  private head: THREE.Group;

  constructor() {
    const brass = new THREE.MeshStandardMaterial({
      color: COLORS.brass,
      roughness: 0.35,
      metalness: 0.7,
    });
    const ink = new THREE.MeshBasicMaterial({ color: COLORS.ink });
    const ruby = new THREE.MeshBasicMaterial({ color: COLORS.ruby });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.16, 16), brass);
    this.root.add(base);
    this.root.add(this.yaw);

    this.beam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 4.6), brass);
    this.beam.position.z = -2.3;
    this.yaw.add(this.beam);

    this.head = new THREE.Group();
    this.head.position.z = -4.55;
    this.yaw.add(this.head);
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.28), ink);
    this.head.add(shell);
    const needle = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.16, 6), ruby);
    needle.rotation.x = Math.PI;
    needle.position.y = -0.1;
    this.head.add(needle);

    this.root.position.set(5.55, 0.28, 0.4);
  }

  setLift(v: number) {
    this.yaw.rotation.x = -v;
  }

  pointAt(x: number, z: number, lift: number) {
    const px = this.root.position.x;
    const pz = this.root.position.z;
    const dx = x - px;
    const dz = z - pz;
    this.yaw.rotation.y = Math.atan2(dx, dz);
    this.yaw.rotation.x = -lift;
    const dist = Math.hypot(dx, dz);
    this.beam.scale.z = dist / 4.6;
    this.beam.position.z = -dist / 2;
    this.head.position.z = -dist;
  }
}

import * as THREE from "three";
import type { HatId } from "./hats";
import { hatById } from "./hats";

const W = 256;
const H = 384;
const INK = "#16120e";

type Pose = "idle" | "run" | "jump" | "fall" | "trip" | "dead" | "won";

function hex(n: number) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function bone(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thick: number,
) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineWidth = thick;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function torsoPath(ctx: CanvasRenderingContext2D, hip: number, shoulder: number) {
  ctx.beginPath();
  ctx.moveTo(-7, hip + 8);
  ctx.bezierCurveTo(-24, hip - 18, -22, shoulder + 12, -11, shoulder);
  ctx.quadraticCurveTo(0, shoulder - 12, 13, shoulder);
  ctx.bezierCurveTo(24, shoulder + 12, 22, hip - 18, 9, hip + 8);
  ctx.closePath();
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  color: string,
  pad: number,
  pose: Pose,
  phase: number,
) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  const hip = -92;
  const shoulder = -170;
  const headY = -232;
  let aL = 0.25;
  let aR = -0.45;
  let lL = 0.35;
  let lR = -0.3;
  let armsUp = false;

  if (pose === "run" || pose === "idle") {
    const amp = pose === "run" ? 0.58 : 0.08;
    lL = Math.sin(phase) * amp;
    lR = Math.sin(phase + Math.PI) * amp;
    aL = Math.sin(phase + Math.PI) * amp * 0.62;
    aR = Math.sin(phase) * amp * 0.62;
  } else if (pose === "jump") {
    lL = -0.68;
    lR = 0.22;
    aL = -1.05;
    aR = 0.68;
  } else if (pose === "fall") {
    lL = 0.18;
    lR = -0.22;
    aL = 0.8;
    aR = -0.32;
  } else if (pose === "trip") {
    lL = 0.92;
    lR = -0.12;
    aL = 1.1;
    aR = -0.8;
  } else if (pose === "dead") {
    lL = 1.12;
    lR = 0.82;
    aL = 0.28;
    aR = -0.12;
  } else if (pose === "won") {
    lL = 0.1;
    lR = -0.1;
    armsUp = true;
  }

  const leg = 90;
  const arm = 72;
  bone(ctx, -13, hip, -13 + Math.sin(lL) * leg, hip + Math.cos(lL) * leg, 14 + pad);
  bone(ctx, 13, hip, 13 + Math.sin(lR) * leg, hip + Math.cos(lR) * leg, 14 + pad);
  torsoPath(ctx, hip, shoulder);
  ctx.fill();
  if (pad > 0) {
    ctx.lineWidth = pad;
    ctx.stroke();
  }
  if (armsUp) {
    bone(ctx, -15, shoulder + 6, -20, shoulder - arm, 11 + pad);
    bone(ctx, 15, shoulder + 6, 22, shoulder - arm, 11 + pad);
  } else {
    bone(
      ctx,
      -15,
      shoulder + 6,
      -15 + Math.sin(aL) * arm,
      shoulder + 6 + Math.cos(aL) * arm,
      11 + pad,
    );
    bone(
      ctx,
      15,
      shoulder + 6,
      15 + Math.sin(aR) * arm,
      shoulder + 6 + Math.cos(aR) * arm,
      11 + pad,
    );
  }
  ctx.beginPath();
  ctx.arc(2, headY, 29 + pad * 0.35, 0, Math.PI * 2);
  ctx.fill();
  return { headY, shoulder };
}

function drawHat(
  ctx: CanvasRenderingContext2D,
  id: HatId,
  hx: number,
  hy: number,
  color: string,
  tilt: number,
) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const brim = (w: number, t: number) => {
    ctx.beginPath();
    ctx.ellipse(0, 10, w, t, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  switch (id) {
    case "fedora": {
      brim(58, 9);
      ctx.beginPath();
      ctx.moveTo(-30, 8);
      ctx.lineTo(-24, -32);
      ctx.quadraticCurveTo(0, -46, 24, -32);
      ctx.lineTo(30, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillRect(-28, 1, 56, 8);
      break;
    }
    case "porkpie": {
      brim(46, 8);
      ctx.beginPath();
      ctx.roundRect(-28, -26, 56, 34, 4);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "beret": {
      ctx.beginPath();
      ctx.ellipse(8, -8, 46, 20, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(18, -26);
      ctx.lineTo(22, -40);
      ctx.lineWidth = 6;
      ctx.strokeStyle = color;
      ctx.stroke();
      break;
    }
    case "boater": {
      brim(60, 8);
      ctx.beginPath();
      ctx.rect(-30, -22, 60, 30);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillRect(-30, -2, 60, 8);
      break;
    }
    case "bowler": {
      brim(46, 8);
      ctx.beginPath();
      ctx.arc(0, 6, 34, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "newsboy": {
      ctx.beginPath();
      ctx.ellipse(0, -2, 42, 26, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, 8);
      ctx.lineTo(42, 16);
      ctx.lineTo(38, 4);
      ctx.lineTo(10, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function drawPose(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  phase: number,
  hatId: HatId,
  hatColor: string,
) {
  ctx.clearRect(0, 0, W, H);
  const cx = W * 0.5;
  const ground = H - 12;
  const lean = pose === "dead" ? 1.15 : pose === "trip" ? 0.45 : pose === "won" ? 0 : 0.08;

  ctx.save();
  ctx.translate(cx, ground);
  ctx.rotate(lean);
  drawBody(ctx, "#f4e6c3", 8, pose, phase);
  const { headY } = drawBody(ctx, INK, 0, pose, phase);
  const tilt = pose === "trip" ? -0.4 : pose === "dead" ? 0.55 : -0.16;
  drawHat(ctx, hatId, 2, headY - 26, hatColor, tilt);
  ctx.restore();
}

export class Runner {
  root = new THREE.Group();
  private card: THREE.Sprite;
  private shadow: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  hatId: HatId = "fedora";
  private hatColor = hex(hatById("fedora").color);
  private phase = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.magFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: this.tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.card = new THREE.Sprite(mat);
    this.card.center.set(0.5, 0);
    this.card.scale.set(0.7, 1.05, 1);
    this.card.frustumCulled = false;
    this.card.renderOrder = 4;

    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x16120e,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.12, 18), shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.014;
    this.shadow.renderOrder = 1;

    this.root.add(this.shadow, this.card);
    this.paint("idle", 0);
  }

  setHat(id: HatId) {
    if (id === this.hatId) return;
    this.hatId = id;
    this.hatColor = hex(hatById(id).color);
    this.paint("idle", 0);
  }

  update(
    _dt: number,
    opts: {
      grounded: boolean;
      vy: number;
      t: number;
      bpm: number;
      trip: number;
      dead: boolean;
      won: boolean;
    },
  ) {
    const { grounded, vy, t, bpm, trip, dead, won } = opts;
    let pose: Pose = "run";
    if (dead) pose = "dead";
    else if (won) pose = "won";
    else if (trip > 0) pose = "trip";
    else if (!grounded && vy > 0) pose = "jump";
    else if (!grounded) pose = "fall";
    else pose = "run";

    if (pose === "run") this.phase = t * (bpm / 60) * Math.PI * 2;
    this.paint(pose, this.phase);

    const squash = !grounded && vy > 0 ? 1.08 : !grounded ? 0.94 : 1;
    this.card.scale.set(0.7 / squash, 1.05 * squash, 1);
    this.shadow.scale.setScalar(grounded ? 1 : 0.7);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = grounded ? 0.28 : 0.14;
  }

  private paint(pose: Pose, phase: number) {
    drawPose(this.ctx, pose, phase, this.hatId, this.hatColor);
    this.tex.needsUpdate = true;
  }
}

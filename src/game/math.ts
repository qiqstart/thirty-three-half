import { LABEL_R, LANE_WIDTH, R_INNER, R_OUTER, TURNS } from "./config.ts";

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothstep(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function expDamp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function radiusAt(p: number) {
  return lerp(R_OUTER, R_INNER, clamp(p, 0, 1));
}

export function spiralAngle(p: number) {
  const x = clamp(p, 0, 1);
  const mixed = x * 0.32 + smoothstep(x) * 0.68;
  return mixed * TURNS * Math.PI * 2;
}

export function spiralXZ(p: number, lane: number): [number, number] {
  const a = spiralAngle(p);
  const r = radiusAt(p) + lane * LANE_WIDTH;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

export function spiralTangent(p: number): [number, number] {
  const eps = 0.0009;
  const [x0, z0] = spiralXZ(clamp(p - eps, 0, 1), 0);
  const [x1, z1] = spiralXZ(clamp(p + eps, 0, 1), 0);
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz) || 1;
  return [dx / len, dz / len];
}

export function waveY(p: number, t: number, intensity: number) {
  const amp = 0.01 + intensity * 0.12;
  const f1 = 16 + intensity * 38;
  const f2 = 6.5 + intensity * 12;
  return (
    amp * Math.sin(p * f1 * Math.PI * 2 + t * 0.65) +
    amp * 0.48 * Math.sin(p * f2 * Math.PI * 2 - t * 0.38)
  );
}

export function ridgeY(p: number, kicks: number[], scale = 1) {
  let y = 0;
  const w = 0.0018;
  for (let i = 0; i < kicks.length; i++) {
    const d = p - kicks[i]!;
    if (d > -0.018 && d < 0.018) {
      y += 0.16 * scale * Math.exp(-(d * d) / (2 * w * w));
    }
  }
  return y;
}

export function floorY(p: number, t: number, intensity: number, kicks: number[]) {
  return waveY(p, t, intensity) + ridgeY(p, kicks, 0.55 + intensity * 0.55);
}

export function labelBlend(p: number) {
  return clamp((p - 0.92) / 0.08, 0, 1);
}

export function distToLabel(p: number) {
  return Math.max(0, radiusAt(p) - LABEL_R);
}

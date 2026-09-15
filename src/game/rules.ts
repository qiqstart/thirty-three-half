import { LAG_PER_HIT, LAG_RECOVER, NEEDLE_LEAD, SONG_DURATION } from "./config.ts";
import { clamp } from "./math.ts";

export const KICK_WINDOW = 0.002;
export const KICK_CLEAR_Y = 0.13;
export const SNARE_WINDOW = 0.0024;
export const SNARE_LANE_SCALE = 0.85;
export const SNARE_LANE_TOL = 0.5;
export const SNARE_CLEAR_Y = 0.18;
export const NEEDLE_GRACE = 1.2;
export const WIN_PROGRESS = 0.995;
export const HIT_TRIP = 0.45;
export const HIT_INVULN = 0.55;
export const START_INVULN = 0.4;

export type Snare = { p: number; side: number };

export function playerProgress(songT: number, lag: number): number {
  return clamp(songT / SONG_DURATION - lag, 0, 1);
}

export function needleProgress(songT: number): number {
  return songT / SONG_DURATION - NEEDLE_LEAD;
}

export function needleGap(playerP: number, needleP: number): number {
  return clamp((playerP - needleP) / NEEDLE_LEAD, 0, 1.4);
}

export function kickHits(
  p: number,
  y: number,
  base: number,
  kicks: readonly number[],
): boolean {
  return kicks.some((kp) => Math.abs(p - kp) <= KICK_WINDOW && y < base + KICK_CLEAR_Y);
}

export function snareHits(
  p: number,
  y: number,
  lane: number,
  snares: readonly Snare[],
): boolean {
  return snares.some(
    (s) =>
      Math.abs(s.p - p) <= SNARE_WINDOW &&
      Math.abs(lane - s.side * SNARE_LANE_SCALE) < SNARE_LANE_TOL &&
      y < SNARE_CLEAR_Y,
  );
}

export function needleCaught(playerP: number, needleP: number, songT: number): boolean {
  return playerP - needleP <= 0 && songT > NEEDLE_GRACE;
}

export function runWon(playerP: number, songT: number): boolean {
  return playerP >= WIN_PROGRESS || songT >= SONG_DURATION;
}

export function applyHit(lag: number): { lag: number; trip: number; invuln: number } {
  return { lag: lag + LAG_PER_HIT, trip: HIT_TRIP, invuln: HIT_INVULN };
}

export function recoverLag(lag: number, trip: number, dt: number): number {
  if (lag <= 0 || trip > 0) return Math.max(0, lag);
  return Math.max(0, lag - LAG_RECOVER * dt);
}

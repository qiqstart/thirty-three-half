import { SONG_DURATION } from "./config.ts";

export type Section = "intro" | "verse" | "groove" | "build" | "climax" | "runout";
export type CamMode = "orbit" | "overhead" | "profile" | "chase";
export type EventKind =
  | "kick"
  | "snare"
  | "hat"
  | "ride"
  | "bass"
  | "chord"
  | "horn"
  | "cam";

export type ChartEvent = {
  t: number;
  p: number;
  kind: EventKind;
  side?: number;
  midi?: number;
  chord?: number[];
  cam?: CamMode;
};

export type Chart = {
  events: ChartEvent[];
  kicks: number[];
  snares: { p: number; side: number }[];
  cams: { t: number; cam: CamMode }[];
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

const BPM_KEYS = [
  { t: 0, b: 76 },
  { t: 10, b: 82 },
  { t: 28, b: 92 },
  { t: 48, b: 102 },
  { t: 68, b: 118 },
  { t: 82, b: 126 },
  { t: 90, b: 88 },
];

export function bpmAt(t: number): number {
  const keys = BPM_KEYS;
  if (t <= keys[0]!.t) return keys[0]!.b;
  for (let i = 1; i < keys.length; i++) {
    const prev = keys[i - 1]!;
    const cur = keys[i]!;
    if (t <= cur.t) {
      const u = (t - prev.t) / (cur.t - prev.t);
      return lerp(prev.b, cur.b, u);
    }
  }
  return keys[keys.length - 1]!.b;
}

export function sectionAt(t: number): Section {
  if (t < 10) return "intro";
  if (t < 28) return "verse";
  if (t < 48) return "groove";
  if (t < 68) return "build";
  if (t < 82) return "climax";
  return "runout";
}

export function intensityAt(t: number): number {
  if (t < 10) return 0.06 * (t / 10);
  if (t < 28) return 0.06 + 0.2 * ((t - 10) / 18);
  if (t < 48) return 0.26 + 0.22 * ((t - 28) / 20);
  if (t < 68) return 0.48 + 0.26 * ((t - 48) / 20);
  if (t < 82) return 0.74 + 0.26 * ((t - 68) / 14);
  return Math.max(0.18, 1 - ((t - 82) / 8) * 0.75);
}

const F = 65; // F2 bass
const CHORDS: number[][] = [
  [65, 69, 72, 76], // F6
  [67, 70, 74, 77], // Gm7
  [60, 64, 67, 70], // C7
  [65, 69, 72, 76], // F6
  [62, 65, 69, 72], // Dm7
  [67, 71, 74, 77], // G7
  [60, 64, 67, 70], // C7
  [65, 69, 72, 77], // Fmaj9
];

const CAM_CUES: { t: number; cam: CamMode }[] = [
  { t: 0, cam: "overhead" },
  { t: 7.2, cam: "profile" },
  { t: 26.5, cam: "chase" },
  { t: 36, cam: "profile" },
  { t: 51.5, cam: "chase" },
  { t: 62.5, cam: "profile" },
  { t: 77.5, cam: "overhead" },
];

export function buildChart(side: "A" | "B"): Chart {
  const hard = side === "B";
  const events: ChartEvent[] = [];
  const kicks: number[] = [];
  const snares: { p: number; side: number }[] = [];

  for (const cue of CAM_CUES) {
    events.push({ t: cue.t, p: cue.t / SONG_DURATION, kind: "cam", cam: cue.cam });
  }

  let t = 0;
  let beat = 0;
  let snareFlip = 1;
  while (t < SONG_DURATION - 0.05) {
    const dt = 60 / bpmAt(t);
    const sec = sectionAt(t);
    const bar = beat % 4;
    const p = t / SONG_DURATION;

    const hatsOn =
      sec === "groove" || sec === "build" || sec === "climax" || (sec === "verse" && bar % 2 === 0);
    const eights = sec === "build" || sec === "climax";

    if (bar === 0) {
      const chord = CHORDS[Math.floor(beat / 4) % CHORDS.length]!;
      events.push({ t, p, kind: "chord", chord });
    }

    const bassWalk = CHORDS[Math.floor(beat / 4) % CHORDS.length]!;
    const bassNote = [bassWalk[0]!, bassWalk[2] ?? bassWalk[0]!, bassWalk[1]!, bassWalk[0]! - 1][bar]!;
    if (sec !== "intro" || bar === 0) {
      events.push({ t, p, kind: "bass", midi: bassNote - 12 });
    }

    const kickHere =
      sec === "intro" || sec === "runout"
        ? false
        : sec === "verse"
          ? bar === 0
          : bar === 0 || bar === 2 || (hard && bar === 1 && beat % 8 === 1);

    if (kickHere) {
      events.push({ t, p, kind: "kick" });
      kicks.push(p);
    } else if (sec === "runout" && bar === 0) {
      events.push({ t, p, kind: "kick" });
    }

    const snareOn =
      (sec === "groove" || sec === "build" || sec === "climax") && (bar === 1 || bar === 3);
    const snareEarly = hard && sec === "verse" && bar === 3;
    if (snareOn || snareEarly) {
      if (bar === 1) snareFlip *= -1;
      const sideLane = snareFlip;
      events.push({ t, p, kind: "snare", side: sideLane });
      snares.push({ p, side: sideLane });
    }

    if (hatsOn) {
      events.push({ t, p, kind: "hat" });
      if (eights) {
        events.push({ t: t + dt * 0.5, p: (t + dt * 0.5) / SONG_DURATION, kind: "hat" });
      }
    }
    if (sec === "climax" && (bar === 0 || bar === 2)) {
      events.push({ t, p, kind: "ride" });
    }
    if (sec === "climax" && bar === 0) {
      const horn = [77, 76, 74, 72][Math.floor(beat / 4) % 4]!;
      events.push({ t, p, kind: "horn", midi: horn });
    }
    if (sec === "build" && bar === 0 && beat % 8 === 0) {
      events.push({ t, p, kind: "horn", midi: 72 });
    }

    t += dt;
    beat += 1;
  }

  events.sort((a, b) => a.t - b.t);
  return { events, kicks, snares, cams: CAM_CUES };
}

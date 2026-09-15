import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SONG_DURATION } from "./config.ts";
import { bpmAt, buildChart, intensityAt, sectionAt, type Section } from "./chart.ts";

const SECTION_AT: [number, Section][] = [
  [0, "intro"],
  [9.99, "intro"],
  [10, "verse"],
  [27.9, "verse"],
  [28, "groove"],
  [47.9, "groove"],
  [48, "build"],
  [67.9, "build"],
  [68, "climax"],
  [81.9, "climax"],
  [82, "runout"],
  [90, "runout"],
];

describe("sectionAt", () => {
  for (const [t, name] of SECTION_AT) {
    it(`${t}s is ${name}`, () => {
      assert.equal(sectionAt(t), name);
    });
  }
});

describe("bpmAt", () => {
  it("starts lo-fi and climbs through the climax", () => {
    assert.equal(bpmAt(0), 76);
    assert.ok(bpmAt(10) > bpmAt(0));
    assert.ok(bpmAt(48) > bpmAt(28));
    assert.ok(bpmAt(82) > bpmAt(68));
    assert.equal(bpmAt(90), 88);
  });

  it("interpolates between keys", () => {
    const mid = bpmAt(5);
    assert.ok(mid > 76 && mid < 82);
  });
});

describe("intensityAt", () => {
  it("builds through climax then eases on the runout", () => {
    assert.ok(intensityAt(0) < 0.02);
    assert.ok(intensityAt(27) < intensityAt(47));
    assert.ok(intensityAt(47) < intensityAt(67));
    assert.ok(intensityAt(81.9) > 0.95);
    assert.ok(intensityAt(90) < intensityAt(82));
    assert.ok(intensityAt(90) >= 0.18);
  });
});

describe("buildChart", () => {
  const a = buildChart("A");
  const b = buildChart("B");

  it("covers the 90-second side and stays in progress 0–1", () => {
    assert.ok(a.events.length > 50);
    const last = a.events[a.events.length - 1]!;
    assert.ok(last.t < SONG_DURATION);
    assert.ok(a.events.every((e) => e.p >= 0 && e.p <= 1));
    assert.ok(a.events.every((e, i) => i === 0 || e.t >= a.events[i - 1]!.t));
  });

  it("keeps the intro clear of kick ridges and snare spikes", () => {
    assert.ok(a.kicks.every((p) => p >= 10 / SONG_DURATION));
    assert.ok(a.snares.every((s) => s.p >= 10 / SONG_DURATION));
  });

  it("does not place snares until the groove (Side A)", () => {
    assert.ok(a.snares.every((s) => s.p >= 28 / SONG_DURATION - 1e-6));
  });

  it("Side B is the harder cut — more kicks and earlier snares", () => {
    assert.ok(b.kicks.length > a.kicks.length);
    assert.ok(b.snares.length > a.snares.length);
    const earliestB = Math.min(...b.snares.map((s) => s.p));
    const earliestA = Math.min(...a.snares.map((s) => s.p));
    assert.ok(earliestB < earliestA);
  });

  it("snare sides are ±1 so the runner can swerve past them", () => {
    for (const s of [...a.snares, ...b.snares]) {
      assert.ok(s.side === 1 || s.side === -1);
    }
  });

  it("camera cues start overhead, visit profile and chase, and stay in time", () => {
    assert.equal(a.cams[0]?.cam, "overhead");
    assert.ok(a.cams.some((c) => c.cam === "profile"));
    assert.ok(a.cams.some((c) => c.cam === "chase"));
    assert.deepEqual(
      a.cams.map((c) => c.t),
      [...a.cams.map((c) => c.t)].sort((x, y) => x - y),
    );
    assert.ok(a.cams.every((c) => c.t >= 0 && c.t < SONG_DURATION));
  });

  it("every collision kick has a matching kick event", () => {
    const fromEvents = new Set(
      a.events.filter((e) => e.kind === "kick").map((e) => e.p),
    );
    assert.ok(a.kicks.length > 0);
    for (const p of a.kicks) assert.ok(fromEvents.has(p));
  });
});

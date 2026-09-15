import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LABEL_R, LANE_WIDTH, R_INNER, R_OUTER, TURNS } from "./config.ts";
import {
  clamp,
  distToLabel,
  expDamp,
  floorY,
  labelBlend,
  lerp,
  radiusAt,
  ridgeY,
  smoothstep,
  spiralAngle,
  spiralTangent,
  spiralXZ,
  waveY,
} from "./math.ts";

describe("clamp / lerp / smoothstep", () => {
  it("clamps to the closed interval", () => {
    assert.equal(clamp(0.5, 0, 1), 0.5);
    assert.equal(clamp(-2, 0, 1), 0);
    assert.equal(clamp(9, 0, 1), 1);
  });

  it("lerps and eases without overshoot", () => {
    assert.equal(lerp(10, 20, 0), 10);
    assert.equal(lerp(10, 20, 1), 20);
    assert.equal(lerp(10, 20, 0.5), 15);
    assert.equal(smoothstep(0), 0);
    assert.equal(smoothstep(1), 1);
    assert.ok(smoothstep(0.5) === 0.5);
    assert.ok(smoothstep(-1) === 0);
    assert.ok(smoothstep(2) === 1);
  });

  it("expDamp moves toward the target and settles", () => {
    let x = 0;
    for (let i = 0; i < 40; i++) x = expDamp(x, 1, 8, 1 / 60);
    assert.ok(x > 0.9 && x <= 1);
    assert.equal(expDamp(1, 1, 8, 1 / 60), 1);
  });
});

describe("spiral", () => {
  it("radius shrinks from outer groove to inner as progress goes 0 → 1", () => {
    assert.equal(radiusAt(0), R_OUTER);
    assert.equal(radiusAt(1), R_INNER);
    assert.ok(radiusAt(0.25) > radiusAt(0.75));
    assert.equal(radiusAt(-1), R_OUTER);
    assert.equal(radiusAt(2), R_INNER);
  });

  it("angle covers the configured number of turns", () => {
    assert.equal(spiralAngle(0), 0);
    assert.ok(Math.abs(spiralAngle(1) - TURNS * Math.PI * 2) < 1e-9);
    assert.ok(spiralAngle(0.4) < spiralAngle(0.6));
  });

  it("lane offset sits on the correct side of the groove", () => {
    const r0 = Math.hypot(...spiralXZ(0, 0));
    const rL = Math.hypot(...spiralXZ(0, -1));
    const rR = Math.hypot(...spiralXZ(0, 1));
    assert.ok(Math.abs(r0 - R_OUTER) < 1e-9);
    assert.ok(Math.abs(rR - r0 - LANE_WIDTH) < 1e-9);
    assert.ok(Math.abs(r0 - rL - LANE_WIDTH) < 1e-9);
  });

  it("tangent is unit length along the groove", () => {
    for (const p of [0, 0.2, 0.5, 0.9, 1]) {
      const [tx, tz] = spiralTangent(p);
      assert.ok(Math.abs(Math.hypot(tx, tz) - 1) < 1e-6);
    }
  });

  it("label blend only kicks in on the runout", () => {
    assert.equal(labelBlend(0), 0);
    assert.equal(labelBlend(0.91), 0);
    assert.ok(Math.abs(labelBlend(1) - 1) < 1e-12);
    assert.ok(distToLabel(0) > distToLabel(1));
    assert.ok(distToLabel(1) >= 0);
    assert.ok(radiusAt(1) - LABEL_R > 0);
  });
});

describe("groove height", () => {
  it("wave amplitude grows with intensity", () => {
    const calm = Math.abs(waveY(0.3, 4, 0.05));
    const wild = Math.abs(waveY(0.3, 4, 1));
    assert.ok(wild > calm);
  });

  it("ridge peaks at a kick and is near zero far from it", () => {
    const kicks = [0.4];
    assert.ok(ridgeY(0.4, kicks) > 0.1);
    assert.ok(ridgeY(0.4, kicks) > ridgeY(0.401, kicks));
    assert.equal(ridgeY(0.5, kicks), 0);
  });

  it("floor is wave plus scaled ridge", () => {
    const kicks = [0.22];
    const y = floorY(0.22, 12, 0.4, kicks);
    const expected = waveY(0.22, 12, 0.4) + ridgeY(0.22, kicks, 0.55 + 0.4 * 0.55);
    assert.ok(Math.abs(y - expected) < 1e-12);
  });
});

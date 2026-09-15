import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LAG_PER_HIT,
  LAG_RECOVER,
  NEEDLE_LEAD,
  SONG_DURATION,
} from "./config.ts";
import {
  KICK_CLEAR_Y,
  KICK_WINDOW,
  NEEDLE_GRACE,
  SNARE_CLEAR_Y,
  SNARE_WINDOW,
  START_INVULN,
  WIN_PROGRESS,
  applyHit,
  kickHits,
  needleCaught,
  needleGap,
  needleProgress,
  playerProgress,
  recoverLag,
  runWon,
  snareHits,
} from "./rules.ts";

describe("progress vs needle", () => {
  it("player sits NEEDLE_LEAD ahead of the stylus with no lag", () => {
    const t = 12;
    const p = playerProgress(t, 0);
    const n = needleProgress(t);
    assert.ok(Math.abs(p - n - NEEDLE_LEAD) < 1e-12);
    assert.ok(needleGap(p, n) >= 1);
  });

  it("lag closes the gap; enough lag lets the needle catch", () => {
    const t = 20;
    const lag = NEEDLE_LEAD + 0.01;
    const p = playerProgress(t, lag);
    const n = needleProgress(t);
    assert.ok(needleCaught(p, n, t));
  });

  it("grants a grace window so the drop-in cannot catch you", () => {
    const t = 0.4;
    const p = playerProgress(t, 1);
    const n = needleProgress(t);
    assert.equal(needleCaught(p, n, t), false);
    assert.ok(t < NEEDLE_GRACE);
  });

  it("clamps progress to the label", () => {
    assert.equal(playerProgress(0, 0), 0);
    assert.equal(playerProgress(SONG_DURATION, 0), 1);
    assert.equal(playerProgress(SONG_DURATION * 2, 0), 1);
  });
});

describe("kick ridges", () => {
  const kicks = [0.3];

  it("hits when grounded on the ridge", () => {
    assert.equal(kickHits(0.3, 0, 0, kicks), true);
  });

  it("clears when the jump is high enough", () => {
    assert.equal(kickHits(0.3, KICK_CLEAR_Y, 0, kicks), false);
    assert.equal(kickHits(0.3, KICK_CLEAR_Y + 0.01, 0, kicks), false);
  });

  it("ignores the runner outside the tight window", () => {
    assert.equal(kickHits(0.3 + KICK_WINDOW * 2, 0, 0, kicks), false);
    assert.equal(kickHits(0.3 - KICK_WINDOW * 0.5, 0, 0, kicks), true);
  });
});

describe("snare spikes", () => {
  const snares = [{ p: 0.5, side: 1 }];

  it("hits when the runner is in the spiked lane and low", () => {
    assert.equal(snareHits(0.5, 0, 0.85, snares), true);
  });

  it("misses when swerved to the other lane", () => {
    assert.equal(snareHits(0.5, 0, -1, snares), false);
  });

  it("misses when jumped over", () => {
    assert.equal(snareHits(0.5, SNARE_CLEAR_Y, 0.85, snares), false);
  });

  it("ignores the runner outside the snare window", () => {
    assert.equal(snareHits(0.5 + SNARE_WINDOW + 0.0001, 0, 0.85, snares), false);
  });
});

describe("run end", () => {
  it("wins at the label or when the side runs out", () => {
    assert.equal(runWon(WIN_PROGRESS, 80), true);
    assert.equal(runWon(0.5, SONG_DURATION), true);
    assert.equal(runWon(0.5, 80), false);
  });
});

describe("hits and recover", () => {
  it("a stumble adds a fixed lag cost and brief invuln", () => {
    const next = applyHit(0.01);
    assert.ok(Math.abs(next.lag - (0.01 + LAG_PER_HIT)) < 1e-12);
    assert.ok(next.invuln > START_INVULN);
    assert.ok(next.trip > 0);
  });

  it("lag only bleeds off after the trip ends", () => {
    assert.equal(recoverLag(0.02, 0.2, 1 / 60), 0.02);
    const bled = recoverLag(0.02, 0, 1);
    assert.ok(Math.abs(bled - Math.max(0, 0.02 - LAG_RECOVER)) < 1e-12);
  });
});

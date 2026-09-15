import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { loadSave, writeSave, type SaveData } from "./save.ts";

const mem = new Map<string, string>();

const storage: Storage = {
  get length() {
    return mem.size;
  },
  clear() {
    mem.clear();
  },
  getItem(key: string) {
    return mem.get(key) ?? null;
  },
  key(index: number) {
    return [...mem.keys()][index] ?? null;
  },
  removeItem(key: string) {
    mem.delete(key);
  },
  setItem(key: string, value: string) {
    mem.set(key, value);
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});

const sample: SaveData = {
  version: 1,
  hatId: "beret",
  muted: true,
  volume: 0.85,
  bestA: 0.42,
  bestB: 0.1,
  clearedA: true,
  clearedB: false,
};

describe("save", () => {
  beforeEach(() => mem.clear());

  it("returns defaults when empty", () => {
    const s = loadSave();
    assert.equal(s.hatId, "fedora");
    assert.equal(s.bestA, 0);
    assert.equal(s.clearedA, false);
    assert.equal(s.muted, false);
  });

  it("round-trips a full record", () => {
    writeSave(sample);
    assert.deepEqual(loadSave(), sample);
  });

  it("rejects an unknown hat instead of crashing", () => {
    mem.set("thirty-three-half-v1", JSON.stringify({ ...sample, hatId: "top-hat" }));
    assert.equal(loadSave().hatId, "fedora");
  });

  it("survives garbage in storage", () => {
    mem.set("thirty-three-half-v1", "{not json");
    const s = loadSave();
    assert.equal(s.hatId, "fedora");
    assert.equal(s.bestA, 0);
  });
});

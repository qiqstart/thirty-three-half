import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HATS, hatById, type HatId } from "./hats.ts";

describe("hats", () => {
  it("offers six named lids with unique ids and colors", () => {
    assert.equal(HATS.length, 6);
    const ids = HATS.map((h) => h.id);
    assert.equal(new Set(ids).size, 6);
    const colors = HATS.map((h) => h.color);
    assert.equal(new Set(colors).size, 6);
    for (const h of HATS) {
      assert.ok(h.name.length > 0);
      assert.ok(h.line.length > 0);
      assert.ok(h.color > 0);
    }
  });

  it("starts on the fedora and falls back there for unknown ids", () => {
    assert.equal(HATS[0]!.id, "fedora");
    assert.equal(hatById("fedora").name, "The Midnight");
    assert.equal(hatById("nope").id, "fedora");
    assert.equal(hatById(null).id, "fedora");
    assert.equal(hatById(undefined).id, "fedora");
  });

  it("resolves every catalog id", () => {
    for (const id of HATS.map((h) => h.id) as HatId[]) {
      assert.equal(hatById(id).id, id);
    }
  });
});

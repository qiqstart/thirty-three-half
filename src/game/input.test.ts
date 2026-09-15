import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GameInput } from "./input.ts";

describe("GameInput", () => {
  it("A steers left (+1) and D steers right (−1)", () => {
    const input = new GameInput();
    input.setKeys(["KeyA"]);
    assert.equal(input.steer(), 1);
    input.setKeys(["KeyD"]);
    assert.equal(input.steer(), -1);
    input.setKeys(["KeyA", "KeyD"]);
    assert.equal(input.steer(), 0);
    input.setKeys([]);
    assert.equal(input.steer(), 0);
  });

  it("arrow keys match A/D", () => {
    const input = new GameInput();
    input.setKeys(["ArrowLeft"]);
    assert.equal(input.steer(), 1);
    input.setKeys(["ArrowRight"]);
    assert.equal(input.steer(), -1);
  });

  it("buffers a jump on Space / W / Up and consumes it once", () => {
    const input = new GameInput();
    input.setKeys(["Space"]);
    assert.equal(input.consumeJump(), true);
    assert.equal(input.consumeJump(), false);
    input.setKeys(["KeyW"]);
    assert.equal(input.consumeJump(), true);
    input.setKeys(["ArrowUp"]);
    assert.equal(input.consumeJump(), true);
  });

  it("jump buffer expires after the tick window", () => {
    const input = new GameInput();
    input.setKeys(["Space"]);
    input.tick(0.2);
    assert.equal(input.consumeJump(), false);
  });

  it("steerOverride wins over keys (controls QA)", () => {
    const input = new GameInput();
    input.setKeys(["KeyA"]);
    input.steerOverride = -1;
    assert.equal(input.steer(), -1);
  });

  it("1 / 2 / 3 pick a camera and C cycles", () => {
    const input = new GameInput();
    input.setKeys(["Digit1"]);
    assert.equal(input.consumeCam("chase"), "profile");
    assert.equal(input.consumeCam("profile"), null);

    input.setKeys([]);
    input.consumeCam("profile");
    input.setKeys(["Digit2"]);
    assert.equal(input.consumeCam("profile"), "chase");

    input.setKeys([]);
    input.consumeCam("chase");
    input.setKeys(["Digit3"]);
    assert.equal(input.consumeCam("chase"), "overhead");

    input.setKeys([]);
    input.consumeCam("overhead");
    input.setKeys(["KeyC"]);
    assert.equal(input.consumeCam("profile"), "chase");
    input.setKeys([]);
    input.consumeCam("chase");
    input.setKeys(["KeyC"]);
    assert.equal(input.consumeCam("chase"), "overhead");
    input.setKeys([]);
    input.consumeCam("overhead");
    input.setKeys(["KeyC"]);
    assert.equal(input.consumeCam("overhead"), "profile");
  });
});

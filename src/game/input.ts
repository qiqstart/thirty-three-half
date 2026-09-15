const GAME_KEYS = new Set([
  "Space",
  "KeyW",
  "KeyA",
  "KeyD",
  "KeyS",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
]);

export class GameInput {
  keys = new Set<string>();
  injected = new Set<string>();
  steerOverride: number | null = null;
  jumpBuffer = 0;
  jumpHeld = false;
  leftHeld = false;
  rightHeld = false;
  touchSteer = 0;
  private swipeX0 = 0;
  private swipeY0 = 0;
  private swiping = false;
  private unbind: Array<() => void> = [];

  attach(canvas: HTMLCanvasElement) {
    const down = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        this.jumpBuffer = 0.13;
        this.jumpHeld = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") this.jumpHeld = false;
    };
    const blur = () => {
      this.keys.clear();
      this.jumpHeld = false;
      this.leftHeld = false;
      this.rightHeld = false;
      this.touchSteer = 0;
    };

    const ptrDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-ui]")) return;
      this.swiping = true;
      this.swipeX0 = e.clientX;
      this.swipeY0 = e.clientY;
      this.jumpBuffer = 0.13;
      this.jumpHeld = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const ptrMove = (e: PointerEvent) => {
      if (!this.swiping) return;
      const dx = e.clientX - this.swipeX0;
      const dy = e.clientY - this.swipeY0;
      if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 0.7) {
        this.touchSteer = Math.max(-1, Math.min(1, -Math.sign(dx)));
      }
    };
    const ptrUp = (e: PointerEvent) => {
      this.swiping = false;
      this.jumpHeld = false;
      this.touchSteer = 0;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    canvas.addEventListener("pointerdown", ptrDown);
    canvas.addEventListener("pointermove", ptrMove);
    canvas.addEventListener("pointerup", ptrUp);
    canvas.addEventListener("pointercancel", ptrUp);

    this.unbind = [
      () => window.removeEventListener("keydown", down),
      () => window.removeEventListener("keyup", up),
      () => window.removeEventListener("blur", blur),
      () => document.removeEventListener("visibilitychange", blur),
      () => canvas.removeEventListener("pointerdown", ptrDown),
      () => canvas.removeEventListener("pointermove", ptrMove),
      () => canvas.removeEventListener("pointerup", ptrUp),
      () => canvas.removeEventListener("pointercancel", ptrUp),
    ];
  }

  detach() {
    for (const fn of this.unbind) fn();
    this.unbind = [];
  }

  tick(dt: number) {
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
  }

  consumeJump(): boolean {
    if (this.jumpBuffer > 0) {
      this.jumpBuffer = 0;
      return true;
    }
    return false;
  }

  /** +1 left (A), −1 right (D) — player-visible, chase-cam convention. */
  steer(): number {
    if (this.steerOverride !== null) return this.steerOverride;
    let s = 0;
    const has = (c: string) => this.keys.has(c) || this.injected.has(c);
    if (has("KeyA") || has("ArrowLeft") || this.leftHeld) s += 1;
    if (has("KeyD") || has("ArrowRight") || this.rightHeld) s -= 1;
    s += this.touchSteer;
    return Math.max(-1, Math.min(1, s));
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
    const jumping = codes.some((c) => c === "Space" || c === "KeyW" || c === "ArrowUp");
    if (jumping) {
      this.jumpBuffer = 0.13;
      this.jumpHeld = true;
    } else {
      this.jumpHeld = false;
    }
  }
}

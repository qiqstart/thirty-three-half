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
  "Digit1",
  "Digit2",
  "Digit3",
  "KeyC",
]);

export type PlayCam = "profile" | "chase" | "overhead";

const CAM_ORDER: PlayCam[] = ["profile", "chase", "overhead"];

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
  private camLatch = new Set<string>();
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
      this.camLatch.clear();
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
    const ptrUp = () => {
      this.swiping = false;
      this.jumpHeld = false;
      this.touchSteer = 0;
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

  consumeCam(current: PlayCam): PlayCam | null {
    const pick = (code: string, mode: PlayCam | "cycle"): PlayCam | null => {
      const down = this.keys.has(code) || this.injected.has(code);
      if (down && !this.camLatch.has(code)) {
        this.camLatch.add(code);
        if (mode === "cycle") {
          const i = CAM_ORDER.indexOf(current);
          return CAM_ORDER[(i + 1) % CAM_ORDER.length]!;
        }
        return mode;
      }
      if (!down) this.camLatch.delete(code);
      return null;
    };
    return (
      pick("Digit1", "profile") ??
      pick("Digit2", "chase") ??
      pick("Digit3", "overhead") ??
      pick("KeyC", "cycle")
    );
  }
}

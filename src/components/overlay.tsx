import { Volume2, VolumeX } from "lucide-react";
import { getGame } from "@/game/api";
import { HATS, type HatId } from "@/game/hats";
import { useGameUI } from "@/game/store";

export function Overlay() {
  const ui = useGameUI();
  const coarse =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  return (
    <div className="overlay">
      <header className="top-bar">
        <p className="mark">
          Killer Record
          <span>Record Killer · 33½ RPM</span>
        </p>
        <button
          type="button"
          data-ui
          className="icon-btn"
          aria-label={ui.muted ? "Unmute" : "Mute"}
          onClick={() => getGame()?.setMuted(!ui.muted)}
        >
          {ui.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </header>

      {ui.screen === "title" && <Title ui={ui} />}
      {ui.screen === "play" && <Hud ui={ui} coarse={coarse} />}
      {ui.screen === "dead" && <End dead ui={ui} />}
      {ui.screen === "won" && <End dead={false} ui={ui} />}
    </div>
  );
}

function Title({ ui }: { ui: ReturnType<typeof useGameUI.getState> }) {
  return (
    <div className="panel-wrap">
      <section className="jacket" data-ui>
        <p className="kicker">Record Killer · 33½ RPM · Side {ui.side}</p>
        <h1>Killer Record</h1>
        <p className="deck">
          A tiny runner on a spinning side. Stay ahead of the needle. Jump the kick.
          Swerve the snare. The groove gets wilder as the band does.
        </p>

        <p className="choose">Choose a hat</p>
        <div className="hats">
          {HATS.map((h) => (
            <button
              key={h.id}
              type="button"
              data-ui
              className={h.id === ui.hatId ? "hat on" : "hat"}
              onClick={() => {
                getGame()?.unlockAudio();
                getGame()?.setHat(h.id as HatId);
              }}
            >
              <span
                className="swatch"
                style={{ background: `#${h.color.toString(16).padStart(6, "0")}` }}
              />
              <span className="hat-name">{h.name}</span>
              <span className="hat-line">{h.line}</span>
            </button>
          ))}
        </div>

        <button type="button" data-ui className="cta" onClick={() => getGame()?.start("A")}>
          Drop the needle
        </button>
        {ui.clearedA && (
          <button type="button" data-ui className="cta ghost" onClick={() => getGame()?.start("B")}>
            Flip to Side B
          </button>
        )}
        <p className="hint-keys">
          {ui.bestA > 0 ? `Best Side A · ${Math.round(ui.bestA * 90)}s` : "A / D swerve · Space jump"}
        </p>
      </section>
    </div>
  );
}

function Hud({
  ui,
  coarse,
}: {
  ui: ReturnType<typeof useGameUI.getState>;
  coarse: boolean;
}) {
  return (
    <>
      <div className="hud-center">
        <div className="meter" aria-hidden>
          <span className="meter-fill" style={{ width: `${ui.progress * 100}%` }} />
          <span
            className="needle-pip"
            style={{ left: `${Math.max(0, ui.progress - ui.needleGap * 0.048) * 100}%` }}
          />
        </div>
        <p className="cam-tag">{camLabel(ui.cam)}</p>
        {ui.hint && (
          <p className="live-hint">
            {coarse ? "Tap to jump · Swipe to swerve" : "Space jump · A / D swerve"}
          </p>
        )}
      </div>
      {coarse && (
        <div className="touch" data-ui>
          <HoldButton
            label="Left"
            onHold={(down) => {
              const g = getGame();
              if (g) g.input.leftHeld = down;
            }}
          />
          <HoldButton
            label="Jump"
            jump
            onHold={(down) => {
              const g = getGame();
              if (!g) return;
              if (down) {
                g.input.jumpBuffer = 0.13;
                g.input.jumpHeld = true;
              } else {
                g.input.jumpHeld = false;
              }
            }}
          />
          <HoldButton
            label="Right"
            onHold={(down) => {
              const g = getGame();
              if (g) g.input.rightHeld = down;
            }}
          />
        </div>
      )}
    </>
  );
}

function HoldButton({
  label,
  jump,
  onHold,
}: {
  label: string;
  jump?: boolean;
  onHold: (down: boolean) => void;
}) {
  return (
    <button
      type="button"
      data-ui
      className={jump ? "touch-btn jump" : "touch-btn"}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </button>
  );
}

function End({
  dead,
  ui,
}: {
  dead: boolean;
  ui: ReturnType<typeof useGameUI.getState>;
}) {
  return (
    <div className="panel-wrap">
      <section className="jacket slim" data-ui>
        <p className="kicker">{dead ? "Runout" : "Label"}</p>
        <h2>{dead ? "The needle caught you." : "Side complete."}</h2>
        <p className="deck">
          {dead
            ? `You held the groove for ${Math.round(ui.progress * 90)} seconds. Drop it again.`
            : ui.side === "A"
              ? "The label takes you. Flip the record when you are ready."
              : "Both sides. The platter keeps turning."}
        </p>
        <button type="button" data-ui className="cta" onClick={() => getGame()?.retry()}>
          {dead ? "Drop it again" : "Once more"}
        </button>
        {!dead && ui.side === "A" && (
          <button type="button" data-ui className="cta ghost" onClick={() => getGame()?.start("B")}>
            Flip to Side B
          </button>
        )}
        <button type="button" data-ui className="text-btn" onClick={() => getGame()?.toTitle()}>
          Choose a hat
        </button>
      </section>
    </div>
  );
}

function camLabel(cam: string) {
  if (cam === "overhead") return "Above the platter";
  if (cam === "chase") return "Down the groove";
  if (cam === "profile") return "At his side";
  return "";
}

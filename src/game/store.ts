import { create } from "zustand";
import type { CamMode, Section } from "./chart";
import type { HatId } from "./hats";
import { loadSave, writeSave, type SaveData } from "./save";

export type Screen = "title" | "play" | "dead" | "won";

export type GameUI = {
  screen: Screen;
  hatId: HatId;
  side: "A" | "B";
  progress: number;
  needleGap: number;
  intensity: number;
  section: Section;
  cam: CamMode;
  muted: boolean;
  bestA: number;
  bestB: number;
  clearedA: boolean;
  clearedB: boolean;
  hint: boolean;
  ready: boolean;
};

const save: SaveData = loadSave();

export const useGameUI = create<GameUI>(() => ({
  screen: "title",
  hatId: save.hatId,
  side: "A",
  progress: 0,
  needleGap: 1,
  intensity: 0,
  section: "intro",
  cam: "orbit",
  muted: save.muted,
  bestA: save.bestA,
  bestB: save.bestB,
  clearedA: save.clearedA,
  clearedB: save.clearedB,
  hint: false,
  ready: false,
}));

export function persistFromUI() {
  const s = useGameUI.getState();
  writeSave({
    version: 1,
    hatId: s.hatId,
    muted: s.muted,
    volume: 0.85,
    bestA: s.bestA,
    bestB: s.bestB,
    clearedA: s.clearedA,
    clearedB: s.clearedB,
  });
}

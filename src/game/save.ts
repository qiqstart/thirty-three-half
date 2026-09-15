import type { HatId } from "./hats";
import { HATS } from "./hats";

const KEY = "thirty-three-half-v1";
const VERSION = 1;

export type SaveData = {
  version: number;
  hatId: HatId;
  muted: boolean;
  volume: number;
  bestA: number;
  bestB: number;
  clearedA: boolean;
  clearedB: boolean;
};

const defaults: SaveData = {
  version: VERSION,
  hatId: "fedora",
  muted: false,
  volume: 0.85,
  bestA: 0,
  bestB: 0,
  clearedA: false,
  clearedB: false,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const hatId = HATS.some((h) => h.id === parsed.hatId)
      ? (parsed.hatId as HatId)
      : defaults.hatId;
    return {
      ...defaults,
      ...parsed,
      hatId,
      version: VERSION,
    };
  } catch {
    return { ...defaults };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: VERSION }));
  } catch {
    /* private mode / quota */
  }
}

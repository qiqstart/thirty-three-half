import type { Game } from "./engine";

let instance: Game | null = null;

export function setGame(g: Game | null) {
  instance = g;
}

export function getGame() {
  return instance;
}

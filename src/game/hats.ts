export type HatId =
  | "fedora"
  | "porkpie"
  | "beret"
  | "boater"
  | "bowler"
  | "newsboy";

export type HatDef = {
  id: HatId;
  name: string;
  line: string;
  color: number;
};

export const HATS: HatDef[] = [
  { id: "fedora", name: "The Midnight", line: "Brim low, pulse high", color: 0xc41e3a },
  { id: "porkpie", name: "The Cool", line: "Short crown, long game", color: 0xc4a35a },
  { id: "beret", name: "Left Bank", line: "Soft tilt, hard timing", color: 0x2a6b66 },
  { id: "boater", name: "Boardwalk", line: "Straw light, groove heavy", color: 0xf4e6c3 },
  { id: "bowler", name: "The Derby", line: "Round lid, sharp waves", color: 0xe07a5f },
  { id: "newsboy", name: "The Corner", line: "Cap on, needle off", color: 0xc4a574 },
];

export function hatById(id: string | null | undefined): HatDef {
  return HATS.find((h) => h.id === id) ?? HATS[0]!;
}

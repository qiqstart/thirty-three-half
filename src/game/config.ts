export const SONG_DURATION = 90;

export const TURNS = 7.4;
export const R_OUTER = 4.92;
export const R_INNER = 1.5;
export const LABEL_R = 1.32;
export const LANE_WIDTH = 0.17;
export const GROOVE_HALF = 0.22;
export const WALL_H = 0.2;

export const NEEDLE_LEAD = 0.075;
export const LAG_PER_HIT = 0.014;
export const LAG_RECOVER = 0.012;
export const SYNC_BOOST = 0.006;

export const COYOTE = 0.1;
export const JUMP_BUFFER = 0.13;
export const JUMP_V = 1.15;
export const GRAVITY_UP = 2.35;
export const GRAVITY_DOWN = 4.1;
export const FALL_MAX = 2.8;
export const LANE_SPEED = 3.4;

export const CAM_BLEND = 0.95;

export const COLORS = {
  cream: 0xf4e6c3,
  paper: 0xefe0c4,
  ink: 0x16120e,
  cherry: 0xc41e3a,
  walnut: 0x3d2a1c,
  brass: 0xc4a574,
  teal: 0x2a6b66,
  mint: 0x7ba69a,
  mustard: 0xc4a35a,
  coral: 0xe07a5f,
  sand: 0xd9b78a,
  ruby: 0x9b1b2e,
} as const;

export const ROOM: Record<string, number> = {
  intro: COLORS.mint,
  verse: COLORS.sand,
  groove: COLORS.mustard,
  build: COLORS.coral,
  climax: COLORS.cherry,
  runout: COLORS.teal,
};

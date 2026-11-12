import type { Rarity } from '../types/card';

export const RARITIES: readonly Rarity[] = [
  'White',
  'Green',
  'Blue',
  'Purple',
  'Gold',
];

// Relative weights: these total 100, so each value is also its percentage.
export const RARITY_WEIGHTS = {
  White: 65,
  Green: 15,
  Blue: 10,
  Purple: 8,
  Gold: 2,
} as const satisfies Record<Rarity, number>;

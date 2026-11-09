import type { Rarity } from '../types/card'

// Relative weights: these total 100, so each value is also its percentage.
export const RARITY_WEIGHTS = {
  White: 50,
  Green: 25,
  Blue: 15,
  Purple: 8,
  Gold: 2,
} as const satisfies Record<Rarity, number>

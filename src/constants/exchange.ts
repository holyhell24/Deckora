import type { Rarity } from '../types/card'

export const EXCHANGE_CARD_COUNT = 5
export const NEXT_RARITY: Record<Rarity, Rarity | null> = {
  White: 'Green',
  Green: 'Blue',
  Blue: 'Purple',
  Purple: 'Gold',
  Gold: null,
}

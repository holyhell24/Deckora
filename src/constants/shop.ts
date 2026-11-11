import type { UpgradeId } from '../types/upgrade'
import type { Rarity } from '../types/card'
import { SHOP_COST_MULTIPLIER } from './cost-multiplier'

const UPGRADE_CARD_TIERS: readonly Rarity[] = [
  'White',
  'Green',
  'Blue',
  'Purple',
  'Gold',
]

// `level` is the currently owned level: the first card payment is level 10 -> 11.
export function getUpgradeCardRarity(level: number): Rarity | null {
  if (level < 5) return null
  return UPGRADE_CARD_TIERS[Math.min(Math.floor(level / 5) - 1, 4)]
}

export const UPGRADES = [
  {
    id: 'auto',
    name: 'Arcane Familiar',
    description:
      'Automatically adds +1 progress and +1 currency per second per level. Pauses when the card is revealed.',
    baseCost: 50,
  },
  {
    id: 'power',
    name: 'Click Power',
    description: '+1 progress and +1 currency per click.',
    baseCost: 10,
  },
  {
    id: 'fortune',
    name: 'Spark Collector',
    description: '+2 currency per click per level, without changing progress.',
    baseCost: 20,
  },
  {
    id: 'critical',
    name: 'Resonant Touch',
    description:
      '+5% chance per level for double progress and currency on a click. Maximum 50%.',
    baseCost: 40,
  },
  {
    id: 'mastery',
    name: 'Discovery Mastery',
    description:
      'Reduce future unlock targets by 10% per level. Applies to the next card.',
    baseCost: 25,
  },
] as const satisfies readonly {
  id: UpgradeId
  name: string
  description: string
  baseCost: number
}[]

export const getUpgradeCost = (baseCost: number, level: number) =>
  Math.ceil(baseCost * SHOP_COST_MULTIPLIER ** level)

export const getCriticalChance = (level: number) => Math.min(level * 0.05, 0.5)

export function getUpgradeEffect(id: UpgradeId, level: number): string {
  switch (id) {
    case 'auto':
      return level === 0
        ? 'Disabled'
        : `+${level} progress and +${level} currency per second`
    case 'power':
      return `${level + 1} progress and base currency per click`
    case 'mastery':
      return `${Math.round((1 - 0.9 ** level) * 100)}% target reduction`
    case 'fortune':
      return `+${level * 2} bonus currency per click`
    case 'critical':
      return `${Math.round(getCriticalChance(level) * 100)}% double-click reward chance`
  }
}

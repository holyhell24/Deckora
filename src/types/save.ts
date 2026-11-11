import type { CollectionCounts } from './collection'
import type { UpgradeLevels } from './upgrade'
import type { ActiveBoosts, ConsumablePurchases } from './consumable'
import type { Rarity } from './card'

export type SavedGame = {
  version: 1
  cardId: string
  currentCount: number
  sparks: number
  completedRounds: number
  requiredClicks: number
  levels: UpgradeLevels
  cardRequirements: Record<keyof UpgradeLevels, Rarity | null>
  collection: CollectionCounts
  boosts: ActiveBoosts
  consumablePurchases: ConsumablePurchases
}

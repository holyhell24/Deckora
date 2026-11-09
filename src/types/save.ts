import type { CollectionCounts } from './collection'
import type { UpgradeLevels } from './upgrade'

export type SavedGame = {
  version: 1
  cardId: string
  currentCount: number
  sparks: number
  completedRounds: number
  requiredClicks: number
  levels: UpgradeLevels
  collection: CollectionCounts
}

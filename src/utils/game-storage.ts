import type { SavedGame } from '../types/save'

export const SAVE_KEY = 'deckora.save.v1'

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

export function parseSavedGame(
  raw: string,
  validCardIds: readonly string[],
): SavedGame | null {
  try {
    const save = JSON.parse(raw)
    if (!save || save.version !== 1 || !validCardIds.includes(save.cardId))
      return null
    if (
      !['currentCount', 'sparks', 'completedRounds', 'requiredClicks'].every(
        (key) => isCount(save[key]),
      )
    )
      return null
    if (save.requiredClicks < 1 || save.currentCount > save.requiredClicks)
      return null
    if (
      !save.levels ||
      !['power', 'mastery', 'fortune', 'critical', 'auto'].every((key) =>
        isCount(save.levels[key]),
      )
    )
      return null
    if (save.levels.critical > 10) return null
    if (
      !save.collection ||
      typeof save.collection !== 'object' ||
      Array.isArray(save.collection)
    )
      return null
    if (
      !Object.entries(save.collection).every(
        ([id, count]) => validCardIds.includes(id) && isCount(count),
      )
    )
      return null
    return {
      version: 1,
      cardId: save.cardId,
      currentCount: save.currentCount,
      sparks: save.sparks,
      completedRounds: save.completedRounds,
      requiredClicks: save.requiredClicks,
      levels: {
        power: save.levels.power,
        mastery: save.levels.mastery,
        fortune: save.levels.fortune,
        critical: save.levels.critical,
        auto: save.levels.auto,
      },
      collection: { ...save.collection },
    }
  } catch {
    return null
  }
}

export function loadGame(validCardIds: readonly string[]): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? parseSavedGame(raw, validCardIds) : null
  } catch {
    return null
  }
}

export function saveGame(save: SavedGame): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    return true
  } catch {
    return false
  }
}

import type { SavedGame } from '../types/save';
import {
  getUpgradeCardRequirements,
  UPGRADES,
  UPGRADE_IDS,
} from '../constants/shop';
import { RARITIES } from '../constants/rarities';

const LEGACY_SAVE_KEY = 'deckora.save.v1';
const CLICK_PROGRESS_KEY = 'deckora.click-progress.v1';

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function loadLegacyGame(
  validCardIds: readonly string[],
): SavedGame | null {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    return raw ? parseSavedGame(raw, validCardIds) : null;
  } catch {
    return null;
  }
}

export function removeLegacyGame(): boolean {
  try {
    localStorage.removeItem(LEGACY_SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function saveClickProgress(
  progress: Pick<SavedGame, 'currentCount' | 'requiredClicks'>,
): boolean {
  try {
    localStorage.setItem(CLICK_PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function resetLocalGameData(): boolean {
  try {
    localStorage.removeItem(LEGACY_SAVE_KEY);
    localStorage.removeItem(CLICK_PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
}

export function parseSavedGame(
  raw: string,
  validCardIds: readonly string[],
): SavedGame | null {
  try {
    const save = JSON.parse(raw);
    if (!save || save.version !== 1 || !validCardIds.includes(save.cardId)) {
      return null;
    }

    if (
      !['currentCount', 'sparks', 'completedRounds', 'requiredClicks'].every(
        (key) => isCount(save[key]),
      )
    ) {
      return null;
    }

    if (save.requiredClicks < 1 || save.currentCount > save.requiredClicks) {
      return null;
    }

    if (
      !save.levels ||
      !['power', 'mastery', 'fortune', 'critical', 'auto'].every((key) =>
        isCount(save.levels[key]),
      )
    ) {
      return null;
    }

    if (save.levels.progress !== undefined && !isCount(save.levels.progress)) {
      return null;
    }

    for (const upgrade of UPGRADES) {
      if (
        upgrade.maxLevel !== undefined &&
        save.levels[upgrade.id] > upgrade.maxLevel
      ) {
        return null;
      }
    }

    if (
      save.cardRequirements !== undefined &&
      (!save.cardRequirements ||
        typeof save.cardRequirements !== 'object' ||
        Array.isArray(save.cardRequirements) ||
        !UPGRADE_IDS.every(
          (id) =>
            save.cardRequirements[id] === null ||
            RARITIES.includes(save.cardRequirements[id]),
        ))
    ) {
      return null;
    }

    if (
      save.consumablePurchases !== undefined &&
      (!save.consumablePurchases ||
        !['spark-tonic', 'focus-tonic', 'reveal-dust'].every((id) =>
          isCount(save.consumablePurchases[id]),
        ))
    ) {
      return null;
    }

    if (
      save.boosts !== undefined &&
      (!save.boosts ||
        !isCount(save.boosts.sparkClicks) ||
        !isCount(save.boosts.focusClicks))
    ) {
      return null;
    }

    if (
      !save.collection ||
      typeof save.collection !== 'object' ||
      Array.isArray(save.collection)
    ) {
      return null;
    }

    if (
      !Object.entries(save.collection).every(
        ([id, count]) => validCardIds.includes(id) && isCount(count),
      )
    ) {
      return null;
    }

    return {
      version: 1,
      cardId: save.cardId,
      currentCount: save.currentCount,
      sparks: save.sparks,
      completedRounds: save.completedRounds,
      requiredClicks: save.requiredClicks,
      levels: {
        power: save.levels.power,
        progress: save.levels.progress ?? 0,
        mastery: save.levels.mastery,
        fortune: save.levels.fortune,
        critical: save.levels.critical,
        auto: save.levels.auto,
      },
      cardRequirements:
        save.cardRequirements ??
        getUpgradeCardRequirements({
          power: save.levels.power,
          progress: save.levels.progress ?? 0,
          mastery: save.levels.mastery,
          fortune: save.levels.fortune,
          critical: save.levels.critical,
          auto: save.levels.auto,
        }),
      collection: { ...save.collection },
      consumablePurchases: {
        'spark-tonic': save.consumablePurchases?.['spark-tonic'] ?? 0,
        'focus-tonic': save.consumablePurchases?.['focus-tonic'] ?? 0,
        'reveal-dust': save.consumablePurchases?.['reveal-dust'] ?? 0,
      },
      boosts: {
        sparkClicks: save.boosts?.sparkClicks ?? 0,
        focusClicks: save.boosts?.focusClicks ?? 0,
      },
    };
  } catch {
    return null;
  }
}

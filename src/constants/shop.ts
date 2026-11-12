import type { UpgradeId, UpgradeLevels } from '../types/upgrade';
import type { Rarity } from '../types/card';
import { RARITIES } from './rarities';

const UPGRADE_CARD_START_LEVEL = 10;
const UPGRADE_CARD_CHANCE = 0.5;
const UPGRADE_LEVELS_PER_CARD_TIER = 10;
const FORTUNE_CURRENCY_PER_LEVEL = 2;
const CRITICAL_CHANCE_PER_LEVEL = 0.05;
const MAX_CRITICAL_CHANCE = 0.5;
const MASTERY_TARGET_MULTIPLIER = 0.9;

export const AUTO_REWARD_PER_LEVEL = 5;
export const PROGRESS_REWARD_PER_LEVEL = 2;
export const SHOP_COST_MULTIPLIER = 1.2;

// `level` is the currently owned level; card requirements begin at level 10.
export function getUpgradeCardRarity(level: number): Rarity | null {
  if (level < UPGRADE_CARD_START_LEVEL) {
    return null;
  }

  if (Math.random() >= UPGRADE_CARD_CHANCE) {
    return null;
  }

  const tierIndex = Math.floor(level / UPGRADE_LEVELS_PER_CARD_TIER) - 1;
  return RARITIES[Math.min(tierIndex, RARITIES.length - 1)];
}

type UpgradeDefinition = {
  id: UpgradeId;
  name: string;
  description: string;
  baseCost: number;
  maxLevel?: number;
};

export const UPGRADES: readonly UpgradeDefinition[] = [
  {
    id: 'auto',
    name: 'Arcane Familiar',
    description:
      'Automatically adds +5 progress and +5 currency per second per level. Pauses when the card is revealed.',
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
    description: `+${FORTUNE_CURRENCY_PER_LEVEL} currency per click per level, without changing progress.`,
    baseCost: 20,
  },
  {
    id: 'progress',
    name: 'Sacred Power',
    description: '+2 progress per click per level, without changing currency.',
    baseCost: 20,
  },
  {
    id: 'critical',
    name: 'Resonant Touch',
    description: `+${CRITICAL_CHANCE_PER_LEVEL * 100}% chance per level for double progress and currency on a click. Maximum ${MAX_CRITICAL_CHANCE * 100}%.`,
    baseCost: 1000,
    maxLevel: 10,
  },
  {
    id: 'mastery',
    name: 'Discovery Mastery',
    description:
      'Reduce future unlock targets by 10% per level. Applies to the next card.',
    baseCost: 1000,
    maxLevel: 10,
  },
];

export const UPGRADE_IDS: readonly UpgradeId[] = UPGRADES.map(
  (upgrade) => upgrade.id,
);

export function getUpgradeCardRequirements(
  levels: UpgradeLevels,
): Record<UpgradeId, Rarity | null> {
  return Object.fromEntries(
    UPGRADES.map((upgrade) => [
      upgrade.id,
      getUpgradeCardRarity(levels[upgrade.id]),
    ]),
  ) as Record<UpgradeId, Rarity | null>;
}

export const getUpgradeCost = (baseCost: number, level: number) =>
  Math.ceil(baseCost * SHOP_COST_MULTIPLIER ** level);

export const getCriticalChance = (level: number) =>
  Math.min(level * CRITICAL_CHANCE_PER_LEVEL, MAX_CRITICAL_CHANCE);

export function getUpgradeEffect(id: UpgradeId, level: number): string {
  switch (id) {
    case 'auto':
      return level === 0
        ? 'Disabled'
        : `+${level * AUTO_REWARD_PER_LEVEL} progress and +${level * AUTO_REWARD_PER_LEVEL} currency per second`;
    case 'power':
      return `${level + 1} progress and base currency per click`;
    case 'mastery':
      return `${Math.round((1 - MASTERY_TARGET_MULTIPLIER ** level) * 100)}% target reduction`;
    case 'fortune':
      return `+${level * FORTUNE_CURRENCY_PER_LEVEL} bonus currency per click`;
    case 'progress':
      return `+${level * PROGRESS_REWARD_PER_LEVEL} bonus progress per click`;
    case 'critical':
      return `${Math.round(getCriticalChance(level) * 100)}% double-click reward chance`;
  }
}

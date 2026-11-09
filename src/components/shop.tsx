import { CURRENCY_NAME } from '../constants/clicker'
import {
  getUpgradeCardRarity,
  getUpgradeCost,
  getUpgradeEffect,
  UPGRADES,
} from '../constants/shop'
import { useState } from 'react'
import { CARDS } from '../constants/cards'
import type { CollectionCounts } from '../types/collection'
import type { UpgradeId, UpgradeLevels } from '../types/upgrade'
import { Button } from './ui/button'

type ShopProps = {
  balance: number
  levels: UpgradeLevels
  onBuy: (id: UpgradeId, cardId?: string) => void
  collection: CollectionCounts
  message: string
}

export function Shop({
  balance,
  levels,
  onBuy,
  message,
  collection,
}: ShopProps) {
  const [selectedCards, setSelectedCards] = useState<
    Partial<Record<UpgradeId, string>>
  >({})
  return (
    <aside
      aria-labelledby="shop-heading"
      className="w-full bg-surface px-6 pb-8 pt-16"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/60">
        Invest in discovery
      </p>
      <h2 id="shop-heading" className="mt-2 font-serif text-3xl">
        The Workshop
      </h2>
      <p className="mt-2 text-sm text-stone-400">
        Trade {CURRENCY_NAME} for lasting upgrades.
      </p>
      <div className="mt-6 space-y-4">
        {UPGRADES.map((upgrade) => {
          const level = levels[upgrade.id]
          const cost = getUpgradeCost(upgrade.baseCost, level)
          const affordable = balance >= cost
          const maxed = upgrade.id === 'critical' && level >= 10
          const rarity = getUpgradeCardRarity(level)
          const availableCards = CARDS.filter(
            (card) => card.rarity === rarity && collection[card.id] > 0,
          ).sort((a, b) => collection[b.id] - collection[a.id])
          const selectedCard =
            availableCards.find(
              (card) => card.id === selectedCards[upgrade.id],
            ) ?? availableCards[0]
          const hasCard = rarity === null || selectedCard !== undefined
          return (
            <div
              key={upgrade.id}
              className="rounded-xl border border-white/10 bg-white/3 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">{upgrade.name}</h3>
                <span className="text-xs text-stone-400">Level {level}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-400">
                {upgrade.description.replace('currency', CURRENCY_NAME)}
              </p>
              <p className="mt-3 text-xs text-amber-200/80">
                {getUpgradeEffect(upgrade.id, level).replace(
                  'currency',
                  CURRENCY_NAME,
                )}
                {!maxed && (
                  <span className="mt-1 block text-stone-400">
                    Next:{' '}
                    {getUpgradeEffect(upgrade.id, level + 1).replace(
                      'currency',
                      CURRENCY_NAME,
                    )}
                  </span>
                )}
              </p>
              {rarity && !maxed && (
                <div className="mt-4 text-xs">
                  <label
                    htmlFor={`payment-${upgrade.id}`}
                    className="block text-stone-300"
                  >
                    Card payment: 1 {rarity} card
                  </label>
                  <select
                    id={`payment-${upgrade.id}`}
                    value={selectedCard?.id ?? ''}
                    disabled={!hasCard}
                    onChange={(event) =>
                      setSelectedCards((previous) => ({
                        ...previous,
                        [upgrade.id]: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-white/15 bg-surface p-2 text-stone-100"
                  >
                    {availableCards.length === 0 && (
                      <option value="">No {rarity} cards available</option>
                    )}
                    {availableCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} ({collection[card.id]})
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-stone-400">
                    One copy of the selected card will be consumed.
                  </p>
                </div>
              )}
              <Button
                disabled={!affordable || !hasCard || maxed}
                onClick={() => onBuy(upgrade.id, selectedCard?.id)}
                className="mt-4 w-full cursor-pointer border border-amber-200/20 bg-amber-200/10 text-amber-100 hover:bg-amber-200/20"
              >
                {maxed
                  ? 'Maximum level'
                  : `Upgrade · ${cost.toLocaleString()} ${CURRENCY_NAME}`}
              </Button>
              {!hasCard && !maxed && (
                <p className="mt-2 text-center text-xs text-stone-500">
                  Discover a {rarity} card to upgrade.
                </p>
              )}
              {!affordable && !maxed && (
                <p className="mt-2 text-center text-xs text-stone-500">
                  Need {(cost - balance).toLocaleString()} more {CURRENCY_NAME}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <p role="status" className="mt-4 min-h-8 text-xs text-amber-200/80">
        {message}
      </p>
    </aside>
  )
}

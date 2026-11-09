import { CURRENCY_NAME } from '../constants/clicker'
import { getUpgradeCost, getUpgradeEffect, UPGRADES } from '../constants/shop'
import type { UpgradeId, UpgradeLevels } from '../types/upgrade'
import { Button } from './ui/button'

type ShopProps = {
  balance: number
  levels: UpgradeLevels
  onBuy: (id: UpgradeId) => void
  message: string
}

export function Shop({ balance, levels, onBuy, message }: ShopProps) {
  return (
    <aside
      aria-labelledby="shop-heading"
      className="w-full bg-[#141c24] px-6 pb-8 pt-16"
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
              <Button
                disabled={!affordable || maxed}
                onClick={() => onBuy(upgrade.id)}
                className="mt-4 w-full cursor-pointer border border-amber-200/20 bg-amber-200/10 text-amber-100 hover:bg-amber-200/20"
              >
                {maxed
                  ? 'Maximum level'
                  : `Upgrade · ${cost.toLocaleString()} ${CURRENCY_NAME}`}
              </Button>
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

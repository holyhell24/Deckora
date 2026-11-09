import { CONSUMABLES, getConsumableCost } from '../constants/consumables'
import { CURRENCY_NAME } from '../constants/clicker'
import type {
  ActiveBoosts,
  ConsumableId,
  ConsumablePurchases,
} from '../types/consumable'
import { Button } from './ui/button'

type Props = {
  balance: number
  boosts: ActiveBoosts
  purchases: ConsumablePurchases
  revealed: boolean
  onBuy: (id: ConsumableId) => void
}
export function Consumables({
  balance,
  boosts,
  purchases,
  revealed,
  onBuy,
}: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-stone-400">
        Activates immediately. Tonics stack duration, carry across cards, and
        pause while a card is revealed. Arcane Familiar does not use or benefit
        from tonics.
      </p>
      {CONSUMABLES.map((item) => {
        const cost = getConsumableCost(item.cost, purchases[item.id])
        const nextCost = getConsumableCost(item.cost, purchases[item.id] + 1)
        const remaining =
          item.id === 'spark-tonic'
            ? boosts.sparkClicks
            : item.id === 'focus-tonic'
              ? boosts.focusClicks
              : 0
        return (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/3 p-4"
          >
            <h3 className="font-medium">{item.name}</h3>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">
              {item.description.replace('Sparks', CURRENCY_NAME)}
            </p>
            <div className="h-4 mt-3">
              {remaining > 0 && (
                <p className="text-xs text-amber-200">
                  Active: {remaining} clicks remaining
                </p>
              )}
            </div>
            <Button
              className="mt-4 w-full cursor-pointer border border-amber-200/20 bg-amber-200/10 text-amber-100 hover:bg-amber-200/20"
              disabled={
                !Number.isSafeInteger(cost) ||
                balance < cost ||
                (item.id === 'reveal-dust' && revealed)
              }
              onClick={() => onBuy(item.id)}
            >
              Buy & use · {cost.toLocaleString()} {CURRENCY_NAME}
            </Button>
            <p className="mt-2 min-h-4 text-center text-xs text-stone-500">
              {balance < cost
                ? `Need ${(cost - balance).toLocaleString()} more ${CURRENCY_NAME}`
                : '\u00a0'}
            </p>
          </div>
        )
      })}
    </div>
  )
}

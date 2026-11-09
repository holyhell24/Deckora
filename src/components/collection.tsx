import { useRef, useState } from 'react'
import hiddenFace from '../assets/cards/hidden.svg'
import type { Rarity } from '../types/card'
import { CARDS } from '../constants/cards'
import type { CollectionCounts } from '../types/collection'
import { Button } from './ui/button'
import { CardExchange } from './card-exchange'
import { EXCHANGE_CARD_COUNT, NEXT_RARITY } from '../constants/exchange'

const RARITIES: readonly Rarity[] = ['White', 'Green', 'Blue', 'Purple', 'Gold']

export function Collection({
  counts,
  onExchange,
  exchangeMessage,
}: {
  counts: CollectionCounts
  onExchange: (rarity: Rarity, payment: CollectionCounts) => void
  exchangeMessage: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [activeRarity, setActiveRarity] = useState<Rarity>('White')
  const [selection, setSelection] = useState<CollectionCounts>({})
  const visibleCards = CARDS.filter((card) => card.rarity === activeRarity)
  const payment = Object.fromEntries(
    visibleCards.map((card) => [
      card.id,
      Math.min(selection[card.id] ?? 0, counts[card.id] ?? 0),
    ]),
  )
  const selectedCount = Object.values(payment).reduce(
    (sum, count) => sum + count,
    0,
  )
  const discovered = CARDS.filter((card) => counts[card.id] > 0)
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return (
    <>
      <Button
        variant="secondary"
        className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
        aria-haspopup="dialog"
        aria-controls="collection-dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        Collection ({total})
      </Button>
      <dialog
        ref={dialogRef}
        id="collection-dialog"
        aria-labelledby="collection-heading"
        className="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#141c24] p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          const bounds = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            dialogRef.current?.close()
        }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#141c24] p-6">
          <div>
            <h2 id="collection-heading" className="font-serif text-3xl">
              Your Collection
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              {discovered.length} / {CARDS.length} discovered · {total} cards
              collected
            </p>
          </div>
          <Button
            size="sm"
            aria-label="Close collection"
            className="cursor-pointer bg-white/5 hover:bg-white/10"
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </Button>
        </div>
        <div
          role="tablist"
          aria-label="Card rarities"
          className="flex gap-2 overflow-x-auto px-6 pt-5"
        >
          {RARITIES.map((rarity, index) => (
            <button
              key={rarity}
              type="button"
              role="tab"
              id={`collection-tab-${rarity}`}
              aria-controls="collection-panel"
              aria-selected={activeRarity === rarity}
              tabIndex={activeRarity === rarity ? 0 : -1}
              onClick={() => {
                setActiveRarity(rarity)
                setSelection({})
              }}
              onKeyDown={(event) => {
                let nextIndex = index
                if (event.key === 'ArrowRight')
                  nextIndex = (index + 1) % RARITIES.length
                else if (event.key === 'ArrowLeft')
                  nextIndex = (index - 1 + RARITIES.length) % RARITIES.length
                else if (event.key === 'Home') nextIndex = 0
                else if (event.key === 'End') nextIndex = RARITIES.length - 1
                else return
                event.preventDefault()
                setActiveRarity(RARITIES[nextIndex])
                setSelection({})
                document
                  .getElementById(`collection-tab-${RARITIES[nextIndex]}`)
                  ?.focus()
              }}
              className={`cursor-pointer whitespace-nowrap rounded-lg border px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${activeRarity === rarity ? 'border-amber-200/40 bg-amber-200/10 text-amber-100' : 'border-white/10 text-stone-400 hover:bg-white/5 hover:text-white'}`}
            >
              {rarity} (
              {CARDS.filter((card) => card.rarity === rarity).reduce(
                (total, card) => total + (counts[card.id] ?? 0),
                0,
              )}
              )
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id="collection-panel"
          aria-labelledby={`collection-tab-${activeRarity}`}
          tabIndex={0}
          className="p-6"
        >
          <CardExchange
            key={activeRarity}
            rarity={activeRarity}
            payment={payment}
            onClear={() => setSelection({})}
            onExchange={onExchange}
          />
          <p role="status" className="mb-4 text-sm text-amber-200">
            {exchangeMessage}
          </p>
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
            {visibleCards.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  disabled={
                    !NEXT_RARITY[activeRarity] ||
                    !(counts[card.id] > 0) ||
                    selectedCount >= EXCHANGE_CARD_COUNT ||
                    payment[card.id] >= counts[card.id]
                  }
                  aria-label={
                    counts[card.id] > 0
                      ? `Select ${card.name} for exchange. ${payment[card.id]} selected of ${counts[card.id]} owned`
                      : 'Undiscovered card'
                  }
                  onClick={() =>
                    setSelection({
                      ...payment,
                      [card.id]: payment[card.id] + 1,
                    })
                  }
                  className={`block w-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 enabled:cursor-pointer ${payment[card.id] > 0 ? 'ring-2 ring-amber-200 ring-offset-4 ring-offset-[#141c24]' : ''}`}
                >
                  <img
                    src={counts[card.id] > 0 ? card.image : hiddenFace}
                    alt={counts[card.id] > 0 ? card.name : 'Undiscovered card'}
                    width={256}
                    height={384}
                    loading="lazy"
                    className="h-auto w-full rounded-xl"
                  />
                </button>
                {payment[card.id] > 0 && (
                  <button
                    type="button"
                    aria-label={`Remove one ${card.name} from exchange`}
                    onClick={() =>
                      setSelection({
                        ...payment,
                        [card.id]: payment[card.id] - 1,
                      })
                    }
                    className="mt-3 w-full cursor-pointer rounded-md bg-amber-200/10 px-2 py-1 text-xs text-amber-100 hover:bg-amber-200/20"
                  >
                    {payment[card.id]} selected · Remove one
                  </button>
                )}
                <div className="h-5 flex items-center justify-center">
                  <h3 className="mt-2 text-sm font-medium">
                    {counts[card.id] > 1 ? `(${counts[card.id]})` : ''}
                  </h3>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  )
}

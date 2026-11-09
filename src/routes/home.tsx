import { useState } from 'react'

import { CollectibleCard } from '../components/collectible-card'
import { Button } from '../components/ui/button'
import { CARDS } from '../constants/cards'
import { CURRENCY_NAME, getClickTarget } from '../constants/clicker'
import { RARITY_WEIGHTS } from '../constants/rarities'

const randomCard = () => {
  const rarities = Object.entries(RARITY_WEIGHTS)
  const totalWeight = rarities.reduce((total, [, weight]) => total + weight, 0)
  let roll = Math.random() * totalWeight

  for (const [rarity, weight] of rarities) {
    roll -= weight
    if (roll < 0) {
      const cards = CARDS.filter((card) => card.rarity === rarity)
      return cards[Math.floor(Math.random() * cards.length)]
    }
  }

  throw new Error('Could not pick a card: check rarity weights.')
}

export function HomePage() {
  const [progress, setProgress] = useState({
    currentCount: 0,
    sparks: 0,
    completedRounds: 0,
  })
  const { currentCount, sparks, completedRounds } = progress
  const [card, setCard] = useState(randomCard)
  const requiredClicks = getClickTarget(completedRounds)
  const obtained = currentCount >= requiredClicks

  function handleCardClick() {
    setProgress((previous) => {
      if (previous.currentCount >= getClickTarget(previous.completedRounds))
        return previous
      return {
        ...previous,
        currentCount: previous.currentCount + 1,
        sparks: previous.sparks + 1,
      }
    })
  }

  return (
    <main className="relative isolate grid min-h-svh place-items-center overflow-hidden bg-[#0d1117] px-6 py-16 text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,#26323b_0%,transparent_65%)]"
      />
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="text-sm font-semibold tracking-[0.3em]">DECKORA</span>
        <span className="rounded-full border border-amber-200/20 bg-amber-200/5 px-4 py-2 text-sm text-amber-200">
          <span className="font-semibold tabular-nums">
            {sparks.toLocaleString()}
          </span>{' '}
          {CURRENCY_NAME}
        </span>
      </header>

      <section aria-label="Card clicker" className="flex flex-col items-center">
        <p className="mb-7 text-[10px] font-medium uppercase tracking-[0.35em] text-stone-400">
          A discovery awaits
        </p>
        <CollectibleCard
          card={card}
          revealed={obtained}
          onClick={handleCardClick}
        />

        <div className="mt-8 w-56 sm:w-64">
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-center text-2xl font-light tabular-nums tracking-wider"
          >
            {currentCount}
            <span className="mx-1 text-stone-600">/</span>
            <span className="text-stone-400">{requiredClicks}</span>
          </p>
          <div
            role="progressbar"
            aria-label="Card unlock progress"
            aria-valuemin={0}
            aria-valuemax={requiredClicks}
            aria-valuenow={currentCount}
            className="mt-4 h-0.5 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full bg-stone-200 transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${(currentCount / requiredClicks) * 100}%` }}
            />
          </div>
          <p role="status" className="mt-4 text-center text-xs text-stone-400">
            {obtained
              ? `${card.name} is yours.`
              : 'Every click brings it closer.'}
          </p>
          <p className="mt-2 text-center text-xs text-amber-200/60">
            {obtained
              ? `Next card: ${getClickTarget(completedRounds + 1)} clicks`
              : `+1 ${CURRENCY_NAME.slice(0, -1)} per click`}
          </p>
        </div>
        <div className="mt-6 flex h-10 items-center">
          {obtained && (
            <Button
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                setCard(randomCard())
                setProgress((previous) => ({
                  ...previous,
                  currentCount: 0,
                  completedRounds: previous.completedRounds + 1,
                }))
              }}
            >
              Discover another card
            </Button>
          )}
        </div>
      </section>
    </main>
  )
}

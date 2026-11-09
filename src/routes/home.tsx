import { useState } from 'react'

import { CollectibleCard } from '../components/collectible-card'
import { Button } from '../components/ui/button'
import { CARDS, REQUIRED_CLICKS } from '../constants/cards'
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
  const [currentCount, setCurrentCount] = useState(0)
  const [card, setCard] = useState(randomCard)
  const obtained = currentCount === REQUIRED_CLICKS

  return (
    <main className="relative isolate grid min-h-svh place-items-center overflow-hidden bg-[#0d1117] px-6 py-16 text-stone-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,#26323b_0%,transparent_65%)]" />
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="text-sm font-semibold tracking-[0.3em]">DECKORA</span>
        <span className="text-xs tracking-widest text-stone-500">THE COLLECTION BEGINS</span>
      </header>

      <section aria-label="Card clicker" className="flex flex-col items-center">
        <p className="mb-7 text-[10px] font-medium uppercase tracking-[0.35em] text-stone-400">A discovery awaits</p>
        <CollectibleCard
          card={card}
          revealed={obtained}
          onClick={() => setCurrentCount((count) => Math.min(count + 1, REQUIRED_CLICKS))}
        />

        <div className="mt-8 w-56 sm:w-64">
          <p aria-live="polite" aria-atomic="true" className="text-center text-2xl font-light tabular-nums tracking-wider">
            {currentCount}<span className="mx-1 text-stone-600">/</span><span className="text-stone-400">{REQUIRED_CLICKS}</span>
          </p>
          <div role="progressbar" aria-label="Card unlock progress" aria-valuemin={0} aria-valuemax={REQUIRED_CLICKS} aria-valuenow={currentCount} className="mt-4 h-0.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-stone-200 transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${(currentCount / REQUIRED_CLICKS) * 100}%` }} />
          </div>
          <p role="status" className="mt-4 text-center text-xs text-stone-400">{obtained ? `${card.name} is yours.` : 'Every click brings it closer.'}</p>
        </div>
        <div className="mt-6 flex h-10 items-center">
          {obtained && (
            <Button
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                setCard(randomCard())
                setCurrentCount(0)
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


import { useRef, useState } from 'react'

import { CollectibleCard } from '../components/collectible-card'
import { Button } from '../components/ui/button'
import { Shop } from '../components/shop'
import { getCriticalChance, getUpgradeCost, UPGRADES } from '../constants/shop'
import type { UpgradeId, UpgradeLevels } from '../types/upgrade'
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
  const shopRef = useRef<HTMLDialogElement>(null)
  const [progress, setProgress] = useState({
    currentCount: 0,
    sparks: 0,
    completedRounds: 0,
    requiredClicks: getClickTarget(0),
    levels: {
      power: 0,
      mastery: 0,
      fortune: 0,
      critical: 0,
    } as UpgradeLevels,
    clickMessage: '',
    shopMessage: '',
  })
  const { currentCount, sparks, completedRounds, requiredClicks, levels } =
    progress
  const [card, setCard] = useState(() => randomCard())
  const obtained = currentCount >= requiredClicks

  function buyUpgrade(id: UpgradeId) {
    setProgress((previous) => {
      const upgrade = UPGRADES.find((item) => item.id === id)!
      const cost = getUpgradeCost(upgrade.baseCost, previous.levels[id])
      if (previous.sparks < cost) return previous
      if (id === 'critical' && previous.levels.critical >= 10) return previous
      return {
        ...previous,
        sparks: previous.sparks - cost,
        levels: { ...previous.levels, [id]: previous.levels[id] + 1 },
        shopMessage: `${upgrade.name} upgraded to level ${previous.levels[id] + 1}.`,
      }
    })
  }

  function discoverNextCard() {
    setCard(randomCard())
    setProgress((previous) => ({
      ...previous,
      currentCount: 0,
      clickMessage: '',
      completedRounds: previous.completedRounds + 1,
      requiredClicks: getClickTarget(
        previous.completedRounds + 1,
        previous.levels.mastery,
      ),
    }))
  }

  function handleCardClick() {
    if (obtained) {
      discoverNextCard()
      return
    }

    const criticalRoll = Math.random()
    setProgress((previous) => {
      if (previous.currentCount >= previous.requiredClicks) return previous
      const multiplier =
        criticalRoll < getCriticalChance(previous.levels.critical) ? 2 : 1
      const earned =
        (previous.levels.power + 1 + previous.levels.fortune * 2) * multiplier
      return {
        ...previous,
        currentCount: Math.min(
          previous.currentCount + (previous.levels.power + 1) * multiplier,
          previous.requiredClicks,
        ),
        sparks: previous.sparks + earned,
        clickMessage:
          multiplier === 2 ? `Critical click! +${earned} ${CURRENCY_NAME}` : '',
      }
    })
  }

  return (
    <main className="relative isolate grid min-h-svh place-items-center overflow-hidden bg-[#0d1117] px-6 pb-12 pt-28 text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,#26323b_0%,transparent_65%)]"
      />
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="text-sm font-semibold tracking-[0.3em]">DECKORA</span>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-amber-200/20 bg-amber-200/5 px-4 py-2 text-sm text-amber-200">
            <span className="font-semibold tabular-nums">
              {sparks.toLocaleString()}
            </span>{' '}
            {CURRENCY_NAME}
          </span>
          <Button
            variant="secondary"
            className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
            aria-haspopup="dialog"
            aria-controls="shop-dialog"
            onClick={() => shopRef.current?.showModal()}
          >
            Shop
          </Button>
        </div>
      </header>

      <div className="flex w-full max-w-5xl flex-col items-center justify-center gap-14 lg:flex-row lg:gap-24">
        <section
          aria-label="Card clicker"
          className="flex shrink-0 flex-col items-center"
        >
          <p className="mb-7 text-[10px] font-medium uppercase tracking-[0.35em] text-stone-400">
            A discovery awaits
          </p>
          <CollectibleCard
            card={card}
            revealed={obtained}
            currentCount={currentCount}
            requiredClicks={requiredClicks}
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
            <p
              role="status"
              className="mt-4 text-center text-xs text-stone-400"
            >
              {obtained
                ? `${card.name} is yours.`
                : 'Every click brings it closer.'}
            </p>
            <p className="mt-2 text-center text-xs text-amber-200/60">
              {obtained
                ? `Next card: ${getClickTarget(completedRounds + 1, levels.mastery)} progress`
                : `+${levels.power + 1} progress · +${levels.power + 1 + levels.fortune * 2} ${CURRENCY_NAME} per click`}
            </p>
            <p
              role="status"
              className="mt-2 min-h-4 text-center text-xs text-amber-200"
            >
              {progress.clickMessage}
            </p>
          </div>
          <div className="mt-6 flex h-10 items-center">
            {obtained && (
              <Button
                variant="secondary"
                className="cursor-pointer"
                onClick={discoverNextCard}
              >
                Discover another card
              </Button>
            )}
          </div>
        </section>
      </div>
      <dialog
        ref={shopRef}
        id="shop-dialog"
        aria-labelledby="shop-heading"
        className="shop-drawer fixed inset-y-0 left-auto right-0 m-0 h-svh max-h-none w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#141c24] p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          const bounds = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            shopRef.current?.close()
        }}
      >
        <div className="relative min-h-full">
          <Button
            aria-label="Close shop"
            size="sm"
            className="absolute right-4 top-4 cursor-pointer bg-transparent text-stone-400 hover:bg-white/10 hover:text-white"
            onClick={() => shopRef.current?.close()}
          >
            Close
          </Button>
          <Shop
            balance={sparks}
            levels={levels}
            onBuy={buyUpgrade}
            message={progress.shopMessage}
          />
        </div>
      </dialog>
    </main>
  )
}

import { useEffect, useRef, useState } from 'react'

import { CollectibleCard } from '../components/collectible-card'
import { ThemeSelector } from '../components/theme-selector'
import { SoundToggle } from '../components/sound-toggle'
import { playSound, unlockAudio } from '../utils/sounds'
import { Collection } from '../components/collection'
import type { CollectionCounts } from '../types/collection'
import { Button } from '../components/ui/button'
import { Shop } from '../components/shop'
import {
  getCriticalChance,
  getUpgradeCardRarity,
  getUpgradeCost,
  UPGRADES,
} from '../constants/shop'
import type { UpgradeId, UpgradeLevels } from '../types/upgrade'
import { CARDS } from '../constants/cards'
import { CURRENCY_NAME, getClickTarget } from '../constants/clicker'
import { RARITY_WEIGHTS } from '../constants/rarities'
import { EXCHANGE_CARD_COUNT, NEXT_RARITY } from '../constants/exchange'
import type { Rarity } from '../types/card'
import { loadGame, saveGame } from '../utils/game-storage'

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
  const [restoredGame] = useState(() => loadGame(CARDS.map((card) => card.id)))
  const [storageError, setStorageError] = useState(false)
  const [progress, setProgress] = useState({
    currentCount: restoredGame?.currentCount ?? 0,
    sparks: restoredGame?.sparks ?? 0,
    completedRounds: restoredGame?.completedRounds ?? 0,
    requiredClicks: restoredGame?.requiredClicks ?? getClickTarget(0),
    levels:
      restoredGame?.levels ??
      ({
        power: 0,
        mastery: 0,
        fortune: 0,
        critical: 0,
        auto: 0,
      } as UpgradeLevels),
    clickMessage: '',
    shopMessage: '',
    collection: restoredGame?.collection ?? ({} as CollectionCounts),
    exchangeMessage: '',
  })
  const { currentCount, sparks, completedRounds, requiredClicks, levels } =
    progress
  const [card, setCard] = useState(
    () =>
      CARDS.find((card) => card.id === restoredGame?.cardId) ?? randomCard(),
  )
  const obtained = currentCount >= requiredClicks
  const collectionTotal = Object.values(progress.collection).reduce(
    (sum, count) => sum + count,
    0,
  )
  const previousAudioState = useRef({
    obtained,
    completedRounds,
    levels,
    collectionTotal,
  })

  useEffect(() => {
    document.addEventListener('pointerdown', unlockAudio, true)
    document.addEventListener('keydown', unlockAudio, true)
    return () => {
      document.removeEventListener('pointerdown', unlockAudio, true)
      document.removeEventListener('keydown', unlockAudio, true)
    }
  }, [])

  useEffect(() => {
    const previous = previousAudioState.current
    if (obtained && !previous.obtained) playSound('reveal')
    else if (completedRounds > previous.completedRounds) playSound('next')
    else if (
      Object.keys(levels).some(
        (key) => levels[key as UpgradeId] > previous.levels[key as UpgradeId],
      )
    )
      playSound('purchase')
    else if (
      previous.collectionTotal - collectionTotal ===
      EXCHANGE_CARD_COUNT - 1
    )
      playSound('exchange')
    previousAudioState.current = {
      obtained,
      completedRounds,
      levels,
      collectionTotal,
    }
  }, [obtained, completedRounds, levels, collectionTotal])

  useEffect(() => {
    const saved = saveGame({
      version: 1,
      cardId: card.id,
      currentCount,
      sparks,
      completedRounds,
      requiredClicks,
      levels,
      collection: progress.collection,
    })
    const notification = window.setTimeout(() => setStorageError(!saved), 0)
    return () => window.clearTimeout(notification)
  }, [
    card.id,
    currentCount,
    sparks,
    completedRounds,
    requiredClicks,
    levels,
    progress.collection,
  ])

  useEffect(() => {
    if (levels.auto === 0 || obtained) return

    const interval = window.setInterval(() => {
      setProgress((previous) => {
        if (
          previous.levels.auto === 0 ||
          previous.currentCount >= previous.requiredClicks
        )
          return previous
        const nextCount = Math.min(
          previous.currentCount + previous.levels.auto,
          previous.requiredClicks,
        )
        return {
          ...previous,
          currentCount: nextCount,
          sparks: previous.sparks + previous.levels.auto,
          collection:
            nextCount === previous.requiredClicks
              ? {
                  ...previous.collection,
                  [card.id]: (previous.collection[card.id] ?? 0) + 1,
                }
              : previous.collection,
          clickMessage: '',
        }
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [levels.auto, obtained, card.id])

  function exchangeCards(rarity: Rarity, payment: CollectionCounts) {
    const nextRarity = NEXT_RARITY[rarity]
    if (!nextRarity) return
    const rewards = CARDS.filter((card) => card.rarity === nextRarity)
    const reward = rewards[Math.floor(Math.random() * rewards.length)]
    setProgress((previous) => {
      const entries = Object.entries(payment)
      if (
        entries.reduce((sum, [, count]) => sum + count, 0) !==
        EXCHANGE_CARD_COUNT
      )
        return previous
      if (
        entries.some(
          ([id, count]) =>
            !Number.isInteger(count) ||
            count < 0 ||
            !CARDS.some((card) => card.id === id && card.rarity === rarity) ||
            count > (previous.collection[id] ?? 0),
        )
      )
        return previous
      const collection = { ...previous.collection }
      for (const [id, count] of entries)
        collection[id] = (collection[id] ?? 0) - count
      collection[reward.id] = (collection[reward.id] ?? 0) + 1
      return {
        ...previous,
        collection,
        exchangeMessage: `Exchanged 5 ${rarity} cards for ${reward.name} (${nextRarity}). Find it in the ${nextRarity} tab.`,
      }
    })
  }

  function buyUpgrade(id: UpgradeId, cardId?: string) {
    setProgress((previous) => {
      const upgrade = UPGRADES.find((item) => item.id === id)!
      const cost = getUpgradeCost(upgrade.baseCost, previous.levels[id])
      if (previous.sparks < cost) return previous
      if (id === 'critical' && previous.levels.critical >= 10) return previous
      const rarity = getUpgradeCardRarity(previous.levels[id])
      const paymentCard = CARDS.find(
        (card) => card.id === cardId && card.rarity === rarity,
      )
      if (
        rarity &&
        (!paymentCard || !(previous.collection[paymentCard.id] > 0))
      )
        return previous
      return {
        ...previous,
        sparks: previous.sparks - cost,
        collection:
          rarity && paymentCard
            ? {
                ...previous.collection,
                [paymentCard.id]: previous.collection[paymentCard.id] - 1,
              }
            : previous.collection,
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
    const isCritical = criticalRoll < getCriticalChance(levels.critical)
    if (
      currentCount + (levels.power + 1) * (isCritical ? 2 : 1) <
      requiredClicks
    ) {
      playSound(isCritical ? 'critical' : 'click')
    }
    setProgress((previous) => {
      if (previous.currentCount >= previous.requiredClicks) return previous
      const multiplier =
        criticalRoll < getCriticalChance(previous.levels.critical) ? 2 : 1
      const earned =
        (previous.levels.power + 1 + previous.levels.fortune * 2) * multiplier
      const nextCount = Math.min(
        previous.currentCount + (previous.levels.power + 1) * multiplier,
        previous.requiredClicks,
      )
      return {
        ...previous,
        currentCount: nextCount,
        collection:
          nextCount === previous.requiredClicks
            ? {
                ...previous.collection,
                [card.id]: (previous.collection[card.id] ?? 0) + 1,
              }
            : previous.collection,
        sparks: previous.sparks + earned,
        clickMessage:
          multiplier === 2 ? `Critical click! +${earned} ${CURRENCY_NAME}` : '',
      }
    })
  }

  return (
    <main className="relative isolate grid min-h-svh place-items-center overflow-hidden bg-page px-6 pb-12 pt-28 text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--glow)_0%,transparent_65%)]"
      />
      {storageError && (
        <p
          role="status"
          className="fixed bottom-3 z-20 rounded-lg bg-surface px-4 py-2 text-xs text-amber-200"
        >
          Browser storage is unavailable. Progress will not survive a reload.
        </p>
      )}
      <header className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 px-6 py-6 sm:px-10">
        <span className="text-sm font-semibold tracking-[0.3em]">DECKORA</span>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeSelector />
          <SoundToggle />
          <Collection
            counts={progress.collection}
            onExchange={exchangeCards}
            exchangeMessage={progress.exchangeMessage}
          />
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
            {levels.auto > 0 && (
              <p className="mt-2 text-center text-xs text-stone-400">
                Arcane Familiar:{' '}
                {obtained
                  ? 'paused'
                  : `+${levels.auto} progress / +${levels.auto} ${CURRENCY_NAME} per second`}
              </p>
            )}
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
        className="shop-drawer fixed inset-y-0 left-auto right-0 m-0 h-svh max-h-none w-full max-w-md overflow-y-auto border-l border-white/10 bg-surface p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
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
            collection={progress.collection}
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

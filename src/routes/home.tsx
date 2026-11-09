import { useEffect, useRef, useState } from 'react'

import { CollectibleCard } from '../components/collectible-card'
import { ThemeSelector } from '../components/theme-selector'
import { SoundToggle } from '../components/sound-toggle'
import { initializeSounds, playSound } from '../utils/sounds'
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
import {
  BOOST_CLICKS,
  CONSUMABLES,
  getConsumableCost,
} from '../constants/consumables'
import type { ConsumableId } from '../types/consumable'

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
    boosts: restoredGame?.boosts ?? { sparkClicks: 0, focusClicks: 0 },
    consumablePurchases: restoredGame?.consumablePurchases ?? {
      'spark-tonic': 0,
      'focus-tonic': 0,
      'reveal-dust': 0,
    },
  })
  const { currentCount, sparks, completedRounds, requiredClicks, levels } =
    progress
  const [card, setCard] = useState(
    () =>
      CARDS.find((card) => card.id === restoredGame?.cardId) ?? randomCard(),
  )
  const obtained = currentCount >= requiredClicks
  const sparkBoost = progress.boosts.sparkClicks > 0
  const focusBoost = progress.boosts.focusClicks > 0
  const progressPerClick = (levels.power + 1) * (focusBoost ? 2 : 1)
  const sparksPerClick =
    (levels.power + 1 + levels.fortune * 2) * (sparkBoost ? 2 : 1)
  const nextTarget = getClickTarget(completedRounds + 1, levels.mastery)
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
    document.addEventListener('pointerdown', initializeSounds, true)
    document.addEventListener('keydown', initializeSounds, true)
    return () => {
      document.removeEventListener('pointerdown', initializeSounds, true)
      document.removeEventListener('keydown', initializeSounds, true)
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
      boosts: progress.boosts,
      consumablePurchases: progress.consumablePurchases,
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
    progress.boosts,
    progress.consumablePurchases,
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

  function buyConsumable(id: ConsumableId) {
    setProgress((previous) => {
      const item = CONSUMABLES.find((item) => item.id === id)
      if (!item) return previous
      const cost = getConsumableCost(
        item.cost,
        previous.consumablePurchases[id],
      )
      if (!Number.isSafeInteger(cost) || previous.sparks < cost) return previous
      if (
        id === 'reveal-dust' &&
        previous.currentCount >= previous.requiredClicks
      )
        return previous
      const nextCount =
        id === 'reveal-dust'
          ? Math.min(
              previous.requiredClicks,
              previous.currentCount + Math.ceil(previous.requiredClicks * 0.25),
            )
          : previous.currentCount
      return {
        ...previous,
        sparks: previous.sparks - cost,
        consumablePurchases: {
          ...previous.consumablePurchases,
          [id]: previous.consumablePurchases[id] + 1,
        },
        currentCount: nextCount,
        boosts: {
          sparkClicks:
            previous.boosts.sparkClicks +
            (id === 'spark-tonic' ? BOOST_CLICKS : 0),
          focusClicks:
            previous.boosts.focusClicks +
            (id === 'focus-tonic' ? BOOST_CLICKS : 0),
        },
        collection:
          id === 'reveal-dust' && nextCount === previous.requiredClicks
            ? {
                ...previous.collection,
                [card.id]: (previous.collection[card.id] ?? 0) + 1,
              }
            : previous.collection,
        shopMessage: `${item.name} activated.`,
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
    const critical = criticalRoll < getCriticalChance(levels.critical)
    if (
      currentCount +
        (levels.power + 1) *
          (critical ? 2 : 1) *
          (progress.boosts.focusClicks > 0 ? 2 : 1) <
      requiredClicks
    )
      playSound(critical ? 'critical' : 'click')
    setProgress((previous) => {
      if (previous.currentCount >= previous.requiredClicks) return previous
      const multiplier =
        criticalRoll < getCriticalChance(previous.levels.critical) ? 2 : 1
      const earned =
        (previous.levels.power + 1 + previous.levels.fortune * 2) *
        multiplier *
        (previous.boosts.sparkClicks > 0 ? 2 : 1)
      const nextCount = Math.min(
        previous.currentCount +
          (previous.levels.power + 1) *
            multiplier *
            (previous.boosts.focusClicks > 0 ? 2 : 1),
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
        boosts: {
          sparkClicks: Math.max(0, previous.boosts.sparkClicks - 1),
          focusClicks: Math.max(0, previous.boosts.focusClicks - 1),
        },
        clickMessage:
          multiplier === 2 ? `Critical click! +${earned} ${CURRENCY_NAME}` : '',
      }
    })
  }

  return (
    <main className="relative isolate flex min-h-svh flex-col items-center overflow-x-clip bg-page px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-stone-100 sm:px-8">
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
      <header className="flex w-full max-w-7xl flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold tracking-[0.3em]">
            DECKORA
          </span>
          <SoundToggle />
        </div>
        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <ThemeSelector />
            <Collection
              counts={progress.collection}
              onExchange={exchangeCards}
              exchangeMessage={progress.exchangeMessage}
            />
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
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
        </div>
      </header>

      <div className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-8 sm:py-12">
        <section
          aria-label="Card clicker"
          className="flex shrink-0 flex-col items-center"
        >
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.35em] text-stone-400">
            A discovery awaits
          </p>
          {obtained && (
            <p
              role="status"
              className="mb-4 text-center text-xs text-stone-400"
            >
              {card.name} is yours.
            </p>
          )}
          <CollectibleCard
            card={card}
            revealed={obtained}
            currentCount={currentCount}
            requiredClicks={requiredClicks}
            onClick={handleCardClick}
          />

          <div className="mt-6 w-full max-w-xs">
            <p
              aria-live="polite"
              aria-atomic="true"
              className="text-center text-2xl font-light tabular-nums tracking-wider"
            >
              {currentCount.toLocaleString()}
              <span className="mx-1 text-stone-600">/</span>
              <span className="text-stone-400">
                {requiredClicks.toLocaleString()}
              </span>
            </p>
            <dl
              className={`mt-4 grid overflow-hidden rounded-xl border border-white/10 text-center ${levels.auto > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}
            >
              <div className="flex flex-col justify-center bg-white/5 px-3 py-2.5">
                <dt className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-500">
                  {obtained ? 'Next card' : 'Click'}
                </dt>
                {obtained ? (
                  <dd className="mt-1.5 text-sm tabular-nums text-amber-200">
                    {nextTarget.toLocaleString()}
                    <span className="mt-0.5 block text-[11px] font-normal text-stone-400">
                      progress
                    </span>
                  </dd>
                ) : (
                  <dd className="mt-1.5 space-y-1 text-sm tabular-nums text-amber-200">
                    <span className="block">
                      +{progressPerClick.toLocaleString()}
                      <span className="ml-1 text-[11px] font-normal text-stone-400">
                        progress
                      </span>
                    </span>
                    <span className="block">
                      +{sparksPerClick.toLocaleString()}
                      <span className="ml-1 text-[11px] font-normal text-stone-400">
                        {CURRENCY_NAME}
                      </span>
                    </span>
                  </dd>
                )}
              </div>
              {levels.auto > 0 && (
                <div className="flex flex-col justify-center border-l border-white/10 bg-white/5 px-3 py-2.5">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-500">
                    {obtained ? 'Familiar' : 'Per second'}
                  </dt>
                  {obtained ? (
                    <dd className="mt-1.5 text-sm text-stone-400">Paused</dd>
                  ) : (
                    <dd className="mt-1.5 space-y-1 text-sm tabular-nums text-amber-200">
                      <span className="block">
                        +{levels.auto.toLocaleString()}
                        <span className="ml-1 text-[11px] font-normal text-stone-400">
                          progress
                        </span>
                      </span>
                      <span className="block">
                        +{levels.auto.toLocaleString()}
                        <span className="ml-1 text-[11px] font-normal text-stone-400">
                          {CURRENCY_NAME}
                        </span>
                      </span>
                    </dd>
                  )}
                </div>
              )}
            </dl>
            {(sparkBoost || focusBoost) && (
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {sparkBoost && (
                  <li className="rounded-full border border-amber-200/25 bg-amber-200/10 px-2.5 py-1 text-[11px] tabular-nums text-amber-200">
                    2× {CURRENCY_NAME}
                    <span className="text-amber-200/70">
                      {' '}
                      · {progress.boosts.sparkClicks} left
                    </span>
                  </li>
                )}
                {focusBoost && (
                  <li className="rounded-full border border-amber-200/25 bg-amber-200/10 px-2.5 py-1 text-[11px] tabular-nums text-amber-200">
                    2× progress
                    <span className="text-amber-200/70">
                      {' '}
                      · {progress.boosts.focusClicks} left
                    </span>
                  </li>
                )}
              </ul>
            )}
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
        className="shop-drawer fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none overscroll-contain w-full max-w-md overflow-y-auto border-l border-white/10 bg-surface p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
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
        <div className="relative min-h-full pb-[env(safe-area-inset-bottom)]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-surface px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <span className="text-sm text-amber-200">
              {sparks.toLocaleString()} {CURRENCY_NAME}
            </span>
            <Button
              aria-label="Close shop"
              size="sm"
              className="cursor-pointer bg-transparent text-stone-400 hover:bg-white/10 hover:text-white"
              onClick={() => shopRef.current?.close()}
            >
              Close
            </Button>
          </div>
          <Shop
            consumablePurchases={progress.consumablePurchases}
            boosts={progress.boosts}
            revealed={obtained}
            onBuyConsumable={buyConsumable}
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

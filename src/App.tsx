import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { initializeSounds, playRevealSound, playSound } from './utils/sounds';
import type { CollectionCounts } from './types/collection';
import { Button } from './components/ui/button';
import {
  AUTO_REWARD_PER_LEVEL,
  getCriticalChance,
  getUpgradeCardRarity,
  getUpgradeCost,
  PROGRESS_REWARD_PER_LEVEL,
  UPGRADES,
} from './constants/shop';
import type { UpgradeId, UpgradeLevels } from './types/upgrade';
import { CARDS } from './constants/cards';
import { CURRENCY_NAME, getClickTarget } from './constants/clicker';
import { RARITY_WEIGHTS } from './constants/rarities';
import { EXCHANGE_CARD_COUNT, NEXT_RARITY } from './constants/exchange';
import type { Rarity } from './types/card';
import {
  loadLegacyGame,
  removeLegacyGame,
  resetLocalGameData,
  saveClickProgress,
} from './utils/game-storage';
import {
  loadOrMigrateGame,
  saveGameToFirestore,
} from './utils/firestore-game-storage';
import { claimSpectralGift, sendSpectralGift } from './utils/spectral-gifts';
import {
  BOOST_CLICKS,
  CONSUMABLES,
  getConsumableCost,
} from './constants/consumables';
import type { ConsumableId } from './types/consumable';
import { useAccount } from './hooks/use-account';
import { AccountAccess } from './components/account-access';
import type { SavedGame } from './types/save';
import { GameCardStage } from './components/game-card-stage';
import { GameHeader } from './components/game-header';
import { GameShopDrawer } from './components/game-shop-drawer';

const randomCard = () => {
  const rarities = Object.entries(RARITY_WEIGHTS);
  const totalWeight = rarities.reduce((total, [, weight]) => total + weight, 0);
  let roll = Math.random() * totalWeight;

  for (const [rarity, weight] of rarities) {
    roll -= weight;
    if (roll < 0) {
      const cards = CARDS.filter((card) => card.rarity === rarity);
      return cards[Math.floor(Math.random() * cards.length)];
    }
  }

  throw new Error('Could not pick a card: check rarity weights.');
};

const INITIAL_VALUES = {
  currentCount: 0,
  sparks: 0,
  completedRounds: 0,
  requiredClicks: getClickTarget(0),
  levels: {
    power: 0,
    progress: 0,
    mastery: 0,
    fortune: 0,
    critical: 0,
    auto: 0,
  } as UpgradeLevels,
  cardRequirements: {
    auto: null,
    power: null,
    progress: null,
    mastery: null,
    fortune: null,
    critical: null,
  },
  clickMessage: '',
  shopMessage: '',
  collection: {} as CollectionCounts,
  exchangeMessage: '',
  boosts: { sparkClicks: 0, focusClicks: 0 },
  consumablePurchases: {
    'spark-tonic': 0,
    'focus-tonic': 0,
    'reveal-dust': 0,
  },
};

type GameLoadState =
  | { status: 'ready'; uid: string; attempt: number }
  | { status: 'error'; uid: string; attempt: number; message: string };

type GameProgress = Omit<SavedGame, 'version' | 'cardId'> & {
  clickMessage: string;
  shopMessage: string;
  exchangeMessage: string;
};

function getGameStorageError(error: unknown) {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : undefined;

  if (code === 'permission-denied') {
    return 'Firestore denied game-save access. Deploy the updated firestore.rules and try again.';
  }

  if (error instanceof Error) {
    return error.message.replace(/^FirebaseError:\s*/, '');
  }

  return 'Could not access your saved game. Check your connection and try again.';
}

export default function App() {
  const accountSession = useAccount();
  const shopRef = useRef<HTMLDialogElement>(null);
  const [progress, setProgress] = useState<GameProgress>(INITIAL_VALUES);
  const { currentCount, sparks, completedRounds, requiredClicks, levels } =
    progress;
  const [card, setCard] = useState(randomCard);
  const [gameLoadState, setGameLoadState] = useState<GameLoadState | null>(
    null,
  );
  const [gameLoadAttempt, setGameLoadAttempt] = useState(0);
  const [saveRetryAttempt, setSaveRetryAttempt] = useState(0);
  const [firestoreSaveError, setFirestoreSaveError] = useState('');
  const [localStorageError, setLocalStorageError] = useState('');
  const [legacyCleanupError, setLegacyCleanupError] = useState('');
  const accountUid =
    accountSession.account.status === 'ready'
      ? accountSession.account.profile.uid
      : null;
  const gameIsLoaded =
    accountUid !== null &&
    gameLoadState?.status === 'ready' &&
    gameLoadState.uid === accountUid &&
    gameLoadState.attempt === gameLoadAttempt;
  const loadedGameKey =
    gameIsLoaded && accountUid ? `${accountUid}:${gameLoadAttempt}` : null;
  const obtained = currentCount >= requiredClicks;
  const [revealAnimation, setRevealAnimation] = useState<{
    gameKey: string | null;
    complete: boolean;
  }>({ gameKey: null, complete: true });
  const revealAnimationComplete =
    loadedGameKey === null ||
    revealAnimation.gameKey !== loadedGameKey ||
    revealAnimation.complete;
  const previousObtained = useRef(obtained);
  const previousLoadedGameKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!loadedGameKey) {
      previousObtained.current = obtained;
      previousLoadedGameKey.current = null;
      return;
    }

    if (previousLoadedGameKey.current !== loadedGameKey) {
      previousObtained.current = obtained;
      previousLoadedGameKey.current = loadedGameKey;
      return;
    }

    if (obtained !== previousObtained.current) {
      previousObtained.current = obtained;
      setRevealAnimation({ gameKey: loadedGameKey, complete: !obtained });
    }
  }, [loadedGameKey, obtained]);
  const sparkBoost = progress.boosts.sparkClicks > 0;
  const focusBoost = progress.boosts.focusClicks > 0;
  const progressPerClick =
    (levels.power + 1 + levels.progress * PROGRESS_REWARD_PER_LEVEL) *
    (focusBoost ? 2 : 1);
  const familiarRewardPerSecond = levels.auto * AUTO_REWARD_PER_LEVEL;
  const sparksPerClick =
    (levels.power + 1 + levels.fortune * 2) * (sparkBoost ? 2 : 1);
  const nextTarget = getClickTarget(completedRounds + 1, levels.mastery);
  const collectionTotal = Object.values(progress.collection).reduce(
    (sum, count) => sum + count,
    0,
  );
  function getCurrentSavedGame(): SavedGame {
    return {
      version: 1,
      cardId: card.id,
      currentCount,
      sparks,
      completedRounds,
      requiredClicks,
      levels,
      cardRequirements: progress.cardRequirements,
      collection: progress.collection,
      boosts: progress.boosts,
      consumablePurchases: progress.consumablePurchases,
    };
  }

  async function handleSendSpectralGift(
    recipientNickname: string,
    cardId: string,
    expectedOwnedCount: number,
  ) {
    if (
      !accountUid ||
      !gameIsLoaded ||
      accountSession.account.status !== 'ready'
    ) {
      throw new Error('Your game is still loading. Please try again.');
    }

    const remainingCount = await sendSpectralGift({
      senderUid: accountUid,
      senderNickname: accountSession.account.profile.nickname,
      recipientNickname,
      cardId,
      expectedOwnedCount,
      validCardIds: CARDS.map((item) => item.id),
    });
    setProgress((previous) => ({
      ...previous,
      collection: { ...previous.collection, [cardId]: remainingCount },
    }));
  }

  async function handleClaimSpectralGift(giftId: string) {
    if (!accountUid || !gameIsLoaded) {
      throw new Error('Your game is still loading. Please try again.');
    }

    const claimedGift = await claimSpectralGift({
      giftId,
      recipientUid: accountUid,
      baseSave: getCurrentSavedGame(),
      validCardIds: CARDS.map((item) => item.id),
    });
    setProgress((previous) => ({
      ...previous,
      collection: {
        ...previous.collection,
        [claimedGift.cardId]: claimedGift.collectionCount,
      },
    }));
  }

  const previousAudioState = useRef({
    obtained,
    completedRounds,
    levels,
    collectionTotal,
  });

  useEffect(() => {
    if (!accountUid) {
      return;
    }

    const uid = accountUid;
    const attempt = gameLoadAttempt;
    const controller = new AbortController();
    const validCardIds = CARDS.map((card) => card.id);

    async function restoreGame() {
      try {
        const legacyGame = loadLegacyGame(validCardIds);
        const savedGame = await loadOrMigrateGame(
          uid,
          validCardIds,
          legacyGame,
        );
        if (controller.signal.aborted) {
          return;
        }

        const restoredProgress = savedGame
          ? {
              ...INITIAL_VALUES,
              currentCount: savedGame.currentCount,
              sparks: savedGame.sparks,
              completedRounds: savedGame.completedRounds,
              requiredClicks: savedGame.requiredClicks,
              levels: savedGame.levels,
              cardRequirements: savedGame.cardRequirements,
              collection: savedGame.collection,
              boosts: savedGame.boosts,
              consumablePurchases: savedGame.consumablePurchases,
            }
          : INITIAL_VALUES;
        const restoredCard = savedGame
          ? CARDS.find((card) => card.id === savedGame.cardId)
          : randomCard();
        if (!restoredCard) {
          throw new Error('The saved card could not be found.');
        }

        setCard(restoredCard);
        setProgress(restoredProgress);
        setFirestoreSaveError('');
        previousAudioState.current = {
          obtained:
            restoredProgress.currentCount >= restoredProgress.requiredClicks,
          completedRounds: restoredProgress.completedRounds,
          levels: restoredProgress.levels,
          collectionTotal: Object.values(restoredProgress.collection).reduce(
            (sum, count) => sum + count,
            0,
          ),
        };
        setLegacyCleanupError(
          removeLegacyGame()
            ? ''
            : 'Previous local game data could not be removed from this device.',
        );
        setGameLoadState({ status: 'ready', uid, attempt });
      } catch (error) {
        if (!controller.signal.aborted) {
          setGameLoadState({
            status: 'error',
            uid,
            attempt,
            message: getGameStorageError(error),
          });
        }
      }
    }

    void restoreGame();
    return () => {
      controller.abort();
    };
  }, [accountUid, gameLoadAttempt]);

  useEffect(() => {
    document.addEventListener('pointerdown', initializeSounds, true);
    document.addEventListener('keydown', initializeSounds, true);
    return () => {
      document.removeEventListener('pointerdown', initializeSounds, true);
      document.removeEventListener('keydown', initializeSounds, true);
    };
  }, []);

  useEffect(() => {
    const previous = previousAudioState.current;
    if (obtained && !previous.obtained) {
      playRevealSound(card.rarity);
    } else if (completedRounds > previous.completedRounds) {
      playSound('next');
    } else if (
      Object.keys(levels).some(
        (key) => levels[key as UpgradeId] > previous.levels[key as UpgradeId],
      )
    ) {
      playSound('purchase');
    } else if (
      previous.collectionTotal - collectionTotal ===
      EXCHANGE_CARD_COUNT - 1
    ) {
      playSound('exchange');
    }
    previousAudioState.current = {
      obtained,
      completedRounds,
      levels,
      collectionTotal,
    };
  }, [obtained, completedRounds, levels, collectionTotal, card.rarity]);

  useEffect(() => {
    if (!accountUid || !gameIsLoaded) {
      return;
    }

    const localStorageMessage = saveClickProgress({
      currentCount,
      requiredClicks,
    })
      ? ''
      : 'Current click progress could not be saved in local storage.';
    const localStorageNotification = window.setTimeout(
      () => setLocalStorageError(localStorageMessage),
      0,
    );

    const savedGame: SavedGame = {
      version: 1,
      cardId: card.id,
      currentCount,
      sparks,
      completedRounds,
      requiredClicks,
      levels,
      cardRequirements: progress.cardRequirements,
      collection: progress.collection,
      boosts: progress.boosts,
      consumablePurchases: progress.consumablePurchases,
    };
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void saveGameToFirestore(accountUid, savedGame)
        .then(() => {
          if (!controller.signal.aborted) {
            setFirestoreSaveError('');
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setFirestoreSaveError(getGameStorageError(error));
          }
        });
    }, 500);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
      window.clearTimeout(localStorageNotification);
    };
  }, [
    accountUid,
    gameIsLoaded,
    card.id,
    currentCount,
    sparks,
    completedRounds,
    requiredClicks,
    levels,
    progress.cardRequirements,
    progress.collection,
    progress.boosts,
    progress.consumablePurchases,
    saveRetryAttempt,
  ]);

  useEffect(() => {
    if (levels.auto === 0 || obtained) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((previous) => {
        if (
          previous.levels.auto === 0 ||
          previous.currentCount >= previous.requiredClicks
        ) {
          return previous;
        }
        const nextCount = Math.min(
          previous.currentCount + previous.levels.auto * AUTO_REWARD_PER_LEVEL,
          previous.requiredClicks,
        );
        return {
          ...previous,
          currentCount: nextCount,
          sparks:
            previous.sparks + previous.levels.auto * AUTO_REWARD_PER_LEVEL,
          collection:
            nextCount === previous.requiredClicks
              ? {
                  ...previous.collection,
                  [card.id]: (previous.collection[card.id] ?? 0) + 1,
                }
              : previous.collection,
          clickMessage: '',
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [levels.auto, obtained, card.id]);

  function exchangeCards(rarity: Rarity, payment: CollectionCounts) {
    const nextRarity = NEXT_RARITY[rarity];
    if (!nextRarity) {
      return;
    }

    const rewards = CARDS.filter((card) => card.rarity === nextRarity);
    const reward = rewards[Math.floor(Math.random() * rewards.length)];
    setProgress((previous) => {
      const entries = Object.entries(payment);
      if (
        entries.reduce((sum, [, count]) => sum + count, 0) !==
        EXCHANGE_CARD_COUNT
      ) {
        return previous;
      }

      if (
        entries.some(
          ([id, count]) =>
            !Number.isInteger(count) ||
            count < 0 ||
            !CARDS.some((card) => card.id === id && card.rarity === rarity) ||
            count > (previous.collection[id] ?? 0),
        )
      ) {
        return previous;
      }

      const collection = { ...previous.collection };
      for (const [id, count] of entries)
        collection[id] = (collection[id] ?? 0) - count;
      collection[reward.id] = (collection[reward.id] ?? 0) + 1;
      return {
        ...previous,
        collection,
        exchangeMessage: `Exchanged 5 ${rarity} cards for ${reward.name} (${nextRarity}). Find it in the ${nextRarity} tab.`,
      };
    });
  }

  function buyConsumable(id: ConsumableId) {
    setProgress((previous) => {
      const item = CONSUMABLES.find((item) => item.id === id);
      if (!item) {
        return previous;
      }

      const cost = getConsumableCost(
        item.cost,
        previous.consumablePurchases[id],
      );
      if (!Number.isSafeInteger(cost) || previous.sparks < cost) {
        return previous;
      }

      if (
        id === 'reveal-dust' &&
        previous.currentCount >= previous.requiredClicks
      ) {
        return previous;
      }

      const nextCount =
        id === 'reveal-dust'
          ? Math.min(
              previous.requiredClicks,
              previous.currentCount + Math.ceil(previous.requiredClicks * 0.25),
            )
          : previous.currentCount;
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
      };
    });
  }

  function buyUpgrade(id: UpgradeId, cardId?: string) {
    const nextCardRequirement = getUpgradeCardRarity(levels[id] + 1);
    setProgress((previous) => {
      const upgrade = UPGRADES.find((item) => item.id === id)!;
      const cost = getUpgradeCost(upgrade.baseCost, previous.levels[id]);
      if (previous.sparks < cost) {
        return previous;
      }

      if (
        upgrade.maxLevel !== undefined &&
        previous.levels[id] >= upgrade.maxLevel
      ) {
        return previous;
      }

      const rarity = previous.cardRequirements[id];
      const paymentCard = CARDS.find(
        (card) => card.id === cardId && card.rarity === rarity,
      );
      if (
        rarity &&
        (!paymentCard || !(previous.collection[paymentCard.id] > 0))
      ) {
        return previous;
      }

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
        cardRequirements: {
          ...previous.cardRequirements,
          [id]: nextCardRequirement,
        },
        shopMessage: `${upgrade.name} upgraded to level ${previous.levels[id] + 1}.`,
      };
    });
  }

  function discoverNextCard() {
    setCard(randomCard());
    setProgress((previous) => ({
      ...previous,
      currentCount: 0,
      clickMessage: '',
      completedRounds: previous.completedRounds + 1,
      requiredClicks: getClickTarget(
        previous.completedRounds + 1,
        previous.levels.mastery,
      ),
    }));
  }

  function handleCardClick() {
    if (!revealAnimationComplete) {
      return;
    }

    if (obtained) {
      discoverNextCard();
      return;
    }

    const criticalRoll = Math.random();
    const critical = criticalRoll < getCriticalChance(levels.critical);
    if (
      currentCount +
        (levels.power + 1 + levels.progress * PROGRESS_REWARD_PER_LEVEL) *
          (critical ? 2 : 1) *
          (progress.boosts.focusClicks > 0 ? 2 : 1) <
      requiredClicks
    ) {
      playSound(critical ? 'critical' : 'click');
    }
    setProgress((previous) => {
      if (previous.currentCount >= previous.requiredClicks) {
        return previous;
      }
      const multiplier =
        criticalRoll < getCriticalChance(previous.levels.critical) ? 2 : 1;
      const earned =
        (previous.levels.power + 1 + previous.levels.fortune * 2) *
        multiplier *
        (previous.boosts.sparkClicks > 0 ? 2 : 1);
      const nextCount = Math.min(
        previous.currentCount +
          (previous.levels.power +
            1 +
            previous.levels.progress * PROGRESS_REWARD_PER_LEVEL) *
            multiplier *
            (previous.boosts.focusClicks > 0 ? 2 : 1),
        previous.requiredClicks,
      );
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
      };
    });
  }

  const onResetButtonClick = () => {
    const cleared = resetLocalGameData();
    setLocalStorageError(
      cleared ? '' : 'Local game data could not be cleared from this device.',
    );
    setLegacyCleanupError('');
    setProgress(INITIAL_VALUES);
  };

  if (accountSession.account.status !== 'ready') {
    return (
      <AccountAccess
        status={accountSession.account.status}
        email={
          accountSession.account.status === 'profileRequired'
            ? accountSession.account.email
            : undefined
        }
        error={
          accountSession.account.status === 'error'
            ? accountSession.account.error
            : undefined
        }
        saving={accountSession.saving}
        actionError={accountSession.actionError}
        onLogin={(email, password) => {
          accountSession.login(email, password);
        }}
        onRegister={(email, password, nickname) => {
          void accountSession.register({ email, password, nickname });
        }}
        onCompleteProfile={(nickname) => {
          void accountSession.completeProfile(nickname);
        }}
        onSignOut={() => {
          void accountSession.signOutAccount();
        }}
        onRetry={accountSession.retry}
      />
    );
  }

  if (
    gameLoadState?.status === 'error' &&
    gameLoadState.uid === accountUid &&
    gameLoadState.attempt === gameLoadAttempt
  ) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-page px-4 text-stone-100">
        <section className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-surface p-6">
          <p role="alert" className="text-sm text-amber-200">
            {gameLoadState.message}
          </p>
          <Button
            variant="secondary"
            className="w-full cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
            onClick={() => setGameLoadAttempt((attempt) => attempt + 1)}
          >
            Try again
          </Button>
        </section>
      </main>
    );
  }

  if (!gameIsLoaded) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-page px-4 text-stone-100">
        <p role="status" className="text-sm text-stone-400">
          Loading your saved game…
        </p>
      </main>
    );
  }

  return (
    <main className="relative isolate flex min-h-svh flex-col items-center overflow-x-clip bg-page px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-stone-100 sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--glow)_0%,transparent_65%)]"
      />
      {(localStorageError || legacyCleanupError || firestoreSaveError) && (
        <div
          role="alert"
          className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-start gap-3 rounded-lg bg-surface px-4 py-2 text-xs text-amber-200"
        >
          <p className="min-w-0 flex-1 break-words">
            {[localStorageError, legacyCleanupError, firestoreSaveError]
              .filter(Boolean)
              .join(' ')}
          </p>
          {firestoreSaveError && (
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => setSaveRetryAttempt((attempt) => attempt + 1)}
            >
              Retry
            </Button>
          )}
        </div>
      )}
      <GameHeader
        uid={accountSession.account.profile.uid}
        email={accountSession.account.profile.email}
        nickname={accountSession.account.profile.nickname}
        saving={accountSession.saving}
        accountError={accountSession.actionError}
        sparks={sparks}
        collection={progress.collection}
        exchangeMessage={progress.exchangeMessage}
        onSaveNickname={accountSession.changeNickname}
        onSignOut={() => {
          void accountSession.signOutAccount();
        }}
        onResetProgress={onResetButtonClick}
        onSendGift={handleSendSpectralGift}
        onClaimGift={handleClaimSpectralGift}
        onExchange={exchangeCards}
        onOpenShop={() => shopRef.current?.showModal()}
      />

      <GameCardStage
        card={card}
        obtained={obtained}
        currentCount={currentCount}
        requiredClicks={requiredClicks}
        nextTarget={nextTarget}
        revealAnimationComplete={revealAnimationComplete}
        autoLevel={levels.auto}
        progressPerClick={progressPerClick}
        sparksPerClick={sparksPerClick}
        familiarRewardPerSecond={familiarRewardPerSecond}
        sparkBoostClicks={progress.boosts.sparkClicks}
        focusBoostClicks={progress.boosts.focusClicks}
        clickMessage={progress.clickMessage}
        onCardClick={handleCardClick}
        onRevealAnimationEnd={() => {
          if (loadedGameKey) {
            setRevealAnimation({ gameKey: loadedGameKey, complete: true });
          }
        }}
      />
      <GameShopDrawer
        dialogRef={shopRef}
        sparks={sparks}
        consumablePurchases={progress.consumablePurchases}
        boosts={progress.boosts}
        obtained={obtained}
        collection={progress.collection}
        levels={levels}
        cardRequirements={progress.cardRequirements}
        message={progress.shopMessage}
        onBuyConsumable={buyConsumable}
        onBuyUpgrade={buyUpgrade}
      />
    </main>
  );
}

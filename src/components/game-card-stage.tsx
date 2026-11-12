import type { Card } from '../types/card';
import { CURRENCY_NAME } from '../constants/clicker';
import { CollectibleCard } from './collectible-card';

type GameCardStageProps = {
  card: Card;
  obtained: boolean;
  currentCount: number;
  requiredClicks: number;
  nextTarget: number;
  revealAnimationComplete: boolean;
  autoLevel: number;
  progressPerClick: number;
  sparksPerClick: number;
  familiarRewardPerSecond: number;
  sparkBoostClicks: number;
  focusBoostClicks: number;
  clickMessage: string;
  onCardClick: () => void;
  onRevealAnimationEnd: () => void;
};

export function GameCardStage({
  card,
  obtained,
  currentCount,
  requiredClicks,
  nextTarget,
  revealAnimationComplete,
  autoLevel,
  progressPerClick,
  sparksPerClick,
  familiarRewardPerSecond,
  sparkBoostClicks,
  focusBoostClicks,
  clickMessage,
  onCardClick,
  onRevealAnimationEnd,
}: GameCardStageProps) {
  const sparkBoost = sparkBoostClicks > 0;
  const focusBoost = focusBoostClicks > 0;

  return (
    <div className="flex w-full max-w-5xl flex-1 flex-col items-center justify-start py-5 sm:justify-center sm:py-12">
      <section
        aria-label="Card clicker"
        className="flex shrink-0 flex-col items-center"
      >
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.35em] text-stone-400">
          A discovery awaits
        </p>
        <p role="status" className="mb-4 text-center text-xs text-stone-400">
          {obtained
            ? `${card.name} is yours.`
            : 'Every click brings it closer.'}
        </p>
        <CollectibleCard
          card={card}
          revealed={obtained}
          currentCount={currentCount}
          requiredClicks={requiredClicks}
          disabled={!revealAnimationComplete}
          onClick={onCardClick}
          onRevealAnimationEnd={onRevealAnimationEnd}
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
            className={`mt-4 grid overflow-hidden rounded-xl border border-white/10 text-center ${autoLevel > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}
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
            {autoLevel > 0 && (
              <div className="flex flex-col justify-center border-l border-white/10 bg-white/5 px-3 py-2.5">
                <dt className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-500">
                  {obtained ? 'Familiar' : 'Per second'}
                </dt>
                {obtained ? (
                  <dd className="mt-1.5 text-sm text-stone-400">Paused</dd>
                ) : (
                  <dd className="mt-1.5 space-y-1 text-sm tabular-nums text-amber-200">
                    <span className="block">
                      +{familiarRewardPerSecond.toLocaleString()}
                      <span className="ml-1 text-[11px] font-normal text-stone-400">
                        progress
                      </span>
                    </span>
                    <span className="block">
                      +{familiarRewardPerSecond.toLocaleString()}
                      <span className="ml-1 text-[11px] font-normal text-stone-400">
                        {CURRENCY_NAME}
                      </span>
                    </span>
                  </dd>
                )}
              </div>
            )}
          </dl>
          <div className="mt-3 h-4">
            {(sparkBoost || focusBoost) && (
              <ul className="flex flex-wrap justify-center gap-2">
                {sparkBoost && (
                  <li className="rounded-full border border-amber-200/25 bg-amber-200/10 px-2.5 py-1 text-[11px] tabular-nums text-amber-200">
                    2× {CURRENCY_NAME}
                    <span className="text-amber-200/70">
                      {' '}
                      · {sparkBoostClicks} left
                    </span>
                  </li>
                )}
                {focusBoost && (
                  <li className="rounded-full border border-amber-200/25 bg-amber-200/10 px-2.5 py-1 text-[11px] tabular-nums text-amber-200">
                    2× progress
                    <span className="text-amber-200/70">
                      {' '}
                      · {focusBoostClicks} left
                    </span>
                  </li>
                )}
              </ul>
            )}
          </div>
          <div className="mt-6 h-4">
            <p
              role="status"
              className="mt-2 min-h-4 text-center text-xs text-amber-200"
            >
              {clickMessage}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

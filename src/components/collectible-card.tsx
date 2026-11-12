import {
  useRef,
  useState,
  type AnimationEvent,
  type PointerEvent,
} from 'react';
import type { Card } from '../types/card';
import hiddenFace from '../assets/cards/hidden.svg';

type CollectibleCardProps = {
  card: Card;
  revealed: boolean;
  currentCount: number;
  requiredClicks: number;
  disabled: boolean;
  onClick: () => void;
  onRevealAnimationEnd: () => void;
};

export function CollectibleCard({
  card,
  revealed,
  currentCount,
  requiredClicks,
  disabled,
  onClick,
  onRevealAnimationEnd,
}: CollectibleCardProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [revealState, setRevealState] = useState<{
    revealed: boolean;
    rarity: Card['rarity'] | null;
  }>({ revealed, rarity: null });
  if (revealState.revealed !== revealed) {
    setRevealState({ revealed, rarity: revealed ? card.rarity : null });
  }
  const fillPercentage = Math.max(
    0,
    Math.min(100, (currentCount / requiredClicks) * 100),
  );
  const face = revealed ? card.image : hiddenFace;
  const revealClass = revealState.rarity
    ? `card-reveal-${revealState.rarity.toLowerCase()}`
    : '';

  function handleAnimationEnd(event: AnimationEvent<HTMLButtonElement>) {
    if (
      event.target === event.currentTarget &&
      !event.pseudoElement &&
      event.animationName.startsWith('card-reveal-')
    ) {
      onRevealAnimationEnd();
    }
  }

  function resetTilt() {
    surfaceRef.current?.style.setProperty('--tilt-x', '0deg');
    surfaceRef.current?.style.setProperty('--tilt-y', '0deg');
  }

  function updateTilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / bounds.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - bounds.top) / bounds.height),
    );

    surfaceRef.current?.style.setProperty('--tilt-x', `${(0.5 - y) * 20}deg`);
    surfaceRef.current?.style.setProperty('--tilt-y', `${(x - 0.5) * 20}deg`);
  }

  return (
    <div
      className="-m-3 box-content w-[min(70vw,42svh,16rem)] p-3 [perspective:900px] sm:-m-10 sm:p-10 sm:w-[min(16rem,42svh)]"
      onPointerMove={updateTilt}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
      onBlur={resetTilt}
    >
      <div
        ref={surfaceRef}
        className="[transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] transition-transform duration-150 ease-out motion-reduce:transform-none motion-reduce:transition-none"
      >
        <button
          type="button"
          aria-disabled={disabled}
          onClick={onClick}
          onKeyDown={(event) => {
            if (disabled && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
            }
          }}
          onAnimationEnd={handleAnimationEnd}
          aria-label={
            disabled
              ? `${card.name} reveal animation in progress`
              : revealed
                ? `${card.name} obtained. Click to discover another card`
                : 'Click to uncover the hidden card'
          }
          className={`relative block w-full touch-manipulation select-none overflow-hidden rounded-2xl shadow-[0_24px_80px_#0008] transition-transform duration-150 cursor-pointer active:scale-[0.97] aria-disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-stone-200 motion-reduce:transform-none motion-reduce:transition-none ${revealClass}`}
        >
          <img
            src={face}
            alt={revealed ? card.name : 'Unknown Relic: touch to uncover'}
            width={256}
            height={384}
            draggable={false}
            className="block h-auto w-full select-none brightness-60 grayscale"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-[clip-path] duration-200 ease-out motion-reduce:transition-none"
            style={{ clipPath: `inset(${100 - fillPercentage}% 0 0 0)` }}
          >
            <img
              src={face}
              alt=""
              width={256}
              height={384}
              draggable={false}
              className="block h-auto w-full select-none"
            />
          </div>
        </button>
        <div
          role="progressbar"
          aria-label="Card unlock progress"
          aria-valuemin={0}
          aria-valuemax={requiredClicks}
          aria-valuenow={currentCount}
          className="sr-only"
        />
      </div>
    </div>
  );
}

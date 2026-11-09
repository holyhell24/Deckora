import { useRef, type PointerEvent } from 'react'
import type { Card } from '../types/card'
import hiddenFace from '../assets/cards/hidden.svg'

type CollectibleCardProps = {
  card: Card
  revealed: boolean
  onClick: () => void
}

export function CollectibleCard({
  card,
  revealed,
  onClick,
}: CollectibleCardProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)

  function resetTilt() {
    surfaceRef.current?.style.setProperty('--tilt-x', '0deg')
    surfaceRef.current?.style.setProperty('--tilt-y', '0deg')
  }

  function updateTilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return

    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / bounds.width),
    )
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - bounds.top) / bounds.height),
    )

    surfaceRef.current?.style.setProperty('--tilt-x', `${(0.5 - y) * 20}deg`)
    surfaceRef.current?.style.setProperty('--tilt-y', `${(x - 0.5) * 20}deg`)
  }

  return (
    <div
      className="-m-10 box-content w-56 p-10 [perspective:900px] sm:w-64"
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
          disabled={revealed}
          onClick={onClick}
          aria-label={
            revealed
              ? `${card.rarity} card obtained: ${card.name}`
              : 'Click to uncover the hidden card'
          }
          className="relative block w-full overflow-hidden rounded-2xl shadow-[0_24px_80px_#0008] transition-transform duration-150 enabled:cursor-pointer enabled:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-stone-200 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <img
            src={revealed ? card.image : hiddenFace}
            alt={revealed ? card.name : 'Unknown Relic: touch to uncover'}
            width={256}
            height={384}
            draggable={false}
            className="block h-auto w-full select-none"
          />
        </button>
      </div>
    </div>
  )
}

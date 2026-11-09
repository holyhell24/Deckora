import type { Card } from '../types/card'
import hiddenFace from '../assets/cards/hidden.svg'

type CollectibleCardProps = {
  card: Card
  revealed: boolean
  onClick: () => void
}

export function CollectibleCard({ card, revealed, onClick }: CollectibleCardProps) {
  return (
    <button
      type="button"
      disabled={revealed}
      onClick={onClick}
      aria-label={revealed ? `${card.rarity} card obtained: ${card.name}` : 'Click to uncover the hidden card'}
      className="relative w-56 overflow-hidden rounded-2xl shadow-[0_24px_80px_#0008] transition duration-150 enabled:cursor-pointer enabled:hover:-translate-y-1 enabled:active:translate-y-0 enabled:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-stone-200 motion-reduce:transform-none sm:w-64"
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
  )
}

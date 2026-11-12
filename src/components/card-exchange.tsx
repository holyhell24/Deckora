import { EXCHANGE_CARD_COUNT, NEXT_RARITY } from '../constants/exchange';
import type { Rarity } from '../types/card';
import type { CollectionCounts } from '../types/collection';
import { Button } from './ui/button';

type CardExchangeProps = {
  rarity: Rarity;
  payment: CollectionCounts;
  onExchange: (rarity: Rarity, payment: CollectionCounts) => void;
  onClear: () => void;
};

export function CardExchange({
  rarity,
  payment,
  onExchange,
  onClear,
}: CardExchangeProps) {
  const nextRarity = NEXT_RARITY[rarity];
  const selectedCount = Object.values(payment).reduce(
    (sum, count) => sum + count,
    0,
  );
  if (!nextRarity) {
    return (
      <p className="mb-6 text-sm text-amber-200/70">
        Gold is the highest tier. No further exchange is available.
      </p>
    );
  }

  return (
    <section
      aria-label="Card exchange"
      className="mb-6 rounded-xl border border-amber-200/20 bg-amber-200/5 p-4"
    >
      <h3 className="font-serif text-xl">
        Exchange: 5 {rarity} to 1 {nextRarity}
      </h3>
      <p className="mt-2 text-xs text-stone-400">
        Select copies directly from the collection below. Click a card again to
        add another copy; click its selected badge to remove one. Five copies
        are consumed for one random {nextRarity} card.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          className="cursor-pointer border border-amber-200/20 bg-amber-200/10 text-amber-100 hover:bg-amber-200/20"
          disabled={selectedCount !== EXCHANGE_CARD_COUNT}
          onClick={() => {
            onExchange(rarity, payment);
            onClear();
          }}
        >
          Exchange {selectedCount}/{EXCHANGE_CARD_COUNT} cards
        </Button>
        <Button
          className="cursor-pointer bg-white/5 hover:bg-white/10"
          disabled={selectedCount === 0}
          onClick={onClear}
        >
          Clear selection
        </Button>
      </div>
    </section>
  );
}

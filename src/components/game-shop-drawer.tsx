import type { RefObject } from 'react';
import { CURRENCY_NAME } from '../constants/clicker';
import type { CollectionCounts } from '../types/collection';
import type { ConsumableId } from '../types/consumable';
import type { SavedGame } from '../types/save';
import type { UpgradeId, UpgradeLevels } from '../types/upgrade';
import { closeDialogOnBackdropClick } from '../utils/dialog';
import { Button } from './ui/button';
import { Shop } from './shop';

type GameShopDrawerProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  sparks: number;
  consumablePurchases: SavedGame['consumablePurchases'];
  boosts: SavedGame['boosts'];
  obtained: boolean;
  collection: CollectionCounts;
  levels: UpgradeLevels;
  cardRequirements: SavedGame['cardRequirements'];
  message: string;
  onBuyConsumable: (id: ConsumableId) => void;
  onBuyUpgrade: (id: UpgradeId, cardId?: string) => void;
};

export function GameShopDrawer({
  dialogRef,
  sparks,
  consumablePurchases,
  boosts,
  obtained,
  collection,
  levels,
  cardRequirements,
  message,
  onBuyConsumable,
  onBuyUpgrade,
}: GameShopDrawerProps) {
  return (
    <dialog
      ref={dialogRef}
      id="shop-dialog"
      aria-labelledby="shop-heading"
      className="shop-drawer fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none overscroll-contain w-full max-w-md overflow-y-auto border-l border-white/10 bg-surface p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      onClick={closeDialogOnBackdropClick}
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
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </Button>
        </div>
        <Shop
          consumablePurchases={consumablePurchases}
          boosts={boosts}
          revealed={obtained}
          onBuyConsumable={onBuyConsumable}
          collection={collection}
          balance={sparks}
          levels={levels}
          cardRequirements={cardRequirements}
          onBuy={onBuyUpgrade}
          message={message}
        />
      </div>
    </dialog>
  );
}

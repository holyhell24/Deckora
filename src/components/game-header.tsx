import { useRef } from 'react';
import type { CollectionCounts } from '../types/collection';
import type { Rarity } from '../types/card';
import { CURRENCY_NAME } from '../constants/clicker';
import { closeDialogOnBackdropClick } from '../utils/dialog';
import { Button } from './ui/button';
import { Collection } from './collection';
import { ProfileDialog } from './profile-dialog';
import { ResetProgress } from './reset-progress';
import { SoundToggle } from './sound-toggle';
import { SpectralGifts } from './spectral-gifts';
import { ThemeSelector } from './theme-selector';

type GameHeaderProps = {
  uid: string;
  email: string;
  nickname: string;
  saving: boolean;
  accountError: string;
  sparks: number;
  collection: CollectionCounts;
  exchangeMessage: string;
  onSaveNickname: (nickname: string) => Promise<boolean>;
  onSignOut: () => void;
  onResetProgress: () => void;
  onSendGift: (
    recipientNickname: string,
    cardId: string,
    expectedOwnedCount: number,
  ) => Promise<void>;
  onClaimGift: (giftId: string) => Promise<void>;
  onExchange: (rarity: Rarity, payment: CollectionCounts) => void;
  onOpenShop: () => void;
};

export function GameHeader({
  uid,
  email,
  nickname,
  saving,
  accountError,
  sparks,
  collection,
  exchangeMessage,
  onSaveNickname,
  onSignOut,
  onResetProgress,
  onSendGift,
  onClaimGift,
  onExchange,
  onOpenShop,
}: GameHeaderProps) {
  const settingsDrawerRef = useRef<HTMLDialogElement>(null);
  const resetProgressRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <header className="flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open settings"
            aria-haspopup="dialog"
            aria-controls="settings-drawer"
            onClick={() => settingsDrawerRef.current?.showModal()}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-stone-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="size-6"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-sm font-semibold tracking-[0.3em]">
              DECKORA
            </span>
            <span className="max-w-[45vw] truncate text-xs text-stone-400 sm:max-w-none">
              {nickname}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
            <SpectralGifts
              uid={uid}
              nickname={nickname}
              counts={collection}
              onSend={onSendGift}
              onClaim={onClaimGift}
            />
            <Collection
              counts={collection}
              onExchange={onExchange}
              exchangeMessage={exchangeMessage}
            />
          </div>
          <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-3">
            <span className="flex min-h-11 items-center rounded-full border border-amber-200/20 bg-amber-200/5 px-4 text-sm text-amber-200">
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
              onClick={onOpenShop}
            >
              Shop
            </Button>
          </div>
        </div>
      </header>
      <dialog
        ref={settingsDrawerRef}
        id="settings-drawer"
        aria-labelledby="settings-heading"
        className="settings-drawer fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[min(20rem,85vw)] overscroll-contain overflow-y-auto border-r border-white/10 bg-surface p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onClick={closeDialogOnBackdropClick}
      >
        <div className="flex min-h-full flex-col pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <h2 id="settings-heading" className="font-serif text-2xl">
              Settings
            </h2>
          </div>
          <div className="flex flex-col gap-3 p-5 [&>button]:w-full [&>label]:w-full [&>label]:justify-between">
            <ProfileDialog
              email={email}
              nickname={nickname}
              saving={saving}
              error={accountError}
              onSave={onSaveNickname}
              onSignOut={onSignOut}
            />
            <SoundToggle />
            <ResetProgress
              onResetButtonClick={() => {
                settingsDrawerRef.current?.close();
                resetProgressRef.current?.showModal();
              }}
            />
            <ThemeSelector />
          </div>
          <footer className="mt-auto border-t border-white/10 px-5 py-4 text-xs text-stone-500">
            Deckora v{__APP_VERSION__}
          </footer>
        </div>
      </dialog>
      <dialog
        ref={resetProgressRef}
        id="reset-progress-dialog"
        aria-labelledby="reset-progress-heading"
        className="fixed inset-0 m-auto h-fit max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overscroll-contain overflow-y-auto rounded-2xl border border-white/10 bg-surface p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onClick={closeDialogOnBackdropClick}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-surface px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
          <h2
            id="reset-progress-heading"
            className="font-serif text-2xl sm:text-3xl"
          >
            Reset progress
          </h2>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <p className="text-sm text-stone-300">
            Are you sure you want to reset your progress? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              aria-label="Yes"
              className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
              onClick={() => {
                onResetProgress();
                resetProgressRef.current?.close();
              }}
            >
              Yes
            </Button>
            <Button
              variant="secondary"
              aria-label="No"
              className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
              onClick={() => resetProgressRef.current?.close()}
            >
              No
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

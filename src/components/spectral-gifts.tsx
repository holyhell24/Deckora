import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { CollectionCounts } from '../types/collection';
import { CARDS } from '../constants/cards';
import { closeDialogOnBackdropClick } from '../utils/dialog';
import { playRevealSound, playSound } from '../utils/sounds';
import {
  watchReceivedSpectralGifts,
  type SpectralGift,
} from '../utils/spectral-gifts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';

const RECENT_RECIPIENTS_KEY = 'deckora.spectral-gift-recipients.v1';
const NICKNAME_PATTERN = /^[A-Za-z0-9]{3,15}$/;
const MAX_RECENT_RECIPIENTS = 10;

function loadRecentRecipients() {
  try {
    const savedRecipients = localStorage.getItem(RECENT_RECIPIENTS_KEY);
    if (!savedRecipients) {
      return { nicknames: [] as string[], message: '' };
    }

    const parsedRecipients: unknown = JSON.parse(savedRecipients);
    if (!Array.isArray(parsedRecipients)) {
      return {
        nicknames: [],
        message: 'Saved nickname suggestions could not be loaded.',
      };
    }

    return {
      nicknames: parsedRecipients
        .filter(
          (value): value is string =>
            typeof value === 'string' && NICKNAME_PATTERN.test(value),
        )
        .slice(0, MAX_RECENT_RECIPIENTS),
      message: '',
    };
  } catch {
    return {
      nicknames: [] as string[],
      message:
        'Saved nickname suggestions could not be loaded from this browser.',
    };
  }
}

function getGiftError(error: unknown, operation: 'inbox' | 'send' | 'claim') {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : undefined;

  if (code === 'permission-denied') {
    if (operation === 'send') {
      return 'Firestore denied the gift transfer. The active rules must allow your game save update and gift creation.';
    }
    if (operation === 'claim') {
      return 'Firestore denied the gift claim. The active rules must allow your game save update and gift deletion.';
    }
    return 'Firestore denied access to your gift inbox. Check the active rules for recipient gift reads.';
  }
  if (error instanceof Error) {
    return error.message.replace(/^FirebaseError:\s*/, '');
  }
  return 'Could not complete the gift action. Please try again.';
}

export function SpectralGifts({
  uid,
  nickname,
  counts,
  onSend,
  onClaim,
}: {
  uid: string;
  nickname: string;
  counts: CollectionCounts;
  onSend: (
    recipientNickname: string,
    cardId: string,
    expectedOwnedCount: number,
  ) => Promise<void>;
  onClaim: (giftId: string) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [gifts, setGifts] = useState<SpectralGift[]>([]);
  const [inboxError, setInboxError] = useState('');
  const [inboxLoading, setInboxLoading] = useState(true);
  const [recipientNickname, setRecipientNickname] = useState('');
  const [recipientHistory, setRecipientHistory] =
    useState(loadRecentRecipients);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [actionError, setActionError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [claimingGiftId, setClaimingGiftId] = useState('');
  const ownedCards = useMemo(
    () => CARDS.filter((card) => (counts[card.id] ?? 0) > 0),
    [counts],
  );
  const selectedCard =
    ownedCards.find((card) => card.id === selectedCardId) ?? ownedCards[0];

  useEffect(() => {
    let hasInitialServerSnapshot = false;
    return watchReceivedSpectralGifts(
      uid,
      CARDS.map((card) => card.id),
      (receivedGifts, snapshot) => {
        if (!snapshot.isFromCache) {
          if (hasInitialServerSnapshot) {
            const newGift = receivedGifts.find((gift) =>
              snapshot.addedGiftIds.includes(gift.id),
            );
            const card = CARDS.find((item) => item.id === newGift?.cardId);
            if (card) {
              playRevealSound(card.rarity);
            }
          } else {
            hasInitialServerSnapshot = true;
          }
        }
        setGifts(receivedGifts);
        setInboxError('');
        setInboxLoading(false);
      },
      (error) => {
        setInboxError(getGiftError(error, 'inbox'));
        setInboxLoading(false);
      },
    );
  }, [uid]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCard) {
      setActionError('Choose a card you own.');
      return;
    }

    setSending(true);
    setActionError('');
    setStatusMessage('');
    try {
      await onSend(
        recipientNickname,
        selectedCard.id,
        counts[selectedCard.id] ?? 0,
      );
      const sentRecipient = recipientNickname.trim();
      const nextRecentRecipients = [
        sentRecipient,
        ...recipientHistory.nicknames.filter(
          (recentRecipient) =>
            recentRecipient.toLowerCase() !== sentRecipient.toLowerCase(),
        ),
      ].slice(0, MAX_RECENT_RECIPIENTS);
      let recipientHistoryMessage = '';
      try {
        localStorage.setItem(
          RECENT_RECIPIENTS_KEY,
          JSON.stringify(nextRecentRecipients),
        );
      } catch {
        recipientHistoryMessage =
          'This recipient was not saved to nickname suggestions on this device.';
      }
      setRecipientHistory({
        nicknames: nextRecentRecipients,
        message: recipientHistoryMessage,
      });
      playSound('exchange');
      setStatusMessage(`${selectedCard.name} was sent to ${sentRecipient}.`);
      setRecipientNickname('');
    } catch (error) {
      setActionError(getGiftError(error, 'send'));
    } finally {
      setSending(false);
    }
  }

  async function handleClaim(gift: SpectralGift) {
    setClaimingGiftId(gift.id);
    setActionError('');
    setStatusMessage('');
    try {
      await onClaim(gift.id);
      const card = CARDS.find((item) => item.id === gift.cardId);
      if (card) {
        playRevealSound(card.rarity);
      }
      setStatusMessage(
        `${card?.name ?? 'The card'} was added to your collection.`,
      );
    } catch (error) {
      setActionError(getGiftError(error, 'claim'));
    } finally {
      setClaimingGiftId('');
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="md"
        className="h-11 cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10 sm:h-10"
        aria-haspopup="dialog"
        aria-controls="spectral-gift-dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        Spectral gift{gifts.length > 0 ? ` (${gifts.length})` : ''}
      </Button>
      <dialog
        ref={dialogRef}
        id="spectral-gift-dialog"
        aria-labelledby="spectral-gift-heading"
        className="fixed inset-0 m-auto h-dvh max-h-none w-full max-w-4xl overscroll-contain overflow-y-auto rounded-none border border-white/10 bg-surface p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:rounded-2xl"
        onClick={closeDialogOnBackdropClick}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-surface px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
          <div>
            <h2
              id="spectral-gift-heading"
              className="font-serif text-2xl sm:text-3xl"
            >
              Spectral gift
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              Send one of your collected cards to a friend.
            </p>
          </div>
          <Button
            size="sm"
            aria-label="Close spectral gifts"
            className="cursor-pointer bg-white/5 hover:bg-white/10"
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </Button>
        </div>

        <div className="space-y-8 px-4 py-6 sm:px-6">
          <form className="space-y-4" onSubmit={handleSend}>
            <h3 className="font-medium text-amber-100">Send a card</h3>
            <div className="space-y-2">
              <label
                htmlFor="gift-recipient-nickname"
                className="block text-sm text-stone-300"
              >
                Friend&apos;s nickname
              </label>
              <Input
                id="gift-recipient-nickname"
                name="recipientNickname"
                type="text"
                autoComplete="off"
                minLength={3}
                maxLength={15}
                pattern="[A-Za-z0-9]{3,15}"
                list="gift-recipient-suggestions"
                required
                value={recipientNickname}
                onChange={(event) => setRecipientNickname(event.target.value)}
                placeholder="Enter their nickname"
              />
              <datalist id="gift-recipient-suggestions">
                {recipientHistory.nicknames.map((recentRecipient) => (
                  <option
                    key={recentRecipient.toLowerCase()}
                    value={recentRecipient}
                  />
                ))}
              </datalist>
              {recipientHistory.message && (
                <p role="status" className="text-xs text-stone-400">
                  {recipientHistory.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="gift-card"
                className="block text-sm text-stone-300"
              >
                Card to send
              </label>
              <Select
                id="gift-card"
                value={selectedCard?.id ?? ''}
                disabled={ownedCards.length === 0 || sending}
                onChange={(event) => setSelectedCardId(event.target.value)}
                required
              >
                {ownedCards.length === 0 ? (
                  <option value="">No cards available to send</option>
                ) : (
                  ownedCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name} · {card.rarity} · {counts[card.id]} owned
                    </option>
                  ))
                )}
              </Select>
            </div>
            {selectedCard && (
              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <img
                  src={selectedCard.image}
                  alt={selectedCard.name}
                  width={64}
                  height={96}
                  className="w-16 rounded-lg"
                />
                <div>
                  <p className="font-medium">{selectedCard.name}</p>
                  <p className="text-sm text-stone-400">
                    {selectedCard.rarity} · {counts[selectedCard.id]} owned
                  </p>
                </div>
              </div>
            )}
            {actionError && (
              <p role="alert" className="text-sm text-rose-300">
                {actionError}
              </p>
            )}
            {statusMessage && (
              <p role="status" className="text-sm text-amber-200">
                {statusMessage}
              </p>
            )}
            <Button
              type="submit"
              variant="secondary"
              disabled={sending || ownedCards.length === 0}
              className="w-full cursor-pointer"
            >
              {sending ? 'Sending…' : 'Send gift'}
            </Button>
          </form>

          <section
            aria-labelledby="received-gifts-heading"
            className="space-y-4"
          >
            <div>
              <h3
                id="received-gifts-heading"
                className="font-medium text-amber-100"
              >
                Gifts for {nickname}
              </h3>
              <p className="mt-1 text-sm text-stone-400">
                Claim a gift to add the card to your collection.
              </p>
            </div>
            {inboxError && (
              <p role="alert" className="text-sm text-rose-300">
                {inboxError}
              </p>
            )}
            {inboxLoading ? (
              <p role="status" className="text-sm text-stone-500">
                Loading gifts…
              </p>
            ) : inboxError ? null : gifts.length === 0 ? (
              <p className="text-sm text-stone-500">
                No gifts waiting for you.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {gifts.map((gift) => {
                  const card = CARDS.find((item) => item.id === gift.cardId);
                  if (!card) {
                    return null;
                  }
                  return (
                    <li
                      key={gift.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <img
                        src={card.image}
                        alt={card.name}
                        width={64}
                        height={96}
                        className="w-16 rounded-lg"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{card.name}</p>
                        <p className="text-xs text-stone-400">
                          {card.rarity} · from {gift.senderNickname}
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={claimingGiftId !== ''}
                          className="mt-3 w-full cursor-pointer"
                          onClick={() => void handleClaim(gift)}
                        >
                          {claimingGiftId === gift.id
                            ? 'Claiming…'
                            : 'Add to collection'}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </dialog>
    </>
  );
}

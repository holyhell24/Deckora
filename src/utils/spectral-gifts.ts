import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
} from '@firebase/firestore';
import type { SavedGame } from '../types/save';
import { db } from '../firebase';
import { parseSavedGame } from './game-storage';

const NICKNAME_PATTERN = /^[A-Za-z0-9]{3,15}$/;

export type SpectralGift = {
  id: string;
  senderUid: string;
  senderNickname: string;
  recipientUid: string;
  recipientNickname: string;
  cardId: string;
};

export type ReceivedSpectralGiftSnapshot = {
  isFromCache: boolean;
  addedGiftIds: readonly string[];
};

function parseSpectralGift(
  id: string,
  data: DocumentData,
  validCardIds: readonly string[],
): SpectralGift {
  if (
    typeof data.senderUid !== 'string' ||
    typeof data.senderNickname !== 'string' ||
    !NICKNAME_PATTERN.test(data.senderNickname) ||
    typeof data.recipientUid !== 'string' ||
    typeof data.recipientNickname !== 'string' ||
    !NICKNAME_PATTERN.test(data.recipientNickname) ||
    typeof data.cardId !== 'string' ||
    !validCardIds.includes(data.cardId)
  ) {
    throw new Error('A received gift is invalid and could not be displayed.');
  }

  return {
    id,
    senderUid: data.senderUid,
    senderNickname: data.senderNickname,
    recipientUid: data.recipientUid,
    recipientNickname: data.recipientNickname,
    cardId: data.cardId,
  };
}

export function watchReceivedSpectralGifts(
  uid: string,
  validCardIds: readonly string[],
  onGifts: (
    gifts: SpectralGift[],
    snapshot: ReceivedSpectralGiftSnapshot,
  ) => void,
  onError: (error: unknown) => void,
) {
  const inboxQuery = query(
    collection(db, 'spectralGifts'),
    where('recipientUid', '==', uid),
  );

  return onSnapshot(
    inboxQuery,
    (snapshot) => {
      try {
        onGifts(
          snapshot.docs.map((gift) =>
            parseSpectralGift(gift.id, gift.data(), validCardIds),
          ),
          {
            isFromCache: snapshot.metadata.fromCache,
            addedGiftIds: snapshot
              .docChanges()
              .filter((change) => change.type === 'added')
              .map((change) => change.doc.id),
          },
        );
      } catch (error) {
        onError(error);
      }
    },
    onError,
  );
}

export function sendSpectralGift({
  senderUid,
  senderNickname,
  recipientNickname,
  cardId,
  expectedOwnedCount,
  validCardIds,
}: {
  senderUid: string;
  senderNickname: string;
  recipientNickname: string;
  cardId: string;
  expectedOwnedCount: number;
  validCardIds: readonly string[];
}) {
  const normalizedRecipientNickname = recipientNickname.trim();
  if (!NICKNAME_PATTERN.test(normalizedRecipientNickname)) {
    throw new Error('Use a nickname with 3–15 letters or numbers.');
  }
  if (!validCardIds.includes(cardId)) {
    throw new Error('Select a valid card to send.');
  }

  const senderSaveRef = doc(db, 'gameSaves', senderUid);
  const recipientClaimRef = doc(
    db,
    'nicknameClaims',
    normalizedRecipientNickname.toLowerCase(),
  );
  const giftRef = doc(collection(db, 'spectralGifts'));

  return runTransaction(db, async (transaction) => {
    const [senderSaveSnapshot, recipientClaimSnapshot] = await Promise.all([
      transaction.get(senderSaveRef),
      transaction.get(recipientClaimRef),
    ]);

    if (!recipientClaimSnapshot.exists()) {
      throw new Error('No user is registered with that nickname.');
    }

    const recipientUid = recipientClaimSnapshot.data().uid;
    if (typeof recipientUid !== 'string') {
      throw new Error('That nickname is not linked to a valid account.');
    }
    if (recipientUid === senderUid) {
      throw new Error('You cannot send a gift to yourself.');
    }

    if (!senderSaveSnapshot.exists()) {
      throw new Error('Your game save is still syncing. Please try again.');
    }
    const senderSave = parseSavedGame(
      JSON.stringify(senderSaveSnapshot.data()),
      validCardIds,
    );
    if (!senderSave) {
      throw new Error('Your game save is invalid and the gift was not sent.');
    }

    const ownedCount = senderSave.collection[cardId] ?? 0;
    if (ownedCount !== expectedOwnedCount) {
      throw new Error(
        'Your collection changed while sending the gift. Please try again.',
      );
    }
    if (ownedCount < 1) {
      throw new Error('You no longer own that card.');
    }

    const nextCollection = {
      ...senderSave.collection,
      [cardId]: ownedCount - 1,
    };
    transaction.update(senderSaveRef, { collection: nextCollection });
    transaction.set(giftRef, {
      senderUid,
      senderNickname,
      recipientUid,
      recipientNickname: normalizedRecipientNickname,
      cardId,
      createdAt: serverTimestamp(),
    });

    return ownedCount - 1;
  });
}

export function claimSpectralGift({
  giftId,
  recipientUid,
  baseSave,
  validCardIds,
}: {
  giftId: string;
  recipientUid: string;
  baseSave: SavedGame;
  validCardIds: readonly string[];
}) {
  const giftRef = doc(db, 'spectralGifts', giftId);
  const recipientSaveRef = doc(db, 'gameSaves', recipientUid);

  return runTransaction(db, async (transaction) => {
    const [giftSnapshot, recipientSaveSnapshot] = await Promise.all([
      transaction.get(giftRef),
      transaction.get(recipientSaveRef),
    ]);
    if (!giftSnapshot.exists()) {
      throw new Error('This gift has already been claimed.');
    }

    const gift = parseSpectralGift(
      giftSnapshot.id,
      giftSnapshot.data(),
      validCardIds,
    );
    if (gift.recipientUid !== recipientUid) {
      throw new Error('This gift belongs to another account.');
    }

    const recipientSave = recipientSaveSnapshot.exists()
      ? parseSavedGame(
          JSON.stringify(recipientSaveSnapshot.data()),
          validCardIds,
        )
      : baseSave;
    if (!recipientSave) {
      throw new Error(
        'Your game save is invalid and the gift was not claimed.',
      );
    }

    const collectionCount = (recipientSave.collection[gift.cardId] ?? 0) + 1;
    const nextCollection = {
      ...recipientSave.collection,
      [gift.cardId]: collectionCount,
    };

    if (recipientSaveSnapshot.exists()) {
      transaction.update(recipientSaveRef, { collection: nextCollection });
    } else {
      transaction.set(recipientSaveRef, {
        ...recipientSave,
        collection: nextCollection,
      });
    }
    transaction.delete(giftRef);

    return { cardId: gift.cardId, collectionCount };
  });
}

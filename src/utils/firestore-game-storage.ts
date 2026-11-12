import { doc, runTransaction, setDoc } from '@firebase/firestore';
import type { SavedGame } from '../types/save';
import { db } from '../firebase';
import { parseSavedGame } from './game-storage';

function gameSaveRef(uid: string) {
  return doc(db, 'gameSaves', uid);
}

export function loadOrMigrateGame(
  uid: string,
  validCardIds: readonly string[],
  legacySave: SavedGame | null,
): Promise<SavedGame | null> {
  const reference = gameSaveRef(uid);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists()) {
      const savedGame = parseSavedGame(
        JSON.stringify(snapshot.data()),
        validCardIds,
      );
      if (!savedGame) {
        throw new Error(
          'Your Firestore game save is invalid and could not be loaded.',
        );
      }
      return savedGame;
    }

    if (legacySave) {
      transaction.set(reference, legacySave);
    }
    return legacySave;
  });
}

export function saveGameToFirestore(uid: string, save: SavedGame) {
  return setDoc(gameSaveRef(uid), save);
}

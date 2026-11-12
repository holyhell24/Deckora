import { onAuthStateChanged, signInAnonymously } from '@firebase/auth';
import { collection, doc, getDoc, runTransaction } from '@firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { auth, db } from '../firebase';

type NicknameStatus = 'loading' | 'required' | 'ready' | 'error';

type NicknameState = {
  status: NicknameStatus;
  nickname?: string;
  error?: string;
};

type NicknameClaimResult =
  { status: 'taken' } | { status: 'saved'; nickname: string };

const NICKNAME_PATTERN = /^[A-Za-z0-9]{1,15}$/;

let anonymousSignIn: ReturnType<typeof signInAnonymously> | null = null;

function getProfileLoadError(error: unknown) {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : undefined;

  if (code === 'permission-denied') {
    return 'Firestore denied access. Deploy firestore.rules to the deckora-c8b26 project.';
  }

  if (code === 'not-found' || code === 'failed-precondition') {
    return 'The Firestore database is unavailable. Create the default Firestore database in the deckora-c8b26 project.';
  }

  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'Firestore is unreachable. Check your internet connection and try again.';
  }

  const details = error instanceof Error ? ` ${error.message}` : '';
  return `Could not load your profile.${details}`;
}

async function readNickname(uid: string): Promise<string | null> {
  const profile = await getDoc(doc(db, 'users', uid));
  if (!profile.exists()) {
    return null;
  }

  const nickname = profile.data().nickname;
  if (typeof nickname !== 'string' || !NICKNAME_PATTERN.test(nickname)) {
    throw new Error('Your saved nickname is invalid. Please contact support.');
  }

  return nickname;
}

function ensureAnonymousUser() {
  if (auth.currentUser) {
    return Promise.resolve();
  }

  if (!anonymousSignIn) {
    anonymousSignIn = signInAnonymously(auth).finally(() => {
      anonymousSignIn = null;
    });
  }

  return anonymousSignIn.then(() => undefined);
}

export function useNickname() {
  const [user, setUser] = useState<NicknameState>({ status: 'loading' });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile(uid: string) {
      try {
        const nickname = await readNickname(uid);
        if (!active) {
          return;
        }

        if (nickname !== null) {
          setUser({ status: 'ready', nickname });
        } else {
          setUser({ status: 'required' });
        }
      } catch (error) {
        if (active) {
          setUser({
            status: 'error',
            error: getProfileLoadError(error),
          });
        }
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        void loadProfile(firebaseUser.uid);
      } else {
        void ensureAnonymousUser().catch(() => {
          if (active) {
            setUser({
              status: 'error',
              error:
                'Could not sign in anonymously. Enable Anonymous sign-in in Firebase Authentication.',
            });
          }
        });
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const retry = useCallback(async () => {
    setUser({ status: 'loading' });

    if (auth.currentUser) {
      try {
        const nickname = await readNickname(auth.currentUser.uid);
        setUser(
          nickname === null
            ? { status: 'required' }
            : { status: 'ready', nickname },
        );
      } catch (error) {
        setUser({
          status: 'error',
          error: getProfileLoadError(error),
        });
      }

      return;
    }

    try {
      await ensureAnonymousUser();
    } catch {
      setUser({
        status: 'error',
        error:
          'Could not sign in anonymously. Enable Anonymous sign-in in Firebase Authentication.',
      });
    }
  }, []);

  const claimNickname = useCallback(async (input: string) => {
    setSubmitError('');
    if (!NICKNAME_PATTERN.test(input)) {
      setSubmitError('Use 1–15 letters or numbers only.');
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setSubmitError('Your sign-in session is not ready. Please try again.');
      return;
    }

    const nickname = input.toLowerCase();
    const userRef = doc(db, 'users', firebaseUser.uid);
    const claimRef = doc(collection(db, 'nicknameClaims'), nickname);
    setSaving(true);

    try {
      const result = await runTransaction<NicknameClaimResult>(
        db,
        async (transaction) => {
          const profile = await transaction.get(userRef);
          if (profile.exists()) {
            const existingNickname = profile.data().nickname;
            if (
              typeof existingNickname !== 'string' ||
              !NICKNAME_PATTERN.test(existingNickname)
            ) {
              throw new Error('Your saved nickname is invalid.');
            }

            return { status: 'saved', nickname: existingNickname };
          }

          const claim = await transaction.get(claimRef);
          if (claim.exists()) {
            return { status: 'taken' };
          }

          transaction.set(claimRef, { uid: firebaseUser.uid });
          transaction.set(userRef, { nickname });
          return { status: 'saved', nickname };
        },
      );

      if (result.status === 'taken') {
        setSubmitError('That nickname is already taken. Try another one.');
      } else {
        setUser({ status: 'ready', nickname: result.nickname });
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? `Could not save your nickname: ${error.message}`
          : 'Could not save your nickname. Check your connection and Firestore rules.',
      );
    } finally {
      setSaving(false);
    }
  }, []);

  return { user, saving, submitError, claimNickname, retry };
}

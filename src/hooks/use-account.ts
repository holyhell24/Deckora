import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from '@firebase/auth';
import { doc, getDoc, runTransaction } from '@firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { auth, db } from '../firebase';

type AccountProfile = {
  uid: string;
  email: string;
  nickname: string;
};

type AccountState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'profileRequired'; email: string }
  | { status: 'error'; error: string }
  | { status: 'ready'; profile: AccountProfile };

type RegisterAccountRequest = {
  email: string;
  password: string;
  nickname: string;
};

const NICKNAME_PATTERN = /^[A-Za-z0-9]{3,15}$/;

function getErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : undefined;

  if (code === 'auth/email-already-in-use') {
    return 'An account already uses this email address.';
  }

  if (code === 'auth/invalid-credential') {
    return 'Email or password is incorrect.';
  }

  if (code === 'auth/invalid-email') {
    return 'Enter a valid email address.';
  }

  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }

  if (code === 'permission-denied') {
    return 'Firestore denied profile access. Deploy the updated firestore.rules.';
  }

  if (error instanceof Error) {
    return error.message.replace(/^FirebaseError:\s*/, '');
  }

  return 'Something went wrong. Please try again.';
}

async function loadProfile(user: User): Promise<AccountProfile | null> {
  if (!user.email) {
    throw new Error('This account has no email address. Please sign in again.');
  }

  const profile = await getDoc(doc(db, 'users', user.uid));
  if (!profile.exists()) {
    return null;
  }

  const nickname = profile.data().nickname;
  if (typeof nickname !== 'string' || !NICKNAME_PATTERN.test(nickname)) {
    throw new Error('Your account profile is invalid. Please contact support.');
  }

  return { uid: user.uid, email: user.email, nickname };
}

async function saveInitialNickname(user: User, nickname: string) {
  if (!user.email) {
    throw new Error('This account has no email address. Please sign in again.');
  }

  if (!NICKNAME_PATTERN.test(nickname)) {
    throw new Error('Use a nickname with 3–15 letters or numbers.');
  }

  const userRef = doc(db, 'users', user.uid);
  const nicknameKey = nickname.toLowerCase();
  const nicknameRef = doc(db, 'nicknameClaims', nicknameKey);

  const savedNickname = await runTransaction(db, async (transaction) => {
    const [profile, claim] = await Promise.all([
      transaction.get(userRef),
      transaction.get(nicknameRef),
    ]);

    if (profile.exists()) {
      const currentNickname = profile.data().nickname;
      if (
        typeof currentNickname === 'string' &&
        NICKNAME_PATTERN.test(currentNickname)
      ) {
        return currentNickname;
      }

      throw new Error('Your saved nickname is invalid.');
    }

    if (claim.exists()) {
      throw new Error('That nickname is already taken. Try another one.');
    }

    transaction.set(userRef, { nickname });
    transaction.set(nicknameRef, { uid: user.uid });
    return nickname;
  });

  return { uid: user.uid, email: user.email, nickname: savedNickname };
}

export function useAccount() {
  const [account, setAccount] = useState<AccountState>({ status: 'loading' });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const registrationInProgress = useRef(false);
  const authListenerGeneration = useRef(0);

  useEffect(() => {
    const generation = authListenerGeneration.current + 1;
    authListenerGeneration.current = generation;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        if (authListenerGeneration.current === generation) {
          setAccount({ status: 'signedOut' });
        }
        return;
      }

      if (firebaseUser.isAnonymous || !firebaseUser.email) {
        void signOut(auth).catch((error: unknown) => {
          if (authListenerGeneration.current === generation) {
            setAccount({ status: 'error', error: getErrorMessage(error) });
          }
        });
        return;
      }

      const email = firebaseUser.email;
      if (registrationInProgress.current) {
        return;
      }

      void loadProfile(firebaseUser)
        .then((profile) => {
          if (
            authListenerGeneration.current !== generation ||
            auth.currentUser?.uid !== firebaseUser.uid
          ) {
            return;
          }

          setAccount(
            profile
              ? { status: 'ready', profile }
              : { status: 'profileRequired', email },
          );
        })
        .catch((error: unknown) => {
          if (
            authListenerGeneration.current === generation &&
            auth.currentUser?.uid === firebaseUser.uid
          ) {
            setAccount({ status: 'error', error: getErrorMessage(error) });
          }
        });
    });

    return () => {
      authListenerGeneration.current += 1;
      unsubscribe();
    };
  }, []);

  const register = useCallback(
    async ({ email, password, nickname }: RegisterAccountRequest) => {
      setSaving(true);
      setActionError('');
      registrationInProgress.current = true;

      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        const profile = await saveInitialNickname(credential.user, nickname);
        setAccount({ status: 'ready', profile });
      } catch (error) {
        const currentUser = auth.currentUser;
        if (currentUser?.email) {
          setAccount({ status: 'profileRequired', email: currentUser.email });
        }
        setActionError(getErrorMessage(error));
      } finally {
        registrationInProgress.current = false;
        setSaving(false);
      }
    },
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    setSaving(true);
    setActionError('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, []);

  const completeProfile = useCallback(async (nickname: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setActionError('Your sign-in session ended. Please sign in again.');
      return;
    }

    setSaving(true);
    setActionError('');

    try {
      const profile = await saveInitialNickname(currentUser, nickname);
      setAccount({ status: 'ready', profile });
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, []);

  const changeNickname = useCallback(
    async (nickname: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser || !NICKNAME_PATTERN.test(nickname)) {
        setActionError('Use a nickname with 3–15 letters or numbers.');
        return false;
      }

      const currentAccount = account;
      if (currentAccount.status !== 'ready') {
        setActionError('Your profile is not ready. Please try again.');
        return false;
      }

      setSaving(true);
      setActionError('');

      const userRef = doc(db, 'users', currentUser.uid);
      const nextKey = nickname.toLowerCase();
      const nextClaimRef = doc(db, 'nicknameClaims', nextKey);

      try {
        await runTransaction(db, async (transaction) => {
          const [profile, nextClaim] = await Promise.all([
            transaction.get(userRef),
            transaction.get(nextClaimRef),
          ]);

          if (!profile.exists()) {
            throw new Error('Your account profile could not be found.');
          }

          const currentNickname = profile.data().nickname;
          if (
            typeof currentNickname !== 'string' ||
            !NICKNAME_PATTERN.test(currentNickname)
          ) {
            throw new Error('Your saved nickname is invalid.');
          }

          const actualCurrentKey = currentNickname.toLowerCase();
          const actualCurrentClaimRef = doc(
            db,
            'nicknameClaims',
            actualCurrentKey,
          );
          const currentClaim =
            actualCurrentKey === nextKey
              ? nextClaim
              : await transaction.get(actualCurrentClaimRef);

          if (nextClaim.exists() && nextClaim.data().uid !== currentUser.uid) {
            throw new Error('That nickname is already taken. Try another one.');
          }

          if (
            !currentClaim.exists() ||
            currentClaim.data().uid !== currentUser.uid
          ) {
            throw new Error(
              'Your nickname claim is missing. Please contact support.',
            );
          }

          if (actualCurrentKey !== nextKey) {
            transaction.delete(actualCurrentClaimRef);
            transaction.set(nextClaimRef, { uid: currentUser.uid });
          }
          transaction.update(userRef, { nickname });
        });

        setAccount({
          status: 'ready',
          profile: { ...currentAccount.profile, nickname },
        });
        return true;
      } catch (error) {
        setActionError(getErrorMessage(error));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [account],
  );

  const retry = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setAccount({ status: 'signedOut' });
      return;
    }

    setAccount({ status: 'loading' });
    try {
      const profile = await loadProfile(currentUser);
      if (auth.currentUser?.uid !== currentUser.uid) {
        return;
      }

      setAccount(
        profile
          ? { status: 'ready', profile }
          : { status: 'profileRequired', email: currentUser.email ?? '' },
      );
    } catch (error) {
      if (auth.currentUser?.uid === currentUser.uid) {
        setAccount({ status: 'error', error: getErrorMessage(error) });
      }
    }
  }, []);

  const signOutAccount = useCallback(async () => {
    setActionError('');
    try {
      await signOut(auth);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }, []);

  return {
    account,
    saving,
    actionError,
    register,
    login,
    completeProfile,
    changeNickname,
    retry,
    signOutAccount,
  };
}

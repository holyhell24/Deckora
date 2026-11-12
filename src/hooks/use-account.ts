import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
} from '@firebase/auth';
import { httpsCallable } from '@firebase/functions';
import { doc, getDoc } from '@firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { auth, db, functions } from '../firebase';

type AccountProfile = {
  uid: string;
  username: string;
  nickname: string;
};

type AccountState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'error'; error: string }
  | { status: 'ready'; profile: AccountProfile };

type RegisterAccountRequest = {
  username: string;
  password: string;
  nickname: string;
};

type LoginRequest = {
  username: string;
  password: string;
};

type TokenResponse = { token: string };
type ChangeNicknameRequest = { nickname: string };
type ChangeNicknameResponse = { nickname: string };

const USERNAME_PATTERN = /^[A-Za-z0-9]{3,15}$/;
const NICKNAME_PATTERN = /^[A-Za-z0-9]{3,15}$/;

const registerAccountCall = httpsCallable<
  RegisterAccountRequest,
  TokenResponse
>(functions, 'registerAccount');
const loginCall = httpsCallable<LoginRequest, TokenResponse>(
  functions,
  'loginAccount',
);
const changeNicknameCall = httpsCallable<
  ChangeNicknameRequest,
  ChangeNicknameResponse
>(functions, 'changeNickname');

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.replace(/^FirebaseError:\s*/, '');
  }

  return 'Something went wrong. Please try again.';
}

async function loadProfile(uid: string): Promise<AccountProfile> {
  const profile = await getDoc(doc(db, 'users', uid));
  if (!profile.exists()) {
    throw new Error('Your account profile could not be found.');
  }

  const data = profile.data();
  if (
    typeof data.username !== 'string' ||
    !USERNAME_PATTERN.test(data.username) ||
    typeof data.nickname !== 'string' ||
    !NICKNAME_PATTERN.test(data.nickname)
  ) {
    throw new Error('Your account profile is invalid. Please contact support.');
  }

  return { uid, username: data.username, nickname: data.nickname };
}

export function useAccount() {
  const [account, setAccount] = useState<AccountState>({ status: 'loading' });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        if (active) {
          setAccount({ status: 'signedOut' });
        }
        return;
      }

      if (firebaseUser.isAnonymous) {
        void signOut(auth).catch((error: unknown) => {
          if (active) {
            setAccount({ status: 'error', error: getErrorMessage(error) });
          }
        });
        return;
      }

      void loadProfile(firebaseUser.uid)
        .then((profile) => {
          if (active && auth.currentUser?.uid === firebaseUser.uid) {
            setAccount({ status: 'ready', profile });
          }
        })
        .catch((error: unknown) => {
          if (active && auth.currentUser?.uid === firebaseUser.uid) {
            setAccount({ status: 'error', error: getErrorMessage(error) });
          }
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const runAuthAction = useCallback(async (getToken: () => Promise<string>) => {
    setSaving(true);
    setActionError('');

    try {
      const token = await getToken();
      await signInWithCustomToken(auth, token);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, []);

  const register = useCallback(
    (request: RegisterAccountRequest) => {
      void runAuthAction(async () => {
        const response = await registerAccountCall(request);
        return response.data.token;
      });
    },
    [runAuthAction],
  );

  const login = useCallback(
    (request: LoginRequest) => {
      void runAuthAction(async () => {
        const response = await loginCall(request);
        return response.data.token;
      });
    },
    [runAuthAction],
  );

  const changeNickname = useCallback(async (nickname: string) => {
    setSaving(true);
    setActionError('');

    try {
      const response = await changeNicknameCall({ nickname });
      setAccount((previous) =>
        previous.status === 'ready'
          ? {
              status: 'ready',
              profile: {
                ...previous.profile,
                nickname: response.data.nickname,
              },
            }
          : previous,
      );
      return true;
    } catch (error) {
      setActionError(getErrorMessage(error));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const retry = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setAccount({ status: 'signedOut' });
      return;
    }

    setAccount({ status: 'loading' });
    try {
      const profile = await loadProfile(currentUser.uid);
      if (auth.currentUser?.uid === currentUser.uid) {
        setAccount({ status: 'ready', profile });
      }
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
    changeNickname,
    retry,
    signOutAccount,
  };
}

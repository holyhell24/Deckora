import { useState, type FormEvent } from 'react';
import { Button } from './ui/button';

type AccountAccessProps = {
  status: 'loading' | 'signedOut' | 'error';
  error?: string;
  saving: boolean;
  actionError: string;
  onLogin: (username: string, password: string) => void;
  onRegister: (username: string, password: string, nickname: string) => void;
  onRetry: () => void;
};

type FormMode = 'login' | 'register';

export function AccountAccess({
  status,
  error,
  saving,
  actionError,
  onLogin,
  onRegister,
  onRetry,
}: AccountAccessProps) {
  const [mode, setMode] = useState<FormMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'login') {
      onLogin(username, password);
    } else {
      onRegister(username, password, nickname);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-page px-4 text-stone-100">
      <section
        aria-labelledby="account-heading"
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-6"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/60">
          Welcome to Deckora
        </p>
        <h1 id="account-heading" className="mt-2 font-serif text-3xl">
          {status === 'error'
            ? 'Could not load profile'
            : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
        </h1>

        {status === 'loading' && (
          <p role="status" className="mt-4 text-sm text-stone-400">
            Connecting to your account…
          </p>
        )}

        {status === 'error' && (
          <div className="mt-4 space-y-4">
            <p role="alert" className="text-sm text-amber-200">
              {error}
            </p>
            <Button
              variant="secondary"
              onClick={onRetry}
              className="w-full cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
            >
              Try again
            </Button>
          </div>
        )}

        {status === 'signedOut' && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {(['login', 'register'] as const).map((nextMode) => (
                <Button
                  key={nextMode}
                  variant="secondary"
                  aria-pressed={mode === nextMode}
                  onClick={() => {
                    setMode(nextMode);
                  }}
                  className={
                    mode === nextMode
                      ? 'cursor-pointer border-amber-200/30 bg-amber-200/10 text-amber-100 hover:bg-amber-200/15'
                      : 'cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10'
                  }
                >
                  {nextMode === 'login' ? 'Sign in' : 'Create account'}
                </Button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === 'register' && (
                <p className="text-sm text-stone-400">
                  Choose a 3–15 character nickname using letters and numbers
                </p>
              )}
              <label
                htmlFor="username"
                className="block text-sm text-stone-300"
              >
                Username
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  minLength={3}
                  maxLength={15}
                  pattern="[A-Za-z0-9]{3,15}"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base text-stone-100 focus-visible:outline-2 focus-visible:outline-amber-200"
                />
                <p className="text-xs text-stone-500">
                  Username to sign in with
                </p>
              </label>

              <label
                htmlFor="password"
                className="block text-sm text-stone-300"
              >
                Password
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={1}
                  maxLength={8}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base text-stone-100 focus-visible:outline-2 focus-visible:outline-amber-200"
                />
                <p className="text-xs text-stone-500">
                  I don't need your password. Just use 123
                </p>
              </label>

              {mode === 'register' && (
                <>
                  <label
                    htmlFor="nickname"
                    className="block text-sm text-stone-300"
                  >
                    Nickname
                    <input
                      id="nickname"
                      name="nickname"
                      type="text"
                      required
                      minLength={3}
                      maxLength={15}
                      pattern="[A-Za-z0-9]{3,15}"
                      autoComplete="nickname"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base text-stone-100 focus-visible:outline-2 focus-visible:outline-amber-200"
                    />
                  </label>
                </>
              )}

              {actionError && (
                <p role="alert" className="text-sm text-amber-200">
                  {actionError}
                </p>
              )}
              <Button
                variant="secondary"
                type="submit"
                disabled={saving}
                className="w-full cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
              >
                {saving
                  ? 'Please wait…'
                  : mode === 'login'
                    ? 'Sign in'
                    : 'Create account'}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

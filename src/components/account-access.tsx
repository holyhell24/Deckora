import { useState, type FormEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

type AccountAccessProps = {
  status: 'loading' | 'signedOut' | 'profileRequired' | 'error';
  email?: string;
  error?: string;
  saving: boolean;
  actionError: string;
  onLogin: (email: string, password: string) => void;
  onRegister: (email: string, password: string, nickname: string) => void;
  onCompleteProfile: (nickname: string) => void;
  onSignOut: () => void;
  onRetry: () => void;
};

type FormMode = 'login' | 'register';

export function AccountAccess({
  status,
  email: accountEmail,
  error,
  saving,
  actionError,
  onLogin,
  onRegister,
  onCompleteProfile,
  onSignOut,
  onRetry,
}: AccountAccessProps) {
  const [mode, setMode] = useState<FormMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'profileRequired') {
      onCompleteProfile(nickname);
    } else if (mode === 'login') {
      onLogin(email, password);
    } else {
      onRegister(email, password, nickname);
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
            : status === 'profileRequired'
              ? 'Choose a nickname'
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

        {status === 'profileRequired' && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <p className="text-sm text-stone-400">
              Signed in as {accountEmail}. Choose a 3–15 character nickname
              using letters and numbers.
            </p>
            <label htmlFor="nickname" className="block text-sm text-stone-300">
              Nickname
              <Input
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
                className="mt-1"
              />
            </label>
            {actionError && (
              <p role="alert" className="text-sm text-amber-200">
                {actionError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={onSignOut}
                className="flex-1 cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
              >
                Sign out
              </Button>
              <Button
                variant="secondary"
                type="submit"
                disabled={saving}
                className="flex-1 cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
              >
                {saving ? 'Saving…' : 'Save nickname'}
              </Button>
            </div>
          </form>
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
                  Choose a 3–15 character nickname using letters and numbers.
                  Nickname capitalization is preserved.
                </p>
              )}
              <label htmlFor="email" className="block text-sm text-stone-300">
                Email
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1"
                />
                {mode === 'register' && (
                  <p className="text-xs text-stone-500">
                    Email to sign in with. You can use a fake email if you want.
                  </p>
                )}
              </label>

              <label
                htmlFor="password"
                className="block text-sm text-stone-300"
              >
                Password
                <Input
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
                  className="mt-1"
                />
                {mode === 'register' && (
                  <p className="text-xs text-stone-500">
                    I don't need your password. Just use 123456
                  </p>
                )}
              </label>

              {mode === 'register' && (
                <label
                  htmlFor="nickname"
                  className="block text-sm text-stone-300"
                >
                  Nickname
                  <Input
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
                    className="mt-1"
                  />
                  {mode === 'register' && (
                    <p className="text-xs text-stone-500">Display name</p>
                  )}
                </label>
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

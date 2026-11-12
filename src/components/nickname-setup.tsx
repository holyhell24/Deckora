import { useState, type FormEvent } from 'react';
import { Button } from './ui/button';

type NicknameSetupProps = {
  status: 'loading' | 'required' | 'error';
  error?: string;
  saving: boolean;
  submitError: string;
  onSubmit: (nickname: string) => void;
  onRetry: () => void;
};

export function NicknameSetup({
  status,
  error,
  saving,
  submitError,
  onSubmit,
  onRetry,
}: NicknameSetupProps) {
  const [nickname, setNickname] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(nickname);
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-page px-4 text-stone-100">
      <section
        aria-labelledby="nickname-heading"
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-6"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/60">
          Welcome to Deckora
        </p>
        <h1 id="nickname-heading" className="mt-2 font-serif text-3xl">
          Choose a nickname
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
              variant="primary"
              onClick={onRetry}
              className="w-full cursor-pointer"
            >
              Try again
            </Button>
          </div>
        )}

        {status === 'required' && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-sm text-stone-400">
              Use 1–15 letters or numbers. You can change it later in your
              profile.
            </p>
            <label htmlFor="nickname" className="block text-sm text-stone-300">
              Nickname
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              required
              minLength={1}
              maxLength={15}
              pattern="[A-Za-z0-9]{1,15}"
              autoComplete="nickname"
              autoCapitalize="none"
              spellCheck={false}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base text-stone-100 focus-visible:outline-2 focus-visible:outline-amber-200"
            />
            {submitError && (
              <p role="alert" className="text-sm text-amber-200">
                {submitError}
              </p>
            )}
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              className="w-full cursor-pointer"
            >
              {saving ? 'Saving…' : 'Continue'}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

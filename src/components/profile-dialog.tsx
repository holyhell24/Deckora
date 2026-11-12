import { useRef, useState, type FormEvent } from 'react';
import { closeDialogOnBackdropClick } from '../utils/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

type ProfileDialogProps = {
  email: string;
  nickname: string;
  saving: boolean;
  error: string;
  onSave: (nickname: string) => Promise<boolean>;
  onSignOut: () => void;
};

export function ProfileDialog({
  email,
  nickname,
  saving,
  error,
  onSave,
  onSignOut,
}: ProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editedNickname, setEditedNickname] = useState(nickname);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onSave(editedNickname)) {
      dialogRef.current?.close();
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        aria-controls="profile-dialog"
        className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
        onClick={() => {
          setEditedNickname(nickname);
          dialogRef.current?.showModal();
        }}
      >
        Profile
      </Button>
      <dialog
        ref={dialogRef}
        id="profile-dialog"
        aria-labelledby="profile-heading"
        className="fixed inset-0 m-auto h-fit max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overscroll-contain overflow-y-auto rounded-2xl border border-white/10 bg-surface p-0 text-stone-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onClick={closeDialogOnBackdropClick}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-surface px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
          <div>
            <h2
              id="profile-heading"
              className="font-serif text-2xl sm:text-3xl"
            >
              Your profile
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              Signed in as <span className="text-stone-200">{email}</span>
            </p>
          </div>
          <Button
            size="sm"
            aria-label="Close profile"
            className="cursor-pointer bg-white/5 hover:bg-white/10"
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
          <label
            htmlFor="profile-nickname"
            className="block text-sm text-stone-300"
          >
            Nickname
            <Input
              id="profile-nickname"
              name="nickname"
              type="text"
              required
              minLength={3}
              maxLength={15}
              pattern="[A-Za-z0-9]{3,15}"
              autoComplete="nickname"
              autoCapitalize="none"
              spellCheck={false}
              value={editedNickname}
              onChange={(event) => setEditedNickname(event.target.value)}
              className="mt-1"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-amber-200">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              variant="secondary"
              className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
              onClick={() => {
                dialogRef.current?.close();
                onSignOut();
              }}
            >
              Sign out
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
                onClick={() => dialogRef.current?.close()}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                type="submit"
                disabled={saving}
                className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}

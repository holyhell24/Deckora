import { useRef, useState, type FormEvent } from 'react';
import { closeDialogOnBackdropClick } from '../utils/dialog';
import { Button } from './ui/button';

type ProfileDialogProps = {
  username: string;
  nickname: string;
  saving: boolean;
  error: string;
  onSave: (nickname: string) => Promise<boolean>;
  onSignOut: () => void;
};

export function ProfileDialog({
  username,
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
        size="sm"
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
        className="fixed left-1/2 top-1/2 m-0 max-h-[90vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-white/10 bg-surface p-6 text-stone-100 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        onClick={closeDialogOnBackdropClick}
      >
        <h2 id="profile-heading" className="font-serif text-2xl">
          Your profile
        </h2>
        <p className="mt-3 text-sm text-stone-400">
          Signed in as <span className="text-stone-200">{username}</span>
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label
            htmlFor="profile-nickname"
            className="block text-sm text-stone-300"
          >
            Nickname
            <input
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
              className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base text-stone-100 focus-visible:outline-2 focus-visible:outline-amber-200"
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
                variant="primary"
                type="submit"
                disabled={saving}
                className="cursor-pointer"
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

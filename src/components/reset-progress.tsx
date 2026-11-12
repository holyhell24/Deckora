import { Button } from './ui/button';

export function ResetProgress({
  onResetButtonClick,
}: {
  onResetButtonClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      aria-label="Reset progress"
      className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
      onClick={onResetButtonClick}
    >
      Reset Progress
    </Button>
  );
}

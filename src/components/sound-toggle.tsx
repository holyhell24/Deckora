import { useState } from 'react';
import { isSoundEnabled, playSound, setSoundEnabled } from '../utils/sounds';
import { Button } from './ui/button';

export function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled);
  return (
    <Button
      variant="secondary"
      aria-label="Sound effects"
      aria-pressed={enabled}
      className="cursor-pointer border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
      onClick={() => {
        setSoundEnabled(!enabled);
        setEnabled(!enabled);

        if (!enabled) {
          playSound('reveal');
        }
      }}
    >
      Sound: {enabled ? 'On' : 'Off'}
    </Button>
  );
}

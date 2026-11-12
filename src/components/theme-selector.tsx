import { useEffect, useState } from 'react';
import { THEMES, THEME_STORAGE_KEY, type ThemeId } from '../constants/themes';

export function ThemeSelector() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return THEMES.find((item) => item.id === saved)?.id ?? 'midnight';
    } catch {
      return 'midnight';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme still works when browser storage is unavailable.
    }
  }, [theme]);

  return (
    <label className="flex items-center gap-2 text-xs text-stone-400">
      Theme
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeId)}
        className="h-11 max-w-32 cursor-pointer text-base sm:text-sm rounded-lg border border-white/15 bg-surface px-3 text-sm text-stone-100 focus-visible:outline-2 focus-visible:outline-amber-200"
      >
        {THEMES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

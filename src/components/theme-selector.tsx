import { useEffect, useState } from 'react';
import { THEMES, THEME_STORAGE_KEY, type ThemeId } from '../constants/themes';
import { Select } from './ui/select';

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
    <label
      className="flex items-center gap-2 text-xs text-stone-400"
      htmlFor="theme-selector"
    >
      Theme
      <Select
        id="theme-selector"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeId)}
        className="h-11 flex-1 cursor-pointer"
      >
        {THEMES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
    </label>
  );
}

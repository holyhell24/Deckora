export const THEMES = [
  { id: 'midnight', name: 'Midnight' },
  { id: 'forest', name: 'Forest' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'amethyst', name: 'Amethyst' },
  { id: 'ember', name: 'Ember' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const THEME_STORAGE_KEY = 'deckora.theme.v1';

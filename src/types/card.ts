export type Rarity = 'White' | 'Green' | 'Blue' | 'Purple' | 'Gold';

export type Card = {
  id: string;
  name: string;
  rarity: Rarity;
  image: string;
};

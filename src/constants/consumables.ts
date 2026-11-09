export const BOOST_CLICKS = 50
export const CONSUMABLE_PRICE_GROWTH = 1.5
export const getConsumableCost = (baseCost: number, purchases: number) =>
  Math.ceil(baseCost * CONSUMABLE_PRICE_GROWTH ** purchases)
export const CONSUMABLES = [
  {
    id: 'spark-tonic',
    name: 'Spark Tonic',
    cost: 40,
    description:
      'Double Sparks for your next 50 manual clicks. Includes critical rewards.',
  },
  {
    id: 'focus-tonic',
    name: 'Focus Tonic',
    cost: 60,
    description:
      'Double progress for your next 50 manual clicks. Combines with critical clicks.',
  },
  {
    id: 'reveal-dust',
    name: 'Reveal Dust',
    cost: 80,
    description:
      'Instantly adds 25% of the current card target as progress. Cannot be used on a revealed card.',
  },
] as const

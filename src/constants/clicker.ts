export const INITIAL_CLICK_TARGET = 10
export const CLICK_TARGET_GROWTH = 1.5
export const CURRENCY_NAME = 'Sparks'

export const getClickTarget = (openedCards: number) =>
  Math.ceil(INITIAL_CLICK_TARGET * CLICK_TARGET_GROWTH ** openedCards)

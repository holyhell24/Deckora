export const INITIAL_CLICK_TARGET = 1
export const CLICK_TARGET_GROWTH = 1.1
export const CURRENCY_NAME = 'Sparks'

export const getClickTarget = (openedCards: number, masteryLevel = 0) =>
  Math.max(
    1,
    Math.ceil(
      INITIAL_CLICK_TARGET *
        CLICK_TARGET_GROWTH ** openedCards *
        0.9 ** masteryLevel,
    ),
  )

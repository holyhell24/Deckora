import { Howl, Howler } from 'howler'
import click from '../assets/sounds/click.wav'
import critical from '../assets/sounds/critical.wav'
import reveal from '../assets/sounds/reveal.wav'
import purchase from '../assets/sounds/purchase.wav'
import exchange from '../assets/sounds/exchange.wav'
import next from '../assets/sounds/next.wav'

const STORAGE_KEY = 'deckora.sound.v1'
const sources = { click, critical, reveal, purchase, exchange, next }
type Sound = keyof typeof sources
const sounds = new Map<Sound, Howl>()
let enabled = true
try {
  enabled = localStorage.getItem(STORAGE_KEY) !== 'off'
} catch {
  /* Keep the session preference when storage is blocked. */
}

export const isSoundEnabled = () => enabled

export function initializeSounds() {
  if (!enabled || sounds.size) return
  try {
    for (const [name, src] of Object.entries(sources)) {
      sounds.set(
        name as Sound,
        new Howl({ src: [src], html5: true, volume: 0.4, preload: true }),
      )
    }
  } catch {
    /* Sound is optional; gameplay continues without it. */
  }
}

export function setSoundEnabled(value: boolean) {
  enabled = value
  if (!value) sounds.forEach((sound) => sound.stop())
  Howler.mute(!value)
  if (value) initializeSounds()
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off')
  } catch {
    /* Session only. */
  }
}

export function playSound(name: Sound) {
  if (!enabled || document.hidden) return
  initializeSounds()
  const sound = sounds.get(name)
  if (!sound) return
  // Reuse the effect rather than stacking many rapid taps.
  sound.stop()
  sound.play()
}

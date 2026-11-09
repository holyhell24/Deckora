const SOUND_KEY = 'deckora.sound.v1'
let context: AudioContext | undefined
let output: GainNode | undefined
let enabled = true

try {
  enabled = localStorage.getItem(SOUND_KEY) !== 'off'
} catch {
  // Audio preferences still work without browser storage.
}

export const isSoundEnabled = () => enabled

export function unlockAudio() {
  if (!enabled) return
  try {
    if (!context || context.state === 'closed') {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AudioContextConstructor) return
      context = new AudioContextConstructor()
      output = context.createGain()
      output.gain.value = 0.12
      output.connect(context.destination)
    }
    if (context.state !== 'running') {
      // Start a silent buffer during the gesture as well as resuming the context.
      const source = context.createBufferSource()
      source.buffer = context.createBuffer(1, 1, context.sampleRate)
      source.connect(context.destination)
      source.start()
      source.onended = () => source.disconnect()
      void context.resume().catch(() => {})
    }
  } catch {
    // Unsupported or blocked audio must not interrupt the game.
  }
}

export function setSoundEnabled(value: boolean) {
  enabled = value
  if (output && context)
    output.gain.setValueAtTime(value ? 0.12 : 0, context.currentTime)
  if (value) unlockAudio()
  try {
    localStorage.setItem(SOUND_KEY, value ? 'on' : 'off')
  } catch {
    // Keep the setting for the current session.
  }
}

const notes = {
  click: [520],
  critical: [700, 1050],
  reveal: [523.25, 659.25, 783.99, 1046.5],
  purchase: [440, 554.37, 659.25],
  exchange: [392, 523.25, 659.25, 783.99],
  next: [330, 440],
} as const

export function playSound(sound: keyof typeof notes) {
  if (!enabled || document.hidden) return
  unlockAudio()
  if (!context || !output) return
  if (context.state !== 'running') {
    const requestedAt = performance.now()
    const activeContext = context
    void activeContext
      .resume()
      .then(() => {
        // Drop old sounds rather than replaying them after a later interaction.
        if (context === activeContext && performance.now() - requestedAt < 300)
          scheduleSound(sound)
      })
      .catch(() => {})
    return
  }
  scheduleSound(sound)
}

function scheduleSound(sound: keyof typeof notes) {
  if (
    !enabled ||
    !context ||
    !output ||
    context.state !== 'running' ||
    document.hidden
  )
    return
  try {
    const short = sound === 'click'
    notes[sound].forEach((frequency, index) => {
      const oscillator = context!.createOscillator()
      const envelope = context!.createGain()
      const start = context!.currentTime + index * 0.065
      const duration = short ? 0.045 : 0.22
      oscillator.type = short ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      if (short)
        oscillator.frequency.exponentialRampToValueAtTime(260, start + duration)
      envelope.gain.setValueAtTime(0, start)
      envelope.gain.linearRampToValueAtTime(short ? 0.4 : 0.6, start + 0.005)
      envelope.gain.exponentialRampToValueAtTime(0.001, start + duration)
      oscillator.connect(envelope)
      envelope.connect(output!)
      oscillator.start(start)
      oscillator.stop(start + duration + 0.01)
      oscillator.onended = () => {
        oscillator.disconnect()
        envelope.disconnect()
      }
    })
  } catch {
    // Audio is optional.
  }
}

/**
 * Audio Utility for Game Sound Effects
 * Uses Web Audio API for lightweight sound generation
 */

type SoundEffect = 'correct' | 'wrong' | 'boost' | 'win' | 'countdown' | 'go' | 'eat'

// Audio context (lazy initialization)
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

// Generate a tone
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch (error) {
    console.warn('Audio playback failed:', error)
  }
}

// Generate a whoosh sound
function playWhoosh(): void {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(200, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3)

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch (error) {
    console.warn('Whoosh sound failed:', error)
  }
}

// Generate an error buzzer
function playError(): void {
  try {
    const ctx = getAudioContext()
    
    // Play two quick low tones
    playTone(150, 0.1, 'square', 0.2)
    setTimeout(() => playTone(120, 0.15, 'square', 0.2), 100)
  } catch (error) {
    console.warn('Error sound failed:', error)
  }
}

// Generate victory fanfare
function playVictory(): void {
  try {
    const ctx = getAudioContext()
    const notes = [523.25, 659.25, 783.99, 1046.5] // C, E, G, C (major chord)
    
    notes.forEach((freq, index) => {
      setTimeout(() => {
        playTone(freq, 0.3, 'sine', 0.25)
      }, index * 100)
    })
  } catch (error) {
    console.warn('Victory sound failed:', error)
  }
}

// Generate countdown beep
function playCountdown(): void {
  playTone(400, 0.2, 'sine', 0.3)
}

// Generate GO sound
function playGo(): void {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(600, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.4, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch (error) {
    console.warn('GO sound failed:', error)
  }
}

// Generate a soft "chomp" / eating sound
function playEat(): void {
  try {
    const ctx = getAudioContext()

    const makeChewNoise = (startAt: number, duration: number, gainValue: number) => {
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration))
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i += 1) {
        // Shaped noise for soft crunch texture
        const t = i / bufferSize
        const env = Math.sin(Math.PI * t)
        output[i] = (Math.random() * 2 - 1) * env * 0.7
      }

      const source = ctx.createBufferSource()
      source.buffer = noiseBuffer

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(gainValue, startAt)
      gain.gain.linearRampToValueAtTime(0.01, startAt + duration)

      source.connect(gain)
      gain.connect(ctx.destination)

      source.start(startAt)
      source.stop(startAt + duration)
    }

    // Reliable chew pattern: 3 soft crunch pulses
    const t0 = ctx.currentTime
    makeChewNoise(t0, 0.06, 0.26)
    makeChewNoise(t0 + 0.07, 0.07, 0.22)
    makeChewNoise(t0 + 0.145, 0.065, 0.19)

    // Low mouth thump so it feels like chewing, not static hiss
    const jaw = ctx.createOscillator()
    const jawGain = ctx.createGain()
    jaw.type = 'triangle'
    jaw.frequency.setValueAtTime(170, t0)
    jaw.frequency.exponentialRampToValueAtTime(115, t0 + 0.2)

    jawGain.gain.setValueAtTime(0.14, t0)
    jawGain.gain.linearRampToValueAtTime(0.01, t0 + 0.2)

    jaw.connect(jawGain)
    jawGain.connect(ctx.destination)

    jaw.start(t0)
    jaw.stop(t0 + 0.2)
  } catch (error) {
    console.warn('Eat sound failed:', error)
  }
}

export function playSound(effectName: SoundEffect): void {
  // Resume audio context if suspended (browser autoplay policy)
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume()
  }

  switch (effectName) {
    case 'correct':
      playTone(800, 0.15, 'sine', 0.5)
      break
    case 'wrong':
      playError()
      break
    case 'boost':
      playWhoosh()
      break
    case 'win':
      playVictory()
      break
    case 'countdown':
      playCountdown()
      break
    case 'go':
      playGo()
      break
    case 'eat':
      playEat()
      break
    default:
      console.warn(`Unknown sound effect: ${effectName}`)
  }
}

// Preload audio context on user interaction
export function initAudio(): void {
  if (typeof window !== 'undefined') {
    // Try to resume audio context on any user interaction
    const resumeAudio = () => {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume()
      }
    }
    
    document.addEventListener('click', resumeAudio, { once: true })
    document.addEventListener('touchstart', resumeAudio, { once: true })
  }
}

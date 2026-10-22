/**
 * Tuner Audio & Pitch Detection Engine (YIN Algorithm + Autocorrelation)
 * Calibrated specifically for guitar, 4-string & 5-string bass, and chromatic pitch.
 */

export interface PitchResult {
  frequency: number
  noteName: string
  noteNameLatin: string
  octave: number
  cents: number
  targetFrequency: number
  inTune: boolean
  clarity: number // 0 to 1
}

export interface InstrumentString {
  stringNumber: number
  note: string
  noteLatin: string
  octave: number
  frequency: number
}

export interface InstrumentPreset {
  id: string
  name: string
  description: string
  strings: InstrumentString[]
}

export const TUNER_PRESETS: InstrumentPreset[] = [
  {
    id: 'guitar',
    name: 'Guitarra',
    description: 'Estándar 6 Cuerdas (E A D G B E)',
    strings: [
      { stringNumber: 6, note: 'E', noteLatin: 'Mi', octave: 2, frequency: 82.41 },
      { stringNumber: 5, note: 'A', noteLatin: 'La', octave: 2, frequency: 110.00 },
      { stringNumber: 4, note: 'D', noteLatin: 'Re', octave: 3, frequency: 146.83 },
      { stringNumber: 3, note: 'G', noteLatin: 'Sol', octave: 3, frequency: 196.00 },
      { stringNumber: 2, note: 'B', noteLatin: 'Si', octave: 3, frequency: 246.94 },
      { stringNumber: 1, note: 'E', noteLatin: 'Mi', octave: 4, frequency: 329.63 }
    ]
  },
  {
    id: 'bass4',
    name: 'Bajo (4 Cuerdas)',
    description: 'Estándar (E A D G)',
    strings: [
      { stringNumber: 4, note: 'E', noteLatin: 'Mi', octave: 1, frequency: 41.20 },
      { stringNumber: 3, note: 'A', noteLatin: 'La', octave: 1, frequency: 55.00 },
      { stringNumber: 2, note: 'D', noteLatin: 'Re', octave: 2, frequency: 73.42 },
      { stringNumber: 1, note: 'G', noteLatin: 'Sol', octave: 2, frequency: 98.00 }
    ]
  },
  {
    id: 'bass5',
    name: 'Bajo (5 Cuerdas)',
    description: 'Con Si grave (B E A D G)',
    strings: [
      { stringNumber: 5, note: 'B', noteLatin: 'Si', octave: 0, frequency: 30.87 },
      { stringNumber: 4, note: 'E', noteLatin: 'Mi', octave: 1, frequency: 41.20 },
      { stringNumber: 3, note: 'A', noteLatin: 'La', octave: 1, frequency: 55.00 },
      { stringNumber: 2, note: 'D', noteLatin: 'Re', octave: 2, frequency: 73.42 },
      { stringNumber: 1, note: 'G', noteLatin: 'Sol', octave: 2, frequency: 98.00 }
    ]
  },
  {
    id: 'chromatic',
    name: 'Cromático Libre',
    description: 'Cualquier instrumento o voz',
    strings: []
  }
]

const NOTES_ANGLO = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTES_LATIN = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']

/**
 * Calculates note details (Anglo, Latin, Octave, Cents) from an audio frequency in Hz
 */
export function frequencyToPitch(frequency: number, a4: number = 440): PitchResult {
  const midi = 12 * Math.log2(frequency / a4) + 69
  const roundedMidi = Math.round(midi)
  const cents = Math.round((midi - roundedMidi) * 100)
  const noteIndex = ((roundedMidi % 12) + 12) % 12
  const octave = Math.floor(roundedMidi / 12) - 1
  const targetFrequency = a4 * Math.pow(2, (roundedMidi - 69) / 12)

  return {
    frequency,
    noteName: NOTES_ANGLO[noteIndex],
    noteNameLatin: NOTES_LATIN[noteIndex],
    octave,
    cents,
    targetFrequency,
    inTune: Math.abs(cents) <= 3,
    clarity: 1
  }
}

/**
 * Robust YIN Pitch Detection Algorithm with Parabolic Interpolation.
 * Specifically handles fundamental frequencies from 28 Hz (B0 bass) to 1200 Hz (high guitar).
 */
export function detectPitchYIN(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number = 0.15
): { frequency: number; probability: number } | null {
  const bufferSize = buffer.length
  const halfBufferSize = Math.floor(bufferSize / 2)

  // Step 0: Check RMS signal volume to reject background noise
  let sumSquare = 0
  for (let i = 0; i < bufferSize; i++) {
    sumSquare += buffer[i] * buffer[i]
  }
  const rms = Math.sqrt(sumSquare / bufferSize)
  if (rms < 0.008) {
    return null // Too quiet
  }

  // Step 1: Difference function
  const yinBuffer = new Float32Array(halfBufferSize)
  for (let tau = 0; tau < halfBufferSize; tau++) {
    let sum = 0
    for (let i = 0; i < halfBufferSize; i++) {
      const delta = buffer[i] - buffer[i + tau]
      sum += delta * delta
    }
    yinBuffer[tau] = sum
  }

  // Step 2: Cumulative mean normalized difference function
  yinBuffer[0] = 1
  let runningSum = 0
  for (let tau = 1; tau < halfBufferSize; tau++) {
    runningSum += yinBuffer[tau]
    yinBuffer[tau] = (yinBuffer[tau] * tau) / runningSum
  }

  // Step 3: Absolute threshold
  let tauEstimate = -1
  for (let tau = 2; tau < halfBufferSize; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < halfBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++
      }
      tauEstimate = tau
      break
    }
  }

  // If no point is under threshold, find global minimum
  if (tauEstimate === -1) {
    let minVal = 1
    for (let tau = 2; tau < halfBufferSize; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau]
        tauEstimate = tau
      }
    }
    if (minVal > 0.45) {
      return null // Pitch not confident
    }
  }

  // Step 4: Parabolic interpolation for sub-sample accuracy
  let betterTau = tauEstimate
  if (tauEstimate > 0 && tauEstimate < halfBufferSize - 1) {
    const s0 = yinBuffer[tauEstimate - 1]
    const s1 = yinBuffer[tauEstimate]
    const s2 = yinBuffer[tauEstimate + 1]
    const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0))
    if (Math.abs(adjustment) < 1) {
      betterTau += adjustment
    }
  }

  const frequency = sampleRate / betterTau

  // Filter out frequencies outside musical instrument range (28 Hz to 1200 Hz)
  if (frequency < 28 || frequency > 1200) {
    return null
  }

  const probability = 1 - Math.min(1, yinBuffer[tauEstimate] || 0)
  return { frequency, probability }
}

/**
 * Audio Context Tone Generator to play pure reference notes
 */
let toneAudioCtx: AudioContext | null = null
let currentOsc: OscillatorNode | null = null
let currentGain: GainNode | null = null

export function playReferenceTone(frequency: number): void {
  stopReferenceTone()
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!toneAudioCtx || toneAudioCtx.state === 'closed') {
      toneAudioCtx = new AudioCtx()
    }
    if (toneAudioCtx.state === 'suspended') {
      toneAudioCtx.resume()
    }

    const osc = toneAudioCtx.createOscillator()
    const gain = toneAudioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, toneAudioCtx.currentTime)

    gain.gain.setValueAtTime(0, toneAudioCtx.currentTime)
    gain.gain.linearRampToValueAtTime(0.2, toneAudioCtx.currentTime + 0.05)

    osc.connect(gain)
    gain.connect(toneAudioCtx.destination)

    osc.start()
    currentOsc = osc
    currentGain = gain
  } catch (err) {
    console.error('Error playing reference tone:', err)
  }
}

export function stopReferenceTone(): void {
  if (currentGain && toneAudioCtx && toneAudioCtx.state !== 'closed') {
    try {
      currentGain.gain.linearRampToValueAtTime(0.001, toneAudioCtx.currentTime + 0.05)
      setTimeout(() => {
        if (currentOsc) {
          try {
            currentOsc.stop()
            currentOsc.disconnect()
          } catch {}
          currentOsc = null
        }
      }, 60)
    } catch {}
  } else if (currentOsc) {
    try {
      currentOsc.stop()
      currentOsc.disconnect()
    } catch {}
    currentOsc = null
  }
}

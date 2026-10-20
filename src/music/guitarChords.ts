import type { ChordFingering } from '../types/song'
import { parseChord, getSemitone, semitoneToNote } from './musicTheory'

export interface ChordVariation {
  id: string
  name: string
  label: string
  description: string
  fretRange: string
  fingering: ChordFingering
}

// Common guitar chord fingering database (Low E -> High E)
// -1 = Mute (X), 0 = Open (O), 1..n = Fret
export const GUITAR_CHORD_DATABASE: Record<string, ChordFingering> = {
  // Major Open & Standard
  'C':    { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  'D':    { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  'E':    { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  'F':    { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1, barres: [{ fromString: 6, toString: 1, fret: 1 }] },
  'G':    { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  'A':    { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'B':    { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, barres: [{ fromString: 5, toString: 1, fret: 2 }] },

  // Minor Open & Standard
  'Cm':   { frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], baseFret: 3, barres: [{ fromString: 5, toString: 1, fret: 3 }] },
  'Dm':   { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  'Em':   { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  'Fm':   { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], baseFret: 1, barres: [{ fromString: 6, toString: 1, fret: 1 }] },
  'Gm':   { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3, barres: [{ fromString: 6, toString: 1, fret: 3 }] },
  'Am':   { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  'Bm':   { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], baseFret: 2, barres: [{ fromString: 5, toString: 1, fret: 2 }] },

  // Dominant 7th
  'C7':   { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  'D7':   { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  'E7':   { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  'F7':   { frets: [1, 3, 1, 2, 1, 1], fingers: [1, 3, 1, 2, 1, 1], baseFret: 1, barres: [{ fromString: 6, toString: 1, fret: 1 }] },
  'G7':   { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  'A7':   { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  'B7':   { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },

  // Major 7th
  'Cmaj7': { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  'Dmaj7': { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
  'Emaj7': { frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0] },
  'Fmaj7': { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  'Gmaj7': { frets: [3, 2, 0, 0, 0, 2], fingers: [2, 1, 0, 0, 0, 3] },
  'Amaj7': { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
  'Bmaj7': { frets: [-1, 2, 4, 3, 4, 2], fingers: [0, 1, 3, 2, 4, 1], baseFret: 2, barres: [{ fromString: 5, toString: 1, fret: 2 }] },

  // Minor 7th
  'Cm7':  { frets: [-1, 3, 5, 3, 4, 3], fingers: [0, 1, 3, 1, 2, 1], baseFret: 3, barres: [{ fromString: 5, toString: 1, fret: 3 }] },
  'Dm7':  { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], barres: [{ fromString: 2, toString: 1, fret: 1 }] },
  'Em7':  { frets: [0, 2, 0, 0, 0, 0], fingers: [0, 1, 0, 0, 0, 0] },
  'Fm7':  { frets: [1, 3, 1, 1, 1, 1], fingers: [1, 3, 1, 1, 1, 1], baseFret: 1, barres: [{ fromString: 6, toString: 1, fret: 1 }] },
  'Gm7':  { frets: [3, 5, 3, 3, 3, 3], fingers: [1, 3, 1, 1, 1, 1], baseFret: 3, barres: [{ fromString: 6, toString: 1, fret: 3 }] },
  'Am7':  { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  'Bm7':  { frets: [-1, 2, 4, 2, 3, 2], fingers: [0, 1, 3, 1, 2, 1], baseFret: 2, barres: [{ fromString: 5, toString: 1, fret: 2 }] },

  // Suspended 4th
  'Csus4': { frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },
  'Dsus4': { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3] },
  'Esus4': { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 2, 3, 4, 0, 0] },
  'Fsus4': { frets: [1, 3, 3, 3, 1, 1], fingers: [1, 2, 3, 4, 1, 1], baseFret: 1, barres: [{ fromString: 6, toString: 1, fret: 1 }] },
  'Gsus4': { frets: [3, 2, 0, 0, 1, 3], fingers: [3, 2, 0, 0, 1, 4] },
  'Asus4': { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'Bsus4': { frets: [-1, 2, 4, 4, 5, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, barres: [{ fromString: 5, toString: 1, fret: 2 }] },

  // Suspended 2nd
  'Csus2': { frets: [-1, 3, 0, 0, 1, -1] },
  'Dsus2': { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0] },
  'Asus2': { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },

  // Add9
  'Cadd9': { frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] },

  // Diminished
  'Cdim':  { frets: [-1, 3, 4, -1, 4, -1] },
  'Ddim':  { frets: [-1, -1, 0, 1, 3, 1] },
  'Edim':  { frets: [-1, -1, 2, 3, 2, 3] },
  'Fdim':  { frets: [-1, -1, 0, 1, 0, 1] },
  'Gdim':  { frets: [-1, -1, 2, 3, 2, 3] },
  'Adim':  { frets: [-1, 0, 1, 2, 1, -1] },
  'Bdim':  { frets: [-1, 2, 3, 4, 3, -1] },

  // Slash Chords (Inversions)
  'D/F#':  { frets: [2, 0, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3] },
  'C/E':   { frets: [0, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  'G/B':   { frets: [-1, 2, 0, 0, 3, 3], fingers: [0, 1, 0, 0, 3, 4] },
  'A/C#':  { frets: [-1, 4, 2, 2, 2, 0], baseFret: 2, fingers: [0, 4, 1, 2, 3, 0] },
  'F/A':   { frets: [-1, 0, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], barres: [{ fromString: 2, toString: 1, fret: 1 }] },
  'C/G':   { frets: [3, 3, 2, 0, 1, 0], fingers: [3, 4, 2, 0, 1, 0] },
  'Em/G':  { frets: [3, 2, 2, 0, 0, 0], fingers: [3, 1, 2, 0, 0, 0] },
  'Am/G':  { frets: [3, 0, 2, 2, 1, 0], fingers: [3, 0, 2, 1, 1, 0] },

  // Sharps / Flats common
  'F#':    { frets: [2, 4, 4, 3, 2, 2], baseFret: 2, barres: [{ fromString: 6, toString: 1, fret: 2 }] },
  'Gb':    { frets: [2, 4, 4, 3, 2, 2], baseFret: 2, barres: [{ fromString: 6, toString: 1, fret: 2 }] },
  'F#m':   { frets: [2, 4, 4, 2, 2, 2], baseFret: 2, barres: [{ fromString: 6, toString: 1, fret: 2 }] },
  'Gbm':   { frets: [2, 4, 4, 2, 2, 2], baseFret: 2, barres: [{ fromString: 6, toString: 1, fret: 2 }] },
  'C#':    { frets: [-1, 4, 6, 6, 6, 4], baseFret: 4, barres: [{ fromString: 5, toString: 1, fret: 4 }] },
  'Db':    { frets: [-1, 4, 6, 6, 6, 4], baseFret: 4, barres: [{ fromString: 5, toString: 1, fret: 4 }] },
  'C#m':   { frets: [-1, 4, 6, 6, 5, 4], baseFret: 4, barres: [{ fromString: 5, toString: 1, fret: 4 }] },
  'Dbm':   { frets: [-1, 4, 6, 6, 5, 4], baseFret: 4, barres: [{ fromString: 5, toString: 1, fret: 4 }] },
  'G#':    { frets: [4, 6, 6, 5, 4, 4], baseFret: 4, barres: [{ fromString: 6, toString: 1, fret: 4 }] },
  'Ab':    { frets: [4, 6, 6, 5, 4, 4], baseFret: 4, barres: [{ fromString: 6, toString: 1, fret: 4 }] },
  'G#m':   { frets: [4, 6, 6, 4, 4, 4], baseFret: 4, barres: [{ fromString: 6, toString: 1, fret: 4 }] },
  'Abm':   { frets: [4, 6, 6, 4, 4, 4], baseFret: 4, barres: [{ fromString: 6, toString: 1, fret: 4 }] },
  'A#':    { frets: [-1, 1, 3, 3, 3, 1], baseFret: 1, barres: [{ fromString: 5, toString: 1, fret: 1 }] },
  'Bb':    { frets: [-1, 1, 3, 3, 3, 1], baseFret: 1, barres: [{ fromString: 5, toString: 1, fret: 1 }] },
  'A#m':   { frets: [-1, 1, 3, 3, 2, 1], baseFret: 1, barres: [{ fromString: 5, toString: 1, fret: 1 }] },
  'Bbm':   { frets: [-1, 1, 3, 3, 2, 1], baseFret: 1, barres: [{ fromString: 5, toString: 1, fret: 1 }] },
  'D#':    { frets: [-1, 6, 8, 8, 8, 6], baseFret: 6, barres: [{ fromString: 5, toString: 1, fret: 6 }] },
  'Eb':    { frets: [-1, 6, 8, 8, 8, 6], baseFret: 6, barres: [{ fromString: 5, toString: 1, fret: 6 }] },
  'D#m':   { frets: [-1, 6, 8, 8, 7, 6], baseFret: 6, barres: [{ fromString: 5, toString: 1, fret: 6 }] },
  'Ebm':   { frets: [-1, 6, 8, 8, 7, 6], baseFret: 6, barres: [{ fromString: 5, toString: 1, fret: 6 }] }
}

/**
 * Returns all available fingerings/voicings for a given chord across the guitar neck.
 */
export function getAllGuitarChordFingerings(chordName: string): ChordVariation[] {
  const parsed = parseChord(chordName)
  if (!parsed) return []

  const rootSemi = getSemitone(parsed.root)
  if (rootSemi === -1) return []

  const isFlat = parsed.root.includes('b') || parsed.root.includes('B')
  const angloRoot = semitoneToNote(rootSemi, isFlat, 'anglo')
  const quality = parsed.quality || ''
  const isSlash = Boolean(parsed.bass)
  const fullKey = isSlash && parsed.bass
    ? `${angloRoot}${quality}/${parsed.bass}`
    : `${angloRoot}${quality}`

  const variations: ChordVariation[] = []
  const seenSignatures = new Set<string>()

  const addVariation = (
    label: string,
    description: string,
    fingering: ChordFingering
  ) => {
    const sig = fingering.frets.join(',')
    if (seenSignatures.has(sig)) return
    seenSignatures.add(sig)

    const fretsOnly = fingering.frets.filter(f => f > 0)
    const minF = fretsOnly.length > 0 ? Math.min(...fretsOnly) : 0
    const maxF = fretsOnly.length > 0 ? Math.max(...fretsOnly) : 3
    const fretRange = minF === 0 ? 'Trastes Abiertos' : `Trastes ${minF} - ${maxF}`

    variations.push({
      id: `var-${variations.length + 1}`,
      name: chordName,
      label,
      description,
      fretRange,
      fingering
    })
  }

  // 1. Direct match in database (often open position or signature shape)
  if (GUITAR_CHORD_DATABASE[fullKey]) {
    addVariation(
      'Posición Abierta / Principal',
      'Posición estándar recomendada',
      GUITAR_CHORD_DATABASE[fullKey]
    )
  }

  // Also check without slash bass
  const rootOnlyKey = `${angloRoot}${quality}`
  if (isSlash && GUITAR_CHORD_DATABASE[rootOnlyKey]) {
    addVariation(
      'Posición Estándar (Sin bajo)',
      'Forma estándar sin la inversión',
      GUITAR_CHORD_DATABASE[rootOnlyKey]
    )
  }

  // Check enharmonic match
  const enharmonicRoot = semitoneToNote(rootSemi, !isFlat, 'anglo')
  const enharmonicKey = `${enharmonicRoot}${quality}`
  if (GUITAR_CHORD_DATABASE[enharmonicKey]) {
    addVariation(
      'Posición Enharmónica',
      `Forma con ${enharmonicRoot}`,
      GUITAR_CHORD_DATABASE[enharmonicKey]
    )
  }

  // Alternate open shapes (like G with 4 fingers [3,2,0,0,3,3])
  if (rootOnlyKey === 'G') {
    addVariation(
      'Forma Abierta de 4 Dedos',
      'Sonido acústico brillante',
      { frets: [3, 2, 0, 0, 3, 3], fingers: [2, 1, 0, 0, 3, 4] }
    )
  }
  if (rootOnlyKey === 'C') {
    addVariation(
      'Forma Cadd9',
      'Color moderno para pop y alabanza',
      { frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] }
    )
  }

  // 2. CAGED Barre on 5th string (A-shape)
  // Root on 5th string: A=0, Bb=1, B=2, C=3, C#=4, D=5, Eb=6, E=7, F=8, F#=9, G=10, Ab=11
  const fret5th = (rootSemi - 9 + 12) % 12
  const isMinor = quality.startsWith('m') && !quality.startsWith('maj')
  const isSeventh = quality.includes('7') && !quality.includes('maj7')
  const isMaj7 = quality.includes('maj7')
  const isSus4 = quality.includes('sus4') || quality.includes('sus')

  if (fret5th >= 1 && fret5th <= 11) {
    let frets: number[]
    let fingers: number[] | undefined

    if (isMinor) {
      frets = [-1, fret5th, fret5th + 2, fret5th + 2, fret5th + 1, fret5th]
      fingers = [0, 1, 3, 4, 2, 1]
    } else if (isSeventh) {
      frets = [-1, fret5th, fret5th + 2, fret5th, fret5th + 2, fret5th]
      fingers = [0, 1, 3, 1, 4, 1]
    } else if (isMaj7) {
      frets = [-1, fret5th, fret5th + 2, fret5th + 1, fret5th + 2, fret5th]
      fingers = [0, 1, 3, 2, 4, 1]
    } else if (isSus4) {
      frets = [-1, fret5th, fret5th + 2, fret5th + 2, fret5th + 3, fret5th]
      fingers = [0, 1, 2, 3, 4, 1]
    } else {
      // Major
      frets = [-1, fret5th, fret5th + 2, fret5th + 2, fret5th + 2, fret5th]
      fingers = [0, 1, 2, 3, 4, 1]
    }

    addVariation(
      `Cejilla en 5ª Cuerda (Traste ${fret5th})`,
      `Forma de ${isMinor ? 'Lam' : 'La'} móvil`,
      {
        frets,
        fingers,
        baseFret: fret5th,
        barres: [{ fromString: 5, toString: 1, fret: fret5th }]
      }
    )
  }

  // 3. CAGED Barre on 6th string (E-shape)
  // Root on 6th string: E=0, F=1, F#=2, G=3, G#=4, A=5, Bb=6, B=7, C=8, C#=9, D=10, Eb=11
  const fret6th = (rootSemi - 4 + 12) % 12

  if (fret6th >= 1 && fret6th <= 11) {
    let frets: number[]
    let fingers: number[] | undefined

    if (isMinor) {
      frets = [fret6th, fret6th + 2, fret6th + 2, fret6th, fret6th, fret6th]
      fingers = [1, 3, 4, 1, 1, 1]
    } else if (isSeventh) {
      frets = [fret6th, fret6th + 2, fret6th, fret6th + 1, fret6th, fret6th]
      fingers = [1, 3, 1, 2, 1, 1]
    } else if (isMaj7) {
      frets = [fret6th, fret6th + 2, fret6th + 1, fret6th + 1, fret6th, fret6th]
      fingers = [1, 3, 2, 2, 1, 1]
    } else if (isSus4) {
      frets = [fret6th, fret6th + 2, fret6th + 2, fret6th + 2, fret6th, fret6th]
      fingers = [1, 3, 4, 2, 1, 1]
    } else {
      // Major
      frets = [fret6th, fret6th + 2, fret6th + 2, fret6th + 1, fret6th, fret6th]
      fingers = [1, 3, 4, 2, 1, 1]
    }

    addVariation(
      `Cejilla en 6ª Cuerda (Traste ${fret6th})`,
      `Forma de ${isMinor ? 'Mim' : 'Mi'} móvil`,
      {
        frets,
        fingers,
        baseFret: fret6th,
        barres: [{ fromString: 6, toString: 1, fret: fret6th }]
      }
    )
  }

  // 4. CAGED D-shape (Voicing en cuerdas agudas)
  // Root on 4th string: D=0, Eb=1, E=2, F=3, F#=4, G=5, Ab=6, A=7, Bb=8, B=9, C=10, C#=11
  const fret4th = (rootSemi - 2 + 12) % 12
  if (fret4th >= 1 && fret4th <= 9) {
    let frets: number[]

    if (isMinor) {
      frets = [-1, -1, fret4th, fret4th + 2, fret4th + 3, fret4th + 1]
    } else if (isSeventh) {
      frets = [-1, -1, fret4th, fret4th + 2, fret4th + 1, fret4th + 2]
    } else {
      frets = [-1, -1, fret4th, fret4th + 2, fret4th + 3, fret4th + 2]
    }

    addVariation(
      `Voicing Agudo (Traste ${fret4th})`,
      'Forma de Re en cuerdas agudas',
      {
        frets,
        baseFret: fret4th
      }
    )
  }

  // Fallback if empty
  if (variations.length === 0) {
    const single = getGuitarChordFingering(chordName)
    if (single) {
      addVariation('Posición Estándar', 'Digitación general', single)
    }
  }

  return variations
}

/**
 * Finds primary chord fingering by chord name.
 */
export function getGuitarChordFingering(chordName: string): ChordFingering | null {
  const vars = getAllGuitarChordFingerings(chordName)
  return vars[0]?.fingering || null
}

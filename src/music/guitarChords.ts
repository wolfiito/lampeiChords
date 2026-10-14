import type { ChordFingering } from '../types/song'
import { parseChord, getSemitone, semitoneToNote } from './musicTheory'

// Common guitar chord fingering database (Low E -> High E)
// -1 = Mute (X), 0 = Open (O), 1..n = Fret
export const GUITAR_CHORD_DATABASE: Record<string, ChordFingering> = {
  // Major
  'C':    { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  'D':    { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  'E':    { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  'F':    { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1, barres: [{ fromString: 6, toString: 1, fret: 1 }] },
  'G':    { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  'A':    { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'B':    { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, barres: [{ fromString: 5, toString: 1, fret: 2 }] },

  // Minor
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

  // Diminished
  'Cdim':  { frets: [-1, 3, 4, -1, 4, -1] },
  'Ddim':  { frets: [-1, -1, 0, 1, 3, 1] },
  'Edim':  { frets: [-1, -1, 2, 3, 2, 3] },
  'Fdim':  { frets: [-1, -1, 0, 1, 0, 1] },
  'Gdim':  { frets: [-1, -1, 2, 3, 2, 3] },
  'Adim':  { frets: [-1, 0, 1, 2, 1, -1] },
  'Bdim':  { frets: [-1, 2, 3, 4, 3, -1] },

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
  'Ebm':   { frets: [-1, 6, 8, 8, 7, 6], baseFret: 6, barres: [{ fromString: 5, toString: 1, fret: 6 }] },
}

/**
 * Finds chord fingering by chord name.
 * If chord is in Latin (e.g. 'Lam', 'Sol7'), converts to Anglo first.
 * If not in database, calculates barre shape (E shape on 6th string or A shape on 5th string).
 */
export function getGuitarChordFingering(chordName: string): ChordFingering | null {
  const parsed = parseChord(chordName)
  if (!parsed) return null

  // Convert root note to Anglo standard (C, D, E...)
  const rootSemi = getSemitone(parsed.root)
  if (rootSemi === -1) return null

  const isFlat = parsed.root.includes('b') || parsed.root.includes('B')
  const angloRoot = semitoneToNote(rootSemi, isFlat, 'anglo')
  const standardKey = `${angloRoot}${parsed.quality}`

  // Check direct database match
  if (GUITAR_CHORD_DATABASE[standardKey]) {
    return GUITAR_CHORD_DATABASE[standardKey]
  }

  // Check enharmonic equivalent
  const enharmonicRoot = semitoneToNote(rootSemi, !isFlat, 'anglo')
  const enharmonicKey = `${enharmonicRoot}${parsed.quality}`
  if (GUITAR_CHORD_DATABASE[enharmonicKey]) {
    return GUITAR_CHORD_DATABASE[enharmonicKey]
  }

  // Dynamic CAGED barre calculation for other chords (E shape or A shape)
  const isMinor = parsed.quality.startsWith('m') && !parsed.quality.startsWith('maj')
  const isSeventh = parsed.quality.includes('7') && !parsed.quality.includes('maj7')

  // Calculate fret on 6th string (E=0, F=1, F#=2, G=3, etc.)
  const eRootSemi = 4 // E is semitone 4
  const fret6th = ((rootSemi - eRootSemi + 12) % 12)

  if (fret6th >= 1 && fret6th <= 10) {
    if (isMinor) {
      return {
        frets: [fret6th, fret6th + 2, fret6th + 2, fret6th, fret6th, fret6th],
        baseFret: fret6th,
        barres: [{ fromString: 6, toString: 1, fret: fret6th }]
      }
    } else if (isSeventh) {
      return {
        frets: [fret6th, fret6th + 2, fret6th, fret6th + 1, fret6th, fret6th],
        baseFret: fret6th,
        barres: [{ fromString: 6, toString: 1, fret: fret6th }]
      }
    } else {
      // Major barre
      return {
        frets: [fret6th, fret6th + 2, fret6th + 2, fret6th + 1, fret6th, fret6th],
        baseFret: fret6th,
        barres: [{ fromString: 6, toString: 1, fret: fret6th }]
      }
    }
  }

  return null
}

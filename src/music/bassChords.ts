import type { NotationSystem } from '../types/song'
import { parseChord, getSemitone, semitoneToNote } from './musicTheory'

export type BassDegree = 'root' | 'fifth' | 'third' | 'octave' | 'seventh'

export interface BassNotePosition {
  stringNumber: number // 1 = highest pitch (G), 4 = lowest (E), 5 = B (if 5-string)
  stringName: string   // 'E', 'A', 'D', 'G', etc.
  fret: number         // 0 = open string, 1..12
  semitone: number
  noteName: string
  degree: BassDegree
  label: string
  isPrimary: boolean
}

export interface BassVariation {
  id: string
  label: string
  description: string
  fretRange: string
  primaryPosition: BassNotePosition
  recommendedPositions: BassNotePosition[]
  patternDescription: string
  playingTip: string
}

export interface BassChordInfo {
  chord: string
  primaryBassNote: string
  isSlashChord: boolean
  slashBassNote?: string
  rootNote: string
  thirdNote: string
  fifthNote: string
  octaveNote: string
  primaryPosition: BassNotePosition
  recommendedPositions: BassNotePosition[]
  playingTip: string
  patternDescription: string
  variations: BassVariation[]
}

// 4-string Bass standard tuning (E A D G)
// String 4 = E (semi 4), String 3 = A (semi 9), String 2 = D (semi 2), String 1 = G (semi 7)
const STRINGS_4 = [
  { stringNumber: 1, name: 'G', baseSemi: 7 },
  { stringNumber: 2, name: 'D', baseSemi: 2 },
  { stringNumber: 3, name: 'A', baseSemi: 9 },
  { stringNumber: 4, name: 'E', baseSemi: 4 }
]

// 5-string Bass standard tuning (B E A D G)
const STRINGS_5 = [
  { stringNumber: 1, name: 'G', baseSemi: 7 },
  { stringNumber: 2, name: 'D', baseSemi: 2 },
  { stringNumber: 3, name: 'A', baseSemi: 9 },
  { stringNumber: 4, name: 'E', baseSemi: 4 },
  { stringNumber: 5, name: 'B', baseSemi: 11 }
]

export function getBassChordInfo(
  chordStr: string,
  preferFlats = false,
  notation: NotationSystem = 'anglo',
  numStrings: 4 | 5 = 4
): BassChordInfo | null {
  const parsed = parseChord(chordStr)
  if (!parsed) return null

  const rootSemi = getSemitone(parsed.root)
  if (rootSemi === -1) return null

  const isSlashChord = Boolean(parsed.bass)
  const primarySemi = isSlashChord && parsed.bass
    ? getSemitone(parsed.bass)
    : rootSemi

  if (primarySemi === -1) return null

  // Calculate chord intervals
  const q = (parsed.quality || '').toLowerCase()
  const isMinor = q.includes('m') && !q.includes('maj')
  const isDim = q.includes('dim') || q.includes('°') || q.includes('b5')
  const isAug = q.includes('aug') || q.includes('+') || q.includes('#5')
  const isSus4 = q.includes('sus4') || q.includes('sus')
  const isSus2 = q.includes('sus2')

  // Third degree
  let thirdInterval = 4 // Major 3rd
  if (isMinor || isDim) thirdInterval = 3
  else if (isSus4) thirdInterval = 5
  else if (isSus2) thirdInterval = 2

  // Fifth degree
  let fifthInterval = 7 // Perfect 5th
  if (isDim) fifthInterval = 6 // Diminished 5th
  else if (isAug) fifthInterval = 8 // Augmented 5th

  const thirdSemi = (primarySemi + thirdInterval) % 12
  const fifthSemi = (primarySemi + fifthInterval) % 12

  const primaryNoteName = semitoneToNote(primarySemi, preferFlats, notation)
  const rootNoteName = semitoneToNote(rootSemi, preferFlats, notation)
  const thirdNoteName = semitoneToNote(thirdSemi, preferFlats, notation)
  const fifthNoteName = semitoneToNote(fifthSemi, preferFlats, notation)
  const octaveNoteName = primaryNoteName

  const stringSet = numStrings === 5 ? STRINGS_5 : STRINGS_4

  // Find all fret positions for primary, 3rd, 5th, octave (frets 0 to 12)
  const allPositions: BassNotePosition[] = []

  for (const str of stringSet) {
    for (let fret = 0; fret <= 12; fret++) {
      const currentSemi = (str.baseSemi + fret) % 12

      if (currentSemi === primarySemi) {
        allPositions.push({
          stringNumber: str.stringNumber,
          stringName: str.name,
          fret,
          semitone: currentSemi,
          noteName: primaryNoteName,
          degree: 'root',
          label: isSlashChord ? 'Bajo' : 'Tónica',
          isPrimary: false
        })
      } else if (currentSemi === fifthSemi) {
        allPositions.push({
          stringNumber: str.stringNumber,
          stringName: str.name,
          fret,
          semitone: currentSemi,
          noteName: fifthNoteName,
          degree: 'fifth',
          label: '5ª',
          isPrimary: false
        })
      } else if (currentSemi === thirdSemi) {
        allPositions.push({
          stringNumber: str.stringNumber,
          stringName: str.name,
          fret,
          semitone: currentSemi,
          noteName: thirdNoteName,
          degree: 'third',
          label: isMinor ? '3ªm' : '3ªM',
          isPrimary: false
        })
      }
    }
  }

  // Determine ideal primary position:
  // For bassists, the best root is usually in the lowest strings (E or A) and frets 0-8 for deep low-end.
  const rootCandidates = allPositions
    .filter(p => p.degree === 'root')
    .sort((a, b) => {
      // Prioritize String 4 (E) or String 5 (B), then String 3 (A)
      const stringScoreA = a.stringNumber >= 3 ? 10 : 3
      const stringScoreB = b.stringNumber >= 3 ? 10 : 3
      if (stringScoreA !== stringScoreB) return stringScoreB - stringScoreA
      // Then prioritize comfortable frets 0 to 7
      const fretDistA = a.fret <= 7 ? a.fret : a.fret + 5
      const fretDistB = b.fret <= 7 ? b.fret : b.fret + 5
      return fretDistA - fretDistB
    })

  const primaryPosition = rootCandidates[0] || {
    stringNumber: 4,
    stringName: 'E',
    fret: 0,
    semitone: primarySemi,
    noteName: primaryNoteName,
    degree: 'root' as BassDegree,
    label: 'Tónica',
    isPrimary: true
  }

  primaryPosition.isPrimary = true

  // Filter recommended positions in the vicinity of primary position (within 4 frets)
  const minFretBox = Math.max(0, primaryPosition.fret === 0 ? 0 : primaryPosition.fret - 1)
  const maxFretBox = Math.min(12, minFretBox + 4)

  const recommendedPositions = allPositions.filter(p => {
    if (p === primaryPosition) return true
    return p.fret >= minFretBox && p.fret <= maxFretBox
  })

  // Ensure at least one 5th is present in recommended positions
  const hasFifth = recommendedPositions.some(p => p.degree === 'fifth')
  if (!hasFifth) {
    const closestFifth = allPositions
      .filter(p => p.degree === 'fifth')
      .sort((a, b) => Math.abs(a.fret - primaryPosition.fret) - Math.abs(b.fret - primaryPosition.fret))[0]
    if (closestFifth && !recommendedPositions.includes(closestFifth)) {
      recommendedPositions.push(closestFifth)
    }
  }

  // Playing tip & pattern for bassist
  let playingTip = `Toca la nota fundamental (${primaryNoteName}) en el tiempo fuerte (tiempo 1).`
  if (isSlashChord && parsed.bass) {
    playingTip = `¡Atención! Este es un acorde invertido: el bajo debe tocar obligatoriamente la nota ${primaryNoteName}.`
  }

  // Build multi-position variations across the neck (Grave, Media, Aguda)
  const variations: BassVariation[] = rootCandidates.slice(0, 3).map((candidate, idx) => {
    const minF = Math.max(0, candidate.fret === 0 ? 0 : candidate.fret - 1)
    const maxF = Math.min(12, minF + 4)

    const posInBox = allPositions.filter(p => {
      if (p.stringNumber === candidate.stringNumber && p.fret === candidate.fret) return true
      return p.fret >= minF && p.fret <= maxF
    })

    if (!posInBox.some(p => p.degree === 'fifth')) {
      const closest5 = allPositions
        .filter(p => p.degree === 'fifth')
        .sort((a, b) => Math.abs(a.fret - candidate.fret) - Math.abs(b.fret - candidate.fret))[0]
      if (closest5 && !posInBox.includes(closest5)) {
        posInBox.push(closest5)
      }
    }

    const regLabel = candidate.fret <= 4
      ? 'Posición Grave (Profunda)'
      : candidate.fret <= 8
      ? 'Posición Media (Definida)'
      : 'Posición Aguda (Octava)'

    return {
      id: `bass-var-${idx + 1}`,
      label: regLabel,
      description: `Cuerda ${candidate.stringName} · Traste ${candidate.fret}`,
      fretRange: candidate.fret === 0 ? 'Cuerda al aire' : `Trastes ${minF} - ${maxF}`,
      primaryPosition: { ...candidate, isPrimary: true },
      recommendedPositions: posInBox,
      patternDescription: `Patrón: ${primaryNoteName} (Tónica) + ${fifthNoteName} (5ª Justa)`,
      playingTip: isSlashChord
        ? `Inversión: el bajo toca ${primaryNoteName} (no la tónica del acorde).`
        : `Toca ${primaryNoteName} en el tiempo 1 para fundamentar la armonía.`
    }
  })

  const patternDescription = `Patrón base: ${primaryNoteName} (Tónica) + ${fifthNoteName} (5ª Justa)`

  return {
    chord: chordStr,
    primaryBassNote: primaryNoteName,
    isSlashChord,
    slashBassNote: isSlashChord ? primaryNoteName : undefined,
    rootNote: rootNoteName,
    thirdNote: thirdNoteName,
    fifthNote: fifthNoteName,
    octaveNote: octaveNoteName,
    primaryPosition,
    recommendedPositions,
    playingTip,
    patternDescription,
    variations
  }
}

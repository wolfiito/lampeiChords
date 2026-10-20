import { parseSectionLine } from './chordPro'

export interface SectionTiming {
  index: number
  title: string
  bars: number
  durationSec: number
  startSec: number
  endSec: number
  linesCount: number
  chordsCount: number
  isExplicitDuration?: boolean
}

export interface SongTimingData {
  bpm: number
  timeSignature: string
  totalSeconds: number
  hasCustomTiming: boolean
  sections: SectionTiming[]
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}

/**
 * Analyzes a ChordPro song and computes musical duration estimates or uses
 * manual user times [Intro]{30}, [Verso 1]{25} for section-by-section timing.
 */
export function calculateSongTiming(
  content: string,
  tempo: number = 75,
  timeSignature: string = '4/4'
): SongTimingData {
  const bpm = Math.max(30, Math.min(260, tempo || 75))
  const beatsPerBar = parseInt(timeSignature, 10) || 4
  const secondsPerBeat = 60 / bpm
  const secondsPerBar = beatsPerBar * secondsPerBeat

  const lines = (content || '').split(/\r?\n/)
  const rawSections: Array<{
    title: string
    lines: string[]
    chords: number
    explicitDurationSec?: number
  }> = []

  let currentSection = {
    title: 'Inicio',
    lines: [] as string[],
    chords: 0,
    explicitDurationSec: undefined as number | undefined
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const parsedSec = parseSectionLine(trimmed)
    if (parsedSec) {
      if (currentSection.title !== 'Inicio' || currentSection.lines.length > 0 || currentSection.chords > 0) {
        rawSections.push(currentSection)
      }
      currentSection = {
        title: parsedSec.title,
        lines: [],
        chords: 0,
        explicitDurationSec: parsedSec.explicitSec
      }
      continue
    }

    if (!trimmed.startsWith('{')) {
      const chords = (trimmed.match(/\[([^\]]+)\]/g) || []).length
      currentSection.chords += chords
      currentSection.lines.push(trimmed)
    }
  }

  if (currentSection.title !== 'Inicio' || currentSection.lines.length > 0 || currentSection.chords > 0) {
    rawSections.push(currentSection)
  }

  // If no explicit section headers were found, treat whole song as one section
  if (rawSections.length === 0) {
    rawSections.push({ title: 'Canción', lines: lines.filter(l => l.trim()), chords: 8 })
  }

  let runningSeconds = 0
  const sections: SectionTiming[] = rawSections.map((sec, idx) => {
    const hasExplicit = sec.explicitDurationSec !== undefined && sec.explicitDurationSec > 0
    let durationSec = 0
    let bars = 8

    if (hasExplicit) {
      durationSec = sec.explicitDurationSec!
      bars = Math.max(1, Math.round(durationSec / secondsPerBar))
    } else {
      const titleLower = sec.title.toLowerCase()
      const isIntroOrOutro = /intro|outro|final/i.test(titleLower)
      const isChorus = /coro|chorus|estribillo/i.test(titleLower)
      const isBridge = /puente|bridge|solo|interludio/i.test(titleLower)

      if (isIntroOrOutro) {
        bars = Math.max(4, Math.min(8, sec.chords || 4))
      } else if (isBridge) {
        bars = Math.max(8, Math.min(16, (sec.chords || 4) * 2))
      } else if (sec.lines.length <= 2) {
        bars = 4
      } else if (sec.lines.length <= 4) {
        bars = isChorus ? 8 : (sec.chords >= 6 ? 16 : 8)
      } else {
        bars = 16
      }
      durationSec = Math.round(bars * secondsPerBar * 10) / 10
    }

    const startSec = Math.round(runningSeconds * 10) / 10
    runningSeconds += durationSec
    const endSec = Math.round(runningSeconds * 10) / 10

    return {
      index: idx,
      title: sec.title,
      bars,
      durationSec,
      startSec,
      endSec,
      linesCount: sec.lines.length,
      chordsCount: sec.chords,
      isExplicitDuration: hasExplicit
    }
  })

  const hasCustomTiming = sections.some(s => s.isExplicitDuration)

  return {
    bpm,
    timeSignature,
    totalSeconds: Math.max(10, Math.round(runningSeconds)),
    hasCustomTiming,
    sections
  }
}

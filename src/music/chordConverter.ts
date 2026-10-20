import { parseChord } from './musicTheory'

/**
 * Checks if a token is a valid chord (stripping parentheses/brackets if any)
 */
function isValidChordToken(token: string): boolean {
  const clean = token.replace(/^[([<{]+|[)\]}>,.:]+$/g, '').trim()
  if (!clean) return false
  return parseChord(clean) !== null
}

/**
 * Checks if a line consists predominantly of chords and spaces
 */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Section markers like "[Coro]" or "Intro:"
  if (/^\[?[a-zA-ZáéíóúÁÉÍÓÚ\s]+\]?:?$/.test(trimmed)) {
    const withoutSymbols = trimmed.replace(/[[\]:]/g, '').trim().toUpperCase()
    if (['CORO', 'CHORUS', 'VERSO', 'VERSE', 'INTRO', 'PUENTE', 'BRIDGE', 'OUTRO', 'SOLO'].includes(withoutSymbols)) {
      return false
    }
  }

  // Tokens separated by spaces
  const tokens = trimmed.split(/\s+/).filter(t => t.length > 0)
  if (tokens.length === 0) return false

  let chordCount = 0
  for (const token of tokens) {
    if (isValidChordToken(token)) {
      chordCount++
    }
  }

  // If more than 60% of tokens are valid chords, or if it's 1 token and that token is a chord
  return (chordCount / tokens.length) >= 0.6 || (tokens.length === 1 && chordCount === 1)
}

interface ChordPosition {
  chord: string
  index: number
}

function snapIndexToWord(text: string, rawIndex: number): number {
  if (rawIndex <= 0) return 0
  if (rawIndex >= text.length) return text.length

  if (rawIndex === 0 || text[rawIndex - 1] === ' ') {
    if (text[rawIndex] === ' ') {
      let nextWord = rawIndex
      while (nextWord < text.length && text[nextWord] === ' ') nextWord++
      if (nextWord - rawIndex <= 3) return nextWord
    }
    return rawIndex
  }

  let start = rawIndex
  while (start > 0 && text[start - 1] !== ' ') start--

  let end = rawIndex
  while (end < text.length && text[end] !== ' ') end++

  const wordLen = end - start
  if (rawIndex - start <= 2 || (rawIndex - start) <= Math.floor(wordLen / 3)) {
    return start
  }
  if (end - rawIndex <= 2) {
    return end
  }
  return start
}

function extractChordsWithPositions(line: string): ChordPosition[] {
  const result: ChordPosition[] = []
  // Split hyphenated chords (e.g. Bsus-B -> Bsus B) while preserving approximate index
  const chordRegex = /[A-G][b#]?(?:m|maj|min|sus|dim|aug|add)?[0-9]?(?:\/[A-G][b#]?)?/g
  let match: RegExpExecArray | null

  while ((match = chordRegex.exec(line)) !== null) {
    const cleanChord = match[0].trim()
    if (isValidChordToken(cleanChord)) {
      result.push({
        chord: cleanChord,
        index: match.index
      })
    }
  }

  return result
}

/**
 * Converts traditional 2-line chord/lyric text (from LaCuerda, Ultimate-Guitar, TXT)
 * into standard ChordPro format.
 */
export function convertTraditionalToChordPro(rawText: string, metadata?: { title?: string; artist?: string; key?: string }): string {
  const lines = rawText.split(/\r?\n/)
  const outputLines: string[] = []

  if (metadata?.title) {
    outputLines.push(`{title: ${metadata.title}}`)
  }
  if (metadata?.artist) {
    outputLines.push(`{artist: ${metadata.artist}}`)
  }
  if (metadata?.key) {
    outputLines.push(`{key: ${metadata.key}}`)
  }
  if (metadata?.title || metadata?.artist || metadata?.key) {
    outputLines.push('')
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Detect section header: e.g. "Intro:", "[Coro]", "Verso 1:"
    const sectionMatch = trimmed.match(/^\[?([A-Za-z0-9áéíóúÁÉÍÓÚ\s-]+)\]?:?$/)
    if (sectionMatch && !isChordLine(trimmed)) {
      const sectionName = sectionMatch[1].trim()
      const upper = sectionName.toUpperCase()
      if (['INTRO', 'CORO', 'CHORUS', 'VERSO', 'VERSO 1', 'VERSO 2', 'VERSO 3', 'VERSE', 'VERSE 1', 'VERSE 2', 'PUENTE', 'BRIDGE', 'SOLO', 'OUTRO', 'FINAL'].includes(upper)) {
        outputLines.push(`\n[${sectionName}]`)
        i++
        continue
      }
    }

    if (isChordLine(line)) {
      const chords = extractChordsWithPositions(line)
      const nextLine = (i + 1 < lines.length) ? lines[i + 1] : ''

      // If next line is a lyric line (not empty, not another chord line, not a section header)
      if (nextLine.trim() && !isChordLine(nextLine) && !nextLine.trim().match(/^\[?[A-Za-z0-9áéíóúÁÉÍÓÚ\s-]+\]?:?$/)) {
        const leadLyrics = nextLine.search(/\S/)
        if (leadLyrics === 0 && chords.length > 0 && chords[0].index > 10 && chords.length <= 2) {
          chords[0].index = 0
        }

        const reversedChords = chords
          .map(c => ({ chord: c.chord, index: snapIndexToWord(nextLine, c.index) }))
          .sort((a, b) => b.index - a.index)

        let merged = nextLine
        for (const { chord, index } of reversedChords) {
          if (index >= merged.length) {
            merged = merged + ` [${chord}]`
          } else {
            merged = merged.slice(0, index) + `[${chord}]` + merged.slice(index)
          }
        }

        outputLines.push(merged)
        i += 2 // skip both chord line and lyric line
        continue
      } else {
        // Standalone chord line (e.g. Intro with chords only: "C G Am F")
        const chordProLine = chords.map(c => `[${c.chord}]`).join(' ')
        outputLines.push(chordProLine)
        i++
        continue
      }
    } else {
      outputLines.push(line)
      i++
    }
  }

  return outputLines.join('\n')
}

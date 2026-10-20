import { jsPDF } from 'jspdf'
import type { ParsedSong, NotationSystem } from '../types/song'
import { transposeChord, convertNotation } from '../music/musicTheory'
import { LOGO_GREEN_BASE64 } from './logoBase64'

export interface GenerateSongPdfOptions {
  parsed: ParsedSong
  effectiveKey: string
  capo: number
  tempo?: number
  semitoneShift: number
  notation: NotationSystem
  preferFlats?: boolean
  columns: 1 | 2 | 3
  size?: 'compact' | 'normal' | 'large'
  filename?: string
}

export function generateDirectSongPdf(options: GenerateSongPdfOptions): void {
  const {
    parsed,
    effectiveKey,
    capo,
    tempo,
    semitoneShift,
    notation,
    preferFlats,
    columns = 2,
    size = 'compact',
    filename
  } = options

  // Letter size: 612 x 792 pt
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
    orientation: 'portrait',
    compress: true
  })

  const pageWidth = 612
  const pageHeight = 792
  const leftMargin = 30
  const rightMargin = 30
  const availableWidth = pageWidth - leftMargin - rightMargin // 552 pt

  // ==========================================
  // HEADER
  // ==========================================
  const headerTop = 26
  
  // 1. Logo Lampei (left)
  try {
    doc.addImage(LOGO_GREEN_BASE64, 'PNG', leftMargin, headerTop, 24, 28)
  } catch (e) {
    console.warn('Could not add logo to PDF', e)
  }

  // 2. Brand Name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(24, 24, 27) // zinc-900
  doc.text('chords', leftMargin + 34, headerTop + 14)
  
  const chordsWidth = doc.getTextWidth('chords')
  doc.setTextColor(5, 150, 105) // emerald-600
  doc.text('Lampei', leftMargin + 34 + chordsWidth, headerTop + 14)

  // 3. Song Title & Artist (Center)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(parsed.title || 'Sin Título', pageWidth / 2, headerTop + 13, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text(parsed.artist || '', pageWidth / 2, headerTop + 25, { align: 'center' })

  // 4. Meta Badges (Right: Tono, Capo, Tempo)
  const metaY = headerTop + 16
  let metaRightX = pageWidth - rightMargin

  if (tempo) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(113, 113, 122)
    doc.text(`${tempo} BPM`, metaRightX, metaY, { align: 'right' })
    metaRightX -= doc.getTextWidth(`${tempo} BPM`) + 8
  }

  if (capo > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(180, 83, 9) // amber-700
    doc.text(`Capo ${capo}`, metaRightX, metaY, { align: 'right' })
    metaRightX -= doc.getTextWidth(`Capo ${capo}`) + 8
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(5, 150, 105) // emerald-600
  doc.text(`Tono: ${effectiveKey}`, metaRightX, metaY, { align: 'right' })

  // 5. Dividing line
  const dividerY = headerTop + 34
  doc.setDrawColor(5, 150, 105)
  doc.setLineWidth(1.5)
  doc.line(leftMargin, dividerY, pageWidth - rightMargin, dividerY)

  // ==========================================
  // BODY (LYRICS & CHORDS IN COLUMNS)
  // ==========================================
  const startY = dividerY + 12
  const maxY = pageHeight - 24

  // Column geometry
  const colGap = columns === 3 ? 12 : 20
  const totalGaps = (columns - 1) * colGap
  const colWidth = (availableWidth - totalGaps) / columns

  const getColX = (colIndex: number) => leftMargin + colIndex * (colWidth + colGap)

  // Sizing configuration
  const totalLyricLines = parsed.lines.filter(l => l.type === 'lyric').length
  const isDenseSong = totalLyricLines > 32

  let chordFontSize = 7.5
  let lyricFontSize = 8.5
  let lineStep = 17 // vertical distance from one chord line to the next
  let chordOffset = 8 // distance between chord and lyric text

  if (size === 'compact' || (isDenseSong && size !== 'large')) {
    if (columns === 3) {
      chordFontSize = 7
      lyricFontSize = 7.5
      lineStep = 15
      chordOffset = 7
    } else {
      chordFontSize = isDenseSong ? 7 : 7.5
      lyricFontSize = isDenseSong ? 7.5 : 8.5
      lineStep = isDenseSong ? 15.5 : 17
      chordOffset = isDenseSong ? 7 : 8
    }
  } else if (size === 'large') {
    chordFontSize = 9
    lyricFontSize = 10
    lineStep = 21
    chordOffset = 9.5
  }

  // Draw vertical column separators
  if (columns > 1) {
    doc.setDrawColor(228, 228, 231) // zinc-200
    doc.setLineWidth(0.5)
    for (let c = 1; c < columns; c++) {
      const sepX = getColX(c) - colGap / 2
      doc.line(sepX, startY, sepX, maxY)
    }
  }

  let currentCol = 0
  let currentY = startY

  for (let i = 0; i < parsed.lines.length; i++) {
    const line = parsed.lines[i]

    // Empty lines (compacted to prevent vertical waste)
    if (line.type === 'empty') {
      currentY += isDenseSong ? 4 : 6
      continue
    }

    // Directives
    if (line.type === 'directive') continue

    // Section headers e.g. [CORO], [INTRO], [ESTRIBILLO 1]
    if (line.type === 'comment') {
      // Check if space remains in this column
      if (currentY + 22 > maxY && currentCol < columns - 1) {
        currentCol++
        currentY = startY
      }

      currentY += 4
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(4, 120, 87) // emerald-700
      
      const tagText = (line.comment || '').toUpperCase()
      const colX = getColX(currentCol)
      
      // Little vertical accent bar
      doc.setDrawColor(5, 150, 105)
      doc.setLineWidth(2)
      doc.line(colX, currentY - 6.5, colX, currentY + 1.5)

      doc.text(tagText, colX + 4, currentY)
      currentY += 9
      continue
    }

    // Lyric line with chords or pure lyric
    if (line.type === 'lyric') {
      const hasAnyChords = (line.segments || []).some(s => !!s.chord)
      const hasLyrics = (line.segments || []).some(s => (s.text || '').trim().length > 0)

      // Calculate required vertical height for this line
      const neededHeight = !hasLyrics && hasAnyChords
        ? lineStep * 0.85
        : hasAnyChords
        ? lineStep
        : lineStep * 0.75

      // Check column overflow
      if (currentY + neededHeight > maxY && currentCol < columns - 1) {
        currentCol++
        currentY = startY
      }

      const colX = getColX(currentCol)
      let curX = colX

      if (hasAnyChords && !hasLyrics) {
        // Line has ONLY chords (e.g. [C] [G] [D] or [Intro] [G]  [D]  [C]  [G])
        // Generous spacing between chords ensures they never overlap or collide
        for (const seg of line.segments || []) {
          if (!seg.chord) continue

          let chordText = transposeChord(seg.chord, semitoneShift, preferFlats, notation)
          chordText = convertNotation(chordText, notation)

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(chordFontSize)
          doc.setTextColor(4, 120, 87) // emerald-700
          doc.text(chordText, curX, currentY)

          const cWidth = doc.getTextWidth(chordText)
          const spaceCount = (seg.text || '').replace(/[^\s]/g, '').length
          const chordGap = Math.max(22, (spaceCount || 1) * 16)
          curX += cWidth + chordGap
        }

        currentY += lineStep * 0.85
      } else if (hasAnyChords && hasLyrics) {
        // Line has BOTH chords and lyrics
        for (const seg of line.segments || []) {
          let chordWidth = 0
          const hasWords = (seg.text || '').trim().length > 0

          if (seg.chord) {
            let chordText = transposeChord(seg.chord, semitoneShift, preferFlats, notation)
            chordText = convertNotation(chordText, notation)

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(chordFontSize)
            doc.setTextColor(4, 120, 87) // emerald-700
            const chordDrawX = !hasWords ? curX + 2 : curX
            doc.text(chordText, chordDrawX, currentY)
            chordWidth = doc.getTextWidth(chordText)
          }

          let textWidth = 0
          if (seg.text) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(lyricFontSize)
            doc.setTextColor(17, 24, 39) // zinc-900
            doc.text(seg.text, curX, currentY + chordOffset)
            textWidth = doc.getTextWidth(seg.text)
          }

          // Advance curX ensuring adjacent chords NEVER overlap
          if (seg.chord) {
            const hasWords = (seg.text || '').trim().length > 0
            if (hasWords) {
              // Syllable/word present: advance at least chordWidth + 5pt so next chord is clear
              curX += Math.max(chordWidth + 5, textWidth)
            } else {
              // Chord followed only by spaces: advance chordWidth plus gap
              const spaceCount = (seg.text || '').replace(/[^\s]/g, '').length
              const whitespaceGap = Math.max(14, (spaceCount || 1) * 10)
              curX += chordWidth + whitespaceGap
            }
          } else {
            // Text only segment
            curX += textWidth
          }
        }

        currentY += lineStep
      } else {
        // Pure lyric line without chords
        const lineText = line.segments?.map(s => s.text).join('') || ''
        if (lineText.trim()) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(lyricFontSize)
          doc.setTextColor(17, 24, 39)
          doc.text(lineText, colX, currentY + chordOffset / 2)
          currentY += lineStep * 0.75
        }
      }
    }
  }

  // Save PDF immediately
  const cleanFilename = (filename || `${parsed.title || 'Cancion'} - chordsLampei`).replace(/[\\/:*?"<>|]/g, '')
  doc.save(`${cleanFilename}.pdf`)
}

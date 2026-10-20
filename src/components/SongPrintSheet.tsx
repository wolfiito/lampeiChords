import React from 'react'
import type { ParsedSong, NotationSystem } from '../types/song'
import { transposeChord } from '../music/musicTheory'

interface SongPrintSheetProps {
  parsed: ParsedSong
  effectiveKey: string
  capo: number
  tempo?: number
  notation: NotationSystem
  semitoneShift: number
  preferFlats?: boolean
  columns: 1 | 2 | 3
  fontSizeMode?: 'compact' | 'normal' | 'large'
}

export const SongPrintSheet = React.forwardRef<HTMLDivElement, SongPrintSheetProps>(({
  parsed,
  effectiveKey,
  capo,
  tempo,
  notation,
  semitoneShift,
  preferFlats,
  columns,
  fontSizeMode = 'normal'
}, ref) => {
  // Count lines to choose optimal auto font-size
  const totalLyricLines = parsed.lines.filter(l => l.type === 'lyric').length
  const isLongSong = totalLyricLines > 36
  const isVeryLongSong = totalLyricLines > 55

  // Determine font size (Base Arial 12)
  let calculatedFontSize = '11.5pt'
  let calculatedChordSize = '10pt'
  let calculatedLineHeight = '1.22'

  if (fontSizeMode === 'compact' || isVeryLongSong) {
    calculatedFontSize = '9pt'
    calculatedChordSize = '8pt'
    calculatedLineHeight = '1.14'
  } else if (fontSizeMode === 'normal') {
    if (columns === 3 || isLongSong) {
      calculatedFontSize = '10pt'
      calculatedChordSize = '9pt'
      calculatedLineHeight = '1.18'
    } else {
      calculatedFontSize = '11.5pt'
      calculatedChordSize = '10pt'
      calculatedLineHeight = '1.22'
    }
  } else if (fontSizeMode === 'large') {
    calculatedFontSize = '13pt'
    calculatedChordSize = '11pt'
    calculatedLineHeight = '1.28'
  }

  const columnClass = columns === 3
    ? 'columns-3 gap-4'
    : columns === 2
    ? 'columns-2 gap-6'
    : 'columns-1'

  return (
    <div
      ref={ref}
      id="printable-song-sheet"
      className="bg-white text-black p-4 sm:p-6 w-full max-w-[800px] mx-auto box-border"
      style={{
        fontFamily: "Arial, Helvetica, -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#111827',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Header with Lampei Logo and chordsLampei Branding */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-emerald-600 gap-3">
        {/* Left: Logo & Brand */}
        <div className="flex items-center gap-2">
          <img
            src="/logo-green.png"
            alt="Logo Lampei"
            className="h-8 w-auto object-contain shrink-0"
          />
          <div>
            <span className="font-black text-sm tracking-tight text-zinc-900 block leading-tight">
              chords<span className="text-emerald-600">Lampei</span>
            </span>
          </div>
        </div>

        {/* Center: Song Title & Artist */}
        <div className="text-center flex-1 min-w-0 px-2">
          <h1 className="font-extrabold text-base sm:text-lg text-black truncate leading-tight">
            {parsed.title}
          </h1>
          <p className="text-xs text-zinc-600 font-medium truncate leading-tight">
            {parsed.artist}
          </p>
        </div>

        {/* Right: Key, Capo, Tempo badges */}
        <div className="flex items-center gap-2 text-right shrink-0 text-xs">
          <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
            Tono: {effectiveKey}
          </span>
          {capo > 0 && (
            <span className="bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200">
              Capo {capo}
            </span>
          )}
          {tempo && (
            <span className="text-zinc-500 font-semibold text-[11px]">
              {tempo} BPM
            </span>
          )}
        </div>
      </div>

      {/* Song Body in Columns */}
      <div
        className={`${columnClass}`}
        style={{
          fontSize: calculatedFontSize,
          lineHeight: calculatedLineHeight,
          columnRule: '1px dashed #e5e7eb'
        }}
      >
        {parsed.lines.map((line, idx) => {
          if (line.type === 'empty') {
            return <div key={idx} className="h-1.5" />
          }

          if (line.type === 'comment') {
            if (line.isRepeat) {
              return (
                <div
                  key={idx}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-2 py-1 my-1.5 text-[11px] font-bold flex items-center gap-1.5 select-none break-inside-avoid"
                >
                  <span>⤴</span>
                  <span>[{line.comment?.toUpperCase()}]</span>
                  <span className="font-normal text-emerald-700 text-[10px]">(Repite {line.parentTitle || line.comment})</span>
                </div>
              )
            }
            return (
              <div
                key={idx}
                className="font-bold uppercase tracking-wider text-emerald-700 border-l-2 border-emerald-600 pl-1.5 mt-2 mb-1 text-[11px] select-none break-after-avoid"
              >
                {line.comment}
              </div>
            )
          }

          if (line.type === 'directive') {
            return null
          }

          const hasAnyChords = line.segments?.some(s => !!s.chord)
          const hasLyrics = line.segments?.some(s => (s.text || '').trim().length > 0)
          const isChordOnlyLine = hasAnyChords && !hasLyrics

          return (
            <div
              key={idx}
              className={`flex flex-wrap items-end my-px font-mono tracking-wide break-inside-avoid ${
                isChordOnlyLine ? 'gap-3 sm:gap-4 py-0.5' : ''
              }`}
            >
              {line.segments?.map((seg, sIdx) => {
                const rawChord = seg.chord
                let chordDisplay = ''
                if (rawChord) {
                  chordDisplay = transposeChord(rawChord, semitoneShift, preferFlats, notation)
                }

                return (
                  <span
                    key={sIdx}
                    className="inline-flex flex-col items-start leading-none mr-0 whitespace-pre"
                  >
                    {chordDisplay ? (
                      <span
                        className="font-sans font-extrabold text-emerald-700"
                        style={{ fontSize: calculatedChordSize, lineHeight: 1 }}
                      >
                        {chordDisplay}
                      </span>
                    ) : (
                      <span className="h-2.5 opacity-0 select-none">.</span>
                    )}
                    <span className="font-sans whitespace-pre text-zinc-900">
                      {seg.text || (chordDisplay ? ' ' : '')}
                    </span>
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
})

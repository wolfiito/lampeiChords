import React, { useState, useRef } from 'react'
import { Save, ArrowLeft, Wand2, Eye, EyeOff, PlusCircle } from 'lucide-react'
import type { Song } from '../types/song'
import { convertTraditionalToChordPro } from '../music/chordConverter'
import { parseChordPro } from '../music/chordPro'

interface SongEditorProps {
  song: Song
  onSave: (updated: Partial<Song>) => void
  onCancel: () => void
}

export const SongEditor: React.FC<SongEditorProps> = ({ song, onSave, onCancel }) => {
  const [title, setTitle] = useState(song.title)
  const [artist, setArtist] = useState(song.artist)
  const [originalKey, setOriginalKey] = useState(song.originalKey)
  const [capo, setCapo] = useState<number>(song.capo || 0)
  const [tempo, setTempo] = useState<number | undefined>(song.tempo)
  const [tags, setTags] = useState<string>(song.tags ? song.tags.join(', ') : '')
  const [content, setContent] = useState(song.content)
  const [showPreview, setShowPreview] = useState(true)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSave = () => {
    onSave({
      title,
      artist,
      originalKey,
      currentKey: originalKey,
      capo,
      tempo: tempo ? Number(tempo) : undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      content
    })
  }

  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const current = textarea.value

    const newContent = current.substring(0, start) + textToInsert + current.substring(end)
    setContent(newContent)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length)
    }, 10)
  }

  const handleConvertTraditional = () => {
    const converted = convertTraditionalToChordPro(content, {
      title,
      artist,
      key: originalKey
    })
    setContent(converted)
  }

  const quickChords = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb', 'Ab', 'F#', 'Am', 'Em', 'Dm', 'G7', 'C7', 'D7']
  const quickSections = [
    '[Intro]',
    '[Intro]{30}',
    '[Verso 1]',
    '[Verso 1]{25}',
    '[Coro]',
    '[Coro]{40}',
    '[Puente]',
    '[Outro]'
  ]

  const liveParsed = parseChordPro(content)

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-zinc-800 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition"
            title="Volver sin guardar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Editor de Canción</h2>
            <p className="text-xs text-emerald-400">Formato ChordPro</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center gap-1.5"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showPreview ? 'Ocultar Previa' : 'Ver Previa'}</span>
          </button>

          <button
            onClick={handleConvertTraditional}
            title="Convierte canciones pegadas con acordes arriba y letra abajo a ChordPro"
            className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Auto-formato ChordPro</span>
            <span className="md:hidden">Auto-formato</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 sm:px-5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Responsive Metadata Form Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 mb-4">
        <div className="col-span-2 sm:col-span-2 lg:col-span-2">
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Título</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="col-span-2 sm:col-span-1 lg:col-span-1">
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Artista</label>
          <input
            type="text"
            value={artist}
            onChange={e => setArtist(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Tono</label>
          <input
            type="text"
            value={originalKey}
            onChange={e => setOriginalKey(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Cejilla / Capo</label>
          <input
            type="number"
            min="0"
            max="12"
            value={capo}
            onChange={e => setCapo(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-amber-400 font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-xs font-semibold text-zinc-400 mb-1">BPM / Tempo</label>
          <input
            type="number"
            min="40"
            max="260"
            value={tempo || ''}
            onChange={e => setTempo(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="120"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="col-span-2 sm:col-span-2 lg:col-span-4">
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Etiquetas (separadas por coma)</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Alabanza, Favoritos, Acústico"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Quick Chord Insertion Bar (Scrollable on touch) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 sm:p-3 mb-4">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-zinc-400 font-bold uppercase whitespace-nowrap flex items-center gap-1">
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> Insertar:
          </span>

          {quickChords.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => insertTextAtCursor(`[${c}]`)}
              className="px-2 sm:px-2.5 py-1 bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-200 font-bold text-xs rounded-lg border border-zinc-700 transition shrink-0"
            >
              {c}
            </button>
          ))}

          <div className="w-px h-5 bg-zinc-800 shrink-0 mx-1" />

          {quickSections.map(sec => (
            <button
              key={sec}
              type="button"
              onClick={() => insertTextAtCursor(`\n${sec}\n`)}
              className="px-2 py-1 bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-400 font-semibold text-xs rounded-lg border border-zinc-700 transition shrink-0"
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Section Timing & Repeat Guidance Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 sm:p-3.5 mb-4 text-xs text-zinc-300 flex items-start gap-2.5">
        <span className="text-base shrink-0 select-none">⏱</span>
        <div className="space-y-1">
          <div>
            <span className="font-bold text-emerald-400">Control de tiempo manual y saltos:</span>
            {' '}Puedes indicar los segundos escribiendo <code className="bg-zinc-800 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">[Intro]{'{30}'}</code> o <code className="bg-zinc-800 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">[Verso 1]{'{25}'}</code>.
          </div>
          <div>
            <span className="font-bold text-amber-300">Ahorro de espacio y repeticiones:</span>
            {' '}Cuando una parte se repita (ej. el Coro), solo escribe <code className="bg-zinc-800 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">[Coro]</code> sin volver a escribir la letra. El auto-scroll regresará automáticamente al Coro para que lo toques y luego brincará al verso siguiente.
          </div>
        </div>
      </div>

      {/* Main Editor & Live Preview */}
      <div className={`grid gap-4 sm:gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Editor Area */}
        <div className="flex flex-col">
          <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-1.5">
            Letra y Acordes (ChordPro):
          </label>
          <textarea
            ref={textareaRef}
            rows={18}
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full bg-zinc-950 font-mono text-xs sm:text-sm text-zinc-200 border border-zinc-800 rounded-2xl p-3 sm:p-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-y"
            placeholder="[Intro]{30}&#10;[G]  [D]  [C]  [G]&#10;&#10;[Verso 1]{25}&#10;Por encima del so[G]l..."
          />
        </div>

        {/* Live Preview Area */}
        {showPreview && (
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-1.5">
              Vista Previa en Vivo:
            </span>
            <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 sm:p-5 overflow-y-auto max-h-[500px] leading-loose">
              {liveParsed.lines.map((line, idx) => {
                if (line.type === 'empty') return <div key={idx} className="h-3 sm:h-4" />
                if (line.type === 'comment') {
                  return (
                    <div key={idx} className="font-bold text-xs uppercase text-emerald-400 my-1.5 flex items-center justify-between">
                      <span>{line.comment}</span>
                      {line.sectionDuration && (
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 font-mono font-bold px-2 py-0.5 rounded-full border border-zinc-700">
                          ⏱ {line.sectionDuration}s
                        </span>
                      )}
                    </div>
                  )
                }
                return (
                  <div key={idx} className="flex flex-wrap items-end my-0.5 font-mono text-xs sm:text-sm">
                    {line.segments?.map((seg, sIdx) => (
                      <span key={sIdx} className="inline-flex flex-col items-start leading-none mr-0">
                        {seg.chord ? (
                          <span className="text-emerald-400 font-black text-[11px] sm:text-xs">{seg.chord}</span>
                        ) : (
                          <span className="h-3 select-none opacity-0">.</span>
                        )}
                        <span className="text-zinc-200">{seg.text || ' '}</span>
                      </span>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

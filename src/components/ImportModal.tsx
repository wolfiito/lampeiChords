import React, { useState } from 'react'
import { X, Wand2, FileText, Upload, Check } from 'lucide-react'
import { convertTraditionalToChordPro } from '../music/chordConverter'
import type { Song } from '../types/song'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveSong: (song: Partial<Song>) => void
  onImportLibrary: (json: string) => boolean
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSaveSong,
  onImportLibrary
}) => {
  const [mode, setMode] = useState<'traditional' | 'chordpro' | 'file'>('traditional')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [key, setKey] = useState('C')
  const [rawText, setRawText] = useState('')
  const [convertedText, setConvertedText] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState('')

  if (!isOpen) return null

  const handleConvert = () => {
    if (!rawText.trim()) return
    const chordpro = convertTraditionalToChordPro(rawText, {
      title: title || 'Canción Importada',
      artist: artist || 'Artista',
      key: key || 'C'
    })
    setConvertedText(chordpro)
  }

  const handleSaveImportedSong = () => {
    const finalContent = mode === 'traditional'
      ? (convertedText || convertTraditionalToChordPro(rawText, { title, artist, key }))
      : rawText

    onSaveSong({
      title: title || 'Canción Importada',
      artist: artist || 'Artista',
      originalKey: key || 'C',
      currentKey: key || 'C',
      content: finalContent
    })
    onClose()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const content = event.target?.result as string
      if (file.name.endsWith('.json')) {
        const ok = onImportLibrary(content)
        if (ok) {
          setFeedbackMsg('¡Biblioteca restaurada con éxito!')
          setTimeout(() => {
            onClose()
          }, 1200)
        } else {
          setFeedbackMsg('Error: Archivo JSON no válido.')
        }
      } else {
        setRawText(content)
        setTitle(file.name.replace(/\.[^/.]+$/, ''))
        setMode('chordpro')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-[94vw] sm:max-w-2xl bg-zinc-900 border border-emerald-900/60 rounded-3xl shadow-2xl p-4 sm:p-6 text-zinc-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Importador Inteligente de Canciones</h3>
              <p className="text-xs text-emerald-400 font-medium">Pega acordes de LaCuerda o archivos de canciones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 mt-4 mb-4 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setMode('traditional')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'traditional'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Pegar Acordes Web (LaCuerda/TXT)
          </button>
          <button
            onClick={() => setMode('chordpro')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'chordpro'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            ChordPro Directo
          </button>
          <button
            onClick={() => setMode('file')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'file'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Subir Archivo (.txt, .cho, .json)
          </button>
        </div>

        {/* Inputs */}
        <div className="overflow-y-auto space-y-4 flex-1 pr-1">
          {mode === 'file' ? (
            <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-emerald-500/50 transition">
              <Upload className="w-10 h-10 text-emerald-400 mb-3" />
              <p className="font-semibold text-sm text-zinc-200 mb-1">
                Selecciona un archivo de tu equipo
              </p>
              <p className="text-xs text-zinc-400 mb-4 max-w-sm">
                Soporta archivos de texto con acordes, cancioneros ChordPro (.cho, .txt) o respaldo completo de biblioteca (.json).
              </p>
              <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition">
                Examinar archivo
                <input
                  type="file"
                  accept=".txt,.cho,.chordpro,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {feedbackMsg && (
                <p className="mt-4 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                  {feedbackMsg}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Título</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ej. Rayando el Sol"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Artista</label>
                  <input
                    type="text"
                    value={artist}
                    onChange={e => setArtist(e.target.value)}
                    placeholder="Ej. Maná"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Tono Principal</label>
                  <input
                    type="text"
                    value={key}
                    onChange={e => setKey(e.target.value)}
                    placeholder="Ej. G o Sol"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-400">
                    {mode === 'traditional'
                      ? 'Pega la letra con los acordes arriba (formato tradicional de internet):'
                      : 'Contenido en formato ChordPro:'}
                  </label>
                  {mode === 'traditional' && (
                    <button
                      onClick={handleConvert}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Probar Conversión
                    </button>
                  )}
                </div>

                <textarea
                  rows={mode === 'traditional' && convertedText ? 6 : 10}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={
                    mode === 'traditional'
                      ? `Am          F             C        G\nDe música ligera nada nos libra...`
                      : `{title: Mi Canción}\n[Am]De música [F]ligera...`
                  }
                  className="w-full bg-zinc-950 font-mono text-xs text-zinc-200 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              {mode === 'traditional' && convertedText && (
                <div>
                  <span className="text-xs font-semibold text-emerald-400 mb-1 block">
                    ✓ Vista previa de acordes convertidos a ChordPro:
                  </span>
                  <pre className="w-full bg-zinc-950 font-mono text-xs text-emerald-300/90 border border-emerald-500/30 rounded-xl p-3 max-h-36 overflow-y-auto">
                    {convertedText}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {mode !== 'file' && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800 mt-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveImportedSong}
              disabled={!rawText.trim()}
              className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Guardar en mi Biblioteca
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

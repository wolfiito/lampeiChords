import React, { useState } from 'react'
import { Download, Printer, X, Loader2, Sparkles } from 'lucide-react'

interface PrintModalProps {
  isOpen: boolean
  onClose: () => void
  onExportPdf: (options: { columns: 1 | 2 | 3; size: 'compact' | 'normal' | 'large' }) => Promise<void>
  onPrintBrowser: (options: { columns: 1 | 2 | 3; size: 'compact' | 'normal' | 'large' }) => void
  songTitle: string
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  onExportPdf,
  onPrintBrowser,
  songTitle
}) => {
  const [columns, setColumns] = useState<1 | 2 | 3>(2)
  const [size, setSize] = useState<'compact' | 'normal' | 'large'>('normal')
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true)
      await onExportPdf({ columns, size })
      setIsExporting(false)
      onClose()
    } catch (err) {
      console.error('Error al generar PDF', err)
      setIsExporting(false)
    }
  }

  const handleBrowserPrint = () => {
    onPrintBrowser({ columns, size })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-[94vw] sm:max-w-md bg-zinc-900 border border-emerald-900/60 rounded-3xl shadow-2xl p-4 sm:p-6 text-zinc-100 max-h-[92vh] overflow-y-auto">
        {/* Header with Lampei Logo */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Lampei"
              className="h-9 w-auto object-contain shrink-0 drop-shadow-[0_2px_10px_rgba(16,185,129,0.35)]"
            />
            <div>
              <h3 className="font-bold text-lg text-white">
                Guardar en PDF A4 <span className="text-emerald-400 text-xs font-normal">(1 Hoja)</span>
              </h3>
              <p className="text-xs text-zinc-400 font-medium">chords<strong className="text-emerald-400">Lampei</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="my-4 p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs text-emerald-200">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Canción: <strong className="text-white">{songTitle}</strong>. 
            Formato <strong>Hoja A4</strong> con <strong>Base Arial 12</strong> y distribución por cuadros de sección. Garantiza <strong>1 sola página</strong> sin cortar estrofas.
          </span>
        </div>

        {/* Columns Selector */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Distribución en la Hoja:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setColumns(2)}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center ${
                columns === 2
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="font-bold text-sm">2 Columnas</span>
              <span className="text-[10px] opacity-80 mt-0.5">⭐ A4 1 Página</span>
            </button>

            <button
              onClick={() => setColumns(3)}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center ${
                columns === 3
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="font-bold text-sm">3 Columnas</span>
              <span className="text-[10px] opacity-80 mt-0.5">Canción larga</span>
            </button>

            <button
              onClick={() => setColumns(1)}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center ${
                columns === 1
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="font-bold text-sm">1 Columna</span>
              <span className="text-[10px] opacity-80 mt-0.5">Tradicional</span>
            </button>
          </div>
        </div>

        {/* Font Size Selector */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Tipografía (Base Arial 12):
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'compact', 'large'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setSize(opt)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center ${
                  size === opt
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                <span>{opt === 'normal' ? 'Arial 12' : opt === 'compact' ? 'Compacto' : 'Grande'}</span>
                <span className="text-[10px] opacity-75 font-normal mt-0.5">
                  {opt === 'normal' ? '⭐ Auto A4' : opt === 'compact' ? '10.5 pt' : '14 pt'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions: Download PDF directly (primary) or Browser Print */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando PDF en 1 hoja...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar Archivo PDF (1 Hoja)</span>
              </>
            )}
          </button>

          <button
            onClick={handleBrowserPrint}
            disabled={isExporting}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs rounded-xl border border-zinc-700 transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>O abrir diálogo de impresión del navegador</span>
          </button>
        </div>
      </div>
    </div>
  )
}

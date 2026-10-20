import React, { useState } from 'react'
import { Download, Printer, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'

interface PrintModalProps {
  isOpen: boolean
  onClose: () => void
  onExportPdf: (options: { columns: 1 | 2; size?: 'normal' }) => Promise<void>
  onPrintBrowser: (options: { columns: 1 | 2; size?: 'normal' }) => void
  songTitle: string
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  onExportPdf,
  onPrintBrowser,
  songTitle
}) => {
  const [columns, setColumns] = useState<1 | 2>(2)
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true)
      await onExportPdf({ columns, size: 'normal' })
      setIsExporting(false)
      onClose()
    } catch (err) {
      console.error('Error al generar PDF', err)
      setIsExporting(false)
    }
  }

  const handleBrowserPrint = () => {
    onPrintBrowser({ columns, size: 'normal' })
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
            Formato <strong>Hoja A4</strong> con <strong>Arial 12 y Auto-Ajuste Inteligente</strong> para garantizar siempre <strong>1 sola página</strong>.
          </span>
        </div>

        {/* Columns Selector (Only 1 or 2 columns) */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Distribución en la Hoja:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setColumns(2)}
              className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                columns === 2
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span>2 Columnas</span>
                {columns === 2 && <CheckCircle2 className="w-4 h-4 text-emerald-200" />}
              </div>
              <span className="text-[11px] opacity-90 text-emerald-100 font-medium">⭐ Recomendado (1 Hoja)</span>
            </button>

            <button
              onClick={() => setColumns(1)}
              className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                columns === 1
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span>1 Columna</span>
                {columns === 1 && <CheckCircle2 className="w-4 h-4 text-emerald-200" />}
              </div>
              <span className="text-[11px] opacity-80 text-zinc-400">Tradicional</span>
            </button>
          </div>
        </div>

        {/* Fixed Typography Badge (Always Arial 12 Auto-Ajuste) */}
        <div className="mb-5 p-3 bg-zinc-800/70 border border-zinc-700/70 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Tipografía: <strong className="text-white">Arial 12</strong></span>
          </div>
          <span className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg">
            Auto-Ajuste Inteligente A4
          </span>
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
                <span>Generando PDF A4 en 1 hoja...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar Archivo PDF A4 (1 Hoja)</span>
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

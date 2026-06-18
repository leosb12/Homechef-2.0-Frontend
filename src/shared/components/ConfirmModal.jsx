import { createPortal } from 'react-dom'

export default function ConfirmModal({ open, title, description, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onClose, isDestructive = false }) {
  if (!open) return null

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative w-full max-w-sm rounded-[24px] border p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--panel)',
          borderColor: 'rgba(148, 163, 184, 0.18)',
        }}
      >
        <h3 className="text-xl font-bold">{title}</h3>
        {description && (
          <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        )}
        
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border px-4 py-2.5 font-semibold transition hover:bg-gray-50/5"
            style={{ borderColor: 'rgba(148, 163, 184, 0.28)' }}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`flex-1 rounded-xl px-4 py-2.5 font-semibold text-white transition ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}

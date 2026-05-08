import type { AIAccessStatus } from '../../types/aiSubscription'

interface Props {
  access: AIAccessStatus | null
}

export default function AIAccessBanner({ access }: Props) {
  const enabled = Boolean(access?.can_use_ai)
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: enabled ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)',
        backgroundColor: enabled ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
      }}
    >
      <div>
        <p className="font-semibold">{enabled ? 'Funciones IA habilitadas' : 'Funciones IA bloqueadas'}</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {enabled ? 'El cocinero puede usar las herramientas premium de IA.' : access?.reason || access?.message || 'Activa o renueva una suscripcion IA para continuar.'}
        </p>
      </div>
      <span className="text-sm font-semibold">{enabled ? 'ACCESO ACTIVO' : 'SIN ACCESO'}</span>
    </div>
  )
}

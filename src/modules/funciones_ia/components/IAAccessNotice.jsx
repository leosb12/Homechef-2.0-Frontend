import { useNavigate } from 'react-router-dom'

const FALLBACK_MESSAGES = {
  SUSCRIPCION_INEXISTENTE: 'Necesitas una suscripción activa para utilizar funciones IA.',
  SUSCRIPCION_INACTIVA: 'Tu suscripción no está activa o ha vencido.',
  PLAN_SIN_IA: 'Tu plan actual no incluye funciones IA.',
  LIMITE_IA_SUPERADO: 'Has alcanzado el límite de uso IA permitido por tu plan.',
  FUNCION_IA_NO_EXISTE: 'La función IA solicitada no existe.',
  IA_NO_IMPLEMENTADA: 'La función IA aún no está disponible. Estará habilitada próximamente.',
  ROL_NO_AUTORIZADO: 'Solo los cocineros pueden utilizar funciones IA.',
  USUARIO_NO_AUTENTICADO: 'Debes iniciar sesión para utilizar funciones IA.',
}

const PLAN_ACTION_LABELS = {
  SUSCRIPCION_INEXISTENTE: 'Ver planes IA',
  SUSCRIPCION_INACTIVA: 'Renovar o ver planes IA',
  PLAN_SIN_IA: 'Mejorar plan',
  LIMITE_IA_SUPERADO: 'Ver planes IA',
}

export function getIAAccessMessage(response) {
  if (!response) return ''
  return FALLBACK_MESSAGES[response.codigo] || response.mensaje || 'No se pudo validar el acceso a la función IA.'
}

export default function IAAccessNotice({ response, onClose, variant = 'modal' }) {
  const navigate = useNavigate()
  if (!response) return null

  const message = getIAAccessMessage(response)
  const canGoPlans = Boolean(PLAN_ACTION_LABELS[response.codigo])
  const canLogin = response.codigo === 'USUARIO_NO_AUTENTICADO'

  const content = (
    <div className="w-full max-w-lg rounded-xl border p-5 shadow-xl space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-2)' }}>Funciones IA</p>
        <h3 className="text-xl font-bold">Acceso a IA</h3>
        <p style={{ color: 'var(--muted)' }}>{message}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
        {canGoPlans ? (
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white font-semibold"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            onClick={() => navigate('/chef/ai-subscription')}
          >
            {PLAN_ACTION_LABELS[response.codigo]}
          </button>
        ) : null}
        {canLogin ? (
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white font-semibold"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            onClick={() => navigate('/login')}
          >
            Iniciar sesión
          </button>
        ) : null}
        {onClose ? (
          <button type="button" className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--line)' }} onClick={onClose}>
            Cerrar
          </button>
        ) : null}
      </div>
    </div>
  )

  if (variant === 'inline') return content

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.50)' }}>
      {content}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getConflicts } from '../services/offline_queue'
import { useConnectivity } from '../hooks/useConnectivity'
import { useAuthSession } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session'
import { useAdminSyncStore } from '../../modules/confianza_administracion_seguridad/services/adminSyncStore'
import { getPendingMutations } from '../../modules/confianza_administracion_seguridad/services/adminOfflineRepository'

export default function OfflineConflictsPanel() {
  const role = useAuthSession((state) => state.role)
  
  // Standard sync hooks
  const { conflictCount: standardConflictCount } = useConnectivity()
  // Admin sync hooks
  const { conflictCount: adminConflictCount } = useAdminSyncStore()
  
  const isAdmin = role === 'ADMINISTRADOR'
  const conflictCount = isAdmin ? adminConflictCount : standardConflictCount
  const [conflicts, setConflicts] = useState([])

  useEffect(() => {
    if (!conflictCount) {
      setConflicts([])
      return
    }
    
    if (isAdmin) {
      getPendingMutations()
        .then((queue) => {
          const list = queue.filter((m) => m.status === 'conflict')
          setConflicts(list)
        })
        .catch(() => setConflicts([]))
    } else {
      getConflicts().then(setConflicts).catch(() => setConflicts([]))
    }
  }, [conflictCount, isAdmin])

  if (!conflictCount) return null

  return (
    <section className="mb-4 rounded-xl border p-3 text-sm" style={{ borderColor: '#f97316', backgroundColor: 'var(--panel-soft)' }}>
      <p className="font-semibold" style={{ color: '#f97316' }}>
        Hay conflictos de sincronización offline detectados:
      </p>
      <div className="mt-2 grid gap-2">
        {conflicts.slice(0, 5).map((conflict) => (
          <div key={conflict.id || conflict.operation_id} className="rounded-lg border p-3 text-white" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <p className="font-bold text-orange-400 uppercase tracking-wide text-xs">
              Módulo: {conflict.entity || 'General'}
            </p>
            <p className="mt-1 font-semibold">
              Conflicto en: {conflict.action === 'toggle_block' ? 'Bloquear/desbloquear usuario' : conflict.action === 'validate' ? 'Validar cocinero' : conflict.action}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              El registro fue modificado en el servidor. Por favor, vuelve a sincronizar para obtener los cambios del servidor.
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}


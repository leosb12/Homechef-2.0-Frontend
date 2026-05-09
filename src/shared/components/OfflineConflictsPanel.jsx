import { useEffect, useState } from 'react'
import { getConflicts } from '../services/offline_queue'
import { useConnectivity } from '../hooks/useConnectivity'

export default function OfflineConflictsPanel() {
  const { conflictCount } = useConnectivity()
  const [conflicts, setConflicts] = useState([])

  useEffect(() => {
    if (!conflictCount) {
      setConflicts([])
      return
    }
    getConflicts().then(setConflicts).catch(() => setConflicts([]))
  }, [conflictCount])

  if (!conflictCount) return null

  return (
    <section className="mb-4 rounded-xl border p-3 text-sm" style={{ borderColor: '#f97316', backgroundColor: 'var(--panel-soft)' }}>
      <p className="font-semibold" style={{ color: '#f97316' }}>
        Hay conflictos pendientes de sincronizacion
      </p>
      <div className="mt-2 grid gap-2">
        {conflicts.slice(0, 3).map((conflict) => (
          <div key={conflict.operation_id} className="rounded-lg border p-2" style={{ borderColor: 'var(--line)' }}>
            <p className="font-medium">{conflict.entity || 'Entidad'} - {conflict.reason || 'conflict'}</p>
            <p style={{ color: 'var(--muted)' }}>Operacion: {conflict.operation_id}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

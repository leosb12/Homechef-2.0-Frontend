import React, { useEffect, useState } from 'react'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import { getLastSync } from '../../../shared/services/offline_queue'

export default function ChefOfflineBanner() {
  const { isOnline, pendingCount } = useConnectivity()
  const [lastSync, setLastSyncDate] = useState(null)

  useEffect(() => {
    if (!isOnline) {
      getLastSync()
        .then((val) => {
          if (val) setLastSyncDate(new Date(val).toLocaleString())
        })
        .catch(console.error)
    }
  }, [isOnline])

  if (isOnline) return null

  return (
    <div
      className="rounded-2xl border p-4 mb-6 flex flex-col gap-2 transition-all duration-300 animate-in fade-in slide-in-from-top-2"
      style={{
        borderColor: 'rgba(245, 158, 11, 0.25)',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        color: '#d97706',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2.5 font-bold text-sm">
        <svg className="w-5 h-5 flex-shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Sin conexión. Mostrando datos de tu última sincronización.</span>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs mt-0.5 opacity-90">
        <div>
          Última sincronización: <span className="font-bold">{lastSync || 'Nunca'}</span>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
            <span>Hay <span className="font-bold text-indigo-600 dark:text-indigo-400">{pendingCount}</span> acciones pendientes de sincronizar en la cola.</span>
          </div>
        )}
      </div>
    </div>
  )
}

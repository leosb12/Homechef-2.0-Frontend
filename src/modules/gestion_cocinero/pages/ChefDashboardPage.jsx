import { useEffect, useState } from 'react'
import { fetchChefDashboard } from '../services/chef_service'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import { logDebug } from '../../../shared/services/debug_logger'
import { readScreenSnapshot, formatSnapshotDate } from '../../../shared/services/screen_cache'
import { getMetadata } from '../../../shared/services/offline_db'
import ChefOfflineBanner from '../components/ChefOfflineBanner'

export default function ChefDashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [isOfflineData, setIsOfflineData] = useState(false)
  const [cachedAt, setCachedAt] = useState('')
  const { isOnline, connectionState } = useConnectivity()

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setError('')
      logDebug('DEBUG_DASHBOARD', 'Iniciando carga del dashboard del cocinero...', {
        connectionState,
        isOnline
      })

      try {
        const responseData = await fetchChefDashboard()
        if (!active) return

        const isOffline = !!responseData?.__offline
        const cachedTime = responseData?.__cached_at || ''

        logDebug('DEBUG_DASHBOARD', 'Dashboard cargado con éxito', {
          origen: isOffline ? 'IndexedDB (Offline Fallback)' : 'Network',
          cachedAt: cachedTime,
          statusHTTP: isOffline ? 'N/A' : 200,
          responsePayload: responseData
        })

        setData(responseData)
        setIsOfflineData(isOffline)
        setCachedAt(cachedTime)
      } catch (err) {
        if (!active) return

        const status = err?.response?.status || err?.status || 'N/A'
        const errorMsg = err?.response?.data?.detail || err?.message || 'Error de red'

        logDebug('DEBUG_DASHBOARD', 'Fallo al cargar el dashboard desde el servidor', {
          endpoint: '/chef/dashboard/',
          statusHTTP: status,
          error: errorMsg,
          connectionState
        })

        // Intentar recuperar el último snapshot local de forma explícita
        try {
          const snapshot = await readScreenSnapshot('chef.dashboard')
          const fullRecord = await getMetadata('screen_snapshot:chef.dashboard')
          
          if (!active) return

          if (snapshot) {
            logDebug('DEBUG_DASHBOARD', 'Recuperado snapshot local del dashboard tras fallo de red', {
              cachedAt: fullRecord?.cached_at,
              snapshot
            })
            setData(snapshot)
            setIsOfflineData(true)
            setCachedAt(fullRecord?.cached_at || '')
          } else {
            logDebug('DEBUG_DASHBOARD', 'No se encontró ningún snapshot local en IndexedDB para el dashboard')
            setData(null)
            setError('Dashboard no disponible sin conexión. Tus acciones pendientes se mantienen guardadas.')
          }
        } catch (snapErr) {
          logDebug('DEBUG_DASHBOARD', 'Error al leer el snapshot de IndexedDB', { error: snapErr.message })
          if (active) {
            setData(null)
            setError('Dashboard no disponible sin conexión. Tus acciones pendientes se mantienen guardadas.')
          }
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [connectionState])

  if (error) {
    return (
      <section className="space-y-4">
        <ChefOfflineBanner />
        <p className="rounded-xl border p-4 text-center text-sm font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--red)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
          {error}
        </p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="space-y-4">
        <ChefOfflineBanner />
        <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>Cargando dashboard...</p>
      </section>
    )
  }

  return (
    <section className="space-y-4 animate-in fade-in duration-200">
      <ChefOfflineBanner />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Dashboard cocinero</h1>
        {isOfflineData && (
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
            style={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}
          >
            ⚠️ Mostrando datos locales {cachedAt ? `(guardados el ${formatSnapshotDate(cachedAt)})` : ''}
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Card label="Ventas totales" value={`Bs ${data?.sales_total ?? 0}`} />
        <Card label="Ingresos" value={`Bs ${data?.income_total ?? 0}`} />
        <Card label="Comisiones" value={`Bs ${data?.commissions_total ?? 0}`} />
        <Card label="Platos publicados" value={`${data?.dishes_published ?? 0}/${data?.dishes_total ?? 0}`} />
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <h2 className="text-xl font-semibold mb-2">Sugerencias</h2>
        {(!data?.suggestions || data.suggestions.length === 0) ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay sugerencias disponibles en este momento.</p>
        ) : (
          <ul className="list-disc pl-6 space-y-1">
            {data.suggestions.map((s) => <li key={s}>{s}</li>)}
          </ul>
        )}
      </div>
    </section>
  )
}

function Card({ label, value }) {
  return (
    <div className="rounded-xl border p-4 transition-all duration-300 hover:shadow-md hover:border-[var(--brand)]" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

import { formatSnapshotDate } from '../services/screen_cache'

export default function LastLoadedNotice({ cachedAt, className = '' }) {
  const label = formatSnapshotDate(cachedAt)
  return (
    <div
      className={`rounded-xl border p-3 text-sm ${className}`.trim()}
      style={{
        borderColor: 'rgba(245,158,11,.24)',
        backgroundColor: 'rgba(245,158,11,.08)',
        color: '#92400e',
      }}
    >
      Sin conexion. Mostrando la ultima carga disponible{label ? ` de ${label}` : ''}.
    </div>
  )
}

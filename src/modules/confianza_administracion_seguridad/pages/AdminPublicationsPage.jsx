import { useEffect, useMemo, useState } from 'react'
import AdminPlatformService from '../services/admin_platform_service'
import ConfirmModal from '../../../shared/components/ConfirmModal'
import OfflineBanner from '../components/OfflineBanner'
import { getPendingMutations } from '../services/adminOfflineRepository'

export default function AdminPublicationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dishes, setDishes] = useState([])
  const [search, setSearch] = useState('')
  const [confirmDish, setConfirmDish] = useState(null)
  const [pendingOps, setPendingOps] = useState([])

  const loadPendingOps = async () => {
    try {
      const queue = await getPendingMutations()
      setPendingOps(queue || [])
    } catch (e) {
      console.warn("Could not load pending mutations:", e)
    }
  }

  useEffect(() => {
    void loadPublications()
    void loadPendingOps()
    window.addEventListener('admin-offline-queue-changed', loadPendingOps)
    return () => window.removeEventListener('admin-offline-queue-changed', loadPendingOps)
  }, [])

  async function loadPublications() {
    setLoading(true)
    setError('')
    try {
      const payload = await AdminPlatformService.getPublications()
      setDishes(payload || [])
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Error cargando publicaciones')
    } finally {
      setLoading(false)
    }
  }

  async function toggleAction() {
    if (!confirmDish) return
    const { dishId, action } = confirmDish
    try {
      const result = await AdminPlatformService.togglePublicationAction(dishId, action)
      setDishes((prev) =>
        prev.map((d) => (d.id === dishId ? { ...d, status: result.status, deleted_at: result.deleted_at } : d)),
      )
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error actualizando publicación')
    } finally {
      setConfirmDish(null)
    }
  }

  const filteredDishes = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return dishes
    return dishes.filter((d) =>
      [d.name, d.chef_business_name]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(needle)),
    )
  }, [dishes, search])

  return (
    <section className="space-y-6">
      <OfflineBanner moduleName="publications" />
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Gestión de Publicaciones</h1>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
          Modera los platos publicados por los cocineros.
        </p>
      </div>

      <div className="grid gap-4 rounded-[26px] border p-5" style={{ borderColor: 'rgba(148, 163, 184, 0.18)', backgroundColor: 'var(--panel)', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)' }}>
        <label className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(148,163,184,.18)' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="Buscar por nombre del plato o cocinero..."
          />
        </label>
      </div>

      {error && <div className="rounded-2xl border px-4 py-3 text-sm text-red-600 bg-red-50 border-red-200">{error}</div>}

      <section className="overflow-x-auto rounded-[26px] border" style={{ borderColor: 'rgba(148, 163, 184, 0.18)', backgroundColor: 'var(--panel)', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.07)' }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'rgba(248,250,252,.65)' }}>
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Plato</th>
              <th className="px-5 py-4 text-left font-semibold">Cocinero</th>
              <th className="px-5 py-4 text-left font-semibold">Precio</th>
              <th className="px-5 py-4 text-left font-semibold">Estado</th>
              <th className="px-5 py-4 text-left font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-5 py-10 text-center" colSpan="5">Cargando publicaciones...</td></tr>
            ) : filteredDishes.length === 0 ? (
              <tr><td className="px-5 py-10 text-center" colSpan="5">No hay publicaciones.</td></tr>
            ) : (
              filteredDishes.map((d) => {
                const isDeleted = !!d.deleted_at
                const isPaused = d.status === 'paused' || d.status === 'draft'
                return (
                  <tr key={d.id} className="border-t" style={{ borderColor: 'rgba(148,163,184,.14)' }}>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        {d.image ? (
                          <img src={d.image} alt={d.name} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100" />
                        )}
                        <span className="font-medium">{d.name}</span>
                        {pendingOps.some(op => op.entity === 'publications' && String(op.server_id) === String(d.id) && op.status === 'pending') && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-700 rounded-md border border-amber-500/30 animate-pulse">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle">{d.chef_business_name}</td>
                    <td className="px-5 py-4 align-middle">Bs {Number(d.price).toFixed(2)}</td>
                    <td className="px-5 py-4 align-middle">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${isDeleted ? 'bg-red-100 text-red-700' : isPaused ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {isDeleted ? 'Eliminado' : isPaused ? 'Pausado/Borrador' : 'Activo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex gap-2">
                        {isDeleted ? (
                          <button onClick={() => setConfirmDish({ dishId: d.id, name: d.name, action: 'restore', label: 'restaurar' })} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold">
                            Restaurar
                          </button>
                        ) : (
                          <>
                            <button onClick={() => setConfirmDish({ dishId: d.id, name: d.name, action: 'pause', label: 'pausar' })} className="px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 text-xs font-semibold">
                              Pausar
                            </button>
                            <button onClick={() => setConfirmDish({ dishId: d.id, name: d.name, action: 'soft_delete', label: 'eliminar' })} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold">
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>

      <ConfirmModal
        open={!!confirmDish}
        title={`${confirmDish?.label?.charAt(0).toUpperCase()}${confirmDish?.label?.slice(1)} publicación`}
        description={`¿Estás seguro que deseas ${confirmDish?.label} la publicación "${confirmDish?.name}"?`}
        confirmText={`Sí, ${confirmDish?.label}`}
        isDestructive={confirmDish?.action === 'soft_delete'}
        onClose={() => setConfirmDish(null)}
        onConfirm={() => void toggleAction()}
      />
    </section>
  )
}

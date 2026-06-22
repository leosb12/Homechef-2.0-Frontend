import { useEffect, useState } from 'react'
import AdminPlatformService from '../services/admin_platform_service'
import ConfirmModal from '../../../shared/components/ConfirmModal'
import OfflineBanner from '../components/OfflineBanner'
import { getPendingMutations } from '../services/adminOfflineRepository'

export default function AdminChefsValidationPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chefs, setChefs] = useState([])
  const [confirmChef, setConfirmChef] = useState(null)
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
    void loadPendingChefs()
    void loadPendingOps()
    window.addEventListener('admin-offline-queue-changed', loadPendingOps)
    return () => window.removeEventListener('admin-offline-queue-changed', loadPendingOps)
  }, [])

  async function loadPendingChefs() {
    setLoading(true)
    setError('')
    try {
      const payload = await AdminPlatformService.getPendingChefs()
      setChefs(payload || [])
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Error cargando solicitudes')
    } finally {
      setLoading(false)
    }
  }

  async function validateChef() {
    if (!confirmChef) return
    const { chef, status } = confirmChef
    try {
      await AdminPlatformService.validateChef(chef.id, status)
      setChefs((prev) => prev.filter((c) => c.id !== chef.id))
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error validando cocinero')
    } finally {
      setConfirmChef(null)
    }
  }

  const activeChefs = chefs.filter(c => c.status !== 'approved' && c.status !== 'rejected' && !c.deleted_at);

  return (
    <section className="space-y-6">
      <OfflineBanner moduleName="chefs" />
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Validación de Cocineros</h1>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
          Revisa y aprueba las solicitudes de nuevos cocineros en la plataforma.
        </p>
      </div>

      {error && <div className="rounded-2xl border px-4 py-3 text-sm text-red-600 bg-red-50 border-red-200">{error}</div>}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Cargando solicitudes...</p>
        ) : activeChefs.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay solicitudes de cocineros pendientes.</p>
        ) : (
          activeChefs.map((c) => (
            <article key={c.id} className="rounded-[24px] border p-6 flex flex-col gap-4" style={{ borderColor: 'rgba(148, 163, 184, 0.18)', backgroundColor: 'var(--panel)', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)' }}>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-gray-100 flex-shrink-0">
                  {c.profile_picture ? (
                    <img src={c.profile_picture} alt={c.business_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">Sin foto</div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {c.business_name}
                    {pendingOps.some(op => op.entity === 'chefs' && String(op.server_id) === String(c.id) && op.status === 'pending') && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-700 rounded border border-amber-500/30 animate-pulse">
                        Pendiente
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">{c.first_name} {c.last_name}</p>
                </div>
              </div>
              <div className="text-sm space-y-2 mt-2">
                <p><strong>Correo:</strong> {c.email}</p>
                <p><strong>Ciudad:</strong> {c.city || 'No especificada'}</p>
                <p><strong>Dirección:</strong> {c.address || 'No especificada'}</p>
                <p><strong>Especialidades:</strong> {c.specialties || 'Ninguna'}</p>
              </div>
              
              {c.kitchen_photos && c.kitchen_photos.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--muted)' }}>Fotos de la Cocina</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {c.kitchen_photos.map((photo, i) => (
                      <a key={i} href={photo} target="_blank" rel="noreferrer" className="block shrink-0">
                        <img src={photo} alt={`Cocina ${i + 1}`} className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-lg border" style={{ borderColor: 'var(--line)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-auto pt-4 flex gap-3">
                <button
                  onClick={() => setConfirmChef({ chef: c, status: 'rejected' })}
                  className="flex-1 rounded-xl border border-red-200 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => setConfirmChef({ chef: c, status: 'approved' })}
                  className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Aprobar
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <ConfirmModal
        open={!!confirmChef}
        title={confirmChef?.status === 'approved' ? 'Aprobar cocinero' : 'Rechazar cocinero'}
        description={`¿Estás seguro que deseas ${confirmChef?.status === 'approved' ? 'aprobar' : 'rechazar'} a ${confirmChef?.chef?.business_name}?`}
        confirmText={confirmChef?.status === 'approved' ? 'Sí, aprobar' : 'Sí, rechazar'}
        isDestructive={confirmChef?.status === 'rejected'}
        onClose={() => setConfirmChef(null)}
        onConfirm={() => void validateChef()}
      />
    </section>
  )
}

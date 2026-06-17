import { useEffect, useMemo, useState } from 'react'
import AdminPlatformService from '../services/admin_platform_service'
import ConfirmModal from '../../../shared/components/ConfirmModal'

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [confirmUser, setConfirmUser] = useState(null)

  useEffect(() => {
    void loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const payload = await AdminPlatformService.getUsers()
      setUsers(payload || [])
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  async function toggleBlock() {
    if (!confirmUser) return
    try {
      const result = await AdminPlatformService.toggleUserBlock(confirmUser.id)
      setUsers((prev) =>
        prev.map((u) => (u.id === confirmUser.id ? { ...u, is_active: result.is_active } : u)),
      )
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error actualizando usuario')
    } finally {
      setConfirmUser(null)
    }
  }

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
      if (!needle) return true
      return [u.email, u.first_name, u.last_name]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(needle))
    })
  }, [users, search, roleFilter])

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Gestión de Usuarios</h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
            Administra todos los usuarios registrados en la plataforma.
          </p>
        </div>
      </div>

      <div className="grid gap-4 rounded-[26px] border p-5 xl:grid-cols-[1.2fr_.8fr]"
        style={{ borderColor: 'rgba(148, 163, 184, 0.18)', backgroundColor: 'var(--panel)', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)' }}
      >
        <label className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(148,163,184,.18)' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="Buscar por nombre o correo..."
          />
        </label>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-2xl border px-4 py-3 outline-none"
          style={{ borderColor: 'rgba(148,163,184,.18)', backgroundColor: 'var(--panel)' }}
        >
          <option value="ALL">Todos los roles</option>
          <option value="CLIENTE">Cliente</option>
          <option value="COCINERO">Cocinero</option>
          <option value="REPARTIDOR">Repartidor</option>
          <option value="ADMINISTRADOR">Administrador</option>
        </select>
      </div>

      {error && <div className="rounded-2xl border px-4 py-3 text-sm text-red-600 bg-red-50 border-red-200">{error}</div>}

      <section className="overflow-x-auto rounded-[26px] border" style={{ borderColor: 'rgba(148, 163, 184, 0.18)', backgroundColor: 'var(--panel)', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.07)' }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'rgba(248,250,252,.65)' }}>
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Usuario</th>
              <th className="px-5 py-4 text-left font-semibold">Correo</th>
              <th className="px-5 py-4 text-left font-semibold">Rol</th>
              <th className="px-5 py-4 text-left font-semibold">Estado</th>
              <th className="px-5 py-4 text-left font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-5 py-10 text-center" colSpan="5">Cargando usuarios...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td className="px-5 py-10 text-center" colSpan="5">No hay usuarios con ese criterio.</td></tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="border-t" style={{ borderColor: 'rgba(148,163,184,.14)' }}>
                  <td className="px-5 py-4 align-middle font-medium">{u.first_name} {u.last_name}</td>
                  <td className="px-5 py-4 align-middle text-gray-500">{u.email}</td>
                  <td className="px-5 py-4 align-middle"><span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold">{u.role}</span></td>
                  <td className="px-5 py-4 align-middle">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Activo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    {u.role !== 'ADMINISTRADOR' && (
                      <button
                        onClick={() => setConfirmUser(u)}
                        className={`px-3 py-2 rounded-xl border font-semibold ${u.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                      >
                        {u.is_active ? 'Bloquear' : 'Desbloquear'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <ConfirmModal
        open={!!confirmUser}
        title={confirmUser?.is_active ? 'Bloquear usuario' : 'Desbloquear usuario'}
        description={`¿Estás seguro que deseas ${confirmUser?.is_active ? 'bloquear' : 'desbloquear'} al usuario ${confirmUser?.first_name}?`}
        confirmText={confirmUser?.is_active ? 'Sí, bloquear' : 'Sí, desbloquear'}
        isDestructive={confirmUser?.is_active}
        onClose={() => setConfirmUser(null)}
        onConfirm={() => void toggleBlock()}
      />
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_service'
import { useAuthSession } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session'
import { useThemeSession } from '../../shared/services/theme_session'
import LoadingButton from '../../modules/gestion_cocinero/components/LoadingButton'

export default function RoleLayout({ title, links }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  ))
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loadingAction, setLoadingAction] = useState('')
  const user = useAuthSession((state) => state.user)
  const accessToken = useAuthSession((state) => state.accessToken)
  const role = useAuthSession((state) => state.role)
  const clearSession = useAuthSession((state) => state.clearSession)
  const theme = useThemeSession((state) => state.theme)
  const toggleTheme = useThemeSession((state) => state.toggleTheme)

  const handleLogout = () => {
    const token = accessToken
    clearSession()
    navigate('/login', { replace: true })
    void logoutUser(token).catch(() => {})
  }

  const flashAction = (action, fn) => {
    setLoadingAction(action)
    fn()
    window.setTimeout(() => setLoadingAction((current) => (current === action ? '' : current)), 150)
  }

  useEffect(() => {
    if (!accessToken || !role) {
      clearSession()
      navigate('/login', { replace: true })
    }
  }, [accessToken, role, clearSession, navigate])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const syncSidebar = (event) => setIsSidebarOpen(event.matches)
    syncSidebar(media)
    media.addEventListener('change', syncSidebar)
    return () => media.removeEventListener('change', syncSidebar)
  }, [])

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <aside
        className={`fixed top-0 left-0 h-full w-[min(270px,82vw)] border-r p-4 sm:p-6 flex flex-col gap-5 sm:gap-6 z-40 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full grid place-items-center text-white font-bold" style={{ background: 'linear-gradient(180deg, var(--brand), var(--brand-2))' }}>
            🍽️
          </div>
          <h2 className="font-bold text-3xl truncate">{title}</h2>
          <button
            className="ml-auto h-9 w-9 rounded-lg border grid place-items-center"
            style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
            onClick={() => flashAction('close-sidebar', () => setIsSidebarOpen(false))}
            aria-label="Cerrar menu"
            title="Cerrar menu"
            disabled={loadingAction === 'close-sidebar'}
          >
            {loadingAction === 'close-sidebar' ? '...' : '✕'}
          </button>
        </div>
        <nav className="space-y-2">
          {links.map((item) => (
            <div key={item.to}>
              <Link
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition"
                style={{
                  color: 'var(--text)',
                  backgroundColor: location.pathname === item.to ? 'var(--panel-soft)' : 'transparent',
                  border: location.pathname === item.to ? `1px solid var(--line)` : '1px solid transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--panel-soft)')}
                onMouseLeave={(e) => {
                  if (location.pathname !== item.to) e.currentTarget.style.backgroundColor = 'transparent'
                }}
                to={item.to}
              >
                <span>{item.icon || '•'}</span>
                <span className="font-medium">{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto h-7 w-7 rounded-full grid place-items-center text-xs font-bold"
                    style={{ background: 'linear-gradient(180deg, var(--brand), var(--brand-2))', color: 'white' }}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </div>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl p-4 border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
          <p className="font-semibold mb-1">¿Tienes antojo de algo especial?</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Descubre nuevos sabores y vive experiencias unicas.</p>
        </div>
      </aside>
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          aria-label="Cerrar menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className={`min-w-0 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[270px]' : 'ml-0'}`}>
        <header className="sticky top-0 z-30 min-h-16 border-b px-3 sm:px-6 py-3 flex items-center justify-end gap-2 sm:gap-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <button
            className="mr-auto h-10 w-10 rounded-lg border grid place-items-center"
            style={{ borderColor: 'var(--line)', color: 'var(--text)', backgroundColor: 'var(--panel-soft)' }}
            onClick={() => flashAction('toggle-sidebar', () => setIsSidebarOpen((prev) => !prev))}
            aria-label="Alternar menu"
            title="Alternar menu"
            disabled={loadingAction === 'toggle-sidebar'}
          >
            {loadingAction === 'toggle-sidebar' ? '...' : '☰'}
          </button>
          {user?.first_name && (
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              {user.first_name} {user.last_name || ''}
            </span>
          )}
          <button
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="h-10 w-10 rounded-full border grid place-items-center text-lg transition"
            style={{ borderColor: 'var(--line)', color: 'var(--text)', backgroundColor: 'var(--panel-soft)' }}
            onClick={() => flashAction('theme', toggleTheme)}
            disabled={loadingAction === 'theme'}
          >
            {loadingAction === 'theme' ? '...' : theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <LoadingButton
            loading={loadingAction === 'logout'}
            loadingLabel="..."
            className="px-3 py-2 rounded-lg border transition text-sm sm:text-base"
            style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
            onClick={() => flashAction('logout-open', () => setShowLogoutConfirm(true))}
            disabled={loadingAction === 'logout-open'}
          >
            Cerrar sesion
          </LoadingButton>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-xl" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <h3 className="text-xl font-bold">Confirmar cierre de sesion</h3>
            <p style={{ color: 'var(--muted)' }}>¿Seguro que quieres cerrar sesion?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--line)' }}
                onClick={() => flashAction('logout-cancel', () => setShowLogoutConfirm(false))}
                disabled={loadingAction === 'logout-cancel'}
              >
                {loadingAction === 'logout-cancel' ? '...' : 'Cancelar'}
              </button>
              <LoadingButton
                type="button"
                className="px-4 py-2 rounded-lg text-white font-semibold"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                loading={loadingAction === 'logout-confirm'}
                loadingLabel="Cerrando..."
                onClick={() => {
                  setLoadingAction('logout-confirm')
                  setShowLogoutConfirm(false)
                  handleLogout()
                  window.setTimeout(() => setLoadingAction((current) => (current === 'logout-confirm' ? '' : current)), 150)
                }}
              >
                Cerrar sesion
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

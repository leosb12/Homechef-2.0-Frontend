import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_service'
import { useAuthSession } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session'
import { useThemeSession } from '../../shared/services/theme_session'
import SyncStatusBadge from '../../shared/components/SyncStatusBadge'

export default function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLogin = location.pathname === '/login'
  const isRegister = location.pathname === '/register'
  const isAuthScreen = isLogin || isRegister
  const theme = useThemeSession((state) => state.theme)
  const toggleTheme = useThemeSession((state) => state.toggleTheme)
  const accessToken = useAuthSession((state) => state.accessToken)
  const user = useAuthSession((state) => state.user)
  const role = useAuthSession((state) => state.role)
  const clearSession = useAuthSession((state) => state.clearSession)

  const isAuthenticated = Boolean(accessToken || user || role)
  const profilePath = role === 'COCINERO' ? '/chef/profile' : '/client/profile'

  useEffect(() => {
    // Interceptar redirección de Supabase para recuperación de contraseña
    // Supabase redirige con #access_token=...&type=recovery
    if (window.location.hash) {
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const type = params.get('type')
      
      if (type === 'recovery') {
        // Limpiar el hash y redirigir a reset-password
        window.history.replaceState(null, '', window.location.pathname)
        navigate('/reset-password', { replace: true })
        return
      }
    }

    }, [])

  const handleLogout = () => {
    const token = accessToken
    clearSession()
    navigate('/', { replace: true })
    void logoutUser(token).catch(() => {})
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {!isAuthScreen && (
        <header className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="text-xl font-bold">HomeChef</Link>
            <nav className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {isAuthenticated ? <SyncStatusBadge /> : null}
              <button
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className="h-10 w-10 rounded-full border grid place-items-center text-lg"
                style={{ borderColor: 'var(--line)', color: 'var(--text)', backgroundColor: 'var(--panel-soft)' }}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              {isAuthenticated ? (
                <button
                  type="button"
                  className="px-3 py-2 rounded-md border text-sm sm:text-base"
                  style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
                  onClick={handleLogout}
                >
                  Cerrar sesion
                </button>
              ) : (
                <>
                  <Link to="/login" className="px-3 py-2 rounded-md border text-sm sm:text-base" style={{ borderColor: 'var(--line)', color: 'var(--text)' }}>
                    Iniciar sesion
                  </Link>
                  <Link to="/register" className="px-3 py-2 rounded-md text-white text-sm sm:text-base" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
                    Registrarse
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
      )}
      <main className={isAuthScreen ? 'w-full px-0 py-0' : 'mx-auto max-w-6xl px-4 py-6'}>
        <Outlet />
      </main>
    </div>
  )
}

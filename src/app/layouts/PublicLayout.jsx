import { Link, Outlet, useLocation } from 'react-router-dom'
import { useThemeSession } from '../../shared/services/theme_session'

export default function PublicLayout() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const isRegister = location.pathname === '/register'
  const isAuthScreen = isLogin || isRegister
  const theme = useThemeSession((state) => state.theme)
  const toggleTheme = useThemeSession((state) => state.toggleTheme)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {!isAuthScreen && (
        <header className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-xl font-bold">HomeChef</Link>
            <nav className="flex items-center gap-2">
              <button
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className="h-10 w-10 rounded-full border grid place-items-center text-lg"
                style={{ borderColor: 'var(--line)', color: 'var(--text)', backgroundColor: 'var(--panel-soft)' }}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <Link to="/login" className="px-3 py-2 rounded-md border" style={{ borderColor: 'var(--line)', color: 'var(--text)' }}>
                Iniciar sesion
              </Link>
              <Link to="/register" className="px-3 py-2 rounded-md text-white" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
                Registrarse
              </Link>
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

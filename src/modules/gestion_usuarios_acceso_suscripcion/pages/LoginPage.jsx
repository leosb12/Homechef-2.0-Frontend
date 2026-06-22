import { useState } from 'react'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../services/auth_service'
import { useAuthSession } from '../services/auth_session'
import { useThemeSession } from '../../../shared/services/theme_session'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import { getLastValidSession, hasValidOfflineSession } from '../../../shared/services/offlineSessionService'
import { logDebug } from '../../../shared/services/debug_logger'

const ROLE_REDIRECTS = {
  CLIENTE: '/client/explore',
  COCINERO: '/chef/dashboard',
  ADMINISTRADOR: '/admin/dashboard',
  REPARTIDOR: '/delivery/assigned',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthSession((state) => state.setSession)
  const accessToken = useAuthSession((state) => state.accessToken)
  const role = useAuthSession((state) => state.role)
  const authStatus = useAuthSession((state) => state.authStatus)
  const theme = useThemeSession((state) => state.theme)
  const toggleTheme = useThemeSession((state) => state.toggleTheme)
  const isDark = theme === 'dark'

  const { isOnline } = useConnectivity()
  const [hasOffline, setHasOffline] = useState(false)
  const [offlineSessionData, setOfflineSessionData] = useState(null)
  const [offlineExpiredMsg, setOfflineExpiredMsg] = useState('')
  const [offlineSubmitting, setOfflineSubmitting] = useState(false)

  useEffect(() => {
    async function checkOfflineSession() {
      const valid = await hasValidOfflineSession()
      setHasOffline(valid)
      if (valid) {
        const session = await getLastValidSession()
        setOfflineSessionData(session)
      } else {
        const session = await getLastValidSession()
        if (session && session.offline_enabled) {
          const expires = new Date(session.expires_at)
          if (expires <= new Date()) {
            setOfflineExpiredMsg('Tu sesión offline expiró. Conéctate a internet para iniciar sesión nuevamente.')
            const { clearOfflineSession } = await import('../../../shared/services/offlineSessionService')
            await clearOfflineSession()
          }
        }
      }
    }
    checkOfflineSession()
  }, [])

  const handleContinueOffline = async () => {
    if (offlineSubmitting) return
    setOfflineSubmitting(true)

    try {
      const session = offlineSessionData || await getLastValidSession()

      if (!session || !session.offline_enabled) {
        setHasOffline(false)
        setOfflineExpiredMsg('No se encontro una sesion offline valida. Conectate para iniciar sesion nuevamente.')
        logDebug('DEBUG_AUTH', '[Auth] offline login rejected', {
          reason: 'missing_offline_session',
        })
        return
      }

      const expires = new Date(session.expires_at)
      if (Number.isNaN(expires.getTime()) || expires <= new Date()) {
        setHasOffline(false)
        setOfflineExpiredMsg('Tu sesion offline expiro. Conectate para iniciar sesion nuevamente.')
        logDebug('DEBUG_AUTH', '[Auth] offline login rejected', {
          reason: 'expired_offline_session',
          expires_at: session.expires_at,
        })
        return
      }

      const nextRole = String(session.role || 'CLIENTE').toUpperCase()
      const name = session.name || session.email || ''
      const user = {
        id: session.user_id,
        email: session.email || '',
        first_name: name.split(' ')[0] || '',
        last_name: name.split(' ').slice(1).join(' ') || '',
      }

      setOfflineSessionData(session)
      setSession({
        access: 'offline_placeholder_token',
        role: nextRole,
        user,
      })

      const redirectTo = ROLE_REDIRECTS[nextRole] || '/'
      logDebug('DEBUG_AUTH', '[Auth] offline login accepted', {
        role: nextRole,
        redirectTo,
        user_id: session.user_id,
      })
      navigate(redirectTo, { replace: true })
    } finally {
      setOfflineSubmitting(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'checking') return
    if (accessToken && role) {
      navigate(ROLE_REDIRECTS[String(role).toUpperCase()] || '/', { replace: true })
    }
  }, [accessToken, role, authStatus, navigate])
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await loginUser({ email, password })
      setSession(response)
      navigate(response.redirect_path || '/', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Credenciales no validas.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      className="relative overflow-hidden min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8"
      style={{
        backgroundColor: 'var(--bg)',
        backgroundImage: isDark
          ? 'radial-gradient(circle at 20% 20%, rgba(124,58,237,.14), transparent 45%), radial-gradient(circle at 80% 80%, rgba(34,211,238,.10), transparent 42%)'
          : 'radial-gradient(circle at 20% 20%, rgba(124,58,237,.08), transparent 45%), radial-gradient(circle at 80% 80%, rgba(147,197,253,.12), transparent 42%)',
      }}
    >
      <style>{`
        .login-input::placeholder { color: var(--muted); opacity: 0.85; }
        .login-input:-webkit-autofill,
        .login-input:-webkit-autofill:hover,
        .login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--text);
          -webkit-box-shadow: 0 0 0px 1000px transparent inset;
          transition: background-color 9999s ease-out 0s;
        }
      `}</style>

      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 pb-5 border-b"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
      >
        <Link to="/" className="inline-flex min-w-0 items-center gap-3">
          <span
            className="h-11 w-11 sm:h-14 sm:w-14 shrink-0 rounded-full grid place-items-center text-white text-2xl font-bold"
            style={{ background: 'linear-gradient(180deg, var(--brand), var(--brand-2))' }}
          >
            👨‍🍳
          </span>
          <span>
            <span className="block text-5xl font-extrabold leading-none" style={{ color: 'var(--text)' }}>HomeChef</span>
            <span className="block text-lg mt-1" style={{ color: 'var(--muted)' }}>Cocina local, momentos inolvidables 💜</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="h-12 px-4 rounded-xl border flex items-center gap-3 self-end sm:self-auto"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <span style={{ color: isDark ? '#94a3b8' : '#f59e0b' }}>☀</span>
          <span style={{ color: 'var(--line)' }}>|</span>
          <span style={{ color: isDark ? '#8b5cf6' : '#64748b' }}>🌙</span>
        </button>
      </div>

      <div className="max-w-[1680px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_620px] gap-8 lg:gap-12 items-start">
        <div className="pt-2 min-w-0 relative z-10 lg:col-start-1">
          <div className="inline-flex max-w-full rounded-full px-4 py-2 text-sm sm:text-lg border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--brand-2)' }}>
            ✩ Hecho con amor por chefs como tu
          </div>

          <h2 className="mt-6 text-5xl xl:text-6xl font-extrabold leading-[1.05]" style={{ color: 'var(--text)' }}>
            Del chef a tu mesa,
            <br />
            <span style={{ color: 'var(--brand-2)' }}>simple, rapido y delicioso.</span>
          </h2>

          <p className="mt-4 sm:mt-6 text-3xl xl:text-[34px] max-w-3xl leading-relaxed" style={{ color: 'var(--muted)' }}>
            Conectamos a los mejores chefs y restaurantes contigo. Descubre platos increibles, haz pedidos facilmente y disfruta donde estes.
          </p>

          <ul className="mt-6 sm:mt-8 space-y-4 text-base sm:text-lg">
            <li className="flex gap-4">
              <span className="h-12 w-12 rounded-2xl grid place-items-center" style={{ backgroundColor: 'var(--panel-soft)' }}>🔎</span>
              <p><strong>Explora platos increibles</strong><br /><span style={{ color: 'var(--muted)' }}>Descubre recetas unicas y nuevos favoritos.</span></p>
            </li>
            <li className="flex gap-4">
              <span className="h-12 w-12 rounded-2xl grid place-items-center" style={{ backgroundColor: 'var(--panel-soft)' }}>🛍️</span>
              <p><strong>Pide facil y rapido</strong><br /><span style={{ color: 'var(--muted)' }}>Pide en segundos con retiro o delivery.</span></p>
            </li>
            <li className="flex gap-4">
              <span className="h-12 w-12 rounded-2xl grid place-items-center" style={{ backgroundColor: 'var(--panel-soft)' }}>💚</span>
              <p><strong>Tus favoritos, siempre contigo</strong><br /><span style={{ color: 'var(--muted)' }}>Guarda y reordena cuando quieras.</span></p>
            </li>
          </ul>
        </div>

        <div
          className="rounded-[30px] border p-4 sm:p-6 lg:p-8 w-full max-w-[620px] justify-self-stretch lg:justify-self-end lg:col-start-2 mt-4 lg:mt-0 relative z-20"
          style={{
            borderColor: 'var(--line)',
            backgroundColor: isDark ? 'rgba(10,19,45,.74)' : 'rgba(255,255,255,.84)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="text-center">
            <div
              className="mx-auto h-16 w-16 sm:h-20 sm:w-20 rounded-full grid place-items-center text-white text-3xl mb-4"
              style={{ background: 'linear-gradient(180deg, var(--brand), var(--brand-2))' }}
            >
              👨‍🍳
            </div>
            <h3 className="text-5xl font-bold" style={{ color: 'var(--text)' }}>Bienvenido de vuelta! 👋</h3>
            <p className="mt-2 text-[30px]" style={{ color: 'var(--muted)' }}>Inicia sesion para continuar disfrutando de HomeChef.</p>
          </div>

          {!isOnline ? (
            <div className="space-y-6 text-center mt-7">
              {hasOffline ? (
                <div className="space-y-4">
                  <div
                    className="rounded-2xl border p-4 text-sm font-semibold tracking-wide text-amber-500 bg-amber-500/10"
                    style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}
                  >
                    📡 Estás sin conexión a internet, pero tienes una sesión guardada. Puedes continuar en modo offline.
                  </div>
                  <button
                    type="button"
                    onClick={handleContinueOffline}
                    disabled={offlineSubmitting}
                    className="w-full h-14 rounded-xl text-white text-2xl font-bold transition-all duration-300 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                  >
                    {offlineSubmitting ? 'Entrando...' : 'Continuar sin conexión'}
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-2xl border p-6 text-sm font-semibold text-red-400 bg-red-500/10"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  <p className="text-xl mb-2">📡 Sin conexión</p>
                  <p className="text-sm">
                    {offlineExpiredMsg || 'Conéctate a internet para iniciar sesión por primera vez.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <form className="mt-7 space-y-4" onSubmit={onSubmit}>
              <Field
                label="Correo electronico"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="prueba@gmail.com"
                left="✉"
                required
              />
              <Field
                label="Contrasena"
                value={password}
                onChange={setPassword}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                left="🔒"
                right={
                  <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="text-lg" aria-label="Alternar visibilidad">
                    {showPassword ? '🙈' : '👁'}
                  </button>
                }
                required
              />

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span style={{ color: 'var(--muted)' }}>Recordarme</span>
                </label>
                <Link to="/recover-password" style={{ color: 'var(--brand-2)' }} className="font-semibold">
                  Olvidaste tu contrasena?
                </Link>
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <button
                disabled={submitting}
                className="w-full h-14 rounded-xl text-white text-2xl font-bold disabled:opacity-60"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
              >
                {submitting ? 'Iniciando...' : 'Iniciar sesion'}
              </button>
            </form>
          )}

          <div className="mt-5 rounded-xl border px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
            <div>
              <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>No tienes una cuenta?</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Unete a HomeChef y empieza a disfrutar.</p>
            </div>
            <Link to="/register" className="px-4 py-2 rounded-xl border font-semibold" style={{ borderColor: 'var(--brand-2)', color: 'var(--brand-2)' }}>
              Registrarse
            </Link>
          </div>

          <p className="mt-5 text-sm" style={{ color: 'var(--muted)' }}>
            🛡 Tus datos estan protegidos con encriptacion de nivel bancario.
          </p>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, left, right, required = false }) {
  return (
    <label className="block">
      <span className="text-sm" style={{ color: 'var(--muted)' }}>{label}</span>
      <div className="mt-1 h-14 rounded-xl border flex items-center px-3 gap-2 min-w-0" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}>
        <span style={{ color: 'var(--muted)' }}>{left}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="login-input min-w-0 flex-1 bg-transparent outline-none"
          style={{ color: 'var(--text)' }}
          required={required}
        />
        {right}
      </div>
    </label>
  )
}

import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_service'
import { useAuthSession } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session'
import { useThemeSession } from '../../shared/services/theme_session'
import LoadingButton from '../../modules/gestion_cocinero/components/LoadingButton'
import SyncStatusBadge from '../../shared/components/SyncStatusBadge'
import AdminSyncBadge from '../../modules/confianza_administracion_seguridad/components/AdminSyncBadge'
import OfflineConflictsPanel from '../../shared/components/OfflineConflictsPanel'
import { useConnectivity } from '../../shared/hooks/useConnectivity'
import ChatbotWidget from '../../modules/user_manual_chatbot/components/ChatbotWidget'
import ClientOfflineBanner from '../../modules/marketplace_platos/components/ClientOfflineBanner'

export default function RoleLayout({
  title,
  links,
  brandTitle,
  brandSubtitle = '',
  brandGlyph = 'AC',
  sidebarFooter = null,
  collapseLabel = 'Contraer menu',
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (
    typeof window === 'undefined'
      ? true
      : window.matchMedia('(min-width: 1024px)').matches
  ))
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false)
  const [loadingAction, setLoadingAction] = useState('')
  const user = useAuthSession((state) => state.user)
  const accessToken = useAuthSession((state) => state.accessToken)
  const role = useAuthSession((state) => state.role)
  const authStatus = useAuthSession((state) => state.authStatus)
  const {
    isOnline,
    pendingCount,
    failedCount,
    connectionState,
    syncStatus,
    lastError,
    lastCheckedAt,
    lastSyncAt,
    backendReachable,
  } = useConnectivity()
  const clearSession = useAuthSession((state) => state.clearSession)
  const theme = useThemeSession((state) => state.theme)

  const [offlineSession, setOfflineSession] = useState(() => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem('homechef_offline_session')
    if (raw) {
      try { return JSON.parse(raw) } catch { return null }
    }
    return null
  })

  useEffect(() => {
    const handleAuthRejected = () => {
      navigate('/login', { replace: true })
    }
    window.addEventListener('homechef:auth-rejected', handleAuthRejected)
    return () => window.removeEventListener('homechef:auth-rejected', handleAuthRejected)
  }, [navigate])
  const toggleTheme = useThemeSession((state) => state.toggleTheme)
  const isLight = theme === 'light'

  const shellBackground = isLight
    ? '#fbfbfe'
    : 'radial-gradient(circle at top right, rgba(124,58,237,.12), transparent 24%), var(--bg)'
  const sidebarBackground = isLight
    ? 'linear-gradient(180deg, rgba(255,255,255,.98), rgba(251,250,255,1))'
    : 'linear-gradient(180deg, rgba(12,19,42,.98), rgba(9,14,31,.98))'
  const sidebarBorder = isLight ? 'rgba(148, 163, 184, 0.12)' : 'rgba(67, 56, 202, 0.18)'
  const sidebarShadow = isLight
    ? '0 18px 48px rgba(15, 23, 42, 0.08)'
    : '0 18px 48px rgba(2, 6, 23, 0.42)'
  const softButtonBackground = isLight ? 'rgba(255,255,255,.92)' : 'rgba(17,26,54,.92)'
  const softButtonBorder = isLight ? 'rgba(148, 163, 184, 0.16)' : 'rgba(71, 85, 105, 0.42)'
  const softButtonShadow = isLight
    ? '0 10px 22px rgba(15, 23, 42, 0.06)'
    : '0 10px 22px rgba(2, 6, 23, 0.30)'
  const headerBackground = isLight ? 'rgba(255,255,255,.92)' : 'rgba(7,11,27,.82)'
  const headerBorder = isLight ? 'rgba(148, 163, 184, 0.14)' : 'rgba(71, 85, 105, 0.34)'
  const headerShadow = isLight
    ? '0 10px 30px rgba(15, 23, 42, 0.04)'
    : '0 10px 30px rgba(2, 6, 23, 0.24)'

  const handleLogout = () => {
    const token = accessToken
    clearSession()
    navigate('/login', { replace: true })
    void logoutUser(token).catch(() => {})
  }

  const flashAction = (action, fn) => {
    setLoadingAction(action)
    fn()
    window.setTimeout(
      () => setLoadingAction((current) => (current === action ? '' : current)),
      150,
    )
  }

  useEffect(() => {
    if (authStatus === 'checking') return
    if (!accessToken || !role) {
      clearSession()
      navigate('/login', { replace: true })
    }
  }, [accessToken, role, authStatus, clearSession, navigate])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const syncSidebar = (event) => setIsSidebarOpen(event.matches)
    syncSidebar(media)
    media.addEventListener('change', syncSidebar)
    return () => media.removeEventListener('change', syncSidebar)
  }, [])

  return (
    <div
      className="relative min-h-screen"
      style={{ background: shellBackground, color: 'var(--text)' }}
    >
      <aside
        className={`fixed top-0 left-0 z-40 flex h-full w-[min(290px,84vw)] flex-col gap-5 border-r px-5 py-5 transition-transform duration-300 sm:px-6 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          borderColor: sidebarBorder,
          background: sidebarBackground,
          boxShadow: sidebarShadow,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-extrabold text-white"
            style={{
              background:
                'linear-gradient(180deg, rgba(124,58,237,1), rgba(109,40,217,1))',
              boxShadow: '0 12px 24px rgba(109, 40, 217, 0.24)',
            }}
          >
            {brandGlyph}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-extrabold">
              {brandTitle || title}
            </h2>
            {brandSubtitle ? (
              <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
                {brandSubtitle}
              </p>
            ) : null}
          </div>
          <button
            className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border lg:hidden"
            style={{
              borderColor: softButtonBorder,
              color: 'var(--text)',
              backgroundColor: softButtonBackground,
              boxShadow: softButtonShadow,
            }}
            onClick={() => flashAction('close-sidebar', () => setIsSidebarOpen(false))}
            aria-label="Cerrar menu"
            title="Cerrar menu"
            disabled={loadingAction === 'close-sidebar'}
          >
            {loadingAction === 'close-sidebar' ? '...' : 'X'}
          </button>
        </div>

        <nav className="space-y-2 pt-4 flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(148,163,184,0.3)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(148,163,184,0.5)]">
          {links.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition"
                style={{
                  color: active ? '#6d28d9' : 'var(--text)',
                  backgroundColor: active ? 'rgba(124,58,237,.10)' : 'transparent',
                  border: active
                    ? '1px solid rgba(124,58,237,.14)'
                    : '1px solid transparent',
                  boxShadow: active
                    ? '0 12px 28px rgba(109, 40, 217, 0.08)'
                    : 'none',
                }}
                onMouseEnter={(event) => {
                  if (!active) {
                    event.currentTarget.style.backgroundColor = 'rgba(124,58,237,.05)'
                  }
                }}
                onMouseLeave={(event) => {
                  if (!active) {
                    event.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
                to={item.to}
              >
                <span
                  className="grid shrink-0 place-items-center rounded-lg transition-colors"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: active
                      ? 'rgba(124,58,237,.12)'
                      : 'transparent',
                    color: active ? '#6d28d9' : 'var(--muted)',
                  }}
                >
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
                {item.badge ? (
                  <span
                    className="ml-auto grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white"
                    style={{
                      background:
                        'linear-gradient(180deg, var(--brand), var(--brand-2))',
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-4">
          {sidebarFooter}
          <button
            type="button"
            className="w-full rounded-2xl border px-4 py-3 font-medium"
            style={{
              borderColor: softButtonBorder,
              backgroundColor: softButtonBackground,
              boxShadow: softButtonShadow,
            }}
            onClick={() => flashAction('close-sidebar', () => setIsSidebarOpen(false))}
          >
            {collapseLabel}
          </button>
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

      <div
        className={`min-w-0 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-[290px]' : 'ml-0'
        }`}
      >
        <header
          className="sticky top-0 z-30 flex min-h-16 items-center justify-end gap-2 border-b px-3 py-3 sm:gap-3 sm:px-6"
          style={{
            borderColor: headerBorder,
            backgroundColor: headerBackground,
            backdropFilter: 'blur(16px)',
            boxShadow: headerShadow,
          }}
        >
          <button
            className="mr-auto grid h-11 w-11 place-items-center rounded-xl border transition"
            style={{
              borderColor: softButtonBorder,
              color: 'var(--text)',
              backgroundColor: softButtonBackground,
              boxShadow: softButtonShadow,
            }}
            onClick={() => flashAction('toggle-sidebar', () => setIsSidebarOpen((prev) => !prev))}
            aria-label="Alternar menu"
            title="Alternar menu"
            disabled={loadingAction === 'toggle-sidebar'}
          >
            {loadingAction === 'toggle-sidebar' ? (
              '...'
            ) : (
              <TopbarIcon type="menu" />
            )}
          </button>

          <div className="hidden items-center gap-3 md:flex">
            {user?.first_name ? (
              <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                {user.first_name} {user.last_name || ''}
              </span>
            ) : null}
            {role === 'ADMINISTRADOR' ? <AdminSyncBadge /> : <SyncStatusBadge />}
          </div>

          {/* Botón limpiar caché */}
          <button
            id="clear-cache-btn"
            aria-label="Limpiar caché offline"
            title="Limpiar caché offline — útil si hay datos obsoletos o errores de sincronización"
            className="grid h-11 w-11 place-items-center rounded-full border transition hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(239,68,68,0.22)',
              color: isLight ? '#b91c1c' : '#fca5a5',
              backgroundColor: isLight ? 'rgba(254,242,242,0.9)' : 'rgba(69,10,10,0.38)',
              boxShadow: isLight ? '0 6px 14px rgba(239,68,68,0.10)' : '0 6px 14px rgba(127,29,29,0.18)',
            }}
            onClick={() => flashAction('clear-cache-open', () => setShowClearCacheConfirm(true))}
            disabled={loadingAction === 'clear-cache-open'}
          >
            <TopbarIcon type="trash" />
          </button>

          <button
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="grid h-11 w-11 place-items-center rounded-full border transition"
            style={{
              borderColor: softButtonBorder,
              color: 'var(--text)',
              backgroundColor: softButtonBackground,
              boxShadow: softButtonShadow,
            }}
            onClick={() => flashAction('theme', toggleTheme)}
            disabled={loadingAction === 'theme'}
          >
            {loadingAction === 'theme' ? (
              '...'
            ) : (
              <TopbarIcon type={theme === 'dark' ? 'sun' : 'moon'} />
            )}
          </button>

          <div
            className="hidden h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white sm:flex"
            style={{
              background: 'linear-gradient(180deg, rgba(124,58,237,1), rgba(109,40,217,1))',
              boxShadow: '0 12px 24px rgba(109, 40, 217, 0.20)',
            }}
            title={user?.first_name ? `${user.first_name} ${user.last_name || ''}` : title}
          >
            {getInitials(user?.first_name, user?.last_name, title)}
          </div>

          <div className="md:hidden">
            {role === 'ADMINISTRADOR' ? <AdminSyncBadge /> : <SyncStatusBadge />}
          </div>

          <LoadingButton
            loading={loadingAction === 'logout'}
            loadingLabel="..."
            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition sm:text-base"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.24)',
              color: isLight ? '#b91c1c' : '#fecaca',
              backgroundColor: isLight ? 'rgba(254, 242, 242, 0.95)' : 'rgba(69, 10, 10, 0.48)',
              boxShadow: isLight
                ? '0 10px 22px rgba(239, 68, 68, 0.10)'
                : '0 10px 22px rgba(127, 29, 29, 0.18)',
            }}
            onClick={() => flashAction('logout-open', () => setShowLogoutConfirm(true))}
            disabled={loadingAction === 'logout-open'}
          >
            <span className="flex items-center gap-2">
              <TopbarIcon type="logout" />
              <span>Cerrar sesion</span>
            </span>
          </LoadingButton>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {!isOnline && role !== 'CLIENTE' && role !== 'COCINERO' && role !== 'REPARTIDOR' && (
            <div 
              className="mb-4 rounded-2xl border p-4 text-sm font-semibold tracking-wide shadow-sm animate-in fade-in duration-200"
              style={{
                borderColor: 'rgba(245, 158, 11, 0.25)',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                color: 'var(--text)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📡</span>
                  <span style={{ color: '#f59e0b' }} className="font-extrabold">Modo offline — última sesión válida</span>
                </div>
                {offlineSession && (
                  <div className="flex flex-col sm:flex-row gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                    <span><strong>Última validación online:</strong> {offlineSession.last_validated_at ? new Date(offlineSession.last_validated_at).toLocaleString() : 'N/A'}</span>
                    <span><strong>Última sincronización:</strong> {offlineSession.last_online_login_at ? new Date(offlineSession.last_online_login_at).toLocaleString() : 'N/A'}</span>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                Ingresaste en modo offline con tu última sesión sincronizada.
              </p>
            </div>
          )}
          {role === 'CLIENTE' && <ClientOfflineBanner />}
          <OfflineConflictsPanel />
          <Outlet />
        </main>
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-xl"
            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
          >
            <h3 className="text-xl font-bold">Confirmar cierre de sesion</h3>
            <p className="mt-2" style={{ color: 'var(--muted)' }}>
              Seguro que quieres cerrar sesion?
            </p>
            {pendingCount > 0 && (
              <div 
                className="mt-3 p-3 rounded-xl border text-sm font-semibold leading-relaxed shadow-sm"
                style={{
                  borderColor: 'rgba(245, 158, 11, 0.25)',
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  color: 'var(--text)',
                }}
              >
                ⚠️ <strong style={{ color: '#f59e0b' }}>¡Advertencia!</strong> Tienes {pendingCount} acción/es pendiente/s de sincronización. Si cierras sesión, estas acciones locales se perderán.
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border px-4 py-2"
                style={{ borderColor: 'var(--line)' }}
                onClick={() => flashAction('logout-cancel', () => setShowLogoutConfirm(false))}
                disabled={loadingAction === 'logout-cancel'}
              >
                {loadingAction === 'logout-cancel' ? '...' : 'Cancelar'}
              </button>
              <LoadingButton
                type="button"
                className="rounded-lg px-4 py-2 font-semibold text-white"
                style={{
                  background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                }}
                loading={loadingAction === 'logout-confirm'}
                loadingLabel="Cerrando..."
                onClick={() => {
                  setLoadingAction('logout-confirm')
                  setShowLogoutConfirm(false)
                  handleLogout()
                  window.setTimeout(
                    () =>
                      setLoadingAction((current) =>
                        current === 'logout-confirm' ? '' : current,
                      ),
                    150,
                  )
                }}
              >
                Cerrar sesion
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación limpiar caché */}
      {showClearCacheConfirm && (
        <ClearCacheModal
          onConfirm={async () => {
            setShowClearCacheConfirm(false)
            await clearAllCache()
          }}
          onCancel={() => setShowClearCacheConfirm(false)}
          isLight={isLight}
          pendingCount={pendingCount}
        />
      )}

      <ChatbotWidget />
      <DevDebugPanel
        connectionState={connectionState}
        authStatus={authStatus}
        pendingCount={pendingCount}
        failedCount={failedCount}
        syncStatus={syncStatus}
        backendReachable={backendReachable}
        lastCheckedAt={lastCheckedAt}
        lastSyncAt={lastSyncAt}
        lastError={lastError}
        role={role}
        currentRoute={location.pathname}
      />
    </div>
  )
}

function DevDebugPanel({
  connectionState,
  authStatus,
  pendingCount,
  failedCount,
  syncStatus,
  backendReachable,
  lastCheckedAt,
  lastSyncAt,
  lastError,
  role,
  currentRoute,
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (!import.meta.env.DEV) return null

  return (
    <div
      className="fixed bottom-4 left-4 z-[9999] rounded-xl border shadow-lg transition-all duration-300 font-mono text-xs overflow-hidden"
      style={{
        width: isOpen ? '320px' : '150px',
        backgroundColor: 'var(--panel)',
        borderColor: 'var(--brand)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none font-bold"
        style={{
          background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
          color: '#fff',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>🛠️ DEBUG PANEL</span>
        <span>{isOpen ? '▼' : '▲'}</span>
      </div>

      {isOpen && (
        <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto" style={{ color: 'var(--text)' }}>
          <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Connection:</span>
            <span className="font-bold" style={{ color: connectionState === 'online_ready' ? '#10b981' : '#f59e0b' }}>
              {connectionState}
            </span>
          </div>

          <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Backend Reachable:</span>
            <span className="font-bold" style={{ color: backendReachable ? '#10b981' : '#ef4444' }}>
              {backendReachable ? 'YES' : 'NO'}
            </span>
          </div>

          <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Auth Status:</span>
            <span className="font-bold">{authStatus}</span>
          </div>

          <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Role / Route:</span>
            <span className="truncate max-w-[160px]" title={`${role} / ${currentRoute}`}>
              {role} / {currentRoute}
            </span>
          </div>

          <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Pending Count:</span>
            <span className="font-bold" style={{ color: pendingCount > 0 ? '#f59e0b' : 'var(--text)' }}>
              {pendingCount}
            </span>
          </div>

          <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Failed Count:</span>
            <span className="font-bold" style={{ color: failedCount > 0 ? '#ef4444' : 'var(--text)' }}>
              {failedCount}
            </span>
          </div>

          <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Sync Status:</span>
            <span className="font-bold">{syncStatus}</span>
          </div>

          <div className="border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Last Ping:</span>
            <div className="text-[10px] text-right truncate">
              {lastCheckedAt ? new Date(lastCheckedAt).toLocaleTimeString() : 'Never'}
            </div>
          </div>

          <div className="border-b pb-1" style={{ borderColor: 'var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Last Sync:</span>
            <div className="text-[10px] text-right truncate">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'Never'}
            </div>
          </div>

          {lastError && (
            <div className="rounded p-1.5 mt-1 border text-[10px] whitespace-pre-wrap max-h-[80px] overflow-y-auto" style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)', color: '#ef4444' }}>
              <strong>Error:</strong> {lastError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Limpiar todo el caché offline ───────────────────────────────────────────
async function clearAllCache() {
  // 1. localStorage
  try { localStorage.clear() } catch {}

  // 2. sessionStorage
  try { sessionStorage.clear() } catch {}

  // 3. IndexedDB — borrar todas las bases de datos conocidas
  const dbNames = [
    'homechef_offline',
    'homechef_offline_db',
    'homechef_admin_offline',
  ]
  await Promise.allSettled(
    dbNames.map(
      (name) =>
        new Promise((resolve) => {
          const req = indexedDB.deleteDatabase(name)
          req.onsuccess = resolve
          req.onerror = resolve
          req.onblocked = resolve
        }),
    ),
  )

  // 4. Limpiar también cualquier otra base de datos del origen
  try {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases()
      await Promise.allSettled(
        dbs.map(
          ({ name }) =>
            new Promise((resolve) => {
              const req = indexedDB.deleteDatabase(name)
              req.onsuccess = resolve
              req.onerror = resolve
              req.onblocked = resolve
            }),
        ),
      )
    }
  } catch {}

  // 5. Cache API (Service Worker caches)
  try {
    if (window.caches) {
      const keys = await caches.keys()
      await Promise.allSettled(keys.map((k) => caches.delete(k)))
    }
  } catch {}

  // 6. Recargar la página para comenzar limpio
  window.location.replace('/login')
}

// ─── Modal de confirmación de limpieza ─────────────────────────────────────────
function ClearCacheModal({ onConfirm, onCancel, isLight, pendingCount }) {
  const [isClearing, setIsClearing] = useState(false)

  const handleConfirm = async () => {
    setIsClearing(true)
    await onConfirm()
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ borderColor: 'rgba(239,68,68,0.30)', backgroundColor: 'var(--panel)' }}
      >
        {/* Icono */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
            style={{
              background: isLight ? 'rgba(254,242,242,1)' : 'rgba(69,10,10,0.55)',
              border: '1.5px solid rgba(239,68,68,0.25)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: isLight ? '#b91c1c' : '#fca5a5' }}>Limpiar caché offline</h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Esta acción no se puede deshacer</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text)' }}>
          Se eliminarán <strong>todos los datos locales</strong>: caché de sesión, operaciones offline, snapshots de pantalla e IndexedDB completo.
          La página se recargará automáticamente.
        </p>

        {pendingCount > 0 && (
          <div
            className="mb-3 rounded-xl border p-3 text-sm font-semibold leading-relaxed"
            style={{
              borderColor: 'rgba(245,158,11,0.30)',
              backgroundColor: 'rgba(245,158,11,0.08)',
              color: 'var(--text)',
            }}
          >
            ⚠️ <strong style={{ color: '#f59e0b' }}>¡Atención!</strong> Tienes {pendingCount} acción/es
            pendiente/s que <strong>no se han sincronizado</strong> y se perderán.
          </div>
        )}

        <div
          className="mb-4 rounded-xl border p-3 text-xs leading-relaxed"
          style={{
            borderColor: 'rgba(99,102,241,0.20)',
            backgroundColor: 'rgba(99,102,241,0.06)',
            color: 'var(--muted)',
          }}
        >
          💡 <strong>¿Cuándo usar esto?</strong> Si los datos locales están desactualizados (abres desde otro navegador, hay operaciones bloqueadas, o el badge nunca se resetea).
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:opacity-80"
            style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
            onClick={onCancel}
            disabled={isClearing}
          >
            Cancelar
          </button>
          <button
            id="confirm-clear-cache-btn"
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              boxShadow: '0 8px 20px rgba(239,68,68,0.30)',
              opacity: isClearing ? 0.7 : 1,
            }}
            onClick={handleConfirm}
            disabled={isClearing}
          >
            {isClearing ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />
                Limpiando...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
                Limpiar todo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function getInitials(firstName, lastName, fallback) {
  const value = [firstName, lastName].filter(Boolean).join(' ').trim() || fallback || 'AD'
  return (
    value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'AD'
  )
}

function TopbarIcon({ type }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (type) {
    case 'menu':
      return (
        <svg {...common}>
          <path d="M5 7h14M5 12h14M5 17h14" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      )
    case 'moon':
      return (
        <svg {...common}>
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4A7 7 0 0 0 20 14.5Z" />
        </svg>
      )
    case 'logout':
      return (
        <svg {...common}>
          <path d="M10 17v1a2 2 0 0 0 2 2h6" />
          <path d="M18 4h-6a2 2 0 0 0-2 2v1" />
          <path d="M15 12H3" />
          <path d="m6.5 8.5-3.5 3.5 3.5 3.5" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...common}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      )
    default:
      return null
  }
}

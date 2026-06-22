import { create } from 'zustand'

function getInitialState() {
  if (typeof window === 'undefined') return { accessToken: '', role: '', user: null, authStatus: 'checking' }
  const token = localStorage.getItem('homechef_access_token')
  const role = localStorage.getItem('homechef_role')
  const rawUser = localStorage.getItem('homechef_user')

  // Si no hay sesión activa online, intentar cargar sesión offline válida
  if (!token) {
    const offlineRaw = localStorage.getItem('homechef_offline_session')
    if (offlineRaw) {
      try {
        const session = JSON.parse(offlineRaw)
        const expires = new Date(session.expires_at)
        if (expires > new Date() && session.offline_enabled) {
          console.log('[auth_session] Iniciando con última sesión offline válida para:', session.role)
          return {
            accessToken: 'offline_placeholder_token',
            role: session.role,
            user: {
              id: session.user_id,
              email: session.email,
              first_name: session.name.split(' ')[0] || '',
              last_name: session.name.split(' ').slice(1).join(' ') || '',
            },
            authStatus: 'checking'
          }
        } else {
          console.warn('[auth_session] La sesión offline ha expirado síncronamente.')
          localStorage.removeItem('homechef_offline_session')
        }
      } catch (e) {
        console.error('[auth_session] Error cargando sesión offline en getInitialState:', e)
      }
    }
  }

  return {
    accessToken: token || '',
    role: role || '',
    user: rawUser ? JSON.parse(rawUser) : null,
    authStatus: 'checking',
  }
}

function isValidOfflineSessionData(session) {
  if (!session || !session.offline_enabled) return false
  const expires = new Date(session.expires_at)
  return !Number.isNaN(expires.getTime()) && expires > new Date()
}

function buildOfflineUser(session) {
  const name = session.name || session.email || ''
  return {
    id: session.user_id,
    email: session.email || '',
    first_name: name.split(' ')[0] || '',
    last_name: name.split(' ').slice(1).join(' ') || '',
  }
}

async function loadValidOfflineSession() {
  try {
    const { getLastValidSession } = await import('../../../shared/services/offlineSessionService')
    const session = await getLastValidSession()
    if (!isValidOfflineSessionData(session)) return null
    localStorage.setItem('homechef_offline_session', JSON.stringify(session))
    return session
  } catch (error) {
    console.warn('[auth_session] Error leyendo sesion offline persistida:', error)
    return null
  }
}

function setOfflineAuthenticated(set, session) {
  const role = String(session.role || 'CLIENTE').toUpperCase()
  const user = buildOfflineUser(session)
  localStorage.setItem('homechef_access_token', 'offline_placeholder_token')
  localStorage.setItem('homechef_role', role)
  localStorage.setItem('homechef_user', JSON.stringify(user))
  set({
    accessToken: 'offline_placeholder_token',
    role,
    user,
    authStatus: 'offline-authenticated',
  })
}

export const useAuthSession = create((set, get) => ({
  ...getInitialState(),
  setSession: ({ access, role, user }) => {
    localStorage.setItem('homechef_access_token', access)
    localStorage.setItem('homechef_role', role)
    localStorage.setItem('homechef_user', JSON.stringify(user))
    set({
      accessToken: access,
      role,
      user,
      authStatus: access === 'offline_placeholder_token' ? 'offline-authenticated' : 'authenticated'
    })
  },
  clearSession: () => {
    localStorage.removeItem('homechef_access_token')
    localStorage.removeItem('homechef_role')
    localStorage.removeItem('homechef_user')
    localStorage.removeItem('homechef_offline_session')
    set({ accessToken: '', role: '', user: null, authStatus: 'unauthenticated' })
    // Limpieza asíncrona de IndexedDB de sesión offline
    import('../../../shared/services/offlineSessionService').then(({ clearOfflineSession }) => {
      void clearOfflineSession().catch(() => {});
    }).catch(() => {});
  },
  syncFromStorage: () => {
    const state = getInitialState()
    set({
      ...state,
      authStatus: state.accessToken ? (state.accessToken === 'offline_placeholder_token' ? 'offline-authenticated' : 'authenticated') : 'unauthenticated'
    })
  },
  initializeAuth: async () => {
    if (typeof window === 'undefined') return

    console.log('[auth_session] Iniciando verificación de autenticación...')
    set({ authStatus: 'checking' })

    let isOnline = navigator.onLine
    try {
      const { checkConnectivity } = await import('../../../shared/services/connectivityService')
      const connectivity = await checkConnectivity()
      isOnline = connectivity.backendReachable
      console.log('[auth_session] Conectividad real detectada:', isOnline ? 'ONLINE' : 'OFFLINE')
    } catch (e) {
      console.warn('[auth_session] Error al verificar conectividad real, usando fallback de navegador:', e)
    }

    if (isOnline) {
      const token = localStorage.getItem('homechef_access_token')
      const role = localStorage.getItem('homechef_role')
      const rawUser = localStorage.getItem('homechef_user')

      if (token && token !== 'offline_placeholder_token') {
        try {
          const { api } = await import('../../../shared/services/api')
          const { data: sessionData } = await api.get('/auth/session/')
          if (sessionData && sessionData.user) {
            const finalRole = sessionData.role || role || 'CLIENTE'
            const finalUser = sessionData.user

            localStorage.setItem('homechef_access_token', token)
            localStorage.setItem('homechef_role', finalRole)
            localStorage.setItem('homechef_user', JSON.stringify(finalUser))

            try {
              const { saveLastValidSession } = await import('../../../shared/services/offlineSessionService')
              await saveLastValidSession({ ...finalUser, role: finalRole })
            } catch (err) {
              console.error('[auth_session] Error al guardar sesión offline en revalidación:', err)
            }

            console.log('[auth_session] Sesión online válida. Estado: authenticated')
            set({
              accessToken: token,
              role: finalRole,
              user: finalUser,
              authStatus: 'authenticated',
            })
            return
          }
        } catch (error) {
          const status = error?.response?.status
          if (status === 401 || status === 403) {
            console.warn('[auth_session] Token inválido o expirado. Intentando refrescar sesión.')
            try {
              const { supabase } = await import('../../../shared/services/supabase_client')
              const { data: { session }, error: refreshErr } = await supabase.auth.getSession()
              if (!refreshErr && session?.access_token) {
                const newToken = session.access_token
                const { api } = await import('../../../shared/services/api')
                const { data: sessionData } = await api.get('/auth/session/', {
                  headers: { Authorization: `Bearer ${newToken}` },
                })
                if (sessionData && sessionData.user) {
                  const finalRole = sessionData.role || role || 'CLIENTE'
                  const finalUser = sessionData.user

                  localStorage.setItem('homechef_access_token', newToken)
                  localStorage.setItem('homechef_role', finalRole)
                  localStorage.setItem('homechef_user', JSON.stringify(finalUser))

                  try {
                    const { saveLastValidSession } = await import('../../../shared/services/offlineSessionService')
                    await saveLastValidSession({ ...finalUser, role: finalRole })
                  } catch (err) {
                    console.error('[auth_session] Error al guardar sesión offline tras refresh:', err)
                  }

                  console.log('[auth_session] Sesión refrescada y validada con éxito. Estado: authenticated')
                  set({
                    accessToken: newToken,
                    role: finalRole,
                    user: finalUser,
                    authStatus: 'authenticated',
                  })
                  return
                }
              }
            } catch (refErr) {
              console.error('[auth_session] Error durante el refresco de token:', refErr)
            }

            console.warn('[auth_session] Refresco fallido. Limpiando credenciales y marcando unauthenticated.')
            localStorage.removeItem('homechef_access_token')
            localStorage.removeItem('homechef_role')
            localStorage.removeItem('homechef_user')
            localStorage.removeItem('homechef_offline_session')
            set({
              accessToken: '',
              role: '',
              user: null,
              authStatus: 'unauthenticated',
            })
            return
          } else {
            console.warn('[auth_session] Error de red o servidor al validar sesión. Intentando usar sesión offline.')
          }
        }
      }

      // Si no hay token o fallo la verificacion por red, verificar si hay sesion offline.
      const offlineSession = await loadValidOfflineSession()
      if (offlineSession) {
        console.log('[auth_session] Iniciando con ultima sesion offline valida (online con error o sin token activo):', offlineSession.role)
        setOfflineAuthenticated(set, offlineSession)
        return
      }

      console.log('[auth_session] Sin sesión online ni offline. Estado: unauthenticated')
      set({
        accessToken: '',
        role: '',
        user: null,
        authStatus: 'unauthenticated',
      })
    } else {
      // MODO OFFLINE
      const offlineSession = await loadValidOfflineSession()
      if (offlineSession) {
        console.log('[auth_session] Iniciando en modo offline con sesion valida para:', offlineSession.role)
        setOfflineAuthenticated(set, offlineSession)
        return
      }

      console.log('[auth_session] Sin conexión y sin sesión offline guardada. Estado: unauthenticated')
      set({
        accessToken: '',
        role: '',
        user: null,
        authStatus: 'unauthenticated',
      })
    }
  },
}))

if (typeof window !== 'undefined') {
  window.__auth_session = useAuthSession
}

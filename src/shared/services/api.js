import axios from 'axios'
import { supabase } from './supabase_client'

const runtimeConfig =
  typeof window !== 'undefined' ? window.__HOMECHEF_RUNTIME_CONFIG || {} : {}

export const API_URL =
  runtimeConfig.VITE_API_URL ||
  runtimeConfig.API_URL ||
  import.meta.env.VITE_API_URL ||
  'https://proyecto.leonardoserrate.xyz/api/v1'

export const api = axios.create({
  baseURL: API_URL,
})

const apiCache = new Map()
const CACHE_PREFIX = 'homechef_api_cache:'
const DEFAULT_CACHE_TTL = 5 * 60 * 1000

clearCacheOnBrowserReload()

api.interceptors.request.use(async (config) => {
  let token = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      token = session.access_token
      localStorage.setItem('homechef_access_token', token)
    }
  } catch (err) {
    // Silently ignore if supabase fails to load session
  }
  
  if (!token) {
    token = localStorage.getItem('homechef_access_token')
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const url = error?.config?.url || ''
    const config = error?.config
    const token = typeof window !== 'undefined' ? localStorage.getItem('homechef_access_token') : null

    // Intento de refresh token automático si es 401 y no es un reintento
    if (status === 401 && config && !config._retry) {
      config._retry = true
      try {
        console.log('[api] Detectado error 401. Intentando renovar sesión de Supabase Auth...')
        const { data: { session }, error: refreshErr } = await supabase.auth.getSession()
        if (!refreshErr && session?.access_token) {
          const freshToken = session.access_token
          localStorage.setItem('homechef_access_token', freshToken)
          config.headers.Authorization = `Bearer ${freshToken}`
          console.log('[api] Sesión renovada con éxito. Reintentando llamada original.')
          return api(config)
        }
      } catch (err) {
        console.error('[api] Error al intentar renovar sesión en interceptor:', err)
      }
    }

    // Solo cerrar sesión si es 401 (no autenticado/expirado) o si es un 403 en el endpoint de validación de sesión
    const isAuthFailure = status === 401 || (status === 403 && url.includes('/auth/session/'))

    if (isAuthFailure && typeof window !== 'undefined') {
      if (token === 'offline_placeholder_token') {
        console.warn('[api] Petición rechazada con error de autenticación en modo offline-authenticated. Ignorando logout.')
        return Promise.reject(error)
      }

      console.warn(`[api] Sesión invalidada por error ${status} en ${url}. Cerrando sesión.`)
      try {
        const { useAuthSession } = await import('../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session')
        useAuthSession.getState().clearSession()
      } catch {
        localStorage.removeItem('homechef_access_token')
        localStorage.removeItem('homechef_role')
        localStorage.removeItem('homechef_user')
        localStorage.removeItem('homechef_offline_session')
      }

      invalidateApiCache()

      if (shouldRedirectToLogin(window.location.pathname)) {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  },
)

function shouldRedirectToLogin(pathname) {
  const publicAuthPaths = ['/login', '/register', '/recover-password', '/reset-password']
  return !publicAuthPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function cachedGet(url, config = {}, options = {}) {
  const ttl = options.ttl ?? DEFAULT_CACHE_TTL
  const key = buildCacheKey(url, config)
  const now = Date.now()
  const cached = readCache(key)

  if (cached && now - cached.cachedAt < ttl) {
    return cached.data
  }

  const { data } = await api.get(url, config)
  writeCache(key, data)
  return data
}

export function invalidateApiCache(match = '') {
  const needle = String(match || '')
  for (const key of apiCache.keys()) {
    if (!needle || key.includes(needle)) apiCache.delete(key)
  }

  for (const key of Object.keys(sessionStorage)) {
    if (!key.startsWith(CACHE_PREFIX)) continue
    if (!needle || key.includes(needle)) sessionStorage.removeItem(key)
  }
}

function buildCacheKey(url, config = {}) {
  const token = localStorage.getItem('homechef_access_token') || ''
  const tokenScope = token ? token.slice(-16) : 'anonymous'
  return `${tokenScope}:${url}:${stableStringify(config.params || {})}`
}

function readCache(key) {
  if (apiCache.has(key)) return apiCache.get(key)

  try {
    const raw = sessionStorage.getItem(`homechef_api_cache:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    apiCache.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

function writeCache(key, data) {
  const value = { cachedAt: Date.now(), data }
  apiCache.set(key, value)

  try {
    sessionStorage.setItem(`homechef_api_cache:${key}`, JSON.stringify(value))
  } catch {
    // Si storage esta lleno o bloqueado, la cache en memoria sigue funcionando.
  }
}

function clearCacheOnBrowserReload() {
  if (typeof window === 'undefined') return

  const navigation = performance.getEntriesByType?.('navigation')?.[0]
  const isReload = navigation?.type === 'reload' || performance.navigation?.type === 1
  if (!isReload) return

  apiCache.clear()
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(key)
    }
  } catch {
    // Si el navegador bloquea sessionStorage, la cache en memoria ya fue limpiada.
  }
}
function stableStringify(value) {
  if (!value || typeof value !== 'object') return JSON.stringify(value)
  const sorted = Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      const item = value[key]
      if (item !== undefined && item !== '') acc[key] = item
      return acc
    }, {})
  return JSON.stringify(sorted)
}


import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
})

const apiCache = new Map()
const CACHE_PREFIX = 'homechef_api_cache:'
const DEFAULT_CACHE_TTL = 5 * 60 * 1000

clearCacheOnBrowserReload()

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('homechef_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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


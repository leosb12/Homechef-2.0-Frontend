/**
 * connectivityService.js
 * Servicio central de conectividad real para HomeChef.
 */

import { API_URL } from './api'
import { computeConnectionState } from './sync_store'
import { logDebug } from './debug_logger'

const IA_SERVICE_URL =
  typeof import.meta !== 'undefined'
    ? (import.meta.env?.VITE_IA_SERVICE_URL || 'https://homechef-ia-service.onrender.com')
    : 'https://homechef-ia-service.onrender.com'

const HEALTH_CHECK_TIMEOUT = 5000
const RECHECK_INTERVAL = 45_000

let _state = {
  browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  backendReachable: null,
  iaServiceReachable: null,
  status: 'online',
  connectionState: 'checking',
  degraded: false,
  lastCheckedAt: null,
  latency_ms: {
    backend: null,
    ia_service: null,
  },
  errors: {},
}

const _listeners = []

let _recheckTimer = null
let _checkPromise = null
let _initialized = false

async function fetchWithTimeout(url, timeoutMs = HEALTH_CHECK_TIMEOUT) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()

  try {
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    const latency = Date.now() - start
    return { ok: resp.ok, status: resp.status, latency }
  } catch (err) {
    const latency = Date.now() - start
    return { ok: false, status: null, latency, error: err?.message || 'timeout' }
  } finally {
    clearTimeout(timer)
  }
}

function notifyListeners() {
  const snap = { ..._state, latency_ms: { ..._state.latency_ms }, errors: { ..._state.errors } }
  _listeners.forEach((fn) => {
    try {
      fn(snap)
    } catch {
      // Listener errors must not break connectivity state propagation.
    }
  })
}

function scheduleRecheck() {
  if (_recheckTimer) clearTimeout(_recheckTimer)
  _recheckTimer = setTimeout(() => {
    void checkConnectivity()
  }, RECHECK_INTERVAL)
}

function logConnectivity(message, extra = {}) {
  logDebug('DEBUG_CONNECTIVITY', `[Connectivity] ${message}`, extra)
}

export async function checkConnectivity() {
  if (_checkPromise) return _checkPromise

  _checkPromise = runConnectivityCheck().finally(() => {
    _checkPromise = null
  })

  return _checkPromise
}

async function runConnectivityCheck() {
  const previousBackendReachable = _state.backendReachable
  const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  logConnectivity('backend status check started', {
    browserOnline,
    previousBackendReachable,
  })

  if (!browserOnline) {
    _state = {
      browserOnline: false,
      backendReachable: false,
      iaServiceReachable: false,
      status: 'offline',
      connectionState: 'offline_browser',
      degraded: false,
      lastCheckedAt: new Date().toISOString(),
      latency_ms: { backend: null, ia_service: null },
      errors: { browser: 'Sin conexion de red' },
    }
    logConnectivity('browser offline', {
      pendingBackendCheck: false,
      connectionState: _state.connectionState,
    })
    notifyListeners()
    scheduleRecheck()
    return { ..._state }
  }

  try {
    const { useSyncStore } = await import('./sync_store')
    useSyncStore.getState().setConnectionState('checking')
  } catch {
    // Store may not be ready during early bootstrap.
  }

  const backendUrl = `${API_URL}/health/`
  const iaUrl = `${IA_SERVICE_URL}/health`

  logConnectivity('health checks running', {
    backendUrl,
    iaUrl,
  })

  const [backendResult, iaResult] = await Promise.all([
    fetchWithTimeout(backendUrl, HEALTH_CHECK_TIMEOUT),
    fetchWithTimeout(iaUrl, HEALTH_CHECK_TIMEOUT),
  ])

  const errors = {}
  if (!backendResult.ok) {
    errors.backend = backendResult.error || `Health check HTTP ${backendResult.status || 'sin respuesta'}`
  }
  if (!iaResult.ok) {
    errors.ia_service = iaResult.error || `Health check HTTP ${iaResult.status || 'sin respuesta'}`
  }

  const connState = computeConnectionState(browserOnline, backendResult.ok, iaResult.ok)
  const status = connState === 'offline_browser' || connState === 'backend_unreachable' ? 'offline' : 'online'

  _state = {
    browserOnline,
    backendReachable: backendResult.ok,
    iaServiceReachable: iaResult.ok,
    status,
    connectionState: connState,
    degraded: connState === 'degraded',
    lastCheckedAt: new Date().toISOString(),
    latency_ms: {
      backend: backendResult.ok ? backendResult.latency : null,
      ia_service: iaResult.ok ? iaResult.latency : null,
    },
    errors,
  }

  logConnectivity(backendResult.ok ? 'backend reachable' : 'backend unreachable', {
    backendUrl,
    backendStatus: backendResult.status,
    backendError: backendResult.error || errors.backend || '',
    latency: backendResult.latency,
    previousBackendReachable,
    connectionState: connState,
  })

  notifyListeners()
  scheduleRecheck()
  return { ..._state }
}

export function getConnectivityState() {
  return { ..._state, latency_ms: { ..._state.latency_ms }, errors: { ..._state.errors } }
}

export function isBackendReachable() {
  return _state.backendReachable === true
}

export function isOnline() {
  return _state.status !== 'offline'
}

export function subscribeConnectivity(listener) {
  _listeners.push(listener)
  return () => {
    const idx = _listeners.indexOf(listener)
    if (idx !== -1) _listeners.splice(idx, 1)
  }
}

export function initConnectivityService() {
  if (typeof window === 'undefined') return

  if (_initialized) {
    void checkConnectivity()
    return
  }
  _initialized = true

  window.addEventListener('online', () => {
    _state = { ..._state, browserOnline: true, connectionState: 'checking' }
    logConnectivity('browser online')
    notifyListeners()
    void checkConnectivity()
  })

  window.addEventListener('offline', () => {
    _state = {
      ..._state,
      browserOnline: false,
      backendReachable: false,
      iaServiceReachable: false,
      status: 'offline',
      connectionState: 'offline_browser',
      degraded: false,
      lastCheckedAt: new Date().toISOString(),
      latency_ms: { backend: null, ia_service: null },
      errors: { browser: 'Sin conexion de red' },
    }
    logConnectivity('browser offline', {
      connectionState: _state.connectionState,
    })
    notifyListeners()
    scheduleRecheck()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkConnectivity()
    }
  })

  void checkConnectivity()
}


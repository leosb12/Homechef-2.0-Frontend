/**
 * debug_logger.js
 * Central utility for debugging offline-first flow with flag filters.
 */

const DEFAULT_DEBUG_FLAGS = [
  'DEBUG_CONNECTIVITY',
  'DEBUG_AUTH',
  'DEBUG_SYNC',
  'DEBUG_DASHBOARD',
]

function isDevMode() {
  try {
    return Boolean(import.meta.env?.DEV)
  } catch {
    return false
  }
}

if (typeof window !== 'undefined' && isDevMode()) {
  for (const flag of DEFAULT_DEBUG_FLAGS) {
    if (window[flag] === undefined) window[flag] = true
  }
}

export function logDebug(flag, message, extra = {}) {
  if (typeof window === 'undefined') return;

  const enabled = window[flag] === true || localStorage.getItem(flag) === 'true';
  if (!enabled) return;

  const route = window.location.pathname;
  const browserOnline = navigator.onLine;
  
  let backendReachable = null;
  let pendingCount = 0;
  let syncStatus = 'unknown';
  let lastSyncError = '';
  let authStatus = 'unknown';
  let role = localStorage.getItem('homechef_role') || 'unknown';
  let hasToken = !!localStorage.getItem('homechef_access_token');

  if (window.__sync_store) {
    try {
      const syncState = window.__sync_store.getState();
      backendReachable = syncState.backendReachable;
      pendingCount = syncState.pendingCount;
      syncStatus = syncState.syncStatus;
      lastSyncError = syncState.lastError;
    } catch (e) {}
  }
  
  if (window.__auth_session) {
    try {
      const authState = window.__auth_session.getState();
      authStatus = authState.authStatus;
      role = authState.role || role;
      hasToken = !!authState.accessToken || hasToken;
    } catch (e) {}
  }

  // Formatting styling for console logs based on flag
  let color = '#0284c7'; // blue
  if (flag === 'DEBUG_CONNECTIVITY') color = '#10b981'; // green
  if (flag === 'DEBUG_AUTH') color = '#8b5cf6'; // purple
  if (flag === 'DEBUG_SYNC') color = '#f59e0b'; // orange
  if (flag === 'DEBUG_DASHBOARD') color = '#ec4899'; // pink

  console.log(
    `%c[${flag}] ${message}`,
    `color: white; background: ${color}; padding: 2px 6px; border-radius: 4px; font-weight: bold;`,
    {
      route,
      navigatorOnline: browserOnline,
      backendReachable,
      authStatus,
      role,
      accessTokenExists: hasToken,
      pendingCount,
      syncStatus,
      lastSyncError,
      ...extra
    }
  );
}

let registration = null;
let updateAvailable = false;
const callbacks = new Set();

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Evitar doble registro
  if (registration) return;

  window.addEventListener('load', async () => {
    try {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isDev) {
        console.log('[PWA] Ejecutándose en modo de desarrollo local. SW se registrará para pruebas offline.');
      }

      registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service Worker registrado con éxito:', registration.scope);

      // Detectar actualizaciones
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] Nueva versión disponible. Recarga la página para actualizar.');
            updateAvailable = true;
            notifyCallbacks();
          }
        });
      });

      // Manejar cambios de controlador (cuando el nuevo SW toma el control)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

    } catch (error) {
      console.error('[PWA] Error al registrar el Service Worker:', error);
    }
  });
}

export function isUpdateAvailable() {
  return updateAvailable;
}

export function subscribeToUpdates(callback) {
  callbacks.add(callback);
  return () => callbacks.delete(callback);
}

function notifyCallbacks() {
  callbacks.forEach(cb => {
    try { cb(updateAvailable); } catch (e) { console.error(e); }
  });
}

export function updateApp() {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

# Offline-first PWA frontend

## PWA

HomeChef registra un service worker desde `src/main.jsx` usando `src/shared/services/pwa.js`.

Archivos PWA:

- `public/manifest.json`: metadata de instalacion, tema e icono.
- `public/sw.js`: cachea el shell principal (`/`, `index.html`, manifest, favicon y fallback).
- `public/offline.html`: fallback basico cuando no hay shell disponible.

El service worker usa una estrategia simple:

- navegaciones: intenta red y cae a `index.html` cacheado; si no existe, usa `offline.html`.
- assets GET same-origin: responde desde cache cuando existe y actualiza cache desde red.

## IndexedDB

La base local se llama `homechef_offline` y vive en `src/shared/services/offline_db.js`.

Stores:

- `operations`: operaciones pendientes de sincronizar.
- `metadata`: `device_id`, `last_sync` y otros metadatos.
- `mappings`: relacion `local_id -> server_id`.
- `conflicts`: conflictos devueltos por backend.
- `entities`: copia local por entidad para lectura offline.

## Cola offline

La cola esta en `src/shared/services/offline_queue.js`.

Funciones disponibles:

- `enqueueOperation(entity, action, payload, options)`
- `getPendingOperations()`
- `removeSyncedOperations(operationIds)`
- `saveConflict(conflict)`
- `getConflicts()`
- `getLastSync()`
- `setLastSync(serverTime)`
- `getDeviceId()`

Cada operacion incluye:

- `operation_id`
- `entity`
- `action`
- `local_id`
- `server_id`
- `payload`
- `version`
- `created_at`

## Sincronizacion

La sincronizacion esta en `src/shared/services/sync_service.js`.

### Push

`pushPendingOperations()`:

1. lee operaciones pendientes desde IndexedDB;
2. obtiene `device_id` y `last_sync`;
3. envia `POST /api/v1/sync/` usando el cliente `api` configurado con base URL `/api/v1`;
4. elimina operaciones incluidas en `synced`;
5. guarda mapeos `local_id -> server_id` cuando la respuesta los trae;
6. persiste conflictos en `conflicts`;
7. actualiza `last_sync` con `server_time`.

### Pull

`pullChanges(lastSync)`:

1. llama `GET /api/v1/sync/?lastSync=...`;
2. aplica cambios locales por entidad;
3. si llega `deleted_at`, marca eliminacion logica local;
4. actualiza `last_sync` con `server_time`.

## Detector de conexion

`startConnectivitySync()` usa:

- `navigator.onLine`;
- eventos `online` y `offline`;
- store global zustand `useSyncStore`.

El hook `useConnectivity()` expone:

- `isOnline`
- `syncStatus`: `idle | syncing | offline | error | conflict`
- `pendingCount`
- `conflictCount`
- `lastError`

Al volver internet, se ejecuta `syncNow()` automaticamente.

## Entidades sincronizadas

- `dishes`
- `chef_profiles`
- `chef_availability`
- `daily_menus`
- `favorites`
- `preferences`
- `reviews`

No se sincronizan autenticacion Supabase, pagos, suscripciones, notificaciones realtime, pedidos, carrito, ventas ni reservas.

## Integracion actual

Los servicios existentes se mantuvieron como punto de entrada:

- `src/modules/gestion_cocinero/services/chef_service.js`
- `src/modules/marketplace_platos/services/public_dashboard_service.js`

Cuando hay red, intentan la API normal. Si no hay conexion o ocurre error de red, guardan una copia local y encolan la operacion. Las lecturas principales intentan API y caen a IndexedDB si la red falla.

## Conflictos

Si el backend devuelve `conflicts`, se guardan localmente con:

- `operation_id`
- `entity`
- `server_id`
- `reason`
- `server_data`
- `client_data`

El frontend muestra un estado basico en `SyncStatusBadge` y un listado corto en `OfflineConflictsPanel`. Sprint 1/Sprint 2 no resuelve conflictos automaticamente.

## Limitaciones y supuestos

- El endpoint preferido es `/api/v1/sync/`; como `api` ya usa `VITE_API_URL` con `/api/v1`, el frontend llama internamente a `/sync/`.
- Algunas entidades singleton usan IDs locales estables: `me` para perfil/disponibilidad/preferencias y `current` para menu diario.
- La resolucion manual de conflictos queda pendiente.
- La subida de archivos no se vuelve offline-first en este sprint; si no hay red, la imagen debe existir como URL ya disponible.

## Prueba offline con DevTools

1. Ejecuta `npm run build` y sirve la app, o usa `npm run dev` para validar la logica local.
2. Abre Chrome DevTools.
3. Ve a `Application > Service Workers` y confirma que `sw.js` este registrado.
4. En `Application > Manifest`, confirma que carga `manifest.json`.
5. Carga la app una vez con internet para cachear el shell.
6. En `Network`, activa `Offline`.
7. Recarga la app: debe cargar el shell principal o el fallback offline.
8. Crea o edita una entidad soportada, por ejemplo un plato o preferencias.
9. Revisa `Application > IndexedDB > homechef_offline > operations`.
10. Desactiva `Offline`: el badge debe pasar por `Sincronizando` y enviar `POST /api/v1/sync/`.

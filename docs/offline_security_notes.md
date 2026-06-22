# Notas de Seguridad Offline

Este documento reúne las directrices de seguridad, mitigación de riesgos de privacidad y control de acceso implementados en la arquitectura offline-first de HomeChef.

---

## 1. Aislamiento Hermético de Caché

Para evitar que múltiples usuarios que compartan el mismo dispositivo físico (o navegador) puedan ver información privada de otros:

* **Control de Dueño de Caché (Cache Ownership)**: 
  Tanto en `localStorage` como en IndexedDB se almacena un registro de la última sesión válida con la estructura `cache_owner_user_id` y `cache_owner_role`.
* **Vaciado Automático (Auto-Wipe)**:
  Al arrancar la aplicación o intentar guardar una sesión nueva, `offlineSessionService.js` compara el `user_id` y el `role` actuales con los almacenados en la sesión anterior. Si hay cualquier discrepancia, se ejecutan de manera inmediata y atómica:
  1. `clearAllEntities()`: Limpia el almacén de datos del panel de Administrador.
  2. `clearAllLocalData()`: Limpia todas las tablas de caché, metadatos, cola de operaciones y mappings de clientes, chefs y repartidores.
  Esto garantiza que el Usuario B nunca pueda acceder a la caché residual del Usuario A.

---

## 2. Expiración de Sesión Local (Offline TTL)

Una sesión offline no puede extenderse indefinidamente por motivos de seguridad:
* **Expiración síncrona**: Toda sesión offline grabada tiene una fecha de caducidad calculada con un TTL de 7 días (`expires_at`).
* **Validación al inicio**: Al iniciar la aplicación, si el dispositivo no tiene conexión a internet, se evalúa esta fecha de forma síncrona. Si el tiempo expiró, se limpia la sesión offline y se le niega el acceso al usuario redirigiéndolo a la pantalla de Login con el mensaje:
  ```txt
  Tu sesión offline expiró. Conéctate a internet para iniciar sesión.
  ```

---

## 3. Revalidación y Rechazo de Token (Unauthorized Logout)

Cuando el dispositivo recupera conexión a internet, ejecuta de forma transparente la función `revalidateSession()`:
1. Envía el token de acceso actual a `/auth/session/`.
2. Si el backend responde con un código de error de credenciales revocadas o expiradas (`401 Unauthorized` o `403 Forbidden`):
   - Se limpia de inmediato el token de sesión.
   - Se borra la sesión offline (`clearOfflineSession`).
   - Se disparan las rutinas de vaciado de IndexedDB.
   - Se redirige al usuario a `/login` de forma forzada (`homechef:auth-rejected`).

---

## 4. Protección de Datos Sensibles

* **Caché sin secretos**: Bajo ninguna circunstancia se almacena la contraseña del usuario, llaves API privadas del servidor, ni secretos de autenticación en los metadatos o caché IndexedDB.
* **Bloqueo de Transacciones Financieras**: Todo flujo de compra o pago queda deshabilitado offline. Los tokens temporales de Stripe o pasarelas de criptomonedas nunca son persistidos ni recordados localmente.

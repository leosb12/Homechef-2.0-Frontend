# Guía de Pruebas y Checklist Offline

Esta guía proporciona el checklist operativo y los pasos detallados para validar la resiliencia offline de HomeChef en ambientes de desarrollo y QA.

---

## 1. Configuración del Ambiente de Pruebas

Para simular de manera fidedigna una desconexión total (sin red) o desconexión parcial (degradada, donde el navegador tiene internet pero el backend está caído):

### A. Desconexión de Red (Offline Total)
1. Abre Chrome DevTools (`F12`).
2. Ve a la pestaña **Network** (Red).
3. En el menú desplegable de throttling, cambia de *No throttling* a **Offline**.

### B. Desconexión de Backend (Offline Parcial / Degradado)
1. Cierra el proceso de Django en tu consola de terminal.
2. Mantén la pestaña de red de Chrome como *No throttling* (online).
3. Esto simulará un fallo en el servidor o caída del servicio manteniendo conectividad general a internet.

---

## 2. Checklist de Pruebas por Rol

### 👤 Administrador
* [ ] **Caché inicial**: Inicia sesión online, entra a usuarios, cocineros, repartidores y reportes. Confirma que en IndexedDB (`homechef_admin_offline`) se llenan las tablas de `entities`.
* [ ] **Lectura offline**: Activa modo offline en DevTools y recarga la página. Todas las listas deben cargar con los datos cacheados. El badge lateral debe indicar *"Sin conexión"*.
* [ ] **Escritura offline**: Suspende un usuario o valida un cocinero. Verifica que la fila muestre *"Pendiente de sincronizar"* y la cola de mutaciones en IndexedDB sume 1 registro.
* [ ] **Reconexión**: Desactiva el modo offline. Confirma que el badge cambie a *"Sincronizando"* y las acciones se reflejen en la base de datos de Django.

### 🍳 Cocinero
* [ ] **Caché inicial**: Navega por inventario, platos, disponibilidad e historial de pedidos.
* [ ] **Cambio de disponibilidad**: Desconecta la red. Cambia el estado a *"Fuera de servicio"*. El banner general debe mostrar la advertencia y el switch responder localmente.
* [ ] **Gestión de pedidos**: Modifica el estado de un pedido activo (ej. a *"En preparación"*). Comprueba que el timeline responda optimistamente y se encole.
* [ ] **Bloqueos**: Intenta modificar contraseña. Debe aparecer el mensaje: *"El cambio de contraseña requiere conexión"*.

### 🛒 Cliente
* [ ] **Marketplace offline**: Navega por el catálogo de platos offline. Deben cargar las fichas e imágenes desde la caché local.
* [ ] **Carrito local**: Agrega platos, modifica cantidades y elimina artículos. El subtotal y total del carrito deben actualizarse al instante en pantalla.
* [ ] **Checkout seguro**: Intenta proceder al checkout y pagar offline. Confirma que el botón de pago quede deshabilitado y se despliegue: *"El pago requiere conexión. Tu carrito se guardó localmente."*.

### 🚚 Rider (Repartidor)
* [ ] **Transición de entregas**: Avanza los pasos del despacho offline (llegado, retirado, en camino). Verifica que los badges operacionales se actualicen de inmediato.
* [ ] **Mapa fallback**: Abre la pantalla de ruta offline. Asegúrate de que no lance errores en consola y dibuje la **Guía Textual de Entrega**.
* [ ] **Tracking optimizado**: Realiza pings de geolocalización simulados. Verifica en IndexedDB que solo exista una única entrada de geolocalización pendiente en la cola de mutaciones, la cual se actualiza in-situ.

---

## 3. Limpieza de Datos
* [ ] **Aislamiento por usuario**: Inicia sesión como Usuario A. Entra a favoritos. Cierra sesión. Inicia sesión como Usuario B. Comprueba que las tablas de IndexedDB se hayan vaciado por completo en el cambio de cuenta para evitar cruce de datos.

# Matriz de Funcionalidades y Roles Offline

Este documento detalla qué pantallas, datos y acciones están permitidas, cacheadas o bloqueadas para cada rol (Administrador, Cocinero, Cliente y Rider) sin conexión a internet.

---

## 1. Matriz Operativa por Rol

| Rol | Vistas Offline Navegables | Entidades Cacheadas (IndexedDB) | Acciones Permitidas Offline (Cola) | Acciones Bloqueadas Offline (Seguridad) |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador** | Dashboard, Usuarios, Cocineros, Repartidores, Pedidos Delivery, Publicaciones, Auditoría, Reportes Dinámicos. | `users`, `chefs`, `delivery_drivers`, `delivery_orders`, `publications`, `audit_logs`, `report_snapshot` | Validar cocinero/repartidor, suspender usuario, moderar plato. | Cambios de configuración de pasarelas bancarias, reportes en vivo complejos. |
| **Cocinero** | Dashboard, Perfil, Mis Platos, Menú del Día, Inventario, Disponibilidad, Pedidos Recibidos/Activos, Historial, Notificaciones. | `chef_profiles`, `chef_availability`, `dishes`, `daily_menus`, `chef_inventory`, `chef_orders`, `chef_notifications` | Editar plato, actualizar stock de inventario, toggle de disponibilidad, aceptar/preparar/despachar pedido, resolver incidencias, marcar notificaciones. | Crear plato nuevo (por subida de imágenes), cambiar contraseña de cuenta. |
| **Cliente** | Marketplace, Explorar, Detalle Plato, Perfil de Cocinero, Favoritos, Carrito, Mis Pedidos, Detalle Pedido, Tracking, Perfil. | `dishes`, `daily_menus`, `favorites`, `preferences`, `reviews`, `cart`, `client_orders`, `client_addresses`, `client_profiles` | Modificar cantidad de carrito, vaciar carrito, agregar/quitar favorito, actualizar preferencias de comida, cancelar pedido propio, reportar incidencia. | **Pasarelas de pago y Checkout** (Stripe, Bitcoin, QR), Cambio de contraseña de cuenta. |
| **Rider (Delivery)** | Dashboard/Asignados, Entregas Activas, Ruta/Mapa, Incidencias, Historial, Perfil, Centro de Notificaciones. | `rider_profile`, `rider_availability`, `rider_assigned_orders`, `rider_available_orders`, `rider_order_details`, `rider_tracking`, `rider_delivery_history`, `rider_notifications`, `rider_incidents` | Activar/desactivar disponibilidad, aceptar/reclamar oferta, transiciones de entrega (ruta, recogido, entregado, fallido), reportar/resolver incidencias, actualizar vehículo. | Cargar mapa interactivo MapLibre (cae a **Guía Textual**), geolocalización constante por pings (guarda solo la última coordenada). |

---

## 2. Acciones Bloqueadas Globalmente por Seguridad

Por diseño de arquitectura, las siguientes acciones se bloquean sincrónicamente si no hay conexión real al servidor:
1. **Pasarelas de Pago**: Todo flujo de cobro debe completarse estrictamente en línea.
2. **Modificación de Credenciales (Contraseña)**: Evita el secuestro local de cuentas o desincronizaciones críticas en los servidores de identidad.
3. **Subida de Archivos (Imágenes)**: El guardado de imágenes (ej. fotos de platos) requiere interacción directa con servicios de almacenamiento remoto (como Supabase Storage o AWS S3), por lo que se exige conexión activa.

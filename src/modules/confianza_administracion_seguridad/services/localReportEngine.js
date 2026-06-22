// Local Report Engine for Level 3 (total offline local-web)

export const detectLocalFormat = (prompt) => {
    const promptNorm = prompt.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents
    
    // Check for multiple formats or conflicts
    const formatsFound = [];
    if (promptNorm.includes("word") || promptNorm.includes("docx") || promptNorm.includes("documento")) {
        formatsFound.push("word");
    }
    if (promptNorm.includes("pdf")) {
        formatsFound.push("pdf");
    }
    if (promptNorm.includes("excel") || promptNorm.includes("xlsx") || promptNorm.includes("hoja de calculo") || promptNorm.includes("tabla excel") || promptNorm.includes("xls")) {
        formatsFound.push("excel");
    }
    if (promptNorm.includes("pantalla") || promptNorm.includes("ver") || promptNorm.includes("mostrar")) {
        formatsFound.push("screen");
    }
    
    if (formatsFound.length > 1) {
        return {
            output_format: "unknown",
            display_mode: "clarification",
            confidence: 1.0,
            needs_clarification: true,
            clarification_question: "¿En qué formato quieres el reporte: Word, PDF, Excel o en pantalla?"
        };
    }
    
    if (formatsFound.length === 1) {
        const fmt = formatsFound[0];
        return {
            output_format: fmt,
            display_mode: fmt !== "screen" ? "export" : "screen",
            confidence: 1.0,
            needs_clarification: false
        };
    }
    
    // Check for ambiguous export request
    if (promptNorm.includes("exportar") || promptNorm.includes("descargar") || promptNorm.includes("archivo") || promptNorm.includes("pasamelo")) {
        return {
            output_format: "unknown",
            display_mode: "clarification",
            confidence: 1.0,
            needs_clarification: true,
            clarification_question: "¿En qué formato quieres el reporte: Word, PDF, Excel o en pantalla?"
        };
    }
    
    return {
        output_format: "screen",
        display_mode: "screen",
        confidence: 1.0,
        needs_clarification: false
    };
};

export const classifyLocalIntent = (prompt) => {
    const promptNorm = prompt.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^\w\s]/g, ""); // clean punctuation
        
    // Direct matches
    if (promptNorm.includes("ventas de la ultima semana agrupadas por cocinero") || promptNorm.includes("ventas de la ultima semana por cocinero")) return "sales_by_chef";
    if (promptNorm.includes("ventas por cocinero")) return "sales_by_chef";
    if (promptNorm.includes("ventas por dia")) return "sales_by_day";
    if (promptNorm.includes("ventas de hoy") || promptNorm.includes("ingresos de hoy")) return "sales_today";
    if (promptNorm.includes("ventas de este mes") || promptNorm.includes("ingresos de este mes")) return "sales_this_month";
    if (promptNorm.includes("ventas de la ultima semana")) return "sales_last_week";
    if (promptNorm.includes("pedidos por estado") || promptNorm.includes("ordenes por estado")) return "orders_by_status";
    if (promptNorm.includes("pedidos cancelados") || promptNorm.includes("ordenes canceladas")) return "orders_cancelled";
    if (promptNorm.includes("pedidos entregados") || promptNorm.includes("ordenes entregadas")) return "orders_delivered";
    if (promptNorm.includes("usuarios por rol")) return "users_by_role";
    if (promptNorm.includes("usuarios registrados")) return "users_registered";
    if (promptNorm.includes("usuarios activos")) return "users_active";
    if (promptNorm.includes("usuarios bloqueados")) return "users_blocked";
    if (promptNorm.includes("cocineros pendientes")) return "chefs_pending";
    if (promptNorm.includes("cocineros aprobados") || promptNorm.includes("cocineros validados")) return "chefs_approved";
    if (promptNorm.includes("cocineros rechazados")) return "chefs_rejected";
    if (promptNorm.includes("repartidores activos") || promptNorm.includes("riders activos")) return "riders_active";
    if (promptNorm.includes("publicaciones activas") || promptNorm.includes("platos activos")) return "publications_active";
    if (promptNorm.includes("publicaciones rechazadas") || promptNorm.includes("platos rechazados")) return "publications_rejected";
    if (promptNorm.includes("eventos criticos de auditoria") || promptNorm.includes("eventos criticos")) return "audit_critical_events";
    if (promptNorm.includes("eventos de auditoria por categoria") || promptNorm.includes("logs por categoria")) return "audit_by_category";
    if (promptNorm.includes("acciones de administrador") || promptNorm.includes("acciones admin")) return "admin_actions";
    if (promptNorm.includes("uso de ia por proveedor") || promptNorm.includes("ia por proveedor")) return "ai_usage_by_provider";
    if (promptNorm.includes("consultas ia fallidas") || promptNorm.includes("consultas fallidas")) return "ai_failed_queries";
    if (promptNorm.includes("latencia promedio ia") || promptNorm.includes("latencia promedio")) return "ai_avg_latency";
    if (promptNorm.includes("consultas ia por modulo")) return "ai_queries_by_module";
    if (promptNorm.includes("consultas ia por rol")) return "ai_queries_by_role";
    if (promptNorm.includes("uso de chatbot por pantalla") || promptNorm.includes("chatbot por pantalla")) return "chatbot_usage_by_screen";
    if (promptNorm.includes("prompts mas frecuentes") || promptNorm.includes("prompts frecuentes")) return "most_frequent_prompts";
    if (promptNorm.includes("consultas offline")) return "offline_queries";
    if (promptNorm.includes("consultas con fallback")) return "fallback_queries";
    if (promptNorm.includes("alertas de fraude") || promptNorm.includes("alertas de riesgo") || promptNorm.includes("fraude y riesgo") || promptNorm.includes("fraude") || promptNorm.includes("riesgo")) return "fraud_alerts";
    if (promptNorm.includes("acciones pendientes") || promptNorm.includes("cola de acciones") || promptNorm.includes("cola offline") || promptNorm.includes("mutaciones pendientes") || promptNorm.includes("pendientes de sincronizar")) return "pending_mutations";
    
    // Keyword based fallback
    const words = promptNorm.split(/\s+/);
    if (words.includes("cocinero") && words.includes("venta")) return "sales_by_chef";
    if (words.includes("dia") && words.includes("venta")) return "sales_by_day";
    if (words.includes("hoy") && words.includes("venta")) return "sales_today";
    if (words.includes("mes") && words.includes("venta")) return "sales_this_month";
    if (words.includes("semana") && words.includes("venta")) return "sales_last_week";
    if (words.includes("pedido") && words.includes("estado")) return "orders_by_status";
    if (words.includes("cancelado")) return "orders_cancelled";
    if (words.includes("entregado")) return "orders_delivered";
    if (words.includes("rol")) return "users_by_role";
    if (words.includes("usuario") && words.includes("registrado")) return "users_registered";
    if (words.includes("activo") && words.includes("usuario")) return "users_active";
    if (words.includes("bloqueado")) return "users_blocked";
    if (words.includes("pendiente")) return "chefs_pending";
    if (words.includes("aprobado")) return "chefs_approved";
    if (words.includes("rechazado")) return "chefs_rejected";
    if (words.includes("repartidor") || words.includes("rider")) return "riders_active";
    if (words.includes("plato") || words.includes("publicacion")) return "publications_active";
    if (words.includes("critico")) return "audit_critical_events";
    if (words.includes("categoria")) return "audit_by_category";
    if (words.includes("admin")) return "admin_actions";
    if (words.includes("proveedor")) return "ai_usage_by_provider";
    if (words.includes("fallida") || words.includes("error")) return "ai_failed_queries";
    if (words.includes("latencia")) return "ai_avg_latency";
    if (words.includes("modulo")) return "ai_queries_by_module";
    if (words.includes("chatbot")) return "chatbot_usage_by_screen";
    if (words.includes("prompt") || words.includes("pregunta")) return "most_frequent_prompts";
    if (words.includes("offline")) return "offline_queries";
    if (words.includes("fallback")) return "fallback_queries";
    if (words.includes("fraude") || words.includes("riesgo") || words.includes("alerta")) return "fraud_alerts";
    if (words.includes("cola") || (words.includes("pendiente") && words.includes("accion")) || words.includes("sincronizar")) return "pending_mutations";
    
    return null;
};

export const processLocalQuery = (prompt, snapshot, mutations = []) => {
    if (!snapshot || !snapshot.data) return null;
    
    const intent = classifyLocalIntent(prompt);
    if (!intent) return null;
    
    const data = snapshot.data;
    
    // Dynamic KPI helpers
    const getOrderTotal = () => (data.orders || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const getOrderCount = () => (data.orders || []).length;
    const getAiLatency = () => {
        const items = data.audit_ai || [];
        const latencies = items.map(e => Number(e.latency_ms)).filter(l => !isNaN(l) && l > 0);
        return latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    };
    
    switch (intent) {
        case "sales_by_chef": {
            const orders = data.orders || [];
            const sales = {};
            orders.forEach(o => {
                const name = o.chef_name || o.chef?.name || "Desconocido";
                const total = Number(o.total) || 0;
                sales[name] = (sales[name] || 0) + total;
            });
            const rows = Object.entries(sales).map(([cocinero, ventas]) => ({
                cocinero,
                ventas: Math.round(ventas * 100) / 100
            }));
            return {
                title: "Ventas por Cocinero",
                data: rows,
                charts: [{ chart_type: "bar", title: "Ventas por Cocinero", config: { x_key: "cocinero", y_keys: ["ventas"] } }],
                kpis: [
                    { title: "Ventas Totales", value: `$${getOrderTotal().toFixed(2)}` },
                    { title: "Total Pedidos", value: String(getOrderCount()) }
                ],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "sales_by_day": {
            const orders = data.orders || [];
            const sales = {};
            orders.forEach(o => {
                const dateStr = o.last_updated_at ? o.last_updated_at.split('T')[0] : "Sin fecha";
                const total = Number(o.total) || 0;
                sales[dateStr] = (sales[dateStr] || 0) + total;
            });
            const rows = Object.entries(sales).map(([dia, ventas]) => ({
                dia,
                ventas: Math.round(ventas * 100) / 100
            })).sort((a, b) => a.dia.localeCompare(b.dia));
            return {
                title: "Ventas por Día",
                data: rows,
                charts: [{ chart_type: "line", title: "Ventas por Día", config: { x_key: "dia", y_keys: ["ventas"] } }],
                kpis: [{ title: "Ventas Totales", value: `$${getOrderTotal().toFixed(2)}` }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "sales_today": {
            const todayStr = new Date().toISOString().split('T')[0];
            const orders = (data.orders || []).filter(o => o.last_updated_at && o.last_updated_at.startsWith(todayStr));
            const total = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
            return {
                title: "Ventas de Hoy",
                data: [{ ventas: total, pedidos: orders.length }],
                charts: [],
                kpis: [{ title: "Ventas de Hoy", value: `$${total.toFixed(2)}` }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "sales_this_month": {
            const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
            const orders = (data.orders || []).filter(o => o.last_updated_at && o.last_updated_at.startsWith(thisMonth));
            const total = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
            return {
                title: "Ventas del Mes",
                data: [{ ventas: total, pedidos: orders.length }],
                charts: [],
                kpis: [{ title: "Ventas del Mes", value: `$${total.toFixed(2)}` }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "sales_last_week": {
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - 7);
            const orders = (data.orders || []).filter(o => o.last_updated_at && new Date(o.last_updated_at) >= limitDate);
            const total = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
            return {
                title: "Ventas de la Última Semana",
                data: [{ ventas: total, pedidos: orders.length }],
                charts: [],
                kpis: [{ title: "Ventas de la Semana", value: `$${total.toFixed(2)}` }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "orders_by_status": {
            const orders = data.orders || [];
            const counts = {};
            orders.forEach(o => {
                const status = o.order_status_label || o.status_label || o.status || "Desconocido";
                counts[status] = (counts[status] || 0) + 1;
            });
            const rows = Object.entries(counts).map(([estado, cantidad]) => ({ estado, cantidad }));
            return {
                title: "Pedidos por Estado",
                data: rows,
                charts: [{ chart_type: "pie", title: "Pedidos por Estado", config: { x_key: "estado", y_keys: ["cantidad"] } }],
                kpis: [{ title: "Total Pedidos", value: String(getOrderCount()) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "orders_cancelled": {
            const list = (data.orders || []).filter(o => o.order_status === "cancelled" || o.order_status === "cancelado" || o.status === "cancelled");
            const rows = list.map(o => ({
                id: o.order_id || o.id,
                cocinero: o.chef_name || "Desconocido",
                cliente: o.client_name || "Desconocido",
                fecha: o.last_updated_at ? o.last_updated_at.split('T')[0] : ''
            }));
            return {
                title: "Pedidos Cancelados",
                data: rows,
                charts: [],
                kpis: [{ title: "Cancelados", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "orders_delivered": {
            const list = (data.orders || []).filter(o => o.order_status === "delivered" || o.order_status === "entregado" || o.status === "delivered");
            const rows = list.map(o => ({
                id: o.order_id || o.id,
                cocinero: o.chef_name || "Desconocido",
                cliente: o.client_name || "Desconocido",
                fecha: o.last_updated_at ? o.last_updated_at.split('T')[0] : ''
            }));
            return {
                title: "Pedidos Entregados",
                data: rows,
                charts: [],
                kpis: [{ title: "Entregados", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "users_by_role": {
            const users = data.users || [];
            const counts = {};
            users.forEach(u => {
                const role = u.role || "Desconocido";
                counts[role] = (counts[role] || 0) + 1;
            });
            const rows = Object.entries(counts).map(([rol, cantidad]) => ({ rol, cantidad }));
            return {
                title: "Usuarios por Rol",
                data: rows,
                charts: [{ chart_type: "pie", title: "Usuarios por Rol", config: { x_key: "rol", y_keys: ["cantidad"] } }],
                kpis: [{ title: "Total Usuarios", value: String(users.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "users_registered": {
            const count = (data.users || []).length;
            return {
                title: "Usuarios Registrados",
                data: [{ cantidad: count }],
                charts: [],
                kpis: [{ title: "Registrados", value: String(count) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "users_active": {
            const count = (data.users || []).filter(u => u.is_active === 1 || u.is_active === true || String(u.is_active).toLowerCase() === 'true').length;
            return {
                title: "Usuarios Activos",
                data: [{ cantidad: count }],
                charts: [],
                kpis: [{ title: "Activos", value: String(count) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "users_blocked": {
            const count = (data.users || []).filter(u => u.is_active === 0 || u.is_active === false || String(u.is_active).toLowerCase() === 'false').length;
            return {
                title: "Usuarios Bloqueados",
                data: [{ cantidad: count }],
                charts: [],
                kpis: [{ title: "Bloqueados", value: String(count) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "chefs_pending": {
            const list = (data.chefs || []).filter(c => c.status === "pending" || c.status === "pendiente");
            const rows = list.map(c => ({ id: c.id, email: c.email, estado: c.status }));
            return {
                title: "Cocineros Pendientes",
                data: rows,
                charts: [],
                kpis: [{ title: "Pendientes", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "chefs_approved": {
            const list = (data.chefs || []).filter(c => c.status === "approved" || c.status === "aprobado" || c.status === "validado");
            const rows = list.map(c => ({ id: c.id, email: c.email, estado: c.status }));
            return {
                title: "Cocineros Aprobados",
                data: rows,
                charts: [],
                kpis: [{ title: "Aprobados", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "chefs_rejected": {
            const list = (data.chefs || []).filter(c => c.status === "rejected" || c.status === "rechazado");
            const rows = list.map(c => ({ id: c.id, email: c.email, estado: c.status }));
            return {
                title: "Cocineros Rechazados",
                data: rows,
                charts: [],
                kpis: [{ title: "Rechazados", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "riders_active": {
            const list = (data.riders || []).filter(r => r.approval_status === "approved" || r.approval_status === "aprobado");
            const rows = list.map(r => ({ id: r.id, user_id: r.user_id, vehiculo: r.vehicle_type, estado: r.approval_status }));
            return {
                title: "Repartidores Activos",
                data: rows,
                charts: [],
                kpis: [{ title: "Activos", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "publications_active": {
            const list = (data.publications || []).filter(p => p.status === "active" || p.status === "activa" || p.status === "aprobada");
            const rows = list.map(p => ({ id: p.id, name: p.name, price: p.price, status: p.status }));
            return {
                title: "Publicaciones Activas",
                data: rows,
                charts: [],
                kpis: [{ title: "Activas", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "publications_rejected": {
            const list = (data.publications || []).filter(p => p.status === "rejected" || p.status === "rechazada");
            const rows = list.map(p => ({ id: p.id, name: p.name, price: p.price, status: p.status }));
            return {
                title: "Publicaciones Rechazadas",
                data: rows,
                charts: [],
                kpis: [{ title: "Rechazadas", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "audit_critical_events": {
            const list = (data.audit_general || []).filter(e => e.severity === "critical" || e.severity === "danger" || e.severity === "warning");
            const rows = list.map(e => ({
                id: e.id,
                tipo_evento: e.event_type,
                severidad: e.severity,
                descripcion: e.description,
                fecha: e.created_at ? e.created_at.split('T')[0] : ''
            }));
            return {
                title: "Eventos Críticos de Auditoría",
                data: rows,
                charts: [],
                kpis: [{ title: "Críticos", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "audit_by_category": {
            const events = data.audit_general || [];
            const counts = {};
            events.forEach(e => {
                const cat = e.event_category || "Desconocida";
                counts[cat] = (counts[cat] || 0) + 1;
            });
            const rows = Object.entries(counts).map(([categoria, cantidad]) => ({ categoria, cantidad }));
            return {
                title: "Eventos por Categoría",
                data: rows,
                charts: [{ chart_type: "bar", title: "Eventos por Categoría", config: { x_key: "categoria", y_keys: ["cantidad"] } }],
                kpis: [{ title: "Total Categorías", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "admin_actions": {
            const list = (data.audit_general || []).filter(e => e.actor_role === "ADMINISTRADOR" || e.actor_role === "ADMIN");
            const rows = list.map(e => ({
                id: e.id,
                tipo_evento: e.event_type,
                actor: e.actor_name,
                descripcion: e.description,
                fecha: e.created_at ? e.created_at.split('T')[0] : ''
            }));
            return {
                title: "Acciones de Administrador",
                data: rows,
                charts: [],
                kpis: [{ title: "Acciones Admin", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "ai_usage_by_provider": {
            const usages = data.audit_ai || [];
            const counts = {};
            usages.forEach(u => {
                const provider = u.provider || "Desconocido";
                counts[provider] = (counts[provider] || 0) + 1;
            });
            const rows = Object.entries(counts).map(([proveedor, consultas]) => ({ proveedor, consultas }));
            return {
                title: "Uso de IA por Proveedor",
                data: rows,
                charts: [{ chart_type: "pie", title: "Uso de IA por Proveedor", config: { x_key: "proveedor", y_keys: ["consultas"] } }],
                kpis: [{ title: "Total Proveedores", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "ai_failed_queries": {
            const list = (data.audit_ai || []).filter(u => u.status === "failed" || u.status === "error" || u.status === "failed_queries");
            const rows = list.map(u => ({
                id: u.id || u._id,
                proveedor: u.provider,
                modelo: u.model,
                error: u.error || "Error general",
                fecha: u.timestamp ? u.timestamp.split('T')[0] : ''
            }));
            return {
                title: "Consultas IA Fallidas",
                data: rows,
                charts: [],
                kpis: [{ title: "Fallidas", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "ai_avg_latency": {
            const avg = getAiLatency();
            return {
                title: "Latencia Promedio",
                data: [{ latencia_promedio: avg }],
                charts: [],
                kpis: [{ title: "Latencia Promedio", value: `${avg} ms` }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "ai_queries_by_module": {
            const usages = data.audit_ai || [];
            const counts = {};
            usages.forEach(u => {
                const module = u.module || "Desconocido";
                counts[module] = (counts[module] || 0) + 1;
            });
            const rows = Object.entries(counts).map(([modulo, cantidad]) => ({ modulo, cantidad }));
            return {
                title: "Uso por Módulo",
                data: rows,
                charts: [{ chart_type: "bar", title: "Uso por Módulo", config: { x_key: "modulo", y_keys: ["cantidad"] } }],
                kpis: [{ title: "Total Módulos", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "ai_queries_by_role": {
            const usages = data.audit_ai || [];
            const counts = {};
            usages.forEach(u => {
                const role = u.role || "Desconocido";
                counts[role] = (counts[role] || 0) + 1;
            });
            const rows = Object.entries(counts).map(([rol, cantidad]) => ({ rol, cantidad }));
            return {
                title: "Uso por Rol",
                data: rows,
                charts: [{ chart_type: "pie", title: "Uso por Rol", config: { x_key: "rol", y_keys: ["cantidad"] } }],
                kpis: [{ title: "Total Roles", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "chatbot_usage_by_screen": {
            const list = data.user_manual_chatbot_conversations || [];
            const counts = {};
            list.forEach(c => {
                const screen = c.current_screen || "Desconocida";
                counts[screen] = (counts[screen] || 0) + 1;
            });
            const rows = Object.entries(counts).map(([pantalla, cantidad]) => ({ pantalla, cantidad }));
            return {
                title: "Chatbot por Pantalla",
                data: rows,
                charts: [{ chart_type: "bar", title: "Chatbot por Pantalla", config: { x_key: "pantalla", y_keys: ["cantidad"] } }],
                kpis: [{ title: "Total Pantallas", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "most_frequent_prompts": {
            const list = data.audit_ai || [];
            const counts = {};
            list.forEach(u => {
                if (u.prompt) {
                    counts[u.prompt] = (counts[u.prompt] || 0) + 1;
                }
            });
            const rows = Object.entries(counts)
                .map(([prompt, cantidad]) => ({ prompt, cantidad }))
                .sort((a, b) => b.cantidad - a.cantidad)
                .slice(0, 10);
            return {
                title: "Prompts más Frecuentes",
                data: rows,
                charts: [{ chart_type: "bar", title: "Prompts más Frecuentes", config: { x_key: "prompt", y_keys: ["cantidad"] } }],
                kpis: [{ title: "Total Únicos", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "offline_queries": {
            const list = (data.audit_ai || []).filter(u => u.offline_ready === 1 || u.offline_ready === true || String(u.offline_ready).toLowerCase() === 'true');
            return {
                title: "Consultas Offline",
                data: [{ cantidad: list.length }],
                charts: [],
                kpis: [{ title: "Offline Realizadas", value: String(list.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "fallback_queries": {
            const list = (data.audit_ai || []).filter(u => u.fallback_reason !== null && u.fallback_reason !== undefined && u.fallback_reason !== '');
            const rows = list.map(u => ({
                id: u.id || u._id,
                proveedor: u.provider,
                modelo: u.model,
                motivo_fallback: u.fallback_reason,
                fecha: u.timestamp ? u.timestamp.split('T')[0] : ''
            }));
            return {
                title: "Consultas con Fallback",
                data: rows,
                charts: [],
                kpis: [{ title: "Consultas Fallback", value: String(rows.length) }],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "fraud_alerts": {
            const list = data.fraud_risk || [];
            const rows = list.map(item => ({
                id: item.id || item._id,
                plato: item.name || item.dish_name || 'Desconocido',
                score_riesgo: item.ia_risk_score ?? 0,
                estado: item.revision_status || 'requiere_revision',
                reportes: item.reported_count ?? 0
            }));
            const criticalAlerts = list.filter(item => (item.ia_risk_score ?? 0) >= 60).length;
            return {
                title: "Alertas de Fraude y Riesgo",
                data: rows,
                charts: [{ chart_type: "bar", title: "Riesgo por Plato", config: { x_key: "plato", y_keys: ["score_riesgo"] } }],
                kpis: [
                    { title: "Total Alertas", value: String(rows.length) },
                    { title: "Riesgo Crítico (>=60)", value: String(criticalAlerts) }
                ],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        case "pending_mutations": {
            const list = mutations || [];
            const rows = list.map(m => ({
                id: m.id,
                modulo: m.module,
                accion: m.action,
                metodo: m.method,
                estado: m.status,
                intentos: m.attempts,
                fecha: m.created_at ? m.created_at.split('T')[0] : ''
            }));
            return {
                title: "Acciones Pendientes de Sincronizar",
                data: rows,
                charts: [{ chart_type: "pie", title: "Estado de Mutaciones", config: { x_key: "estado", y_keys: ["intentos"] } }],
                kpis: [
                    { title: "Acciones en Cola", value: String(rows.length) },
                    { title: "Pendientes/Fallidas", value: String(list.filter(m => m.status === 'pending' || m.status === 'failed').length) },
                    { title: "Conflictos", value: String(list.filter(m => m.status === 'conflict').length) }
                ],
                suggested_exports: ["excel", "pdf", "word"]
            };
        }
        default:
            return null;
    }
};

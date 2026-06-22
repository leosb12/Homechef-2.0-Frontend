import { api } from '../../../shared/services/api';
import { readListWithFallback, readDetailWithFallback, isNetworkError } from './adminOfflineHelpers';
import { getEntities } from './adminOfflineRepository';

const BASE_PATH = '/trust-admin/delivery-orders/active/';

export async function fetchActiveDeliveryOrders() {
  if (navigator.onLine) {
    try {
      const { data } = await api.get(BASE_PATH);
      const items = Array.isArray(data?.items) ? data.items : [];
      // Note: active orders lists in DB might contain full detail or summary,
      // but let's save the summary to 'orders' so lists display correctly offline.
      await saveEntities('orders', items);
      return data;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  // Offline fallback
  const cached = await getEntities('orders');
  return {
    items: cached,
    summary: {
      total: cached.length,
      ready_for_delivery: cached.filter((item) => item.order_status === 'ready_for_delivery' || item.status === 'ready_for_delivery').length,
      out_for_delivery: cached.filter((item) => item.order_status === 'out_for_delivery' || item.status === 'out_for_delivery').length,
      assigned: cached.filter((item) => item.delivery_assignment?.delivery_user).length,
      unassigned: cached.filter((item) => !item.delivery_assignment?.delivery_user).length,
    },
    __offline: true,
  };
}

export async function fetchActiveDeliveryOrderDetail(orderId) {
  return readDetailWithFallback('orders', orderId, async () => {
    const { data } = await api.get(`${BASE_PATH}${orderId}/`);
    return data;
  });
}
// Helper to save entities
async function saveEntities(moduleName, items) {
  const { saveEntities: dbSave } = await import('./adminOfflineRepository');
  await dbSave(moduleName, items);
}

export async function updateOrderDeliveryStatus(orderId, status) {
  try {
    const { getEntity, saveEntityDirect } = await import('./adminOfflineRepository');
    const order = await getEntity('orders', orderId);
    if (order) {
      await saveEntityDirect('orders', orderId, { ...order, order_status: status, status: status, status_label: status });
    }
  } catch (e) {
    console.warn('Could not update order status locally:', e);
  }

  const { mutateOfflineFirst: dbMutate } = await import('./adminOfflineHelpers');
  return dbMutate(
    'orders',
    'update_status',
    { status },
    orderId,
    async () => {
      const response = await api.post(`/trust-admin/delivery-orders/active/${orderId}/update-status/`, { status });
      return response.data;
    }
  );
}

export async function reassignOrderRider(orderId, riderId) {
  let riderName = 'Repartidor';
  try {
    const { getEntity, saveEntityDirect } = await import('./adminOfflineRepository');
    const order = await getEntity('orders', orderId);
    const rider = await getEntity('riders', riderId);
    if (rider) {
      riderName = `${rider.first_name || ''} ${rider.last_name || ''}`.trim() || rider.email;
    }
    if (order) {
      await saveEntityDirect('orders', orderId, {
        ...order,
        delivery_assignment: {
          ...order.delivery_assignment,
          delivery_user: { id: riderId, name: riderName }
        }
      });
    }
  } catch (e) {
    console.warn('Could not reassign order rider locally:', e);
  }

  const { mutateOfflineFirst: dbMutate } = await import('./adminOfflineHelpers');
  return dbMutate(
    'orders',
    'reassign_rider',
    { rider_id: riderId },
    orderId,
    async () => {
      const response = await api.post(`/trust-admin/delivery-orders/active/${orderId}/reassign-rider/`, { rider_id: riderId });
      return response.data;
    }
  );
}

export async function registerOrderIncident(orderId, incidentText) {
  try {
    const { getEntity, saveEntityDirect } = await import('./adminOfflineRepository');
    const order = await getEntity('orders', orderId);
    if (order) {
      const audit = order.delivery_assignment?.operational_context?.flow_audit || [];
      const updatedAudit = [
        ...audit,
        { label: 'INCIDENCIA', occurred_at: new Date().toISOString(), reason: incidentText }
      ];
      await saveEntityDirect('orders', orderId, {
        ...order,
        delivery_assignment: {
          ...order.delivery_assignment,
          operational_context: {
            ...order.delivery_assignment?.operational_context,
            flow_audit: updatedAudit
          }
        }
      });
    }
  } catch (e) {
    console.warn('Could not register order incident locally:', e);
  }

  const { mutateOfflineFirst: dbMutate } = await import('./adminOfflineHelpers');
  return dbMutate(
    'orders',
    'register_incident',
    { incident: incidentText },
    orderId,
    async () => {
      const response = await api.post(`/trust-admin/delivery-orders/active/${orderId}/register-incident/`, { incident: incidentText });
      return response.data;
    }
  );
}

export async function registerOrderObservation(orderId, observationText) {
  try {
    const { getEntity, saveEntityDirect } = await import('./adminOfflineRepository');
    const order = await getEntity('orders', orderId);
    if (order) {
      const history = order.delivery_assignment?.history || [];
      const updatedHistory = [
        ...history,
        {
          from_status: order.order_status || order.status,
          to_status: order.order_status || order.status,
          actor_role: 'ADMINISTRADOR',
          occurred_at: new Date().toISOString(),
          notes: observationText
        }
      ];
      await saveEntityDirect('orders', orderId, {
        ...order,
        delivery_assignment: {
          ...order.delivery_assignment,
          history: updatedHistory
        }
      });
    }
  } catch (e) {
    console.warn('Could not register order observation locally:', e);
  }

  const { mutateOfflineFirst: dbMutate } = await import('./adminOfflineHelpers');
  return dbMutate(
    'orders',
    'register_observation',
    { observation: observationText },
    orderId,
    async () => {
      const response = await api.post(`/trust-admin/delivery-orders/active/${orderId}/register-observation/`, { observation: observationText });
      return response.data;
    }
  );
}


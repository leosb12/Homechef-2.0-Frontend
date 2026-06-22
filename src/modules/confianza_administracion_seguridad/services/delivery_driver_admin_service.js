import { api } from '../../../shared/services/api';
import { readListWithFallback, mutateOfflineFirst, isNetworkError } from './adminOfflineHelpers';
import { getEntity, saveEntityDirect, getEntities, saveEntities } from './adminOfflineRepository';

const BASE_PATH = '/trust-admin/delivery-drivers/';

export async function fetchDeliveryDrivers(params = {}) {
  if (navigator.onLine) {
    try {
      const { data } = await api.get(BASE_PATH, { params });
      const items = Array.isArray(data?.items) ? data.items : [];
      await saveEntities('riders', items);
      return data;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  // Offline fallback
  let cached = await getEntities('riders');
  const approvalStatus = params.approval_status;
  if (approvalStatus) {
    cached = cached.filter((driver) => driver.approval_status === approvalStatus);
  }

  return {
    items: cached,
    summary: {
      total: cached.length,
      recien_registrado: cached.filter((item) => item.approval_status === 'recien_registrado').length,
      activo: cached.filter((item) => item.approval_status === 'activo').length,
      suspendido: cached.filter((item) => item.approval_status === 'suspendido').length,
    },
    __offline: true,
  };
}

export async function updateDeliveryDriverStatus(userId, approvalStatus) {
  try {
    const rider = await getEntity('riders', userId);
    if (rider) {
      await saveEntityDirect('riders', userId, { ...rider, approval_status: approvalStatus });
    }
  } catch (e) {
    console.warn('Could not update rider status locally:', e);
  }

  return mutateOfflineFirst(
    'riders',
    'update_status',
    { approval_status: approvalStatus },
    userId,
    async () => {
      const { data } = await api.post(`${BASE_PATH}${userId}/status/`, {
        approval_status: approvalStatus,
      });
      return data;
    }
  );
}

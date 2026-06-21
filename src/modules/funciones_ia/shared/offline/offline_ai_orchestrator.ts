import { OfflineFallbackTrigger, isInvalidOnlineResponse, isNetworkLikeError } from './offline_utils';

type FeatureCode = 'cu20' | 'cu22' | 'cu23';

interface OnlineFirstOptions<T> {
  feature: FeatureCode;
  online: () => Promise<T>;
  offline: (reason: string) => Promise<T> | T;
  validateOnline?: (value: T) => boolean;
}

export async function runOnlineFirst<T>({
  feature,
  online,
  offline,
  validateOnline,
}: OnlineFirstOptions<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return offline('Sin conexion del navegador.');
  }

  try {
    const response = await online();
    if (validateOnline && !validateOnline(response)) {
      throw new OfflineFallbackTrigger(`Respuesta online invalida para ${feature}.`);
    }
    return response;
  } catch (error) {
    if (isNetworkLikeError(error) || isInvalidOnlineResponse(error)) {
      const reason = error instanceof Error ? error.message : 'Fallo de red o timeout.';
      console.warn(`[OfflineAI] ${feature} usando fallback local: ${reason}`);
      return offline(reason);
    }
    throw error;
  }
}

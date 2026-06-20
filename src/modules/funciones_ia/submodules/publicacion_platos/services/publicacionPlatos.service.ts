import { api } from '../../../../../shared/services/api';
import type { PublicationAssistRequest, PublicationAssistResponse } from '../types/publicacionPlatos.types';
import { runOnlineFirst } from '../../../shared/offline/offline_ai_orchestrator';
import { assistPublicationOffline } from '../offline/publicacionPlatosOffline.engine';

export async function assistPublication(request: PublicationAssistRequest): Promise<PublicationAssistResponse> {
  return runOnlineFirst<PublicationAssistResponse>({
    feature: 'cu23',
    online: async () => {
      const { data } = await api.post<PublicationAssistResponse>('/ai/publication-helper/', request, { timeout: 9000 });
      return {
        ...data,
        source: data.source || 'online',
        offline_ready: data.offline_ready ?? false,
        mode: data.mode || 'online',
      };
    },
    offline: (reason) => assistPublicationOffline(request, reason),
    validateOnline: (data) => Boolean(data?.success && data?.generated_publication?.title),
  });
}

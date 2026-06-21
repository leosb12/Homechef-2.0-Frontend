import { api } from '../../../../../shared/services/api';
import type { RecipeSuggestRequest, RecipeSuggestResponse } from '../types/asistenteIa.types';
import { runOnlineFirst } from '../../../shared/offline/offline_ai_orchestrator';
import { suggestRecipesOffline } from '../offline/asistenteIaOffline.engine';

export async function suggestRecipes(request: RecipeSuggestRequest): Promise<RecipeSuggestResponse> {
  return runOnlineFirst<RecipeSuggestResponse>({
    feature: 'cu20',
    online: async () => {
      const { data } = await api.post<RecipeSuggestResponse>('/ai/cooking-assistant/', request, { timeout: 9000 });
      return {
        ...data,
        source: data.source || 'online',
        offline_ready: data.offline_ready ?? false,
        mode: data.mode || 'online',
      };
    },
    offline: (reason) => suggestRecipesOffline(request, reason),
    validateOnline: (data) => Array.isArray(data?.suggestions) && Boolean(data?.interpreted_request),
  });
}

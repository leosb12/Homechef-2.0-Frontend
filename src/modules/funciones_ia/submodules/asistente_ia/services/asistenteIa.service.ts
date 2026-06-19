import { api } from '../../../../../shared/services/api';
import type { RecipeSuggestRequest, RecipeSuggestResponse } from '../types/asistenteIa.types';

export async function suggestRecipes(request: RecipeSuggestRequest): Promise<RecipeSuggestResponse> {
  const { data } = await api.post<RecipeSuggestResponse>('/ai/cooking-assistant/', request);
  return data;
}

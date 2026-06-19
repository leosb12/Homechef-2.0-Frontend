import { api } from '../../../../../shared/services/api';
import type { PublicationAssistRequest, PublicationAssistResponse } from '../types/publicacionPlatos.types';

export async function assistPublication(request: PublicationAssistRequest): Promise<PublicationAssistResponse> {
  const { data } = await api.post<PublicationAssistResponse>('/ai/publication-helper/', request);
  return data;
}

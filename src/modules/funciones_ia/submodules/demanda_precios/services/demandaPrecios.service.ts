import axios from 'axios';
import type { ProductionPricingRequest, ProductionPricingResponse, PreviewImputationResponse } from '../types/demandaPrecios.types';

const IA_MICROSERVICE_URL = import.meta.env.VITE_IA_SERVICE_URL || 'http://localhost:8001';

const iaMicroserviceApi = axios.create({
  baseURL: `${IA_MICROSERVICE_URL}/api/v1/ai`,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'anonymous',
  },
});

export async function getPricingRecommendation(request: ProductionPricingRequest): Promise<ProductionPricingResponse> {
  const { data } = await iaMicroserviceApi.post<ProductionPricingResponse>('/production-pricing/recommend', request);
  return data;
}

export async function getPreviewImputation(request: ProductionPricingRequest): Promise<PreviewImputationResponse> {
  const { data } = await iaMicroserviceApi.post<PreviewImputationResponse>('/production-pricing/preview-imputation', request);
  return data;
}

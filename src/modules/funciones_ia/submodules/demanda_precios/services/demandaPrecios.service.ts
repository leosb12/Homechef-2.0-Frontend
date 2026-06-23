import axios from 'axios';
import type { ProductionPricingRequest, ProductionPricingResponse, PreviewImputationResponse } from '../types/demandaPrecios.types';
import { runOnlineFirst } from '../../../shared/offline/offline_ai_orchestrator';
import { previewPricingOffline, recommendPricingOffline } from '../offline/demandaPreciosOffline.engine';

const runtimeConfig =
  typeof globalThis !== 'undefined' ? ((globalThis as any).__HOMECHEF_RUNTIME_CONFIG || {}) : {};

const IA_MICROSERVICE_URL =
  runtimeConfig.VITE_IA_SERVICE_URL ||
  runtimeConfig.IA_SERVICE_URL ||
  import.meta.env.VITE_IA_SERVICE_URL ||
  'https://proyecto.leonardoserrate.xyz/ia';

const iaMicroserviceApi = axios.create({
  baseURL: `${IA_MICROSERVICE_URL}/api/v1/ai`,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'anonymous',
  },
});

export async function getPricingRecommendation(request: ProductionPricingRequest): Promise<ProductionPricingResponse> {
  return runOnlineFirst<ProductionPricingResponse>({
    feature: 'cu22',
    online: async () => {
      const { data } = await iaMicroserviceApi.post<ProductionPricingResponse>('/production-pricing/recommend', request, { timeout: 9000 });
      return {
        ...data,
        source: data.source || 'online',
        offline_ready: data.offline_ready ?? false,
        mode: data.mode || 'online',
      };
    },
    offline: (reason) => recommendPricingOffline(request, reason),
    validateOnline: (data) => Boolean(data?.dish_name) && Number.isFinite(Number(data?.suggested_price_bs)),
  });
}

export async function getPreviewImputation(request: ProductionPricingRequest): Promise<PreviewImputationResponse> {
  return runOnlineFirst<PreviewImputationResponse>({
    feature: 'cu22',
    online: async () => {
      const { data } = await iaMicroserviceApi.post<PreviewImputationResponse>('/production-pricing/preview-imputation', request, { timeout: 9000 });
      return {
        ...data,
        source: data.source || 'online',
        offline_ready: data.offline_ready ?? false,
        mode: data.mode || 'online',
      };
    },
    offline: () => previewPricingOffline(request),
    validateOnline: (data) => Boolean(data?.completed_input) && Array.isArray(data?.warnings),
  });
}

import axios from 'axios';
import { answerWithFrontendManual } from '../offline/frontendManualEngine';
import type { ManualChatRequest, ManualChatResponse, ManualUserRole } from '../types/userManualChatbot.types';

const runtimeConfig =
  typeof globalThis !== 'undefined' ? ((globalThis as any).__HOMECHEF_RUNTIME_CONFIG || {}) : {};

const IA_SERVICE_URL =
  runtimeConfig.VITE_IA_SERVICE_URL ||
  runtimeConfig.IA_SERVICE_URL ||
  import.meta.env.VITE_IA_SERVICE_URL ||
  'https://proyecto.leonardoserrate.xyz/ia';

const iaServiceApi = axios.create({
  baseURL: `${IA_SERVICE_URL}/api/v1/ai/user-manual-chatbot`,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'anonymous',
  },
});

export async function askUserManualChatbot(request: ManualChatRequest): Promise<ManualChatResponse> {
  const onlineAllowed = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (onlineAllowed) {
    try {
      const { data } = await iaServiceApi.post('/chat', toServiceRequest(request, onlineAllowed), { timeout: 8000 });
      const normalized = normalizeServiceResponse(data);
      if (normalized.answer && normalized.grounded) return normalized;
      return answerWithFrontendManual(request, 'invalid_ia_service_response');
    } catch (error) {
      return answerWithFrontendManual(request, getFallbackReason(error));
    }
  }
  return answerWithFrontendManual(request, 'browser_offline');
}

export function normalizeRole(rawRole?: string | null): ManualUserRole {
  const value = String(rawRole || '').toLowerCase();
  if (value.includes('cocinero') || value.includes('chef')) return 'cocinero';
  if (value.includes('cliente') || value.includes('client')) return 'cliente';
  if (value.includes('admin')) return 'admin';
  if (value.includes('repartidor') || value.includes('delivery')) return 'repartidor';
  if (value.includes('usuario')) return 'usuario';
  return rawRole ? 'usuario' : 'visitante';
}

export function getManualSessionId(): string {
  const key = 'homechef_manual_chatbot_session_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, created);
  return created;
}

function toServiceRequest(request: ManualChatRequest, onlineAllowed: boolean) {
  return {
    message: request.message,
    user_role: request.userRole,
    current_route: request.currentRoute,
    current_screen: request.currentScreen,
    platform: request.platform,
    session_id: request.sessionId,
    user_id: request.userId,
    auth_token: request.authToken,
    online_allowed: onlineAllowed,
    context: request.context || {},
  };
}

function normalizeServiceResponse(data: any): ManualChatResponse {
  return {
    source: data?.source || 'service_local_model',
    mode: data?.mode || 'service_local',
    offline_ready: data?.offline_ready ?? true,
    answer: String(data?.answer || ''),
    steps: Array.isArray(data?.steps) ? data.steps.map(String) : [],
    relatedUseCases: Array.isArray(data?.related_use_cases)
      ? data.related_use_cases.map(String)
      : Array.isArray(data?.relatedUseCases)
        ? data.relatedUseCases.map(String)
        : [],
    relatedModule: data?.related_module || data?.relatedModule,
    suggestedActions: Array.isArray(data?.suggested_actions)
      ? data.suggested_actions.map(String)
      : Array.isArray(data?.suggestedActions)
        ? data.suggestedActions.map(String)
        : [],
    confidence: Number.isFinite(Number(data?.confidence)) ? Number(data.confidence) : undefined,
    grounded: data?.grounded ?? true,
    needsMoreContext: data?.needs_more_context ?? data?.needsMoreContext ?? false,
    fallbackReason: data?.fallback_reason || data?.fallbackReason,
    auditId: data?.audit_id || data?.auditId,
    userVisibleNotice: data?.user_visible_notice || data?.userVisibleNotice,
    debug: {
      relatedUseCases: Array.isArray(data?.related_use_cases) ? data.related_use_cases.map(String) : [],
      relatedModule: data?.related_module,
      confidence: Number.isFinite(Number(data?.confidence)) ? Number(data.confidence) : undefined,
      source: data?.source,
      mode: data?.mode,
    },
  };
}

function getFallbackReason(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'ia_service_timeout';
    if (!error.response) return 'ia_service_network_error';
    return `ia_service_http_${error.response.status}`;
  }
  return 'ia_service_error';
}

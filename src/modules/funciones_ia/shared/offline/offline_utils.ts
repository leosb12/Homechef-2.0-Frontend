import axios from 'axios';

const NETWORK_ERROR_CODES = new Set([
  'ERR_NETWORK',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ERR_CANCELED',
]);

export function normalizeText(value: string | undefined | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(value: string | undefined | null): string[] {
  const stop = new Set(['con', 'para', 'una', 'uno', 'unos', 'unas', 'del', 'las', 'los', 'que', 'tengo', 'quiero']);
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !stop.has(token));
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isNetworkLikeError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status;
      return status === 408 || status >= 500;
    }
    if (error.code && NETWORK_ERROR_CODES.has(error.code)) return true;
    return !error.response && Boolean(error.request);
  }
  const message = String((error as Error)?.message || '').toLowerCase();
  return message.includes('network') || message.includes('timeout') || message.includes('failed to fetch');
}

export function isInvalidOnlineResponse(error: unknown): boolean {
  return error instanceof OfflineFallbackTrigger;
}

export class OfflineFallbackTrigger extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineFallbackTrigger';
  }
}

export function canBypassIAAccessForOfflineDev(functionCode?: string): boolean {
  const allowed =
    functionCode === 'asistente_ia' ||
    functionCode === 'demanda_precios' ||
    functionCode === 'publicacion_platos' ||
    functionCode === 'vision_artificial';
  if (!allowed) return false;
  if (import.meta.env.PROD) {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('homechef_access_token');
    const cached = localStorage.getItem(`homechef_ia_permission_${functionCode}`);
    if (!token || !cached) return false;
    try {
      const parsed = JSON.parse(cached);
      return Boolean(parsed.permitido);
    } catch {
      return false;
    }
  }
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

export function offlineNoticeText(): string {
  return 'Modo offline activo: resultado generado localmente en tu navegador.';
}

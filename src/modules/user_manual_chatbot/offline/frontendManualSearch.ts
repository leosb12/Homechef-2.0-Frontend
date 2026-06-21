import { frontendManualDataset, routeMatches } from './frontendManualDataset';
import type { ManualKnowledgeEntry, ManualUserRole } from '../types/userManualChatbot.types';

const stopWords = new Set([
  'a', 'al', 'algo', 'aqui', 'como', 'con', 'cuando', 'de', 'del', 'donde',
  'el', 'en', 'esta', 'este', 'hacer', 'hago', 'la', 'las', 'lo', 'los',
  'me', 'mi', 'mis', 'para', 'por', 'que', 'quiero', 'se', 'si', 'un',
  'una', 'usar', 'uso', 'ver', 'y',
]);

const domainTerms = new Set([
  'homechef', 'plato', 'platos', 'comida', 'cocinero', 'cliente', 'admin',
  'repartidor', 'delivery', 'pedido', 'pedidos', 'menu', 'inventario',
  'precio', 'precios', 'demanda', 'ia', 'publicacion', 'perfil', 'carrito',
  'checkout', 'pago', 'ruta', 'notificacion', 'suscripcion', 'marketplace',
  'usuario', 'ingresos', 'favoritos', 'resena', 'fraude', 'seguridad',
]);

const outOfDomainTerms = new Set([
  'fisica', 'cuantica', 'politica', 'medicina', 'medico', 'criptomoneda',
  'criptomonedas', 'inversion', 'pelicula', 'ecuacion', 'diferencial',
]);

export interface ManualSearchHit {
  entry: ManualKnowledgeEntry;
  score: number;
  matchedTerms: string[];
}

export function searchManualDataset({
  message,
  role,
  currentRoute,
  currentScreen,
  limit = 5,
}: {
  message: string;
  role?: ManualUserRole;
  currentRoute?: string;
  currentScreen?: string;
  limit?: number;
}): ManualSearchHit[] {
  const normalizedMessage = normalizeText(message);
  const isContextual = /que hago aqui|donde estoy|que significa esta pantalla|no entiendo/.test(normalizedMessage);
  const queryTokens = new Set(tokenize(`${message} ${currentScreen || ''} ${isContextual ? currentRoute || '' : ''}`));

  const hits = frontendManualDataset
    .map((entry) => {
      const entryTokens = new Set(tokenize(entryText(entry)));
      const matchedTerms = [...queryTokens].filter((token) => entryTokens.has(token));
      let score = matchedTerms.length / Math.sqrt(Math.max(1, entryTokens.size));

      if (role && (entry.roles.includes(role) || entry.roles.includes('usuario'))) score += 0.16;
      if (currentRoute && entry.routes.some((route) => routeMatches(route, currentRoute))) {
        score += isContextual ? 0.55 : 0.28;
      }
      if (entry.keywords.some((keyword) => normalizeText(keyword) && normalizedMessage.includes(normalizeText(keyword)))) {
        score += 0.18;
      }
      if (entry.useCases.some((useCase) => normalizedMessage.includes(normalizeText(useCase)))) {
        score += 0.14;
      }
      if (entry.entryType === 'faq') score += 0.04;
      return { entry, score: Math.max(0, score), matchedTerms };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return hits;
}

export function isHomeChefQuestion(message: string, hits: ManualSearchHit[]): boolean {
  const tokens = tokenize(message);
  const hasDomainTerms = tokens.some((token) => domainTerms.has(token));
  if (tokens.some((token) => outOfDomainTerms.has(token)) && !hasDomainTerms) return false;
  if (hasDomainTerms) return true;
  return Boolean(hits[0] && hits[0].score >= 0.18);
}

export function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^a-z0-9/:\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token && !stopWords.has(token))
    .flatMap((token) => {
      if (token.endsWith('es') && token.length > 5) return [token, token.slice(0, -2)];
      if (token.endsWith('s') && token.length > 4) return [token, token.slice(0, -1)];
      return [token];
    });
}

function entryText(entry: ManualKnowledgeEntry): string {
  return [
    entry.id,
    entry.title,
    entry.entryType,
    entry.roles.join(' '),
    entry.module,
    entry.useCases.join(' '),
    entry.routes.join(' '),
    entry.screens.join(' '),
    entry.description,
    entry.steps.join(' '),
    entry.keywords.join(' '),
  ].join(' ');
}

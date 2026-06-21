import { searchManualDataset, isHomeChefQuestion } from './frontendManualSearch';
import type { ManualChatRequest, ManualChatResponse } from '../types/userManualChatbot.types';

export function answerWithFrontendManual(request: ManualChatRequest, fallbackReason = 'ia_service_unavailable'): ManualChatResponse {
  const dataAnswer = answerRealDataQuestionFromContext(request, fallbackReason);
  if (dataAnswer) return dataAnswer;

  const hits = searchManualDataset({
    message: request.message,
    role: request.userRole,
    currentRoute: request.currentRoute,
    currentScreen: request.currentScreen,
    limit: 5,
  });

  if (!isHomeChefQuestion(request.message, hits)) {
    return {
      source: 'frontend_local',
      mode: 'frontend_offline',
      offline_ready: true,
      answer: 'Solo puedo ayudarte con el uso de HomeChef: pantallas, roles, pedidos, marketplace, gestion del cocinero, delivery, administracion y funciones IA. Reformula tu pregunta sobre HomeChef y te guio paso a paso.',
      steps: [],
      relatedUseCases: [],
      relatedModule: 'Manual contextual',
      suggestedActions: ['Pregunta por una pantalla, rol o caso de uso de HomeChef.'],
      confidence: 0.84,
      grounded: true,
      needsMoreContext: true,
      fallbackReason,
    };
  }

  if (!hits.length || hits[0].score < 0.18) {
    return {
      source: 'frontend_local',
      mode: 'frontend_offline',
      offline_ready: true,
      answer: 'Con la informacion disponible no puedo confirmarlo con seguridad. Te puedo guiar con el flujo general si me indicas tu rol, la pantalla o la accion que quieres realizar.',
      steps: ['Indica tu rol.', 'Menciona la pantalla o accion.', 'Si estas en una pantalla, pregunta: que hago aqui.'],
      relatedUseCases: collectUseCases(hits),
      relatedModule: hits[0]?.entry.module || 'Manual contextual',
      suggestedActions: ['Agrega mas contexto sobre la pantalla o modulo.'],
      confidence: 0.32,
      grounded: true,
      needsMoreContext: true,
      fallbackReason,
    };
  }

  const best = hits[0].entry;
  if (best.id === 'faq_out_of_domain') {
    return {
      source: 'frontend_local',
      mode: 'frontend_offline',
      offline_ready: true,
      answer: 'Solo puedo ayudarte con el uso de HomeChef: pantallas, roles, pedidos, marketplace, gestion del cocinero, delivery, administracion y funciones IA. Reformula tu pregunta sobre HomeChef y te guio paso a paso.',
      steps: [],
      relatedUseCases: [],
      relatedModule: 'Manual contextual',
      suggestedActions: ['Pregunta por una pantalla, rol o caso de uso de HomeChef.'],
      confidence: 0.84,
      grounded: true,
      needsMoreContext: true,
      fallbackReason,
    };
  }
  const steps = collectSteps(hits);
  const relatedUseCases = collectUseCases(hits);
  const screen = request.currentScreen || best.screens[0] || best.title;
  const routeMatchesCurrent = Boolean(request.currentRoute && best.routes.some((route) => routeMatchesLocal(route, request.currentRoute || '')));
  const intro = routeMatchesCurrent ? `Estas en ${screen}. ` : '';
  const stepsText = steps.length ? ` Pasos recomendados: ${steps.slice(0, 5).map((step, index) => `${index + 1}) ${step}`).join(' ')}` : '';

  return {
    source: 'frontend_local',
    mode: 'frontend_offline',
    offline_ready: true,
    answer: `${intro}${best.description}${stepsText}`,
    steps,
    relatedUseCases,
    relatedModule: best.module,
    suggestedActions: steps.slice(0, 3),
    confidence: Math.max(0.35, Math.min(0.95, Number((0.22 + hits[0].score / 1.4).toFixed(2)))),
    grounded: true,
    needsMoreContext: false,
    fallbackReason,
  };
}

function answerRealDataQuestionFromContext(request: ManualChatRequest, fallbackReason: string): ManualChatResponse | null {
  const message = normalizeForIntent(request.message);
  const asksDishes = /\b(platos?|publicaciones?)\b/.test(message) && /\b(tengo|mis|publicados?|pausados?|borradores?|cuantos|cuales|lista|aparecen)\b/.test(message);
  if (!asksDishes) return null;

  const context = request.context || {};
  const allDishes = normalizeDishes(context.all_dishes) || normalizeDishes(context.visible_dishes);
  const visibleDishes = normalizeDishes(context.visible_dishes) || allDishes;
  const sourceText = visibleDishes?.length ? 'Segun lo que se ve en esta pantalla' : 'No puedo ver tus platos reales ahora porque estoy en modo offline';

  if (!allDishes?.length && !visibleDishes?.length) {
    return {
      source: 'frontend_local',
      mode: 'frontend_offline',
      offline_ready: true,
      answer: `${sourceText}. Para revisarlos, entra a Mis platos y usa los filtros Publicados, Borradores o Pausados.`,
      steps: ['Entra a Mis platos.', 'Revisa la lista o los filtros de estado.', 'Actualiza la pagina cuando vuelvas a tener conexion si falta informacion.'],
      relatedUseCases: ['CU-15'],
      relatedModule: 'Gestion del cocinero',
      confidence: 0.7,
      grounded: true,
      needsMoreContext: true,
      fallbackReason,
      userVisibleNotice: 'No puedo consultar el servidor ahora; respondo con lo disponible en esta pantalla.',
    };
  }

  const dishes = allDishes?.length ? allDishes : visibleDishes || [];
  const published = dishes.filter((dish) => isStatus(dish, 'published', 'publicado'));
  const paused = dishes.filter((dish) => isStatus(dish, 'paused', 'pausado'));
  const draft = dishes.filter((dish) => isStatus(dish, 'draft', 'borrador'));

  if (/\bcuantos?\b/.test(message)) {
    return dataResponse(`${sourceText}, tienes ${dishes.length} plato${dishes.length === 1 ? '' : 's'} en total: ${published.length} publicado${published.length === 1 ? '' : 's'}, ${paused.length} pausado${paused.length === 1 ? '' : 's'} y ${draft.length} borrador${draft.length === 1 ? '' : 'es'}.`, fallbackReason);
  }

  if (/\bpausados?\b/.test(message)) {
    return dataResponse(paused.length ? `${sourceText}, tienes pausados: ${joinNames(paused)}.` : `${sourceText}, no aparece ningun plato pausado.`, fallbackReason);
  }

  if (/\bborradores?\b/.test(message)) {
    return dataResponse(draft.length ? `${sourceText}, tienes como borrador: ${joinNames(draft)}.` : `${sourceText}, no aparece ningun borrador.`, fallbackReason);
  }

  if (/\bpublicados?\b/.test(message)) {
    const parts = [];
    if (published.length) parts.push(`tienes publicados: ${joinNames(published)}`);
    else parts.push('no aparece ningun plato publicado');
    if (paused.length) parts.push(`Tambien tienes ${joinNames(paused)} en estado pausado`);
    if (draft.length) parts.push(`Y ${joinNames(draft)} como borrador`);
    return dataResponse(`${sourceText}, ${parts.join('. ')}.`, fallbackReason);
  }

  return dataResponse(`${sourceText}, aparecen ${dishes.length} plato${dishes.length === 1 ? '' : 's'}: ${joinNamesWithStatus(dishes)}.`, fallbackReason);
}

function dataResponse(answer: string, fallbackReason: string): ManualChatResponse {
  return {
    source: 'frontend_local',
    mode: 'frontend_offline',
    offline_ready: true,
    answer,
    steps: [],
    relatedUseCases: ['CU-15'],
    relatedModule: 'Gestion del cocinero',
    confidence: 0.88,
    grounded: true,
    needsMoreContext: false,
    fallbackReason,
    userVisibleNotice: fallbackReason === 'browser_offline' || fallbackReason.includes('network') || fallbackReason.includes('timeout')
      ? 'Estoy usando los datos disponibles en esta pantalla.'
      : undefined,
  };
}

function normalizeDishes(value: unknown): Array<{ name: string; status: string; rawStatus: string; price?: number; portions?: number }> | null {
  if (!Array.isArray(value)) return null;
  return value
    .map((item: any) => ({
      name: String(item?.name || '').trim(),
      status: String(item?.status || '').trim(),
      rawStatus: String(item?.raw_status || item?.rawStatus || '').trim(),
      price: Number.isFinite(Number(item?.price)) ? Number(item.price) : undefined,
      portions: Number.isFinite(Number(item?.portions)) ? Number(item.portions) : undefined,
    }))
    .filter((dish) => dish.name);
}

function isStatus(dish: { status: string; rawStatus: string }, raw: string, label: string) {
  const value = normalizeForIntent(`${dish.rawStatus} ${dish.status}`);
  return value.includes(raw) || value.includes(label);
}

function joinNames(dishes: Array<{ name: string }>) {
  return dishes.map((dish) => dish.name).join(', ');
}

function joinNamesWithStatus(dishes: Array<{ name: string; status: string }>) {
  return dishes.map((dish) => `${dish.name}${dish.status ? ` (${dish.status})` : ''}`).join(', ');
}

function normalizeForIntent(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function collectSteps(hits: ReturnType<typeof searchManualDataset>): string[] {
  const steps: string[] = [];
  hits.slice(0, 3).forEach((hit) => {
    hit.entry.steps.forEach((step) => {
      if (step && !steps.includes(step)) steps.push(step);
    });
  });
  return steps.slice(0, 6);
}

function collectUseCases(hits: ReturnType<typeof searchManualDataset>): string[] {
  const useCases: string[] = [];
  hits.forEach((hit) => {
    hit.entry.useCases.forEach((useCase) => {
      if (useCase && !useCases.includes(useCase)) useCases.push(useCase);
    });
  });
  if (useCases.includes('CU-36') && !useCases.includes('CU-37')) useCases.push('CU-37');
  return useCases;
}

function routeMatchesLocal(pattern: string, route: string): boolean {
  if (!pattern || !route) return false;
  if (pattern === route) return true;
  const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:id/g, '[^/]+')}$`);
  return regex.test(route);
}

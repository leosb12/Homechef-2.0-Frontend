import { describe, expect, it } from 'vitest';
import { answerWithFrontendManual } from '../frontendManualEngine';
import { sanitizeAssistantAnswerForUser } from '../../components/ChatbotWidget';

describe('frontend user manual chatbot engine', () => {
  it('answers CU-15 for chef plate publication', () => {
    const response = answerWithFrontendManual({
      message: 'Como publico un plato?',
      userRole: 'cocinero',
      currentRoute: '/chef/dishes',
      currentScreen: 'Mis platos',
      platform: 'web',
    });

    expect(response.source).toBe('frontend_local');
    expect(response.relatedUseCases).toContain('CU-15');
    expect(response.answer).toContain('plato');
    expect(response.answer).not.toMatch(/CU-\d{2}/);
  });

  it('answers the delivery order flow for clients', () => {
    const response = answerWithFrontendManual({
      message: 'Como pido delivery?',
      userRole: 'cliente',
      currentRoute: '/client/explore',
      currentScreen: 'Explorar platos',
      platform: 'web',
    });

    ['CU-08', 'CU-09', 'CU-24', 'CU-25', 'CU-26', 'CU-31'].forEach((useCase) => {
      expect(response.relatedUseCases).toContain(useCase);
    });
  });

  it('uses current route when user asks what to do here', () => {
    const response = answerWithFrontendManual({
      message: 'Que hago aqui?',
      userRole: 'cocinero',
      currentRoute: '/chef/menu',
      currentScreen: 'Menu del dia',
      platform: 'web',
    });

    expect(response.relatedUseCases).toContain('CU-16');
    expect(response.answer).toContain('Menu del dia');
  });

  it('answers CU-22 for demand and pricing questions', () => {
    const response = answerWithFrontendManual({
      message: 'Donde esta demanda y precios?',
      userRole: 'cocinero',
      currentRoute: '/chef/ai/assistant',
      currentScreen: 'Asistente IA',
      platform: 'web',
    });

    expect(response.relatedUseCases).toContain('CU-22');
  });

  it('does not hallucinate out-of-domain answers', () => {
    const response = answerWithFrontendManual({
      message: 'Explicame fisica cuantica',
      userRole: 'cliente',
      currentRoute: '/client/explore',
      currentScreen: 'Explorar platos',
      platform: 'web',
    });

    expect(response.needsMoreContext).toBe(true);
    expect(response.relatedUseCases).toEqual([]);
    expect(response.answer).toContain('HomeChef');
  });

  it('uses visible dishes context for published dishes without showing technical metadata', () => {
    const response = answerWithFrontendManual({
      message: 'que platos tengo publicados',
      userRole: 'cocinero',
      currentRoute: '/chef/dishes',
      currentScreen: 'Mis platos',
      platform: 'web',
      context: {
        visible_dishes: [
          { name: 'Pato al horno', price: 55, portions: 3, status: 'Publicado', raw_status: 'published' },
          { name: 'Charque Tradicional Boliviano', price: 35, portions: 1, status: 'Pausado', raw_status: 'paused' },
          { name: 'Papalisa Tradicional Boliviana', price: 30, portions: 1, status: 'Publicado', raw_status: 'published' },
          { name: 'Locro Tradicional Boliviano', price: 18, portions: 1, status: 'Publicado', raw_status: 'published' },
        ],
      },
    });

    expect(response.answer).toContain('Pato al horno');
    expect(response.answer).toContain('Papalisa Tradicional Boliviana');
    expect(response.answer).toContain('Locro Tradicional Boliviano');
    expect(response.answer).toContain('Charque Tradicional Boliviano');
    expect(response.answer).not.toMatch(/CU-\d{2}/);
  });

  it('does not invent real dishes when offline and no visible data exists', () => {
    const response = answerWithFrontendManual({
      message: 'cuales son mis platos',
      userRole: 'cocinero',
      currentRoute: '/chef/dishes',
      currentScreen: 'Mis platos',
      platform: 'web',
      context: {},
    }, 'browser_offline');

    expect(response.answer).toContain('No puedo ver tus platos reales');
    expect(response.answer).not.toContain('Pato al horno');
    expect(response.answer).not.toMatch(/CU-\d{2}/);
  });

  it('sanitizes technical metadata before rendering user-visible text', () => {
    const visible = sanitizeAssistantAnswerForUser('Para publicar, entra a Mis platos. Esto se relaciona con CU-15, CU-23. Confianza: 97%');
    expect(visible).toBe('Para publicar, entra a Mis platos.');
    expect(visible).not.toMatch(/CU-\d{2}|Confianza/);
  });
});

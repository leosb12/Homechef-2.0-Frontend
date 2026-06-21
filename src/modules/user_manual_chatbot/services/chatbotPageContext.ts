import type { ChatbotPageContext } from '../types/userManualChatbot.types';

const contexts = new Map<string, ChatbotPageContext>();

declare global {
  interface Window {
    __homechefChatbotContexts?: Record<string, ChatbotPageContext>;
  }
}

export function setChatbotPageContext(route: string, data: Record<string, unknown>, screen?: string) {
  const context: ChatbotPageContext = {
    route,
    screen,
    updatedAt: Date.now(),
    data,
  };
  contexts.set(route, context);
  if (typeof window !== 'undefined') {
    window.__homechefChatbotContexts = {
      ...(window.__homechefChatbotContexts || {}),
      [route]: context,
    };
  }
}

export function clearChatbotPageContext(route: string) {
  contexts.delete(route);
  if (typeof window !== 'undefined' && window.__homechefChatbotContexts) {
    delete window.__homechefChatbotContexts[route];
  }
}

export function getChatbotPageContext(route: string): Record<string, unknown> {
  const direct = contexts.get(route) || (typeof window !== 'undefined' ? window.__homechefChatbotContexts?.[route] : undefined);
  if (direct) return { ...direct.data, context_updated_at: direct.updatedAt };

  const prefix = [...contexts.values()]
    .filter((item) => route.startsWith(item.route))
    .sort((a, b) => b.route.length - a.route.length)[0];
  if (prefix) return { ...prefix.data, context_updated_at: prefix.updatedAt };

  return {};
}


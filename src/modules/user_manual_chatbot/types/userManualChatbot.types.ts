export type ManualUserRole = 'visitante' | 'cliente' | 'cocinero' | 'admin' | 'repartidor' | 'usuario';

export type ManualChatSource = 'groq' | 'deepseek' | 'service_local_model' | 'service_context_data' | 'frontend_local';
export type ManualChatMode = 'online' | 'online_context' | 'service_local' | 'frontend_offline';

export interface ManualChatRequest {
  message: string;
  userRole?: ManualUserRole;
  currentRoute?: string;
  currentScreen?: string;
  platform: 'web';
  sessionId?: string;
  userId?: string;
  authToken?: string;
  context?: Record<string, unknown>;
}

export interface ManualChatResponse {
  source: ManualChatSource;
  mode: ManualChatMode;
  offline_ready: boolean;
  answer: string;
  steps?: string[];
  relatedUseCases?: string[];
  relatedModule?: string;
  suggestedActions?: string[];
  confidence?: number;
  grounded: boolean;
  needsMoreContext?: boolean;
  fallbackReason?: string;
  auditId?: string;
  userVisibleNotice?: string;
  debug?: {
    relatedUseCases?: string[];
    relatedModule?: string;
    confidence?: number;
    source?: string;
    mode?: string;
  };
}

export interface ChatbotPageContext {
  route: string;
  screen?: string;
  updatedAt: number;
  data: Record<string, unknown>;
}

export interface ManualKnowledgeEntry {
  id: string;
  title: string;
  entryType: 'use_case' | 'module' | 'role' | 'faq' | 'route' | 'troubleshooting';
  roles: ManualUserRole[];
  module: string;
  useCases: string[];
  routes: string[];
  screens: string[];
  description: string;
  steps: string[];
  keywords: string[];
}

export interface ManualChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: ManualChatResponse;
  createdAt: number;
}

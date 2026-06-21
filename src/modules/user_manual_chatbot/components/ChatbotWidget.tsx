import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthSession } from '../../gestion_usuarios_acceso_suscripcion/services/auth_session';
import { getScreenForRoute } from '../offline/frontendManualDataset';
import { getChatbotPageContext } from '../services/chatbotPageContext';
import { askUserManualChatbot, getManualSessionId, normalizeRole } from '../services/userManualChatbot.service';
import type { ManualChatMessage, ManualChatResponse } from '../types/userManualChatbot.types';

const showDebugMetadata = import.meta.env.VITE_CHATBOT_DEBUG === 'true';

const welcomeMessage: ManualChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hola. Soy el manual inteligente de HomeChef. Preguntame que hacer en esta pantalla, como usar un modulo o que puede hacer tu rol.',
  createdAt: Date.now(),
};

export default function ChatbotWidget() {
  const location = useLocation();
  const authRole = useAuthSession((state) => state.role);
  const user = useAuthSession((state) => state.user);
  const accessToken = useAuthSession((state) => state.accessToken);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ManualChatMessage[]>([welcomeMessage]);
  const currentScreen = useMemo(() => getScreenForRoute(location.pathname), [location.pathname]);
  const userRole = normalizeRole(authRole);
  const lastResponse = [...messages].reverse().find((message) => message.response)?.response;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    const userMessage: ManualChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    setMessages((current) => [...current, userMessage]);
    setIsSending(true);
    try {
      const response = await askUserManualChatbot({
        message: text,
        userRole,
        currentRoute: location.pathname,
        currentScreen,
        platform: 'web',
        sessionId: getManualSessionId(),
        userId: user?.id ? String(user.id) : undefined,
        authToken: accessToken || undefined,
        context: {
          pathname: location.pathname,
          search: location.search,
          ...getChatbotPageContext(location.pathname),
        },
      });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: sanitizeAssistantAnswerForUser(response.answer),
          response,
          createdAt: Date.now(),
        },
      ]);
    } catch {
      const response: ManualChatResponse = {
        source: 'frontend_local',
        mode: 'frontend_offline',
        offline_ready: true,
        answer: 'No pude contactar el servicio, pero el manual local del navegador sigue disponible. Intenta preguntar por una pantalla o caso de uso de HomeChef.',
        grounded: true,
        needsMoreContext: true,
        fallbackReason: 'unexpected_frontend_error',
      };
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: sanitizeAssistantAnswerForUser(response.answer),
          response,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const clearConversation = () => {
    setMessages([{ ...welcomeMessage, createdAt: Date.now() }]);
  };

  const copyLastAnswer = () => {
    const answer = [...messages].reverse().find((message) => message.role === 'assistant')?.content;
    if (answer && navigator.clipboard) {
      void navigator.clipboard.writeText(answer);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed bottom-5 right-5 z-[75] rounded-full px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-violet-300"
        style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Abrir asistente de ayuda IA"
        title="Ayuda IA"
      >
        Ayuda IA
      </button>

      {isOpen ? (
        <section
          className="fixed bottom-20 right-4 z-[75] flex h-[min(680px,calc(100vh-6rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
          style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line)', color: 'var(--text)' }}
          aria-label="Asistente manual inteligente HomeChef"
        >
          <header
            className="border-b px-4 py-3"
            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold">Manual inteligente</h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {currentScreen} · rol {labelRole(userRole)}
                </p>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full border text-sm"
                style={{ borderColor: 'var(--line)' }}
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar asistente"
                title="Cerrar"
              >
                X
              </button>
            </div>
            <StatusPill response={lastResponse} />
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-2xl border px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'user' ? 'ml-8' : 'mr-8'
                }`}
                style={{
                  borderColor: message.role === 'user' ? 'rgba(124,58,237,.22)' : 'var(--line)',
                  backgroundColor: message.role === 'user' ? 'rgba(124,58,237,.10)' : 'var(--panel-soft)',
                }}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.response && showDebugMetadata ? <ResponseMeta response={message.response} /> : null}
              </article>
            ))}
            {isSending ? (
              <div className="mr-8 rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                Pensando con el manual de HomeChef...
              </div>
            ) : null}
          </div>

          <div className="border-t p-3" style={{ borderColor: 'var(--line)' }}>
            {lastResponse?.source === 'frontend_local' ? (
              <p className="mb-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'rgba(245,158,11,.28)', color: '#92400e', backgroundColor: 'rgba(245,158,11,.10)' }}>
                Modo offline activo: respuesta generada localmente en tu navegador.
              </p>
            ) : null}
            {lastResponse?.userVisibleNotice ? (
              <p className="mb-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'rgba(59,130,246,.25)', color: '#1d4ed8', backgroundColor: 'rgba(59,130,246,.08)' }}>
                {lastResponse.userVisibleNotice}
              </p>
            ) : null}
            <div className="flex gap-2">
              <textarea
                className="min-h-11 flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                placeholder="Ej: Que hago aqui?"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                onClick={() => void sendMessage()}
                disabled={isSending || !input.trim()}
              >
                Enviar
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <button type="button" className="text-xs font-semibold" style={{ color: 'var(--muted)' }} onClick={clearConversation}>
                Limpiar conversacion
              </button>
              <button type="button" className="text-xs font-semibold" style={{ color: 'var(--muted)' }} onClick={copyLastAnswer}>
                Copiar respuesta
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function StatusPill({ response }: { response?: ManualChatResponse }) {
  const label = !response
    ? 'Listo'
    : response.source === 'frontend_local'
      ? 'Offline navegador'
      : response.mode === 'service_local'
        ? 'Modo local'
        : 'Online';
  const color = response?.source === 'frontend_local' ? '#92400e' : response?.mode === 'service_local' ? '#047857' : '#4338ca';
  return (
    <div className="mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold" style={{ borderColor: `${color}33`, color, backgroundColor: `${color}12` }}>
      {label}
    </div>
  );
}

export function sanitizeAssistantAnswerForUser(answer: string) {
  return String(answer || '')
    .replace(/\s*Esto se relaciona con\s+CU-\d{2}(?:,\s*CU-\d{2})*\.?/gi, '')
    .replace(/\bCU-\d{2}\b(?:,\s*\bCU-\d{2}\b)*/gi, '')
    .replace(/\s*Confianza:\s*\d+%\.?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function ResponseMeta({ response }: { response: ManualChatResponse }) {
  const cases = response.relatedUseCases?.length ? response.relatedUseCases.join(', ') : 'sin CU especifico';
  return (
    <div className="mt-2 space-y-1 border-t pt-2 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
      <p>{response.relatedModule || 'Manual contextual'} · {cases}</p>
      {response.confidence !== undefined ? <p>Confianza: {Math.round(response.confidence * 100)}%</p> : null}
    </div>
  );
}

function labelRole(role: string) {
  const labels: Record<string, string> = {
    visitante: 'visitante',
    cliente: 'cliente',
    cocinero: 'cocinero',
    admin: 'administrador',
    repartidor: 'repartidor',
    usuario: 'usuario',
  };
  return labels[role] || role;
}

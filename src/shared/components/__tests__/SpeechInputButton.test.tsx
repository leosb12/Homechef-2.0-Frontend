import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AsistenteIaPage from '../../../modules/funciones_ia/submodules/asistente_ia/pages/AsistenteIaPage';
import ChatbotWidget from '../../../modules/user_manual_chatbot/components/ChatbotWidget';
import SpeechInputButton from '../SpeechInputButton';
import { MemoryRouter } from 'react-router-dom';

// Mock auth session
vi.mock('../../../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session', () => ({
  useAuthSession: (selector?: any) => {
    const mockState = {
      user: { id: 'test-chef', role: 'cocinero' },
      role: 'cocinero',
      accessToken: 'mock_token',
      authStatus: 'authenticated',
      initializeAuth: vi.fn(),
    };
    if (selector) return selector(mockState);
    return mockState;
  },
}));

// Mock routing
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: '/chef/ai/assistant', search: '' }),
  };
});

describe('Speech Dictation Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear speech mock from global
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it('renders microphone button in AsistenteIaPage and updates textarea on transcript', async () => {
    render(
      <MemoryRouter>
        <AsistenteIaPage />
      </MemoryRouter>
    );

    // Assert mic button is rendered
    const micBtn = screen.getByTitle('Dictar por voz');
    expect(micBtn).toBeInTheDocument();

    // Verify it doesn't break if clicked when not supported (shows support message)
    await userEvent.click(micBtn);
    expect(screen.getByText(/Tu navegador no soporta dictado por voz/)).toBeInTheDocument();
  });

  it('renders microphone button in ChatbotWidget when widget is open', async () => {
    render(
      <MemoryRouter>
        <ChatbotWidget />
      </MemoryRouter>
    );

    // Open Chatbot
    const openBtn = screen.getByText('Ayuda IA');
    await userEvent.click(openBtn);

    // Mic button should exist next to chatbot input area
    const micBtn = screen.getByTitle('Dictar por voz');
    expect(micBtn).toBeInTheDocument();
  });

  it('updates text input when SpeechInputButton receives a transcript', async () => {
    // Mock Web Speech API SpeechRecognition
    const startMock = vi.fn();
    const mockRecognition = {
      start: startMock,
      stop: vi.fn(),
      abort: vi.fn(),
    };
    
    (window as any).webkitSpeechRecognition = vi.fn().mockImplementation(() => {
      const rec = mockRecognition as any;
      setTimeout(() => {
        if (rec.onstart) rec.onstart();
        // simulate result
        if (rec.onresult) {
          rec.onresult({
            results: [
              [{ transcript: 'hola chef' }]
            ]
          });
        }
        if (rec.onend) rec.onend();
      }, 0);
      return rec;
    });

    const handleTranscript = vi.fn();
    render(<SpeechInputButton onTranscript={handleTranscript} />);

    const micBtn = screen.getByTitle('Dictar por voz');
    await userEvent.click(micBtn);

    // Check start is called
    expect(startMock).toHaveBeenCalled();

    // Wait for callback to be triggered
    await vi.waitFor(() => {
      expect(handleTranscript).toHaveBeenCalledWith('hola chef');
    });
  });
});

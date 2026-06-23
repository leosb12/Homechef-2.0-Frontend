import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechInputButtonProps {
  onTranscript: (text: string) => void;
  size?: 'sm' | 'md';
}

export default function SpeechInputButton({ onTranscript, size = 'md' }: SpeechInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [showSupportError, setShowSupportError] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  // Check if Web Speech API is supported
  const isSupported = typeof window !== 'undefined' && 
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) !== undefined;

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'es-BO'; // Bolivia Spanish default

    rec.onstart = () => {
      setIsListening(true);
      setPermissionError('');
      setShowSupportError(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (event: any) => {
      console.warn('[SpeechRecognition Error]', event.error);
      if (event.error === 'not-allowed') {
        setPermissionError('Permiso de micrófono denegado. Habilítalo en el navegador para usar dictado.');
      } else if (event.error !== 'aborted') {
        setPermissionError('Ocurrió un error con el micrófono. Intenta de nuevo.');
      }
      setIsListening(false);
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      if (resultText && resultText.trim()) {
        onTranscript(resultText.trim());
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isSupported, onTranscript]);

  const toggleListening = useCallback(() => {
    if (!isSupported) {
      setShowSupportError(true);
      return;
    }

    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('SpeechRecognition stop failed:', e);
      }
    } else {
      try {
        setPermissionError('');
        setShowSupportError(false);
        recognitionRef.current.start();
      } catch (e) {
        console.warn('SpeechRecognition start failed:', e);
      }
    }
  }, [isSupported, isListening]);

  const buttonSizeClass = size === 'sm' ? 'p-1.5' : 'p-2.5';

  return (
    <div className="relative inline-flex items-center">
      {/* Floating Status / Error Tooltips */}
      {isListening && (
        <div 
          className="absolute bottom-full mb-2 right-0 z-50 bg-violet-950 border border-violet-500 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1"
          style={{ borderColor: 'rgba(124, 58, 237, 0.5)' }}
        >
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping inline-block" />
          <span>Escuchando... habla ahora</span>
        </div>
      )}

      {showSupportError && (
        <div className="absolute bottom-full mb-2 right-0 z-50 bg-amber-950 border border-amber-500 text-amber-200 text-xs px-3 py-2 rounded-lg w-60 shadow-xl flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-1">
          <span>Tu navegador no soporta dictado por voz. Puedes escribir tu mensaje normalmente.</span>
          <button 
            type="button"
            className="text-[10px] font-bold underline mt-1 text-right text-amber-400 hover:text-white"
            onClick={() => setShowSupportError(false)}
          >
            Entendido
          </button>
        </div>
      )}

      {permissionError && (
        <div className="absolute bottom-full mb-2 right-0 z-50 bg-red-950 border border-red-500/50 text-red-200 text-xs px-3 py-2 rounded-lg w-60 shadow-xl flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-1">
          <span>{permissionError}</span>
          <button 
            type="button"
            className="text-[10px] font-bold underline mt-1 text-right text-red-400 hover:text-white"
            onClick={() => setPermissionError('')}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Mic Button */}
      <button
        type="button"
        onClick={toggleListening}
        className={`rounded-full transition-all duration-300 focus:outline-none flex items-center justify-center border ${buttonSizeClass} ${
          isListening 
            ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse' 
            : 'bg-[var(--panel-soft)] text-violet-400 hover:text-white border-[var(--line)] hover:bg-[var(--line)]'
        }`}
        title={isListening ? 'Detener dictado' : 'Dictar por voz'}
        aria-label={isListening ? 'Escuchando... Detener dictado' : 'Dictar por voz'}
      >
        {isListening ? (
          // Active state (stop dictation)
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        ) : (
          // Inactive state (mic icon)
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Mic, Send, Bot, User } from 'lucide-react';

export default function ReportChat({ onSubmit, isLoading, clarificationMessage }) {
    const [prompt, setPrompt] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [chatHistory, setChatHistory] = useState([
        { role: 'ai', text: '¡Hola! ¿Qué reporte te gustaría generar hoy? Puedes pedirme cosas como "Ventas de la última semana agrupadas por cocinero".' }
    ]);

    useEffect(() => {
        if (clarificationMessage) {
            setChatHistory(prev => [...prev, { role: 'ai', text: clarificationMessage }]);
        }
    }, [clarificationMessage]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setChatHistory(prev => [...prev, { role: 'user', text: prompt }]);
        onSubmit(prompt);
        setPrompt('');
    };

    const handleVoiceRecord = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Tu navegador no soporta la API de dictado por voz.');
            return;
        }

        if (isRecording) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setPrompt(prev => prev + ' ' + transcript);
        };
        recognition.onerror = (event) => {
            console.error('Error de reconocimiento de voz:', event.error);
            setIsRecording(false);
        };
        recognition.onend = () => setIsRecording(false);

        recognition.start();
    };

    return (
        <div className="flex flex-col rounded-xl shadow-lg border p-6 w-full max-w-4xl mx-auto min-h-[500px] transition-colors duration-200" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line)' }}>
            <div className="flex-1 overflow-y-auto mb-6 space-y-4">
                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`p-3 rounded-full flex items-center justify-center h-10 w-10 shrink-0 ${msg.role === 'user' ? 'bg-orange-100 text-orange-600' : ''}`} style={msg.role !== 'user' ? { backgroundColor: 'var(--panel-soft)', color: 'var(--brand)' } : {}}>
                                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-tr-none' : 'rounded-tl-none'}`} style={msg.role !== 'user' ? { backgroundColor: 'var(--panel-soft)', color: 'var(--text)' } : {}}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex gap-3 max-w-[80%]">
                            <div className="p-3 rounded-full flex items-center justify-center h-10 w-10" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--brand)' }}>
                                <Bot size={20} />
                            </div>
                            <div className="p-4 rounded-2xl rounded-tl-none flex gap-1 items-center" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}>
                                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--muted)' }}></span>
                                <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0.1s', backgroundColor: 'var(--muted)' }}></span>
                                <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0.2s', backgroundColor: 'var(--muted)' }}></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="relative mt-auto">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: Dame las ventas de este mes..."
                    disabled={isLoading}
                    className="w-full pl-6 pr-24 py-4 border rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--text)', borderColor: 'var(--line)' }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleVoiceRecord}
                        disabled={isLoading}
                        className={`p-2 rounded-full transition-colors ${isRecording ? 'animate-pulse' : ''}`}
                        style={isRecording ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' } : { color: 'var(--muted)' }}
                        title="Dictado por voz"
                    >
                        <Mic size={20} />
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !prompt.trim()}
                        className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
}

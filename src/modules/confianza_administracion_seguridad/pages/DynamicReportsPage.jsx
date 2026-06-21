import React, { useState } from 'react';
import ReportChat from '../components/DynamicReports/ReportChat';
import ReportResults from '../components/DynamicReports/ReportResults';

export default function DynamicReportsPage() {
    const [view, setView] = useState('chat'); // 'chat' | 'results'
    const [isLoading, setIsLoading] = useState(false);
    const [clarificationMessage, setClarificationMessage] = useState('');
    
    // Almacenar el estado del reporte generado
    const [chartData, setChartData] = useState(null);
    const [rawData, setRawData] = useState(null);
    const [currentPrompt, setCurrentPrompt] = useState('');

    const handleChatSubmit = async (prompt) => {
        setIsLoading(true);
        setClarificationMessage('');
        setCurrentPrompt(prompt);
        
        try {
            const token = localStorage.getItem('homechef_access_token') || ''; 
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/admin/dynamic-reports/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error procesando solicitud');
            }

            if (data.action === 'clarify') {
                setClarificationMessage(data.message);
                setView('chat');
            } else if (data.action === 'success') {
                setChartData(data.chart_data);
                setRawData(data.raw_data);
                setView('results');
            } else {
                throw new Error(data.message || 'Acción desconocida');
            }
        } catch (error) {
            console.error(error);
            setClarificationMessage("Lo siento, hubo un error técnico procesando tu reporte. Por favor intenta con otra consulta.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setView('chat');
        setChartData(null);
        setRawData(null);
        setClarificationMessage('');
    };

    return (
        <div className="p-8 w-full min-h-screen flex flex-col transition-colors duration-200" style={{ backgroundColor: 'transparent' }}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold transition-colors" style={{ color: 'var(--text)' }}>Reportes Dinámicos IA</h1>
                <p className="mt-2 transition-colors" style={{ color: 'var(--muted)' }}>Pide información en lenguaje natural y la IA generará los gráficos y exportables.</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-start w-full">
                {view === 'chat' && (
                    <ReportChat 
                        onSubmit={handleChatSubmit} 
                        isLoading={isLoading} 
                        clarificationMessage={clarificationMessage}
                    />
                )}

                {view === 'results' && (
                    <ReportResults 
                        chartData={chartData} 
                        rawData={rawData} 
                        prompt={currentPrompt}
                        onReset={handleReset}
                    />
                )}
            </div>
        </div>
    );
}

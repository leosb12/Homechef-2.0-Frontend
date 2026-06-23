import React, { useState, useEffect } from 'react';
import ReportChat from '../components/DynamicReports/ReportChat';
import ReportResults from '../components/DynamicReports/ReportResults';
import { useAdminSyncStore } from '../services/adminSyncStore';
import { getAdminReportSnapshot, getPendingAdminMutations } from '../services/adminOfflineRepository';
import { useConnectivity } from '../../../shared/hooks/useConnectivity';
import { syncAdminNow } from '../services/offlineSyncService';
import { detectLocalFormat, processLocalQuery } from '../services/localReportEngine';
import { API_URL } from '../../../shared/services/api';

const runtimeConfig =
    typeof window !== 'undefined' ? window.__HOMECHEF_RUNTIME_CONFIG || {} : {};
const IA_SERVICE_URL =
    runtimeConfig.VITE_IA_SERVICE_URL ||
    runtimeConfig.IA_SERVICE_URL ||
    import.meta.env.VITE_IA_SERVICE_URL ||
    'https://proyecto.leonardoserrate.xyz/ia';

export default function DynamicReportsPage() {
    const { backendReachable, iaServiceReachable, browserOnline } = useConnectivity();
    const [view, setView] = useState('chat'); // 'chat' | 'results'
    const [isLoading, setIsLoading] = useState(false);
    const [clarificationMessage, setClarificationMessage] = useState('');
    const [chartData, setChartData] = useState(null);
    const [rawData, setRawData] = useState(null);
    const [currentPrompt, setCurrentPrompt] = useState('');
    const [offlinePendingPrompt, setOfflinePendingPrompt] = useState(null);
    const [mode, setMode] = useState('online'); // 'online' | 'ia_offline' | 'local_offline'
    const [snapshot, setSnapshot] = useState(null);
    const [pendingPrompt, setPendingPrompt] = useState(null);

    const triggerLocalDownload = (file) => {
        if (!file || !file.base64) return;
        const linkSource = `data:${file.mime_type};base64,${file.base64}`;
        const downloadLink = document.createElement("a");
        downloadLink.href = linkSource;
        downloadLink.download = file.filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const triggerClientSideExport = (rawData, title, format) => {
        if (!rawData || rawData.length === 0) return;
        const headers = Object.keys(rawData[0]);
        const cleanTitle = title || "Reporte";
        const safeFilename = `${cleanTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}`;

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${safeFilename}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else if (format === 'excel') {
            const convertToCSV = (objArray) => {
                const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
                if (array.length === 0) return '';
                const hdrs = Object.keys(array[0]);
                const csvRows = [hdrs.join(',')];
                for (const row of array) {
                    const values = hdrs.map(header => {
                        const val = row[header];
                        const escaped = ('' + (val ?? '')).replace(/"/g, '""');
                        return `"${escaped}"`;
                    });
                    csvRows.push(values.join(','));
                }
                return csvRows.join('\r\n');
            };
            const csvContent = convertToCSV(rawData);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${safeFilename}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else if (format === 'word') {
            let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><title>${cleanTitle}</title><style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { font-family: Arial, sans-serif; }
            </style></head>
            <body>
            <h1>${cleanTitle}</h1>
            <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
            ${rawData.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
            </table>
            </body></html>`;
            const blob = new Blob([html], { type: 'application/msword' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${safeFilename}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else if (format === 'pdf') {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`<html><head><title>${cleanTitle}</title><style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f4f4f4; }
            h1 { color: #333; }
            </style></head><body>
            <h1>${cleanTitle}</h1>
            <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
            ${rawData.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
            </table>
            <script>window.onload = function() { window.print(); window.close(); }</script>
            </body></html>`);
            printWindow.document.close();
        }
    };

    const checkLevel1Online = async () => {
        console.log("[DynamicReports] Checking Level 1 online...");
        const token = localStorage.getItem('homechef_access_token') || '';
        const level1Url = `${API_URL}/admin/sync/status`;
        console.log("[DynamicReports] API_URL:", API_URL);
        console.log("[DynamicReports] Level 1 URL:", level1Url);
        
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch(level1Url, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            clearTimeout(id);
            
            console.log("[DynamicReports] Level 1 response status:", response.status);
            let data = null;
            try {
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = text;
                }
            } catch (e) {
                data = "Could not parse response body";
            }
            console.log("[DynamicReports] Level 1 response body:", data);
            
            if (response.ok) {
                console.log("[DynamicReports] Level 1 available: true");
                return { available: true, error: null };
            } else {
                const errMsg = `Status ${response.status}: ${JSON.stringify(data)}`;
                console.log("[DynamicReports] Level 1 available: false");
                return { available: false, error: errMsg };
            }
        } catch (error) {
            console.log("[DynamicReports] Level 1 error:", error);
            console.log("[DynamicReports] Level 1 available: false");
            return { available: false, error: error };
        }
    };

    const checkLevel2OfflineService = async () => {
        console.log("[DynamicReports] Checking Level 2 ia-service offline...");
        const iaUrl = IA_SERVICE_URL;
        const level2Url = `${iaUrl}/health`;
        console.log("[DynamicReports] Level 2 URL:", level2Url);
        
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch(level2Url, {
                signal: controller.signal
            });
            clearTimeout(id);
            
            console.log("[DynamicReports] Level 2 response status:", response.status);
            let data = null;
            try {
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = text;
                }
            } catch (e) {
                data = "Could not parse response body";
            }
            console.log("[DynamicReports] Level 2 response body:", data);
            
            if (response.ok) {
                console.log("[DynamicReports] Level 2 available: true");
                return { available: true, error: null };
            } else {
                const errMsg = `Status ${response.status}: ${JSON.stringify(data)}`;
                console.log("[DynamicReports] Level 2 available: false");
                return { available: false, error: errMsg };
            }
        } catch (error) {
            console.log("[DynamicReports] Level 2 error:", error);
            console.log("[DynamicReports] Level 2 available: false");
            return { available: false, error: error };
        }
    };

    const resolveReportModeBeforeSubmit = async () => {
        console.log("[DynamicReports] Resolving mode before submit...");
        
        if (!browserOnline) {
            console.log("[DynamicReports] Browser browserOnline is false. Falling back to local_web_offline.");
            return 'local_offline';
        }

        if (backendReachable) {
            console.log("[DynamicReports] Using mode: online");
            return 'online';
        }

        if (iaServiceReachable) {
            console.log("[DynamicReports] Using mode: ia_service_offline");
            return 'ia_offline';
        }

        console.log("[DynamicReports] Using mode: local_web_offline");
        return 'local_offline';
    };

    const detectMode = async () => {
        const snap = await getAdminReportSnapshot();
        setSnapshot(snap);

        const resolvedMode = await resolveReportModeBeforeSubmit();
        setMode(resolvedMode);
    };

    useEffect(() => {
        detectMode();
    }, [browserOnline, backendReachable, iaServiceReachable]);

    useEffect(() => {
        const handleSyncChanged = () => {
            detectMode();
        };
        window.addEventListener('admin-offline-queue-changed', handleSyncChanged);

        return () => {
            window.removeEventListener('admin-offline-queue-changed', handleSyncChanged);
        };
    }, []);

    const handleChatSubmit = async (prompt) => {
        setIsLoading(true);
        setClarificationMessage('');
        
        const activeMode = await resolveReportModeBeforeSubmit();
        setMode(activeMode);
        
        let promptToUse = prompt;
        let formatOverride = 'auto';

        if (pendingPrompt) {
            const detected = detectLocalFormat(prompt);
            if (detected.output_format !== 'unknown' && !detected.needs_clarification) {
                promptToUse = pendingPrompt;
                formatOverride = detected.output_format;
                setPendingPrompt(null);
            } else {
                setPendingPrompt(null);
            }
        }

        setCurrentPrompt(promptToUse);

        if (activeMode !== 'online') {
            const localFormatInfo = detectLocalFormat(promptToUse);
            if (localFormatInfo.needs_clarification && formatOverride === 'auto') {
                setPendingPrompt(promptToUse);
                setClarificationMessage(localFormatInfo.clarification_question);
                setIsLoading(false);
                return;
            }
            if (formatOverride === 'auto') {
                formatOverride = localFormatInfo.output_format;
            }
        }
        
        // --- LEVEL 3: OFFLINE LOCAL ---
        if (activeMode === 'local_offline' || !navigator.onLine) {
            if (!snapshot) {
                setClarificationMessage("No tienes datos offline disponibles. Por favor, haz clic en el botón Sincronizar en el menú superior para descargar la información.");
                setIsLoading(false);
                return;
            }
            
            const mutations = await getPendingAdminMutations();
            const result = processLocalQuery(promptToUse, snapshot, mutations);
            if (result) {
                window.__offlineReport = true;
                setChartData(result);
                setRawData(result.data);
                
                if (formatOverride !== 'screen' && formatOverride !== 'auto') {
                    triggerClientSideExport(result.data, result.title, formatOverride);
                    setClarificationMessage(`Reporte exportado correctamente en formato ${formatOverride.toUpperCase()}.`);
                    setView('chat');
                } else {
                    setView('results');
                }
            } else {
                setClarificationMessage("Estás en modo offline local. En este modo solo puedes consultar reportes predefinidos como 'ventas por cocinero', 'usuarios por rol', 'auditoría general por categoría', 'uso de IA por proveedor', o 'consultas IA fallidas'.");
                setView('chat');
            }
            setIsLoading(false);
            return;
        }

        // --- LEVEL 2: IA SERVICE OFFLINE ---
        if (activeMode === 'ia_offline') {
            if (!snapshot) {
                setClarificationMessage("No tienes datos offline disponibles para alimentar el servicio de IA. Por favor sincroniza tus datos primero.");
                setIsLoading(false);
                return;
            }

            try {
                const iaUrl = IA_SERVICE_URL;
                const response = await fetch(`${iaUrl}/api/v1/ai/reports/generate-offline`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prompt: promptToUse, snapshot, output_format: formatOverride })
                });

                if (!response.ok) {
                    throw new Error("El servicio de IA offline no pudo procesar tu reporte.");
                }

                const data = await response.json();
                if (data.needs_clarification || data.action === 'clarify') {
                    setPendingPrompt(promptToUse);
                    setClarificationMessage(data.clarification_question || data.message);
                    setView('chat');
                } else if (data.success && data.display_mode === 'export' && data.file) {
                    triggerLocalDownload(data.file);
                    setClarificationMessage(data.summary || "Reporte generado y descargado correctamente.");
                    setView('chat');
                } else if (data.success || data.action === 'success') {
                    window.__offlineReport = true;
                    const cData = data.chart_data || {
                        title: data.summary || "Reporte Dinámico",
                        data: data.rows || [],
                        charts: data.chart ? [data.chart] : [],
                        kpis: data.kpis || [],
                        suggested_exports: ['excel', 'pdf', 'word']
                    };
                    setChartData(cData);
                    setRawData(data.raw_data || data.rows || []);
                    setView('results');
                } else {
                    throw new Error(data.message || 'Acción desconocida');
                }
            } catch (error) {
                console.error("Level 2 execution failed:", error);
                const mutations = await getPendingAdminMutations();
                const result = processLocalQuery(promptToUse, snapshot, mutations);
                if (result) {
                    window.__offlineReport = true;
                    setChartData(result);
                    setRawData(result.data);
                    if (formatOverride !== 'screen' && formatOverride !== 'auto') {
                        triggerClientSideExport(result.data, result.title, formatOverride);
                        setClarificationMessage(`Reporte exportado correctamente en formato ${formatOverride.toUpperCase()} (Fallback local).`);
                        setView('chat');
                    } else {
                        setView('results');
                    }
                } else {
                    setClarificationMessage("El servicio de IA offline falló. Por favor reformula tu consulta.");
                    setView('chat');
                }
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // --- LEVEL 1: ONLINE ---
        try {
            window.__offlineReport = false;
            const token = localStorage.getItem('homechef_access_token') || ''; 
            const response = await fetch(`${API_URL}/admin/dynamic-reports/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt: promptToUse })
            });

            const contentType = response.headers.get("content-type");
            let data = {};
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                throw new Error('Error interno del servidor (respuesta no-JSON)');
            }

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
            console.error("Level 1 execution failed:", error);
            if (snapshot) {
                try {
                    const iaUrl = IA_SERVICE_URL;
                    const iaRes = await fetch(`${iaUrl}/health`);
                    if (iaRes.ok) {
                        setMode('ia_offline');
                        handleChatSubmit(prompt);
                        return;
                    }
                } catch (e) {}
                
                const mutations = await getPendingAdminMutations();
                const result = processLocalQuery(promptToUse, snapshot, mutations);
                if (result) {
                    window.__offlineReport = true;
                    setChartData(result);
                    setRawData(result.data);
                    if (formatOverride !== 'screen' && formatOverride !== 'auto') {
                        triggerClientSideExport(result.data, result.title, formatOverride);
                        setClarificationMessage(`Reporte exportado correctamente en formato ${formatOverride.toUpperCase()} (Fallback local).`);
                        setView('chat');
                    } else {
                        setView('results');
                    }
                } else {
                    setClarificationMessage("El backend está caído y tu consulta no coincide con un reporte predefinido offline.");
                }
            } else {
                setClarificationMessage("El backend está caído y no tienes cache offline. Por favor sincroniza tus datos cuando vuelvas a tener conexión.");
            }
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        const handleOnline = () => {
            if (offlinePendingPrompt) {
                const promptToRun = offlinePendingPrompt;
                setOfflinePendingPrompt(null);
                setClarificationMessage("¡Conexión restaurada! Procesando tu reporte en cola...");
                handleChatSubmit(promptToRun);
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [offlinePendingPrompt]);

    const handleReset = () => {
        setView('chat');
        setChartData(null);
        setRawData(null);
        setClarificationMessage('');
    };

    const renderOfflineSummary = () => {
        const metadata = snapshot?.metadata;
        const counts = metadata?.counts_by_module || {};
        const date = metadata?.generated_at ? new Date(metadata.generated_at).toLocaleString() : 'Nunca';

        const modeLabels = {
            online: { text: 'Modo online', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
            ia_offline: { text: 'Modo IA service offline', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
            local_offline: { text: 'Modo offline local', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
        };

        const currentMode = modeLabels[mode] || modeLabels.local_offline;

        return (
            <div className="p-6 rounded-2xl border mb-6 space-y-4 transition-colors duration-200" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line)' }}>
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span 
                            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
                            style={{ color: currentMode.color, backgroundColor: currentMode.bg, borderColor: `${currentMode.color}40` }}
                        >
                            {currentMode.text}
                        </span>
                        <span className="text-xs transition-colors" style={{ color: 'var(--muted)' }}>
                            Última sincronización: <span className="font-semibold" style={{ color: 'var(--text)' }}>{date}</span>
                        </span>
                    </div>

                    {!snapshot && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-500 font-semibold">⚠️ Falta cache offline</span>
                            <button
                                onClick={async () => {
                                    setIsLoading(true);
                                    await syncAdminNow();
                                    await detectMode();
                                    setIsLoading(false);
                                }}
                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all"
                            >
                                Sincronizar Ahora
                            </button>
                        </div>
                    )}
                </div>

                {snapshot && (
                    <div className="border-t pt-4" style={{ borderColor: 'var(--line)' }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                            Datos offline disponibles para reportes:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
                                <span className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Usuarios</span>
                                <strong className="text-lg" style={{ color: 'var(--text)' }}>{counts.users || 0}</strong>
                            </div>
                            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
                                <span className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Cocineros</span>
                                <strong className="text-lg" style={{ color: 'var(--text)' }}>{counts.chefs || 0}</strong>
                            </div>
                            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
                                <span className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Pedidos</span>
                                <strong className="text-lg" style={{ color: 'var(--text)' }}>{counts.orders || 0}</strong>
                            </div>
                            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
                                <span className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Publicaciones</span>
                                <strong className="text-lg" style={{ color: 'var(--text)' }}>{counts.publications || 0}</strong>
                            </div>
                            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
                                <span className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Auditoría Gral</span>
                                <strong className="text-lg" style={{ color: 'var(--text)' }}>{counts.audit_general || 0}</strong>
                            </div>
                            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
                                <span className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Auditoría IA</span>
                                <strong className="text-lg" style={{ color: 'var(--text)' }}>{counts.audit_ai || 0}</strong>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-8 w-full min-h-screen flex flex-col transition-colors duration-200" style={{ backgroundColor: 'transparent' }}>
            <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold transition-colors" style={{ color: 'var(--text)' }}>Reportes Dinámicos IA</h1>
                    <p className="mt-2 transition-colors" style={{ color: 'var(--muted)' }}>Pide información en lenguaje natural y la IA generará los gráficos y exportables.</p>
                </div>
            </div>

            {renderOfflineSummary()}

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

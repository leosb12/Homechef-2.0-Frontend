import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  ChevronLeft,
} from "lucide-react";

const COLORS = [
  "#f97316",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#eab308",
];

export default function ReportResults({ chartData, rawData, prompt, onReset }) {
  const [isExporting, setIsExporting] = useState(false);

  if (!chartData) return null;

  const { charts = [], title, data, kpis, suggested_exports = [] } = chartData;

  const handleExport = async (format) => {
    if (!navigator.onLine || window.__offlineReport) {
      setIsExporting(true);
      try {
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
            const headers = Object.keys(array[0]);
            const csvRows = [headers.join(',')];
            for (const row of array) {
              const values = headers.map(header => {
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
          if (rawData.length === 0) return;
          const headers = Object.keys(rawData[0]);
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
          if (rawData.length === 0) return;
          const headers = Object.keys(rawData[0]);
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
      } catch (error) {
        console.error("Local export error:", error);
        alert("No se pudo exportar el reporte localmente.");
      } finally {
        setIsExporting(false);
      }
      return;
    }


    setIsExporting(true);
    try {
      // Asumiendo que el token de auth está en localStorage o manejado por interceptors
      const token = localStorage.getItem("homechef_access_token") || "";

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/admin/dynamic-reports/export/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            format,
            raw_data: rawData,
            prompt,
            title: title || "Reporte Dinámico",
            charts: charts,
            kpis: kpis,
          }),
        },
      );

      if (!response.ok) throw new Error("Error en la exportación");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_${new Date().getTime()}.${format === "excel" ? "xlsx" : format === "word" ? "docx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting:", error);
      alert("No se pudo exportar el reporte.");
    } finally {
      setIsExporting(false);
    }
  };

  const renderSingleChart = (chart, index) => {
    const { chart_type, config, title: chartTitle } = chart;
    const xKey = config?.x_key;
    const yKeys = config?.y_keys || [];

    if (chart_type === "none" || chart_type === "table") return null;

    let ChartComponent;

    switch (chart_type) {
      case "bar":
        ChartComponent = (
          <div className={`grid grid-cols-1 ${yKeys.length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
            {yKeys.map((key, i) => (
              <div key={key} className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
                <h4 className="text-center text-sm font-medium mb-4 uppercase tracking-wider" style={{ color: 'var(--text)' }}>{key.replace(/_/g, ' ')}</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey={xKey} tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey={key} fill={COLORS[i % COLORS.length]} maxBarSize={50} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        );
        break;
      case "line":
        ChartComponent = (
          <div className={`grid grid-cols-1 ${yKeys.length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
            {yKeys.map((key, i) => (
              <div key={key} className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
                <h4 className="text-center text-sm font-medium mb-4 uppercase tracking-wider" style={{ color: 'var(--text)' }}>{key.replace(/_/g, ' ')}</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey={xKey} tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        );
        break;
      case "pie":
        const yKey = yKeys[0];
        ChartComponent = (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={150}
                fill="#8884d8"
                dataKey={yKey}
                nameKey={xKey}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
        break;
      default:
        return null;
    }

    return (
      <div key={index} className="p-6 rounded-xl shadow-sm border transition-colors" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line)' }}>
        <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--text)' }}>
          {chartTitle || "Visualización"}
        </h3>
        {ChartComponent}
      </div>
    );
  };

  const renderAllCharts = () => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-10" style={{ color: 'var(--muted)' }}>
          No hay datos suficientes para graficar.
        </div>
      );
    }
    
    if (charts.length === 0) return null;

    return (
      <div className={`grid grid-cols-1 ${charts.length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
         {charts.map((chart, idx) => renderSingleChart(chart, idx))}
      </div>
    );
  };

  const renderDataTable = () => {
    if (!data || data.length === 0) return null;
    const headers = Object.keys(data[0] || {});
    return (
        <div className="p-6 rounded-xl shadow-sm border transition-colors mt-6" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line)' }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--text)' }}>Detalle de Datos</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y" style={{ borderColor: 'var(--line)' }}>
                    <thead style={{ backgroundColor: 'var(--panel-soft)' }}>
                        <tr>
                            {headers.map(h => (
                                <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line)' }}>
                        {data.map((row, i) => (
                            <tr key={i} className="transition-colors hover:opacity-80">
                                {headers.map(h => (
                                    <td key={h} className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text)' }}>{row[h]}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto space-y-6 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center transition-colors hover:text-orange-500"
          style={{ color: 'var(--muted)' }}
        >
          <ChevronLeft size={20} className="mr-1" /> Nuevo Reporte
        </button>
        <div className="flex gap-3">
          {suggested_exports.includes('excel') && (
            <button onClick={() => handleExport('excel')} disabled={isExporting} className="flex items-center px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors font-medium text-sm">
                <FileSpreadsheet size={16} className="mr-2" /> Excel
            </button>
          )}
          {suggested_exports.includes('pdf') && (
            <button onClick={() => handleExport('pdf')} disabled={isExporting} className="flex items-center px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors font-medium text-sm">
                <File size={16} className="mr-2" /> PDF
            </button>
          )}
          {suggested_exports.includes('word') && (
            <button onClick={() => handleExport('word')} disabled={isExporting} className="flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors font-medium text-sm">
                <FileText size={16} className="mr-2" /> Word
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpis.map((kpi, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl shadow-sm border transition-colors"
              style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line)' }}
            >
              <h3 className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                {kpi.title}
              </h3>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--text)' }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Título y Gráficos */}
      {charts.length > 0 && (
          <div className="space-y-6">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                  {title || "Reporte Dinámico"}
              </h2>
              {renderAllCharts()}
          </div>
      )}

      {/* Tabla Detallada Independiente */}
      {renderDataTable()}
    </div>
  );
}

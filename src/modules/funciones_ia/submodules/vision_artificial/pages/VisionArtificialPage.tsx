import { useNavigate } from 'react-router-dom';

export default function VisionArtificialPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8 animate-in fade-in duration-300">
      <div 
        className="rounded-2xl border p-8 md:p-12 text-center space-y-6 shadow-xl relative overflow-hidden"
        style={{
          borderColor: 'var(--line)',
          backgroundColor: 'var(--panel)',
        }}
      >
        {/* Glow effect */}
        <div 
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[100px] opacity-20 pointer-events-none"
          style={{ backgroundColor: 'var(--brand-2)' }}
        />
        <div 
          className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-20 pointer-events-none"
          style={{ backgroundColor: 'var(--brand)' }}
        />

        <div className="mx-auto w-20 h-20 rounded-2xl bg-[var(--panel-soft)] border border-[var(--line)] flex items-center justify-center text-4xl shadow-md">
          📱
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Visión artificial disponible solo en móvil
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--brand-2)' }}>
            Disponible en la app móvil
          </p>
        </div>

        <div className="max-w-xl mx-auto space-y-4 text-base leading-relaxed">
          <p className="font-medium text-white">
            Para analizar ingredientes con la cámara o imágenes de despensa, descarga y usa la aplicación móvil de HomeChef.
          </p>
          <p style={{ color: 'var(--muted)' }} className="text-sm">
            En la versión web puedes seguir usando el Asistente IA, Demanda y precios, y Publicación de platos.
          </p>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            onClick={() => navigate('/chef/ai/assistant')}
            className="px-6 py-3 rounded-xl border font-bold hover:bg-[var(--panel-soft)] transition-all duration-200"
            style={{ borderColor: 'var(--line)' }}
          >
            Volver al Asistente IA
          </button>
          <button
            type="button"
            onClick={() => navigate('/chef/ai/assistant')}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 hover:opacity-95"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
          >
            Ir a Asistente IA textual
          </button>
          <button
            type="button"
            onClick={() => navigate('/chef/ai/pricing')}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 hover:opacity-95"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
          >
            Ir a Demanda y precios
          </button>
        </div>
      </div>
    </div>
  );
}

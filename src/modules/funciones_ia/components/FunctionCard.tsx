import { IAFunctionMetadata } from '../types/funcionesIa.types';

interface FunctionCardProps {
  iaFunction: IAFunctionMetadata;
  loading: boolean;
  onClick: () => void;
}

export default function FunctionCard({ iaFunction, loading, onClick }: FunctionCardProps) {
  return (
    <button
      type="button"
      className="group text-left rounded-xl border p-5 min-h-[200px] flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:cursor-wait"
      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
      onClick={onClick}
      disabled={loading}
    >
      <span 
        className="h-11 w-11 rounded-lg grid place-items-center text-white font-bold transition-all duration-300 group-hover:rotate-6 group-hover:scale-110" 
        style={{ backgroundColor: iaFunction.accent }}
      >
        {iaFunction.shortLabel}
      </span>
      <span className="text-xl font-semibold leading-tight group-hover:text-[var(--brand-2)] transition-colors">
        {iaFunction.title}
      </span>
      <span className="text-sm flex-1" style={{ color: 'var(--muted)' }}>
        {iaFunction.description}
      </span>
      <span className="text-sm font-semibold flex items-center gap-1" style={{ color: iaFunction.code === 'vision_artificial' ? 'var(--muted)' : 'var(--brand-2)' }}>
        {loading ? 'Validando...' : iaFunction.code === 'vision_artificial' ? 'Solo disponible en la app móvil' : 'Abrir función'}
        <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
      </span>
    </button>
  );
}

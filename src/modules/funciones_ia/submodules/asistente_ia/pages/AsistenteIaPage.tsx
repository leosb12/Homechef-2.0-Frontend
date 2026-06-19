import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthSession } from '../../../../gestion_usuarios_acceso_suscripcion/services/auth_session';
import { suggestRecipes } from '../services/asistenteIa.service';
import type { RecipeSuggestResponse, RecipeSuggestionItem } from '../types/asistenteIa.types';

const PREDEFINED_INGREDIENTS = [
  'Pollo', 'Carne molida', 'Arroz', 'Papa', 'Huevo', 'Queso', 'Tomate',
  'Cebolla', 'Zanahoria', 'Calabaza', 'Pan', 'Mayonesa', 'Fideo',
  'Atún', 'Lentejas', 'Yuca', 'Plátano', 'Ají', 'Lechuga'
];

export default function AsistenteIaPage() {
  const user = useAuthSession((state) => state.user);
  const chefId = user?.id || user?.supabase_user_id || 'anonymous_chef';
  const location = useLocation();

  const [prompt, setPrompt] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RecipeSuggestResponse | null>(null);

  // Accordion open/close state mapped by dish index
  const [expandedSection, setExpandedSection] = useState<Record<string, 'ingredients' | 'prep' | 'sales' | null>>({});

  const hasInitializedFromState = useRef(false);

  useEffect(() => {
    if (hasInitializedFromState.current) return;

    const state = location.state as { ingredients?: string[]; triggerSearch?: boolean } | null;
    if (state?.ingredients && state.ingredients.length > 0) {
      hasInitializedFromState.current = true;
      const lowercasedIngredients = state.ingredients.map((i) => i.toLowerCase());
      setSelectedIngredients(lowercasedIngredients);

      if (state.triggerSearch) {
        const autoSubmit = async () => {
          setIsLoading(true);
          setError('');
          setResult(null);

          try {
            const response = await suggestRecipes({
              chef_id: chefId,
              ingredients: lowercasedIngredients,
            });
            setResult(response);
          } catch (err: any) {
            console.error(err);
            setError(
              err?.response?.data?.detail ||
                'No se pudo conectar con el Asistente IA. Verifica tu suscripción e intenta de nuevo.'
            );
          } finally {
            setIsLoading(false);
          }
        };
        autoSubmit();
      }
    }
  }, [location.state, chefId]);

  const toggleIngredient = (ingredient: string) => {
    const ing = ingredient.toLowerCase();
    if (selectedIngredients.includes(ing)) {
      setSelectedIngredients(selectedIngredients.filter((x) => x !== ing));
    } else {
      setSelectedIngredients([...selectedIngredients, ing]);
    }
  };

  const handleToggleSection = (dishIdx: number, section: 'ingredients' | 'prep' | 'sales') => {
    const key = `dish-${dishIdx}`;
    const current = expandedSection[key];
    setExpandedSection({
      ...expandedSection,
      [key]: current === section ? null : section
    });
  };

  const handleReset = () => {
    setPrompt('');
    setSelectedIngredients([]);
    setResult(null);
    setError('');
    setExpandedSection({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && selectedIngredients.length === 0) {
      setError('Escribe qué quieres preparar o selecciona al menos un ingrediente.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await suggestRecipes({
        chef_id: chefId,
        prompt: prompt.trim() || undefined,
        ingredients: selectedIngredients.length > 0 ? selectedIngredients : undefined,
      });
      setResult(response);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail || 
        'No se pudo conectar con el Asistente IA. Verifica tu suscripción e intenta de nuevo.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[var(--brand-2)]">
          <span className="text-2xl">✨</span>
          <h1 className="text-3xl font-bold text-white">Recomendar platos con ingredientes</h1>
        </div>
        <p style={{ color: 'var(--muted)' }}>
          Cuéntanos qué tienes en tu cocina y la IA te sugerirá platos caseros optimizados para vender en HomeChef.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Query Form (Only show when not loading and no result) */}
      {!isLoading && !result && (
        <form onSubmit={handleSubmit} className="rounded-xl border p-6 space-y-6" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white">¿Qué quieres cocinar hoy?</label>
            <textarea
              className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
              placeholder="Ej. Necesito una receta rápida para vender a la hora del almuerzo, que sea económica y rinda mucho..."
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {selectedIngredients.length > 0 && (
              <div className="space-y-2 pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
                <label className="block text-xs font-bold text-white uppercase tracking-wider">Ingredientes activos para tu receta:</label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIngredients.map((ing) => (
                    <span
                      key={ing}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--brand-2)]/10 text-[var(--brand-2)] border border-[var(--brand-2)]/20"
                    >
                      {ing.charAt(0).toUpperCase() + ing.slice(1)}
                      <button
                        type="button"
                        onClick={() => setSelectedIngredients(selectedIngredients.filter((x) => x !== ing))}
                        className="text-[var(--brand-2)] hover:text-red-400 font-bold ml-1 transition duration-150"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-white">Ingredientes disponibles en tu cocina:</label>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                ¿Tu ingrediente no está en la lista? Escríbelo arriba en la idea del plato.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_INGREDIENTS.map((ingredient) => {
                const isSelected = selectedIngredients.includes(ingredient.toLowerCase());
                return (
                  <button
                    key={ingredient}
                    type="button"
                    onClick={() => toggleIngredient(ingredient)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
                    style={{
                      borderColor: isSelected ? 'var(--brand-2)' : 'var(--line)',
                      backgroundColor: isSelected ? 'var(--panel-soft)' : 'transparent',
                      color: isSelected ? 'var(--brand-2)' : 'var(--muted)',
                    }}
                  >
                    {isSelected ? '✓ ' : ''}{ingredient}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg font-bold text-white transition duration-200 hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
          >
            🚀 Generar recomendaciones
          </button>
        </form>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 rounded-xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="w-12 h-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center space-y-1">
            <h3 className="font-bold text-white text-lg">La IA está pensando recetas para ti...</h3>
            <p className="text-sm px-4" style={{ color: 'var(--muted)' }}>
              Buscando combinaciones ideales de platos caseros y calculando márgenes de venta en Bolivia.
            </p>
          </div>
        </div>
      )}

      {/* Results View */}
      {!isLoading && result && (
        <div className="space-y-6">
          {result.fallback_used && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
              ⚠️ Respuesta generada con proveedor alternativo de respaldo.
            </div>
          )}

          {/* interpreted request */}
          <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
            <h3 className="text-sm font-bold text-[var(--brand-2)] uppercase tracking-wider">Interpretación de la IA</h3>
            {result.interpreted_request.raw_prompt && (
              <p className="text-sm italic" style={{ color: 'var(--muted)' }}>« {result.interpreted_request.raw_prompt} »</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p><span className="font-semibold text-white">Intención:</span> {result.interpreted_request.userIntent}</p>
              {result.interpreted_request.detected_ingredients.length > 0 && (
                <p>
                  <span className="font-semibold text-white">Ingredientes detectados:</span>{' '}
                  {result.interpreted_request.detected_ingredients.join(', ')}
                </p>
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold text-white">Platos recomendados:</h2>

          {result.suggestions.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--muted)' }}>No se encontraron platos sugeridos.</p>
          ) : (
            <div className="space-y-6">
              {result.suggestions.map((suggestion, idx) => {
                const key = `dish-${idx}`;
                const activeSec = expandedSection[key] || null;

                return (
                  <div key={idx} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                    {suggestion.imageUrl && (
                      <img
                        src={suggestion.imageUrl}
                        alt={suggestion.dish_name}
                        className="w-full h-48 object-cover border-b"
                        style={{ borderColor: 'var(--line)' }}
                      />
                    )}
                    <div className="p-6 space-y-4">
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-[var(--brand-2)]">{suggestion.dish_name}</h3>
                          <p className="text-sm" style={{ color: 'var(--muted)' }}>{suggestion.description}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-[var(--panel-soft)] text-xs font-semibold text-white border" style={{ borderColor: 'var(--line)' }}>
                          {suggestion.category}
                        </span>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-4 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1">🍽️ {suggestion.estimated_portions} porciones</span>
                        <span className="flex items-center gap-1">⏱️ {suggestion.preparation_time_minutes} minutos</span>
                        <span className="flex items-center gap-1">
                          🔥 Dificultad:{' '}
                          <strong
                            style={{
                              color:
                                suggestion.difficulty.toLowerCase() === 'fácil'
                                  ? '#10b981'
                                  : suggestion.difficulty.toLowerCase() === 'medio'
                                  ? '#f59e0b'
                                  : '#ef4444',
                            }}
                          >
                            {suggestion.difficulty}
                          </strong>
                        </span>
                      </div>

                      {/* Accordions */}
                      <div className="space-y-2 pt-2">
                        {/* 1. Ingredientes */}
                        <div className="border rounded-lg" style={{ borderColor: 'var(--line)' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleSection(idx, 'ingredients')}
                            className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-white hover:bg-[var(--panel-soft)] transition-colors"
                          >
                            <span>🛒 Ingredientes y Sustituciones</span>
                            <span>{activeSec === 'ingredients' ? '▲' : '▼'}</span>
                          </button>
                          {activeSec === 'ingredients' && (
                            <div className="p-4 border-t space-y-3 text-sm" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                              <div>
                                <h4 className="font-bold text-white mb-1">Ingredientes empleados:</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                  {suggestion.ingredients_used.map((ing, i) => <li key={i}>{ing}</li>)}
                                </ul>
                              </div>
                              {suggestion.optional_extra_ingredients.length > 0 && (
                                <div>
                                  <h4 className="font-bold text-white mb-1">Ingredientes opcionales recomendados:</h4>
                                  <ul className="list-disc pl-5 space-y-1 text-[var(--muted)]">
                                    {suggestion.optional_extra_ingredients.map((ing, i) => <li key={i}>+ {ing}</li>)}
                                  </ul>
                                </div>
                              )}
                              {suggestion.recommended_substitutions.length > 0 && (
                                <div>
                                  <h4 className="font-bold text-white mb-1">Sustituciones posibles:</h4>
                                  <ul className="list-disc pl-5 space-y-1 italic" style={{ color: 'var(--muted)' }}>
                                    {suggestion.recommended_substitutions.map((sub, i) => (
                                      <li key={i}>
                                        {sub.original} por <strong>{sub.substitute}</strong> ({sub.reason})
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. Preparacion */}
                        <div className="border rounded-lg" style={{ borderColor: 'var(--line)' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleSection(idx, 'prep')}
                            className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-white hover:bg-[var(--panel-soft)] transition-colors"
                          >
                            <span>👨‍🍳 Preparación y Consejos</span>
                            <span>{activeSec === 'prep' ? '▲' : '▼'}</span>
                          </button>
                          {activeSec === 'prep' && (
                            <div className="p-4 border-t space-y-3 text-sm" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                              <div>
                                <h4 className="font-bold text-white mb-1.5">Pasos de preparación:</h4>
                                <ol className="list-decimal pl-5 space-y-1.5">
                                  {suggestion.preparation_steps.map((step, i) => <li key={i}>{step}</li>)}
                                </ol>
                              </div>
                              {suggestion.cooking_tips.length > 0 && (
                                <div>
                                  <h4 className="font-bold text-white mb-1">Consejos del chef:</h4>
                                  <ul className="list-none space-y-1.5">
                                    {suggestion.cooking_tips.map((tip, i) => <li key={i}>💡 {tip}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. Ventas y Presentacion */}
                        <div className="border rounded-lg" style={{ borderColor: 'var(--line)' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleSection(idx, 'sales')}
                            className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-white hover:bg-[var(--panel-soft)] transition-colors"
                          >
                            <span>🏪 Ventas y Presentación en HomeChef</span>
                            <span>{activeSec === 'sales' ? '▲' : '▼'}</span>
                          </button>
                          {activeSec === 'sales' && (
                            <div className="p-4 border-t space-y-3 text-sm" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                              {suggestion.selling_points.length > 0 && (
                                <div>
                                  <h4 className="font-bold text-white mb-1">Puntos fuertes de venta:</h4>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {suggestion.selling_points.map((sp, i) => <li key={i}>{sp}</li>)}
                                  </ul>
                                </div>
                              )}
                              <p><strong className="text-white">Presentación sugerida:</strong> {suggestion.presentation_suggestion}</p>
                              <p><strong className="text-white">Almacenamiento:</strong> {suggestion.storage_recommendation}</p>
                              {suggestion.possible_allergens.length > 0 && (
                                <p className="text-red-400">
                                  ⚠️ <strong>Alérgenos:</strong> {suggestion.possible_allergens.join(', ')}
                                </p>
                              )}
                              <p>
                                <strong className="text-white">Aprovechamiento de ingredientes:</strong>{' '}
                                <span className="uppercase font-bold text-[var(--brand-2)]">{suggestion.ingredient_usage_level}</span>
                              </p>
                              <div className="p-3 rounded-lg border border-[var(--brand)] bg-[var(--brand)]/10 text-xs">
                                <strong className="text-[var(--brand-2)] block mb-1">Recomendación comercial:</strong>
                                {suggestion.homechef_sales_recommendation}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-lg border font-semibold hover:bg-[var(--panel-soft)] transition duration-200"
              style={{ borderColor: 'var(--line)' }}
            >
              ← Limpiar y buscar nuevo
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

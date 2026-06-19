import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthSession } from '../../../../gestion_usuarios_acceso_suscripcion/services/auth_session';
import { assistPublication } from '../services/publicacionPlatos.service';
import type { PublicationAssistResponse, PublicationIngredient } from '../types/publicacionPlatos.types';

const UNITS = ['unidad', 'gramo', 'kilo', 'litro', 'ml', 'taza', 'cucharada', 'porción'];

export default function PublicacionPlatosPage() {
  const navigate = useNavigate();
  const user = useAuthSession((state) => state.user);
  const chefId = user?.id || user?.supabase_user_id || 'anonymous_chef';

  // Form input states
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [portions, setPortions] = useState<number>(1);
  const [price, setPrice] = useState<number | ''>('');
  
  // Ingredients list state
  const [ingredients, setIngredients] = useState<PublicationIngredient[]>([]);
  const [newIngName, setNewIngName] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('unidad');
  const [newIngCost, setNewIngCost] = useState<number | ''>('');

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<PublicationAssistResponse | null>(null);
  
  // Editable output fields
  const [sugTitle, setSugTitle] = useState('');
  const [sugDesc, setSugDesc] = useState('');
  const [sugPrice, setSugPrice] = useState('');
  const [sugCategories, setSugCategories] = useState('');
  const [sugTags, setSugTags] = useState<string[]>([]);
  const [sugSchedule, setSugSchedule] = useState('');
  const [sugIngredients, setSugIngredients] = useState<PublicationIngredient[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  const [copied, setCopied] = useState(false);

  const handleAddIngredient = () => {
    if (!newIngName.trim()) return;
    setIngredients([
      ...ingredients,
      {
        name: newIngName.trim(),
        quantity: newIngQty.trim() || '1',
        unit: newIngUnit,
        cost: newIngCost !== '' ? Number(newIngCost) : null,
      }
    ]);

    // Reset item inputs
    setNewIngName('');
    setNewIngQty('');
    setNewIngUnit('unidad');
    setNewIngCost('');
  };

  const handleRemoveIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setResponse(null);
    setCopied(false);

    try {
      const res = await assistPublication({
        chef_id: chefId,
        dish_name: dishName.trim() || undefined,
        description_preliminary: description.trim() || undefined,
        portions: portions || undefined,
        price_preliminary: price !== '' ? Number(price) : null,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
      });

      if (res.success) {
        setResponse(res);
        setSugTitle(res.generated_publication.title);
        setSugDesc(res.generated_publication.description);
        setSugPrice(res.generated_publication.suggested_price.amount.toFixed(1));
        setSugCategories(res.generated_publication.categories.join(', '));
        setSugTags([...res.generated_publication.tags]);
        setSugSchedule(res.generated_publication.schedule || '');
        setSugIngredients(res.generated_publication.ingredients || []);
      } else {
        setError(res.user_explanation || 'No se pudo generar la sugerencia.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Error al conectar con el asistente IA. Asegúrate de tener tu plan activo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const cleaned = newTagInput.trim().toLowerCase();
    if (!sugTags.includes(cleaned)) {
      setSugTags([...sugTags, cleaned]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setSugTags(sugTags.filter((t) => t !== tag));
  };

  const handleCopyClipboard = () => {
    const textToCopy = 
      `Título: ${sugTitle}\n` +
      `Descripción: ${sugDesc}\n` +
      `Precio de venta: ${sugPrice} Bs\n` +
      `Categorías: ${sugCategories}\n` +
      `Etiquetas: ${sugTags.join(', ')}`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplySuggestion = () => {
    const mappedIngredients = sugIngredients.map((ing) => {
      let mappedUnit = 'u';
      switch (ing.unit) {
        case 'unidad': mappedUnit = 'u'; break;
        case 'gramo': mappedUnit = 'g'; break;
        case 'kilo': mappedUnit = 'kg'; break;
        case 'litro': mappedUnit = 'L'; break;
        case 'ml': mappedUnit = 'ml'; break;
        default: mappedUnit = 'u'; break;
      }
      return {
        name: ing.name.trim().toUpperCase().replaceAll(' ', '_'),
        quantity: Number(ing.quantity) || 1,
        unit: mappedUnit
      };
    });

    const mappedTags = sugTags.map((t) => t.trim().toUpperCase().replaceAll(' ', '_'));
    const categoryTags = sugCategories
      .split(',')
      .map((c) => c.trim().toUpperCase().replaceAll(' ', '_'))
      .filter((c) => c.length > 0);
    const combinedTags = Array.from(new Set([...mappedTags, ...categoryTags]));

    navigate('/chef/dishes', {
      state: {
        suggestedDish: {
          name: sugTitle.trim(),
          description: sugDesc.trim(),
          price: sugPrice.trim(),
          portions: String(portions || 1),
          ingredients: mappedIngredients,
          tags: combinedTags,
          schedule: sugSchedule.trim()
        }
      }
    });
  };

  const handleReset = () => {
    setDishName('');
    setDescription('');
    setPortions(1);
    setPrice('');
    setIngredients([]);
    setSugIngredients([]);
    setSugSchedule('');
    setResponse(null);
    setError('');
  };

  return (
    <section className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[var(--brand-2)]">
          <span className="text-2xl">✨</span>
          <h1 className="text-3xl font-bold text-white">Asistente de Publicaciones IA</h1>
        </div>
        <p style={{ color: 'var(--muted)' }}>
          Genera de forma inteligente el título, descripción comercial, categorías, etiquetas y precio óptimo para tu plato.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Main input form */}
      {!isLoading && !response && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata entry */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <h2 className="text-md font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Datos del Plato</h2>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Nombre preliminar (opcional)</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border p-2.5 text-sm"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    placeholder="Ej. Silpancho"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Idea o descripción preliminar (opcional)</label>
                  <textarea
                    className="w-full rounded-lg border p-2.5 text-sm"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    placeholder="Ej. Plato con una porción de arroz, papas fritas y carne de res bien apanada con huevo frito..."
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white">Porciones (opcional)</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-lg border p-2.5 text-sm"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      value={portions}
                      onChange={(e) => setPortions(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white">Precio preliminar (Bs) (opcional)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border p-2.5 text-sm"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      placeholder="Ej. 25"
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredients table */}
            <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <h2 className="text-md font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Ingredientes</h2>

              {/* Added list */}
              <div className="space-y-2">
                {ingredients.length === 0 ? (
                  <p className="text-xs italic" style={{ color: 'var(--muted)' }}>Sin ingredientes cargados. Agrégalos abajo.</p>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center bg-[var(--panel-soft)] border p-2.5 rounded-lg text-xs" style={{ borderColor: 'var(--line)' }}>
                        <div>
                          <span className="font-bold text-white">{ing.name}</span>
                          <span style={{ color: 'var(--muted)' }}> - Cantidad: {ing.quantity} {ing.unit} {ing.cost ? `| Costo: ${ing.cost} Bs` : ''}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(i)}
                          className="text-red-400 hover:text-red-300 font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add form */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-[var(--panel-soft)] p-4 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-white">Nombre</label>
                  <input
                    type="text"
                    className="w-full rounded border p-1.5 text-xs"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                    placeholder="Ej. Carne de res"
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white">Cant.</label>
                  <input
                    type="text"
                    className="w-full rounded border p-1.5 text-xs"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                    placeholder="Ej. 250"
                    value={newIngQty}
                    onChange={(e) => setNewIngQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white">Unidad</label>
                  <select
                    className="w-full rounded border p-1.5 text-xs"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white">Costo (Bs)</label>
                  <input
                    type="number"
                    className="w-full rounded border p-1.5 text-xs"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                    placeholder="Opcional"
                    value={newIngCost}
                    onChange={(e) => setNewIngCost(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="sm:col-span-4 pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="px-4 py-1 rounded bg-[var(--brand)] hover:opacity-90 text-[10px] font-bold text-white"
                  >
                    + Agregar Ingrediente
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <h3 className="font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Generar publicación</h3>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                No necesitas llenar todo. Escribe lo que sepas. La IA completará lo faltante y estimará los valores ideales.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full py-3 rounded-lg font-bold text-white transition duration-200 hover:opacity-90"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
              >
                🪄 Usar IA para Completar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 rounded-xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="w-12 h-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-white text-lg">Optimizando publicación con Inteligencia Artificial...</p>
        </div>
      )}

      {/* AI Suggestion Output */}
      {!isLoading && response && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--panel)] border p-4 rounded-xl" style={{ borderColor: 'var(--line)' }}>
            <div>
              <h3 className="font-bold text-white">Sugerencia de la IA lista</h3>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Motor utilizado: {response.engine_used}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--brand)]/10 text-[var(--brand-2)] border" style={{ borderColor: 'var(--brand)/30' }}>
              Confianza: {Math.round(response.quality.overall_confidence * 100)}%
            </span>
          </div>

          {/* Confidence and summary */}
          <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <div className="w-full bg-[var(--panel-soft)] rounded-full h-2">
              <div
                className="rounded-full h-2 bg-green-500"
                style={{ width: `${response.quality.overall_confidence * 100}%` }}
              />
            </div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{response.user_explanation}</p>
          </div>

          {/* Warnings */}
          {response.warnings.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2 text-xs">
              <h4 className="font-bold text-amber-300 flex items-center gap-1.5">⚠️ Campos estimados o faltantes detectados:</h4>
              <ul className="list-disc pl-5 space-y-1 text-white">
                {response.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Editable Output */}
          <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <h3 className="text-md font-bold text-[var(--brand-2)] border-b pb-2" style={{ borderColor: 'var(--line)' }}>Propuesta generada (puedes editarla)</h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-white">Título comercial sugerido</label>
                <input
                  type="text"
                  className="w-full rounded-lg border p-2.5 text-sm"
                  style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                  value={sugTitle}
                  onChange={(e) => setSugTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white">Descripción comercial sugerida</label>
                <textarea
                  className="w-full rounded-lg border p-2.5 text-sm"
                  style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                  rows={4}
                  value={sugDesc}
                  onChange={(e) => setSugDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-white">Categorías (separadas por comas)</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border p-2.5 text-sm"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    value={sugCategories}
                    onChange={(e) => setSugCategories(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-white">Precio sugerido de venta (Bs)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border p-2.5 text-sm"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    value={sugPrice}
                    onChange={(e) => setSugPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-white">Horario disponible sugerido</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border p-2.5 text-sm"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    placeholder="Ej. 11:00 - 15:00"
                    value={sugSchedule}
                    onChange={(e) => setSugSchedule(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs italic" style={{ color: 'var(--muted)' }}>
                {response.generated_publication.suggested_price.calculation_summary}
              </p>

              {/* Ingredientes sugeridos */}
              <div className="space-y-2 pt-2">
                <label className="font-semibold text-white block">Ingredientes sugeridos</label>
                {sugIngredients.length === 0 ? (
                  <p className="text-xs italic animate-pulse" style={{ color: 'var(--muted)' }}>Sin ingredientes sugeridos.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sugIngredients.map((ing, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[var(--panel-soft)] text-white border"
                        style={{ borderColor: 'var(--line)' }}
                      >
                        <span className="font-bold">{ing.name}</span>: {ing.quantity} {ing.unit}
                        <button
                          type="button"
                          onClick={() => setSugIngredients(sugIngredients.filter((_, idx) => idx !== i))}
                          className="text-red-400 font-bold ml-1 hover:text-red-350"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Form to add ingredient to suggestion */}
                <div className="flex flex-wrap gap-2 items-center bg-[var(--panel-soft)] p-3 rounded-lg border max-w-xl" style={{ borderColor: 'var(--line)' }}>
                  <input
                    type="text"
                    id="new-sug-ing-name"
                    placeholder="Nombre ingrediente"
                    className="rounded border px-2.5 py-1.5 text-xs flex-1 min-w-[120px]"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                  />
                  <input
                    type="text"
                    id="new-sug-ing-qty"
                    placeholder="Cant."
                    className="rounded border px-2.5 py-1.5 text-xs w-16"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                  />
                  <select
                    id="new-sug-ing-unit"
                    className="rounded border px-2.5 py-1.5 text-xs w-24"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const nameEl = document.getElementById('new-sug-ing-name') as HTMLInputElement;
                      const qtyEl = document.getElementById('new-sug-ing-qty') as HTMLInputElement;
                      const unitEl = document.getElementById('new-sug-ing-unit') as HTMLSelectElement;
                      if (nameEl && nameEl.value.trim()) {
                        setSugIngredients([
                          ...sugIngredients,
                          {
                            name: nameEl.value.trim(),
                            quantity: qtyEl.value.trim() || '1',
                            unit: unitEl.value,
                            cost: null
                          }
                        ]);
                        nameEl.value = '';
                        qtyEl.value = '';
                      }
                    }}
                    className="px-4 py-1.5 rounded bg-[var(--brand)] text-xs font-bold text-white transition-all active:scale-95"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Tags editable */}
              <div className="space-y-2 pt-2">
                <label className="font-semibold text-white block">Etiquetas recomendadas</label>
                <div className="flex flex-wrap gap-2">
                  {sugTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[var(--panel-soft)] text-white border"
                      style={{ borderColor: 'var(--line)' }}
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-red-400 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Tag */}
                <form onSubmit={handleAddTag} className="flex gap-2 max-w-xs pt-1">
                  <input
                    type="text"
                    className="rounded border px-2 py-1 text-xs flex-1"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    placeholder="Nueva etiqueta"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                  />
                  <button type="submit" className="px-3 py-1 rounded bg-[var(--panel-soft)] text-xs border text-white" style={{ borderColor: 'var(--line)' }}>
                    + Añadir
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-between items-center pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-lg border font-semibold hover:bg-[var(--panel-soft)] transition duration-200"
              style={{ borderColor: 'var(--line)' }}
            >
              ← Descartar y calcular nuevo
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopyClipboard}
                className="px-6 py-2.5 rounded-lg border font-semibold hover:bg-[var(--panel-soft)] transition duration-200 text-white"
                style={{ borderColor: 'var(--line)' }}
              >
                {copied ? '✅ Copiado!' : '📋 Copiar Datos'}
              </button>

              <button
                type="button"
                onClick={handleApplySuggestion}
                className="px-6 py-2.5 rounded-lg font-bold text-white transition duration-200 hover:opacity-90"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
              >
                Aplicar sugerencia
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

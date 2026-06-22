import { useEffect, useMemo, useState } from 'react'
import { fetchChefInventory, createChefInventoryItem, updateChefInventoryItem, deleteChefInventoryItem } from '../services/chef_service'
import LoadingButton from '../components/LoadingButton'
import SearchableSelect from '../components/SearchableSelect'
import { INGREDIENTES } from '../constants'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import ChefOfflineBanner from '../components/ChefOfflineBanner'

function prettyLabel(value) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function emptyForm() {
  return {
    id: '',
    name: '',
    unit_of_measure: 'kg',
    current_stock: '',
    low_stock_threshold: '',
    expiration_date: '',
    is_active: true,
  }
}

function normalizeItem(item) {
  return {
    id: item.id || '',
    name: item.name || '',
    unit_of_measure: item.unit_of_measure || 'kg',
    current_stock: String(item.current_stock ?? ''),
    low_stock_threshold: String(item.low_stock_threshold ?? ''),
    expiration_date: item.expiration_date || '',
    is_active: item.is_active ?? true,
    status: item.status || 'ok'
  }
}

export default function ChefInventoryPage() {
  const { isOnline } = useConnectivity()
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [form, setForm] = useState(emptyForm())
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loadingAction, setLoadingAction] = useState('')

  const load = async () => {
    try {
      const data = await fetchChefInventory()
      const nextItems = data.items || []
      setItems(nextItems)
      if (selectedId) {
        const found = nextItems.find((x) => String(x.id) === String(selectedId))
        if (found) {
          setForm(normalizeItem(found))
        } else {
          setSelectedId('')
          setForm(emptyForm())
        }
      }
    } catch (err) {
      setIsError(true)
      if (!isOnline) {
        setMessage('No hay datos offline disponibles para esta pantalla. Conéctate y sincroniza cuando tengas internet.')
      } else {
        setMessage(err?.response?.data?.detail || 'No se pudo cargar el inventario.')
      }
    }
  };

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesTab = activeTab === 'all' ? true : item.status === activeTab
      const matchesSearch = q ? (item.name || '').toLowerCase().includes(q) : true
      return matchesTab && matchesSearch
    })
  }, [items, search, activeTab])

  const counters = useMemo(() => {
    const base = { all: items.length, ok: 0, low_stock: 0 }
    items.forEach((x) => {
      if (x.status === 'ok') base.ok += 1
      if (x.status === 'low_stock') base.low_stock += 1
    })
    return base
  }, [items])

  const setNotice = (text, error = false) => {
    setIsError(error)
    setMessage(text)
  }

  const onNewItem = () => {
    setSelectedId('')
    setForm(emptyForm())
  }

  const onSelectItem = (item) => {
    setSelectedId(item.id)
    setForm(normalizeItem(item))
  }

  const saveItem = async () => {
    setLoadingAction('save-item')
    try {
      const payload = {
        name: form.name.trim(),
        unit_of_measure: form.unit_of_measure,
        current_stock: Number(form.current_stock || 0),
        low_stock_threshold: Number(form.low_stock_threshold || 0),
        expiration_date: form.expiration_date || null,
        is_active: form.is_active,
      }

      if (selectedId) {
        await updateChefInventoryItem(selectedId, payload)
        setNotice('Insumo actualizado.')
      } else {
        await createChefInventoryItem(payload)
        setNotice('Insumo registrado.')
      }
      await load()
      if (!selectedId) setForm(emptyForm())
    } catch (err) {
      setNotice(err?.response?.data?.detail || 'No se pudo guardar el insumo.', true)
    } finally {
      setLoadingAction('')
    }
  }

  const removeItem = async (itemId) => {
    setLoadingAction(`remove-${itemId}`)
    try {
      await deleteChefInventoryItem(itemId)
      if (selectedId === itemId) {
        setSelectedId('')
        setForm(emptyForm())
      }
      setNotice('Insumo eliminado.')
      await load()
    } catch (err) {
      setNotice(err?.response?.data?.detail || 'No se pudo eliminar insumo.', true)
    } finally {
      setLoadingAction('')
    }
  }

  const isEditing = !!selectedId

  return (
    <section className="space-y-4">
      <ChefOfflineBanner />
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario e Insumos</h1>
          <p style={{ color: 'var(--muted)' }}>Controla tu stock de ingredientes para cocinar.</p>
        </div>
        <button
          type="button"
          onClick={onNewItem}
          className="px-4 py-2 rounded-lg text-white font-semibold self-start sm:self-auto shadow-md transition-transform active:scale-95"
          style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
        >
          + Registrar Insumo
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] items-start">
        <aside
          className="rounded-xl border p-3 space-y-3 min-[1024px]:w-auto"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        >
          <div className="flex gap-2">
            <input
              className="h-11 w-full rounded-lg border px-3 transition-colors focus:outline-none"
              style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
              placeholder="Buscar ingrediente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label={`Todos ${counters.all}`} />
            <TabButton active={activeTab === 'ok'} onClick={() => setActiveTab('ok')} label={`Stock Ok ${counters.ok}`} />
            <TabButton active={activeTab === 'low_stock'} onClick={() => setActiveTab('low_stock')} label={`Bajo Stock ${counters.low_stock}`} />
          </div>

          <div className="space-y-2 max-h-[640px] overflow-auto pr-1">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border p-3 cursor-pointer transition-colors"
                style={{
                  borderColor: selectedId === item.id ? 'var(--brand)' : 'var(--line)',
                  backgroundColor: selectedId === item.id ? 'var(--panel-soft)' : 'var(--panel)',
                }}
                onClick={() => onSelectItem(item)}
              >
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <p className="font-semibold text-lg flex items-center gap-2">
                      {prettyLabel(item.name)}
                      {item.synced === false && (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 border border-amber-500/30">
                          Pendiente de sincronizar
                        </span>
                      )}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      Stock actual: <span className="font-medium text-[var(--text)]">{Number(item.current_stock).toFixed(2)} {item.unit_of_measure}</span>
                    </p>
                    {item.expiration_date && (
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        Vence: <span className="font-medium text-[var(--text)]">{item.expiration_date}</span>
                      </p>
                    )}
                    {item.status === 'low_stock' && (
                      <p className="text-xs font-bold text-orange-500 mt-1">⚠️ Stock bajo (Min: {Number(item.low_stock_threshold).toFixed(2)})</p>
                    )}
                    {item.status === 'expired' && (
                      <p className="text-xs font-bold text-red-500 mt-1">❌ Insumo Vencido</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <LoadingButton
                      type="button"
                      className="px-2 py-1 text-xs rounded border text-red-500 font-semibold transition-colors hover:bg-red-500/10"
                      style={{ borderColor: 'var(--line)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(item.id)
                      }}
                      loading={loadingAction === `remove-${item.id}`}
                      loadingLabel="..."
                    >
                      Eliminar
                    </LoadingButton>
                  </div>
                </div>
              </article>
            ))}
            {!filteredItems.length && <p style={{ color: 'var(--muted)' }}>Sin insumos registrados.</p>}
          </div>
        </aside>

        <section
          className="rounded-xl border p-5 space-y-5 min-[1024px]:w-auto"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{isEditing ? 'Editar insumo' : 'Registrar nuevo insumo'}</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block w-full">
              <p className="text-sm mb-1 font-medium" style={{ color: 'var(--muted)' }}>Nombre del Insumo</p>
              <SearchableSelect
                options={INGREDIENTES}
                value={form.name}
                onChange={(val) => setForm({ ...form, name: val })}
                placeholder="Seleccionar ingrediente..."
                disabled={isEditing}
                formatOption={prettyLabel}
              />
            </label>
            
            <label className="block">
              <p className="text-sm mb-1 font-medium" style={{ color: 'var(--muted)' }}>Unidad de Medida</p>
              <select
                className="h-11 w-full rounded-lg border px-3 transition-colors focus:outline-none focus:border-[var(--brand)]"
                style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                value={form.unit_of_measure}
                onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })}
              >
                <option value="kg">Kilogramos (kg)</option>
                <option value="g">Gramos (g)</option>
                <option value="L">Litros (L)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="u">Unidades (u)</option>
              </select>
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Input 
              label={`Stock Actual (${form.unit_of_measure})`} 
              type="number" 
              step="any" 
              value={form.current_stock} 
              onChange={(v) => setForm({ ...form, current_stock: v })} 
            />
            <Input 
              label={`Alerta de Bajo Stock`} 
              type="number" 
              step="any" 
              value={form.low_stock_threshold} 
              onChange={(v) => setForm({ ...form, low_stock_threshold: v })} 
            />
            <Input 
              label={`Fecha de Vencimiento`} 
              type="date" 
              min={new Date().toISOString().split('T')[0]}
              value={form.expiration_date} 
              onChange={(v) => setForm({ ...form, expiration_date: v })} 
            />
          </div>

          <div className="flex items-center gap-2 mt-4 p-4 rounded-xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
            <input 
              type="checkbox" 
              id="is_active" 
              className="w-5 h-5 rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]" 
              checked={form.is_active} 
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <label htmlFor="is_active" className="font-medium cursor-pointer">Insumo Activo</label>
            <span className="text-sm ml-2" style={{ color: 'var(--muted)' }}>Desmarca para pausar temporalmente su uso.</span>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
            {isEditing && (
              <button
                type="button"
                className="px-4 py-2 rounded-lg border font-medium transition-colors"
                style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                onClick={() => {
                  setSelectedId('')
                  setForm(emptyForm())
                }}
              >
                Cancelar
              </button>
            )}
            <LoadingButton
              type="button"
              className="px-6 py-2 rounded-lg text-white font-semibold shadow-md transition-transform active:scale-95"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
              onClick={saveItem}
              loading={loadingAction === 'save-item'}
              loadingLabel="Guardando..."
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Insumo'}
            </LoadingButton>
          </div>
        </section>
      </div>

      {message && <p className={`p-3 rounded-lg font-medium border ${isError ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{message}</p>}
    </section>
  )
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${active ? 'shadow-sm' : ''}`}
      style={{
        borderColor: active ? 'var(--brand)' : 'var(--line)',
        color: active ? 'var(--brand-2)' : 'var(--text)',
        backgroundColor: active ? 'var(--panel-soft)' : 'transparent',
      }}
    >
      {label}
    </button>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder, min, step }) {
  return (
    <label className="block">
      <p className="text-sm mb-1 font-medium" style={{ color: 'var(--muted)' }}>{label}</p>
      <input
        type={type}
        min={min}
        step={step}
        className="h-11 w-full rounded-lg border px-3 transition-colors focus:outline-none focus:border-[var(--brand)]"
        style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

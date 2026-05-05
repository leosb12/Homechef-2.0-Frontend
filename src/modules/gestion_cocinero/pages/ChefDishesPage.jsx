import { useEffect, useMemo, useRef, useState } from 'react'
import { createChefDish, deleteChefDish, fetchChefDishes, updateChefDish } from '../services/chef_service'

const ALERGENOS = [
  'GLUTEN', 'LACTEOS', 'HUEVO', 'MANI', 'FRUTOS_SECOS', 'SOYA', 'PESCADO', 'MARISCOS',
  'CRUSTACEOS', 'MOLUSCOS', 'SESAMO', 'MOSTAZA', 'APIO', 'SULFITOS', 'MAIZ', 'AJO', 'CEBOLLA', 'PICANTE',
]

const INGREDIENTES = [
  'CARNE_RES', 'POLLO', 'CERDO', 'CHARQUE', 'CHORIZO', 'PESCADO', 'CAMARON', 'MARISCOS',
  'HUEVO', 'QUESO', 'LECHE', 'CREMA', 'ARROZ', 'FIDEO', 'PAN', 'HARINA', 'QUINUA', 'PAPA',
  'YUCA', 'CAMOTE', 'PLATANO', 'CHOCLO', 'MAIZ', 'TOMATE', 'CEBOLLA', 'ZANAHORIA', 'LECHUGA',
  'ARVEJA', 'VAINITA', 'BROCOLI', 'PIMENTON', 'LOCOTO', 'AJI', 'MANI', 'GARBANZO', 'LENTEJA',
  'FRIJOL', 'AJO', 'PEREJIL', 'CILANTRO', 'OREGANO', 'COMINO', 'PIMIENTA', 'ACEITE', 'SAL', 'AZUCAR', 'LIMON',
]

const ETIQUETAS = [
  'CASERO', 'TRADICIONAL', 'ARTESANAL', 'POPULAR', 'RECOMENDADO', 'DESTACADO', 'NUEVO',
  'ECONOMICO', 'PROMOCION', 'PREMIUM', 'RAPIDO', 'FRESCO', 'RECIEN_HECHO', 'PARA_COMPARTIR',
  'PORCION_GRANDE', 'DESAYUNO', 'ALMUERZO', 'CENA', 'MERIENDA', 'PICANTE', 'NO_PICANTE',
  'DULCE', 'SALADO', 'AGRIDULCE', 'VEGETARIANO', 'VEGANO', 'SIN_GLUTEN', 'SIN_LACTEOS',
  'ALTO_EN_PROTEINA', 'BAJO_EN_GRASA', 'SOPA', 'PLATO_FUERTE', 'ENTRADA', 'POSTRE', 'BEBIDA',
  'SNACK', 'BOLIVIANO', 'COCHABAMBINO', 'PACENO', 'CRUCENO', 'TARIJENO',
]

const STATUS_LABELS = {
  published: 'Publicado',
  draft: 'Borrador',
  paused: 'Pausado',
  sold_out: 'Agotado',
}

const DISH_STATUS_OPTIONS = [
  { value: 'published', label: 'Publicado' },
  { value: 'draft', label: 'Borrador' },
  { value: 'paused', label: 'Pausado' },
]

function emptyForm() {
  return {
    _id: '',
    name: '',
    description: '',
    price: '',
    portions: '',
    schedule: '',
    ingredients: [],
    tags: [],
    allergens: [],
    image_url: '',
    status: 'draft',
  }
}

function normalizeDish(dish) {
  return {
    _id: dish._id || '',
    name: dish.name || '',
    description: dish.description || '',
    price: String(dish.price ?? ''),
    portions: String(dish.portions ?? ''),
    schedule: dish.schedule || '',
    ingredients: Array.isArray(dish.ingredients) ? dish.ingredients : [],
    tags: Array.isArray(dish.tags) ? dish.tags : [],
    allergens: Array.isArray(dish.allergens) ? dish.allergens : [],
    image_url: dish.image_url || '',
    status: dish.status || 'draft',
  }
}

export default function ChefDishesPage() {
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [form, setForm] = useState(emptyForm())
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const fileInputRef = useRef(null)

  const load = async () => {
    try {
      const data = await fetchChefDishes()
      const nextItems = data.items || []
      setItems(nextItems)
      if (selectedId) {
        const found = nextItems.find((x) => x._id === selectedId)
        if (found) {
          setForm(normalizeDish(found))
        } else {
          setSelectedId('')
          setForm(emptyForm())
        }
      }
    } catch (err) {
      setIsError(true)
      setMessage(err?.response?.data?.detail || 'No se pudo cargar platos.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesTab = activeTab === 'all' ? true : item.status === activeTab
      const matchesSearch = q
        ? (item.name || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q)
        : true
      return matchesTab && matchesSearch
    })
  }, [items, search, activeTab])

  const counters = useMemo(() => {
    const base = { all: items.length, published: 0, draft: 0, paused: 0 }
    items.forEach((x) => {
      if (x.status === 'published') base.published += 1
      if (x.status === 'draft') base.draft += 1
      if (x.status === 'paused') base.paused += 1
    })
    return base
  }, [items])

  const setNotice = (text, error = false) => {
    setIsError(error)
    setMessage(text)
  }

  const onNewDish = () => {
    setSelectedId('')
    setForm(emptyForm())
  }

  const onSelectDish = (dish) => {
    setSelectedId(dish._id)
    setForm(normalizeDish(dish))
  }

  const onPickImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image_url: String(reader.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  const onRemoveImage = () => {
    setForm((prev) => ({ ...prev, image_url: '' }))
  }

  const toggleArrayValue = (field, value) => {
    setForm((prev) => {
      const current = prev[field] || []
      const exists = current.includes(value)
      return { ...prev, [field]: exists ? current.filter((x) => x !== value) : [...current, value] }
    })
  }

  const saveDish = async ({ publish }) => {
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        portions: Number(form.portions),
        ingredients: form.ingredients,
        tags: form.tags,
        allergens: form.allergens,
        image_url: form.image_url,
        schedule: form.schedule.trim(),
        action: publish ? 'publish' : 'draft',
        status: publish ? 'published' : 'draft',
      }

      if (selectedId) {
        await updateChefDish(selectedId, payload)
        setNotice(publish ? 'Plato actualizado y publicado.' : 'Borrador actualizado.')
      } else {
        await createChefDish(payload)
        setNotice(publish ? 'Plato creado y publicado.' : 'Plato guardado como borrador.')
      }
      await load()
      if (!selectedId) setForm(emptyForm())
    } catch (err) {
      setNotice(err?.response?.data?.detail || 'No se pudo guardar el plato.', true)
    }
  }

  const setDishStatus = async (dishId, status) => {
    try {
      await updateChefDish(dishId, { status })
      setNotice('Estado del plato actualizado.')
      await load()
    } catch (err) {
      setNotice(err?.response?.data?.detail || 'No se pudo actualizar estado.', true)
    }
  }

  const removeDish = async (dishId) => {
    try {
      await deleteChefDish(dishId)
      if (selectedId === dishId) {
        setSelectedId('')
        setForm(emptyForm())
      }
      setNotice('Plato eliminado.')
      await load()
    } catch (err) {
      setNotice(err?.response?.data?.detail || 'No se pudo eliminar plato.', true)
    }
  }

  const isEditing = !!selectedId

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Mis platos</h1>
          <p style={{ color: 'var(--muted)' }}>Administra los platos que ofreces en HomeChef.</p>
        </div>
        <button
          type="button"
          onClick={onNewDish}
          className="px-4 py-2 rounded-lg text-white font-semibold"
          style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
        >
          + Nuevo plato
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] items-start">
        <aside
          className="rounded-xl border p-3 space-y-3 min-[1024px]:w-auto"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        >
          <div className="flex gap-2">
            <input
              className="h-11 w-full rounded-lg border px-3"
              style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
              placeholder="Buscar plato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label={`Todos ${counters.all}`} />
            <TabButton active={activeTab === 'published'} onClick={() => setActiveTab('published')} label={`Publicados ${counters.published}`} />
            <TabButton active={activeTab === 'draft'} onClick={() => setActiveTab('draft')} label={`Borradores ${counters.draft}`} />
            <TabButton active={activeTab === 'paused'} onClick={() => setActiveTab('paused')} label={`Pausados ${counters.paused}`} />
          </div>

          <div className="space-y-2 max-h-[640px] overflow-auto pr-1">
            {filteredItems.map((dish) => (
              <article
                key={dish._id}
                className="rounded-xl border p-2 cursor-pointer"
                style={{
                  borderColor: selectedId === dish._id ? 'var(--brand)' : 'var(--line)',
                  backgroundColor: selectedId === dish._id ? 'var(--panel-soft)' : 'var(--panel)',
                }}
                onClick={() => onSelectDish(dish)}
              >
                <div className="flex gap-3">
                  <div className="h-20 w-24 rounded-lg overflow-hidden border shrink-0" style={{ borderColor: 'var(--line)' }}>
                    {dish.image_url ? (
                      <img src={dish.image_url} alt={dish.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-xs opacity-70">Sin foto</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xl truncate">{dish.name}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      Bs {Number(dish.price || 0).toFixed(2)} · {dish.portions || 0} porciones
                    </p>
                    <p className="text-sm mt-1">{STATUS_LABELS[dish.status] || dish.status}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded border"
                        style={{ borderColor: 'var(--line)' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDishStatus(dish._id, dish.status === 'paused' ? 'published' : 'paused')
                        }}
                      >
                        {dish.status === 'paused' ? 'Reactivar' : 'Pausar'}
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded border"
                        style={{ borderColor: 'var(--line)' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          removeDish(dish._id)
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!filteredItems.length && <p style={{ color: 'var(--muted)' }}>Sin resultados.</p>}
          </div>
        </aside>

        <section
          className="rounded-xl border p-4 space-y-4 min-[1024px]:w-auto"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{isEditing ? 'Editar plato' : 'Nuevo plato'}</h2>
          </div>

          <div className="grid lg:grid-cols-[420px_minmax(0,1fr)] gap-4">
            <div className="space-y-2">
              <p className="font-medium">Foto del plato</p>
              <div className="h-[220px] rounded-xl border border-dashed overflow-hidden" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                {form.image_url ? (
                  <img src={form.image_url} alt="Foto del plato" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-center px-4">
                    <p style={{ color: 'var(--muted)' }}>Sube una foto deliciosa (JPG/PNG)</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 h-11 rounded-lg border"
                  style={{ borderColor: 'var(--line)' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Subir foto
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                <button type="button" className="w-11 rounded-lg border" style={{ borderColor: 'var(--line)' }} onClick={onRemoveImage} title="Quitar foto">
                  🗑
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Input label="Nombre del plato" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Precio (Bs)" type="number" min="1" step="0.01" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
                <Input label="Porciones" type="number" min="1" value={form.portions} onChange={(v) => setForm({ ...form, portions: v })} />
              </div>
              <Input label="Horario disponible" value={form.schedule} onChange={(v) => setForm({ ...form, schedule: v })} placeholder="11:00 - 15:00" />
            </div>
          </div>

          <TextArea label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

          <div className="grid md:grid-cols-3 gap-3">
            <EnumSelector
              label="Ingredientes"
              options={INGREDIENTES}
              selected={form.ingredients}
              onToggle={(v) => toggleArrayValue('ingredients', v)}
            />
            <EnumSelector
              label="Etiquetas"
              options={ETIQUETAS}
              selected={form.tags}
              onToggle={(v) => toggleArrayValue('tags', v)}
            />
            <EnumSelector
              label="Alergenos"
              options={ALERGENOS}
              selected={form.allergens}
              onToggle={(v) => toggleArrayValue('allergens', v)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <label className="block">
              <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Estado del plato</p>
              <select
                className="h-11 w-full rounded-lg border px-3"
                style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {DISH_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--line)' }}
                onClick={() => saveDish({ publish: false })}
              >
                Guardar borrador
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-white font-semibold"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                onClick={() => saveDish({ publish: true })}
              >
                Publicar plato
              </button>
            </div>
          </div>
        </section>
      </div>

      {message && <p className={isError ? 'text-red-500' : 'text-emerald-500'}>{message}</p>}
    </section>
  )
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 rounded-lg border text-sm"
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

function EnumSelector({ label, options, selected, onToggle }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
      <p className="font-semibold mb-2">{label}</p>
      <select
        className="h-10 w-full rounded-lg border px-2 text-sm"
        style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
        onChange={(e) => {
          const val = e.target.value
          if (val) onToggle(val)
          e.target.value = ''
        }}
        defaultValue=""
      >
        <option value="" disabled>Seleccionar...</option>
        {options.filter((x) => !selected.includes(x)).map((opt) => (
          <option key={opt} value={opt}>{prettyLabel(opt)}</option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2 mt-3">
        {selected.map((item) => (
          <button
            key={item}
            type="button"
            className="text-xs px-2 py-1 rounded-full border"
            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
            onClick={() => onToggle(item)}
            title="Quitar"
          >
            {prettyLabel(item)} ✕
          </button>
        ))}
      </div>
    </div>
  )
}

function prettyLabel(value) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function Input({ label, value, onChange, type = 'text', placeholder, min, step }) {
  return (
    <label className="block">
      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
      <input
        type={type}
        min={min}
        step={step}
        className="h-11 w-full rounded-lg border px-3"
        style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
      <textarea
        className="min-h-[96px] w-full rounded-lg border px-3 py-2"
        style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

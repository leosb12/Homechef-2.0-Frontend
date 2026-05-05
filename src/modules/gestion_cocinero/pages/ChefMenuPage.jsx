import { useEffect, useMemo, useState } from 'react'
import { fetchChefDishes, fetchChefMenu, saveChefMenu } from '../services/chef_service'

const ITEM_STATUS_OPTIONS = [
  { value: 'available', label: 'Disponible' },
  { value: 'paused', label: 'Pausado' },
  { value: 'sold_out', label: 'Agotado' },
]

function normalizeItem(item) {
  return {
    dish_id: String(item.dish_id || ''),
    name: item.name || '',
    portions: Number(item.portions || 1),
    status: item.status || 'available',
  }
}

export default function ChefMenuPage() {
  const [dishes, setDishes] = useState([])
  const [search, setSearch] = useState('')
  const [menuItems, setMenuItems] = useState([])
  const [selectedDishId, setSelectedDishId] = useState('')
  const [schedule, setSchedule] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const load = async () => {
    try {
      const [dishesData, menuData] = await Promise.all([fetchChefDishes(), fetchChefMenu()])
      const dishItems = dishesData.items || []
      const items = (menuData.items || []).map(normalizeItem)
      setDishes(dishItems)
      setMenuItems(items)
      setSchedule(menuData.schedule || '')
      setIsActive(menuData.is_active ?? true)
      if (items.length) setSelectedDishId(items[0].dish_id)
      setMessage('')
    } catch (err) {
      setIsError(true)
      setMessage(err?.response?.data?.detail || 'No se pudo cargar menu del dia.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const dishesWithMenuState = useMemo(() => {
    const q = search.trim().toLowerCase()
    return dishes
      .filter((dish) => (!q ? true : (dish.name || '').toLowerCase().includes(q)))
      .map((dish) => {
        const current = menuItems.find((x) => x.dish_id === dish._id)
        return {
          ...dish,
          in_menu: !!current,
          menu_item: current || null,
        }
      })
  }, [dishes, menuItems, search])

  const selectedMenuItem = useMemo(
    () => menuItems.find((x) => x.dish_id === selectedDishId) || null,
    [menuItems, selectedDishId],
  )

  const addToMenu = (dish) => {
    if (menuItems.some((x) => x.dish_id === dish._id)) return
    const next = {
      dish_id: dish._id,
      name: dish.name,
      portions: Number(dish.portions || 1),
      status: dish.status === 'paused' ? 'paused' : 'available',
    }
    setMenuItems((prev) => [...prev, next])
    setSelectedDishId(dish._id)
  }

  const removeFromMenu = (dishId) => {
    setMenuItems((prev) => prev.filter((x) => x.dish_id !== dishId))
    if (selectedDishId === dishId) setSelectedDishId('')
  }

  const updateMenuItem = (dishId, patch) => {
    setMenuItems((prev) => prev.map((x) => (x.dish_id === dishId ? { ...x, ...patch } : x)))
  }

  const saveMenu = async () => {
    try {
      const payload = {
        schedule: String(schedule || '').trim(),
        is_active: isActive,
        items: menuItems.map((x) => ({
          dish_id: x.dish_id,
          name: x.name,
          portions: Number(x.portions || 0),
          status: x.status,
        })),
      }
      await saveChefMenu(payload)
      setIsError(false)
      setMessage('Menu del dia actualizado correctamente.')
      await load()
    } catch (err) {
      setIsError(true)
      setMessage(err?.response?.data?.detail || 'No se pudo guardar el menu del dia.')
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Menu del dia</h1>
          <p style={{ color: 'var(--muted)' }}>
            Organiza los platos activos de la jornada, porciones y disponibilidad.
          </p>
        </div>
        <button
          type="button"
          onClick={saveMenu}
          className="px-4 py-2 rounded-lg text-white font-semibold"
          style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
        >
          Actualizar menu
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] items-start">
        <aside className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <input
            className="h-11 w-full rounded-lg border px-3"
            style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
            placeholder="Buscar plato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            Platos del cocinero: {dishes.length} | En menu: {menuItems.length}
          </div>

          <div className="space-y-2 max-h-[700px] overflow-auto pr-1">
            {dishesWithMenuState.map((dish) => (
              <article
                key={dish._id}
                className="rounded-xl border p-2"
                style={{
                  borderColor:
                    selectedDishId === dish._id ? 'var(--brand)' : dish.in_menu ? 'var(--brand-2)' : 'var(--line)',
                  backgroundColor: selectedDishId === dish._id ? 'var(--panel-soft)' : 'var(--panel)',
                }}
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
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      Estado plato: {dish.status}
                    </p>

                    <div className="flex gap-2 mt-2">
                      {!dish.in_menu ? (
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded border"
                          style={{ borderColor: 'var(--line)' }}
                          onClick={() => addToMenu(dish)}
                        >
                          Marcar en menu
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="px-2 py-1 text-xs rounded border"
                            style={{ borderColor: 'var(--line)' }}
                            onClick={() => setSelectedDishId(dish._id)}
                          >
                            Editar en menu
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 text-xs rounded border"
                            style={{ borderColor: 'var(--line)' }}
                            onClick={() => removeFromMenu(dish._id)}
                          >
                            Quitar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!dishesWithMenuState.length && (
              <p style={{ color: 'var(--muted)' }}>
                No hay platos para mostrar. Registra platos en "Mis platos".
              </p>
            )}
          </div>
        </aside>

        <section className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <h2 className="text-2xl font-semibold">Composicion del menu</h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Horario de menu</p>
              <input
                className="h-11 w-full rounded-lg border px-3"
                style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                placeholder="Ej: 11:00 - 15:00"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              />
            </label>
            <label className="flex items-end gap-2 pb-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span>Menu activo</span>
            </label>
          </div>

          {!selectedMenuItem ? (
            <div className="rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
              Selecciona un plato marcado en menu para editar porciones y estado.
            </div>
          ) : (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
              <p className="text-xl font-semibold">{selectedMenuItem.name}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Porciones para la jornada</p>
                  <input
                    type="number"
                    min="1"
                    className="h-11 w-full rounded-lg border px-3"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                    value={selectedMenuItem.portions}
                    onChange={(e) =>
                      updateMenuItem(selectedMenuItem.dish_id, {
                        portions: Math.max(1, Number(e.target.value || 1)),
                      })
                    }
                  />
                </label>
                <label className="block">
                  <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Disponibilidad</p>
                  <select
                    className="h-11 w-full rounded-lg border px-3"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                    value={selectedMenuItem.status}
                    onChange={(e) => updateMenuItem(selectedMenuItem.dish_id, { status: e.target.value })}
                  >
                    {ITEM_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
            <p className="font-semibold mb-2">Resumen del menu</p>
            <ul className="space-y-1 text-sm">
              {menuItems.map((item) => (
                <li key={item.dish_id} className="flex items-center justify-between gap-2">
                  <span>{item.name}</span>
                  <span style={{ color: 'var(--muted)' }}>
                    {item.portions} porciones · {item.status}
                  </span>
                </li>
              ))}
            </ul>
            {!menuItems.length && <p style={{ color: 'var(--muted)' }}>Aun no agregaste platos al menu del dia.</p>}
          </div>
        </section>
      </div>

      {message && <p className={isError ? 'text-red-500' : 'text-emerald-500'}>{message}</p>}
    </section>
  )
}

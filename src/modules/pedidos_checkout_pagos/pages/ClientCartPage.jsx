import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import LastLoadedNotice from '../../../shared/components/LastLoadedNotice'
import { extractScreenSnapshotMeta } from '../../../shared/services/screen_cache'
import { fetchCart, removeCartItem, updateCartItem } from '../services/cart_service'

export default function ClientCartPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [cartData, setCartData] = useState({ carts: [], summary: { subtotal: 0, items_count: 0 } })
  const [selectedCartId, setSelectedCartId] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [offlineMeta, setOfflineMeta] = useState(null)
  const [busyItemId, setBusyItemId] = useState('')
  const requestedCartId = searchParams.get('cart_id') || ''
  const repeatSummary = location.state?.repeatSummary || null

  useEffect(() => {
    loadCart()
  }, [requestedCartId])

  async function loadCart() {
    setLoading(true)
    setMessage('')
    try {
      const data = await fetchCart()
      setCartData(data)
      setOfflineMeta(extractScreenSnapshotMeta(data))
      if (data?.__offline) {
        setMessage('')
      }
      setSelectedCartId((current) => {
        if (requestedCartId && data.carts?.some((cart) => cart.id === requestedCartId)) {
          return requestedCartId
        }
        if (data.carts?.some((cart) => cart.id === current)) return current
        return data.carts?.[0]?.id || ''
      })
    } catch (error) {
      setOfflineMeta(null)
      setMessage(error?.response?.data?.detail || 'No se pudo cargar el carrito.')
    } finally {
      setLoading(false)
    }
  }

  async function handleQuantityChange(item, nextQuantity) {
    setMessage('')
    setBusyItemId(item.id)
    try {
      const data = await updateCartItem({ itemId: item.id, quantity: nextQuantity })
      mergeCartPayload(data.cart)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo actualizar la cantidad.')
      await loadCart()
    } finally {
      setBusyItemId('')
    }
  }

  async function handleRemove(item) {
    setMessage('')
    setBusyItemId(item.id)
    try {
      const data = await removeCartItem(item.id)
      if (data.cart) {
        mergeCartPayload(data.cart)
      } else {
        await loadCart()
      }
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo eliminar el item.')
    } finally {
      setBusyItemId('')
    }
  }

  function mergeCartPayload(nextCart) {
    setCartData((current) => {
      const carts = [...(current.carts || [])]
      const index = carts.findIndex((cart) => cart.id === nextCart.id)
      if (index >= 0) carts[index] = nextCart
      else carts.push(nextCart)
      return recalculateSummary({ ...current, carts })
    })
    setSelectedCartId(nextCart.id)
    setSearchParams({ cart_id: nextCart.id })
  }

  const isEmpty = !loading && (cartData.carts || []).length === 0
  const total = useMemo(() => Number(cartData.summary?.subtotal || 0).toFixed(2), [cartData.summary?.subtotal])
  const selectedCart = useMemo(() => {
    const carts = cartData.carts || []
    return carts.find((cart) => cart.id === selectedCartId) || carts[0] || null
  }, [cartData.carts, selectedCartId])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Carritos</h1>
          <p style={{ color: 'var(--muted)' }}>
            Cada cocinero mantiene su propio carrito y se confirma por separado en checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/client/explore')}
          className="px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--line)' }}
        >
          Seguir explorando
        </button>
      </div>

      {message && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
          {message}
        </div>
      )}
      {offlineMeta ? <LastLoadedNotice cachedAt={offlineMeta.cachedAt} /> : null}

      {repeatSummary ? (
        <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(34,197,94,.18)', backgroundColor: 'rgba(34,197,94,.08)' }}>
          <p className="font-semibold">Pedido repetido</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {repeatSummary.message} Se solicitaron {repeatSummary.requested}, se agregaron {repeatSummary.added} y se omitieron {repeatSummary.skipped}.
          </p>
        </div>
      ) : null}

      {loading ? <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>Cargando carritos...</div> : null}

      {isEmpty ? (
        <div className="rounded-2xl border p-6 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <h2 className="text-xl font-semibold">Tu carrito esta vacio</h2>
          <p style={{ color: 'var(--muted)' }}>
            Agrega platos desde el marketplace y aqui podras revisar cada carrito antes del checkout.
          </p>
          <div>
            <button
              type="button"
              onClick={() => navigate('/client/explore')}
              className="px-4 py-2 rounded-lg text-white"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              Explorar platos
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {(cartData.carts || []).map((cart) => {
          const isSelected = cart.id === selectedCart?.id
          return (
            <article
              key={cart.id}
              className="rounded-2xl border p-4 space-y-4"
              style={{
                borderColor: isSelected ? 'var(--brand)' : 'var(--line)',
                backgroundColor: 'var(--panel)',
                boxShadow: isSelected ? '0 14px 34px rgba(123, 63, 228, 0.12)' : 'none',
              }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{cart.chef?.name || 'Cocinero HomeChef'}</h2>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {cart.items_count} item(s) · Subtotal Bs {Number(cart.subtotal || 0).toFixed(2)}
                  </p>
                  {cart.chef?.location?.address ? (
                    <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                      Sale desde: {cart.chef.location.address}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCartId(cart.id)
                      setSearchParams({ cart_id: cart.id })
                    }}
                    className="px-4 py-2 rounded-lg border"
                    style={{
                      borderColor: isSelected ? 'var(--brand)' : 'var(--line)',
                      color: isSelected ? 'var(--brand)' : 'inherit',
                    }}
                  >
                    {isSelected ? 'Carrito abierto' : 'Ver carrito'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/client/checkout?cart_id=${encodeURIComponent(cart.id)}`)}
                    className="px-4 py-2 rounded-lg text-white"
                    style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                  >
                    Pedir este carrito
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {selectedCart ? (
        <section className="rounded-2xl border p-4 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Detalle del carrito
              </p>
              <h2 className="text-2xl font-bold">{selectedCart.chef?.name || 'Cocinero HomeChef'}</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Este carrito se procesa como un pedido independiente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/client/checkout?cart_id=${encodeURIComponent(selectedCart.id)}`)}
              className="px-4 py-2 rounded-lg text-white"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              Continuar con este carrito
            </button>
          </div>

          <div className="space-y-3">
            {(selectedCart.items || []).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border p-3 flex flex-col gap-3 md:flex-row md:items-center"
                style={{ borderColor: 'var(--line)' }}
              >
                <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: 'var(--panel-soft)' }}>
                  {item.dish_image_url ? (
                    <img src={item.dish_image_url} alt={item.dish_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-sm" style={{ color: 'var(--muted)' }}>
                      Sin foto
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-semibold">{item.dish_name}</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Bs {Number(item.unit_price || 0).toFixed(2)} por unidad · {item.available_portions} porciones disponibles
                  </p>
                  <p className="text-sm" style={{ color: 'var(--brand-2)' }}>
                    Subtotal Bs {Number(item.subtotal || 0).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyItemId === item.id || item.quantity <= 1}
                    onClick={() => handleQuantityChange(item, item.quantity - 1)}
                    className="h-10 w-10 rounded-lg border disabled:opacity-50"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    -
                  </button>
                  <div className="min-w-10 text-center">{item.quantity}</div>
                  <button
                    type="button"
                    disabled={busyItemId === item.id || item.quantity >= item.available_portions}
                    onClick={() => handleQuantityChange(item, item.quantity + 1)}
                    className="h-10 w-10 rounded-lg border disabled:opacity-50"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => handleRemove(item)}
                    className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!isEmpty ? (
        <div className="rounded-2xl border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Total estimado global</p>
            <p className="text-2xl font-bold">Bs {total}</p>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Puedes tener varios carritos activos, uno por cada cocinero.
          </p>
        </div>
      ) : null}
    </section>
  )
}

function recalculateSummary(payload) {
  const carts = payload.carts || []
  const items_count = carts.reduce((total, cart) => total + Number(cart.items_count || 0), 0)
  const subtotal = carts.reduce((total, cart) => total + Number(cart.subtotal || 0), 0)
  return {
    ...payload,
    summary: {
      ...(payload.summary || {}),
      carts_count: carts.length,
      items_count,
      subtotal,
      currency: 'BOB',
    },
  }
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CheckoutDeliveryMap from '../components/CheckoutDeliveryMap'
import { fetchCart } from '../services/cart_service'
import {
  confirmCheckout,
  previewCheckout,
  previewCheckoutRoute,
} from '../services/checkout_service'

const emptyAddress = {
  label: '',
  contact_name: '',
  contact_phone: '',
  line_1: '',
  reference: '',
  latitude: '',
  longitude: '',
}

export default function ClientCheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cartId = searchParams.get('cart_id') || ''
  const [cart, setCart] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [locating, setLocating] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routePreview, setRoutePreview] = useState(null)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState({
    fulfillment_type: 'pickup',
    payment_method: 'cash',
    notes: '',
    address: emptyAddress,
  })

  useEffect(() => {
    void loadCartAndPreview()
  }, [cartId])

  useEffect(() => {
    if (form.fulfillment_type !== 'delivery') return
    if (form.address.latitude !== '' && form.address.longitude !== '') return
    void useCurrentLocation({ silent: true })
  }, [form.fulfillment_type, cartId])

  useEffect(() => {
    if (form.fulfillment_type !== 'delivery') {
      setRoutePreview(null)
      return
    }
    if (!cartId) return
    if (form.address.latitude === '' || form.address.longitude === '') return
    void loadRoutePreview()
  }, [cartId, form.fulfillment_type, form.address.latitude, form.address.longitude])

  async function loadCartAndPreview() {
    setLoading(true)
    setMessage('')
    try {
      const cartData = await fetchCart()
      const targetCart =
        (cartData.carts || []).find((entry) => entry.id === cartId) || null
      setCart(targetCart)
      if (targetCart) {
        const initialPreview = await previewCheckout(buildPayload(targetCart.id, form))
        setPreview(initialPreview)
      }
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo cargar el checkout.')
    } finally {
      setLoading(false)
    }
  }

  function buildPayload(currentCartId, currentForm) {
    const payload = {
      cart_id: currentCartId,
      fulfillment_type: currentForm.fulfillment_type,
      payment_method: currentForm.payment_method,
      notes: currentForm.notes,
    }
    if (currentForm.fulfillment_type === 'delivery') {
      payload.address = {
        ...currentForm.address,
        latitude:
          currentForm.address.latitude === ''
            ? null
            : Number(currentForm.address.latitude),
        longitude:
          currentForm.address.longitude === ''
            ? null
            : Number(currentForm.address.longitude),
      }
    }
    return payload
  }

  function chefLocation() {
    const location = cart?.chef?.location || {}
    const latitude = Number(location.latitude)
    const longitude = Number(location.longitude)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude }
    }
    return { latitude: -17.7833, longitude: -63.1821 }
  }

  function customerLocation() {
    const latitude = Number(form.address.latitude)
    const longitude = Number(form.address.longitude)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude }
    }
    const chef = chefLocation()
    return {
      latitude: Number((chef.latitude - 0.0035).toFixed(6)),
      longitude: Number((chef.longitude + 0.0035).toFixed(6)),
    }
  }

  function handleMapLocationChange(point) {
    setForm((current) => ({
      ...current,
      address: {
        ...current.address,
        latitude: String(point.latitude),
        longitude: String(point.longitude),
      },
    }))
  }

  async function useCurrentLocation({ silent = false } = {}) {
    if (!navigator.geolocation) {
      if (!silent) {
        setMessage('El navegador no permite obtener la ubicacion actual.')
      }
      return
    }
    setLocating(true)
    setMessage('')
    await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleMapLocationChange({
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
          })
          resolve()
        },
        () => {
          if (!silent) {
            setMessage('No se pudo obtener la ubicacion actual.')
          }
          resolve()
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    })
    setLocating(false)
  }

  async function refreshPreview() {
    if (!cartId) return
    setPreviewLoading(true)
    setMessage('')
    try {
      const data = await previewCheckout(buildPayload(cartId, form))
      setPreview(data)
    } catch (error) {
      setPreview(null)
      setMessage(
        error?.response?.data?.detail ||
          'No se pudo actualizar el resumen del checkout.',
      )
    } finally {
      setPreviewLoading(false)
    }
  }

  async function loadRoutePreview() {
    if (!cartId) return
    const latitude = Number(form.address.latitude)
    const longitude = Number(form.address.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
    setRouteLoading(true)
    try {
      const data = await previewCheckoutRoute({
        cart_id: cartId,
        latitude,
        longitude,
      })
      setRoutePreview(data)
    } catch {
      setRoutePreview(null)
    } finally {
      setRouteLoading(false)
    }
  }

  async function handleConfirm() {
    if (!cartId) return
    setConfirming(true)
    setMessage('')
    try {
      const data = await confirmCheckout({
        ...buildPayload(cartId, form),
        expected_total: preview?.pricing?.total ?? null,
        success_redirect_to: successRedirectForPaymentMethod(form.payment_method),
        cancel_redirect_to: cancelRedirectForPaymentMethod(form.payment_method),
      })
      if (
        ['qr_simulado', 'bitcoin_coingate', 'stripe_test'].includes(data.payment?.method) &&
        data.payment?.payment_url
      ) {
        if (['bitcoin_coingate', 'stripe_test'].includes(data.payment.method)) {
          window.location.assign(data.payment.payment_url)
          return
        }
        navigate(data.payment.payment_url)
        return
      }
      setSuccess(data)
      setPreview(null)
      setCart(null)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo confirmar el pedido.')
    } finally {
      setConfirming(false)
    }
  }

  const total = useMemo(
    () => Number(preview?.pricing?.total || 0).toFixed(2),
    [preview?.pricing?.total],
  )

  if (loading) {
    return (
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>
        Cargando checkout...
      </div>
    )
  }

  if (success) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Pedido creado</h1>
        <div
          className="space-y-2 rounded-2xl border p-5"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        >
          <p>
            Pedido: <span className="font-mono">{success.order_id}</span>
          </p>
          <p>Estado: {success.status}</p>
          <p>
            Pago: {success.payment?.method} / {success.payment?.status}
          </p>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/client/cart')}
              className="rounded-lg border px-4 py-2"
              style={{ borderColor: 'var(--line)' }}
            >
              Volver al carrito
            </button>
            <button
              type="button"
              onClick={() => navigate('/client/orders')}
              className="rounded-lg px-4 py-2 text-white"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              Ir a mis pedidos
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (!cartId || !cart) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <div
          className="space-y-3 rounded-2xl border p-5"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        >
          <p>No se encontro un carrito activo para checkout.</p>
          <button
            type="button"
            onClick={() => navigate('/client/cart')}
            className="rounded-lg px-4 py-2 text-white"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
          >
            Volver al carrito
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p style={{ color: 'var(--muted)' }}>
            Confirma modalidad, direccion y resumen final antes de crear el pedido.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/client/cart')}
          className="rounded-lg border px-3 py-2"
          style={{ borderColor: 'var(--line)' }}
        >
          Volver al carrito
        </button>
      </div>

      {message ? (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: 'var(--line)' }}
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <section
          className="space-y-4 rounded-2xl border p-4"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        >
          <div>
            <h2 className="text-xl font-semibold">Entrega</h2>
            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, fulfillment_type: 'pickup' }))
                }
                className="rounded-lg border px-4 py-2"
                style={{
                  borderColor: 'var(--line)',
                  backgroundColor:
                    form.fulfillment_type === 'pickup'
                      ? 'rgba(124,58,237,.12)'
                      : 'transparent',
                }}
              >
                Retiro
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, fulfillment_type: 'delivery' }))
                }
                className="rounded-lg border px-4 py-2"
                style={{
                  borderColor: 'var(--line)',
                  backgroundColor:
                    form.fulfillment_type === 'delivery'
                      ? 'rgba(124,58,237,.12)'
                      : 'transparent',
                }}
              >
                Delivery
              </button>
            </div>
          </div>

          {form.fulfillment_type === 'delivery' ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Etiqueta"
                  value={form.address.label}
                  onChange={(value) => updateAddress(setForm, 'label', value)}
                />
                <Field
                  label="Contacto"
                  value={form.address.contact_name}
                  onChange={(value) =>
                    updateAddress(setForm, 'contact_name', value)
                  }
                />
                <Field
                  label="Telefono"
                  value={form.address.contact_phone}
                  onChange={(value) =>
                    updateAddress(setForm, 'contact_phone', value)
                  }
                />
                <Field
                  label="Direccion"
                  value={form.address.line_1}
                  onChange={(value) => updateAddress(setForm, 'line_1', value)}
                />
                <Field
                  label="Referencia"
                  value={form.address.reference}
                  onChange={(value) =>
                    updateAddress(setForm, 'reference', value)
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Mapa de entrega</p>
                <CheckoutDeliveryMap
                  chefLocation={routePreview?.chef ? {
                    latitude: routePreview.chef.lat,
                    longitude: routePreview.chef.lng,
                  } : chefLocation()}
                  customerLocation={customerLocation()}
                  routePoints={routePreview?.route?.polyline || []}
                  onChange={handleMapLocationChange}
                  onUseCurrentLocation={() => useCurrentLocation({ silent: false })}
                  locating={locating}
                  routeLoading={routeLoading}
                  routeProvider={routePreview?.navigation?.provider || ''}
                />
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: 'var(--line)' }}
            >
              Retiraras el pedido directamente en el punto del cocinero.
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold">Pago</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, payment_method: 'cash' }))
                }
                className="rounded-xl border px-4 py-3 text-left"
                style={{
                  borderColor: 'var(--line)',
                  backgroundColor:
                    form.payment_method === 'cash'
                      ? 'rgba(124,58,237,.12)'
                      : 'transparent',
                }}
              >
                <strong>Efectivo</strong>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Cobro manual al retirar o entregar.
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    payment_method: 'qr_simulado',
                  }))
                }
                className="rounded-xl border px-4 py-3 text-left"
                style={{
                  borderColor: 'var(--line)',
                  backgroundColor:
                    form.payment_method === 'qr_simulado'
                      ? 'rgba(124,58,237,.12)'
                      : 'transparent',
                }}
              >
                <strong>QR simulado</strong>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Abre la pantalla bancaria simulada y valida en 3 segundos.
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    payment_method: 'bitcoin_coingate',
                  }))
                }
                className="rounded-xl border px-4 py-3 text-left"
                style={{
                  borderColor: 'var(--line)',
                  backgroundColor:
                    form.payment_method === 'bitcoin_coingate'
                      ? 'rgba(124,58,237,.12)'
                      : 'transparent',
                }}
              >
                <strong>Bitcoin CoinGate</strong>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Redirige al checkout externo de CoinGate y valida el retorno automaticamente.
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    payment_method: 'stripe_test',
                  }))
                }
                className="rounded-xl border px-4 py-3 text-left"
                style={{
                  borderColor: 'var(--line)',
                  backgroundColor:
                    form.payment_method === 'stripe_test'
                      ? 'rgba(124,58,237,.12)'
                      : 'transparent',
                }}
              >
                <strong>Stripe test</strong>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Abre Stripe Checkout en modo prueba y confirma el retorno automaticamente.
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm">Notas</label>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              className="min-h-24 w-full rounded-xl border px-3 py-2"
              style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={refreshPreview}
              disabled={previewLoading}
              className="rounded-lg border px-4 py-2 disabled:opacity-50"
              style={{ borderColor: 'var(--line)' }}
            >
              {previewLoading ? 'Actualizando...' : 'Actualizar resumen'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || !preview}
              className="rounded-lg px-4 py-2 text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              {confirming ? 'Confirmando...' : 'Crear pedido'}
            </button>
          </div>
        </section>

        <section
          className="space-y-4 rounded-2xl border p-4"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        >
          <div>
            <h2 className="text-xl font-semibold">Resumen</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Cocinero: {cart.chef?.name || 'Cocinero HomeChef'}
            </p>
          </div>

          {(preview?.items || cart.items || []).map((item) => (
            <div
              key={item.dish_id || item.id}
              className="rounded-xl border p-3"
              style={{ borderColor: 'var(--line)' }}
            >
              <p className="font-semibold">{item.dish_name || item.name}</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {item.quantity} x Bs {Number(item.unit_price || 0).toFixed(2)}
              </p>
              <p className="text-sm">
                Subtotal Bs {Number(item.subtotal || 0).toFixed(2)}
              </p>
            </div>
          ))}

          {preview ? (
            <div
              className="space-y-2 rounded-xl border p-4"
              style={{ borderColor: 'var(--line)' }}
            >
              <Row
                label="Subtotal"
                value={`Bs ${Number(preview.pricing?.subtotal || 0).toFixed(2)}`}
              />
              <Row
                label="Delivery"
                value={`Bs ${Number(preview.pricing?.delivery_fee || 0).toFixed(2)}`}
              />
              <Row
                label="Servicio"
                value={`Bs ${Number(preview.pricing?.service_fee || 0).toFixed(2)}`}
              />
              <Row
                label="Descuento"
                value={`Bs ${Number(preview.pricing?.discount_total || 0).toFixed(2)}`}
              />
              <div
                className="flex items-center justify-between border-t pt-2"
                style={{ borderColor: 'var(--line)' }}
              >
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">Bs {total}</span>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: 'var(--line)' }}
            >
              Actualiza el resumen para validar stock, modalidad y costo final.
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border px-3 py-2"
        style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
      />
    </label>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function updateAddress(setForm, field, value) {
  setForm((current) => ({
    ...current,
    address: {
      ...current.address,
      [field]: value,
    },
  }))
}

function successRedirectForPaymentMethod(paymentMethod) {
  if (paymentMethod === 'stripe_test') {
    return import.meta.env.VITE_ORDER_STRIPE_SUCCESS_REDIRECT_TO || ''
  }
  if (paymentMethod === 'bitcoin_coingate') {
    return import.meta.env.VITE_ORDER_COINGATE_SUCCESS_REDIRECT_TO || ''
  }
  return ''
}

function cancelRedirectForPaymentMethod(paymentMethod) {
  if (paymentMethod === 'stripe_test') {
    return import.meta.env.VITE_ORDER_STRIPE_CANCEL_REDIRECT_TO || ''
  }
  if (paymentMethod === 'bitcoin_coingate') {
    return import.meta.env.VITE_ORDER_COINGATE_CANCEL_REDIRECT_TO || ''
  }
  return ''
}

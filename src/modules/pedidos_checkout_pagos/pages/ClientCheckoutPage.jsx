import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LastLoadedNotice from '../../../shared/components/LastLoadedNotice'
import { extractScreenSnapshotMeta, readScreenSnapshot } from '../../../shared/services/screen_cache'
import CheckoutDeliveryMap from '../components/CheckoutDeliveryMap'
import { fetchCart } from '../services/cart_service'
import {
  confirmCheckout,
  previewCheckout,
  previewCheckoutRoute,
} from '../services/checkout_service'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import { useAuthSession } from '../../gestion_usuarios_acceso_suscripcion/services/auth_session'
import { getMetadata, setMetadata } from '../../../shared/services/offline_db'

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
  const [previewStale, setPreviewStale] = useState(false)
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [locating, setLocating] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routePreview, setRoutePreview] = useState(null)
  const [message, setMessage] = useState('')
  const [offlineMeta, setOfflineMeta] = useState(null)
  const [success, setSuccess] = useState(null)
  const [validationError, setValidationError] = useState('')
  
  const { isOnline } = useConnectivity()
  const user = useAuthSession((state) => state.user)
  const userId = user?.id || 'guest'
  const ADDRESSES_CACHE_KEY = useMemo(() => `client_addresses:${userId}`, [userId])
  const [addresses, setAddresses] = useState([])
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState('')
  const [editingAddressId, setEditingAddressId] = useState('')
  const [addrForm, setAddrForm] = useState(emptyAddress)
  const [form, setForm] = useState({
    fulfillment_type: 'pickup',
    payment_method: 'cash',
    pickup_slot: '',
    notes: '',
    address: emptyAddress,
  })

  useEffect(() => {
    void loadCartAndPreview()
  }, [cartId, isOnline])

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

  useEffect(() => {
    if (form.fulfillment_type !== 'pickup') return
    const slots = preview?.pickup_policy?.available_slots || []
    if (!slots.length) return
    const stillValid = slots.some((slot) => slot.id === form.pickup_slot)
    if (stillValid) return
    setForm((current) => ({ ...current, pickup_slot: slots[0].id }))
  }, [form.fulfillment_type, form.pickup_slot, preview?.pickup_policy])

  async function loadCartAndPreview() {
    setLoading(true)
    setMessage('')
    setValidationError('')
    try {
      const cachedCart = await readScreenSnapshot('mod5.cart')
      const cartData = await fetchCart()
      const targetCart =
        (cartData.carts || []).find((entry) => entry.id === cartId) || null
      setCart(targetCart)

      if (!isOnline && (!cartData || !cartData.carts || cartData.carts.length === 0)) {
        setMessage('No hay datos offline disponibles para esta pantalla. Conéctate y sincroniza cuando tengas internet.')
      } else if (!cartData?.__offline && cachedCart && (cachedCart.__offline || cachedCart.carts?.some(c => c.items?.some(i => i.id?.startsWith('temp-'))))) {
        const changed = detectCartChanges(cachedCart, cartData)
        if (changed) {
          setValidationError('Algunos productos cambiaron desde tu última sincronización. Revisa tu carrito antes de continuar.')
          setCart(null)
          setPreview(null)
          return
        }
      }

      if (targetCart) {
        const initialPreview = await previewCheckout(buildPayload(targetCart.id, form))
        setPreview(initialPreview)
        setPreviewStale(false)
        setOfflineMeta(extractScreenSnapshotMeta(cartData, initialPreview))
      } else {
        setOfflineMeta(extractScreenSnapshotMeta(cartData))
      }
    } catch (error) {
      setOfflineMeta(null)
      if (!isOnline) {
        setMessage('No hay datos offline disponibles para esta pantalla. Conéctate y sincroniza cuando tengas internet.')
      } else {
        setMessage(error?.response?.data?.detail || 'No se pudo cargar el checkout.')
      }
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
    if (currentForm.fulfillment_type === 'pickup' && currentForm.pickup_slot) {
      payload.pickup_slot = currentForm.pickup_slot
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
    setPreviewStale(true)
    setForm((current) => ({
      ...current,
      address: {
        ...current.address,
        latitude: String(point.latitude),
        longitude: String(point.longitude),
      },
    }))
    setAddrForm((current) => ({
      ...current,
      latitude: String(point.latitude),
      longitude: String(point.longitude),
    }))
  }

  useEffect(() => {
    void loadLocalAddresses()
  }, [userId])

  async function loadLocalAddresses() {
    try {
      const data = await getMetadata(ADDRESSES_CACHE_KEY)
      const list = Array.isArray(data) ? data : []
      setAddresses(list)
      const principal = list.find((addr) => addr.is_principal)
      if (principal) {
        setSelectedSavedAddressId(principal.id)
        setForm((current) => ({
          ...current,
          address: {
            ...emptyAddress,
            ...principal
          }
        }))
        setPreviewStale(true)
      }
    } catch (err) {
      console.error('Error loading addresses:', err)
    }
  }

  async function handleSaveAddress() {
    if (!addrForm.line_1 || !addrForm.label) {
      setMessage('El nombre de dirección y la calle son obligatorios.')
      return
    }
    const list = [...addresses]
    const nextAddr = {
      ...addrForm,
      id: editingAddressId || `addr-${crypto.randomUUID()}`,
      latitude: addrForm.latitude || form.address.latitude || '',
      longitude: addrForm.longitude || form.address.longitude || ''
    }

    if (editingAddressId) {
      const idx = list.findIndex(a => a.id === editingAddressId)
      if (idx >= 0) list[idx] = nextAddr
    } else {
      if (list.length === 0) {
        nextAddr.is_principal = true
      }
      list.push(nextAddr)
    }

    await setMetadata(ADDRESSES_CACHE_KEY, list)
    setAddresses(list)
    handleSelectSavedAddress(nextAddr)
    resetAddrForm()
  }

  async function handleDeleteAddress(id) {
    const list = addresses.filter(a => a.id !== id)
    if (addresses.find(a => a.id === id)?.is_principal && list.length > 0) {
      list[0].is_principal = true
    }
    await setMetadata(ADDRESSES_CACHE_KEY, list)
    setAddresses(list)
    if (selectedSavedAddressId === id) {
      setSelectedSavedAddressId('')
      setForm((current) => ({ ...current, address: emptyAddress }))
    }
  }

  async function handleSetPrincipalAddress(id) {
    const list = addresses.map(a => ({
      ...a,
      is_principal: a.id === id
    }))
    await setMetadata(ADDRESSES_CACHE_KEY, list)
    setAddresses(list)
  }

  function handleSelectSavedAddress(addr) {
    setSelectedSavedAddressId(addr.id)
    setForm((current) => ({
      ...current,
      address: {
        ...emptyAddress,
        ...addr
      }
    }))
    setPreviewStale(true)
  }

  function handleStartEditAddress(addr) {
    setEditingAddressId(addr.id)
    setAddrForm(addr)
  }

  function resetAddrForm() {
    setEditingAddressId('')
    setAddrForm(emptyAddress)
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

  async function refreshPreview(nextPayload = null) {
    if (!cartId) return null
    setPreviewLoading(true)
    setMessage('')
    try {
      const data = await previewCheckout(nextPayload || buildPayload(cartId, form))
      setPreview(data)
      setPreviewStale(false)
      setOfflineMeta(extractScreenSnapshotMeta(data))
      return data
    } catch (error) {
      setPreview(null)
      setOfflineMeta(null)
      setMessage(
        error?.response?.data?.detail ||
          'No se pudo actualizar el resumen del checkout.',
      )
      return null
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
      if (data?.__offline) {
        setOfflineMeta(extractScreenSnapshotMeta(data))
      }
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
      const checkoutPayload = buildPayload(cartId, form)
      const freshPreview = await refreshPreview(checkoutPayload)
      if (!freshPreview) return
      const data = await confirmCheckout({
        ...checkoutPayload,
        expected_total: freshPreview?.pricing?.total ?? null,
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
      {offlineMeta ? <LastLoadedNotice cachedAt={offlineMeta.cachedAt} /> : null}

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
                onClick={() => {
                  setForm((current) => ({ ...current, fulfillment_type: 'pickup' }))
                  setPreviewStale(true)
                }}
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
                onClick={() => {
                  setForm((current) => ({ ...current, fulfillment_type: 'delivery' }))
                  setPreviewStale(true)
                }}
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
              {/* Gestor de Direcciones Locales */}
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                <h3 className="text-base font-bold">Mis direcciones guardadas</h3>
                {addresses.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>No tienes direcciones guardadas localmente.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectSavedAddress(addr)}
                        className="cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition hover:border-brand"
                        style={{
                          borderColor: selectedSavedAddressId === addr.id ? 'var(--brand)' : 'var(--line)',
                          backgroundColor: 'var(--panel)',
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="font-bold text-sm">{addr.label || 'Dirección'}</span>
                            {addr.is_principal && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full text-white bg-indigo-600 font-bold">
                                Principal
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                            {addr.line_1}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            {addr.contact_name} · {addr.contact_phone}
                          </p>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--line)' }}>
                          {!addr.is_principal && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSetPrincipalAddress(addr.id)
                              }}
                              className="text-xs font-semibold text-indigo-500 hover:underline"
                            >
                              Principal
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEditAddress(addr)
                            }}
                            className="text-xs font-semibold text-slate-500 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteAddress(addr.id)
                            }}
                            className="text-xs font-semibold text-red-500 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3" style={{ borderColor: 'var(--line)' }}>
                  <h4 className="font-bold text-xs mb-2">
                    {editingAddressId ? 'Editar dirección local' : 'Guardar nueva dirección local'}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field
                      label="Etiqueta (ej: Casa, Trabajo)"
                      value={addrForm.label}
                      onChange={(val) => setAddrForm(c => ({ ...c, label: val }))}
                    />
                    <Field
                      label="Nombre de contacto"
                      value={addrForm.contact_name}
                      onChange={(val) => setAddrForm(c => ({ ...c, contact_name: val }))}
                    />
                    <Field
                      label="Teléfono de contacto"
                      value={addrForm.contact_phone}
                      onChange={(val) => setAddrForm(c => ({ ...c, contact_phone: val }))}
                    />
                    <Field
                      label="Dirección (Calle, Nro)"
                      value={addrForm.line_1}
                      onChange={(val) => setAddrForm(c => ({ ...c, line_1: val }))}
                    />
                    <Field
                      label="Referencia"
                      value={addrForm.reference}
                      onChange={(val) => setAddrForm(c => ({ ...c, reference: val }))}
                    />
                  </div>
                  <div className="flex gap-2 mt-3 justify-end">
                    {editingAddressId && (
                      <button
                        type="button"
                        onClick={resetAddrForm}
                        className="px-3 py-1.5 border rounded-lg text-xs"
                        style={{ borderColor: 'var(--line)' }}
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      className="px-4 py-1.5 rounded-lg text-xs text-white font-bold"
                      style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                    >
                      {editingAddressId ? 'Guardar cambios' : 'Guardar dirección'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Etiqueta"
                  value={form.address.label}
                  onChange={(value) => updateAddress(setForm, 'label', value)}
                  onDirty={() => setPreviewStale(true)}
                />
                <Field
                  label="Contacto"
                  value={form.address.contact_name}
                  onChange={(value) =>
                    updateAddress(setForm, 'contact_name', value)
                  }
                  onDirty={() => setPreviewStale(true)}
                />
                <Field
                  label="Telefono"
                  value={form.address.contact_phone}
                  onChange={(value) =>
                    updateAddress(setForm, 'contact_phone', value)
                  }
                  onDirty={() => setPreviewStale(true)}
                />
                <Field
                  label="Direccion"
                  value={form.address.line_1}
                  onChange={(value) => updateAddress(setForm, 'line_1', value)}
                  onDirty={() => setPreviewStale(true)}
                />
                <Field
                  label="Referencia"
                  value={form.address.reference}
                  onChange={(value) =>
                    updateAddress(setForm, 'reference', value)
                  }
                  onDirty={() => setPreviewStale(true)}
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
            <div className="space-y-3">
              <div
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: 'var(--line)' }}
              >
                Retiraras el pedido directamente en el punto del cocinero.
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Horario de retiro</span>
                <select
                  value={form.pickup_slot}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, pickup_slot: event.target.value }))
                    setPreviewStale(true)
                  }}
                  className="w-full rounded-xl border px-3 py-2"
                  style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                >
                  {(preview?.pickup_policy?.available_slots || []).map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </label>
              {preview?.pickup_policy ? (
                <div
                  className="rounded-xl border p-3 text-sm space-y-1"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <p><strong>Politica de retiro:</strong> {preview.pickup_policy.schedule_summary || 'Horario operativo del cocinero.'}</p>
                  <p>
                    <strong>Tolerancia:</strong> {preview.pickup_policy.grace_minutes} min.
                    <strong> Retencion:</strong> {preview.pickup_policy.retention_minutes} min adicionales.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold">Pago</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setForm((current) => ({ ...current, payment_method: 'cash' }))
                  setPreviewStale(true)
                }}
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
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    payment_method: 'qr_simulado',
                  }))
                  setPreviewStale(true)
                }}
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
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    payment_method: 'bitcoin_coingate',
                  }))
                  setPreviewStale(true)
                }}
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
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    payment_method: 'stripe_test',
                  }))
                  setPreviewStale(true)
                }}
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
              onChange={(event) => {
                setForm((current) => ({ ...current, notes: event.target.value }))
                setPreviewStale(true)
              }}
              className="min-h-24 w-full rounded-xl border px-3 py-2"
              style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
            />
          </div>

          {validationError && (
            <div className="rounded-xl border p-4 text-sm font-semibold mb-2" style={{ borderColor: 'rgba(239, 68, 68, 0.25)', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#f87171' }}>
              {validationError}
            </div>
          )}

          {!isOnline && (
            <div className="rounded-xl border p-4 text-sm font-semibold mb-2" style={{ borderColor: 'rgba(239, 68, 68, 0.25)', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#f87171' }}>
              El pago requiere conexión. Tu carrito se guardó localmente para continuar luego.
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={refreshPreview}
              disabled={previewLoading || !isOnline || !!validationError}
              className="rounded-lg border px-4 py-2 disabled:opacity-50"
              style={{ borderColor: 'var(--line)' }}
            >
              {previewLoading ? 'Actualizando...' : 'Actualizar resumen'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || !preview || !isOnline || !!validationError}
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
            <div className="space-y-2 rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>
              {previewStale ? (
                <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                  El resumen quedo desactualizado por cambios recientes. Al confirmar se recalculara automaticamente.
                </div>
              ) : null}
              {preview.pickup_policy?.selected_slot && form.fulfillment_type === 'pickup' ? (
                <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                  <strong>Retiro seleccionado:</strong> {preview.pickup_policy.selected_slot.label}
                </div>
              ) : null}
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

function Field({ label, value, onChange, onDirty }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm">{label}</span>
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          onDirty?.()
        }}
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

function detectCartChanges(cached, fresh) {
  if (!cached || !fresh) return false
  const cachedCarts = cached.carts || []
  const freshCarts = fresh.carts || []

  for (const cCart of cachedCarts) {
    const fCart = freshCarts.find(fc => String(fc.chef?.id) === String(cCart.chef?.id))
    for (const cItem of (cCart.items || [])) {
      const fItem = fCart?.items?.find(fi => String(fi.dish_id) === String(cItem.dish_id))
      if (!fItem) return true
      if (Number(fItem.unit_price) !== Number(cItem.unit_price)) return true
      if (fItem.available_portions < fItem.quantity || fItem.available_portions < cItem.quantity) return true
    }
  }
  return false
}

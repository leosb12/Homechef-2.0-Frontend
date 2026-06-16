import { API_URL } from '../../../shared/services/api'

export function connectOrderTrackingSocket(orderId, { onSnapshot, onUnavailable, onOpen, onClose, onError } = {}) {
  const token = window.localStorage.getItem('homechef_access_token')
  if (!orderId || !token) return null

  const url = buildOrderTrackingWsUrl(orderId, token)
  const socket = new window.WebSocket(url)

  socket.addEventListener('open', () => onOpen?.())
  socket.addEventListener('close', (event) => onClose?.(event))
  socket.addEventListener('error', (event) => onError?.(event))
  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data)
      if (payload?.type === 'order_tracking.snapshot' && payload?.tracking) {
        onSnapshot?.(payload.tracking)
        return
      }
      if (payload?.type === 'order_tracking.unavailable') {
        onUnavailable?.(payload)
      }
    } catch {
      onError?.(new Error('Mensaje de websocket invalido.'))
    }
  })

  return socket
}

function buildOrderTrackingWsUrl(orderId, token) {
  const base = API_URL.replace(/\/api\/v1\/?$/, '')
  const parsed = new URL(base)
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
  parsed.pathname = `/ws/orders/tracking/${orderId}/`
  parsed.searchParams.set('token', token)
  return parsed.toString()
}

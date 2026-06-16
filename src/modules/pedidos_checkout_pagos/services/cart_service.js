import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'
import { readScreenSnapshot, readWithScreenCache, saveScreenSnapshot } from '../../../shared/services/screen_cache'

const CART_PATH = '/orders/cart/'
const CART_CACHE_KEY = 'mod5.cart'

export async function fetchCart() {
  return readWithScreenCache(CART_CACHE_KEY, () => cachedGet(CART_PATH))
}

export async function addCartItem({ dishId, quantity, fulfillmentType = '' }) {
  const { data } = await api.post('/orders/cart/items/', {
    dish_id: dishId,
    quantity,
    fulfillment_type: fulfillmentType || undefined,
  })
  await mergeCartSnapshot(data.cart)
  invalidateApiCache('/orders/cart/')
  return data
}

export async function updateCartItem({ itemId, quantity, fulfillmentType = '' }) {
  const { data } = await api.put(`/orders/cart/items/${itemId}/`, {
    quantity,
    fulfillment_type: fulfillmentType || undefined,
  })
  await mergeCartSnapshot(data.cart)
  invalidateApiCache('/orders/cart/')
  return data
}

export async function removeCartItem(itemId) {
  const { data } = await api.delete(`/orders/cart/items/${itemId}/`)
  await mergeCartSnapshot(data.cart || null, itemId)
  invalidateApiCache('/orders/cart/')
  return data
}

async function mergeCartSnapshot(nextCart, removedItemId = '') {
  const snapshot = await readScreenSnapshot(CART_CACHE_KEY)
  if (!snapshot || typeof snapshot !== 'object') return

  const carts = Array.isArray(snapshot.carts) ? [...snapshot.carts] : []
  if (nextCart) {
    const index = carts.findIndex((cart) => cart.id === nextCart.id)
    if (index >= 0) carts[index] = nextCart
    else carts.push(nextCart)
  } else if (removedItemId) {
    for (let index = 0; index < carts.length; index += 1) {
      const cart = carts[index]
      const items = Array.isArray(cart?.items) ? cart.items.filter((item) => item.id !== removedItemId) : []
      carts[index] = {
        ...cart,
        items,
        items_count: items.reduce((count, item) => count + Number(item.quantity || 0), 0),
        subtotal: items.reduce((total, item) => total + Number(item.subtotal || 0), 0),
      }
    }
  }

  await saveScreenSnapshot(CART_CACHE_KEY, {
    ...snapshot,
    carts,
    summary: {
      ...(snapshot.summary || {}),
      carts_count: carts.length,
      items_count: carts.reduce((count, cart) => count + Number(cart.items_count || 0), 0),
      subtotal: carts.reduce((total, cart) => total + Number(cart.subtotal || 0), 0),
      currency: snapshot.summary?.currency || 'BOB',
    },
  })
}

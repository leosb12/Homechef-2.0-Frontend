import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'

const CART_PATH = '/orders/cart/'

export async function fetchCart() {
  return cachedGet(CART_PATH)
}

export async function addCartItem({ dishId, quantity, fulfillmentType = '' }) {
  const { data } = await api.post('/orders/cart/items/', {
    dish_id: dishId,
    quantity,
    fulfillment_type: fulfillmentType || undefined,
  })
  invalidateApiCache('/orders/cart/')
  return data
}

export async function updateCartItem({ itemId, quantity, fulfillmentType = '' }) {
  const { data } = await api.put(`/orders/cart/items/${itemId}/`, {
    quantity,
    fulfillment_type: fulfillmentType || undefined,
  })
  invalidateApiCache('/orders/cart/')
  return data
}

export async function removeCartItem(itemId) {
  const { data } = await api.delete(`/orders/cart/items/${itemId}/`)
  invalidateApiCache('/orders/cart/')
  return data
}

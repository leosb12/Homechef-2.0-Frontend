import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'
import { readScreenSnapshot, readWithScreenCache, saveScreenSnapshot } from '../../../shared/services/screen_cache'
import { mutateOfflineFirst } from '../../../shared/services/offline_helpers'

const CART_PATH = '/orders/cart/'
const CART_CACHE_KEY = 'mod5.cart'

export async function fetchCart() {
  return readWithScreenCache(CART_CACHE_KEY, () => cachedGet(CART_PATH))
}

export async function addCartItem({ dishId, quantity, fulfillmentType = '' }) {
  const localId = `temp-cart-item-${crypto.randomUUID()}`
  return mutateOfflineFirst(
    'cart',
    'ADD_ITEM',
    { dish_id: dishId, quantity, fulfillment_type: fulfillmentType },
    { local_id: localId, server_id: null, endpoint: '/orders/cart/items/', method: 'POST' },
    async () => {
      const { data } = await api.post('/orders/cart/items/', {
        dish_id: dishId,
        quantity,
        fulfillment_type: fulfillmentType || undefined,
      })
      await mergeCartSnapshot(data.cart)
      invalidateApiCache('/orders/cart/')
      return data
    },
    async () => {
      // Find the dish name & image url from details cache if we can
      const dishDetails = await readScreenSnapshot(`marketplace.dish.${dishId}`)
      
      const dishName = dishDetails?.name || 'Plato'
      const dishImage = dishDetails?.image_url || ''
      const dishPrice = dishDetails?.price || 0
      const chefId = dishDetails?.chef_id || dishDetails?.chef?.id || ''
      const chefName = dishDetails?.chef_name || dishDetails?.chef?.name || 'Cocinero HomeChef'
      const chefLocation = dishDetails?.chef_location || dishDetails?.chef?.location || { address: '' }

      const snapshot = await readScreenSnapshot(CART_CACHE_KEY) || { carts: [], summary: { subtotal: 0, items_count: 0 } }
      const carts = Array.isArray(snapshot.carts) ? [...snapshot.carts] : []
      
      let chefCart = carts.find(c => String(c.chef?.id) === String(chefId))
      if (!chefCart) {
        chefCart = {
          id: `temp-cart-${crypto.randomUUID()}`,
          chef: { id: chefId, name: chefName, location: chefLocation },
          currency: 'BOB',
          status: 'ACTIVE',
          items_count: 0,
          subtotal: 0,
          items: [],
          updated_at: new Date().toISOString()
        }
        carts.push(chefCart)
      }
      
      let item = chefCart.items.find(i => String(i.dish_id) === String(dishId))
      if (item) {
        item.quantity += quantity
        item.subtotal = item.quantity * item.unit_price
      } else {
        item = {
          id: localId,
          cart_id: chefCart.id,
          dish_id: dishId,
          dish_name: dishName,
          dish_image_url: dishImage,
          chef_id: chefId,
          chef_name: chefName,
          chef_location: chefLocation,
          quantity,
          unit_price: dishPrice,
          subtotal: quantity * dishPrice,
          available_portions: dishDetails?.portions || 10
        }
        chefCart.items.push(item)
      }
      
      chefCart.items_count = chefCart.items.reduce((sum, i) => sum + i.quantity, 0)
      chefCart.subtotal = chefCart.items.reduce((sum, i) => sum + i.subtotal, 0)
      
      const summary = {
        carts_count: carts.length,
        items_count: carts.reduce((sum, c) => sum + c.items_count, 0),
        subtotal: carts.reduce((sum, c) => sum + c.subtotal, 0),
        currency: 'BOB'
      }
      
      await saveScreenSnapshot(CART_CACHE_KEY, { ...snapshot, carts, summary })
    }
  )
}

export async function updateCartItem({ itemId, quantity, fulfillmentType = '', dishId }) {
  return mutateOfflineFirst(
    'cart',
    'UPDATE_ITEM',
    { itemId, quantity, fulfillmentType, dishId },
    {
      local_id: itemId,
      server_id: itemId.startsWith('temp-') ? null : itemId,
      endpoint: `/orders/cart/items/${itemId}/`,
      method: 'PUT',
    },
    async () => {
      const { data } = await api.put(`/orders/cart/items/${itemId}/`, {
        quantity,
        fulfillment_type: fulfillmentType || undefined,
      })
      await mergeCartSnapshot(data.cart)
      invalidateApiCache('/orders/cart/')
      return data
    },
    async () => {
      const snapshot = await readScreenSnapshot(CART_CACHE_KEY)
      if (!snapshot) return
      
      const carts = Array.isArray(snapshot.carts) ? [...snapshot.carts] : []
      for (let i = 0; i < carts.length; i++) {
        const cart = { ...carts[i] }
        const itemIndex = cart.items?.findIndex(item => String(item.id) === String(itemId))
        if (itemIndex !== undefined && itemIndex >= 0) {
          const items = [...cart.items]
          const item = { ...items[itemIndex] }
          item.quantity = quantity
          item.subtotal = quantity * item.unit_price
          items[itemIndex] = item
          
          cart.items = items
          cart.items_count = items.reduce((sum, item) => sum + item.quantity, 0)
          cart.subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
          carts[i] = cart
          break
        }
      }
      
      const summary = {
        carts_count: carts.length,
        items_count: carts.reduce((sum, c) => sum + c.items_count, 0),
        subtotal: carts.reduce((sum, c) => sum + c.subtotal, 0),
        currency: 'BOB'
      }
      
      await saveScreenSnapshot(CART_CACHE_KEY, { ...snapshot, carts, summary })
    }
  )
}

export async function removeCartItem(itemId) {
  return mutateOfflineFirst(
    'cart',
    'REMOVE_ITEM',
    { itemId },
    {
      local_id: itemId,
      server_id: itemId.startsWith('temp-') ? null : itemId,
      endpoint: `/orders/cart/items/${itemId}/`,
      method: 'DELETE',
    },
    async () => {
      const { data } = await api.delete(`/orders/cart/items/${itemId}/`)
      await mergeCartSnapshot(data.cart || null, itemId)
      invalidateApiCache('/orders/cart/')
      return data
    },
    async () => {
      const snapshot = await readScreenSnapshot(CART_CACHE_KEY)
      if (!snapshot) return
      
      let carts = Array.isArray(snapshot.carts) ? [...snapshot.carts] : []
      carts = carts.map(cart => {
        const items = Array.isArray(cart.items) ? cart.items.filter(item => String(item.id) !== String(itemId)) : []
        return {
          ...cart,
          items,
          items_count: items.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: items.reduce((sum, item) => sum + item.subtotal, 0)
        }
      }).filter(cart => cart.items_count > 0)
      
      const summary = {
        carts_count: carts.length,
        items_count: carts.reduce((sum, c) => sum + c.items_count, 0),
        subtotal: carts.reduce((sum, c) => sum + c.subtotal, 0),
        currency: 'BOB'
      }
      
      await saveScreenSnapshot(CART_CACHE_KEY, { ...snapshot, carts, summary })
    }
  )
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

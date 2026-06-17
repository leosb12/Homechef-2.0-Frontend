import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientCartPage from '../ClientCartPage'

const navigateMock = vi.fn()
const fetchCartMock = vi.fn()
const updateCartItemMock = vi.fn()
const removeCartItemMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams(''), vi.fn()],
    useLocation: () => ({ state: null }),
  }
})

vi.mock('../../services/cart_service', () => ({
  fetchCart: (...args) => fetchCartMock(...args),
  updateCartItem: (...args) => updateCartItemMock(...args),
  removeCartItem: (...args) => removeCartItemMock(...args),
}))

describe('ClientCartPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    fetchCartMock.mockReset()
    updateCartItemMock.mockReset()
    removeCartItemMock.mockReset()
  })

  it('carga el carrito y permite aumentar cantidad', async () => {
    fetchCartMock.mockResolvedValue({
      carts: [
        {
          id: 'cart-1',
          chef: { name: 'Chef Demo', location: { address: 'Centro 123' } },
          items_count: 1,
          subtotal: 20,
          items: [
            {
              id: 'item-1',
              dish_name: 'Pique macho',
              unit_price: 20,
              subtotal: 20,
              quantity: 1,
              available_portions: 3,
              dish_image_url: '',
            },
          ],
        },
      ],
      summary: { subtotal: 20, items_count: 1 },
    })
    updateCartItemMock.mockResolvedValue({
      cart: {
        id: 'cart-1',
        chef: { name: 'Chef Demo' },
        items_count: 2,
        subtotal: 40,
        items: [
          {
            id: 'item-1',
            dish_name: 'Pique macho',
            unit_price: 20,
            subtotal: 40,
            quantity: 2,
            available_portions: 3,
            dish_image_url: '',
          },
        ],
      },
    })

    render(<ClientCartPage />)

    expect(await screen.findAllByText('Chef Demo')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /carrito abierto/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+' }))

    await waitFor(() => {
      expect(updateCartItemMock).toHaveBeenCalledWith({ itemId: 'item-1', quantity: 2 })
    })
    expect(await screen.findByText(/2 item\(s\)/i)).toBeInTheDocument()
    expect(screen.getByText('Bs 40.00')).toBeInTheDocument()
  })
})

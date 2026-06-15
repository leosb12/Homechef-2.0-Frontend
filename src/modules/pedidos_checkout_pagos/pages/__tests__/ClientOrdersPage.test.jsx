import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientOrdersPage from '../ClientOrdersPage'

const navigateMock = vi.fn()
const fetchMyOrdersMock = vi.fn()
const cancelMyOrderMock = vi.fn()
const repeatMyOrderMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../components/ReceiptActions', () => ({
  default: () => <div>Receipts</div>,
}))

vi.mock('../../services/order_service', () => ({
  fetchMyOrders: (...args) => fetchMyOrdersMock(...args),
  cancelMyOrder: (...args) => cancelMyOrderMock(...args),
  repeatMyOrder: (...args) => repeatMyOrderMock(...args),
}))

describe('ClientOrdersPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    fetchMyOrdersMock.mockReset()
    cancelMyOrderMock.mockReset()
    repeatMyOrderMock.mockReset()
  })

  it('repite pedido completo y navega directo al carrito resultante', async () => {
    fetchMyOrdersMock.mockResolvedValue({
      items: [
        {
          id: 'order-1',
          status: 'DELIVERED',
          fulfillment_type: 'delivery',
          payment_method: 'cash',
          total: 30,
          created_at: '2026-06-14T12:00:00Z',
          chef: { name: 'Chef Demo' },
          items: [{ id: 'item-1', dish_name: 'Silpancho', quantity: 1, unit_price: 30, subtotal: 30 }],
          payment: { status: 'CONFIRMED' },
          receipts: [],
          timeline: [],
          can_cancel: false,
        },
      ],
    })
    repeatMyOrderMock.mockResolvedValue({
      message: 'Pedido repetido y agregado al carrito correctamente.',
      cart: { id: 'cart-9' },
      summary: { requested_items: 1, added_items: 1, skipped_items: 0 },
      added_items: [{ order_item_id: 'item-1', cart_item_id: 'cart-item-1', dish_name: 'Silpancho', requested_quantity: 1, cart_quantity: 1 }],
      skipped_items: [],
    })

    render(<ClientOrdersPage />)

    expect(await screen.findByText(/pedido order-1/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /repetir pedido/i }))

    await waitFor(() => {
      expect(repeatMyOrderMock).toHaveBeenCalledWith('order-1')
    })
    expect(navigateMock).toHaveBeenCalledWith(
      '/client/cart?cart_id=cart-9',
      expect.objectContaining({
        state: {
          repeatSummary: expect.objectContaining({
            added: 1,
            skipped: 0,
            requested: 1,
          }),
        },
      }),
    )
  })
})

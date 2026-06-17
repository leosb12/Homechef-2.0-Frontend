import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientCheckoutPage from '../ClientCheckoutPage'

const navigateMock = vi.fn()
const fetchCartMock = vi.fn()
const previewCheckoutMock = vi.fn()
const previewCheckoutRouteMock = vi.fn()
const confirmCheckoutMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams('cart_id=cart-1')],
  }
})

vi.mock('../../services/cart_service', () => ({
  fetchCart: (...args) => fetchCartMock(...args),
}))

vi.mock('../../services/checkout_service', () => ({
  previewCheckout: (...args) => previewCheckoutMock(...args),
  previewCheckoutRoute: (...args) => previewCheckoutRouteMock(...args),
  confirmCheckout: (...args) => confirmCheckoutMock(...args),
}))

vi.mock('../../components/CheckoutDeliveryMap', () => ({
  default: () => <div data-testid="checkout-delivery-map" />,
}))

describe('ClientCheckoutPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    fetchCartMock.mockReset()
    previewCheckoutMock.mockReset()
    previewCheckoutRouteMock.mockReset()
    confirmCheckoutMock.mockReset()
  })

  it('confirma un pedido cash y muestra pantalla de exito', async () => {
    fetchCartMock.mockResolvedValue({
      carts: [
        {
          id: 'cart-1',
          chef: { name: 'Chef Demo' },
          items: [{ id: 'dish-1', dish_name: 'Silpancho', quantity: 1, unit_price: 24, subtotal: 24 }],
        },
      ],
    })
    previewCheckoutMock.mockResolvedValue({
      items: [{ dish_id: 'dish-1', dish_name: 'Silpancho', quantity: 1, unit_price: 24, subtotal: 24 }],
      pricing: { subtotal: 24, delivery_fee: 0, service_fee: 0, discount_total: 0, total: 24 },
    })
    previewCheckoutRouteMock.mockResolvedValue({
      chef: { lat: -17.781, lng: -63.181 },
      destination: { lat: -17.783, lng: -63.182 },
      route: { polyline: [{ lat: -17.781, lng: -63.181 }, { lat: -17.783, lng: -63.182 }] },
      navigation: { provider: 'OSM_OSRM' },
    })
    confirmCheckoutMock.mockResolvedValue({
      order_id: 'order-1',
      status: 'AWAITING_CHEF_CONFIRMATION',
      payment: { method: 'cash', status: 'PENDING', payment_url: '' },
    })

    render(<ClientCheckoutPage />)

    expect(await screen.findByText(/cocinero:\s*chef demo/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /crear pedido/i }))

    await waitFor(() => {
      expect(confirmCheckoutMock).toHaveBeenCalled()
    })
    expect(await screen.findByText('Pedido creado')).toBeInTheDocument()
    expect(screen.getByText(/order-1/i)).toBeInTheDocument()
  })
})

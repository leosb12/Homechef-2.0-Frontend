import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientQrSimulatedPaymentPage from '../ClientQrSimulatedPaymentPage'

const navigateMock = vi.fn()
const fetchQrSessionMock = vi.fn()
const startQrSessionMock = vi.fn()
const confirmQrSessionMock = vi.fn()
const cancelQrSessionMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams('session_code=qr-123')],
  }
})

vi.mock('../../services/qr_payment_service', () => ({
  fetchQrSession: (...args) => fetchQrSessionMock(...args),
  startQrSession: (...args) => startQrSessionMock(...args),
  confirmQrSession: (...args) => confirmQrSessionMock(...args),
  cancelQrSession: (...args) => cancelQrSessionMock(...args),
}))

describe('ClientQrSimulatedPaymentPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    fetchQrSessionMock.mockReset()
    startQrSessionMock.mockReset()
    confirmQrSessionMock.mockReset()
    cancelQrSessionMock.mockReset()
  })

  it('completa el pago QR simulado y muestra confirmacion', async () => {
    fetchQrSessionMock.mockResolvedValue({
      session_code: 'qr-123',
      status: 'PENDING',
      bank_name: 'Banco HomeChef',
      bank_account_label: 'Cuenta Demo',
      amount: 31,
      currency: 'BOB',
      expires_at: '2026-06-13T12:00:00Z',
    })
    startQrSessionMock.mockResolvedValue({})
    confirmQrSessionMock.mockResolvedValue({
      session: { session_code: 'qr-123', status: 'CONFIRMED' },
      order_id: 'order-qr-1',
      order_status: 'AWAITING_CHEF_CONFIRMATION',
      payment_status: 'CONFIRMED',
    })

    render(<ClientQrSimulatedPaymentPage />)

    expect(await screen.findByText('Banco HomeChef')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /pagar qr simulado/i }))

    await waitFor(() => {
      expect(startQrSessionMock).toHaveBeenCalledWith('qr-123')
      expect(confirmQrSessionMock).toHaveBeenCalledWith('qr-123')
    })
    expect(await screen.findByText('Pago QR confirmado')).toBeInTheDocument()
    expect(screen.getByText(/order-qr-1/i)).toBeInTheDocument()
  })
})

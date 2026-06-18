import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderTrackingPage from '../OrderTrackingPage'

const navigateMock = vi.fn()
const fetchClientOrderTrackingMock = vi.fn()
const fetchChefOrderTrackingMock = vi.fn()
const createClientOrderIncidentMock = vi.fn()
const resolveChefOrderIncidentMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'order-1' }),
  }
})

vi.mock('../../components/DeliveryTrackingMap', () => ({
  default: () => <div data-testid="delivery-map">map</div>,
}))

vi.mock('../../services/tracking_service', () => ({
  fetchClientOrderTracking: (...args) => fetchClientOrderTrackingMock(...args),
  fetchChefOrderTracking: (...args) => fetchChefOrderTrackingMock(...args),
  createClientOrderIncident: (...args) => createClientOrderIncidentMock(...args),
  resolveChefOrderIncident: (...args) => resolveChefOrderIncidentMock(...args),
}))

describe('OrderTrackingPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    fetchClientOrderTrackingMock.mockReset()
    fetchChefOrderTrackingMock.mockReset()
    createClientOrderIncidentMock.mockReset()
    resolveChefOrderIncidentMock.mockReset()
  })

  it('permite al cliente reportar una incidencia de delivery', async () => {
    fetchClientOrderTrackingMock.mockResolvedValue({
      order_id: 'order-1',
      status_label: 'En camino',
      fulfillment_label: 'Delivery',
      payment_status_label: 'Cobro confirmado',
      progress: { percent: 75, current_index: 1 },
      summary: 'El pedido va en camino al cliente.',
      steps: [{ status: 'OUT_FOR_DELIVERY', label: 'En camino' }],
      timeline: [{ occurred_at: '2026-06-13T12:00:00Z', event_code: 'ORDER_READY', event_label: 'Pedido listo', actor_role: 'COCINERO' }],
      fulfillment_type: 'delivery',
      delivery: { status_label: 'En camino', delivery_user_name: 'Rider Demo' },
      incidents: { open_count: 0, items: [] },
      map_enabled: false,
    })
    createClientOrderIncidentMock.mockResolvedValue({})

    render(<OrderTrackingPage viewerRole="client" />)

    expect(await screen.findByText('Seguimiento del pedido')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /reportar incidencia/i }))
    await userEvent.selectOptions(screen.getByRole('combobox'), 'DELAY')
    await userEvent.type(screen.getByPlaceholderText(/describe lo ocurrido/i), 'Hubo un retraso corto')
    await userEvent.click(screen.getByRole('button', { name: /registrar incidencia/i }))

    await waitFor(() => {
      expect(createClientOrderIncidentMock).toHaveBeenCalledWith('order-1', {
        code: 'DELAY',
        description: 'Hubo un retraso corto',
      })
    })
  })
})

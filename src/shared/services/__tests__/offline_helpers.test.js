import { describe, expect, it, vi } from 'vitest'

vi.mock('../offline_db', () => ({
  getLocalEntities: vi.fn(async () => [
    {
      _id: 'me',
      is_active: true,
      accept_delivery: true,
      accept_pickup: true,
      weekly_schedule: [],
    },
  ]),
  markLocalEntityDeleted: vi.fn(),
  saveLocalEntities: vi.fn(),
  saveLocalEntity: vi.fn(),
}))

vi.mock('../offline_queue', () => ({
  enqueueOperation: vi.fn(),
  getPendingOperations: vi.fn(async () => [
    {
      operation_id: 'op-availability',
      entity: 'chef_availability',
      action: 'UPDATE',
      local_id: 'chef-availability-me',
      server_id: 'me',
      status: 'pending',
      payload: {
        is_active: false,
        accept_delivery: true,
        accept_pickup: true,
      },
      created_at: '2026-06-22T10:00:00Z',
    },
  ]),
}))

vi.mock('../sync_service', () => ({
  syncNow: vi.fn(),
}))

vi.mock('../connectivityService', () => ({
  checkConnectivity: vi.fn(),
  getConnectivityState: vi.fn(() => ({ backendReachable: false })),
  isBackendReachable: vi.fn(() => false),
}))

vi.mock('../debug_logger', () => ({
  logDebug: vi.fn(),
}))

describe('offline_helpers', () => {
  it('returns IndexedDB data plus pending operations after a network failure', async () => {
    const { readListWithOfflineFallback } = await import('../offline_helpers')
    const networkError = new Error('Network Error')
    networkError.code = 'ERR_NETWORK'

    const result = await readListWithOfflineFallback(
      'chef_availability',
      async () => {
        throw networkError
      },
    )

    expect(result.__offline).toBe(true)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      _id: 'me',
      is_active: false,
      synced: false,
      __operation_id: 'op-availability',
    })
  })
})


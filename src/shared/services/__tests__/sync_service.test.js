import { beforeEach, describe, expect, it, vi } from 'vitest'

const operations = []
const storeState = {
  syncStatus: 'idle',
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  lastError: '',
  lastSyncAt: null,
  applyConnectivityState: vi.fn(),
  setSyncStatus: vi.fn((syncStatus) => {
    storeState.syncStatus = syncStatus
  }),
  setLastError: vi.fn((lastError) => {
    storeState.lastError = lastError
  }),
  setLastSyncAt: vi.fn((lastSyncAt) => {
    storeState.lastSyncAt = lastSyncAt
  }),
  setCounts: vi.fn((counts) => {
    Object.assign(storeState, counts)
  }),
}

vi.mock('../api', () => ({
  api: {
    post: vi.fn(async (_url, body) => {
      const op = body.operations[0]
      if (op.operation_id === 'op-1') {
        return {
          data: {
            synced: [{ operation_id: 'op-1', entity: op.entity, local_id: op.local_id, server_id: 'srv-1' }],
            errors: [],
            conflicts: [],
            server_time: '2026-06-22T12:00:00Z',
          },
        }
      }
      return {
        data: {
          synced: [],
          errors: [{ operation_id: op.operation_id, error: 'backend rejected action' }],
          conflicts: [],
          server_time: '2026-06-22T12:00:01Z',
        },
      }
    }),
    get: vi.fn(async () => ({ data: { changes: {}, server_time: '2026-06-22T12:00:02Z' } })),
  },
  invalidateApiCache: vi.fn(),
}))

vi.mock('../offline_db', () => ({
  STORES: { operations: 'operations' },
  getLocalEntities: vi.fn(async () => []),
  markLocalEntityDeleted: vi.fn(),
  putInStore: vi.fn(async (_store, value) => {
    const index = operations.findIndex((item) => item.operation_id === value.operation_id)
    if (index >= 0) operations[index] = { ...value }
    else operations.push({ ...value })
  }),
  saveLocalEntities: vi.fn(),
  saveLocalEntity: vi.fn(),
  reconcileLocalEntityId: vi.fn(),
}))

vi.mock('../offline_queue', () => {
  const OPERATION_STATUS = {
    PENDING: 'pending',
    SYNCING: 'syncing',
    SYNCED: 'synced',
    FAILED: 'failed',
    FAILED_PERMISSION: 'failed_permission',
    CONFLICT: 'conflict',
  }
  return {
    OPERATION_STATUS,
    getConflicts: vi.fn(async () => []),
    getDeviceId: vi.fn(async () => 'device-1'),
    getLastSync: vi.fn(async () => null),
    getPendingOperations: vi.fn(async () => [...operations].sort((a, b) => a.created_at.localeCompare(b.created_at))),
    isFailedOperation: (op) => op.status === OPERATION_STATUS.FAILED || op.status === OPERATION_STATUS.FAILED_PERMISSION,
    isPendingOperation: (op) => op.status === OPERATION_STATUS.PENDING || op.status === OPERATION_STATUS.SYNCING,
    removeSyncedOperations: vi.fn(async (ids) => {
      for (const id of ids) {
        const index = operations.findIndex((item) => item.operation_id === id)
        if (index >= 0) operations.splice(index, 1)
      }
    }),
    replaceOperationIdForRetry: vi.fn(),
    saveConflict: vi.fn(),
    saveServerMapping: vi.fn(),
    setLastSync: vi.fn(),
  }
})

vi.mock('../sync_store', () => ({
  useSyncStore: {
    getState: () => storeState,
  },
}))

vi.mock('../connectivityService', () => ({
  checkConnectivity: vi.fn(async () => ({
    browserOnline: true,
    backendReachable: true,
    iaServiceReachable: true,
    connectionState: 'online_ready',
    errors: {},
  })),
  getConnectivityState: vi.fn(() => ({ backendReachable: true, connectionState: 'online_ready' })),
  initConnectivityService: vi.fn(),
  subscribeConnectivity: vi.fn(),
}))

vi.mock('../uploads', () => ({
  uploadFile: vi.fn(),
}))

vi.mock('../debug_logger', () => ({
  logDebug: vi.fn(),
}))

vi.mock('../offlineSessionService', () => ({
  revalidateSession: vi.fn(async () => {}),
}))

describe('sync_service', () => {
  beforeEach(() => {
    operations.length = 0
    operations.push(
      {
        operation_id: 'op-1',
        entity: 'chef_availability',
        action: 'UPDATE',
        local_id: 'chef-availability-me',
        server_id: 'me',
        endpoint: '/chef/availability/',
        method: 'PUT',
        payload: { is_active: true },
        status: 'pending',
        created_at: '2026-06-22T10:00:00Z',
        updated_at: '2026-06-22T10:00:00Z',
      },
      {
        operation_id: 'op-2',
        entity: 'chef_availability',
        action: 'UPDATE',
        local_id: 'chef-availability-other',
        server_id: 'me',
        endpoint: '/chef/availability/',
        method: 'PUT',
        payload: { is_active: false },
        status: 'pending',
        created_at: '2026-06-22T10:01:00Z',
        updated_at: '2026-06-22T10:01:00Z',
      },
    )
    localStorage.setItem('homechef_access_token', 'token')
    storeState.pendingCount = 0
    storeState.failedCount = 0
    storeState.lastError = ''
    vi.clearAllMocks()
  })

  it('attempts the same pending operations counted by the badge and reports real failures', async () => {
    const { syncNow } = await import('../sync_service')

    const result = await syncNow(false, { trigger: 'test' })

    expect(result.totalBefore).toBe(2)
    expect(result.attempted).toBe(2)
    expect(result.synced).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors[0]).toBe('backend rejected action')
    expect(operations).toHaveLength(1)
    expect(operations[0]).toMatchObject({
      operation_id: 'op-2',
      status: 'failed',
      last_error: 'backend rejected action',
    })
  })
})

import '@testing-library/jest-dom/vitest'

// Minimal mock for indexedDB to avoid ReferenceError in jsdom test environment
if (typeof window !== 'undefined') {
  const mockStore = {
    get: () => {
      const req = { onsuccess: null, onerror: null }
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({ result: null })
      }, 0)
      return req
    },
    getAll: () => {
      const req = { onsuccess: null, onerror: null }
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({ result: [] })
      }, 0)
      return req
    },
    put: () => {},
    delete: () => {},
    clear: () => {},
  }
  
  const mockTx = {
    objectStore: () => mockStore,
    oncomplete: null,
    onerror: null,
    onabort: null,
  }

  const mockDb = {
    objectStoreNames: {
      contains: () => true,
    },
    transaction: () => {
      setTimeout(() => {
        if (mockTx.oncomplete) mockTx.oncomplete()
      }, 0)
      return mockTx
    },
    createObjectStore: () => ({
      createIndex: () => {},
    }),
  }

  const mockRequest = {
    result: mockDb,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  }

  globalThis.indexedDB = {
    open: () => {
      setTimeout(() => {
        if (mockRequest.onupgradeneeded) mockRequest.onupgradeneeded()
        if (mockRequest.onsuccess) mockRequest.onsuccess()
      }, 0)
      return mockRequest
    },
    deleteDatabase: () => ({
      onsuccess: null,
      onerror: null,
    }),
  }
}

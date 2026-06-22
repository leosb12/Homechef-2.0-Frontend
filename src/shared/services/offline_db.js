const DB_NAME = 'homechef_offline'
const DB_VERSION = 1

const STORES = {
  operations: 'operations',
  metadata: 'metadata',
  mappings: 'mappings',
  conflicts: 'conflicts',
  entities: 'entities',
}

let dbPromise = null

export function openOfflineDb() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORES.operations)) {
        const store = db.createObjectStore(STORES.operations, { keyPath: 'operation_id' })
        store.createIndex('created_at', 'created_at')
        store.createIndex('entity', 'entity')
      }

      if (!db.objectStoreNames.contains(STORES.metadata)) {
        db.createObjectStore(STORES.metadata, { keyPath: 'key' })
      }

      if (!db.objectStoreNames.contains(STORES.mappings)) {
        db.createObjectStore(STORES.mappings, { keyPath: 'local_id' })
      }

      if (!db.objectStoreNames.contains(STORES.conflicts)) {
        const store = db.createObjectStore(STORES.conflicts, { keyPath: 'operation_id' })
        store.createIndex('entity', 'entity')
      }

      if (!db.objectStoreNames.contains(STORES.entities)) {
        const store = db.createObjectStore(STORES.entities, { keyPath: 'key' })
        store.createIndex('entity', 'entity')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

export async function getAllFromStore(storeName) {
  const store = await transactionStore(storeName, 'readonly')
  return requestToPromise(store.getAll())
}

export async function getFromStore(storeName, key) {
  const store = await transactionStore(storeName, 'readonly')
  return requestToPromise(store.get(key))
}

export async function putInStore(storeName, value) {
  const db = await openOfflineDb()
  return transactionDone(db, storeName, 'readwrite', (store) => store.put(value))
}

export async function deleteFromStore(storeName, key) {
  const db = await openOfflineDb()
  return transactionDone(db, storeName, 'readwrite', (store) => store.delete(key))
}

export async function bulkDelete(storeName, keys) {
  if (!keys.length) return
  const db = await openOfflineDb()
  return transactionDone(db, storeName, 'readwrite', (store) => {
    keys.forEach((key) => store.delete(key))
  })
}

export async function getMetadata(key) {
  const item = await getFromStore(STORES.metadata, key)
  return item?.value ?? null
}

export async function setMetadata(key, value) {
  await putInStore(STORES.metadata, { key, value })
}

export async function saveLocalEntity(entity, data, explicitId) {
  const id = String(explicitId ?? data?._id ?? data?.id ?? data?.server_id ?? data?.local_id ?? entity)
  const record = {
    key: entityKey(entity, id),
    entity,
    id,
    data: { ...data, _id: data?._id ?? id },
    updated_at: new Date().toISOString(),
    deleted_at: data?.deleted_at || null,
  }
  await putInStore(STORES.entities, record)
  return record.data
}

export async function saveLocalEntities(entity, items = []) {
  const db = await openOfflineDb()
  await transactionDone(db, STORES.entities, 'readwrite', (store) => {
    items.forEach((item) => {
      const id = String(item?._id ?? item?.id ?? item?.server_id ?? item?.local_id ?? crypto.randomUUID())
      store.put({
        key: entityKey(entity, id),
        entity,
        id,
        data: { ...item, _id: item?._id ?? id },
        updated_at: new Date().toISOString(),
        deleted_at: item?.deleted_at || null,
      })
    })
  })
}

export async function getLocalEntity(entity, id) {
  const record = await getFromStore(STORES.entities, entityKey(entity, String(id)))
  if (!record || record.deleted_at) return null
  return record.data
}

export async function getLocalEntities(entity) {
  const records = await getAllFromStore(STORES.entities)
  return records
    .filter((record) => record.entity === entity && !record.deleted_at)
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .map((record) => record.data)
}

export async function markLocalEntityDeleted(entity, id) {
  const existing = await getFromStore(STORES.entities, entityKey(entity, String(id)))
  await putInStore(STORES.entities, {
    key: entityKey(entity, String(id)),
    entity,
    id: String(id),
    data: existing?.data || { _id: String(id) },
    updated_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
  })
}

export async function reconcileLocalEntityId(entity, local_id, server_id) {
  if (!local_id) return
  const localKey = entityKey(entity, String(local_id))
  const record = await getFromStore(STORES.entities, localKey)
  
  if (record) {
    await deleteFromStore(STORES.entities, localKey)
    
    const targetId = server_id || local_id
    const serverKey = entityKey(entity, String(targetId))
    
    record.key = serverKey
    record.id = String(targetId)
    record.data = {
      ...record.data,
      _id: String(targetId),
      id: String(targetId),
      local_id: String(local_id),
      synced: true
    }
    record.updated_at = new Date().toISOString()
    await putInStore(STORES.entities, record)
  }
}

export function entityKey(entity, id) {
  return `${entity}:${id}`
}

export { STORES }

async function transactionStore(storeName, mode) {
  const db = await openOfflineDb()
  return db.transaction(storeName, mode).objectStore(storeName)
}

function transactionDone(db, storeName, mode, callback) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const result = callback(tx.objectStore(storeName))
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function clearAllLocalData() {
  const db = await openOfflineDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.entities, STORES.metadata, STORES.operations, STORES.mappings, STORES.conflicts],
      'readwrite'
    )
    tx.objectStore(STORES.entities).clear()
    tx.objectStore(STORES.metadata).clear()
    tx.objectStore(STORES.operations).clear()
    tx.objectStore(STORES.mappings).clear()
    tx.objectStore(STORES.conflicts).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}


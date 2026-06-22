const DB_NAME = 'homechef_admin_offline';
const DB_VERSION = 1;

const STORES = {
  entities: 'entities',
  mutationQueue: 'offline_mutation_queue',
  metadata: 'metadata',
};

let dbPromise = null;

export function openAdminDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.entities)) {
        const store = db.createObjectStore(STORES.entities, { keyPath: 'key' });
        store.createIndex('module', 'module');
      }

      if (!db.objectStoreNames.contains(STORES.mutationQueue)) {
        const store = db.createObjectStore(STORES.mutationQueue, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at');
        store.createIndex('status', 'status');
      }

      if (!db.objectStoreNames.contains(STORES.metadata)) {
        db.createObjectStore(STORES.metadata, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function getStore(storeName, mode = 'readonly') {
  const db = await openAdminDb();
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function getFromStore(storeName, key) {
  const store = await getStore(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putInStore(storeName, value) {
  const db = await openAdminDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName, key) {
  const db = await openAdminDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllFromStore(storeName) {
  const store = await getStore(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName) {
  const db = await openAdminDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export { STORES };

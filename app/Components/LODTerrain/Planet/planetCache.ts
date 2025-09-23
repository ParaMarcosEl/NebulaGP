// idb.ts
export function openDB(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setDB(storeName: string, key: string, value: any) {
  const db = await openDB('planetDB', storeName);
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDB(storeName: string, key: string) {
  const db = await openDB('planetDB', storeName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getPlanetCache(key: string) {
  return getDB('planetGeometry', key);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setPlanetCache(key: string, value: any) {
  return setDB('planetGeometry', key, value);
}

export interface PhotoRow {
  id?: number;
  album?: number;
  eventId?: string;
  title: string;
  description: string;
  blob: Blob;
}

export type StoredPhoto = PhotoRow & { id: number };
const DB_NAME = 'nobita-time-journey-images-v1';

// Keep the existing database, store and primary keys. Rows without eventId are
// displayed in the legacy archive until the visitor chooses their destination.
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, publish: (value: T) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('photos', mode);
      let value: T;
      transaction.oncomplete = () => resolve(value);
      transaction.onabort = () => reject(transaction.error);
      run(transaction.objectStore('photos'), (result) => {
        value = result;
      });
    });
  } finally {
    db.close();
  }
}

export function listPhotos(eventId: string) {
  return transact<StoredPhoto[]>('readonly', (store, publish) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const rows = request.result as StoredPhoto[];
      publish(rows.filter((photo) => (eventId === 'legacy' ? !photo.eventId : photo.eventId === eventId)));
    };
  });
}

export function addPhotos(rows: PhotoRow[]) {
  return transact<void>('readwrite', (store) => {
    for (const row of rows) store.add(row);
  });
}

export function updatePhoto(id: number, changes: Pick<PhotoRow, 'title' | 'description' | 'eventId'>) {
  return transact<void>('readwrite', (store) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const row = request.result as StoredPhoto | undefined;
      if (row) store.put({ ...row, ...changes });
    };
  });
}

export function removePhoto(id: number) {
  return transact<void>('readwrite', (store) => {
    store.delete(id);
  });
}

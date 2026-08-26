import { QuestionAnswer, SyncQueueItem, UnitGeneralData, UserRegistration, MedicalUnit } from '../types.ts';

const DB_NAME = 'IMSS_Bienestar_Equipamiento_DB';
const DB_VERSION = 1;

interface AppDB extends IDBDatabase {}

let dbInstance: AppDB | null = null;

export async function getDB(): Promise<AppDB> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      // Fallback for non-browser environment
      return resolve({} as AppDB);
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Object store for answers
      if (!db.objectStoreNames.contains('answers')) {
        const answerStore = db.createObjectStore('answers', { keyPath: 'key' });
        answerStore.createIndex('clues', 'clues', { unique: false });
        answerStore.createIndex('status', 'status', { unique: false });
      }

      // Object store for unit general data
      if (!db.objectStoreNames.contains('generalData')) {
        db.createObjectStore('generalData', { keyPath: 'clues' });
      }

      // Object store for offline sync queue
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('status', 'status', { unique: false });
      }

      // Object store for user sessions & drafts
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'key' });
      }

      // Object store for cached units
      if (!db.objectStoreNames.contains('cachedUnits')) {
        const unitStore = db.createObjectStore('cachedUnits', { keyPath: 'clues' });
        unitStore.createIndex('entity', 'entity', { unique: false });
      }
    };
  });
}

// Generate unique key for answer lookup
export function makeAnswerKey(clues: string, officeNumber: number, question: string): string {
  return `${clues.trim().toUpperCase()}__C${officeNumber}__${question.trim()}`;
}

// Save or update an answer in IndexedDB
export async function saveLocalAnswer(answer: QuestionAnswer): Promise<void> {
  try {
    const db = await getDB();
    if (!db.transaction) return;
    const tx = db.transaction('answers', 'readwrite');
    const store = tx.objectStore('answers');
    const key = makeAnswerKey(answer.clues, answer.officeNumber, answer.question);
    store.put({ ...answer, key });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Fallback saving answer to localStorage:', err);
    try {
      const key = makeAnswerKey(answer.clues, answer.officeNumber, answer.question);
      localStorage.setItem(`ans_${key}`, JSON.stringify(answer));
    } catch (_) {}
  }
}

// Get all answers for a given CLUES
export async function getLocalAnswersForUnit(clues: string): Promise<Record<string, QuestionAnswer>> {
  const result: Record<string, QuestionAnswer> = {};
  const normClues = clues.trim().toUpperCase();

  try {
    const db = await getDB();
    if (!db.transaction) throw new Error('No IDB');
    const tx = db.transaction('answers', 'readonly');
    const store = tx.objectStore('answers');
    const index = store.index('clues');
    const request = index.getAll(normClues);

    const answersList: (QuestionAnswer & { key: string })[] = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    answersList.forEach((a) => {
      const k = `${a.officeNumber}__${a.question}`;
      result[k] = a;
    });
  } catch (err) {
    // Fallback to localStorage scan
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const lKey = localStorage.key(i);
        if (lKey && lKey.startsWith(`ans_${normClues}__`)) {
          const item = JSON.parse(localStorage.getItem(lKey) || '{}') as QuestionAnswer;
          if (item && item.question) {
            result[`${item.officeNumber}__${item.question}`] = item;
          }
        }
      }
    } catch (_) {}
  }

  return result;
}

export async function deleteLocalAnswersForUnit(clues: string): Promise<void> {
  const normClues = clues.trim().toUpperCase();
  const db = await getDB();
  if (!db.transaction) return;

  const tx = db.transaction(['answers', 'syncQueue'], 'readwrite');
  const answersStore = tx.objectStore('answers');
  const queueStore = tx.objectStore('syncQueue');

  answersStore.index('clues').openCursor(IDBKeyRange.only(normClues)).onsuccess = (event) => {
    const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };

  queueStore.openCursor().onsuccess = (event) => {
    const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
    if (cursor) {
      const item = cursor.value as SyncQueueItem;
      if (item.clues?.trim().toUpperCase() === normClues && item.action === 'save_answer') {
        cursor.delete();
      }
      cursor.continue();
    }
  };

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Save Unit General Data
export async function saveLocalGeneralData(data: UnitGeneralData): Promise<void> {
  try {
    const db = await getDB();
    if (!db.transaction) return;
    const tx = db.transaction('generalData', 'readwrite');
    const store = tx.objectStore('generalData');
    store.put(data);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    localStorage.setItem(`gen_${data.clues}`, JSON.stringify(data));
  }
}

// Get Unit General Data
export async function getLocalGeneralData(clues: string): Promise<UnitGeneralData | null> {
  try {
    const db = await getDB();
    if (!db.transaction) throw new Error('No IDB');
    const tx = db.transaction('generalData', 'readonly');
    const store = tx.objectStore('generalData');
    const req = store.get(clues.trim().toUpperCase());

    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    const raw = localStorage.getItem(`gen_${clues.trim().toUpperCase()}`);
    return raw ? JSON.parse(raw) : null;
  }
}

// Sync Queue operations
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<SyncQueueItem> {
  const syncItem: SyncQueueItem = {
    ...item,
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retries: 0,
    status: 'pending'
  };

  try {
    const db = await getDB();
    if (!db.transaction) throw new Error('No IDB');
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    store.put(syncItem);
  } catch (err) {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push(syncItem);
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  }

  return syncItem;
}

export async function getPendingSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await getDB();
    if (!db.transaction) throw new Error('No IDB');
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const req = store.getAll();

    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    try {
      return JSON.parse(localStorage.getItem('sync_queue') || '[]');
    } catch (_) {
      return [];
    }
  }
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  try {
    const db = await getDB();
    if (!db.transaction) throw new Error('No IDB');
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    store.delete(id);
  } catch (err) {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]').filter((i: SyncQueueItem) => i.id !== id);
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  }
}

// App Draft state save & load
export async function saveAppDraft(key: string, data: any): Promise<void> {
  try {
    const db = await getDB();
    if (!db.transaction) throw new Error('No IDB');
    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    store.put({ key, data, updatedAt: new Date().toISOString() });
  } catch (err) {
    localStorage.setItem(`draft_${key}`, JSON.stringify(data));
  }
}

export async function getAppDraft<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    if (!db.transaction) throw new Error('No IDB');
    const tx = db.transaction('drafts', 'readonly');
    const store = tx.objectStore('drafts');
    const req = store.get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    const raw = localStorage.getItem(`draft_${key}`);
    return raw ? JSON.parse(raw) : null;
  }
}

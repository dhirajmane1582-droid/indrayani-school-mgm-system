
import { openDB, IDBPDatabase } from 'idb';
import { supabase } from './supabase';

const DB_NAME = 'IndrayaniSchoolDB';
const DB_VERSION = 1;

const TABLE_MAP: Record<string, string> = {
  'students': 'students',
  'attendance': 'attendance',
  'exams': 'exams',
  'results': 'results',
  'annualRecords': 'annual_records',
  'customFields': 'custom_field_defs',
  'holidays': 'holidays',
  'users': 'users',
  'fees': 'fees',
  'homework': 'homework',
  'announcements': 'announcements'
};

let dbPromise: Promise<IDBPDatabase> | null = null;

export const initDB = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        Object.keys(TABLE_MAP).forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: store === 'annualRecords' ? 'studentId' : 'id' });
          }
        });
      },
    });
  }
  return dbPromise;
};

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const withTimeout = (promise: Promise<any> | any, ms: number): Promise<any> => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Sync Timeout')), ms))
  ]);
};

const withRetry = async (fn: () => Promise<any>, retries = 5, delay = 1500): Promise<any> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || String(err);
      // Retry on network errors, timeouts, or specific fetch failures
      const isRetryable = 
        errMsg.includes('Failed to fetch') || 
        errMsg.includes('Sync Timeout') || 
        errMsg.includes('Load failed') ||
        err.name === 'TypeError' ||
        err.name === 'AbortError';

      if (!isRetryable) throw err;
      
      console.warn(`Cloud Operation Failed (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, errMsg);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw lastError;
};

export const dbService = {
  async getLocal(storeName: string) {
    const db = await initDB();
    return db.getAll(storeName);
  },

  async getAll(storeName: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];

    try {
      const data = await withRetry(async () => 
        await withTimeout(supabase.from(tableName).select('*'), 20000)
      );
      
      if (data.error) throw data.error;
      
      if (data.data && Array.isArray(data.data)) {
        const tx = db.transaction(storeName, 'readwrite');
        await tx.store.clear();
        for (const item of data.data) {
          await tx.store.put(item);
        }
        await tx.done;
        return data.data;
      }
    } catch (err: any) {
      console.warn(`Supabase Sync [${storeName}] Failed:`, err.message || err);
    }

    return db.getAll(storeName);
  },

  async verifyCloudUser(username: string, pass: string) {
    try {
      const result = await withRetry(async () => 
        await supabase
          .from('users')
          .select('*')
          .ilike('username', username.trim())
          .eq('password', pass)
          .maybeSingle()
      );
      
      if (result.error) return null;
      return result.data;
    } catch (e) {
      return null;
    }
  },

  async put(storeName: string, item: any) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const conflictColumn = storeName === 'annualRecords' ? 'studentId' : 'id';

    await db.put(storeName, item);

    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from(tableName)
          .upsert(item, { onConflict: conflictColumn });
        if (error) throw error;
      });
    } catch (error: any) {
      console.error(`Supabase Upsert Error [${storeName}]:`, error);
      const isNetwork = error.message?.includes('Failed to fetch') || error.message?.includes('Sync Timeout');
      if (isNetwork) {
          throw new Error(`Network Error: Cloud is unreachable. Please check your internet connection or disable AdBlockers.`);
      }
      throw new Error(`Cloud Database Error: ${error.message}. If this persists, run 'Repair SQL' in the System tab.`);
    }
  },

  async putAll(storeName: string, items: any[]) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const conflictColumn = storeName === 'annualRecords' ? 'studentId' : 'id';

    if (!items || items.length === 0) return;

    // Save locally
    const tx = db.transaction(storeName, 'readwrite');
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;

    // Smaller chunks for data-heavy tables
    const isDataHeavy = ['annualRecords', 'results', 'students'].includes(storeName);
    const chunkSize = isDataHeavy ? 20 : 50;

    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        try {
          await withRetry(async () => {
            const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: conflictColumn });
            if (error) throw error;
          });
        } catch (error: any) {
          console.error(`Supabase Chunk Error [${storeName}]:`, error);
          throw new Error(`Cloud Bulk Upload Failed at chunk ${Math.floor(i/chunkSize) + 1}: ${error.message}`);
        }
    }
  },

  async delete(storeName: string, id: string) {
    if (!id) return;
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const idField = (storeName === 'annualRecords') ? 'studentId' : 'id';

    await db.delete(storeName, id);
    try {
      await withRetry(async () => {
        const { error } = await supabase.from(tableName).delete().eq(idField, id);
        if (error) throw error;
      });
    } catch (error: any) {
      console.error(`Supabase Delete [${storeName}] Failed:`, error.message);
      throw new Error(`Cloud Delete Failed: ${error.message}`);
    }
  },

  async deleteMany(storeName: string, ids: string[]) {
    if (!ids || ids.length === 0) return;
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const idField = (storeName === 'annualRecords') ? 'studentId' : 'id';

    // 1. Local Delete
    const tx = db.transaction(storeName, 'readwrite');
    for (const id of ids) {
      await tx.store.delete(id);
    }
    await tx.done;

    // 2. Cloud Delete (in chunks)
    const chunkSize = 50;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      try {
        await withRetry(async () => {
          const { error } = await supabase.from(tableName).delete().in(idField, chunk);
          if (error) throw error;
        });
      } catch (error: any) {
        console.error(`Supabase Bulk Delete Error [${storeName}]:`, error);
        throw new Error(`Cloud Bulk Delete Failed: ${error.message}`);
      }
    }
  },

  async clear(storeName: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const idField = storeName === 'annualRecords' ? 'studentId' : 'id';

    await db.clear(storeName);
    try {
      await supabase.from(tableName).delete().not(idField, 'is', null);
    } catch (err) {}
  }
};

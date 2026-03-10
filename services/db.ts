
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

const sanitizeForSupabase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForSupabase);
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        // Convert empty strings to null for Supabase compatibility (especially for DATE types)
        if (value === '') {
          newObj[key] = null;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // For JSONB columns, we might want to keep empty strings inside the JSON, 
          // but usually it's safer to just pass the object as is if it's not a root level empty string.
          newObj[key] = value;
        } else {
          newObj[key] = sanitizeForSupabase(value);
        }
      }
    }
    return newObj;
  }
  return obj === '' ? null : obj;
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
      console.log(`[Sync] Fetching ${storeName} from cloud...`);
      const data = await withRetry(async () => 
        await withTimeout(supabase.from(tableName).select('*'), 20000)
      );
      
      if (data.error) {
        console.error(`[Sync] Supabase Error for ${storeName}:`, data.error);
        throw data.error;
      }
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`[Sync] Received ${data.data.length} items for ${storeName}. Updating local cache...`);
        const tx = db.transaction(storeName, 'readwrite');
        await tx.store.clear();
        for (const item of data.data) {
          await tx.store.put(item);
        }
        await tx.done;
        return data.data;
      } else {
        console.warn(`[Sync] Received no data for ${storeName}.`);
      }
    } catch (err: any) {
      console.warn(`[Sync] Supabase Sync [${storeName}] Failed:`, err.message || err);
    }

    const localData = await db.getAll(storeName);
    console.log(`[Sync] Returning ${localData.length} local items for ${storeName}.`);
    return localData;
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

    const sanitizedItem = sanitizeForSupabase(item);

    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from(tableName)
          .upsert(sanitizedItem, { onConflict: conflictColumn });
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

    // Larger chunks for better performance on modern connections
    const isDataHeavy = ['annualRecords', 'results', 'students', 'users'].includes(storeName);
    const chunkSize = isDataHeavy ? 50 : 100;

    const sanitizedItems = items.map(sanitizeForSupabase);

    const chunkPromises = [];
    for (let i = 0; i < sanitizedItems.length; i += chunkSize) {
        const chunk = sanitizedItems.slice(i, i + chunkSize);
        chunkPromises.push(
          withRetry(async () => {
            const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: conflictColumn });
            if (error) throw error;
          }, 5, 1000)
        );
    }
    
    try {
      await Promise.all(chunkPromises);
    } catch (error: any) {
      console.error(`Supabase Bulk Error [${storeName}]:`, error);
      const isNetwork = error.message?.includes('Failed to fetch') || error.message?.includes('Sync Timeout');
      const helpMsg = isNetwork ? "Check internet connection." : "Run 'Repair SQL' in System tab.";
      throw new Error(`Cloud Bulk Upload Failed: ${error.message}. ${helpMsg}`);
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

    // 2. Cloud Delete (in parallel chunks)
    const chunkSize = 50;
    const chunkPromises = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      chunkPromises.push(
        withRetry(async () => {
          const { error } = await supabase.from(tableName).delete().in(idField, chunk);
          if (error) throw error;
        })
      );
    }
    
    try {
      await Promise.all(chunkPromises);
    } catch (error: any) {
      console.error(`Supabase Bulk Delete Error [${storeName}]:`, error);
      throw new Error(`Cloud Bulk Delete Failed: ${error.message}`);
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

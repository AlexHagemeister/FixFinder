// Keeps the photo for a report on the phone while the Location needed screen is open, so it survives a page reload.
//
// Why a reload: once Safari denies location, it keeps the denial for the life of the page, even after the user allows
// location in Settings (WebKit's Geolocation.cpp says so at the isDenied() check in startRequest). Only a reload reads
// the new setting, so Ask again reloads the page and picks the report back up from here.
//
// Every function here settles and never throws. If IndexedDB is missing or fails (private mode, a full disk), saving
// reports false and loading finds nothing, so the report falls back to living in memory only. Tests replace this module.

import type { PhotoDescription } from "./flow-context.ts";

/** A saved record older than this is thrown away, so a photo never sits on the phone longer than a short detour. */
export const SAVED_PHOTO_MAX_AGE_MS = 15 * 60_000;

/** How long a read waits for IndexedDB before giving up. Safari's IndexedDB has been known to hang on open. */
export const SAVED_PHOTO_READ_TIMEOUT_MS = 1500;

export interface SavedPhoto {
  photo: File;
  /** When the record was written, from Date.now(). */
  savedAt: number;
  /** The Location needed screen's answer to "will the phone ask again", so a reopened screen shows the same steps. */
  phoneWillNotAsk: boolean;
  /** True when Ask again wrote the record just before reloading, so app start runs the location step. */
  resumeAtLocation: boolean;
  /** What the photo step found, so picking the report back up does not read (and pay for) the photo again. */
  description: PhotoDescription;
}

/** The record as stored. The photo goes in as a Blob with its name kept beside it, and comes back out as a File. */
interface StoredRecord {
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
  savedAt: number;
  phoneWillNotAsk: boolean;
  resumeAtLocation: boolean;
  description: PhotoDescription;
}

const DB_NAME = "fixfinder";
const STORE = "saved-photo";
// One report is in progress at a time, so the store holds one record under one key.
const KEY = "current";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB open was blocked"));
  });
}

/** Runs one request in its own transaction. Resolves once the transaction commits, so a reload after it keeps the write. */
async function run<T>(mode: IDBTransactionMode, makeRequest: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = makeRequest(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    });
  } finally {
    db.close();
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("IndexedDB timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Saves the photo and what app start needs to pick the report back up. Resolves true once it is on the phone. */
export async function savePhoto(
  photo: File,
  options: { phoneWillNotAsk: boolean; resumeAtLocation: boolean; description: PhotoDescription },
): Promise<boolean> {
  try {
    const record: StoredRecord = {
      // A plain Blob copy, since some browsers have been unreliable at storing File objects.
      blob: photo.slice(0, photo.size, photo.type),
      name: photo.name,
      type: photo.type,
      lastModified: photo.lastModified,
      savedAt: Date.now(),
      ...options,
    };
    await run("readwrite", (store) => store.put(record, KEY));
    return true;
  } catch {
    return false;
  }
}

/** The saved record, or null when there is none or it cannot be read. Freshness is the caller's check. */
export async function loadPhoto(): Promise<SavedPhoto | null> {
  try {
    const record = await withTimeout(
      run<StoredRecord | undefined>("readonly", (store) => store.get(KEY)),
      SAVED_PHOTO_READ_TIMEOUT_MS,
    );
    // A record from before the photo step kept its description cannot pick the report up. Records live 15 minutes.
    if (!record || !(record.blob instanceof Blob) || !record.description) return null;
    const photo = new File([record.blob], record.name, { type: record.type, lastModified: record.lastModified });
    return {
      photo,
      savedAt: record.savedAt,
      phoneWillNotAsk: record.phoneWillNotAsk,
      resumeAtLocation: record.resumeAtLocation,
      description: record.description,
    };
  } catch {
    return null;
  }
}

/** Removes the saved record, if there is one. */
export async function clearPhoto(): Promise<void> {
  try {
    await run("readwrite", (store) => store.delete(KEY));
  } catch {
    // Nothing saved, or no IndexedDB. Either way there is nothing left to remove.
  }
}

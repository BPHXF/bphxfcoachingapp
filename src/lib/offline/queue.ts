"use client";

// Local-first set logging — the "Notes app" behavior decided in
// claude/decisions-log.md: tapping a set must feel instant and succeed
// regardless of connection quality. Every log write goes here FIRST
// (IndexedDB, survives offline/app-close/reload), and a background sync
// process drains it to Supabase whenever a connection is available.
//
// STATUS: this is a working local-write + queue-drain implementation, wired
// up enough to build on. What's still a TODO before this is production-hard:
//   - a real background sync trigger (this currently drains on 'online' and
//     on an interval while the tab is open; a Service Worker with the
//     Background Sync API would keep draining even if the tab is closed)
//   - exponential backoff / giving up after N failed attempts with a visible
//     "couldn't sync, check connection" state in the UI
//   - merge logic if the same set is edited on two devices before either
//     syncs (unlikely for this app's use case, but worth a conscious call)
//
// The set_logs table's UNIQUE(assignment_exercise_id, set_number) constraint
// (see supabase/schema.sql) is what makes retrying a sync safe — resending
// an already-synced log is a harmless no-op upsert, never a duplicate row.

import { createClient } from "@/lib/supabase/client";

const DB_NAME = "bphxf-offline";
const DB_VERSION = 1;
const STORE = "pending_set_logs";

export interface PendingSetLog {
  // Client-generated id so the same log always upserts to the same row,
  // even if it's queued twice before the first sync attempt finishes.
  localId: string;
  assignment_exercise_id: string;
  client_id: string;
  set_number: number;
  actual_reps: number;
  actual_weight: number;
  actual_weight_unit: "lb" | "kg" | "band";
  // Set only when actual_weight_unit is "band" (Light/Moderate/Heavy
  // instead of a numeric weight).
  actual_band_intensity: "L" | "M" | "H" | null;
  client_logged_at: string;
  synced: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "localId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Call this the instant a set is tapped. Resolves as soon as the write hits
 * IndexedDB — it does not wait on the network, so the UI can update
 * immediately regardless of connection quality.
 */
export async function logSetOffline(
  entry: Omit<PendingSetLog, "localId" | "synced">
): Promise<PendingSetLog> {
  const db = await openDb();
  const record: PendingSetLog = {
    ...entry,
    localId: `${entry.assignment_exercise_id}:${entry.set_number}`,
    synced: false,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Fire-and-forget: try to sync now, but the caller never waits on this.
  void drainQueue();

  return record;
}

async function getAllPending(): Promise<PendingSetLog[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.filter((r: PendingSetLog) => !r.synced));
    req.onerror = () => reject(req.error);
  });
}

async function markSynced(localId: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(localId);
    req.onsuccess = () => {
      const record = req.result as PendingSetLog | undefined;
      if (record) store.put({ ...record, synced: true });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let draining = false;

/**
 * Pushes every unsynced local log to Supabase. Safe to call repeatedly —
 * upserts against the (assignment_exercise_id, set_number) unique
 * constraint mean a log that already made it to the server is just a no-op
 * the second time.
 */
export async function drainQueue(): Promise<void> {
  if (draining || typeof navigator !== "undefined" && !navigator.onLine) return;
  draining = true;
  try {
    const pending = await getAllPending();
    if (pending.length === 0) return;

    const supabase = createClient();
    for (const entry of pending) {
      const { localId, synced, ...row } = entry;
      const { error } = await supabase
        .from("set_logs")
        .upsert(row, { onConflict: "assignment_exercise_id,set_number" });
      if (!error) await markSynced(localId);
    }
  } finally {
    draining = false;
  }
}

/** Call once on app load (e.g. in the root layout's client shell). */
export function startBackgroundSync() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => void drainQueue());
  // Belt-and-suspenders: also retry periodically while the tab is open, in
  // case 'online' never fires (flaky wifi that never fully drops).
  setInterval(() => void drainQueue(), 30_000);
  void drainQueue();
}

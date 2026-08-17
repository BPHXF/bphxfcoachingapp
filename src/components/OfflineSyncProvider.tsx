"use client";

import { useEffect } from "react";
import { startBackgroundSync } from "@/lib/offline/queue";

// Kicks off the local-first sync loop (see lib/offline/queue.ts) once, on
// first client-side mount, for the whole app.
export function OfflineSyncProvider() {
  useEffect(() => {
    startBackgroundSync();
  }, []);

  return null;
}

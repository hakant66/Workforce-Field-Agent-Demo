import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useOnlineStatus } from "./use-online-status";
import { saveJobToHistory } from "@/components/HistoryPanel";

const STORAGE_KEY = "syncQueue";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type QueueItemStatus = "Pending" | "Syncing" | "Synced" | "Retry Required";

export interface QueueItem {
  id: string;
  timestamp: string;
  blobUrl: string;
  status: QueueItemStatus;
  error?: string;
}

function loadQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistQueue(queue: QueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function useSyncQueue() {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<QueueItem[]>(loadQueue);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const wasOfflineRef = useRef(!navigator.onLine);

  // Keep localStorage in sync
  useEffect(() => {
    persistQueue(queue);
  }, [queue]);

  const enqueue = useCallback((audioBlob: Blob) => {
    const blobUrl = URL.createObjectURL(audioBlob);
    const item: QueueItem = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      blobUrl,
      status: "Pending",
    };
    setQueue((prev) => {
      const next = [...prev, item];
      persistQueue(next);
      return next;
    });
    return item;
  }, []);

  const processOneItem = useCallback(async (item: QueueItem): Promise<QueueItem> => {
    try {
      // Fetch the blob from its URL
      const blobRes = await fetch(item.blobUrl);
      if (!blobRes.ok) throw new Error("Audio blob expired — please re-record");
      const audioBlob = await blobRes.blob();

      // Transcribe
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
        body: formData,
      });

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json().catch(() => ({}));
        throw new Error(err.error || "Transcription failed");
      }

      const { text } = await transcribeRes.json();
      if (!text?.trim()) throw new Error("No speech detected");

      // Extract details
      const extractRes = await fetch(`${SUPABASE_URL}/functions/v1/extract-details`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: text }),
      });

      if (!extractRes.ok) {
        const err = await extractRes.json().catch(() => ({}));
        throw new Error(err.error || "Extraction failed");
      }

      const extracted = await extractRes.json();

      // Save to history
      const avgConfidence = [
        extracted.site?.confidence,
        extracted.asset?.confidence,
        extracted.description?.confidence,
        extracted.outcome?.confidence,
      ]
        .filter((c): c is number => c != null)
        .reduce((sum, c, _, arr) => sum + c / arr.length, 0);

      saveJobToHistory({
        site: extracted.site?.value || extracted.site || "Unknown",
        asset: extracted.asset?.value || extracted.asset || "Unknown",
        jobDescription: extracted.description?.value || extracted.description || "No description",
        outcome: extracted.outcome?.value || extracted.outcome || "Unknown",
        aiConfidence: Math.round(avgConfidence) || undefined,
      });

      // Revoke blob URL to free memory
      URL.revokeObjectURL(item.blobUrl);

      return { ...item, status: "Synced" as const };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`Queue item ${item.id} failed:`, errorMsg);
      return { ...item, status: "Retry Required" as const, error: errorMsg };
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    const current = loadQueue();
    const pending = current.filter((i) => i.status === "Pending" || i.status === "Retry Required");

    if (pending.length === 0) {
      processingRef.current = false;
      setIsProcessing(false);
      return;
    }

    toast.info(`Reconnected! Syncing ${pending.length} pending job${pending.length > 1 ? "s" : ""}...`);

    const results = [...current];

    for (const item of pending) {
      // Update to Syncing
      const idx = results.findIndex((i) => i.id === item.id);
      if (idx !== -1) {
        results[idx] = { ...results[idx], status: "Syncing" };
        setQueue([...results]);
      }

      const processed = await processOneItem(item);
      if (idx !== -1) {
        results[idx] = processed;
        setQueue([...results]);
      }

      if (processed.status === "Synced") {
        toast.success(`Job from ${new Date(item.timestamp).toLocaleTimeString()} synced`);
      } else {
        toast.error(`Job sync failed: ${processed.error}`);
      }
    }

    // Clean up synced items
    const remaining = results.filter((i) => i.status !== "Synced");
    setQueue(remaining);
    persistQueue(remaining);

    processingRef.current = false;
    setIsProcessing(false);
  }, [processOneItem]);

  // Auto-process when coming back online
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      const pending = loadQueue().filter((i) => i.status === "Pending" || i.status === "Retry Required");
      if (pending.length > 0) {
        processQueue();
      }
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, processQueue]);

  const pendingCount = queue.filter((i) => i.status === "Pending" || i.status === "Retry Required").length;

  return { queue, enqueue, processQueue, isProcessing, pendingCount };
}

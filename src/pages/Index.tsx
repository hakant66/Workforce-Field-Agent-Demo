import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Code, ChevronDown, ChevronUp, WifiOff, Send } from "lucide-react";
import FieldHeader from "@/components/FieldHeader";
import RecordButton from "@/components/RecordButton";
import AudioWaveform from "@/components/AudioWaveform";
import TranscriptPanel from "@/components/TranscriptPanel";
import SummaryCard from "@/components/SummaryCard";
import HistoryPanel, { saveJobToHistory, loadJobHistory, updateJobInHistory, type JobRecord } from "@/components/HistoryPanel";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncQueue } from "@/hooks/use-sync-queue";
import { useTheme } from "@/hooks/use-theme";

type AppState = "idle" | "recording" | "processing" | "result";

interface SummaryData {
  site: string;
  asset: string;
  jobDescription: string;
  outcome: string;
}

interface FieldConfidence {
  value: string;
  confidence: number;
  reasoning: string;
}

interface ConfidenceData {
  site?: FieldConfidence;
  asset?: FieldConfidence;
  description?: FieldConfidence;
  outcome?: FieldConfidence;
}

interface GpsData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number;
  timestamp: string;
}

interface DebugData {
  rawTranscript: string;
  rawExtraction: Record<string, unknown>;
  gps: GpsData;
}

const generateFictiveGps = (): GpsData => {
  // Random coordinates around industrial areas worldwide
  const bases = [
    { lat: 51.5074, lng: -0.1278 },   // London
    { lat: 52.2297, lng: 21.0122 },   // Warsaw
    { lat: 40.4168, lng: -3.7038 },   // Madrid
    { lat: 48.8566, lng: 2.3522 },    // Paris
    { lat: 53.3498, lng: -6.2603 },   // Dublin
    { lat: 59.3293, lng: 18.0686 },   // Stockholm
    { lat: 45.4642, lng: 9.1900 },    // Milan
    { lat: 50.0755, lng: 14.4378 },   // Prague
  ];
  const base = bases[Math.floor(Math.random() * bases.length)];
  return {
    latitude: +(base.lat + (Math.random() - 0.5) * 0.1).toFixed(6),
    longitude: +(base.lng + (Math.random() - 0.5) * 0.1).toFixed(6),
    accuracy: +(3 + Math.random() * 15).toFixed(1),
    altitude: +(10 + Math.random() * 200).toFixed(1),
    timestamp: new Date().toISOString(),
  };
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const Index = () => {
  const isOnline = useOnlineStatus();
  const { enqueue, isProcessing, pendingCount, processQueue } = useSyncQueue();
  const { theme, toggleTheme } = useTheme();
  const [appState, setAppState] = useState<AppState>("idle");
  const [duration, setDuration] = useState(0);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [confidenceData, setConfidenceData] = useState<ConfidenceData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncingCRM, setSyncingCRM] = useState(false);
  const [syncedCRM, setSyncedCRM] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [unsyncedErpCount, setUnsyncedErpCount] = useState(0);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Track unsynced ERP jobs
  const refreshUnsyncedCount = useCallback(() => {
    const jobs = loadJobHistory();
    setUnsyncedErpCount(jobs.filter((j) => !j.erpSynced).length);
  }, []);

  useEffect(() => {
    refreshUnsyncedCount();
  }, [refreshUnsyncedCount]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Update document title during recording
  useEffect(() => {
    if (appState === "recording") {
      document.title = `🔴 Recording — Field Service`;
    } else {
      document.title = "Field Service Audio to Text";
    }
  }, [appState]);

  // Warn before navigating away during recording
  useEffect(() => {
    if (appState !== "recording") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [appState]);

  // Wake Lock: prevent screen from auto-locking during recording
  useEffect(() => {
    if (appState !== "recording") return;
    let wakeLock: WakeLockSentinel | null = null;
    const requestLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
          console.log("Wake Lock acquired");
        }
      } catch (err) {
        console.warn("Wake Lock request failed:", err);
      }
    };
    requestLock();
    return () => {
      wakeLock?.release().then(() => console.log("Wake Lock released"));
    };
  }, [appState]);

  // Duration counter
  useEffect(() => {
    if (appState === "recording") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [appState]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;

      setAppState("recording");
      setDuration(0);
      setTranscriptLines([]);
      setSummary(null);
      setConfidenceData(null);
      setDebugData(null);
      setSynced(false);
      setSyncingCRM(false);
      setSyncedCRM(false);
      setSyncing(false);
      setEditingJobId(null);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Could not access microphone. Please allow microphone permissions.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;

    return new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    // Offline path: enqueue for later sync
    if (!isOnline) {
      enqueue(audioBlob);
      toast("You are offline — Job saved locally", {
        icon: <WifiOff className="w-4 h-4 text-yellow-400" />,
        description: "It will be processed automatically when you're back online.",
      });
      setAppState("idle");
      return;
    }

    setAppState("processing");

    try {
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
      if (!text || text.trim().length === 0) {
        throw new Error("No speech detected in the recording");
      }

      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      setTranscriptLines(sentences.map((s: string) => s.trim()));

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

      setDebugData({ rawTranscript: text, rawExtraction: extracted, gps: generateFictiveGps() });

      setConfidenceData({
        site: extracted.site?.confidence != null ? extracted.site : undefined,
        asset: extracted.asset?.confidence != null ? extracted.asset : undefined,
        description: extracted.description?.confidence != null ? extracted.description : undefined,
        outcome: extracted.outcome?.confidence != null ? extracted.outcome : undefined,
      });

      setSummary({
        site: extracted.site?.value || extracted.site || "Unknown",
        asset: extracted.asset?.value || extracted.asset || "Unknown",
        jobDescription: extracted.description?.value || extracted.description || "No description extracted",
        outcome: extracted.outcome?.value || extracted.outcome || "Unknown",
      });
      setAppState("result");
    } catch (err) {
      console.error("Processing error:", err);
      toast.error(err instanceof Error ? err.message : "Processing failed");
      setAppState("idle");
    }
  }, [isOnline, enqueue]);

  const handleToggleRecord = useCallback(async () => {
    if (appState === "idle" || appState === "result") {
      await startRecording();
    } else if (appState === "recording") {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        await processAudio(audioBlob);
      }
    }
  }, [appState, startRecording, stopRecording, processAudio]);

  const handleAccept = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
      if (summary) {
        const avgConfidence = confidenceData
          ? Math.round(
              [confidenceData.site?.confidence, confidenceData.asset?.confidence, confidenceData.description?.confidence, confidenceData.outcome?.confidence]
                .filter((c): c is number => c != null)
                .reduce((sum, c, _, arr) => sum + c / arr.length, 0)
            )
          : undefined;
        const savedJob = saveJobToHistory({
          site: summary.site,
          asset: summary.asset,
          outcome: summary.outcome,
          jobDescription: summary.jobDescription,
          aiConfidence: avgConfidence,
        });
        setEditingJobId(savedJob.id);
        toast.success("Job accepted and saved to history");
        refreshUnsyncedCount();
      }
    }, 2000);
  };

  const handleDelete = () => {
    setSummary(null);
    setConfidenceData(null);
    setAppState("idle");
    toast("Job discarded");
  };

  const syncToERP = useCallback(async (data: SummaryData) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-erp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        site: data.site,
        asset: data.asset,
        description: data.jobDescription,
        outcome: data.outcome,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "ERP sync failed");
    }
    return res.json();
  }, []);

  const handleUpdate = useCallback(async (updated: SummaryData) => {
    setSummary(updated);
    // Persist edit to history if editing a history job
    if (editingJobId) {
      updateJobInHistory({
        id: editingJobId,
        site: updated.site,
        asset: updated.asset,
        jobDescription: updated.jobDescription,
        outcome: updated.outcome,
        syncedAt: new Date().toISOString(),
        erpSynced: false,
      });
      refreshUnsyncedCount();
    }
    if (syncedCRM) {
      setSyncingCRM(true);
      try {
        await syncToERP(updated);
        setSyncingCRM(false);
        toast.success("Updated record synced to ERP");
      } catch (err) {
        setSyncingCRM(false);
        toast.error(err instanceof Error ? err.message : "Re-sync failed");
      }
    } else {
      toast.success("Job details updated");
    }
  }, [syncedCRM, syncToERP, editingJobId, refreshUnsyncedCount]);

  const handleEditFromHistory = useCallback((job: JobRecord) => {
    setEditingJobId(job.id);
    setSummary({
      site: job.site,
      asset: job.asset,
      jobDescription: job.jobDescription,
      outcome: job.outcome,
    });
    setConfidenceData(null);
    setTranscriptLines([]);
    setDebugData(null);
    setSynced(true); // Already accepted
    setSyncing(false);
    setSyncedCRM(false);
    setSyncingCRM(false);
    setAppState("result");
    setHistoryOpen(false);
  }, []);

  const handleSyncCRM = useCallback(async () => {
    if (!summary) return;
    setSyncingCRM(true);
    try {
      await syncToERP(summary);
      setSyncingCRM(false);
      setSyncedCRM(true);
      // Mark job as ERP-synced in history
      if (editingJobId) {
        updateJobInHistory({
          id: editingJobId,
          site: summary.site,
          asset: summary.asset,
          jobDescription: summary.jobDescription,
          outcome: summary.outcome,
          syncedAt: new Date().toISOString(),
          erpSynced: true,
        });
        refreshUnsyncedCount();
      }
      toast.success("Job synced to ERP");
      // Return to main menu after a brief delay
      setTimeout(() => {
        setSummary(null);
        setConfidenceData(null);
        setTranscriptLines([]);
        setDebugData(null);
        setSynced(false);
        setSyncedCRM(false);
        setEditingJobId(null);
        setAppState("idle");
      }, 1200);
    } catch (err) {
      setSyncingCRM(false);
      toast.error(err instanceof Error ? err.message : "ERP sync failed");
    }
  }, [summary, syncToERP, editingJobId, refreshUnsyncedCount]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FieldHeader onHistoryClick={() => setHistoryOpen(true)} isSyncingQueue={isProcessing} pendingCount={pendingCount} isRecording={appState === "recording"} recordingDuration={duration} theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pb-8">
        {/* Offline Banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-sm font-mono"
            >
              <WifiOff className="w-4 h-4 shrink-0" />
              You are offline — recordings will be saved locally
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unsynced ERP Banner */}
        <AnimatePresence>
          {unsyncedErpCount > 0 && appState !== "recording" && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onClick={() => setHistoryOpen(true)}
              className="mb-4 w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-mono hover:bg-primary/15 transition-colors"
            >
              <Send className="w-4 h-4 shrink-0" />
              You have {unsyncedErpCount} record{unsyncedErpCount > 1 ? "s" : ""} to sync to ERP
            </motion.button>
          )}
        </AnimatePresence>

        <section className="py-10 flex flex-col items-center gap-4">
          <AudioWaveform active={appState === "recording"} />

          <RecordButton
            isRecording={appState === "recording"}
            onClick={handleToggleRecord}
            duration={duration}
          />

          <motion.p
            key={appState}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-muted-foreground text-center mt-2 font-mono"
          >
            {appState === "idle" && "Ready to record."}
            {appState === "recording" && "Recording — tap to stop."}
            {appState === "processing" && ""}
            {appState === "result" && "Tap microphone to record again."}
          </motion.p>

          <AnimatePresence>
            {appState === "processing" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-3 px-5 py-3 rounded-lg bg-secondary border border-border"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                />
                <span className="text-sm font-mono text-foreground">
                  Extracting job details...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Transcript */}
        <section className="mb-4">
          <TranscriptPanel
            lines={transcriptLines}
            isRecording={appState === "recording"}
          />
        </section>

        {/* Summary Card */}
        <AnimatePresence>
          {appState === "result" && summary && (
            <section className="mb-4">
              <SummaryCard
                data={summary}
                confidence={confidenceData || undefined}
                isOnline={isOnline}
                onAccept={handleAccept}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onSyncCRM={handleSyncCRM}
                syncing={syncing}
                synced={synced}
                syncingCRM={syncingCRM}
                syncedCRM={syncedCRM}
              />
            </section>
          )}
        </AnimatePresence>

        {/* Developer Mode Toggle */}
        <section className="mt-8 mb-4">
          <button
            onClick={() => setDevMode((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <Code className="w-3 h-3" />
            Developer Mode
            {devMode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <AnimatePresence>
            {devMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-2">
                  {/* Raw Transcript */}
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-2 border-b border-border bg-secondary/50">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                        Raw Transcript (Whisper)
                      </span>
                    </div>
                    <pre className="p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto">
                      {debugData?.rawTranscript || "No data yet. Record something first."}
                    </pre>
                  </div>

                  {/* Raw JSON */}
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-2 border-b border-border bg-secondary/50">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                        Raw JSON (AI Extraction)
                      </span>
                    </div>
                    <pre className="p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto">
                      {debugData?.rawExtraction
                        ? JSON.stringify(debugData.rawExtraction, null, 2)
                        : "No data yet. Record something first."}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <HistoryPanel
        open={historyOpen}
        onClose={() => { setHistoryOpen(false); refreshUnsyncedCount(); }}
        pendingCount={pendingCount}
        isSyncingQueue={isProcessing}
        onSyncNow={processQueue}
        onSyncJobToERP={async (job: JobRecord) => {
          await syncToERP({
            site: job.site,
            asset: job.asset,
            jobDescription: job.jobDescription,
            outcome: job.outcome,
          });
          refreshUnsyncedCount();
        }}
        onEditJob={handleEditFromHistory}
      />
    </div>
  );
};

export default Index;

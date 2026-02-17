import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import FieldHeader from "@/components/FieldHeader";
import RecordButton from "@/components/RecordButton";
import AudioWaveform from "@/components/AudioWaveform";
import TranscriptPanel from "@/components/TranscriptPanel";
import SummaryCard from "@/components/SummaryCard";

type AppState = "idle" | "recording" | "processing" | "result";

interface SummaryData {
  site: string;
  asset: string;
  jobDescription: string;
  outcome: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const Index = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [duration, setDuration] = useState(0);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

      mediaRecorder.start(1000); // collect chunks every second
      mediaRecorderRef.current = mediaRecorder;

      setAppState("recording");
      setDuration(0);
      setTranscriptLines([]);
      setSummary(null);
      setSynced(false);
      setSyncing(false);
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
        // Stop all tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setAppState("processing");

    try {
      // Step 1: Transcribe with Whisper
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
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

      // Display transcript
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      setTranscriptLines(sentences.map((s: string) => s.trim()));

      // Step 2: Extract details with AI
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
      setSummary({
        site: extracted.site || "Unknown",
        asset: extracted.asset || "Unknown",
        jobDescription: extracted.description || "No description extracted",
        outcome: extracted.outcome || "Unknown",
      });
      setAppState("result");
    } catch (err) {
      console.error("Processing error:", err);
      toast.error(err instanceof Error ? err.message : "Processing failed");
      setAppState("idle");
    }
  }, []);

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

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FieldHeader />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pb-8">
        {/* Recording Area */}
        <section className="py-10 flex flex-col items-center gap-4">
          <AudioWaveform active={appState === "recording"} />

          <RecordButton
            isRecording={appState === "recording"}
            onClick={handleToggleRecord}
            duration={duration}
          />

          {/* Status Text */}
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

          {/* Processing State */}
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
                onSync={handleSync}
                syncing={syncing}
                synced={synced}
              />
            </section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;

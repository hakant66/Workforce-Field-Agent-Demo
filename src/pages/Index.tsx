import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FieldHeader from "@/components/FieldHeader";
import RecordButton from "@/components/RecordButton";
import AudioWaveform from "@/components/AudioWaveform";
import TranscriptPanel from "@/components/TranscriptPanel";
import SummaryCard from "@/components/SummaryCard";

type AppState = "idle" | "recording" | "processing" | "result";

const demoTranscriptLines = [
  "Arrived at Site 7B, north cooling tower.",
  "Inspecting asset CT-204, centrifugal chiller unit.",
  "Noticed abnormal vibration on the compressor shaft bearing.",
  "Replaced worn coupling insert and re-aligned shaft.",
  "Unit running within normal parameters after repair.",
  "Job completed, ready for sign-off.",
];

const demoSummary = {
  site: "Site 7B — North Cooling Tower",
  asset: "CT-204 Centrifugal Chiller",
  jobDescription:
    "Compressor shaft bearing showed abnormal vibration. Replaced worn coupling insert and performed shaft re-alignment.",
  outcome:
    "Unit restored to normal operating parameters. No further action required.",
};

const Index = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [duration, setDuration] = useState(0);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Simulate transcript lines appearing during recording
  useEffect(() => {
    if (appState === "recording") {
      let lineIndex = 0;
      const addLine = () => {
        if (lineIndex < demoTranscriptLines.length) {
          setTranscriptLines((prev) => [...prev, demoTranscriptLines[lineIndex]]);
          lineIndex++;
          lineTimerRef.current = setTimeout(addLine, 1800 + Math.random() * 1200);
        }
      };
      lineTimerRef.current = setTimeout(addLine, 1200);
    }
    return () => {
      if (lineTimerRef.current) clearTimeout(lineTimerRef.current);
    };
  }, [appState]);

  const handleToggleRecord = useCallback(() => {
    if (appState === "idle" || appState === "result") {
      // Start recording
      setAppState("recording");
      setDuration(0);
      setTranscriptLines([]);
      setSynced(false);
      setSyncing(false);
    } else if (appState === "recording") {
      // Stop → processing
      setAppState("processing");
      setTimeout(() => {
        setAppState("result");
      }, 2500);
    }
  }, [appState]);

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
          {appState === "result" && (
            <section className="mb-4">
              <SummaryCard
                data={demoSummary}
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

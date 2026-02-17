import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, FileText } from "lucide-react";
import RecordButton, { WaveformVisualizer, TranscriptionCard } from "@/components/RecordingUI";

interface Transcription {
  id: string;
  text: string;
  timestamp: Date;
  duration: number;
}

// Demo transcription snippets for simulation
const demoTexts = [
  "Inspected HVAC unit on rooftop. Compressor is running but making unusual noise. Recommended replacing the capacitor and scheduling a follow-up visit next week.",
  "Completed electrical panel inspection at Building C. All breakers are functioning properly. Noted minor corrosion on ground bus bar — applied anti-corrosion spray.",
  "Water heater replacement completed at unit 4B. Old unit showed significant sediment buildup. New 50-gallon tank installed and tested. Customer satisfied.",
  "Fire suppression system quarterly check done. All sprinkler heads clear, pressure gauge reading normal at 125 PSI. Updated inspection tag.",
  "Generator maintenance complete. Changed oil, replaced air filter, tested automatic transfer switch. Runtime logged at 842 hours.",
];

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoIndexRef = useRef(0);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      const recordedDuration = duration;
      setDuration(0);
      setIsProcessing(true);

      // Simulate transcription processing
      setTimeout(() => {
        const text = demoTexts[demoIndexRef.current % demoTexts.length];
        demoIndexRef.current++;
        setTranscriptions((prev) => [
          {
            id: crypto.randomUUID(),
            text,
            timestamp: new Date(),
            duration: recordedDuration,
          },
          ...prev,
        ]);
        setIsProcessing(false);
      }, 1500);
    } else {
      setIsRecording(true);
      setDuration(0);
    }
  }, [isRecording, duration]);

  const handleDelete = (id: string) => {
    setTranscriptions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">
              Field Service Audio to Text
            </h1>
            <p className="text-xs text-muted-foreground">
              Tap to record • Auto-transcribe notes
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-8">
        {/* Recording Section */}
        <section className="py-12 flex flex-col items-center gap-6">
          <WaveformVisualizer active={isRecording} />
          <RecordButton
            isRecording={isRecording}
            onClick={handleToggleRecord}
            duration={duration}
          />
          <p className="mt-6 text-sm text-muted-foreground text-center">
            {isRecording
              ? "Recording… tap to stop and transcribe"
              : isProcessing
              ? "Processing audio…"
              : "Tap the microphone to start recording"}
          </p>

          {/* Processing indicator */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full"
                />
                <span className="text-sm font-medium">Transcribing…</span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Transcriptions */}
        <section>
          {transcriptions.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Transcriptions ({transcriptions.length})
              </h2>
            </div>
          )}
          <div className="space-y-3">
            <AnimatePresence>
              {transcriptions.map((item) => (
                <TranscriptionCard key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>

          {transcriptions.length === 0 && !isRecording && !isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                No transcriptions yet.
                <br />
                Record your first field note above.
              </p>
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;

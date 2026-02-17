import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Clock, FileText, Trash2, Copy, Check } from "lucide-react";

interface Transcription {
  id: string;
  text: string;
  timestamp: Date;
  duration: number;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function RecordButton({
  isRecording,
  onClick,
  duration,
}: {
  isRecording: boolean;
  onClick: () => void;
  duration: number;
}) {
  return (
    <div className="relative flex items-center justify-center">
      {isRecording && (
        <>
          <motion.div
            className="absolute w-32 h-32 rounded-full bg-recording/20"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-32 h-32 rounded-full bg-recording/15"
            animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
          />
        </>
      )}
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 ${
          isRecording
            ? "bg-recording text-destructive-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-10 h-10" />}
      </motion.button>
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-10 font-mono text-lg font-semibold text-recording"
        >
          {formatDuration(duration)}
        </motion.div>
      )}
    </div>
  );
}

export function WaveformVisualizer({ active }: { active: boolean }) {
  const bars = 24;
  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-accent"
          animate={
            active
              ? {
                  height: [6, 14 + Math.random() * 20, 6],
                }
              : { height: 6 }
          }
          transition={
            active
              ? {
                  duration: 0.4 + Math.random() * 0.4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.04,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

export function TranscriptionCard({ item, onDelete }: { item: Transcription; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-card border border-border rounded-lg p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Clock className="w-3 h-3" />
          <span>{formatTime(item.timestamp)}</span>
          <span className="text-border">•</span>
          <span>{formatDuration(item.duration)}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-recording hover:bg-muted transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-card-foreground">{item.text}</p>
    </motion.div>
  );
}

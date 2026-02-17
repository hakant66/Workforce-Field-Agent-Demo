import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";

interface RecordButtonProps {
  isRecording: boolean;
  onClick: () => void;
  duration: number;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export default function RecordButton({ isRecording, onClick, duration }: RecordButtonProps) {
  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Outer glow rings */}
      {isRecording && (
        <>
          <motion.div
            className="absolute w-28 h-28 rounded-full border-2 border-recording/30"
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-28 h-28 rounded-full border border-recording/20"
            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
          />
        </>
      )}

      {/* Button */}
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.9 }}
        className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
          isRecording
            ? "bg-recording border-recording/60 animate-glow-pulse"
            : "bg-secondary border-border hover:border-primary/50 hover:bg-secondary/80"
        }`}
      >
        {isRecording ? (
          <Square className="w-7 h-7 text-destructive-foreground" />
        ) : (
          <Mic className="w-9 h-9 text-muted-foreground" />
        )}
      </motion.button>

      {/* Duration / Status */}
      {isRecording && (
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-xl font-semibold text-recording tracking-wider"
        >
          {formatDuration(duration)}
        </motion.span>
      )}
    </div>
  );
}

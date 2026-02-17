import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TranscriptPanelProps {
  lines: string[];
  isRecording: boolean;
}

export default function TranscriptPanel({ lines, isRecording }: TranscriptPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
            Live Transcript
          </span>
        </div>
        {isRecording && (
          <motion.div
            animate={{ opacity: [1, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            className="flex items-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-recording" />
            <span className="text-[10px] font-mono text-recording">REC</span>
          </motion.div>
        )}
      </div>

      <ScrollArea className="h-36">
        <div className="p-4 space-y-1.5">
          <AnimatePresence>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground italic font-mono">
                {isRecording ? "Listening..." : "Transcript will appear here."}
              </p>
            ) : (
              lines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="text-sm text-card-foreground leading-relaxed font-mono"
                >
                  {line}
                </motion.p>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

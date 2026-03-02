import { Signal, Wifi, Battery, History, Loader2, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ckdeltaLogo from "@/assets/ckdelta-logo.png";

interface FieldHeaderProps {
  onHistoryClick?: () => void;
  isSyncingQueue?: boolean;
  pendingCount?: number;
  isRecording?: boolean;
  recordingDuration?: number;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export default function FieldHeader({ onHistoryClick, isSyncingQueue, pendingCount, isRecording, recordingDuration = 0, theme, onToggleTheme }: FieldHeaderProps) {
  return (
    <header className={`border-b sticky top-0 z-30 overflow-hidden transition-colors duration-300 ${isRecording ? "bg-recording/10 border-recording/30" : "bg-header-bg border-header-border"}`}>
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div
          className="w-full h-8 bg-gradient-to-b from-transparent via-foreground/30 to-transparent"
          style={{ animation: "scan-line 4s linear infinite" }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between relative">
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <div>
            <img src={ckdeltaLogo} alt="CKDelta logo" className="w-9 h-9 rounded object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-foreground uppercase">
              Workforce Field Agent
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-widest">
              CKDelta v2.4
            </p>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Recording indicator */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-recording/15 border border-recording/30 overflow-hidden"
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-recording"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-[10px] font-mono text-recording font-semibold whitespace-nowrap tracking-wider">
                  REC {formatDuration(recordingDuration)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Queue syncing indicator */}
          <AnimatePresence>
            {isSyncingQueue && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20 overflow-hidden"
              >
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                <span className="text-[10px] font-mono text-primary whitespace-nowrap">
                  Syncing {pendingCount}...
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {onHistoryClick && (
            <button
              onClick={onHistoryClick}
              className="p-1.5 rounded hover:bg-secondary transition-colors relative"
              title="Job History"
            >
              <History className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              {(pendingCount ?? 0) > 0 && !isSyncingQueue && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded hover:bg-secondary transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              ) : (
                <Moon className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              )}
            </button>
          )}
          <SignalBars strength={3} />
          <div className="flex items-center gap-1 text-muted-foreground">
            <Wifi className="w-3.5 h-3.5 text-signal" />
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Battery className="w-4 h-4 text-signal" />
            <span className="text-[10px] font-mono text-signal">87%</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function SignalBars({ strength }: { strength: number }) {
  return (
    <div className="flex items-end gap-[2px]" title={`Signal: ${strength}/4`}>
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={`w-[3px] rounded-sm transition-colors ${
            level <= strength ? "bg-signal" : "bg-muted"
          }`}
          style={{
            height: `${6 + level * 3}px`,
            animation:
              level <= strength ? `signal-pulse 2s ease-in-out ${level * 0.2}s infinite` : "none",
          }}
        />
      ))}
    </div>
  );
}

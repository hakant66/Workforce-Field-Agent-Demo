import { Signal, Wifi, Battery, History, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ckdeltaLogo from "@/assets/ckdelta-logo.png";

interface FieldHeaderProps {
  onHistoryClick?: () => void;
  isSyncingQueue?: boolean;
  pendingCount?: number;
  isRecording?: boolean;
  recordingDuration?: number;
}

export default function FieldHeader({ onHistoryClick, isSyncingQueue, pendingCount }: FieldHeaderProps) {
  return (
    <header className="bg-header-bg border-b border-header-border sticky top-0 z-30 overflow-hidden">
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

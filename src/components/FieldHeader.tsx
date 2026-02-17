import { Signal, Wifi, Battery, History } from "lucide-react";

interface FieldHeaderProps {
  onHistoryClick?: () => void;
}

export default function FieldHeader({ onHistoryClick }: FieldHeaderProps) {
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
          <div className="relative">
            <div className="w-9 h-9 rounded bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="text-primary font-bold text-sm font-mono">Δ</span>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-signal animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-foreground uppercase">
              Workforce Field Agent
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-widest">
              DELTA SYSTEMS v2.4
            </p>
          </div>
        </div>

        {/* Signal Strength Indicator */}
        <div className="flex items-center gap-3">
          {onHistoryClick && (
            <button
              onClick={onHistoryClick}
              className="p-1.5 rounded hover:bg-secondary transition-colors"
              title="Job History"
            >
              <History className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
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

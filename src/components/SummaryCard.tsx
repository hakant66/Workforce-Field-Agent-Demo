import { motion } from "framer-motion";
import { MapPin, Wrench, FileText, CheckCircle, Upload } from "lucide-react";

interface SummaryData {
  site: string;
  asset: string;
  jobDescription: string;
  outcome: string;
}

interface SummaryCardProps {
  data: SummaryData;
  onSync: () => void;
  syncing: boolean;
  synced: boolean;
}

const fields = [
  { key: "site" as const, label: "Site", icon: MapPin },
  { key: "asset" as const, label: "Asset", icon: Wrench },
  { key: "jobDescription" as const, label: "Job Description", icon: FileText },
  { key: "outcome" as const, label: "Outcome", icon: CheckCircle },
];

export default function SummaryCard({ data, onSync, syncing, synced }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-card border border-border rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border bg-secondary/50 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
          Job Summary
        </span>
        <span className="text-[10px] font-mono text-signal bg-signal/10 px-2 py-0.5 rounded-sm">
          EXTRACTED
        </span>
      </div>

      {/* Fields */}
      <div className="p-4 space-y-3">
        {fields.map(({ key, label, icon: Icon }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex gap-3"
          >
            <div className="mt-0.5 w-7 h-7 rounded bg-secondary flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">
                {label}
              </p>
              <p className="text-sm text-card-foreground leading-snug">{data[key]}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sync Button */}
      <div className="px-4 pb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSync}
          disabled={syncing || synced}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-md font-semibold text-sm transition-all duration-300 ${
            synced
              ? "bg-signal/15 text-signal border border-signal/30"
              : syncing
              ? "bg-secondary text-muted-foreground border border-border"
              : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/50"
          }`}
        >
          {synced ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Synced to ERP
            </>
          ) : syncing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full"
              />
              Syncing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Sync to ERP
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

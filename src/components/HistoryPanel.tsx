import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, MapPin, Wrench, Trash2, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface JobRecord {
  id: string;
  site: string;
  asset: string;
  outcome: string;
  jobDescription: string;
  aiConfidence?: number;
  syncedAt: string;
}

const STORAGE_KEY = "workforce-job-history";

export function loadJobHistory(): JobRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveJobToHistory(job: Omit<JobRecord, "id" | "syncedAt">): JobRecord {
  const record: JobRecord = {
    ...job,
    id: crypto.randomUUID(),
    syncedAt: new Date().toISOString(),
  };
  const history = loadJobHistory();
  history.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return record;
}

export function clearJobHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadJobHistoryCsv() {
  const jobs = loadJobHistory();
  if (jobs.length === 0) return;

  const headers = ["Date", "Site", "Asset", "Description", "Outcome", "AI Confidence"];
  const rows = jobs.map((job) => [
    new Date(job.syncedAt).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }),
    escapeCsvField(job.site),
    escapeCsvField(job.asset),
    escapeCsvField(job.jobDescription),
    escapeCsvField(job.outcome),
    job.aiConfidence != null ? `${job.aiConfidence}%` : "N/A",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Field_Service_Report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);

  useEffect(() => {
    if (open) setJobs(loadJobHistory());
  }, [open]);

  const handleClear = () => {
    clearJobHistory();
    setJobs([]);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  Job History
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  ({jobs.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {jobs.length > 0 && (
                  <>
                    <button
                      onClick={() => downloadJobHistoryCsv()}
                      className="flex items-center gap-1 text-[10px] font-mono text-primary/70 hover:text-primary transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      CSV
                    </button>
                    <button
                      onClick={handleClear}
                      className="flex items-center gap-1 text-[10px] font-mono text-destructive/70 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <History className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-sm font-mono">No jobs recorded yet.</p>
                  <p className="text-xs font-mono text-muted-foreground/60 mt-1">
                    Synced jobs will appear here.
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {jobs.map((job, i) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-card border border-border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-muted-foreground/60">
                          {new Date(job.syncedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-sm ${
                            job.outcome === "Completed"
                              ? "text-signal bg-signal/10"
                              : "text-recording bg-recording/10"
                          }`}
                        >
                          {job.outcome}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] font-mono uppercase text-muted-foreground/60">Site</p>
                            <p className="text-xs text-card-foreground">{job.site}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Wrench className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] font-mono uppercase text-muted-foreground/60">Asset</p>
                            <p className="text-xs text-card-foreground">{job.asset}</p>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {job.jobDescription}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

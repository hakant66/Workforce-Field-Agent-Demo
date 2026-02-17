import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Wrench, FileText, CheckCircle, Upload, Trash2, Check, Pencil, Info, Send } from "lucide-react";

interface FieldConfidence {
  value: string;
  confidence: number;
  reasoning: string;
}

export interface SummaryData {
  site: string;
  asset: string;
  jobDescription: string;
  outcome: string;
}

export interface ConfidenceData {
  site?: FieldConfidence;
  asset?: FieldConfidence;
  description?: FieldConfidence;
  outcome?: FieldConfidence;
}

interface SummaryCardProps {
  data: SummaryData;
  confidence?: ConfidenceData;
  onAccept: () => void;
  onDelete: () => void;
  onUpdate: (updated: SummaryData) => void;
  onSyncCRM?: () => void;
  syncing: boolean;
  synced: boolean;
  syncingCRM?: boolean;
  syncedCRM?: boolean;
}

const fieldsMeta = [
  { key: "site" as const, confKey: "site" as const, label: "Site", icon: MapPin },
  { key: "asset" as const, confKey: "asset" as const, label: "Asset", icon: Wrench },
  { key: "jobDescription" as const, confKey: "description" as const, label: "Job Description", icon: FileText },
  { key: "outcome" as const, confKey: "outcome" as const, label: "Outcome", icon: CheckCircle },
];

function confidenceColor(score: number) {
  if (score >= 80) return "text-signal bg-signal/10 border-signal/20";
  if (score >= 50) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
  return "text-recording bg-recording/10 border-recording/20";
}

export default function SummaryCard({ data, confidence, onAccept, onDelete, onUpdate, onSyncCRM, syncing, synced, syncingCRM, syncedCRM }: SummaryCardProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<SummaryData>(data);
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);

  const handleStartEdit = () => {
    setEditData({ ...data });
    setEditing(true);
  };

  const handleSaveEdit = () => {
    onUpdate(editData);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

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
          {synced ? "ACCEPTED" : "REVIEW"}
        </span>
      </div>

      {/* Fields */}
      <div className="p-4 space-y-3">
        {fieldsMeta.map(({ key, confKey, label, icon: Icon }, i) => {
          const conf = confidence?.[confKey];
          const isUncertain = conf != null && conf.confidence < 75;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className={`flex gap-3 rounded-md p-2 -mx-2 transition-colors ${
                isUncertain ? "border border-yellow-400/40 bg-yellow-400/5" : ""
              }`}
              title={isUncertain ? "Uncertain — please double-check this field" : undefined}
            >
              <div className="mt-0.5 w-7 h-7 rounded bg-secondary flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {label}
                  </p>
                  {conf && (
                    <button
                      onClick={() => setExpandedReasoning(expandedReasoning === key ? null : key)}
                      className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${confidenceColor(conf.confidence)} cursor-pointer hover:opacity-80 transition-opacity`}
                    >
                      {conf.confidence}%
                      <Info className="w-2.5 h-2.5" />
                    </button>
                  )}
                  {isUncertain && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 border border-yellow-400/25">
                      ⚠ Uncertain
                    </span>
                  )}
                </div>

                {editing ? (
                  key === "outcome" ? (
                    <select
                      value={editData[key]}
                      onChange={(e) => setEditData((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full text-sm bg-secondary border border-border rounded px-2 py-1 text-card-foreground font-mono"
                    >
                      <option value="Completed">Completed</option>
                      <option value="Incomplete">Incomplete</option>
                    </select>
                  ) : key === "jobDescription" ? (
                    <textarea
                      value={editData[key]}
                      onChange={(e) => setEditData((prev) => ({ ...prev, [key]: e.target.value }))}
                      rows={2}
                      className="w-full text-sm bg-secondary border border-border rounded px-2 py-1 text-card-foreground resize-none"
                    />
                  ) : (
                    <input
                      value={editData[key]}
                      onChange={(e) => setEditData((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full text-sm bg-secondary border border-border rounded px-2 py-1 text-card-foreground"
                    />
                  )
                ) : (
                  <p className="text-sm text-card-foreground leading-snug">{data[key]}</p>
                )}

                {/* Reasoning tooltip */}
                {expandedReasoning === key && conf?.reasoning && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-[11px] text-muted-foreground mt-1 italic leading-relaxed"
                  >
                    {conf.reasoning}
                  </motion.p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 space-y-2">
        {editing ? (
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveEdit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/50 transition-all"
            >
              <Check className="w-4 h-4" />
              Save Changes
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCancelEdit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-semibold text-sm bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-all"
            >
              Cancel
            </motion.button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              {/* Accept */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onAccept}
                disabled={syncing || synced}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-semibold text-sm transition-all duration-300 ${
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
                    Accepted
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
                    <Check className="w-4 h-4" />
                    Accept
                  </>
                )}
              </motion.button>

              {/* Edit — always available */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleStartEdit}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md font-semibold text-sm bg-secondary text-foreground border border-border hover:bg-secondary/80 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </motion.button>

              {/* Delete */}
              {!synced && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onDelete}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md font-semibold text-sm bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </motion.button>
              )}
            </div>

            {/* Sync to ERP — appears after acceptance */}
            {synced && onSyncCRM && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSyncCRM}
                disabled={syncingCRM || syncedCRM}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-md font-semibold text-sm transition-all duration-300 ${
                  syncedCRM
                    ? "bg-signal/15 text-signal border border-signal/30"
                    : syncingCRM
                    ? "bg-secondary text-muted-foreground border border-border"
                    : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                }`}
              >
                {syncedCRM ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Synced to ERP
                  </>
                ) : syncingCRM ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full"
                    />
                    Syncing to ERP...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Sync to ERP
                  </>
                )}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

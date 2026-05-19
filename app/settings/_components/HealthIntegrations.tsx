"use client";

import { useState, useRef } from "react";
import { Activity, Upload, CheckCircle, AlertCircle, Loader2, Download, Info } from "lucide-react";

interface ParsedRow {
  date: string;
  weightKg: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let d = new Date(s);
  if (!isNaN(d.getTime())) return s;
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    d = new Date(Date.UTC(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2])));
    return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
  }
  return null;
}

function parseCSV(text: string, unit: "kg" | "lbs"): { rows: ParsedRow[]; errors: number } {
  const lines = text.trim().split(/\r?\n/);
  const rows: ParsedRow[] = [];
  let errors = 0;
  const lbsToKg = 0.453592;

  // Auto-detect header
  const startIdx = lines[0]?.toLowerCase().includes("date") || lines[0]?.toLowerCase().includes("weight") ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 2) { errors++; continue; }
    const date = parseDate(cols[0]);
    const raw = parseFloat(cols[1].replace(/[^\d.]/g, ""));
    if (!date || isNaN(raw) || raw <= 0) { errors++; continue; }
    const weightKg = unit === "lbs" ? raw * lbsToKg : raw;
    if (weightKg > 700 || weightKg < 10) { errors++; continue; }
    rows.push({ date, weightKg: Math.round(weightKg * 100) / 100 });
  }
  return { rows, errors };
}

const PLATFORMS = [
  {
    id: "apple",
    name: "Apple Health",
    icon: "🍎",
    steps: [
      "Open the Health app on your iPhone",
      "Tap your profile picture → Export All Health Data",
      "Unzip the archive and open the CSV export or use a third-party app to export weight as CSV",
      "Upload the CSV below (columns: date, weight)",
    ],
  },
  {
    id: "google",
    name: "Google Fit",
    icon: "🏃",
    steps: [
      "Go to Google Takeout (takeout.google.com)",
      "Select \"Fit\" → Customize → include Activity and Body metrics",
      "Download and extract the archive",
      "Find the weight CSV in the Fit folder and upload below",
    ],
  },
  {
    id: "garmin",
    name: "Garmin / Fitbit",
    icon: "⌚",
    steps: [
      "Export your weight data from Garmin Connect or Fitbit dashboard",
      "Look for a weight or body composition CSV in the export",
      "Upload the CSV below (columns: date, weight)",
    ],
  },
];

export function HealthIntegrations() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null); setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors } = parseCSV(text, unit);
      setPreview(rows);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  }

  async function importData() {
    if (!preview || preview.length === 0) return;
    setUploading(true); setError(null);
    try {
      const res = await fetch("/api/import/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview, source: "health_import" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Import failed");
      setResult(data);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#18120E]/12 bg-[#FFF8E7] p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-[#00C8FF]" />
        <h2 className="text-lg font-semibold text-[#18120E]">Health Platform Integrations</h2>
      </div>

      <div className="rounded-xl border border-[#00C8FF]/30 bg-[#00C8FF]/5 p-4 flex gap-3">
        <Info className="h-4 w-4 text-[#00C8FF] shrink-0 mt-0.5" />
        <p className="text-sm text-[#18120E]/70">
          Apple Health and Google Fit use proprietary APIs that require native apps.
          You can still import your historical weight data by exporting a CSV from your health platform.
        </p>
      </div>

      {/* Platform guides */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B5738]">How to export from your platform</p>
        {PLATFORMS.map((p) => (
          <div key={p.id} className="rounded-xl border border-[#18120E]/10 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#FFF0B8] transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-[#18120E]">
                <span>{p.icon}</span> {p.name}
              </span>
              <span className="text-[#6B5738] text-xs">{expanded === p.id ? "▲" : "▼"}</span>
            </button>
            {expanded === p.id && (
              <div className="border-t border-[#18120E]/8 px-4 py-3 bg-[#FFF0B8]">
                <ol className="space-y-1.5 text-sm text-[#18120E]/80">
                  {p.steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#6B5738] shrink-0 font-mono text-xs mt-0.5">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CSV import */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B5738]">Import Weight Data</p>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[#18120E]">Weight unit in your CSV:</span>
          <div className="flex rounded-lg border border-[#18120E]/20 bg-[#FFF0B8] p-0.5">
            {(["kg", "lbs"] as const).map((u) => (
              <button
                key={u}
                onClick={() => { setUnit(u); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  unit === u ? "bg-[#18120E] text-[#DFFF35]" : "text-[#6B5738] hover:bg-[#FFE8A8]"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#18120E]/20 bg-[#FFF0B8] p-8 cursor-pointer hover:border-[#18120E]/40 hover:bg-[#FFE8A8] transition-colors"
        >
          <Upload className="h-8 w-8 text-[#6B5738]" />
          <div className="text-center">
            <p className="text-sm font-medium text-[#18120E]">Upload weight CSV</p>
            <p className="text-xs text-[#8A7350] mt-0.5">
              Two columns: date (YYYY-MM-DD or MM/DD/YYYY) and weight ({unit})
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
        </div>

        {/* Preview */}
        {preview && preview.length > 0 && (
          <div className="rounded-xl border border-[#18120E]/12 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#18120E]/8 bg-[#FFF0B8]">
              <p className="text-sm font-medium text-[#18120E]">
                {preview.length} entries parsed
                {parseErrors > 0 && <span className="ml-2 text-xs text-[#8A7350]">({parseErrors} skipped)</span>}
              </p>
              <button
                onClick={importData}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-lg border-2 border-[#18120E] bg-[#00C875] px-3 py-1.5 text-xs font-semibold text-[#18120E] shadow-[2px_2px_0_#18120E] hover:bg-[#DFFF35] disabled:opacity-40 transition-colors"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Import
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-[#18120E]/6">
              {preview.slice(0, 10).map((row, i) => (
                <div key={i} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-[#18120E]">{row.date}</span>
                  <span className="text-[#6B5738]">{row.weightKg} kg</span>
                </div>
              ))}
              {preview.length > 10 && (
                <div className="px-4 py-2 text-xs text-[#8A7350]">…and {preview.length - 10} more</div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 rounded-lg border border-[#00C875]/30 bg-[#00C875]/10 p-3">
            <CheckCircle className="h-4 w-4 text-[#00895A]" />
            <p className="text-sm text-[#18120E]">
              Imported <strong>{result.imported}</strong> entries
              {result.skipped > 0 && `, ${result.skipped} skipped`}.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

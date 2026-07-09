"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Trash2, Plus } from "lucide-react";

interface BodyMeasurement {
  id: string;
  date: string;
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  thighCm: number | null;
  bicepCm: number | null;
  shoulderCm: number | null;
  neckCm: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  source: string;
  createdAt: string;
}

type MeasurementKey = Exclude<
  keyof Omit<BodyMeasurement, "id" | "date" | "source" | "createdAt">,
  never
>;

// Vault chart palette, in order — var(--chart-1..5), cycled
const MEASUREMENT_FIELDS: { key: MeasurementKey; label: string; unit: string; color: string }[] = [
  { key: "waistCm", label: "Waist", unit: "cm", color: "var(--chart-1)" },
  { key: "hipsCm", label: "Hips", unit: "cm", color: "var(--chart-2)" },
  { key: "chestCm", label: "Chest", unit: "cm", color: "var(--chart-3)" },
  { key: "thighCm", label: "Thigh", unit: "cm", color: "var(--chart-4)" },
  { key: "bicepCm", label: "Bicep", unit: "cm", color: "var(--chart-5)" },
  { key: "shoulderCm", label: "Shoulder", unit: "cm", color: "var(--chart-1)" },
  { key: "neckCm", label: "Neck", unit: "cm", color: "var(--chart-2)" },
  { key: "bodyFatPct", label: "Body Fat", unit: "%", color: "var(--chart-3)" },
  { key: "muscleMassKg", label: "Muscle Mass", unit: "kg", color: "var(--chart-4)" },
];

export default function BodyMeasurements() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<MeasurementKey[]>([
    "waistCm",
    "bodyFatPct",
  ]);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    waistCm: "",
    hipsCm: "",
    chestCm: "",
    thighCm: "",
    bicepCm: "",
    shoulderCm: "",
    neckCm: "",
    bodyFatPct: "",
    muscleMassKg: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMeasurements();
  }, []);

  const fetchMeasurements = async () => {
    try {
      const res = await fetch("/api/body-measurements?limit=100");
      const data = await res.json();
      if (data.success) {
        setMeasurements(data.measurements);
      }
    } catch (error) {
      console.error("Failed to fetch measurements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      date: formData.date,
    };

    for (const field of MEASUREMENT_FIELDS) {
      const val = formData[field.key];
      if (val && !isNaN(parseFloat(val))) {
        payload[field.key] = parseFloat(val);
      }
    }

    try {
      const res = await fetch("/api/body-measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFormData({
          date: format(new Date(), "yyyy-MM-dd"),
          waistCm: "",
          hipsCm: "",
          chestCm: "",
          thighCm: "",
          bicepCm: "",
          shoulderCm: "",
          neckCm: "",
          bodyFatPct: "",
          muscleMassKg: "",
        });
        setShowForm(false);
        await fetchMeasurements();
      }
    } catch (error) {
      console.error("Failed to save measurement:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/body-measurements?id=${id}`, {
        method: "DELETE",
      });
      await fetchMeasurements();
    } catch (error) {
      console.error("Failed to delete measurement:", error);
    }
  };

  const toggleMetric = (key: MeasurementKey) => {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const chartData = measurements
    .slice()
    .reverse()
    .map((m) => ({
      date: format(parseISO(m.date), "MMM d"),
      fullDate: m.date,
      ...Object.fromEntries(
        MEASUREMENT_FIELDS.map((f) => [f.key, m[f.key]])
      ),
    }));

  if (loading) {
    return (
      <section className="surface p-6">
        <div className="text-center smallcaps">Loading...</div>
      </section>
    );
  }

  return (
    <section className="surface overflow-hidden">
      <div className="foil" />
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="smallcaps">Body Measurements</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-ghost h-8 px-3 text-xs"
        >
          <Plus className="h-4 w-4 mr-1" />
          Log
        </button>
      </div>
      <div className="space-y-4 px-5 py-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-sm border border-border bg-secondary p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="measure-date" className="smallcaps">Date</Label>
                <Input
                  id="measure-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                  className="num rounded-sm"
                />
              </div>
              {MEASUREMENT_FIELDS.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key} className="smallcaps">
                    {field.label} ({field.unit})
                  </Label>
                  <Input
                    id={field.key}
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData[field.key]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [field.key]: e.target.value,
                      })
                    }
                    className="num rounded-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary h-8 px-4 text-xs">
                {submitting ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-ghost h-8 px-4 text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {measurements.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No measurements logged yet. Click &quot;Log&quot; to start tracking.
          </div>
        ) : (
          <>
            {/* Metric toggles */}
            <div className="flex flex-wrap gap-2">
              {MEASUREMENT_FIELDS.map((field) => (
                <button
                  key={field.key}
                  onClick={() => toggleMetric(field.key)}
                  className={
                    selectedMetrics.includes(field.key)
                      ? "pill"
                      : "smallcaps rounded-sm border border-border px-2 py-[0.1875rem] transition-colors hover:border-[var(--brass)]"
                  }
                >
                  {field.label}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,20,13,0.08)" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.25rem",
                      boxShadow: "0 1px 0 rgba(23,20,13,0.05), 0 12px 30px rgba(23,20,13,0.08)",
                      fontSize: "12px",
                      color: "var(--foreground)",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  {MEASUREMENT_FIELDS.filter((f) =>
                    selectedMetrics.includes(f.key)
                  ).map((field) => (
                    <Line
                      key={field.key}
                      type="monotone"
                      dataKey={field.key}
                      stroke={field.color}
                      strokeWidth={2}
                      dot={false}
                      name={field.label}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Recent entries — statement rows */}
            <div>
              {measurements.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border-t border-border py-2.5 first:border-t-0"
                >
                  <span className="num text-xs text-muted-foreground w-20 shrink-0">
                    {format(parseISO(m.date), "MMM d, yyyy")}
                  </span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 flex-1 justify-end">
                    {MEASUREMENT_FIELDS.map((field) =>
                      m[field.key] !== null ? (
                        <span key={field.key} className="num text-xs text-foreground">
                          <span style={{ color: field.color }}>&#9679;</span>{" "}
                          {m[field.key]}
                          {field.unit}
                        </span>
                      ) : null
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="h-6 w-6 ml-2 flex items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Delete measurement"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

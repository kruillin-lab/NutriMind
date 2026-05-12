"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const MEASUREMENT_FIELDS: { key: MeasurementKey; label: string; unit: string; color: string }[] = [
  { key: "waistCm", label: "Waist", unit: "cm", color: "#3b82f6" },
  { key: "hipsCm", label: "Hips", unit: "cm", color: "#8b5cf6" },
  { key: "chestCm", label: "Chest", unit: "cm", color: "#06b6d4" },
  { key: "thighCm", label: "Thigh", unit: "cm", color: "#f59e0b" },
  { key: "bicepCm", label: "Bicep", unit: "cm", color: "#10b981" },
  { key: "shoulderCm", label: "Shoulder", unit: "cm", color: "#ef4444" },
  { key: "neckCm", label: "Neck", unit: "cm", color: "#6366f1" },
  { key: "bodyFatPct", label: "Body Fat", unit: "%", color: "#ec4899" },
  { key: "muscleMassKg", label: "Muscle Mass", unit: "kg", color: "#14b8a6" },
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
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Body Measurements</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Log
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="measure-date">Date</Label>
                <Input
                  id="measure-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>
              {MEASUREMENT_FIELDS.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key}>
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
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {measurements.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 text-sm">
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
                  className={`px-2 py-1 text-xs rounded-full border transition ${
                    selectedMetrics.includes(field.key)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent"
                  }`}
                >
                  {field.label}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
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

            {/* Recent entries */}
            <div className="space-y-2">
              {measurements.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                >
                  <span className="text-muted-foreground w-20">
                    {format(parseISO(m.date), "MMM d, yyyy")}
                  </span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 flex-1 justify-end">
                    {MEASUREMENT_FIELDS.map((field) =>
                      m[field.key] !== null ? (
                        <span key={field.key} className="text-xs">
                          <span style={{ color: field.color }}>●</span>{" "}
                          {m[field.key]}
                          {field.unit}
                        </span>
                      ) : null
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => handleDelete(m.id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

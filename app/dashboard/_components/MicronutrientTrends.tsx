'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Nutrient {
  key: string;
  label: string;
  unit: string;
  target: number;
}

interface HistoryData {
  date: string;
  values: Record<string, number>;
}

interface NutritionHistoryResponse {
  days: number;
  nutrients: Nutrient[];
  data: HistoryData[];
}

// Approved chart palette, in order
const COLORS = [
  '#D97757', // terracotta
  '#7D8A63', // olive
  '#6A96B8', // slate blue
  '#D4A27F', // kraft
  '#8E6C88', // plum
  '#B3402F', // danger red
  '#C7913B', // amber
];

export default function MicronutrientTrends() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<NutritionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNutrients, setSelectedNutrients] = useState<string[]>(['fiberG', 'sugarG']);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/nutrition-history?days=${days}`);
        if (!response.ok) {
          throw new Error('Failed to fetch nutrition history');
        }
        const result = await response.json();
        setData(result);

        // Default to showing first 2 nutrients if none selected
        if (selectedNutrients.length === 0 && result.nutrients.length > 0) {
          setSelectedNutrients([result.nutrients[0].key, result.nutrients[1]?.key].filter(Boolean));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [days, selectedNutrients.length]);

  const toggleNutrient = (key: string) => {
    setSelectedNutrients(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getNutrientColor = (key: string) => {
    const index = data?.nutrients.findIndex(n => n.key === key) ?? 0;
    return COLORS[index % COLORS.length];
  };

  const getNutrientLabel = (key: string) => {
    return data?.nutrients.find(n => n.key === key)?.label ?? key;
  };

  if (loading) {
    return (
      <section className="surface mt-6 flex min-h-[300px] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="surface mt-6 flex min-h-[300px] items-center justify-center p-6 text-center text-destructive">
        Error loading trends: {error}
      </section>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <section className="surface mt-6 flex min-h-[300px] items-center justify-center p-6 text-center text-muted-foreground">
        No nutrition data available for the selected period.
      </section>
    );
  }

  // Transform data for Recharts
  const chartData = data.data.map(item => ({
    date: formatDate(item.date),
    fullDate: item.date,
    ...item.values,
  }));

  return (
    <section className="surface mt-6 overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-sm font-semibold text-foreground">Micronutrient Trends</h3>
          <div className="flex gap-2">
            {[7, 30, 90].map(dayOption => (
              <Button
                key={dayOption}
                variant={days === dayOption ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(dayOption)}
              >
                {dayOption}D
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {data.nutrients.map(nutrient => (
            <Button
              key={nutrient.key}
              variant={selectedNutrients.includes(nutrient.key) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleNutrient(nutrient.key)}
              className="text-xs"
              style={{
                backgroundColor: selectedNutrients.includes(nutrient.key)
                  ? getNutrientColor(nutrient.key)
                  : undefined,
              }}
            >
              {nutrient.label} ({nutrient.unit})
            </Button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,20,19,0.08)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload) return null;
                  return (
                    <div className="surface p-3">
                      <p className="font-semibold text-sm mb-1 text-foreground">{label}</p>
                      {(payload as unknown as { dataKey: string; color: string; value: number }[]).map((entry) => {
                        const nutrient = data.nutrients.find(n => n.key === entry.dataKey);
                        if (!nutrient) return null;
                        return (
                          <p
                            key={entry.dataKey}
                            className="text-sm"
                            style={{ color: entry.color }}
                          >
                            {nutrient.label}: {entry.value} {nutrient.unit}
                            <span className="text-muted-foreground ml-1">
                              / {nutrient.target} {nutrient.unit}
                            </span>
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }} />
              {selectedNutrients.map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={getNutrientColor(key)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  name={getNutrientLabel(key)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Click nutrient buttons above to show/hide lines on the chart.
          Target values shown in tooltips.
        </p>
      </div>
    </section>
  );
}

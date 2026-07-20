"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { getBabyProfile, getMeasurements } from "@/services/baby-service";
import { loadWhoData } from "@/utils/who";
import { buildGrowthSeries } from "@/utils/growth";
import type { BabyProfile, Measurement } from "@/types";

export function WeightChart() {
  const [baby, setBaby] = useState<BabyProfile | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [data, setData] = useState<Array<Record<string, string | number | null>>>([]);

  useEffect(() => {
    async function load() {
      const profile = await getBabyProfile();
      if (!profile) return;
      const rows = await getMeasurements(profile.id!);
      setBaby(profile);
      setMeasurements(rows);
      const whoSeries = await loadWhoData(profile.gender, "weight");
      const series = buildGrowthSeries(profile, rows, whoSeries, "weight");
      setData(series.map((item) => ({
        ageDays: item.ageDays,
        date: item.date,
        actual: item.actual,
        median: item.median,
        p3: item.p3,
        p97: item.p97,
        personalized: item.personalized,
      })));
    }

    void load();
  }, []);

  const chartData = useMemo(() => data, [data]);

  if (!baby || chartData.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Weight chart</h3>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#ecf0f4" vertical={false} />
            <XAxis dataKey="date" tick={false} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="median" stroke="#94a3b8" dot={false} />
            <Line type="monotone" dataKey="p3" stroke="#bae6fd" dot={false} />
            <Line type="monotone" dataKey="p97" stroke="#bae6fd" dot={false} />
            <Line type="monotone" dataKey="personalized" stroke="#0f766e" dot={false} />
            <Line type="monotone" dataKey="actual" stroke="#2563eb" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

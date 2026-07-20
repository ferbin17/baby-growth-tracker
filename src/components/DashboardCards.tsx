"use client";

import { useEffect, useMemo, useState } from "react";
import { getBabyProfile, getMeasurements } from "@/services/baby-service";
import { formatDisplayDate, getAgeLabel } from "@/utils/age";
import { getGrowthStatus, getLatestMeasurement } from "@/utils/growth";
import { formatWeightLabel, formatHeightLabel } from "@/utils/format";
import { GrowthStatusChart } from "@/components/GrowthStatusChart";
import type { BabyProfile, Measurement } from "@/types";

export function DashboardCards() {
  const [baby, setBaby] = useState<BabyProfile | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  useEffect(() => {
    async function load() {
      const profile = await getBabyProfile();
      if (profile) {
        setBaby(profile);
        const rows = await getMeasurements(profile.id!);
        setMeasurements(rows);
      }
    }

    void load();
  }, []);

  const latest = useMemo(() => getLatestMeasurement(measurements), [measurements]);

  if (!baby || !latest) {
    return null;
  }

  const birthDate = new Date(baby.birthDate);
  const latestWeight = latest.weightKg ?? baby.birthWeightKg;
  const latestHeight = latest.heightCm ?? baby.birthHeightCm;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Current age" value={getAgeLabel(birthDate, new Date())} />
      <MetricCard title="Latest weight" value={formatWeightLabel(latestWeight)} />
      <MetricCard title="Latest height" value={formatHeightLabel(latestHeight)} />
      <MetricCard title="Next measurement" value={formatDisplayDate(new Date())} />
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Growth status</p>
            <p className="text-xl font-semibold text-slate-900">{getGrowthStatus(latestWeight, baby.birthWeightKg, "weight")}</p>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Stable and trending</div>
        </div>
        <GrowthStatusChart baby={baby} measurements={measurements} noWrapper className="mt-6" />
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import { getLatestCompletedMeasurement, getMeasurements } from "@/services/baby-service";
import { useAuthStore } from "@/store/auth-store";

import { formatDisplayDate, getAgeLabel } from "@/utils/age";
import { getWeightForAgeReference } from "@/utils/growth";
import { formatHeightLabel, formatWeightLabel } from "@/utils/format";
import { GrowthStatusChart } from "@/components/GrowthStatusChart";
import { loadWhoData, type WhoPoint } from "@/utils/who";
import type { Measurement } from "@/types";
import { getNextUpcomingMeasurement } from "@/utils/measurement";

export function DashboardCards() {
  const baby = useAuthStore((state) => state.baby);

  const [latest, setLatest] = useState<Measurement | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [nextMeasurement, setNextMeasurement] = useState<Measurement | null>(null);
  const [whoWeight, setWhoWeight] = useState<WhoPoint[]>([]);

  useEffect(() => {
    async function load() {
      if (!baby) {
        return;
      }

      const [latestRow, measurementRows, who] = await Promise.all([
        getLatestCompletedMeasurement(baby.id!),
        getMeasurements(baby.id!),
        loadWhoData(baby.gender, "weight"),
      ]);

      setLatest(latestRow);
      setMeasurements(measurementRows);
      setWhoWeight(who);

      setNextMeasurement(getNextUpcomingMeasurement(measurementRows));
    }

    void load();
  }, [baby]);

  const weightReference = useMemo(
    () => getWeightForAgeReference(measurements, whoWeight),
    [measurements, whoWeight],
  );

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

      <MetricCard
        title="Next measurement"
        value={nextMeasurement ? formatDisplayDate(new Date(nextMeasurement.date)) : "Completed"}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Weight-for-age reference</p>

            <p className="text-xl font-semibold text-slate-900">{weightReference.label}</p>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {weightReference.description}
            </p>
          </div>

          <div
            className={
              weightReference.tone === "caution"
                ? "rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
                : "rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            }
          >
            {weightReference.trendLabel}
          </div>
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

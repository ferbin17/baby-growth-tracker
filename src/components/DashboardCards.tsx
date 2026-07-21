"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getBabyProfile,
  getLatestCompletedMeasurement,
  getMeasurements,
} from "@/services/baby-service";
import { formatDisplayDate, getAgeLabel } from "@/utils/age";
import { getGrowthStatus } from "@/utils/growth";
import { formatHeightLabel, formatWeightLabel } from "@/utils/format";
import { GrowthStatusChart } from "@/components/GrowthStatusChart";
import {
  calculatePercentileFromMeasurement,
  interpolateWhoPoint,
  loadWhoData,
  type WhoPoint,
} from "@/utils/who";
import type { BabyProfile, Measurement } from "@/types";
import { getNextUpcomingMeasurement } from "@/utils/measurement";

export function DashboardCards() {
  const [baby, setBaby] = useState<BabyProfile | null>(null);
  const [latest, setLatest] = useState<Measurement | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [nextMeasurement, setNextMeasurement] = useState<Measurement | null>(null);
  const [whoWeight, setWhoWeight] = useState<WhoPoint[]>([]);

  useEffect(() => {
    async function load() {
      const profile = await getBabyProfile();

      if (!profile) {
        return;
      }

      setBaby(profile);

      const [latestRow, measurementRows, who] = await Promise.all([
        getLatestCompletedMeasurement(profile.id!),
        getMeasurements(profile.id!),
        loadWhoData(profile.gender, "weight"),
      ]);

      setLatest(latestRow);
      setMeasurements(measurementRows);
      setWhoWeight(who);

      setNextMeasurement(getNextUpcomingMeasurement(measurementRows));
    }

    void load();
  }, []);

  const latestWeightPercentile = useMemo(() => {
    if (!latest || latest.weightKg == null || whoWeight.length === 0) {
      return null;
    }

    const point = interpolateWhoPoint(whoWeight, latest.ageDays);

    return calculatePercentileFromMeasurement(latest.weightKg, point);
  }, [latest, whoWeight]);

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
            <p className="text-sm font-medium text-slate-500">Growth status</p>

            <p className="text-xl font-semibold text-slate-900">
              {getGrowthStatus(latestWeightPercentile)}
            </p>
          </div>

          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            Stable and trending
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardCards } from "@/components/DashboardCards";
import { HeightChart } from "@/components/HeightChart";
import { WeightChart } from "@/components/WeightChart";
import { getBabyProfile, getMeasurements } from "@/services/baby-service";
import { hasPendingMeasurements } from "@/utils/measurement";
import type { BabyProfile, Measurement } from "@/types";

export function Dashboard() {
  const router = useRouter();
  const [baby, setBaby] = useState<BabyProfile | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const profile = await getBabyProfile();
      if (!profile) {
        router.replace("/setup");
        return;
      }

      const rows = await getMeasurements(profile.id!);
      if (hasPendingMeasurements(rows)) {
        router.replace("/measurements");
        return;
      }

      setBaby(profile);
      setMeasurements(rows);
      setIsLoaded(true);
    }

    void load();
  }, [router]);

  if (!isLoaded || !baby) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-3xl bg-linear-to-br from-emerald-600 to-teal-600 px-6 py-8 text-white shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-100">Growth dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">{baby.name}</h1>
            <p className="mt-2 text-sm text-emerald-100">A calm, medical-style overview of your child’s current growth trajectory.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => router.push("/measurements")}
              disabled={!hasPendingMeasurements(measurements)}
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/60 disabled:bg-white/5"
            >
              Record
            </button>
          </div>
        </div>
      </header>

      <DashboardCards />
      <div className="grid gap-6 lg:grid-cols-2">
        <WeightChart />
        <HeightChart />
      </div>
    </main>
  );
}

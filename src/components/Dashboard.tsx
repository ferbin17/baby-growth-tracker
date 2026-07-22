"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardCards } from "@/components/DashboardCards";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth-store";
import { hasPendingMeasurements } from "@/utils/measurement";
import { ensureMeasurementsForBaby, getMeasurements } from "@/services/baby-service";
import type { Measurement } from "@/types";

export function Dashboard() {
  const router = useRouter();

  const baby = useAuthStore((state) => state.baby);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  useEffect(() => {
    async function load() {
      if (!hasHydrated) return;

      if (!baby) {
        router.replace("/login");
        return;
      }

      let rows = await getMeasurements(baby.id!);

      if (baby.stage !== "complete" && hasPendingMeasurements(rows)) {
        router.replace("/measurements");
        return;
      }

      if (baby.stage === "complete") {
        rows = await ensureMeasurementsForBaby(baby.id!, baby);
      }

      setMeasurements(rows);
      setIsLoaded(true);
    }

    void load();
  }, [baby, hasHydrated, router]);

  if (!hasHydrated || !isLoaded || !baby) {
    return <PageLoader label="Loading dashboard…" />;
  }

  const canRecord = hasPendingMeasurements(measurements);

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-6">
        <header className="shrink-0 rounded-3xl bg-linear-to-br from-emerald-600 to-teal-600 px-6 py-8 text-white shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-100">
                Growth dashboard
              </p>

              <h1 className="mt-2 text-3xl font-semibold">{baby.name}</h1>

              <p className="mt-2 text-sm text-emerald-100">
                A calm, medical-style overview of your child’s current growth trajectory.
              </p>
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
                onClick={() => router.push("/record")}
                disabled={!canRecord}
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/60"
              >
                Record
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          <DashboardCards />
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureMeasurementsForBaby, getBabyProfile } from "@/services/baby-service";
import { RecordForm } from "@/components/RecordForm";
import { frequencyLabel, hasPendingMeasurements } from "@/utils/measurement";
import type { BabyProfile } from "@/types";

export default function RecordPage() {
  const router = useRouter();
  const [baby, setBaby] = useState<BabyProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function load() {
      const profile = await getBabyProfile();
      if (!profile) {
        router.replace("/setup");
        return;
      }

      // Setup bulk entry stays on /measurements until stage is complete.
      if (profile.stage !== "complete") {
        router.replace("/measurements");
        return;
      }

      if (!profile.id) {
        router.replace("/");
        return;
      }

      const rows = await ensureMeasurementsForBaby(profile.id, profile);
      if (!hasPendingMeasurements(rows)) {
        router.replace("/");
        return;
      }

      setBaby(profile);
      setIsReady(true);
    }

    void load();
  }, [router]);

  if (!isReady || !baby) {
    return null;
  }

  return (
    <main className="flex h-full min-h-0 w-full overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-6 overflow-y-auto">
        <header className="rounded-3xl bg-linear-to-br from-emerald-600 to-teal-600 px-6 py-8 text-white shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-100">
                {frequencyLabel(baby.measurementFrequency)} record
              </p>

              <h1 className="mt-2 text-3xl font-semibold">Record check-in</h1>

              <p className="mt-2 max-w-xl text-sm text-emerald-100">
                Log {baby.name}&apos;s weight, height, and notes for the current{" "}
                {frequencyLabel(baby.measurementFrequency)} frequency day.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Dashboard
            </button>
          </div>
        </header>

        <RecordForm baby={baby} />
      </div>
    </main>
  );
}

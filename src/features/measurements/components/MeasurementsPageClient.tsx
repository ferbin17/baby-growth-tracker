"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MeasurementTable } from "@/components/MeasurementTable";
import { PageLoader } from "@/components/ui/PageLoader";
import { getBabyProfile, getMeasurements, updateBabyProfile } from "@/services/baby-service";
import { useAuthStore } from "@/store/auth-store";
import type { BabyProfile } from "@/types";
import { hasPendingMeasurements } from "@/utils/measurement";

export function MeasurementsPageClient() {
  const router = useRouter();
  const [baby, setBaby] = useState<BabyProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    async function load() {
      if (!hasHydrated) return;

      const profile = await getBabyProfile();
      if (!profile?.id) {
        router.replace("/setup");
        return;
      }

      const rows = await getMeasurements(profile.id);
      if (!hasPendingMeasurements(rows)) {
        await updateBabyProfile(profile.id, { stage: "complete" });
        router.replace("/");
        return;
      }

      const activeProfile =
        profile.stage === "measure"
          ? profile
          : await updateBabyProfile(profile.id, { stage: "measure" });

      setBaby(activeProfile);
      setIsReady(true);
    }

    void load();
  }, [hasHydrated, router]);

  if (!hasHydrated || !isReady || !baby?.id) {
    return <PageLoader label="Loading measurements…" />;
  }

  return (
    <main className="flex h-full min-h-0 w-full overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-6">
        <header className="shrink-0 rounded-3xl bg-linear-to-br from-sky-600 to-indigo-600 px-6 py-8 text-white shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-100">Growth tracker</p>
              <h1 className="mt-2 text-3xl font-semibold">Measurements</h1>
            </div>

            <Link
              href="/setup?stage=measurement"
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Schedule setup
            </Link>
          </div>

          <p className="mt-1 max-w-2xl text-sm text-sky-100">
            Every row is generated from your baby’s profile and saved locally for instant use.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <MeasurementTable babyId={baby.id} />
        </div>
      </div>
    </main>
  );
}

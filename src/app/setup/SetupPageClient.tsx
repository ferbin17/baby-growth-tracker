"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BabyForm } from "@/components/BabyForm";
import { getBabyProfile } from "@/services/baby-service";
import { useAuthStore } from "@/store/auth-store";
import { PageLoader } from "@/components/ui/PageLoader";
import type { BabyProfile } from "@/types";

function getCurrentStepFromProfile(profile: BabyProfile | null | undefined) {
  if (!profile) {
    return 0;
  }

  if (profile.stage) {
    switch (profile.stage) {
      case "baby_detail":
        return 0;
      case "schedule":
        return 1;
      case "measure":
        return 1;
      case "security":
      case "complete":
        return 2;
      default:
        return 0;
    }
  }

  const hasBabyDetails = Boolean(
    profile.name?.trim() &&
    profile.gender &&
    profile.birthDate &&
    profile.birthWeightKg > 0 &&
    profile.birthHeightCm > 0,
  );

  if (!hasBabyDetails) {
    return 0;
  }

  const validFrequency = ["weekly", "biweekly", "monthly"].includes(profile.measurementFrequency);
  const validStartDate =
    !profile.startDate || new Date(profile.startDate) >= new Date(profile.birthDate);

  if (!validFrequency || !validStartDate) {
    return 1;
  }

  const passcodeIsValid =
    typeof profile.passcode === "string" && /^[0-9]{4}$/.test(profile.passcode);
  if (!passcodeIsValid) {
    return 2;
  }

  return 2;
}

function isSetupComplete(profile: BabyProfile | null) {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.name?.trim() &&
    profile.gender &&
    profile.birthDate &&
    profile.birthWeightKg > 0 &&
    profile.birthHeightCm > 0 &&
    ["weekly", "biweekly", "monthly"].includes(profile.measurementFrequency) &&
    (!profile.startDate || new Date(profile.startDate) >= new Date(profile.birthDate)) &&
    typeof profile.passcode === "string" &&
    /^[0-9]{4}$/.test(profile.passcode),
  );
}

export default function SetupPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageParam = searchParams.get("stage");
  const [baby, setBaby] = useState<BabyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editOnlyMode, setEditOnlyMode] = useState(false);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const effectiveStep = editOnlyMode ? 1 : currentStep;

  const showLoginButton = effectiveStep === 0 && !baby;

  const stepGuidance = [
    {
      title: "Baby details",
      description: "Enter your baby’s name, gender, birth date, and birth measurements.",
      items: ["Baby name and gender", "Birth date", "Birth weight and height"],
    },
    {
      title: "Growth schedule",
      description: "Choose how often to track progress and an optional starting date.",
      items: ["Weekly, biweekly, or monthly cadence", "Optional start date on or before today"],
    },
    {
      title: "Security",
      description: "Add an optional username and a 4-digit passcode for extra protection.",
      items: ["Optional profile username", "Secure 4-digit PIN"],
    },
  ];

  useEffect(() => {
    async function load() {
      if (!hasHydrated) return;

      const profile = await getBabyProfile();
      const requestedStage = stageParam === "measurement";
      const profileValue = profile ?? null;
      const allowMeasurementEdit =
        requestedStage && profileValue !== null && profileValue.stage !== "complete";

      if (profileValue?.stage === "complete") {
        router.replace("/");
        return;
      }

      if (profileValue?.stage === "measure" && !requestedStage) {
        router.replace("/measurements");
        return;
      }

      if (isSetupComplete(profileValue) && !allowMeasurementEdit) {
        router.replace("/measurements");
        return;
      }

      setBaby(profileValue);
      setEditOnlyMode(allowMeasurementEdit);
      setCurrentStep(allowMeasurementEdit ? 1 : getCurrentStepFromProfile(profileValue));
      setLoaded(true);
    }

    void load();
  }, [hasHydrated, router, stageParam]);

  if (!hasHydrated || !loaded) {
    return <PageLoader label="Loading setup…" />;
  }

  return (
    <main className="flex h-full min-h-0 w-full overflow-hidden bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-10 overflow-hidden lg:grid lg:grid-cols-[1.2fr_0.8fr]">
        <section className="min-h-0 overflow-y-auto rounded-4xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                Start tracking growth
              </div>

              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.32em] text-slate-400">
                  Baby growth tracker
                </p>

                <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  Track your baby’s growth with clear, simple progress insights.
                </h1>
              </div>
            </div>

            {showLoginButton && (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="shrink-0 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                Sign in
              </button>
            )}
          </div>

          <div className="mt-10">
            <BabyForm
              existingProfile={baby}
              currentStep={effectiveStep}
              setStep={editOnlyMode ? undefined : setCurrentStep}
              editOnlyMode={editOnlyMode}
            />
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-4xl border border-slate-200 bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 p-8 text-white shadow-xl shadow-slate-950/20">
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-sky-300">Quick start</p>

              <h2 className="mt-3 text-2xl font-semibold text-white">
                Set everything up in under 2 minutes.
              </h2>
            </div>

            <div className="space-y-4 rounded-3xl bg-white/5 p-6">
              <h3 className="text-sm uppercase tracking-[0.32em] text-sky-300">
                {stepGuidance[effectiveStep].title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                {stepGuidance[effectiveStep].description}
              </p>

              <ul className="mt-5 space-y-3 text-sm text-slate-200">
                {stepGuidance[effectiveStep].items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-white/10 p-6 text-sm leading-7 text-slate-200">
              <p className="font-semibold text-white">Pro tip</p>

              <p className="mt-3">
                Choose a start date on or before today so your first measurement appears immediately
                after setup.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

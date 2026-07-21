"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ensureMeasurementsForBaby, upsertMeasurement } from "@/services/baby-service";
import { formatDisplayDate, formatAgeFromDays } from "@/utils/age";
import { frequencyLabel, getCurrentRecordMeasurement } from "@/utils/measurement";
import type { BabyProfile, Measurement } from "@/types";

interface RecordFormProps {
  baby: BabyProfile;
}

type Draft = {
  weightKg: string;
  heightCm: string;
  notes: string;
};

export function RecordForm({ baby }: RecordFormProps) {
  const router = useRouter();
  const [target, setTarget] = useState<Measurement | null>(null);
  const [draft, setDraft] = useState<Draft>({
    weightKg: "",
    heightCm: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!baby.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const rows = await ensureMeasurementsForBaby(baby.id, baby);
        const current = getCurrentRecordMeasurement(rows);

        if (!current) {
          router.replace("/");
          return;
        }

        setTarget(current);
        setDraft({
          weightKg: current.weightKg?.toString() ?? "",
          heightCm: current.heightCm?.toString() ?? "",
          notes: current.notes ?? "",
        });
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [baby, router]);

  function handleChange(field: keyof Draft, value: string) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!target?.id) return;

    const weightKg = draft.weightKg.trim();
    const heightCm = draft.heightCm.trim();

    if (weightKg === "" || heightCm === "") {
      setError("Weight and height are required for this check-in.");
      return;
    }

    const weight = Number(weightKg);
    const height = Number(heightCm);

    if (!Number.isFinite(weight) || weight <= 0) {
      setError("Enter a valid weight in kilograms.");
      return;
    }

    if (!Number.isFinite(height) || height <= 0) {
      setError("Enter a valid height in centimeters.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await upsertMeasurement({
        ...target,
        weightKg: weight,
        heightCm: height,
        notes: draft.notes.trim() === "" ? undefined : draft.notes.trim(),
      });
      toast.success("Check-in saved.");
      router.push("/");
      router.refresh();
    } catch {
      const message = "Could not save this measurement. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !target) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-500 shadow-sm">
        Loading today’s check-in…
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-600">
            {frequencyLabel(baby.measurementFrequency)} check-in
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            {formatDisplayDate(target.date)}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Age {formatAgeFromDays(target.ageDays)} · enter weight, height, and optional notes for
            this day only.
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          One day at a time
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Weight (kg)</span>
          <input
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            value={draft.weightKg}
            onChange={(event) => handleChange("weightKg", event.target.value)}
            placeholder="e.g. 4.250"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Height (cm)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            value={draft.heightCm}
            onChange={(event) => handleChange("heightCm", event.target.value)}
            placeholder="e.g. 55.0"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Notes</span>
          <textarea
            value={draft.notes}
            onChange={(event) => handleChange("notes", event.target.value)}
            placeholder="Feeding, sleep, doctor visit, or anything else worth remembering"
            rows={4}
            className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      {error ? <p className="mt-6 text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSaving ? "Saving…" : "Save check-in"}
        </button>
      </div>
    </form>
  );
}

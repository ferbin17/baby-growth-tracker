"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMeasurements, upsertMeasurement, deleteMeasurement, updateBabyProfile } from "@/services/baby-service";
import { formatDisplayDate, formatAgeFromDays } from "@/utils/age";
import { formatWeight, formatHeight } from "@/utils/format";
import type { Measurement } from "@/types";

interface MeasurementTableProps {
  babyId: number;
}

export function MeasurementTable({ babyId }: MeasurementTableProps) {
  const router = useRouter();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { weightKg: string; heightCm: string; notes: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isDoneReady = measurements.length > 0 && measurements.every((row) => row.weightKg != null && row.heightCm != null);

  useEffect(() => {
    async function load() {
      const rows = await getMeasurements(babyId);
      setMeasurements(rows);
      const initialDrafts = rows.reduce<Record<number, { weightKg: string; heightCm: string; notes: string }>>((acc, row) => {
        if (row.id) {
          acc[row.id] = {
            weightKg: row.weightKg?.toString() ?? "",
            heightCm: row.heightCm?.toString() ?? "",
            notes: row.notes ?? "",
          };
        }
        return acc;
      }, {});
      setDrafts(initialDrafts);
    }

    void load();
  }, [babyId]);

  function handleDraftChange(id: number | undefined, field: "weightKg" | "heightCm" | "notes", value: string) {
    if (!id) return;
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
  }

  function hasPendingChanges() {
    return measurements.some((row) => {
      if (!row.id) return false;
      const draft = drafts[row.id];
      if (!draft) return false;
      return (
        draft.weightKg !== (row.weightKg?.toString() ?? "") ||
        draft.heightCm !== (row.heightCm?.toString() ?? "") ||
        draft.notes !== (row.notes ?? "")
      );
    });
  }

  async function handleSaveAll() {
    setIsSaving(true);
    try {
      const updates = measurements
        .filter((row): row is Measurement & { id: number } => {
          const id = row.id;
          return id != null && Boolean(drafts[id]);
        })
        .map((row) => {
          const id = row.id;
          if (id == null) return null;
          const draft = drafts[id];
          if (!draft) return null;
          const updated = {
            ...row,
            weightKg: draft.weightKg === "" ? undefined : Number(draft.weightKg),
            heightCm: draft.heightCm === "" ? undefined : Number(draft.heightCm),
            notes: draft.notes,
          };
          return updated;
        })
        .filter(Boolean) as Measurement[];

      await Promise.all(updates.map((updated) => upsertMeasurement(updated)));
      const nextMeasurements = measurements.map((row) => {
        const updated = updates.find((item) => item.id === row.id);
        return updated ?? row;
      });
      setMeasurements(nextMeasurements);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDone() {
    if (babyId) {
      await updateBabyProfile(babyId, { stage: "complete" });
    }
    router.push("/");
  }

  async function handleClear(id?: number) {
    if (!id) return;
    await deleteMeasurement(id);
    setMeasurements((current) => current.filter((item) => item.id !== id));
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Measurements</h2>
            <p className="text-sm text-slate-600">Update actual measurements and notes whenever you have a new check-in.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!hasPendingChanges() || isSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSaving ? "Saving..." : "Save all"}
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={!isDoneReady}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Done
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Weight (kg)</th>
              <th className="px-4 py-3">Height (cm)</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((measurement) => (
              <tr key={measurement.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{formatDisplayDate(measurement.date)}</td>
                <td className="px-4 py-3">{formatAgeFromDays(measurement.ageDays)}</td>
                <td className="px-4 py-3">
                          <input
                      value={drafts[measurement.id ?? -1]?.weightKg ?? formatWeight(measurement.weightKg)}
                      type="number"
                      step="0.001"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      onChange={(event) => handleDraftChange(measurement.id, "weightKg", event.target.value)}
                    />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={drafts[measurement.id ?? -1]?.heightCm ?? formatHeight(measurement.heightCm)}
                    type="number"
                    step="0.1"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    onChange={(event) => handleDraftChange(measurement.id, "heightCm", event.target.value)}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={drafts[measurement.id ?? -1]?.notes ?? measurement.notes ?? ""}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    onChange={(event) => handleDraftChange(measurement.id, "notes", event.target.value)}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleClear(measurement.id)}
                    className="text-sm text-rose-600"
                  >
                    Clear
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

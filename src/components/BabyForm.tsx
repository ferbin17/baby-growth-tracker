"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  resetMeasurementsForBaby,
  updateBabyProfile,
  upsertBabyProfile,
  createMeasurementsForBaby,
  getMeasurements,
} from "@/services/baby-service";
import type { BabyProfile, Gender, MeasurementFrequency, SetupStage } from "@/types";

interface BabyFormValues {
  name: string;
  username?: string;
  gender: Gender;
  birthDate: string;
  startDate?: string;
  passcode: string;
  birthWeightKg: number;
  birthHeightCm: number;
  measurementFrequency: MeasurementFrequency;
}

interface BabyFormProps {
  existingProfile?: BabyProfile | null;
  currentStep: number;
  setStep?: React.Dispatch<React.SetStateAction<number>>;
  editOnlyMode?: boolean;
}

const schema = z
  .object({
    name: z.string().min(1, "Baby name is required"),
    username: z.string().optional(),
    gender: z.enum(["male", "female"]),
    birthDate: z.string().refine((value) => new Date(value) <= new Date(), {
      message: "Birth date cannot be in the future",
    }),
    startDate: z.string().optional(),
    passcode: z.string().regex(/^\d{4}$/, "Passcode must be 4 digits"),
    birthWeightKg: z.coerce.number().positive("Weight must be greater than 0"),
    birthHeightCm: z.coerce.number().positive("Height must be greater than 0"),
    measurementFrequency: z.enum(["weekly", "biweekly", "monthly"]),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && new Date(data.startDate) < new Date(data.birthDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date cannot be before birth date",
        path: ["startDate"],
      });
    }
  });

export function BabyForm({
  existingProfile,
  currentStep,
  setStep,
  editOnlyMode = false,
}: BabyFormProps) {
  const router = useRouter();
  const [profileId, setProfileId] = useState<number | undefined>(existingProfile?.id);
  const activeStep = editOnlyMode ? 1 : currentStep;
  const initialValues = useMemo(
    () => ({
      name: existingProfile?.name ?? "",
      username: existingProfile?.username ?? "",
      gender: existingProfile?.gender ?? "female",
      birthDate: existingProfile?.birthDate ?? "",
      startDate: existingProfile?.startDate ?? "",
      passcode: existingProfile?.passcode ?? "",
      birthWeightKg: existingProfile?.birthWeightKg ?? 0,
      birthHeightCm: existingProfile?.birthHeightCm ?? 0,
      measurementFrequency: existingProfile?.measurementFrequency ?? "weekly",
    }),
    [existingProfile],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BabyFormValues>({
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const previousAutoStartDate = useRef("");

  const birthDateValue = useWatch({
    control,
    name: "birthDate",
  });

  const startDateValue = useWatch({
    control,
    name: "startDate",
  });

  useEffect(() => {
    if (!birthDateValue) {
      return;
    }

    if (!startDateValue || startDateValue === previousAutoStartDate.current) {
      setValue("startDate", birthDateValue);
      previousAutoStartDate.current = birthDateValue;
    }
  }, [birthDateValue, startDateValue, setValue]);

  const stepTitles = [
    {
      title: "Baby details",
      description: "Name, gender, date of birth, and birth metrics.",
    },
    {
      title: "Growth schedule",
      description: "Measurement cadence and optional start date.",
    },
    {
      title: "Security",
      description: "Optional username and secure passcode.",
    },
  ];

  const stepSchemas = [
    z.object({
      name: z.string().min(1, "Baby name is required"),
      gender: z.enum(["male", "female"]),
      birthDate: z.string().refine((value) => new Date(value) <= new Date(), {
        message: "Birth date cannot be in the future",
      }),
      birthWeightKg: z.coerce.number().positive("Weight must be greater than 0"),
      birthHeightCm: z.coerce.number().positive("Height must be greater than 0"),
    }),
    z
      .object({
        measurementFrequency: z.enum(["weekly", "biweekly", "monthly"]),
        startDate: z.string().optional(),
        birthDate: z.string().refine((value) => new Date(value) <= new Date(), {
          message: "Birth date cannot be in the future",
        }),
      })
      .superRefine((data, ctx) => {
        if (data.startDate && new Date(data.startDate) < new Date(data.birthDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Start date cannot be before birth date",
            path: ["startDate"],
          });
        }
      }),
    z.object({
      username: z.string().optional(),
      passcode: z.string().regex(/^[0-9]{4}$/, "Passcode must be 4 digits"),
    }),
  ];

  const stageForStep = (step: number): SetupStage => {
    if (step === 0) return "baby_detail";
    if (step === 1) return "schedule";
    return "security";
  };

  const stageOrder: SetupStage[] = ["baby_detail", "schedule", "security", "measure", "complete"];
  const clampStage = (current?: SetupStage, next?: SetupStage) => {
    if (!next) return current;
    if (!current) return next;
    return stageOrder.indexOf(next) <= stageOrder.indexOf(current) ? current : next;
  };

  async function saveDraft(values: BabyFormValues, stage?: SetupStage) {
    const draft: Partial<Omit<BabyProfile, "id" | "createdAt" | "updatedAt">> & {
      id?: number;
      stage?: SetupStage;
    } = {
      id: profileId,
      name: values.name,
      gender: values.gender,
      birthDate: values.birthDate,
      birthWeightKg: values.birthWeightKg,
      birthHeightCm: values.birthHeightCm,
      stage: clampStage(
        existingProfile?.stage,
        stage ?? (editOnlyMode ? "measure" : stageForStep(activeStep)),
      ),
    };

    if (activeStep >= 1) {
      draft.measurementFrequency = values.measurementFrequency;
      draft.startDate = values.startDate;
    }

    if (activeStep >= 2) {
      draft.username = values.username;
      draft.passcode = values.passcode;
    } else {
      if (existingProfile?.username !== undefined) {
        draft.username = existingProfile.username;
      }
      if (existingProfile?.passcode) {
        draft.passcode = existingProfile.passcode;
      }
    }

    const savedId = await upsertBabyProfile(draft);
    setProfileId(savedId);
    return savedId;
  }

  async function onSubmit(values: BabyFormValues) {
    const currentSchema = stepSchemas[activeStep];
    const result = currentSchema.safeParse(values);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof BabyFormValues;
        setError(field, { type: "validation", message: issue.message });
      }
      return;
    }

    const currentStage = editOnlyMode
      ? (existingProfile?.stage ?? "measure")
      : activeStep < stepSchemas.length - 1
        ? stageForStep(activeStep + 1)
        : ("measure" as SetupStage);
    const savedId = await saveDraft(values, currentStage);

    if (activeStep < stepSchemas.length - 1) {
      if (editOnlyMode) {
        const existingMeasurements = await getMeasurements(savedId);
        const scheduleChanged = Boolean(
          existingProfile &&
          (existingProfile.measurementFrequency !== values.measurementFrequency ||
            existingProfile.startDate !== values.startDate ||
            existingProfile.birthDate !== values.birthDate),
        );

        const profileData = {
          id: savedId,
          name: existingProfile?.name ?? values.name,
          username: existingProfile?.username,
          gender: existingProfile?.gender ?? values.gender,
          birthDate: values.birthDate,
          startDate: values.startDate,
          passcode: existingProfile?.passcode ?? values.passcode,
          birthWeightKg: existingProfile?.birthWeightKg ?? values.birthWeightKg,
          birthHeightCm: existingProfile?.birthHeightCm ?? values.birthHeightCm,
          measurementFrequency: values.measurementFrequency as MeasurementFrequency,
          createdAt: existingProfile?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existingMeasurements.length === 0) {
          await createMeasurementsForBaby(savedId, profileData);
        } else if (scheduleChanged) {
          await resetMeasurementsForBaby(savedId, profileData);
        }

        router.push("/measurements");
        return;
      }
      setStep?.((current) => Math.min(current + 1, stepSchemas.length - 1));
      return;
    }

    const validated = schema.parse(values);
    const profileData = {
      name: validated.name,
      username: validated.username,
      gender: validated.gender as Gender,
      birthDate: validated.birthDate,
      startDate: validated.startDate,
      passcode: validated.passcode,
      birthWeightKg: validated.birthWeightKg,
      birthHeightCm: validated.birthHeightCm,
      measurementFrequency: validated.measurementFrequency as MeasurementFrequency,
      stage: "measure" as SetupStage,
    };

    const babyId = savedId;
    const existingMeasurements = await getMeasurements(babyId);

    if (existingProfile?.id) {
      await updateBabyProfile(existingProfile.id, profileData);
    } else {
      await updateBabyProfile(babyId, profileData);
    }

    if (existingMeasurements.length === 0) {
      await createMeasurementsForBaby(babyId, {
        id: babyId,
        ...profileData,
        createdAt: existingProfile?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    router.refresh();
    router.push("/measurements");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        {activeStep === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Baby name</span>
              <input
                {...register("name")}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              {errors.name ? <p className="text-sm text-rose-600">{errors.name.message}</p> : null}
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Gender</span>
              <select
                {...register("gender")}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Birth date</span>
              <input
                type="date"
                {...register("birthDate")}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              {errors.birthDate ? (
                <p className="text-sm text-rose-600">{errors.birthDate.message}</p>
              ) : null}
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Birth weight (kg)</span>
              <input
                type="number"
                step="0.01"
                {...register("birthWeightKg")}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              {errors.birthWeightKg ? (
                <p className="text-sm text-rose-600">{errors.birthWeightKg.message}</p>
              ) : null}
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Birth height (cm)</span>
              <input
                type="number"
                step="0.1"
                {...register("birthHeightCm")}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              {errors.birthHeightCm ? (
                <p className="text-sm text-rose-600">{errors.birthHeightCm.message}</p>
              ) : null}
            </label>
          </div>
        ) : activeStep === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Measurement frequency</span>
              <select
                {...register("measurementFrequency")}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 Weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>
                Start date <span className="text-xs font-normal text-slate-400">(optional)</span>
              </span>
              <input
                type="date"
                {...register("startDate")}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              {errors.startDate ? (
                <p className="text-sm text-rose-600">{errors.startDate.message}</p>
              ) : null}
            </label>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>
                Username <span className="text-xs font-normal text-slate-400">(optional)</span>
              </span>
              <input
                {...register("username")}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Nickname or handle"
              />
              {errors.username ? (
                <p className="text-sm text-rose-600">{errors.username.message}</p>
              ) : null}
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Passcode</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                {...register("passcode")}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="0000"
              />
              {errors.passcode ? (
                <p className="text-sm text-rose-600">{errors.passcode.message}</p>
              ) : null}
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep?.((current) => Math.max(0, current - 1))}
          disabled={activeStep === 0 || isSubmitting || editOnlyMode}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {editOnlyMode
            ? isSubmitting
              ? "Saving..."
              : "Save changes"
            : activeStep < stepTitles.length - 1
              ? "Next"
              : isSubmitting
                ? "Saving..."
                : "Finish setup"}
        </button>
      </div>
    </form>
  );
}

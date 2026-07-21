import { supabase } from "@/lib/supabase";
import type { BabyProfile, Measurement, Gender, MeasurementFrequency, SetupStage } from "@/types";

type BabyProfileWrite = Partial<Omit<BabyProfile, "id" | "updatedAt">> & {
  id?: number;
};

type BabyRow = {
  id: number;
  name: string;
  username?: string;
  gender: Gender;
  birth_date: string;
  start_date?: string;
  passcode: string;
  birth_weight_kg: number;
  birth_height_cm: number;
  measurement_frequency: MeasurementFrequency;
  stage?: SetupStage;
  created_at: string;
  updated_at: string;
};

type MeasurementRow = {
  id: number;
  baby_id: number;
  date: string;
  age_days: number;
  weight_kg?: number;
  height_cm?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};

function toBabyRow(profile: Partial<BabyProfile>) {
  return {
    ...(profile.id !== undefined && { id: profile.id }),
    ...(profile.name !== undefined && { name: profile.name }),
    ...(profile.username !== undefined && { username: profile.username }),
    ...(profile.gender !== undefined && { gender: profile.gender }),
    ...(profile.birthDate !== undefined && {
      birth_date: profile.birthDate,
    }),
    ...(profile.startDate !== undefined && {
      start_date: profile.startDate,
    }),
    ...(profile.passcode !== undefined && {
      passcode: profile.passcode,
    }),
    ...(profile.birthWeightKg !== undefined && {
      birth_weight_kg: profile.birthWeightKg,
    }),
    ...(profile.birthHeightCm !== undefined && {
      birth_height_cm: profile.birthHeightCm,
    }),
    ...(profile.measurementFrequency !== undefined && {
      measurement_frequency: profile.measurementFrequency,
    }),
    ...(profile.stage !== undefined && {
      stage: profile.stage,
    }),
    ...(profile.createdAt !== undefined && {
      created_at: profile.createdAt,
    }),
    ...(profile.updatedAt !== undefined && {
      updated_at: profile.updatedAt,
    }),
  };
}

function fromBabyRow(row: BabyRow): BabyProfile {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    gender: row.gender,
    birthDate: row.birth_date,
    startDate: row.start_date,
    passcode: row.passcode,
    birthWeightKg: row.birth_weight_kg,
    birthHeightCm: row.birth_height_cm,
    measurementFrequency: row.measurement_frequency,
    stage: row.stage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMeasurementRow(measurement: Partial<Measurement>) {
  return {
    ...(measurement.id !== undefined && {
      id: measurement.id,
    }),
    ...(measurement.babyId !== undefined && {
      baby_id: measurement.babyId,
    }),
    ...(measurement.date !== undefined && {
      date: measurement.date,
    }),
    ...(measurement.ageDays !== undefined && {
      age_days: measurement.ageDays,
    }),
    ...(measurement.weightKg !== undefined && {
      weight_kg: measurement.weightKg,
    }),
    ...(measurement.heightCm !== undefined && {
      height_cm: measurement.heightCm,
    }),
    ...(measurement.notes !== undefined && {
      notes: measurement.notes,
    }),
    ...(measurement.createdAt !== undefined && {
      created_at: measurement.createdAt,
    }),
    ...(measurement.updatedAt !== undefined && {
      updated_at: measurement.updatedAt,
    }),
  };
}

function fromMeasurementRow(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    babyId: row.baby_id,
    date: row.date,
    ageDays: row.age_days,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveBabyProfile(
  profile: Omit<BabyProfile, "id" | "createdAt" | "updatedAt">,
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("babies")
    .insert(
      toBabyRow({
        ...profile,
        createdAt: now,
        updatedAt: now,
      }),
    )
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

export async function updateBabyProfile(id: number, profile: BabyProfileWrite) {
  const { error } = await supabase
    .from("babies")
    .update(
      toBabyRow({
        ...profile,
        updatedAt: new Date().toISOString(),
      }),
    )
    .eq("id", id);

  if (error) throw error;
}

export async function upsertBabyProfile(profile: BabyProfileWrite) {
  const now = new Date().toISOString();

  const payload = toBabyRow({
    ...profile,
    createdAt: profile.createdAt ?? now,
    updatedAt: now,
  });

  if (profile.id) {
    const { error } = await supabase.from("babies").update(payload).eq("id", profile.id);

    if (error) throw error;

    return profile.id;
  }

  const { data, error } = await supabase.from("babies").insert(payload).select("id").single();

  if (error) throw error;

  return data.id;
}

export async function getBabyProfile() {
  const { data, error } = await supabase
    .from("babies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ? fromBabyRow(data as BabyRow) : null;
}

export async function deleteMeasurementsForBaby(babyId: number) {
  const { error } = await supabase.from("measurements").delete().eq("baby_id", babyId);

  if (error) throw error;
}

export async function deleteBabyProfile(id: number) {
  await deleteMeasurementsForBaby(id);

  const { error } = await supabase.from("babies").delete().eq("id", id);

  if (error) throw error;
}

export async function createMeasurementsForBaby(babyId: number, baby: BabyProfile) {
  const measurements: Partial<Measurement>[] = [];

  const today = new Date();
  const birthDate = new Date(baby.birthDate);

  const currentDate = new Date(baby.startDate ? baby.startDate : birthDate);

  let index = 0;

  while (currentDate <= today) {
    const ageDays = Math.round((currentDate.getTime() - birthDate.getTime()) / 86400000);

    const now = new Date().toISOString();

    measurements.push({
      babyId,
      date: currentDate.toISOString(),
      ageDays,
      createdAt: now,
      updatedAt: now,
    });

    const incrementDays =
      baby.measurementFrequency === "monthly"
        ? 30
        : baby.measurementFrequency === "biweekly"
          ? 14
          : 7;

    currentDate.setDate(currentDate.getDate() + incrementDays);

    index++;

    if (index > 500) {
      break;
    }
  }

  if (measurements.length === 0) {
    return;
  }

  const { error } = await supabase.from("measurements").insert(measurements.map(toMeasurementRow));

  if (error) throw error;
}

export async function resetMeasurementsForBaby(babyId: number, baby: BabyProfile) {
  await deleteMeasurementsForBaby(babyId);

  await createMeasurementsForBaby(babyId, baby);
}

export async function getMeasurements(babyId: number) {
  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("baby_id", babyId)
    .order("age_days");

  if (error) throw error;

  return (data as MeasurementRow[]).map(fromMeasurementRow);
}

export async function upsertMeasurement(measurement: Measurement) {
  const now = new Date().toISOString();

  const payload = toMeasurementRow({
    ...measurement,
    createdAt: measurement.createdAt ?? now,
    updatedAt: now,
  });

  const { data, error } = await supabase.from("measurements").upsert(payload).select("id").single();

  if (error) throw error;

  return data.id;
}

export async function deleteMeasurement(id: number) {
  const { error } = await supabase.from("measurements").delete().eq("id", id);

  if (error) throw error;
}

/** Insert any missing frequency-date rows up to today, plus the next upcoming slot. */
export async function ensureMeasurementsForBaby(babyId: number, baby: BabyProfile) {
  const existing = await getMeasurements(babyId);
  const existingKeys = new Set(
    existing.map((row) => new Date(row.date).toISOString().slice(0, 10)),
  );

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const birthDate = new Date(baby.birthDate);
  const currentDate = new Date(baby.startDate ? baby.startDate : birthDate);
  const incrementDays =
    baby.measurementFrequency === "monthly"
      ? 30
      : baby.measurementFrequency === "biweekly"
        ? 14
        : 7;

  const missing: Partial<Measurement>[] = [];
  const now = new Date().toISOString();
  let index = 0;
  let addedUpcoming = false;

  while (index <= 500) {
    const isPastOrToday = currentDate.getTime() <= today.getTime();
    const dateKey = currentDate.toISOString().slice(0, 10);

    if ((isPastOrToday || !addedUpcoming) && !existingKeys.has(dateKey)) {
      missing.push({
        babyId,
        date: currentDate.toISOString(),
        ageDays: Math.round((currentDate.getTime() - birthDate.getTime()) / 86400000),
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!isPastOrToday) {
      addedUpcoming = true;
      break;
    }

    currentDate.setDate(currentDate.getDate() + incrementDays);
    index++;
  }

  if (missing.length === 0) {
    return existing;
  }

  const { error } = await supabase.from("measurements").insert(missing.map(toMeasurementRow));

  if (error) throw error;

  return getMeasurements(babyId);
}

export async function getLatestCompletedMeasurement(babyId: number) {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("baby_id", babyId)
    .lte("date", today)
    .or("weight_kg.not.is.null,height_cm.not.is.null")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ? fromMeasurementRow(data as MeasurementRow) : null;
}

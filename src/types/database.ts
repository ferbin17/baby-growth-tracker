import type { Gender, MeasurementFrequency, SetupStage } from "@/types";

export type BabyRow = {
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

export type MeasurementRow = {
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

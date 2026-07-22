export type Gender = "male" | "female";

export type MeasurementFrequency = "weekly" | "biweekly" | "monthly";

export type SetupStage = "baby_detail" | "schedule" | "security" | "measure" | "complete";

export interface BabyProfile {
  id?: number;
  name: string;
  username?: string;
  gender: Gender;
  birthDate: string;
  startDate?: string;
  passcode: string;
  birthWeightKg: number;
  birthHeightCm: number;
  measurementFrequency: MeasurementFrequency;
  stage?: SetupStage;
  createdAt: string;
  updatedAt: string;
}

export interface Measurement {
  id?: number;
  babyId: number;
  date: string;
  ageDays: number;
  weightKg?: number;
  heightCm?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id?: number;
  theme: "light" | "dark";
  createdAt: string;
  updatedAt: string;
}

export type AuthenticatedBaby = Omit<BabyProfile, "username" | "passcode">;

import type { Measurement } from "@/types";

const today = () => new Date();

export function hasPendingMeasurements(measurements: Measurement[]) {
  const now = today();
  return measurements.some((measurement) => {
    const measurementDate = new Date(measurement.date);
    return measurementDate <= now && (measurement.weightKg == null || measurement.heightCm == null);
  });
}

export function shouldShowMeasurements(measurements: Measurement[]) {
  return measurements.length === 0 || hasPendingMeasurements(measurements);
}

export function shouldShowDashboard(measurements: Measurement[]) {
  return measurements.length > 0 && !hasPendingMeasurements(measurements);
}

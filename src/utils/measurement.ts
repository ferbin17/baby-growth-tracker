import type { Measurement, MeasurementFrequency } from "@/types";

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

/** Earliest due frequency date that still needs weight/height. */
export function getCurrentRecordMeasurement(measurements: Measurement[]) {
  const now = today();
  return (
    [...measurements]
      .filter((measurement) => {
        const measurementDate = new Date(measurement.date);
        return (
          measurementDate <= now &&
          (measurement.weightKg == null || measurement.heightCm == null)
        );
      })
      .sort((a, b) => a.ageDays - b.ageDays)[0] ?? null
  );
}

/** Next scheduled frequency date after today (filled or not). */
export function getNextUpcomingMeasurement(measurements: Measurement[]) {
  const now = today();
  return (
    [...measurements]
      .filter((measurement) => new Date(measurement.date) > now)
      .sort((a, b) => a.ageDays - b.ageDays)[0] ?? null
  );
}

export function frequencyLabel(frequency: MeasurementFrequency) {
  if (frequency === "biweekly") return "biweekly";
  if (frequency === "monthly") return "monthly";
  return "weekly";
}

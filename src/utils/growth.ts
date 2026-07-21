import type { BabyProfile, Measurement } from "@/types";
import {
  calculatePercentileFromMeasurement,
  expectedValueAtPercentile,
  interpolateWhoPoint,
  type WhoPoint,
} from "@/utils/who";

export type WeightForAgeReference = {
  label: string;
  description: string;
  trendLabel: string;
  tone: "neutral" | "caution";
};

const REFERENCE_PERCENTILE_MIN = 0.03;
const REFERENCE_PERCENTILE_MAX = 0.97;
const MATERIAL_PERCENTILE_CHANGE = 0.1;

/**
 * Summarises recorded weights against the available WHO weight-for-age data.
 * This is a reference comparison, not a diagnosis or a complete growth assessment.
 */
export function getWeightForAgeReference(
  measurements: Measurement[],
  whoSeries: WhoPoint[],
): WeightForAgeReference {
  const now = new Date();
  const weightedMeasurements = measurements
    .filter(
      (measurement) => measurement.weightKg != null && new Date(measurement.date).getTime() <= now.getTime(),
    )
    .sort((a, b) => a.ageDays - b.ageDays);
  const latest = weightedMeasurements.at(-1);

  if (!latest || latest.weightKg == null || whoSeries.length === 0) {
    return {
      label: "Reference unavailable",
      description: "Record a weight check-in to compare it with the WHO weight-for-age reference.",
      trendLabel: "No recorded weight trend yet",
      tone: "neutral",
    };
  }

  const lastReferenceAge = whoSeries.at(-1)?.ageDays;
  if (lastReferenceAge == null || latest.ageDays > lastReferenceAge) {
    return {
      label: "Reference unavailable",
      description: "The latest measurement is outside the age range covered by the available WHO data.",
      trendLabel: getTrendLabel(weightedMeasurements, whoSeries),
      tone: "neutral",
    };
  }

  const percentile = calculatePercentileFromMeasurement(
    latest.weightKg,
    interpolateWhoPoint(whoSeries, latest.ageDays),
  );
  const percentileLabel = formatPercentile(percentile);

  if (percentile < REFERENCE_PERCENTILE_MIN) {
    return {
      label: "Below the 3rd percentile",
      description: `The latest weight is around the ${percentileLabel} percentile for age on the WHO reference. Re-check the measurement and discuss it with a child health professional.`,
      trendLabel: getTrendLabel(weightedMeasurements, whoSeries),
      tone: "caution",
    };
  }

  if (percentile > REFERENCE_PERCENTILE_MAX) {
    return {
      label: "Above the 97th percentile",
      description: `The latest weight is around the ${percentileLabel} percentile for age on the WHO reference. Consider it alongside height and a clinician’s assessment.`,
      trendLabel: getTrendLabel(weightedMeasurements, whoSeries),
      tone: "caution",
    };
  }

  return {
    label: "Within the 3rd–97th percentile range",
    description: `The latest weight is around the ${percentileLabel} percentile for age on the WHO reference. This comparison does not replace a full growth assessment.`,
    trendLabel: getTrendLabel(weightedMeasurements, whoSeries),
    tone: "neutral",
  };
}

function getTrendLabel(measurements: Measurement[], whoSeries: WhoPoint[]): string {
  const latest = measurements.at(-1);
  const previous = measurements.at(-2);

  if (!latest || !previous || latest.weightKg == null || previous.weightKg == null) {
    return "Add another weight check-in to show a trend";
  }

  const lastReferenceAge = whoSeries.at(-1)?.ageDays;
  if (
    lastReferenceAge == null ||
    latest.ageDays > lastReferenceAge ||
    previous.ageDays > lastReferenceAge
  ) {
    return "Trend comparison is unavailable for this age";
  }

  const latestPercentile = calculatePercentileFromMeasurement(
    latest.weightKg,
    interpolateWhoPoint(whoSeries, latest.ageDays),
  );
  const previousPercentile = calculatePercentileFromMeasurement(
    previous.weightKg,
    interpolateWhoPoint(whoSeries, previous.ageDays),
  );
  const difference = latestPercentile - previousPercentile;

  if (Math.abs(difference) < MATERIAL_PERCENTILE_CHANGE) {
    return "Percentile position is similar to the prior check-in";
  }

  return difference > 0
    ? "Percentile position is higher than the prior check-in"
    : "Percentile position is lower than the prior check-in";
}

function formatPercentile(percentile: number): string {
  const rounded = Math.round(percentile * 100);

  if (rounded === 0) return "below the 1st";
  if (rounded === 100) return "above the 99th";

  const lastTwoDigits = rounded % 100;
  const suffix =
    lastTwoDigits >= 11 && lastTwoDigits <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" }[rounded % 10] ?? "th");

  return `${rounded}${suffix}`;
}

export function getLatestMeasurement(measurements: Measurement[]) {
  return [...measurements].sort((a, b) => a.ageDays - b.ageDays).at(-1);
}

export function calculatePersonalizedCurve(
  baby: BabyProfile,
  whoSeries: WhoPoint[],
  futureAges: number[],
  metric: "weight" | "height",
) {
  const birthValue = metric === "weight" ? baby.birthWeightKg : baby.birthHeightCm;

  const birthPoint = interpolateWhoPoint(whoSeries, 0);

  const birthPercentile = calculatePercentileFromMeasurement(birthValue, birthPoint);

  return futureAges.map((ageDays) => {
    const point = interpolateWhoPoint(whoSeries, ageDays);

    return {
      ageDays,
      expected: expectedValueAtPercentile(point, birthPercentile),
    };
  });
}

export function buildGrowthSeries(
  baby: BabyProfile,
  measurements: Measurement[],
  whoSeries: WhoPoint[],
  metric: "weight" | "height",
) {
  const birthPoint = interpolateWhoPoint(whoSeries, 0);

  const birthValue = metric === "weight" ? baby.birthWeightKg : baby.birthHeightCm;

  const birthPercentile = calculatePercentileFromMeasurement(birthValue, birthPoint);

  return measurements.map((measurement) => {
    const point = interpolateWhoPoint(whoSeries, measurement.ageDays);

    const actual = metric === "weight" ? measurement.weightKg : measurement.heightCm;

    const percentile =
      actual !== undefined && actual !== null
        ? calculatePercentileFromMeasurement(actual, point)
        : null;

    return {
      ageDays: measurement.ageDays,
      date: measurement.date,
      actual: actual ?? null,
      median: point.median,
      p3: point.p3,
      p97: point.p97,
      personalized: expectedValueAtPercentile(point, birthPercentile),
      percentile,
    };
  });
}

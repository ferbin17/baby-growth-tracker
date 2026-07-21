import type { BabyProfile, Measurement } from "@/types";
import {
  calculatePercentileFromMeasurement,
  expectedValueAtPercentile,
  interpolateWhoPoint,
  type WhoPoint,
} from "@/utils/who";

export type GrowthStatus = "Normal" | "Below Expected" | "Above Expected" | "Needs Monitoring";

export function getGrowthStatus(percentile: number | null): GrowthStatus {
  if (percentile === null) {
    return "Needs Monitoring";
  }

  const percentage = percentile * 100;

  if (percentage < 3) {
    return "Needs Monitoring";
  }

  if (percentage < 15) {
    return "Below Expected";
  }

  if (percentage <= 85) {
    return "Normal";
  }

  return "Above Expected";
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

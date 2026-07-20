import type { BabyProfile, Measurement } from "@/types";
import { calculatePercentileFromMeasurement, expectedValueAtPercentile, interpolateWhoPoint, type WhoPoint } from "@/utils/who";

export type GrowthStatus = "Excellent" | "Normal" | "Below Expected" | "Needs Monitoring";

export function getGrowthStatus(value: number, expected: number, metric: "weight" | "height") {
  const delta = value - expected;
  const threshold = metric === "weight" ? 0.2 : 1.5;

  if (delta >= threshold) return "Excellent";
  if (delta >= -threshold) return "Normal";
  if (delta >= -threshold * 2) return "Below Expected";
  return "Needs Monitoring";
}

export function getLatestMeasurement(measurements: Measurement[]) {
  return [...measurements].sort((a, b) => a.ageDays - b.ageDays).at(-1);
}

export function calculatePersonalizedCurve(baby: BabyProfile, birthPoint: WhoPoint, futureAges: number[], metric: "weight" | "height") {
  const percentile = calculatePercentileFromMeasurement(metric === "weight" ? baby.birthWeightKg : baby.birthHeightCm, birthPoint);

  return futureAges.map((ageDays) => {
    const point = { ...birthPoint, ageDays };
    return {
      ageDays,
      expected: expectedValueAtPercentile(point, percentile),
    };
  });
}

export function buildGrowthSeries(baby: BabyProfile, measurements: Measurement[], whoSeries: WhoPoint[], metric: "weight" | "height") {
  const birthPoint = interpolateWhoPoint(whoSeries, 0);
  const values = measurements.map((measurement) => {
    const point = interpolateWhoPoint(whoSeries, measurement.ageDays);
    const actual = metric === "weight" ? measurement.weightKg : measurement.heightCm;
    const percentile = actual ? calculatePercentileFromMeasurement(actual, point) : null;
    return {
      ageDays: measurement.ageDays,
      date: measurement.date,
      actual: actual ?? null,
      median: point.median,
      p3: point.p3,
      p97: point.p97,
      personalized: expectedValueAtPercentile(point, calculatePercentileFromMeasurement(metric === "weight" ? baby.birthWeightKg : baby.birthHeightCm, birthPoint)),
      percentile,
    };
  });

  return values;
}

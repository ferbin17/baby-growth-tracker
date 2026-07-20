import type { BabyProfile, Measurement } from "@/types";
import {
  calculatePercentileFromMeasurement,
  expectedValueAtPercentile,
  interpolateWhoPoint,
  type WhoPoint,
} from "@/utils/who";

export type GrowthStatus =
  | "Excellent"
  | "Normal"
  | "Below Expected"
  | "Needs Monitoring";


export function getGrowthStatus(
  percentile: number | null
): GrowthStatus {

  if (percentile === null) {
    return "Needs Monitoring";
  }

  const percentileValue = percentile * 100;

  if (percentileValue >= 10 && percentileValue <= 90) {
    return "Normal";
  }

  if (percentileValue > 90 && percentileValue <= 97) {
    return "Excellent";
  }

  if (percentileValue >= 3 && percentileValue < 10) {
    return "Below Expected";
  }

  return "Needs Monitoring";
}


export function getLatestMeasurement(
  measurements: Measurement[]
) {
  return [...measurements]
    .sort((a, b) => a.ageDays - b.ageDays)
    .at(-1);
}


export function calculatePersonalizedCurve(
  baby: BabyProfile,
  whoSeries: WhoPoint[],
  futureAges: number[],
  metric: "weight" | "height"
) {

  const birthValue =
    metric === "weight"
      ? baby.birthWeightKg
      : baby.birthHeightCm;


  const birthPoint = interpolateWhoPoint(
    whoSeries,
    0
  );


  const percentile =
    calculatePercentileFromMeasurement(
      birthValue,
      birthPoint
    );


  return futureAges.map((ageDays) => {

    const point = interpolateWhoPoint(
      whoSeries,
      ageDays
    );


    return {
      ageDays,
      expected: expectedValueAtPercentile(
        point,
        percentile
      ),
    };
  });
}



export function buildGrowthSeries(
  baby: BabyProfile,
  measurements: Measurement[],
  whoSeries: WhoPoint[],
  metric: "weight" | "height"
) {

  const birthPoint = interpolateWhoPoint(
    whoSeries,
    0
  );


  const birthValue =
    metric === "weight"
      ? baby.birthWeightKg
      : baby.birthHeightCm;


  const birthPercentile =
    calculatePercentileFromMeasurement(
      birthValue,
      birthPoint
    );


  return measurements.map((measurement) => {

    const point = interpolateWhoPoint(
      whoSeries,
      measurement.ageDays
    );


    const actual =
      metric === "weight"
        ? measurement.weightKg
        : measurement.heightCm;


    const percentile =
      actual !== undefined &&
      actual !== null
        ? calculatePercentileFromMeasurement(
            actual,
            point
          )
        : null;


    return {
      ageDays: measurement.ageDays,
      date: measurement.date,

      actual: actual ?? null,

      median: point.median,

      p3: point.p3,

      p97: point.p97,

      personalized:
        expectedValueAtPercentile(
          point,
          birthPercentile
        ),

      percentile,
    };
  });
}
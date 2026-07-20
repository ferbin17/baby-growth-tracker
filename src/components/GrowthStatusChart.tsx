"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format } from "date-fns";

import { loadWhoData, interpolateWhoPoint, type WhoPoint } from "@/utils/who";
import type { BabyProfile, Measurement } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface GrowthStatusChartProps {
  baby: BabyProfile;
  measurements: Measurement[];
  noWrapper?: boolean;
  className?: string;
}

export function GrowthStatusChart({
  baby,
  measurements,
  noWrapper = false,
  className = "",
}: GrowthStatusChartProps) {
  const [metric, setMetric] = useState<"weight" | "height">("weight");
  const [whoSeries, setWhoSeries] = useState<WhoPoint[]>([]);

  useEffect(() => {
    async function loadWHO() {
      const data = await loadWhoData(baby.gender, metric);
      setWhoSeries(data);
    }

    void loadWHO();
  }, [baby.gender, metric]);

  const sortedMeasurements = useMemo(
    () =>
      [...measurements].sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      ),
    [measurements]
  );

  const labels = useMemo(
    () =>
      sortedMeasurements.map((measurement) =>
        format(new Date(measurement.date), "MMM d")
      ),
    [sortedMeasurements]
  );

  const data = useMemo(() => {
    const actualValues = sortedMeasurements.map((measurement) => {
      if (metric === "weight") {
        return measurement.weightKg == null
          ? null
          : Number(measurement.weightKg.toFixed(3));
      }

      return measurement.heightCm == null
        ? null
        : Number(measurement.heightCm.toFixed(1));
    });


    const whoMedianValues = sortedMeasurements.map((measurement) => {
      if (!whoSeries.length) return null;

      const point = interpolateWhoPoint(
        whoSeries,
        measurement.ageDays
      );

      return Number(point.median.toFixed(1));
    });


    return {
      labels,
      datasets: [
        {
          label:
            metric === "weight"
              ? "Baby Weight (kg)"
              : "Baby Height (cm)",
          data: actualValues,
          borderColor:
            metric === "weight"
              ? "#2563eb"
              : "#0f766e",
          backgroundColor:
            metric === "weight"
              ? "#2563eb"
              : "#0f766e",
          tension: 0.25,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
        },

        {
          label: `WHO Median (${metric})`,
          data: whoMedianValues,
          borderColor: "#94a3b8",
          backgroundColor: "#94a3b8",
          borderDash: [6, 6],
          tension: 0.25,
          fill: false,
          pointRadius: 0,
        },
      ],
    };
  }, [labels, metric, sortedMeasurements, whoSeries]);


  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: "#334155",
          },
        },
        tooltip: {
          mode: "index" as const,
          intersect: false,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#64748b",
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: "#64748b",
          },
          grid: {
            color: "rgba(148, 163, 184, 0.25)",
          },
        },
      },
    }),
    []
  );


  const wrapperClass = noWrapper
    ? `mt-6 ${className}`
    : `mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm ${className}`;


  return (
    <div className={wrapperClass}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Growth chart
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {metric === "weight" ? "Weight" : "Height"} over time
          </p>
        </div>

        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMetric("weight")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              metric === "weight"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Weight
          </button>

          <button
            type="button"
            onClick={() => setMetric("height")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              metric === "height"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Height
          </button>
        </div>
      </div>

      <div className="mt-5 h-72">
        <Line options={options} data={data} />
      </div>
    </div>
  );
}
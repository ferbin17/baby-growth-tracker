export type Metric = "weight" | "height";
export type Gender = "male" | "female";

export interface WhoPoint {
  ageDays: number;
  l: number;
  m: number;
  s: number;
  median: number;
  p3: number;
  p97: number;
}

export interface WhoSeries {
  gender: Gender;
  metric: Metric;
  points: WhoPoint[];
}

export function interpolateWhoPoint(
  series: WhoPoint[],
  ageDays: number
): WhoPoint {
  if (!series.length) {
    throw new Error("WHO growth data is empty");
  }

  const sorted = [...series].sort(
    (a, b) => a.ageDays - b.ageDays
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (ageDays <= first.ageDays) {
    return first;
  }

  if (ageDays >= last.ageDays) {
    return last;
  }

  let left = first;
  let right = sorted[1];

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].ageDays >= ageDays) {
      left = sorted[index - 1];
      right = sorted[index];
      break;
    }
  }

  const ratio =
    (ageDays - left.ageDays) /
    (right.ageDays - left.ageDays);

  return {
    ageDays,
    l: interpolate(left.l, right.l, ratio),
    m: interpolate(left.m, right.m, ratio),
    s: interpolate(left.s, right.s, ratio),
    median: interpolate(left.median, right.median, ratio),
    p3: interpolate(left.p3, right.p3, ratio),
    p97: interpolate(left.p97, right.p97, ratio),
  };
}

function interpolate(
  start: number,
  end: number,
  ratio: number
) {
  return start + (end - start) * ratio;
}

export function calculatePercentileFromMeasurement(
  value: number,
  point: WhoPoint
): number {
  const z = calculateZScore(value, point);

  const percentile = normalCDF(z);

  return Math.min(
    1,
    Math.max(0, percentile)
  );
}

export function calculateZScore(
  value: number,
  point: WhoPoint
): number {
  const { l, m, s } = point;

  if (value <= 0 || m <= 0 || s <= 0) {
    return 0;
  }

  if (l === 0) {
    return Math.log(value / m) / s;
  }

  return (
    (Math.pow(value / m, l) - 1) /
    (l * s)
  );
}

export function expectedValueAtPercentile(
  point: WhoPoint,
  percentile: number
): number {
  const safePercentile = Math.min(
    1,
    Math.max(0, percentile)
  );

  const z = inverseNormalCDF(safePercentile);

  const { l, m, s } = point;

  if (l === 0) {
    return m * Math.exp(s * z);
  }

  return m * Math.pow(
    1 + l * s * z,
    1 / l
  );
}

export async function loadWhoData(
  gender: Gender,
  metric: Metric
): Promise<WhoPoint[]> {
  const fileName = `${gender}-${metric}.json`;

  const response = await fetch(
    `/who/${fileName}`
  );

  if (!response.ok) {
    throw new Error(
      `Unable to load WHO data: ${fileName}`
    );
  }

  return (await response.json()) as WhoPoint[];
}

function normalCDF(x: number): number {
  const t =
    1 /
    (1 + 0.2316419 * Math.abs(x));

  const d =
    0.3989423 *
    Math.exp((-x * x) / 2);

  const prob =
    1 -
    d *
      t *
      (0.3193815 +
        t *
          (-0.3565638 +
            t *
              (1.7814779 +
                t *
                  (-1.821255 +
                    t *
                      1.330274))));

  return x >= 0 ? prob : 1 - prob;
}

function inverseNormalCDF(p: number): number {
  if (p <= 0) return -6;
  if (p >= 1) return 6;

  const a = [
    -39.696830286,
    220.946098424,
    -275.928510446,
    138.357751867,
    -30.664798066,
    2.506628245,
  ];

  const b = [
    -54.476098798,
    161.585836858,
    -155.698979859,
    66.801311887,
    -13.280681553,
  ];

  const c = [
    -0.007784894002,
    -0.322396458041,
    -2.400758277161,
    -2.549732539343,
    4.374664141977,
    2.938163982138,
  ];

  const d = [
    0.007784695709,
    0.322467129070,
    2.445134137143,
    3.754408661907,
  ];

  const plow = 0.02425;
  const phigh = 1 - plow;

  let q: number;
  let r: number;

  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));

    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) *
        q +
        c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));

    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) *
        q +
        c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  q = p - 0.5;
  r = q * q;

  return (
    (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) *
      r +
      a[5]) *
      q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) *
      r +
      1)
  );
}
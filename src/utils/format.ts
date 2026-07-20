function trimNumericValue(value: number, maxDecimals: number) {
  const formatted = value.toFixed(maxDecimals);
  return formatted.replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/, "");
}

export function formatWeight(value?: number | null) {
  return value == null ? "" : trimNumericValue(value, 3);
}

export function formatHeight(value?: number | null) {
  return value == null ? "" : trimNumericValue(value, 1);
}

export function formatWeightLabel(value?: number | null) {
  return value == null ? "" : `${trimNumericValue(value, 3)} kg`;
}

export function formatHeightLabel(value?: number | null) {
  return value == null ? "" : `${trimNumericValue(value, 1)} cm`;
}

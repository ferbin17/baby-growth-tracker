import type { Measurement } from "@/types";

export type MeasurementExportMetric = "weight" | "height";

export function buildMeasurementExportRows(
  measurements: Measurement[],
  metric: MeasurementExportMetric,
) {
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return [
    ["Date", "Age (days)", metric === "weight" ? "Weight (kg)" : "Height (cm)", "Notes"],
    ...sorted.map((measurement) => [
      new Date(measurement.date).toISOString().slice(0, 10),
      String(measurement.ageDays),
      metric === "weight"
        ? measurement.weightKg == null
          ? ""
          : measurement.weightKg.toFixed(3)
        : measurement.heightCm == null
          ? ""
          : measurement.heightCm.toFixed(1),
      measurement.notes ?? "",
    ]),
  ];
}

export function toCsv(rows: Array<Array<string | number>>) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const formatted = String(value ?? "");
          return `"${formatted.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
}

export function toExcelXml(rows: Array<Array<string | number>>) {
  const cells = rows
    .map(
      (row) =>
        `<Row>${row
          .map(
            (value) =>
              `<Cell><Data ss:Type="String"><![CDATA[${String(value ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]></Data></Cell>`,
          )
          .join("")}</Row>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="Baby Growth Data">
      <Table>${cells}</Table>
    </Worksheet>
  </Workbook>`;
}

export function downloadMeasurementExport(
  measurements: Measurement[],
  metric: MeasurementExportMetric,
  format: "csv" | "excel",
) {
  const rows = buildMeasurementExportRows(measurements, metric);
  const content = format === "csv" ? toCsv(rows) : toExcelXml(rows);
  const blob = new Blob([content], {
    type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `baby-growth-${metric}-${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "xls"}`;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

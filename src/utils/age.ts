import { differenceInDays, format, intervalToDuration } from "date-fns";

export function getAgeLabel(birthDate: Date, targetDate: Date) {
  if (targetDate < birthDate) {
    return "0 days";
  }

  const totalDays = differenceInDays(targetDate, birthDate);

  if (totalDays < 31) {
    return `${totalDays} day${totalDays !== 1 ? "s" : ""}`;
  }

  const duration = intervalToDuration({
    start: birthDate,
    end: targetDate,
  });

  const parts: string[] = [];

  if (duration.years) {
    parts.push(`${duration.years} year${duration.years > 1 ? "s" : ""}`);
  }

  if (duration.months) {
    parts.push(`${duration.months} month${duration.months > 1 ? "s" : ""}`);
  }

  // Show days only before 1 year old
  if (!duration.years && duration.days) {
    parts.push(`${duration.days} day${duration.days > 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? parts.join(" ") : "0 days";
}

export function formatAgeFromDays(ageDays: number) {
  if (ageDays < 0) {
    return "0 days";
  }

  if (ageDays < 31) {
    return `${ageDays} day${ageDays !== 1 ? "s" : ""}`;
  }

  const months = Math.floor(ageDays / 30);

  if (months < 12) {
    return `${months} month${months !== 1 ? "s" : ""}`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const parts: string[] = [];

  parts.push(`${years} year${years > 1 ? "s" : ""}`);

  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`);
  }

  return parts.join(" ");
}

export function formatDisplayDate(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(value.getTime())) {
    return "Invalid date";
  }

  return format(value, "MMM d, yyyy");
}

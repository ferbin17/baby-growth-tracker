import { differenceInDays, differenceInMonths, format } from "date-fns";

export function getAgeLabel(birthDate: Date, targetDate: Date) {
  const days = differenceInDays(targetDate, birthDate);
  if (days < 31) {
    return `${days} days`;
  }

  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} year${years > 1 ? "s" : ""}`);
  }
  if (months > 0) {
    parts.push(`${months} month${months > 1 ? "s" : ""}`);
  }

  return parts.join(" ");
}

export function formatAgeFromDays(ageDays: number) {
  const years = Math.floor(ageDays / 365);
  let remainder = ageDays % 365;
  const months = Math.floor(remainder / 30);
  remainder %= 30;
  const weeks = Math.floor(remainder / 7);

  const parts = [];
  if (years > 0) {
    parts.push(`${years} year${years > 1 ? "s" : ""}`);
  }
  if (months > 0) {
    parts.push(`${months} month${months > 1 ? "s" : ""}`);
  }
  if (weeks > 0) {
    parts.push(`${weeks} week${weeks > 1 ? "s" : ""}`);
  }

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return `${ageDays} day${ageDays !== 1 ? "s" : ""}`;
}

export function formatDisplayDate(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : date;
  return format(value, "MMM d, yyyy");
}

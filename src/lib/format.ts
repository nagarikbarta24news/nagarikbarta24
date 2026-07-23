import { getSiteTimezone } from "./timezone";

const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBengaliNumber(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
}

export function formatBanglaDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const formatted = d.toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: getSiteTimezone(),
  });
  return formatted;
}

export function formatBanglaDateTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: getSiteTimezone(),
  });
}

// Today's date in Bangladesh, regardless of server/client timezone.
export function todayBanglaDate(): string {
  return formatBanglaDate(new Date().toISOString());
}

export function timeAgo(value?: string | null): string {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "এইমাত্র";
  if (mins < 60) return `${toBengaliNumber(mins)} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${toBengaliNumber(hrs)} ঘণ্টা আগে`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${toBengaliNumber(days)} দিন আগে`;
  return formatBanglaDate(value);
}

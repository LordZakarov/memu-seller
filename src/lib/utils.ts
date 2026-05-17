import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
// price_mvr is stored as MVR (numeric) — display directly, no division
export function formatMVR(mvr: number) { return `MVR ${Number(mvr).toFixed(2)}`; }
export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-MV", { year: "numeric", month: "short", day: "numeric" });
}
export function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-MV", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
// For amounts stored in Laari (÷100): total_amount, order amounts, revenue
export function formatMVR(laari: number) { return `MVR ${(laari / 100).toFixed(2)}`; }
// For amounts already in MVR: price_mvr column
export function formatMVRDirect(mvr: number) { return `MVR ${Number(mvr).toFixed(2)}`; }
export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-MV", { year: "numeric", month: "short", day: "numeric" });
}
export function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-MV", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

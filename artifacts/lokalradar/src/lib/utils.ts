import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Ukjent dato";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("no-NO", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "Ukjent tidspunkt";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("no-NO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

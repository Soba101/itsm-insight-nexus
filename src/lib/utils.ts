import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format hours into a human-readable time period
 * @param hours - Number of hours
 * @returns Formatted string (e.g., "2.5h", "3.2d", "1.5w")
 */
export function formatMTTR(hours: number): string {
  if (hours < 1) {
    return `${(hours * 60).toFixed(0)}m`; // Less than 1 hour, show minutes
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`; // Less than 24 hours, show hours
  }
  if (hours < 168) {
    // Less than 7 days (168 hours), show days
    return `${(hours / 24).toFixed(1)}d`;
  }
  // 7 days or more, show weeks
  return `${(hours / 168).toFixed(1)}w`;
}

/**
 * Get SLA compliance variant based on percentage
 * @param slaPercentage - SLA compliance percentage (0-100)
 * @returns Badge variant string
 */
export function getSLAVariant(slaPercentage: number): "success" | "warning" | "destructive" {
  if (slaPercentage >= 85) return "success"; // Green
  if (slaPercentage >= 70) return "warning"; // Yellow
  return "destructive"; // Red
}

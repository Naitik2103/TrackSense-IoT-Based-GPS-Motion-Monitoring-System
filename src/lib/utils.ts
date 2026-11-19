import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCoordinate(val: number | null | undefined, decimals: number = 6): string {
  if (val === undefined || val === null || isNaN(val)) return "—";
  return val.toFixed(decimals);
}

export function formatTime(isoString: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  } catch {
    return isoString;
  }
}

export function timeAgo(isoString: string): string {
  if (!isoString) return "never";
  try {
    const now = Date.now();
    const past = new Date(isoString).getTime();
    const diffSec = Math.max(0, Math.floor((now - past) / 1000));

    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  } catch {
    return "recently";
  }
}

export function getGoogleMapsUrl(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function getHdopQuality(hdop: number): { label: string; color: string } {
  if (hdop <= 1.0) return { label: "Ideal", color: "text-emerald-500" };
  if (hdop <= 2.0) return { label: "Excellent", color: "text-emerald-400" };
  if (hdop <= 5.0) return { label: "Moderate", color: "text-amber-500" };
  return { label: "Poor", color: "text-rose-500" };
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

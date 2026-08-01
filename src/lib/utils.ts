import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseTTL(ttl: string | undefined, defaultSecs: number): number {
  if (!ttl) return defaultSecs;
  const match = ttl.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    const parsed = parseInt(ttl, 10);
    return isNaN(parsed) ? defaultSecs : parsed;
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: return defaultSecs;
  }
}

export function formatTTL(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (d > 0) parts.push(`${d} day${d !== 1 ? 's' : ''}`);
  if (h > 0) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
  if (s > 0 || parts.length === 0) parts.push(`${s} second${s !== 1 ? 's' : ''}`);

  return parts[0] || '0 seconds';
}

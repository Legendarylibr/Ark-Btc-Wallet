import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { isValidArkAddress } from "@/lib/ark-address";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(addr: string, start = 8, end = 6): string {
  if (addr.length <= start + end + 3) return addr;
  return `${addr.slice(0, start)}…${addr.slice(-end)}`;
}

export function isArkAddress(addr: string): boolean {
  return isValidArkAddress(addr);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

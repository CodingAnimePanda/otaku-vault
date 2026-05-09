import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function proxyImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("mangadex.org")) {
    return `/api/media/proxy-cover?url=${encodeURIComponent(url)}`;
  }
  return url;
}

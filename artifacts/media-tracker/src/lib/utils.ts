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

export function categoryLabel(cat: string): string {
  const map: Record<string, string> = { normie_tv: "TV Show", normie_movie: "Movie", normie_book: "Book" };
  return map[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}
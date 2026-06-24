// artifacts/media-tracker/src/pages/recommendations.tsx
import React, { useState } from "react";
import {
  useGetRecommendations,
  useCreateMedia,
  getListMediaQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Sparkles, BookOpen, ListPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["webtoon", "manhwa", "manga", "anime"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  webtoon: "Webtoons", manhwa: "Manhwa", manga: "Manga", anime: "Anime",
};

const API_BASE = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";

function proxyCover(url: string | null | undefined): string | null {
  if (!url) return null;
  // Proxy MangaDex images through backend to avoid CORS; pass others through directly
  if (url.includes("mangadex.org") || url.includes("uploads.mangadex")) {
    return `${API_BASE}/api/media/proxy/image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

type Rec = {
  title: string;
  category: string;
  coverUrl?: string | null;
  genres: string[];
  score?: number | null;
  synopsis?: string | null;
  source?: string;
};

function RecDetailModal({ rec, open, onClose, onAddLibrary, onAddToRead, addedIds }: {
  rec: Rec | null;
  open: boolean;
  onClose: () => void;
  onAddLibrary: (rec: Rec) => void;
  onAddToRead: (rec: Rec) => void;
  addedIds: Set<string>;
}) {
  if (!rec) return null;
  const cover = proxyCover(rec.coverUrl);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl pr-8 leading-tight">{rec.title}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4">
          <div className="w-28 flex-shrink-0">
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted">
              {cover
                ? <img src={cover} alt={rec.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center px-2">{rec.title}</div>
              }
            </div>
          </div>
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">{rec.category}</Badge>
              {rec.score && (
                <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" />{rec.score.toFixed(1)}
                </div>
              )}
              {rec.source && <span className="text-xs text-muted-foreground">{rec.source}</span>}
            </div>
            {rec.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {rec.genres.map((g) => (
                  <span key={g} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{g}</span>
                ))}
              </div>
            )}
            {rec.synopsis && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">{rec.synopsis}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" className={cn("flex-1 gap-1 text-xs", addedIds.has(`${rec.title}-library`) ? "bg-green-600" : "")}
                onClick={() => onAddLibrary(rec)} disabled={addedIds.has(`${rec.title}-library`)}>
                <BookOpen className="w-3.5 h-3.5" />
                {addedIds.has(`${rec.title}-library`) ? "In Library ✓" : "Add to Library"}
              </Button>
              <Button size="sm" variant="outline" className={cn("flex-1 gap-1 text-xs", addedIds.has(`${rec.title}-to_read`) ? "opacity-60" : "")}
                onClick={() => onAddToRead(rec)} disabled={addedIds.has(`${rec.title}-to_read`)}>
                <ListPlus className="w-3.5 h-3.5" />
                {addedIds.has(`${rec.title}-to_read`) ? "In To-Read ✓" : "To-Read"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Recommendations() {
  const [activeCategory, setActiveCategory] = useState<Category | undefined>(undefined);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedRec, setSelectedRec] = useState<Rec | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recommendations, isLoading } = useGetRecommendations(
    activeCategory ? { category: activeCategory } : {}
  );

  const createMedia = useCreateMedia();

  const handleAddToToRead = (rec: Rec) => {
    const key = `${rec.title}-to_read`;
    createMedia.mutate(
      { data: { title: rec.title, category: rec.category as Category, listType: "to_read", coverUrl: rec.coverUrl ?? null, genres: rec.genres } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "to_read" }) });
          setAddedIds((prev) => new Set([...prev, key]));
          toast({ title: "Added to To-Read", description: `${rec.title} added to your to-read list.` });
        },
      }
    );
  };

  const handleAddToLibrary = (rec: Rec) => {
    const key = `${rec.title}-library`;
    createMedia.mutate(
      { data: { title: rec.title, category: rec.category as Category, listType: "library", status: "completed", coverUrl: rec.coverUrl ?? null, genres: rec.genres } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "library" }) });
          setAddedIds((prev) => new Set([...prev, key]));
          toast({ title: "Added to Library", description: `${rec.title} added to your library as completed.` });
        },
      }
    );
  };

  const recommendationsArray = Array.isArray(recommendations) ? recommendations : [];
  const filtered = activeCategory
    ? recommendationsArray.filter((r) => r.category === activeCategory)
    : recommendationsArray;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Recommended</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Curated picks — click any title to read more</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveCategory(undefined)}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all",
            !activeCategory ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}>All</button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeCategory === cat ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}>{CATEGORY_LABELS[cat]}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] bg-muted animate-pulse rounded-xl" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Star className="w-10 h-10 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No recommendations available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filtered.map((rec, idx) => {
            const cover = proxyCover(rec.coverUrl);
            return (
              <div key={`${rec.title}-${idx}`}
                className="group relative cursor-pointer"
                onClick={() => setSelectedRec(rec)}>
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted relative">
                  {cover ? (
                    <img src={cover} alt={rec.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/50 text-xs text-muted-foreground px-3 text-center">
                      {rec.title}
                    </div>
                  )}
                  {rec.score && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-yellow-400 rounded-md px-2 py-1 text-xs font-bold backdrop-blur-sm">
                      <Star className="w-3 h-3 fill-current" />{rec.score.toFixed(1)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full">Click to expand</span>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <h3 className="text-sm font-medium leading-tight line-clamp-2">{rec.title}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{rec.category}</Badge>
                    {rec.source && <span className="text-[10px] text-muted-foreground">{rec.source}</span>}
                  </div>
                  {rec.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rec.genres.slice(0, 2).map((g) => (
                        <span key={g} className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RecDetailModal
        rec={selectedRec}
        open={!!selectedRec}
        onClose={() => setSelectedRec(null)}
        onAddLibrary={handleAddToLibrary}
        onAddToRead={handleAddToToRead}
        addedIds={addedIds}
      />
    </div>
  );
}
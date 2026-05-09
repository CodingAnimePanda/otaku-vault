import React, { useState } from "react";
import {
  useGetRecommendations,
  useCreateMedia,
  getListMediaQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Star, Sparkles } from "lucide-react";
import { cn, proxyImage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["webtoon", "manhwa", "manga", "anime"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  webtoon: "Webtoons",
  manhwa: "Manhwa",
  manga: "Manga",
  anime: "Anime",
};

export default function Recommendations() {
  const [activeCategory, setActiveCategory] = useState<Category | undefined>(undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recommendations, isLoading } = useGetRecommendations(
    activeCategory ? { category: activeCategory } : {}
  );

  const createMedia = useCreateMedia();

  const handleAdd = (rec: { title: string; category: string; coverUrl?: string | null; genres: string[] }) => {
    createMedia.mutate(
      {
        data: {
          title: rec.title,
          category: rec.category as Category,
          listType: "to_read",
          coverUrl: rec.coverUrl ?? null,
          genres: rec.genres,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "to_read" }) });
          toast({ title: "Added to To-Read", description: `${rec.title} added to your to-read list.` });
        },
      }
    );
  };

  const filtered = activeCategory
    ? (recommendations ?? []).filter((r) => r.category === activeCategory)
    : recommendations ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Recommended</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Curated picks based on what you love
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          data-testid="tab-all"
          onClick={() => setActiveCategory(undefined)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            !activeCategory
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-card/80"
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            data-testid={`tab-${cat}`}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeCategory === cat
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-card/80"
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] bg-muted animate-pulse rounded-xl" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Star className="w-10 h-10 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No recommendations available right now.</p>
          <p className="text-xs text-muted-foreground mt-1">Add more titles to your library to get personalized picks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filtered.map((rec, idx) => (
            <div
              key={`${rec.title}-${idx}`}
              data-testid={`rec-card-${idx}`}
              className="group relative"
            >
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted relative">
                {rec.coverUrl ? (
                  <img
                    src={proxyImage(rec.coverUrl) ?? ""}
                    alt={rec.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/50 text-xs text-muted-foreground px-3 text-center">
                    {rec.title}
                  </div>
                )}
                {rec.score && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-yellow-400 rounded-md px-2 py-1 text-xs font-bold backdrop-blur-sm">
                    <Star className="w-3 h-3 fill-current" />
                    {rec.score.toFixed(1)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 gap-2">
                  {rec.synopsis && (
                    <p className="text-xs text-white/90 line-clamp-4 leading-relaxed">
                      {rec.synopsis}
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="w-full bg-primary/90 hover:bg-primary text-xs h-7"
                    onClick={() => handleAdd(rec)}
                    data-testid={`add-rec-${idx}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add to To-Read
                  </Button>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <h3 className="text-sm font-medium leading-tight line-clamp-2">{rec.title}</h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                    {rec.category}
                  </Badge>
                  {rec.source && (
                    <span className="text-[10px] text-muted-foreground">{rec.source}</span>
                  )}
                </div>
                {rec.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rec.genres.slice(0, 2).map((g) => (
                      <span key={g} className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

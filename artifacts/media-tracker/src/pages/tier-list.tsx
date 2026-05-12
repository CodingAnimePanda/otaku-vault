import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useListMedia,
  useUpdateMediaTier,
  getListMediaQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, proxyImage } from "@/lib/utils";

const CATEGORIES = ["webtoon", "manhwa", "manga", "anime"] as const;
type Category = (typeof CATEGORIES)[number];
const TIERS = ["S", "A", "B", "C", "D", "F"] as const;
type Tier = (typeof TIERS)[number];

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  S: { label: "S — Legendary", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  A: { label: "A — Excellent", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  B: { label: "B — Great", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  C: { label: "C — Average", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  D: { label: "D — Below Average", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  F: { label: "F — Dropped", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
};

const CATEGORY_LABELS: Record<Category, string> = {
  webtoon: "Webtoons",
  manhwa: "Manhwa",
  manga: "Manga",
  anime: "Anime",
};

export default function TierList() {
  const params = useParams<{ category: string }>();
  const [, setLocation] = useLocation();
  const category = (params.category as Category) || "manhwa";
  const queryClient = useQueryClient();

  const { data: media, isLoading } = useListMedia({ category, listType: "library" });
  const updateTier = useUpdateMediaTier();

  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOverTier, setDragOverTier] = useState<Tier | null>(null);

  const handleDragStart = (id: number) => setDragging(id);
  const handleDragEnd = () => { setDragging(null); setDragOverTier(null); };

  const handleDrop = (tier: Tier) => {
    if (dragging == null) return;
    updateTier.mutate(
      { id: dragging, data: { tier } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ category, listType: "library" }) });
        },
      }
    );
    setDragging(null);
    setDragOverTier(null);
  };

  const mediaArray = Array.isArray(media) ? media : [];

  const tierGroups: Record<Tier, typeof mediaArray> = {
    S: [], A: [], B: [], C: [], D: [], F: [],
  };
  const unranked: typeof mediaArray = [];

  mediaArray.forEach((item) => {
    if (item.tier && item.tier in tierGroups) {
      tierGroups[item.tier as Tier]!.push(item);
    } else {
      unranked.push(item);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Tier Lists</h1>
        <p className="text-muted-foreground mt-1">Drag media between tiers to rank them</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            data-testid={`tab-${cat}`}
            onClick={() => setLocation(`/tierlist/${cat}`)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              category === cat
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-card/80"
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {TIERS.map((t) => (
            <div key={t} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {TIERS.map((tier) => (
            <div
              key={tier}
              data-testid={`tier-row-${tier}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverTier(tier); }}
              onDragLeave={() => setDragOverTier(null)}
              onDrop={() => handleDrop(tier)}
              className={cn(
                "flex gap-3 rounded-xl border p-3 min-h-[88px] transition-all",
                TIER_CONFIG[tier].bg,
                dragOverTier === tier && "ring-2 ring-primary/50 scale-[1.01]"
              )}
            >
              <div className="flex-shrink-0 w-14 flex items-center justify-center">
                <span className={cn("text-4xl font-display font-black", TIER_CONFIG[tier].color)}>
                  {tier}
                </span>
              </div>
              <div className="flex-1 flex flex-wrap gap-3 items-center">
                {tierGroups[tier].length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    Drop {CATEGORY_LABELS[category].toLowerCase()} here
                  </span>
                ) : (
                  tierGroups[tier].map((item) => (
                    <div
                      key={item.id}
                      data-testid={`tier-card-${item.id}`}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-16 group",
                        dragging === item.id && "opacity-40"
                      )}
                    >
                      <div className="w-16 h-24 rounded-md overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary/50 transition-all">
                        {item.coverUrl || item.customCoverUrl ? (
                          <img
                            src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                            {item.title}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-center leading-tight line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        {item.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          {/* Unranked pool */}
          {unranked.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Unranked — drag to a tier above
              </h3>
              <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-dashed border-border bg-muted/20 min-h-[100px]">
                {unranked.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`unranked-card-${item.id}`}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-16 group",
                      dragging === item.id && "opacity-40"
                    )}
                  >
                    <div className="w-16 h-24 rounded-md overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary/50 transition-all">
                      {item.coverUrl || item.customCoverUrl ? (
                        <img
                          src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                          {item.title}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-center leading-tight line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mediaArray.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">
                No {CATEGORY_LABELS[category].toLowerCase()} in your library yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add some from the Library tab to start ranking.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
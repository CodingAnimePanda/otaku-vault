// artifacts/media-tracker/src/pages/tier-list.tsx
import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useListMedia,
  useUpdateMediaTier,
  getListMediaQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, proxyImage } from "@/lib/utils";
import { ChevronDown, ChevronRight, GripHorizontal } from "lucide-react";

const CATEGORIES = ["webtoon", "manhwa", "manhua", "manga", "anime"] as const;
type Category = (typeof CATEGORIES)[number];
const TIERS = ["S", "A", "B", "C", "D", "F"] as const;
type Tier = (typeof TIERS)[number];

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  S: { label: "S — Legendary", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" },
  A: { label: "A — Excellent", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30 text-orange-500" },
  B: { label: "B — Great", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30 text-green-500" },
  C: { label: "C — Average", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30 text-blue-500" },
  D: { label: "D — Below Average", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30 text-purple-500" },
  F: { label: "F — Dropped", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30 text-red-500" },
};

const CATEGORY_LABELS: Record<Category, string> = {
  webtoon: "Webtoons",
  manhwa: "Manhwa",
  manhua: "Manhua",
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
  const [collapsedTiers, setCollapsedTiers] = useState<Set<Tier>>(new Set());

  const toggleTier = (tier: Tier) => {
    setCollapsedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

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
      <div className="flex gap-2 flex-wrap pb-2 border-b border-border">
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
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Main Tiers Column */}
          <div className="flex-1 w-full space-y-4">
            {TIERS.map((tier) => {
              const isCollapsed = collapsedTiers.has(tier);
              return (
                <div
                  key={tier}
                  data-testid={`tier-row-${tier}`}
                  className={cn(
                    "flex flex-col rounded-xl border transition-all overflow-hidden",
                    TIER_CONFIG[tier].bg,
                    dragOverTier === tier && "ring-2 ring-primary/50 scale-[1.01]"
                  )}
                >
                  {/* Tier Header (Clickable for collapse) */}
                  <div
                    className="flex items-center p-3 cursor-pointer select-none hover:bg-foreground/5 transition-colors"
                    onClick={() => toggleTier(tier)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverTier(tier); }}
                    onDrop={() => handleDrop(tier)}
                  >
                    <div className="w-16 flex items-center justify-center border-r border-current/20 mr-4 pr-2">
                      <span className={cn("text-4xl font-display font-black", TIER_CONFIG[tier].color)}>
                        {tier}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm opacity-90">{TIER_CONFIG[tier].label}</span>
                        <span className="ml-2 text-xs opacity-70 bg-background/50 px-2 py-0.5 rounded-full">
                          {tierGroups[tier].length} items
                        </span>
                      </div>
                      {isCollapsed ? <ChevronRight className="w-5 h-5 opacity-70" /> : <ChevronDown className="w-5 h-5 opacity-70" />}
                    </div>
                  </div>

                  {/* Tier Content Grid */}
                  {!isCollapsed && (
                    <div
                      className="p-3 pt-0 flex flex-wrap gap-3 min-h-[100px]"
                      onDragOver={(e) => { e.preventDefault(); setDragOverTier(tier); }}
                      onDrop={() => handleDrop(tier)}
                    >
                      {tierGroups[tier].length === 0 ? (
                        <div className="w-full flex items-center justify-center opacity-50 py-4">
                          <span className="text-xs italic">Drop {CATEGORY_LABELS[category].toLowerCase()} here</span>
                        </div>
                      ) : (
                        tierGroups[tier].map((item) => (
                          <div
                            key={item.id}
                            data-testid={`tier-card-${item.id}`}
                            draggable
                            onDragStart={() => handleDragStart(item.id)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-[72px] group",
                              dragging === item.id && "opacity-40 scale-95"
                            )}
                          >
                            <div className="w-full h-[108px] rounded-md overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary transition-all relative">
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
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <GripHorizontal className="w-6 h-6 text-white drop-shadow-md" />
                              </div>
                            </div>
                            <span className="text-[10px] text-center leading-tight line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
                              {item.title}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {mediaArray.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl border-border">
                <p className="text-muted-foreground font-medium">
                  No {CATEGORY_LABELS[category].toLowerCase()} in your library yet.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add some from the Library tab to start ranking.
                </p>
              </div>
            )}
          </div>

          {/* Unranked Pool Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0 sticky top-4 bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col max-h-[calc(100vh-2rem)]">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
              <h3 className="font-semibold text-sm">Unranked Pool</h3>
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                {unranked.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 pb-2">
              {unranked.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground italic py-8">
                  Everything is ranked!
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {unranked.map((item) => (
                    <div
                      key={item.id}
                      data-testid={`unranked-card-${item.id}`}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-16 group",
                        dragging === item.id && "opacity-40 scale-95"
                      )}
                    >
                      <div className="w-16 h-24 rounded-md overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary transition-all relative">
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
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <GripHorizontal className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                      </div>
                      <span className="text-[10px] text-center leading-tight line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useGetMediaStats, useListMedia } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Tv, Sparkles, PlayCircle, Clock } from "lucide-react";
import { AddMediaDialog } from "@/components/add-media-dialog";
import { cn, proxyImage } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  webtoon: <BookOpen className="w-5 h-5" />,
  manhwa: <BookOpen className="w-5 h-5" />,
  manga: <BookOpen className="w-5 h-5" />,
  anime: <Tv className="w-5 h-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  webtoon: "text-blue-400 bg-blue-500/10",
  manhwa: "text-purple-400 bg-purple-500/10",
  manga: "text-orange-400 bg-orange-500/10",
  anime: "text-pink-400 bg-pink-500/10",
};

const STATUS_LABELS: Record<string, string> = {
  reading: "Reading",
  watching: "Watching",
  completed: "Completed",
  paused: "Paused",
  dropped: "Dropped",
  plan_to_read: "Plan to read",
};

const STATUS_COLORS: Record<string, string> = {
  reading: "bg-green-500/10 text-green-400",
  watching: "bg-blue-500/10 text-blue-400",
  completed: "bg-primary/10 text-primary",
  paused: "bg-yellow-500/10 text-yellow-400",
  dropped: "bg-red-500/10 text-red-400",
  plan_to_read: "bg-muted text-muted-foreground",
};

export default function Dashboard() {
  const [addOpen, setAddOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { data: stats } = useGetMediaStats();
  const { data: media, isLoading: mediaLoading } = useListMedia({ listType: "library" });

  const totalItems = Object.values(stats?.totalByCategory ?? {}).reduce((a, b) => a + b, 0);

  // Continue reading: paused first, then reading/watching, sorted by updatedAt DESC
  const continueItems = useMemo(() => {
    if (!media) return [];
    return media
      .filter((m) => m.status === "paused" || m.status === "reading" || m.status === "watching")
      .sort((a, b) => {
        const tierA = a.status === "paused" ? 0 : 1;
        const tierB = b.status === "paused" ? 0 : 1;
        if (tierA !== tierB) return tierA - tierB;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, 6);
  }, [media]);

  const featured = continueItems[0];
  const restContinue = continueItems.slice(1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Your Library</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {totalItems > 0
              ? `${totalItems} titles tracked across all categories`
              : "A collection of your tracked media"}
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-2 shadow-lg"
          data-testid="button-add-media"
        >
          <Plus className="w-4 h-4" />
          Add Media
        </Button>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["webtoon", "manhwa", "manga", "anime"] as const).map((cat) => {
            const total = stats.totalByCategory[cat] ?? 0;
            const completed = stats.completedByCategory[cat] ?? 0;
            return (
              <button
                key={cat}
                data-testid={`stat-card-${cat}`}
                onClick={() => setLocation(`/tierlist/${cat}`)}
                className="text-left p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", CATEGORY_COLORS[cat])}>
                  {CATEGORY_ICONS[cat]}
                </div>
                <p className="text-xs text-muted-foreground capitalize font-medium mb-0.5">{cat}</p>
                <p className="text-3xl font-display font-bold">{total}</p>
                {completed > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">{completed} completed</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick stats */}
      {stats && (
        <div className="flex gap-3 flex-wrap">
          {stats.updatesAvailable > 0 && (
            <button
              onClick={() => setLocation("/updates")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400 hover:bg-green-500/15 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {stats.updatesAvailable} update{stats.updatesAvailable !== 1 ? "s" : ""} available
            </button>
          )}
          {stats.toReadCount > 0 && (
            <button
              onClick={() => setLocation("/to-read")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 hover:bg-blue-500/15 transition-colors"
            >
              {stats.toReadCount} in to-read list
            </button>
          )}
          {stats.avoidCount > 0 && (
            <button
              onClick={() => setLocation("/avoid")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive hover:bg-destructive/15 transition-colors"
            >
              {stats.avoidCount} to avoid
            </button>
          )}
        </div>
      )}

      {/* ── Continue Reading ── */}
      {continueItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <PlayCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-semibold">Continue Reading</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Featured card */}
            {featured && (
              <div className="lg:col-span-1 flex gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden shadow-lg ring-1 ring-primary/20">
                  {featured.coverUrl || featured.customCoverUrl ? (
                    <img
                      src={proxyImage(featured.customCoverUrl || featured.coverUrl) ?? ""}
                      alt={featured.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-primary/40" />
                    </div>
                  )}
                </div>
                <div className="relative flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", STATUS_COLORS[featured.status ?? ""] ?? "bg-muted text-muted-foreground")}>
                        {STATUS_LABELS[featured.status ?? ""] ?? featured.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">{featured.category}</span>
                    </div>
                    <h3 className="font-display font-semibold text-base leading-tight line-clamp-2 mb-1">
                      {featured.title}
                    </h3>
                    {featured.currentChapter && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {featured.currentChapter}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 gap-1.5 h-8 text-xs w-full"
                    onClick={() => {}}
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {featured.status === "paused" ? "Pick Back Up" : "Continue"}
                  </Button>
                </div>
              </div>
            )}

            {/* Smaller cards */}
            {restContinue.length > 0 && (
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {restContinue.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-2.5 p-2.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all group cursor-default"
                  >
                    <div className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      {item.coverUrl || item.customCoverUrl ? (
                        <img
                          src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-xs font-medium leading-tight line-clamp-2 mb-0.5">{item.title}</h4>
                      <span className={cn("text-[9px] font-medium px-1 py-0.5 rounded self-start", STATUS_COLORS[item.status ?? ""] ?? "bg-muted text-muted-foreground")}>
                        {STATUS_LABELS[item.status ?? ""] ?? item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── All Media ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-display font-semibold">All Media</h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-xs text-muted-foreground"
            onClick={() => setLocation("/recommended")}
            data-testid="button-see-recommendations"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Discover more
          </Button>
        </div>

        {mediaLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[2/3] bg-muted animate-pulse rounded-xl" />
                <div className="h-3.5 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : media && media.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {media.map((item) => (
              <div key={item.id} data-testid={`media-card-${item.id}`} className="group relative">
                <div className="aspect-[2/3] bg-muted rounded-xl overflow-hidden relative ring-1 ring-border/50 group-hover:ring-primary/40 transition-all duration-300">
                  {item.coverUrl || item.customCoverUrl ? (
                    <img
                      src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 text-xs p-4 text-center gap-2">
                      <BookOpen className="w-5 h-5 text-muted-foreground/50" />
                      <span className="text-muted-foreground">{item.title}</span>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-1">
                    {item.status && (
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded self-start", STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground")}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    )}
                    {item.tier && (
                      <span className="text-xs font-display font-bold text-yellow-400">Tier {item.tier}</span>
                    )}
                    {item.currentChapter && (
                      <span className="text-[10px] text-white/70">{item.currentChapter}</span>
                    )}
                  </div>
                  {item.hasUpdate && (
                    <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                  )}
                  {item.tier && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-xs font-display font-black text-yellow-400">{item.tier}</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-0.5">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.title}</h3>
                  <p className={cn("text-xs capitalize font-medium", CATEGORY_COLORS[item.category]?.split(" ")[0] ?? "text-muted-foreground")}>
                    {item.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">Your library is empty</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                Start by adding the webtoons, manga, manhwa, and anime you've read or watched.
              </p>
              <Button onClick={() => setAddOpen(true)} className="gap-2" data-testid="button-add-first">
                <Plus className="w-4 h-4" />
                Add your first title
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddMediaDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

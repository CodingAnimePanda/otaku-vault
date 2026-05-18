// artifacts/media-tracker/src/pages/dashboard.tsx
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useGetMediaStats,
  useListMedia,
  useUpdateMedia,
  useDeleteMedia,
  getListMediaQueryKey,
  getGetMediaStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, BookOpen, Tv, Sparkles, PlayCircle, Clock,
  Search, ExternalLink, Pencil, XCircle, AlertTriangle,
  Heart, ChevronDown, ChevronRight, Star,
} from "lucide-react";
import { AddMediaDialog } from "@/components/add-media-dialog";
import { EditMediaDialog } from "@/components/edit-media-dialog";
import { cn, proxyImage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  reading: "Reading", watching: "Watching", completed: "Completed",
  paused: "Paused", dropped: "Dropped", plan_to_read: "Plan to read",
};

const STATUS_COLORS: Record<string, string> = {
  reading: "bg-green-500/10 text-green-400",
  watching: "bg-blue-500/10 text-blue-400",
  completed: "bg-primary/10 text-primary",
  paused: "bg-yellow-500/10 text-yellow-400",
  dropped: "bg-red-500/10 text-red-400",
  plan_to_read: "bg-muted text-muted-foreground",
};

function getSiteLabel(url: string | null | undefined): string {
  if (!url) return "Read Now";
  if (url.includes("webtoons.com")) return "Webtoon";
  if (url.includes("mangafire")) return "MangaFire";
  if (url.includes("vymanga")) return "VyManga";
  try { return new URL(url).hostname.replace("www.", ""); } catch { return "Read Now"; }
}

// ── Favorites localStorage helpers ────────────────────────────────────────────
function loadFavorites(): Set<number> {
  try {
    const stored = localStorage.getItem("ov_favorites");
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}
function saveFavorites(favs: Set<number>) {
  try { localStorage.setItem("ov_favorites", JSON.stringify([...favs])); } catch {}
}

// ── Drop reasons localStorage helpers ─────────────────────────────────────────
function loadDropReasons(): Record<number, string> {
  try {
    const stored = localStorage.getItem("ov_drop_reasons");
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}
function saveDropReasons(reasons: Record<number, string>) {
  try { localStorage.setItem("ov_drop_reasons", JSON.stringify(reasons)); } catch {}
}

// ── Collapsible Section ───────────────────────────────────────────────────────
function CollapsibleSection({
  title, icon, count, color, defaultOpen = false, children,
}: {
  title: string; icon: React.ReactNode; count: number;
  color: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
          {icon}
        </div>
        <h2 className="text-base font-display font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
        <div className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>
      {open && children}
    </div>
  );
}

// ── Small Media Card ──────────────────────────────────────────────────────────
function SmallMediaCard({
  item, onEdit, onDrop, onAvoid, onToggleFavorite, isFavorite, dropReason,
}: {
  item: any; onEdit: () => void; onDrop: () => void; onAvoid: () => void;
  onToggleFavorite: () => void; isFavorite: boolean; dropReason?: string;
}) {
  return (
    <div className="group relative flex gap-2.5 p-2.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all">
      <div className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {item.coverUrl || item.customCoverUrl ? (
          <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1">
          <h4 className="text-xs font-medium leading-tight line-clamp-1 flex-1">{item.title}</h4>
          <button onClick={onToggleFavorite} className="flex-shrink-0 mt-0.5">
            <Heart className={cn("w-3 h-3 transition-colors", isFavorite ? "fill-rose-400 text-rose-400" : "text-muted-foreground hover:text-rose-400")} />
          </button>
        </div>
        <p className={cn("text-[10px] capitalize mt-0.5", CATEGORY_COLORS[item.category]?.split(" ")[0] ?? "text-muted-foreground")}>
          {item.category}
        </p>
        {item.currentChapter && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{item.currentChapter}</p>
        )}
        {dropReason && (
          <p className="text-[10px] text-red-400/80 mt-0.5 italic line-clamp-1">"{dropReason}"</p>
        )}
        <div className="flex items-center gap-1 mt-1.5">
          <button onClick={onEdit} className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
            <Pencil className="w-2.5 h-2.5" /> Edit
          </button>
          {(item as any).readingUrl && (
            <a href={(item as any).readingUrl} target="_blank" rel="noopener noreferrer"
              className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors ml-1">
              <ExternalLink className="w-2.5 h-2.5" /> Read
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [favorites, setFavorites] = useState<Set<number>>(loadFavorites);
  const [dropReasons, setDropReasons] = useState<Record<number, string>>(loadDropReasons);

  const { data: stats } = useGetMediaStats();
  const { data: media, isLoading: mediaLoading } = useListMedia({ listType: "library" });
  const updateMedia = useUpdateMedia();

  const mediaArray = Array.isArray(media) ? media : [];

  const continueItems = useMemo(() => {
    if (!mediaArray.length) return [];
    return mediaArray
      .filter((m) => m.status === "paused" || m.status === "reading" || m.status === "watching")
      .sort((a, b) => {
        const tierA = a.status === "paused" ? 0 : 1;
        const tierB = b.status === "paused" ? 0 : 1;
        if (tierA !== tierB) return tierA - tierB;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, 6);
  }, [mediaArray]);

  const filteredMedia = useMemo(() => {
    if (!searchQuery.trim()) return mediaArray;
    const q = searchQuery.toLowerCase();
    return mediaArray.filter((m) =>
      m.title.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      (m.status ?? "").toLowerCase().includes(q)
    );
  }, [mediaArray, searchQuery]);

  // Grouped sections
  const favoriteItems = useMemo(() =>
    mediaArray.filter((m) => favorites.has(m.id) || m.tier === "S"), [mediaArray, favorites]);
  const readingItems = useMemo(() =>
    mediaArray.filter((m) => m.status === "reading" || m.status === "watching"), [mediaArray]);
  const onHoldItems = useMemo(() =>
    mediaArray.filter((m) => m.status === "paused"), [mediaArray]);
  const completedItems = useMemo(() =>
    mediaArray.filter((m) => m.status === "completed"), [mediaArray]);
  const droppedItems = useMemo(() =>
    mediaArray.filter((m) => m.status === "dropped"), [mediaArray]);

  const featured = continueItems[0];
  const restContinue = continueItems.slice(1);

  const handleDrop = (id: number, title: string) => {
    updateMedia.mutate({ id, data: { status: "dropped" } as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
        toast({ title: "Dropped", description: `${title} marked as dropped.` });
      },
    });
  };

  const handleMoveToAvoid = (id: number, title: string) => {
    updateMedia.mutate({ id, data: { listType: "avoid" } as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
        toast({ title: "Moved to Avoid", description: `${title} added to your avoid list.` });
      },
    });
  };

  const handleToggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  };

  const totalItems = Object.values(stats?.totalByCategory ?? {}).reduce((a, b) => a + b, 0);

  const sectionCardGrid = (items: any[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
      {items.map((item) => (
        <SmallMediaCard
          key={item.id}
          item={item}
          onEdit={() => setEditItem(item)}
          onDrop={() => handleDrop(item.id, item.title)}
          onAvoid={() => handleMoveToAvoid(item.id, item.title)}
          onToggleFavorite={() => handleToggleFavorite(item.id)}
          isFavorite={favorites.has(item.id)}
          dropReason={dropReasons[item.id]}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Your Library</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {totalItems > 0 ? `${totalItems} titles tracked across all categories` : "A collection of your tracked media"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 shadow-lg" data-testid="button-add-media">
          <Plus className="w-4 h-4" /> Add Media
        </Button>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["webtoon", "manhwa", "manga", "anime"] as const).map((cat) => {
            const total = stats?.totalByCategory?.[cat] ?? 0;
            const completed = stats?.completedByCategory?.[cat] ?? 0;
            return (
              <button key={cat} data-testid={`stat-card-${cat}`}
                onClick={() => setLocation(`/tierlist/${cat}`)}
                className="text-left p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", CATEGORY_COLORS[cat])}>
                  {CATEGORY_ICONS[cat]}
                </div>
                <p className="text-xs text-muted-foreground capitalize font-medium mb-0.5">{cat}</p>
                <p className="text-3xl font-display font-bold">{total}</p>
                {completed > 0 && <p className="text-[10px] text-muted-foreground mt-1">{completed} completed</p>}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick stats */}
      {stats && (
        <div className="flex gap-3 flex-wrap">
          {stats.toReadCount > 0 && (
            <button onClick={() => setLocation("/to-read")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 hover:bg-blue-500/15 transition-colors">
              {stats.toReadCount} in to-read list
            </button>
          )}
          {stats.avoidCount > 0 && (
            <button onClick={() => setLocation("/avoid")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive hover:bg-destructive/15 transition-colors">
              {stats.avoidCount} to avoid
            </button>
          )}
        </div>
      )}

      {/* Continue Reading */}
      {continueItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <PlayCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-semibold">Continue Reading</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {featured && (
              <div className="lg:col-span-1 flex gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden group">
                <div className="relative w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden shadow-lg ring-1 ring-primary/20">
                  {featured.coverUrl || featured.customCoverUrl ? (
                    <img src={proxyImage(featured.customCoverUrl || featured.coverUrl) ?? ""} alt={featured.title} className="w-full h-full object-cover" />
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
                    <h3 className="font-display font-semibold text-base leading-tight line-clamp-2 mb-1">{featured.title}</h3>
                    {featured.currentChapter && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{featured.currentChapter}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {(featured as any).readingUrl ? (
                      <a href={(featured as any).readingUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                        {featured.status === "paused" ? "Pick Back Up" : "Continue"}
                      </a>
                    ) : (
                      <Button size="sm" className="flex-1 gap-1.5 h-8 text-xs">
                        <PlayCircle className="w-3.5 h-3.5" />
                        {featured.status === "paused" ? "Pick Back Up" : "Continue"}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setEditItem(featured)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {restContinue.length > 0 && (
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {restContinue.map((item) => (
                  <div key={item.id} className="flex gap-2.5 p-2.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all group">
                    <div className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      {item.coverUrl || item.customCoverUrl ? (
                        <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-medium leading-tight line-clamp-2 mb-0.5">{item.title}</h4>
                        <span className={cn("text-[9px] font-medium px-1 py-0.5 rounded", STATUS_COLORS[item.status ?? ""] ?? "bg-muted text-muted-foreground")}>
                          {STATUS_LABELS[item.status ?? ""] ?? item.status}
                        </span>
                      </div>
                      <button onClick={() => setEditItem(item)}
                        className="mt-1 text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                        <Pencil className="w-2.5 h-2.5" /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Collapsible Sections ── */}
      <div className="space-y-5 border-t border-border pt-6">
        <h2 className="text-lg font-display font-semibold">Browse by Status</h2>

        {favoriteItems.length > 0 && (
          <CollapsibleSection title="Favorites" icon={<Heart className="w-4 h-4 text-rose-400" />}
            count={favoriteItems.length} color="bg-rose-500/10" defaultOpen>
            <div className="space-y-2">
              {sectionCardGrid(favoriteItems)}
            </div>
          </CollapsibleSection>
        )}

        {readingItems.length > 0 && (
          <CollapsibleSection title="Reading / Watching" icon={<PlayCircle className="w-4 h-4 text-green-400" />}
            count={readingItems.length} color="bg-green-500/10" defaultOpen>
            {sectionCardGrid(readingItems)}
          </CollapsibleSection>
        )}

        {onHoldItems.length > 0 && (
          <CollapsibleSection title="On Hold" icon={<Clock className="w-4 h-4 text-yellow-400" />}
            count={onHoldItems.length} color="bg-yellow-500/10">
            {sectionCardGrid(onHoldItems)}
          </CollapsibleSection>
        )}

        {completedItems.length > 0 && (
          <CollapsibleSection title="Completed" icon={<Star className="w-4 h-4 text-primary" />}
            count={completedItems.length} color="bg-primary/10">
            {sectionCardGrid(completedItems)}
          </CollapsibleSection>
        )}

        {droppedItems.length > 0 && (
          <CollapsibleSection title="Dropped" icon={<XCircle className="w-4 h-4 text-red-400" />}
            count={droppedItems.length} color="bg-red-500/10">
            {sectionCardGrid(droppedItems)}
          </CollapsibleSection>
        )}
      </div>

      {/* All Media */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold">All Media</h2>
          <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground"
            onClick={() => setLocation("/recommended")} data-testid="button-see-recommendations">
            <Sparkles className="w-3.5 h-3.5" /> Discover more
          </Button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search titles, categories, status..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        {mediaLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[2/3] bg-muted animate-pulse rounded-xl" />
                <div className="h-3.5 bg-muted animate-pulse rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredMedia.length > 0 ? (
          <>
            {searchQuery && (
              <p className="text-xs text-muted-foreground mb-3">
                {filteredMedia.length} result{filteredMedia.length !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {filteredMedia.map((item) => (
                <div key={item.id} data-testid={`media-card-${item.id}`} className="group relative">
                  <div className="aspect-[2/3] bg-muted rounded-xl overflow-hidden relative ring-1 ring-border/50 group-hover:ring-primary/40 transition-all duration-300">
                    {item.coverUrl || item.customCoverUrl ? (
                      <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 text-xs p-4 text-center gap-2">
                        <BookOpen className="w-5 h-5 text-muted-foreground/50" />
                        <span className="text-muted-foreground">{item.title}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 gap-1.5">
                      {item.status && (
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded self-start", STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground")}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      )}
                      {item.currentChapter && <span className="text-[10px] text-white/70">{item.currentChapter}</span>}
                      {(item as any).readingUrl && (
                        <a href={(item as any).readingUrl} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium transition-colors">
                          <ExternalLink className="w-3 h-3" /> {getSiteLabel((item as any).readingUrl)}
                        </a>
                      )}
                      <div className="flex gap-1 mt-0.5">
                        <button onClick={() => setEditItem(item)}
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] transition-colors">
                          <Pencil className="w-2.5 h-2.5" /> Edit
                        </button>
                        <button onClick={() => handleToggleFavorite(item.id)}
                          className={cn("flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors",
                            favorites.has(item.id)
                              ? "bg-rose-500/40 text-rose-200"
                              : "bg-white/10 hover:bg-rose-500/30 text-white hover:text-rose-200")}>
                          <Heart className={cn("w-2.5 h-2.5", favorites.has(item.id) && "fill-rose-200")} />
                        </button>
                        <button onClick={() => handleDrop(item.id, item.title)}
                          className="flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 text-[10px] transition-colors">
                          <XCircle className="w-2.5 h-2.5" /> Drop
                        </button>
                        <button onClick={() => handleMoveToAvoid(item.id, item.title)}
                          className="flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[10px] transition-colors">
                          <AlertTriangle className="w-2.5 h-2.5" /> Avoid
                        </button>
                      </div>
                    </div>
                    {item.tier && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-xs font-display font-black text-yellow-400">{item.tier}</span>
                      </div>
                    )}
                    {favorites.has(item.id) && (
                      <div className="absolute top-2 left-2">
                        <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 drop-shadow" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.title}</h3>
                    <div className="flex items-center justify-between">
                      <p className={cn("text-xs capitalize font-medium", CATEGORY_COLORS[item.category]?.split(" ")[0] ?? "text-muted-foreground")}>
                        {item.category}
                      </p>
                      {(item as any).readingUrl && (
                        <a href={(item as any).readingUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : mediaArray.length > 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No results for "{searchQuery}"</p>
            <button className="text-xs text-primary mt-2 hover:underline" onClick={() => setSearchQuery("")}>Clear search</button>
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
                <Plus className="w-4 h-4" /> Add your first title
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddMediaDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditMediaDialog
        open={!!editItem}
        onClose={() => setEditItem(null)}
        media={editItem}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        dropReasons={dropReasons}
        onSaveDropReason={(id, reason) => {
          setDropReasons((prev) => {
            const next = { ...prev, [id]: reason };
            saveDropReasons(next);
            return next;
          });
        }}
      />
    </div>
  );
}
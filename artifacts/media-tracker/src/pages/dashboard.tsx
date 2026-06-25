// artifacts/media-tracker/src/pages/dashboard.tsx
import React, { useState, useMemo, useCallback } from "react";
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
  Heart, Star, LayoutGrid, List, Image, ArrowUpDown,
  Shuffle, Trophy, ChevronDown, ChevronUp, X, Loader2, Wand2,
} from "lucide-react";
import { AddMediaDialog } from "@/components/add-media-dialog";
import { EditMediaDialog } from "@/components/edit-media-dialog";
import { cn, proxyImage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";


// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  webtoon: <BookOpen className="w-5 h-5" />,
  manhwa: <BookOpen className="w-5 h-5" />,
  manhua: <BookOpen className="w-5 h-5" />,
  manga: <BookOpen className="w-5 h-5" />,
  anime: <Tv className="w-5 h-5" />,
};
const CATEGORY_COLORS: Record<string, string> = {
  webtoon: "text-blue-400 bg-blue-500/10",
  manhwa: "text-purple-400 bg-purple-500/10",
  manhua: "text-emerald-400 bg-emerald-500/10",
  manga: "text-orange-400 bg-orange-500/10",
  anime: "text-pink-400 bg-pink-500/10",
};
const GENRE_COLORS = [
  "bg-sky-500/15 text-sky-400",
  "bg-violet-500/15 text-violet-400",
  "bg-rose-500/15 text-rose-400",
  "bg-amber-500/15 text-amber-400",
  "bg-teal-500/15 text-teal-400",
  "bg-fuchsia-500/15 text-fuchsia-400",
  "bg-lime-500/15 text-lime-400",
  "bg-cyan-500/15 text-cyan-400",
];
function genreColor(genre: string) {
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return GENRE_COLORS[Math.abs(hash) % GENRE_COLORS.length];
}
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

// ── Milestones ────────────────────────────────────────────────────────────────
const MILESTONES = [
  { count: 1,   label: "First Title!",        emoji: "🌱", desc: "Your journey begins." },
  { count: 5,   label: "Getting Started",     emoji: "📖", desc: "5 titles tracked!" },
  { count: 10,  label: "Bookworm",            emoji: "🐛", desc: "10 titles in your vault." },
  { count: 25,  label: "Dedicated Reader",    emoji: "⭐", desc: "25 titles — impressive!" },
  { count: 50,  label: "Otaku Apprentice",    emoji: "🎌", desc: "50 titles! You're serious." },
  { count: 100, label: "Otaku Master",        emoji: "🏆", desc: "100 titles! Legendary." },
  { count: 200, label: "No Life (Respect)",   emoji: "💀", desc: "200 titles. We salute you." },
  { count: 10,  label: "Completionist",       emoji: "✅", desc: "10 completed titles!", key: "completed" },
  { count: 50,  label: "Finish Line Chaser",  emoji: "🏁", desc: "50 completed!", key: "completed" },
];

function getEarnedMilestones(total: number, completed: number) {
  return MILESTONES.filter((m) => {
    if (m.key === "completed") return completed >= m.count;
    return total >= m.count;
  });
}

// ── Local storage helpers ─────────────────────────────────────────────────────
function loadFavorites(): Set<number> {
  try { const s = localStorage.getItem("ov_favorites"); if (s) return new Set(JSON.parse(s)); } catch {}
  return new Set();
}
function saveFavorites(favs: Set<number>) {
  try { localStorage.setItem("ov_favorites", JSON.stringify([...favs])); } catch {}
}
function loadDropReasons(): Record<number, string> {
  try { const s = localStorage.getItem("ov_drop_reasons"); if (s) return JSON.parse(s); } catch {}
  return {};
}
function saveDropReasons(reasons: Record<number, string>) {
  try { localStorage.setItem("ov_drop_reasons", JSON.stringify(reasons)); } catch {}
}
function loadLayout(): CardLayout {
  try { const s = localStorage.getItem("ov_card_layout"); if (s) return s as CardLayout; } catch {}
  return "grid";
}
function loadSort(): SortOption {
  try { const s = localStorage.getItem("ov_sort"); if (s) return s as SortOption; } catch {}
  return "alpha";
}

function getSiteLabel(url: string | null | undefined): string {
  if (!url) return "Read Now";
  if (url.includes("webtoons.com")) return "Webtoon";
  if (url.includes("mangafire")) return "MangaFire";
  if (url.includes("vymanga")) return "VyManga";
  try { return new URL(url).hostname.replace("www.", ""); } catch { return "Read Now"; }
}

type CardLayout = "grid" | "list" | "covers";
type SortOption = "alpha" | "recent" | "rating";
type StatusTab = "reading" | "paused" | "completed" | "dropped" | "all";

// ── Genre Tags ────────────────────────────────────────────────────────────────
function GenreTags({ genres }: { genres: string[] }) {
  if (!genres?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {genres.slice(0, 3).map((g) => (
        <span key={g} className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", genreColor(g))}>
          {g}
        </span>
      ))}
      {genres.length > 3 && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          +{genres.length - 3}
        </span>
      )}
    </div>
  );
}

// ── Card Components ───────────────────────────────────────────────────────────
function GridCard({ item, onEdit, onDrop, onAvoid, onToggleFavorite, isFavorite, dropReason, onDetail }: any) {
  return (
    <div data-testid={`media-card-${item.id}`} className="group relative cursor-pointer" onClick={() => onDetail && onDetail()}>
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
          {item.readingUrl && (
            <a href={item.readingUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium transition-colors">
              <ExternalLink className="w-3 h-3" /> {getSiteLabel(item.readingUrl)}
            </a>
          )}
          <div className="flex gap-1 mt-0.5">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] transition-colors">
              <Pencil className="w-2.5 h-2.5" /> Edit
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={cn("flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors",
                isFavorite ? "bg-rose-500/40 text-rose-200" : "bg-white/10 hover:bg-rose-500/30 text-white hover:text-rose-200")}>
              <Heart className={cn("w-2.5 h-2.5", isFavorite && "fill-rose-200")} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDrop(); }} className="flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 text-[10px] transition-colors">
              <XCircle className="w-2.5 h-2.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onAvoid(); }} className="flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[10px] transition-colors">
              <AlertTriangle className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
        {item.tier && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xs font-display font-black text-yellow-400">{item.tier}</span>
          </div>
        )}
        {isFavorite && <div className="absolute top-2 left-2"><Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 drop-shadow" /></div>}
      </div>
      <div className="mt-2 space-y-0.5">
        <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.title}</h3>
        <p className={cn("text-xs capitalize font-medium", CATEGORY_COLORS[item.category]?.split(" ")[0] ?? "text-muted-foreground")}>{item.category}</p>
        <GenreTags genres={item.genres} />
        {dropReason && <p className="text-[10px] text-red-400/70 italic line-clamp-1">"{dropReason}"</p>}
      </div>
    </div>
  );
}

function ListCard({ item, onEdit, onDrop, onAvoid, onToggleFavorite, isFavorite, dropReason, onDetail }: any) {
  return (
    <div className="group flex gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-all items-center cursor-pointer" onClick={() => onDetail?.()}>
      <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {item.coverUrl || item.customCoverUrl ? (
          <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
        ) : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-4 h-4 text-muted-foreground/30" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h4 className="text-sm font-medium leading-tight line-clamp-1 flex-1">{item.title}</h4>
          {item.tier && <span className="text-xs font-black text-yellow-400 flex-shrink-0">{item.tier}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className={cn("text-xs capitalize font-medium", CATEGORY_COLORS[item.category]?.split(" ")[0] ?? "text-muted-foreground")}>{item.category}</p>
          {item.status && <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_COLORS[item.status])}>{STATUS_LABELS[item.status]}</span>}
        </div>
        <GenreTags genres={item.genres} />
        {dropReason && <p className="text-[10px] text-red-400/70 italic mt-0.5">"{dropReason}"</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.readingUrl && (
          <a href={item.readingUrl} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-md bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className={cn("p-1.5 rounded-md transition-colors", isFavorite ? "text-rose-400" : "text-muted-foreground hover:text-rose-400")}>
          <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-rose-400")} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function CoverCard({ item, onEdit, onToggleFavorite, isFavorite }: any) {
  return (
    <div className="group relative aspect-[2/3] bg-muted rounded-xl overflow-hidden ring-1 ring-border/50 group-hover:ring-primary/40 transition-all cursor-pointer" onClick={() => onEdit()}>
      {item.coverUrl || item.customCoverUrl ? (
        <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-secondary/30">
          <BookOpen className="w-6 h-6 text-muted-foreground/30" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <p className="text-white text-[10px] font-medium line-clamp-2 leading-tight">{item.title}</p>
      </div>
      {item.tier && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-black/70 flex items-center justify-center">
          <span className="text-[10px] font-black text-yellow-400">{item.tier}</span>
        </div>
      )}
      {isFavorite && (
        <div className="absolute top-1.5 left-1.5">
          <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
        </div>
      )}
    </div>
  );
}

// ── Small card for Continue Reading ──────────────────────────────────────────
function SmallMediaCard({ item, onEdit, onDrop, onAvoid, onToggleFavorite, isFavorite, dropReason }: any) {
  return (
    <div className="group relative flex gap-2.5 p-2.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all">
      <div className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {item.coverUrl || item.customCoverUrl ? (
          <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
        ) : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-4 h-4 text-muted-foreground/30" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1">
          <h4 className="text-xs font-medium leading-tight line-clamp-1 flex-1">{item.title}</h4>
          <button onClick={onToggleFavorite} className="flex-shrink-0 mt-0.5">
            <Heart className={cn("w-3 h-3 transition-colors", isFavorite ? "fill-rose-400 text-rose-400" : "text-muted-foreground hover:text-rose-400")} />
          </button>
        </div>
        <p className={cn("text-[10px] capitalize mt-0.5", CATEGORY_COLORS[item.category]?.split(" ")[0] ?? "text-muted-foreground")}>{item.category}</p>
        <GenreTags genres={item.genres} />
        {dropReason && <p className="text-[10px] text-red-400/80 mt-0.5 italic line-clamp-1">"{dropReason}"</p>}
        <div className="flex items-center gap-1 mt-1.5">
          <button onClick={onEdit} className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
            <Pencil className="w-2.5 h-2.5" /> Edit
          </button>
          {item.readingUrl && (
            <a href={item.readingUrl} target="_blank" rel="noopener noreferrer"
              className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors ml-1">
              <ExternalLink className="w-2.5 h-2.5" /> Read
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Random Pick Modal ─────────────────────────────────────────────────────────
function RandomPickModal({ item, onClose, onEdit }: { item: any; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-xs w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold">Random Pick!</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-4">
          <div className="w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-muted ring-1 ring-border">
            {item.coverUrl || item.customCoverUrl ? (
              <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
            ) : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground/30" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-tight mb-1">{item.title}</h4>
            <p className={cn("text-xs capitalize font-medium mb-2", CATEGORY_COLORS[item.category]?.split(" ")[0] ?? "text-muted-foreground")}>{item.category}</p>
            <GenreTags genres={item.genres} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {item.readingUrl && (
            <a href={item.readingUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Read Now
            </a>
          )}
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-muted hover:bg-muted/80 text-xs font-medium transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Milestone Toast ───────────────────────────────────────────────────────────
function MilestonesBanner({ milestones, onClose }: { milestones: typeof MILESTONES; onClose: () => void }) {
  if (!milestones.length) return null;
  const latest = milestones[milestones.length - 1];
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-primary/30 rounded-2xl p-4 shadow-2xl shadow-primary/10 max-w-xs">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{latest.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm text-primary">{latest.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{latest.desc}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Media Detail Modal ────────────────────────────────────────────────────────
function MediaDetailModal({ item, onClose, onEdit }: { item: any; onClose: () => void; onEdit: () => void }) {
  const GENRE_COLORS = ["bg-sky-500/15 text-sky-400","bg-violet-500/15 text-violet-400","bg-rose-500/15 text-rose-400","bg-amber-500/15 text-amber-400","bg-teal-500/15 text-teal-400","bg-fuchsia-500/15 text-fuchsia-400","bg-lime-500/15 text-lime-400","bg-cyan-500/15 text-cyan-400"];
  function gc(g: string) { let h=0; for(let i=0;i<g.length;i++) h=g.charCodeAt(i)+((h<<5)-h); return GENRE_COLORS[Math.abs(h)%GENRE_COLORS.length]; }
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
  <div className="relative z-10 flex items-center justify-center w-full h-full p-4"/>
      <div className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Cover banner */}
        <div className="relative h-32 rounded-t-2xl overflow-hidden bg-muted">
          {item.coverUrl || item.customCoverUrl
            ? <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover opacity-40" />
            : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent" />}
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex gap-4 px-5 -mt-10 mb-4">
          <div className="relative z-10 w-16 h-22 flex-shrink-0 rounded-xl overflow-hidden bg-muted border-2 border-card shadow-lg">
            {item.coverUrl || item.customCoverUrl
              ? <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground/30" /></div>}
          </div>
          <div className="flex-1 min-w-0 pt-8">
            <h2 className="font-display font-bold text-lg leading-tight line-clamp-2">{item.title}</h2>
            <p className={cn("text-xs capitalize font-medium mt-0.5", CATEGORY_COLORS[item.category]?.split(" ")[0] ?? "text-muted-foreground")}>{item.category}</p>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Status + Tier */}
          <div className="flex flex-wrap gap-2">
            {item.status && <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground")}>{STATUS_LABELS[item.status] ?? item.status}</span>}
            {item.tier && <span className="text-xs font-black px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Tier {item.tier}</span>}
            {item.rating != null && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1"><Star className="w-3 h-3 fill-primary" />{item.rating}/10</span>}
          </div>

          {/* Genres */}
          {item.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.genres.map((g: string) => <span key={g} className={cn("text-xs px-2 py-0.5 rounded-full font-medium", gc(g))}>{g}</span>)}
            </div>
          )}

          {/* Rating breakdown */}
          {(() => {
            const ratingKeys = [
              { key: "story", label: "Story & Pacing" },
              { key: "art", label: "Art Style & Coloring" },
              { key: "character", label: "Character Development" },
              { key: "worldBuilding", label: "World-Building" },
              { key: "uniqueness", label: "Uniqueness & Execution" },
              { key: "enjoyment", label: "Enjoyment Factor" },
            ];
            let savedRatings: Record<string, number> = {};
            try {
              const s = localStorage.getItem(`ov_ratings_${item.id}`);
              if (s) savedRatings = JSON.parse(s);
            } catch {}
            const hasAny = ratingKeys.some(r => (savedRatings[r.key] ?? 0) > 0);
            if (!hasAny) return null;
            return (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rating Breakdown</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {ratingKeys.map(({ key, label }) => {
                    const val = savedRatings[key] ?? 0;
                    if (val === 0) return null;
                    return (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${val * 10}%` }} />
                          </div>
                          <span className="text-xs font-medium tabular-nums">{val}/10</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Description */}
          {item.description && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
              <p className="text-sm leading-relaxed text-foreground/90">{item.description}</p>
            </div>
          )}

          {/* Review */}
          {item.reviewText && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Review</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.reviewText}</p>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
              <p className="text-sm leading-relaxed text-foreground/80">{item.notes}</p>
            </div>
          )}

          {/* Reading link */}
          {item.readingUrl && (
            <a href={item.readingUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-muted hover:bg-muted/80 border border-border text-sm font-medium transition-colors">
              <ExternalLink className="w-4 h-4" /> {getSiteLabel(item.readingUrl)}
            </a>
          )}

          {/* Edit button */}
          <Button className="w-full gap-2" onClick={onEdit}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [isSyncingGenres, setIsSyncingGenres] = useState(false);
  const { getToken } = useAuth(); // Import useAuth from "@clerk/clerk-react" at the top if missing
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("reading");
  const [cardLayout, setCardLayout] = useState<CardLayout>(loadLayout);
  const [sortOption, setSortOption] = useState<SortOption>(loadSort);
  const [randomPick, setRandomPick] = useState<any | null>(null);
  const [shownMilestone, setShownMilestone] = useState<string | null>(null);
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<Set<number>>(loadFavorites);
  const [dropReasons, setDropReasons] = useState<Record<number, string>>(loadDropReasons);
  const [detailItem, setDetailItem] = useState<any | null>(null);

  const { data: stats } = useGetMediaStats();
  const { data: media, isLoading: mediaLoading } = useListMedia({ listType: "library" });
  const updateMedia = useUpdateMedia();
  const mediaArray = (Array.isArray(media) ? media : []).filter(
    (m) => !["normie_tv", "normie_movie", "normie_book"].includes(m.category)
  );

  // Sort function
  const applySort = useCallback((arr: any[]) => {
    if (sortOption === "alpha") return [...arr].sort((a, b) => a.title.localeCompare(b.title));
    if (sortOption === "recent") return [...arr].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (sortOption === "rating") return [...arr].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return arr;
  }, [sortOption]);

  const changeLayout = (l: CardLayout) => { setCardLayout(l); localStorage.setItem("ov_card_layout", l); };
  const changeSort = (s: SortOption) => { setSortOption(s); localStorage.setItem("ov_sort", s); };

  // Milestones check
  const totalItems = Object.values(stats?.totalByCategory ?? {}).reduce((a, b) => a + b, 0);
  const completedItems = Object.values(stats?.completedByCategory ?? {}).reduce((a, b) => a + b, 0);
  const earned = getEarnedMilestones(totalItems, completedItems);
  const latestMilestoneKey = earned.length ? `${earned[earned.length - 1].label}` : null;

  React.useEffect(() => {
    if (latestMilestoneKey && latestMilestoneKey !== shownMilestone && earned.length > 0) {
      const stored = localStorage.getItem("ov_shown_milestone");
      if (stored !== latestMilestoneKey) {
        setMilestoneVisible(true);
        setShownMilestone(latestMilestoneKey);
        localStorage.setItem("ov_shown_milestone", latestMilestoneKey);
      }
    }
  }, [latestMilestoneKey]);

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
      .slice(0, 10);
  }, [mediaArray]);

  const filteredMedia = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const base = q
      ? mediaArray.filter((m) =>
          m.title.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.status ?? "").toLowerCase().includes(q) ||
          (m.genres ?? []).some((g: string) => g.toLowerCase().includes(q))
        )
      : mediaArray;
    return applySort(base);
  }, [mediaArray, searchQuery, applySort]);

  const favoriteItems = useMemo(() => applySort(
    mediaArray.filter((m) => favorites.has(m.id) || m.tier === "S")
  ), [mediaArray, favorites, applySort]);

  const tabItems = useMemo(() => {
    if (statusTab === "reading") return applySort(mediaArray.filter((m) => m.status === "reading" || m.status === "watching"));
    if (statusTab === "paused") return applySort(mediaArray.filter((m) => m.status === "paused"));
    if (statusTab === "completed") return applySort(mediaArray.filter((m) => m.status === "completed"));
    if (statusTab === "dropped") return applySort(mediaArray.filter((m) => m.status === "dropped"));
    return applySort(mediaArray);
  }, [mediaArray, statusTab, applySort]);

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
  const handleRandomPick = () => {
    const pool = mediaArray.filter((m) => m.listType === "library");
    if (!pool.length) { toast({ title: "No media yet!", description: "Add some titles first." }); return; }
    setRandomPick(pool[Math.floor(Math.random() * pool.length)]);
  };

  const handleAutoTagGenres = async () => {
    setIsSyncingGenres(true);
    toast({ title: "Syncing Genres...", description: "This will take a moment (to respect API limits)." });
    try {
      const token = await getToken();
      const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
      const res = await fetch(`${baseUrl}/api/media/bulk-auto-genre`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error("Failed to sync");
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
      toast({ title: "Sync Complete!", description: `Updated genres for ${result.updated} titles.` });
    } catch (e) {
      toast({ title: "Sync Error", description: "Failed to automatically fetch genres.", variant: "destructive" });
    } finally {
      setIsSyncingGenres(false);
    }
  };
  
  // ── Render cards based on layout ──
  const renderCards = (items: any[]) => {
    if (cardLayout === "list") {
      return (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <ListCard key={item.id} item={item}
              onEdit={() => setEditItem(item)}
              onDrop={() => handleDrop(item.id, item.title)}
              onAvoid={() => handleMoveToAvoid(item.id, item.title)}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
              isFavorite={favorites.has(item.id)}
              dropReason={dropReasons[item.id]}
              onDetail={() => setDetailItem(item)}
            />
          ))}
        </div>
      );
    }
    if (cardLayout === "covers") {
      return (
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11 gap-2">
          {items.map((item) => (
            <CoverCard key={item.id} item={item}
              onEdit={() => setEditItem(item)}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
              isFavorite={favorites.has(item.id)}
              onDetail={() => setDetailItem(item)}
            />
          ))}
        </div>
      );
    }

    // default: grid
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {items.map((item) => (
          <GridCard key={item.id} item={item}
            onEdit={() => setEditItem(item)}
            onDrop={() => handleDrop(item.id, item.title)}
            onAvoid={() => handleMoveToAvoid(item.id, item.title)}
            onToggleFavorite={() => handleToggleFavorite(item.id)}
            isFavorite={favorites.has(item.id)}
            dropReason={dropReasons[item.id]}
            onDetail={() => setDetailItem(item)}
          />
        ))}
      </div>
    );
  };

  // Small grid for non-"all" tabs
  const sectionCardGrid = (items: any[]) => renderCards(items);

  const statusTabs: { id: StatusTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "reading", label: "Reading / Watching", icon: <PlayCircle className="w-4 h-4" />, count: mediaArray.filter((m) => m.status === "reading" || m.status === "watching").length },
    { id: "paused", label: "Paused", icon: <Clock className="w-4 h-4" />, count: mediaArray.filter((m) => m.status === "paused").length },
    { id: "completed", label: "Completed", icon: <Star className="w-4 h-4" />, count: mediaArray.filter((m) => m.status === "completed").length },
    { id: "dropped", label: "Dropped", icon: <XCircle className="w-4 h-4" />, count: mediaArray.filter((m) => m.status === "dropped").length },
    { id: "all", label: "All Media", icon: <BookOpen className="w-4 h-4" />, count: mediaArray.length },
  ];

  return (
    <div className="space-y-8">
      {/* Milestone banner */}
      {milestoneVisible && earned.length > 0 && (
        <MilestonesBanner milestones={earned} onClose={() => setMilestoneVisible(false)} />
      )}

      {/* Random pick modal */}
      {randomPick && (
        <RandomPickModal item={randomPick} onClose={() => setRandomPick(null)} onEdit={() => { setEditItem(randomPick); setRandomPick(null); }} />
      )}

      {detailItem && (
        <MediaDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Your Library</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {totalItems > 0 ? `${totalItems} titles tracked across all categories` : "A collection of your tracked media"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* PASTE THE AUTO-TAG BUTTON HERE */}
          <Button variant="outline" size="sm" onClick={handleAutoTagGenres} disabled={isSyncingGenres} className="gap-2 hidden md:flex">
            {isSyncingGenres ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} 
            {isSyncingGenres ? "Tagging..." : "Auto-Tag"}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleRandomPick} className="gap-2 hidden sm:flex">
            <Shuffle className="w-4 h-4" /> Random
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2 shadow-lg" data-testid="button-add-media">
            <Plus className="w-4 h-4" /> Add Media
          </Button>
        </div>
      </div>

      {/* Milestones row */}
      {earned.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {earned.map((m) => (
            <div key={m.label} title={m.desc}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium cursor-default">
              <span>{m.emoji}</span> {m.label}
            </div>
          ))}
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["webtoon", "manhwa", "manhua", "manga", "anime"] as const).map((cat) => {
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
                    <GenreTags genres={featured.genres} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    {featured.readingUrl ? (
                      <a href={featured.readingUrl} target="_blank" rel="noopener noreferrer"
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
                      ) : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-4 h-4 text-muted-foreground/30" /></div>}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-medium leading-tight line-clamp-2 mb-0.5">{item.title}</h4>
                        <span className={cn("text-[9px] font-medium px-1 py-0.5 rounded", STATUS_COLORS[item.status ?? ""] ?? "bg-muted text-muted-foreground")}>
                          {STATUS_LABELS[item.status ?? ""] ?? item.status}
                        </span>
                        <GenreTags genres={item.genres} />
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

      {/* ── Favorites ── */}
      {favoriteItems.length > 0 && (
        <div className="border-t border-border pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
            <h2 className="text-base font-display font-semibold">Favorites</h2>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{favoriteItems.length}</span>
          </div>
          {sectionCardGrid(favoriteItems)}
        </div>
      )}

      {/* ── Status Tabs ── */}
      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-display font-semibold">Browse by Status</h2>

          {/* Controls: sort + layout */}
          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
              {([["alpha", "A-Z"], ["recent", "Recent"], ["rating", "Rating"]] as [SortOption, string][]).map(([val, label]) => (
                <button key={val} onClick={() => changeSort(val)}
                  className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    sortOption === val ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {label}
                </button>
              ))}
            </div>
            {/* Layout */}
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
              {([["grid", <LayoutGrid className="w-3.5 h-3.5" />], ["list", <List className="w-3.5 h-3.5" />], ["covers", <Image className="w-3.5 h-3.5" />]] as [CardLayout, React.ReactNode][]).map(([val, icon]) => (
                <button key={val} onClick={() => changeLayout(val)}
                  className={cn("p-1.5 rounded-md transition-colors",
                    cardLayout === val ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {statusTabs.map((t) => (
            <button key={t.id} onClick={() => setStatusTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                statusTab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              {t.icon}
              {t.label}
              <span className={cn("text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none",
                statusTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {statusTab === "all" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search titles, categories, genres, status..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground">
                {filteredMedia.length} result{filteredMedia.length !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
            )}
            {mediaLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-[2/3] bg-muted animate-pulse rounded-xl" />
                    <div className="h-3.5 bg-muted animate-pulse rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : filteredMedia.length > 0 ? renderCards(filteredMedia)
              : mediaArray.length > 0 && searchQuery ? (
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
        )}

        {statusTab !== "all" && (
          tabItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nothing here yet.</p>
            </div>
          ) : sectionCardGrid(tabItems)
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
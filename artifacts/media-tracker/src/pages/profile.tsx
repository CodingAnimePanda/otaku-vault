import React, { useEffect, useState, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useGetMediaStats, useListMedia } from "@workspace/api-client-react";
import { proxyImage, cn } from "@/lib/utils";
import { Trophy, BookOpen, Star, Share2, LayoutGrid, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserProfile { id: number; clerkId: string; username: string; displayName: string | null; avatarUrl: string | null; }

const CATEGORY_ORDER = ["manhwa", "webtoon", "manhua", "manga", "anime", "webnovel", "normie_tv", "normie_movie", "normie_book"];
const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };
const CHARACTER_ROLES = ["Protagonist", "Deuteragonist", "Villain/Antagonist", "Best Girl", "Best Boy", "Comic Relief", "Mentor", "Underrated Gem", "Waifu/Husbando", "Redemption Arc MVP"];

function getRatingLabels(category: string) {
  const artLabel = category === "anime" ? "Animation" : category === "webnovel" ? "Formatting & Translation" : "Art Style & Coloring";
  return [
    { key: "ratingStory", label: "Story & Pacing" },
    { key: "ratingArt", label: artLabel },
    { key: "ratingCharacter", label: "Character Development" },
    { key: "ratingWorldBuilding", label: "World-Building" },
    { key: "ratingUniqueness", label: "Uniqueness & Execution" },
    { key: "ratingEnjoyment", label: "Enjoyment Factor" },
  ];
}

function ProfileDetailModal({ item, onClose }: { item: any; onClose: () => void }) {
  if (!item) return null;
  const ratingKeys = getRatingLabels(item.category);
  const hasRatings = ratingKeys.some(r => (item as any)[r.key] > 0);
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
        <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="relative h-32 rounded-t-2xl overflow-hidden bg-muted">
            {item.coverUrl || item.customCoverUrl
              ? <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover opacity-40" />
              : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent" />}
            <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
            <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-4 px-5 -mt-8 mb-4 items-end">
            <div className="relative z-10 w-16 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-muted border-2 border-card shadow-lg">
              {item.coverUrl || item.customCoverUrl
                ? <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground/30" /></div>}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="font-display font-bold text-lg leading-snug break-words">{item.title}</h2>
              <p className="text-xs capitalize font-medium mt-0.5 text-muted-foreground">{item.category}</p>
            </div>
          </div>
          <div className="px-5 pb-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {item.tier && <span className="text-xs font-black px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Tier {item.tier}</span>}
              {item.rating != null && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1"><Star className="w-3 h-3 fill-primary" />{item.rating}/10</span>}
            </div>
            {item.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.genres.map((g: string) => <span key={g} className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">{g}</span>)}
              </div>
            )}
            {hasRatings && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rating Breakdown</p>
                {ratingKeys.map(({ key, label }) => {
                  const val = (item as any)[key];
                  if (!val) return null;
                  return (
                    <div key={key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${val * 10}%` }} /></div>
                        <span className="tabular-nums w-8 text-right">{val}/10</span>
                      </div>
                    </div>
                  );
                })}
                {item.ratingSourceAccuracy > 0 && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">Source Accuracy</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${item.ratingSourceAccuracy * 10}%` }} /></div>
                      <span className="tabular-nums w-8 text-right">{item.ratingSourceAccuracy}/10</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {item.description && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
                <p className="text-sm leading-relaxed text-foreground/90">{item.description}</p>
              </div>
            )}
            {item.reviewText && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Review</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.reviewText}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { data: stats } = useGetMediaStats();
  const { data: media } = useListMedia({ listType: "library" });
  const [ovProfile, setOvProfile] = useState<UserProfile | null>(null);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [charDialogOpen, setCharDialogOpen] = useState(false);
  const [charForm, setCharForm] = useState({ name: "", imageUrl: "", mediaTitle: "", role: "Protagonist", note: "" });

  // apiFetch must be declared before anything that depends on it
  const apiFetch = useCallback(async (path: string) => {
    const token = await getToken();
    const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
    const res = await fetch(`${baseUrl}${path}`, { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!res.ok) return null;
    return res.json();
  }, [getToken]);

  const setTopFavorite = async (mediaId: number, rank: number | null) => {
    const token = await getToken();
    const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
    await fetch(`${baseUrl}/api/media/${mediaId}/top-favorite`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ rank }),
    });
    window.location.reload();
  };

  const loadCharacters = useCallback(() => {
    apiFetch("/api/favorite-characters").then((d) => setCharacters(Array.isArray(d) ? d : []));
  }, [apiFetch]);

  useEffect(() => { loadCharacters(); }, [loadCharacters]);
  useEffect(() => { apiFetch("/api/friends/profile/me").then((d) => { if (d) setOvProfile(d); }); }, [apiFetch]);

  const addCharacter = async () => {
    if (!charForm.name.trim()) return;
    const token = await getToken();
    const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
    await fetch(`${baseUrl}/api/favorite-characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(charForm),
    });
    setCharForm({ name: "", imageUrl: "", mediaTitle: "", role: "Protagonist", note: "" });
    setCharDialogOpen(false);
    loadCharacters();
  };

  const deleteCharacter = async (id: number) => {
    const token = await getToken();
    const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
    await fetch(`${baseUrl}/api/favorite-characters/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    loadCharacters();
  };

  const mediaArray = Array.isArray(media) ? media : [];
  const completedCount = Object.values(stats?.completedByCategory ?? {}).reduce((a, b) => a + b, 0);
  const totalCount = Object.values(stats?.totalByCategory ?? {}).reduce((a, b) => a + b, 0);
  const topFavorites = [...mediaArray]
    .filter(m => m.topFavoriteRank)
    .sort((a, b) => (a.topFavoriteRank ?? 9) - (b.topFavoriteRank ?? 9));
  const avgRating = mediaArray.filter(m => m.rating && m.rating > 0);
  const avgRatingVal = avgRating.length > 0 ? (avgRating.reduce((a, b) => a + (b.rating ?? 0), 0) / avgRating.length).toFixed(1) : "—";

  const byCategory = mediaArray.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof mediaArray>);
  Object.values(byCategory).forEach((items) => items.sort((a, b) => (TIER_ORDER[a.tier ?? ""] ?? 6) - (TIER_ORDER[b.tier ?? ""] ?? 6)));
  const sortedCategoryEntries = Object.entries(byCategory).sort(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));

  const categoryLabel = (cat: string) =>
    cat === "normie_tv" ? "TV Shows" : cat === "normie_movie" ? "Movies" : cat === "normie_book" ? "Books" : cat;

  const displayName = ovProfile?.displayName || user?.fullName || "Otaku";
  const username = ovProfile?.username || user?.username || user?.primaryEmailAddress?.emailAddress.split("@")[0];
  const avatar = user?.imageUrl;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link Copied!", description: "Your Vault Profile link is ready to share." });
  };

  const visibleEntries = activeCat === "all" ? sortedCategoryEntries : sortedCategoryEntries.filter(([cat]) => cat === activeCat);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-12">
      {detailItem && <ProfileDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}

      <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-xl max-w-3xl mx-auto">
        <div className="h-32 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent"></div>
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
          <img src={avatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-card shadow-lg bg-muted object-cover" />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-display font-bold">{displayName}</h1>
            <p className="text-muted-foreground text-sm">@{username}</p>
          </div>
          <Button onClick={handleShare} variant="outline" className="gap-2"><Share2 className="w-4 h-4" /> Share Profile</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <div className="p-5 rounded-xl border border-border bg-card/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><BookOpen className="w-6 h-6" /></div>
          <div><p className="text-2xl font-black">{totalCount}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Titles Tracked</p></div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Trophy className="w-6 h-6" /></div>
          <div><p className="text-2xl font-black">{completedCount}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Completed</p></div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500"><Star className="w-6 h-6" /></div>
          <div><p className="text-2xl font-black">{avgRatingVal}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Avg Rating</p></div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /><h2 className="text-xl font-display font-bold">Top 3 Favorites</h2></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((rank) => {
            const item = topFavorites.find(m => m.topFavoriteRank === rank);
            if (!item) return (
              <button key={rank} onClick={() => { setPickerSlot(rank); setPickerOpen(true); }}
                className="aspect-[2/3] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <span className="text-2xl mb-1">#{rank}</span>
                <span className="text-xs">Set favorite</span>
              </button>
            );
            return (
              <div key={rank} className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-md">
                <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover cursor-pointer" onClick={() => setDetailItem(item)} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4 pointer-events-none">
                  <span className="text-yellow-400 font-black text-lg mb-1 drop-shadow-md">#{rank}</span>
                  <h3 className="text-white font-semibold leading-tight line-clamp-2 drop-shadow-md">{item.title}</h3>
                </div>
                <button onClick={() => setTopFavorite(item.id, null)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold mb-3">Choose a title for #{pickerSlot}</h3>
            <div className="grid grid-cols-3 gap-3">
              {mediaArray.map((item) => (
                <button key={item.id} onClick={() => { setTopFavorite(item.id, pickerSlot); setPickerOpen(false); }}
                  className="aspect-[2/3] rounded-lg overflow-hidden bg-muted relative group">
                  <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-1">
                    <span className="text-[9px] text-white opacity-0 group-hover:opacity-100 line-clamp-2">{item.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Heart className="w-5 h-5 text-rose-400 fill-rose-400" /><h2 className="text-xl font-display font-bold">Favorite Characters</h2></div>
          <Button size="sm" variant="outline" onClick={() => setCharDialogOpen(true)}>+ Add</Button>
        </div>
        {characters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No favorite characters yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {characters.map((c) => (
              <div key={c.id} className="group relative rounded-xl border border-border bg-card/50 overflow-hidden">
                <div className="aspect-square bg-muted">
                  {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Heart className="w-6 h-6 text-muted-foreground/30" /></div>}
                </div>
                <div className="p-2.5 space-y-0.5">
                  <p className="text-sm font-semibold leading-tight">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.mediaTitle}</p>
                  {c.role && <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary mt-1">{c.role}</span>}
                  {c.note && <p className="text-[10px] text-muted-foreground italic mt-1 line-clamp-2">"{c.note}"</p>}
                </div>
                <button onClick={() => deleteCharacter(c.id)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {charDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCharDialogOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold">Add Favorite Character</h3>
            <input className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm" placeholder="Name" value={charForm.name} onChange={(e) => setCharForm({ ...charForm, name: e.target.value })} />
            <input className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm" placeholder="Image URL" value={charForm.imageUrl} onChange={(e) => setCharForm({ ...charForm, imageUrl: e.target.value })} />
            <input className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm" placeholder="From (title)" value={charForm.mediaTitle} onChange={(e) => setCharForm({ ...charForm, mediaTitle: e.target.value })} />
            <select className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm" value={charForm.role} onChange={(e) => setCharForm({ ...charForm, role: e.target.value })}>
              {CHARACTER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <textarea className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm" placeholder="Why you love them (optional)" rows={2} value={charForm.note} onChange={(e) => setCharForm({ ...charForm, note: e.target.value })} />
            <Button className="w-full" onClick={addCharacter}>Save</Button>
          </div>
        </div>
      )}

      <div className="space-y-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-display font-bold flex items-center gap-2 mr-2"><LayoutGrid className="w-5 h-5 text-primary" /> Full Library</h2>
        </div>

        <div className="flex gap-1.5 flex-wrap border-b border-border pb-3">
          <button onClick={() => setActiveCat("all")}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", activeCat === "all" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>
            All
          </button>
          {sortedCategoryEntries.map(([cat, items]) => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize", activeCat === cat ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>
              {categoryLabel(cat)} <span className="opacity-70">({items.length})</span>
            </button>
          ))}
        </div>

        {visibleEntries.map(([cat, items]) => (
          <div key={cat} className="space-y-3">
            {activeCat === "all" && (
              <h3 className="font-display text-lg font-bold capitalize flex items-center gap-2 border-b border-border pb-2">
                {categoryLabel(cat)}
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
              </h3>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {items.map(item => (
                <div key={item.id} className="group relative cursor-pointer" onClick={() => setDetailItem(item)}>
                  <div className="aspect-[2/3] bg-muted rounded-xl overflow-hidden relative ring-1 ring-border/50 group-hover:ring-primary/40 transition-all duration-300">
                    {item.coverUrl || item.customCoverUrl
                      ? <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      : <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 text-xs p-4 text-center gap-2"><BookOpen className="w-5 h-5 text-muted-foreground/50" /><span className="text-muted-foreground">{item.title}</span></div>}
                    {item.tier && <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center"><span className="text-xs font-display font-black text-yellow-400">{item.tier}</span></div>}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.title}</h3>
                    {item.rating != null && <p className="text-xs flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {item.rating}/10</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import React, { useEffect, useState, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useGetMediaStats, useListMedia } from "@workspace/api-client-react";
import { proxyImage } from "@/lib/utils";
import { Trophy, BookOpen, Star, Share2, LayoutGrid, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserProfile { id: number; clerkId: string; username: string; displayName: string | null; avatarUrl: string | null; }

export default function ProfilePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { data: stats } = useGetMediaStats();
  const { data: media } = useListMedia({ listType: "library" });
  const [ovProfile, setOvProfile] = useState<UserProfile | null>(null);

  const apiFetch = useCallback(async (path: string) => {
    const token = await getToken();
    const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
    const res = await fetch(`${baseUrl}${path}`, { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!res.ok) return null;
    return res.json();
  }, [getToken]);

  useEffect(() => { apiFetch("/api/friends/profile/me").then((d) => { if (d) setOvProfile(d); }); }, [apiFetch]);

  const mediaArray = Array.isArray(media) ? media : [];
  const completedCount = Object.values(stats?.completedByCategory ?? {}).reduce((a, b) => a + b, 0);
  const totalCount = Object.values(stats?.totalByCategory ?? {}).reduce((a, b) => a + b, 0);
  const topFavorites = [...mediaArray].filter(m => m.tier === "S" || m.rating === 10).slice(0, 3);
  const avgRating = mediaArray.filter(m => m.rating && m.rating > 0);
  const avgRatingVal = avgRating.length > 0 ? (avgRating.reduce((a, b) => a + (b.rating ?? 0), 0) / avgRating.length).toFixed(1) : "—";

  // Group by category for full library
  const byCategory = mediaArray.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof mediaArray>);

  const categoryLabel = (cat: string) =>
    cat === "normie_tv" ? "TV Shows" : cat === "normie_movie" ? "Movies" : cat === "normie_book" ? "Books" : cat;

  const displayName = ovProfile?.displayName || user?.fullName || "Otaku";
  const username = ovProfile?.username || user?.username || user?.primaryEmailAddress?.emailAddress.split("@")[0];
  const avatar = user?.imageUrl;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link Copied!", description: "Your Vault Profile link is ready to share." });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-12">

      {/* Profile Header — matches FriendProfileView */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-xl max-w-3xl mx-auto">
        <div className="h-32 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent"></div>
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
          <img src={avatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-card shadow-lg bg-muted object-cover" />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-display font-bold">{displayName}</h1>
            <p className="text-muted-foreground text-sm">@{username}</p>
          </div>
          <Button onClick={handleShare} variant="outline" className="gap-2">
            <Share2 className="w-4 h-4" /> Share Profile
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Top Favorites */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <h2 className="text-xl font-display font-bold">All-Time Favorites</h2>
        </div>
        {topFavorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topFavorites.map((item, i) => (
              <div key={item.id} className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-md">
                {item.coverUrl || item.customCoverUrl
                  ? <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  : <div className="w-full h-full bg-muted flex items-center justify-center"><BookOpen className="w-8 h-8 text-muted-foreground/30" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                  <span className="text-yellow-400 font-black text-lg mb-1 drop-shadow-md">#{i + 1}</span>
                  <h3 className="text-white font-semibold leading-tight line-clamp-2 drop-shadow-md">{item.title}</h3>
                  <p className="text-white/70 text-xs capitalize mt-1">{categoryLabel(item.category)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed rounded-xl border-border bg-card/30">
            <p className="text-muted-foreground">Rank items as S-Tier to show them off here!</p>
          </div>
        )}
      </div>

      {/* Full Library by Category */}
      <div className="space-y-6 pt-4 border-t border-border">
        <h2 className="text-xl font-display font-bold flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-primary" /> Full Library</h2>
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} className="space-y-3">
            <h3 className="font-display text-lg font-bold capitalize flex items-center gap-2 border-b border-border pb-2">
              {categoryLabel(cat)}
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {items.map(item => (
                <div key={item.id} className="group relative">
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
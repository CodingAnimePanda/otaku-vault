import React from "react";
import { useUser } from "@clerk/clerk-react";
import { useGetMediaStats, useListMedia } from "@workspace/api-client-react";
import { proxyImage } from "@/lib/utils";
import { Trophy, BookOpen, Flame, Star, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { data: stats } = useGetMediaStats();
  const { data: media } = useListMedia({ listType: "library" });

  const mediaArray = Array.isArray(media) ? media : [];
  const completedCount = Object.values(stats?.completedByCategory ?? {}).reduce((a, b) => a + b, 0);
  const totalCount = Object.values(stats?.totalByCategory ?? {}).reduce((a, b) => a + b, 0);

  // Get top 3 favorites (S-Tier or highest rated)
  const topFavorites = [...mediaArray]
    .filter(m => m.tier === "S" || m.rating === 10)
    .slice(0, 3);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link Copied!", description: "Your Vault Profile link is ready to share." });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Profile Header Card */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-xl">
        <div className="h-32 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent"></div>
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
          <img 
            src={user?.imageUrl} 
            alt="Profile" 
            className="w-24 h-24 rounded-full border-4 border-card shadow-lg bg-muted object-cover"
          />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-display font-bold">{user?.fullName || "Otaku"}</h1>
            <p className="text-muted-foreground text-sm">@{user?.username || user?.primaryEmailAddress?.emailAddress.split('@')[0]}</p>
          </div>
          <Button onClick={handleShare} variant="outline" className="gap-2">
            <Share2 className="w-4 h-4" /> Share Profile
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black">{totalCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Titles Tracked</p>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black">{completedCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Completed</p>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black">7 Days</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Reading Streak</p>
          </div>
        </div>
      </div>

      {/* Top 3 Favorites */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <h2 className="text-xl font-display font-bold">All-Time Favorites</h2>
        </div>
        
        {topFavorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topFavorites.map((item) => (
              <div key={item.id} className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-md">
                <img 
                  src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                  <span className="text-yellow-400 font-black text-lg mb-1 drop-shadow-md">#1</span>
                  <h3 className="text-white font-semibold leading-tight line-clamp-2 drop-shadow-md">{item.title}</h3>
                  <p className="text-white/70 text-xs capitalize mt-1">{item.category}</p>
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

    </div>
  );
}
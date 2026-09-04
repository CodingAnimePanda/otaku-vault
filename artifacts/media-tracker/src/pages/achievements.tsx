import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useGetMediaStats, useListMedia } from "@workspace/api-client-react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const MILESTONES = [
  { count: 1, label: "First Title!", emoji: "🌱" }, { count: 5, label: "Getting Started", emoji: "📖" },
  { count: 10, label: "Bookworm", emoji: "🐛" }, { count: 25, label: "Dedicated Reader", emoji: "⭐" },
  { count: 50, label: "Otaku Apprentice", emoji: "🎌" }, { count: 100, label: "Otaku Master", emoji: "🏆" },
  { count: 200, label: "No Life (Respect)", emoji: "💀" },
];
const COMPLETION_MILESTONES = [
  { count: 10, label: "Completionist", emoji: "✅" }, { count: 50, label: "Finish Line Chaser", emoji: "🏁" },
];
const RATING_MILESTONES = [
  { count: 25, label: "Critic in Training", emoji: "📝" }, { count: 50, label: "Seasoned Reviewer", emoji: "🖋️" },
  { count: 100, label: "Master Critic", emoji: "🎓" },
];
const CATEGORY_MILESTONE_COUNT = 10; // change this to adjust threshold everywhere
const CATEGORIES = ["manhwa", "webtoon", "manhua", "manga", "anime", "webnovel"];
const FRIEND_MILESTONES = [
  { count: 1, label: "Made a Friend", emoji: "🤝" }, { count: 5, label: "Social Otaku", emoji: "👥" },
  { count: 10, label: "Vault Community", emoji: "🎉" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-display font-semibold">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}
function Badge({ emoji, label, earned, sub }: { emoji: string; label: string; earned: boolean; sub?: string }) {
  return (
    <div className={cn("p-3 rounded-xl border text-center transition-all",
      earned ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border opacity-40 grayscale")}>
      <div className="text-2xl mb-1">{emoji}</div>
      <p className="text-xs font-medium leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AchievementsPage() {
  const { getToken } = useAuth();
  const { data: stats } = useGetMediaStats();
  const { data: media } = useListMedia({ listType: "library" });
  const [friendCount, setFriendCount] = useState(0);

  const apiFetch = useCallback(async (path: string) => {
    const token = await getToken();
    const base = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
    const res = await fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return res.ok ? res.json() : null;
  }, [getToken]);

  useEffect(() => { apiFetch("/api/friends").then((d) => { if (Array.isArray(d)) setFriendCount(d.length); }); }, [apiFetch]);

  const mediaArray = Array.isArray(media) ? media : [];
  const total = Object.values(stats?.totalByCategory ?? {}).reduce((a, b) => a + b, 0);
  const completed = Object.values(stats?.completedByCategory ?? {}).reduce((a, b) => a + b, 0);
  const ratedCount = mediaArray.filter((m) => m.rating && m.rating > 0).length;
  const completedByCat = (cat: string) => mediaArray.filter((m) => m.category === cat && m.status === "completed").length;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Trophy className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-3xl font-display font-bold">Achievements</h1><p className="text-muted-foreground text-sm">Track your progress</p></div>
      </div>

      <Section title="Library Milestones">
        {MILESTONES.map((m) => <Badge key={m.label} {...m} earned={total >= m.count} sub={`${Math.min(total, m.count)}/${m.count} titles`} />)}
      </Section>

      <Section title="Completion Milestones">
        {COMPLETION_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={completed >= m.count} sub={`${Math.min(completed, m.count)}/${m.count} completed`} />)}
      </Section>

      <Section title="Rating Habits">
        {RATING_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={ratedCount >= m.count} sub={`${Math.min(ratedCount, m.count)}/${m.count} rated`} />)}
      </Section>

      <Section title="Category Completionist">
        {CATEGORIES.map((cat) => {
          const c = completedByCat(cat);
          return <Badge key={cat} emoji="🏅" label={`${cat.charAt(0).toUpperCase() + cat.slice(1)} Finisher`}
            earned={c >= CATEGORY_MILESTONE_COUNT} sub={`${Math.min(c, CATEGORY_MILESTONE_COUNT)}/${CATEGORY_MILESTONE_COUNT} completed`} />;
        })}
      </Section>

      <Section title="Social">
        {FRIEND_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={friendCount >= m.count} sub={`${Math.min(friendCount, m.count)}/${m.count} friends`} />)}
      </Section>
    </div>
  );
}
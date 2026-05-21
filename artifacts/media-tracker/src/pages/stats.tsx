// artifacts/media-tracker/src/pages/stats.tsx
import React, { useMemo } from "react";
import { useListMedia, useGetMediaStats } from "@workspace/api-client-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BookOpen, Download, Trophy, Star, TrendingUp, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  webtoon: "#60a5fa",
  manhwa: "#c084fc",
  manhua: "#34d399",
  manga: "#fb923c",
  anime: "#f472b6",
};
const STATUS_COLORS: Record<string, string> = {
  reading: "#4ade80",
  watching: "#60a5fa",
  completed: "#a78bfa",
  paused: "#fbbf24",
  dropped: "#f87171",
  plan_to_read: "#94a3b8",
};
const TIER_COLORS: Record<string, string> = {
  S: "#fbbf24", A: "#34d399", B: "#60a5fa", C: "#c084fc", D: "#fb923c", F: "#f87171",
};

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={cn("p-4 rounded-xl border border-border bg-card flex items-center gap-4")}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>{icon}</div>
      <div>
        <p className="text-2xl font-display font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { data: media } = useListMedia({ listType: "library" });
  const { data: stats } = useGetMediaStats();
  const mediaArray = Array.isArray(media) ? media : [];

  const totalItems = Object.values(stats?.totalByCategory ?? {}).reduce((a, b) => a + b, 0);
  const completedItems = Object.values(stats?.completedByCategory ?? {}).reduce((a, b) => a + b, 0);
  const ratedItems = mediaArray.filter((m) => m.rating && m.rating > 0);
  const avgRating = ratedItems.length
    ? (ratedItems.reduce((a, b) => a + (b.rating ?? 0), 0) / ratedItems.length).toFixed(1)
    : "—";

  const categoryData = useMemo(() =>
    Object.entries(stats?.totalByCategory ?? {}).map(([cat, count]) => ({ name: cat, value: count, fill: CATEGORY_COLORS[cat] ?? "#94a3b8" })),
    [stats]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    mediaArray.forEach((m) => { if (m.status) counts[m.status] = (counts[m.status] ?? 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: status.replace("_", " "), value: count, fill: STATUS_COLORS[status] ?? "#94a3b8" }));
  }, [mediaArray]);

  const tierData = useMemo(() => {
    const counts: Record<string, number> = {};
    mediaArray.forEach((m) => { if (m.tier) counts[m.tier] = (counts[m.tier] ?? 0) + 1; });
    return ["S", "A", "B", "C", "D", "F"].filter((t) => counts[t]).map((t) => ({ name: t, value: counts[t], fill: TIER_COLORS[t] }));
  }, [mediaArray]);

  const topRated = useMemo(() =>
    [...mediaArray].filter((m) => m.rating && m.rating > 0).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5),
    [mediaArray]);

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mediaArray.forEach((m) => (m.genres ?? []).forEach((g: string) => { counts[g] = (counts[g] ?? 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [mediaArray]);

  const handleExport = () => {
    const headers = ["Title", "Category", "Status", "Tier", "Rating", "Genres", "Notes", "Reading URL"];
    const rows = mediaArray.map((m) => [
      `"${(m.title ?? "").replace(/"/g, '""')}"`,
      m.category ?? "",
      m.status ?? "",
      m.tier ?? "",
      m.rating ?? "",
      `"${(m.genres ?? []).join(", ")}"`,
      `"${(m.notes ?? "").replace(/"/g, '""')}"`,
      m.readingUrl ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "otakuvault-library.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Stats</h1>
          <p className="text-muted-foreground mt-1 text-sm">A breakdown of your entire library</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Titles" value={totalItems} icon={<BookOpen className="w-5 h-5" />} color="bg-primary/10 text-primary" />
        <StatCard label="Completed" value={completedItems} icon={<CheckCircle className="w-5 h-5" />} color="bg-green-500/10 text-green-400" />
        <StatCard label="Avg Rating" value={avgRating} icon={<Star className="w-5 h-5" />} color="bg-yellow-500/10 text-yellow-400" />
        <StatCard label="Rated Titles" value={ratedItems.length} icon={<TrendingUp className="w-5 h-5" />} color="bg-violet-500/10 text-violet-400" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category pie */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h2 className="font-display font-semibold mb-4 text-sm">By Category</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-sm text-center py-12">No data yet</p>}
        </div>

        {/* Status pie */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h2 className="font-display font-semibold mb-4 text-sm">By Status</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-sm text-center py-12">No data yet</p>}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier bar */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h2 className="font-display font-semibold mb-4 text-sm">Tier Distribution</h2>
          {tierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tierData} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {tierData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-sm text-center py-12">No tiers assigned yet</p>}
        </div>

        {/* Top genres bar */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h2 className="font-display font-semibold mb-4 text-sm">Top Genres</h2>
          {genreCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={genreCounts} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-sm text-center py-12">No genres tagged yet</p>}
        </div>
      </div>

      {/* Top rated */}
      {topRated.length > 0 && (
        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h2 className="font-display font-semibold text-sm">Your Top Rated</h2>
          </div>
          <div className="space-y-3">
            {topRated.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-lg font-display font-black text-muted-foreground/40 w-6 text-center">{i + 1}</span>
                <div className="w-8 h-11 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {m.coverUrl ? <img src={m.coverUrl} alt={m.title} className="w-full h-full object-cover" /> : <BookOpen className="w-4 h-4 m-2 text-muted-foreground/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{m.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.category}</p>
                </div>
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" />
                  <span className="text-sm font-bold">{m.rating?.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
import React from "react";
import { Trophy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAchievementData } from "@/hooks/use-achievement-data";
import {
  LIBRARY_MILESTONES, COMPLETION_MILESTONES, RATING_MILESTONES,
  CATEGORY_MILESTONES, CATEGORIES, FRIEND_MILESTONES,
  REC_SENT_MILESTONES, REC_RECEIVED_MILESTONES, SHARE_MILESTONES,
  HIDDEN_ACHIEVEMENTS,
} from "@/lib/achievements";

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
function HiddenBadge({ earned, emoji, label, desc }: { earned: boolean; emoji: string; label: string; desc: string }) {
  return (
    <div className={cn("p-3 rounded-xl border text-center transition-all",
      earned ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border opacity-50")}>
      <div className="text-2xl mb-1">{earned ? emoji : <Lock className="w-5 h-5 mx-auto text-muted-foreground/50" />}</div>
      <p className="text-xs font-medium leading-tight">{earned ? label : "???"}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{earned ? desc : "Hidden — keep exploring"}</p>
    </div>
  );
}

export default function AchievementsPage() {
  const d = useAchievementData();
  const total = d.media.length;
  const completed = d.media.filter((m) => m.status === "completed").length;
  const rated = d.media.filter((m) => m.rating && m.rating > 0).length;
  const completedByCat = (cat: string) => d.media.filter((m) => m.category === cat && m.status === "completed").length;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Trophy className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-3xl font-display font-bold">Achievements</h1><p className="text-muted-foreground text-sm">Track your progress</p></div>
      </div>

      <Section title="Library Milestones">
        {LIBRARY_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={total >= m.count} sub={`${Math.min(total, m.count)}/${m.count} titles`} />)}
      </Section>

      <Section title="Completion Milestones">
        {COMPLETION_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={completed >= m.count} sub={`${Math.min(completed, m.count)}/${m.count} completed`} />)}
      </Section>

      <Section title="Rating Habits">
        {RATING_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={rated >= m.count} sub={`${Math.min(rated, m.count)}/${m.count} rated`} />)}
      </Section>

      {CATEGORIES.map((cat) => (
        <Section key={cat} title={`${cat.charAt(0).toUpperCase() + cat.slice(1)} Completionist`}>
          {CATEGORY_MILESTONES.map((count) => {
            const c = completedByCat(cat);
            return <Badge key={count} emoji="🏅" label={`${count}`} earned={c >= count} sub={`${Math.min(c, count)}/${count} completed`} />;
          })}
        </Section>
      ))}

      <Section title="Social">
        {FRIEND_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={d.friendCount >= m.count} sub={`${Math.min(d.friendCount, m.count)}/${m.count} friends`} />)}
        {REC_SENT_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={d.recSentCount >= m.count} sub={`${Math.min(d.recSentCount, m.count)}/${m.count} sent`} />)}
        {REC_RECEIVED_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={d.recReceivedCount >= m.count} sub={`${Math.min(d.recReceivedCount, m.count)}/${m.count} received`} />)}
        {SHARE_MILESTONES.map((m) => <Badge key={m.label} {...m} earned={d.shareCount >= m.count} sub={`${Math.min(d.shareCount, m.count)}/${m.count} shared`} />)}
      </Section>

      <Section title="Hidden Achievements">
        {HIDDEN_ACHIEVEMENTS.map((h) => <HiddenBadge key={h.id} earned={h.check(d)} emoji={h.emoji} label={h.label} desc={h.desc} />)}
      </Section>
    </div>
  );
}
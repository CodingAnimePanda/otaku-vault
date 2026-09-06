import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { X } from "lucide-react";
import type { UnlockedAchievement } from "@/lib/achievements";

export function AchievementToast({ achievement, onDismiss }: { achievement: UnlockedAchievement; onDismiss: () => void }) {
  useEffect(() => {
    confetti({ particleCount: 100, spread: 70, origin: { x: 0.9, y: 0.15 } });
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [achievement.id]);

  return (
    <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-card border border-primary/30 rounded-2xl p-4 shadow-2xl shadow-primary/20 max-w-xs flex items-start gap-3">
        <span className="text-3xl">{achievement.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Achievement Unlocked</p>
          <p className="font-display font-bold text-sm">{achievement.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{achievement.desc}</p>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground flex-shrink-0"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
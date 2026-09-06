import { useEffect, useState } from "react";
import { useAchievementData } from "./use-achievement-data";
import { getAllUnlocked, UnlockedAchievement } from "@/lib/achievements";

function loadSeen(): Set<string> {
  try { const s = localStorage.getItem("ov_seen_achievements"); if (s) return new Set(JSON.parse(s)); } catch {}
  return new Set();
}
function saveSeen(s: Set<string>) {
  try { localStorage.setItem("ov_seen_achievements", JSON.stringify([...s])); } catch {}
}

export function useAchievementUnlocks() {
  const data = useAchievementData();
  const [queue, setQueue] = useState<UnlockedAchievement[]>([]);

  useEffect(() => {
    if (!data.media.length) return; // wait for data
    const hasSeenBefore = localStorage.getItem("ov_seen_achievements") !== null;
    const unlocked = getAllUnlocked(data);

    if (!hasSeenBefore) {
      saveSeen(new Set(unlocked.map((u) => u.id))); // seed silently, no spam on first load
      return;
    }
    const seen = loadSeen();
    const fresh = unlocked.filter((u) => !seen.has(u.id));
    if (fresh.length > 0) {
      setQueue((q) => [...q, ...fresh]);
      unlocked.forEach((u) => seen.add(u.id));
      saveSeen(seen);
    }
  }, [data.media.length, data.friendCount, data.recSentCount, data.recReceivedCount, data.shareCount, data.blUnlocked]);

  return { current: queue[0] ?? null, dismiss: () => setQueue((q) => q.slice(1)) };
}
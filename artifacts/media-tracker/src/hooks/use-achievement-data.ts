import { useUser, useAuth } from "@clerk/clerk-react";
import { useListMedia } from "@workspace/api-client-react";
import { useEffect, useState, useCallback } from "react";
import type { AchievementData } from "@/lib/achievements";

const BASE_URL = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";

export function useAchievementData(): AchievementData {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { data: media } = useListMedia({ listType: "library" });
  const [friendCount, setFriendCount] = useState(0);
  const [recReceivedCount, setRecReceivedCount] = useState(0);

  const apiFetch = useCallback(async (path: string) => {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return res.ok ? res.json() : null;
  }, [getToken]);

  useEffect(() => {
    apiFetch("/api/friends").then((d) => { if (Array.isArray(d)) setFriendCount(d.length); });
    apiFetch("/api/friends/recommendations").then((d) => { if (Array.isArray(d)) setRecReceivedCount(d.length); });
  }, [apiFetch]);

  return {
    media: Array.isArray(media) ? media : [],
    friendCount,
    recSentCount: Number(localStorage.getItem("ov_rec_sent_count") ?? 0),
    shareCount: Number(localStorage.getItem("ov_share_count") ?? 0),
    blUnlocked: (() => { try { return localStorage.getItem("ovbl") === "1"; } catch { return false; } })(),
    accountCreatedAt: user?.createdAt ? new Date(user.createdAt) : null,
  };
}
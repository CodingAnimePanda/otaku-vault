export interface MilestoneDef { count: number; label: string; emoji: string; }

export const LIBRARY_MILESTONES: MilestoneDef[] = [
  { count: 1, label: "First Title!", emoji: "🌱" },
  { count: 5, label: "Getting Started", emoji: "📖" },
  { count: 10, label: "Bookworm", emoji: "🐛" },
  { count: 25, label: "Dedicated Reader", emoji: "⭐" },
  { count: 50, label: "Otaku Apprentice", emoji: "🎌" },
  { count: 100, label: "Otaku Master", emoji: "🏆" },
  { count: 200, label: "No Life (Respect)", emoji: "💀" },
  { count: 300, label: "Vault Keeper", emoji: "🔑" },
  { count: 500, label: "Archive Builder", emoji: "🗄️" },
  { count: 750, label: "Hoarder of Stories", emoji: "📚" },
  { count: 1000, label: "Four-Digit Club", emoji: "🎯" },
  { count: 1500, label: "Unstoppable", emoji: "🚀" },
  { count: 2000, label: "Living Library", emoji: "🏛️" },
  { count: 3000, label: "Beyond Mortal Limits", emoji: "🌌" },
  { count: 5000, label: "Otaku Deity", emoji: "👑" },
  { count: 7500, label: "The Vault Itself", emoji: "🏯" },
  { count: 10000, label: "Ascended", emoji: "✨" },
];

export const COMPLETION_MILESTONES: MilestoneDef[] = [
  { count: 10, label: "Completionist", emoji: "✅" },
  { count: 25, label: "Closer", emoji: "🔒" },
  { count: 50, label: "Finish Line Chaser", emoji: "🏁" },
  { count: 100, label: "Century Finisher", emoji: "💯" },
  { count: 200, label: "Marathoner", emoji: "🏃" },
  { count: 300, label: "Relentless", emoji: "⚡" },
  { count: 500, label: "Half-K Club", emoji: "🎖️" },
  { count: 750, label: "Veteran Finisher", emoji: "🛡️" },
  { count: 1000, label: "One Thousand Endings", emoji: "🎬" },
  { count: 1500, label: "Saga Slayer", emoji: "⚔️" },
  { count: 2000, label: "Legend of Completion", emoji: "🐉" },
  { count: 3000, label: "Unfathomable Dedication", emoji: "🌠" },
  { count: 5000, label: "Completion Deity", emoji: "👑" },
  { count: 7500, label: "The Finisher", emoji: "🏯" },
  { count: 10000, label: "Ascended Finisher", emoji: "✨" },
];

export const RATING_MILESTONES: MilestoneDef[] = [
  { count: 25, label: "Critic in Training", emoji: "📝" },
  { count: 50, label: "Seasoned Reviewer", emoji: "🖋️" },
  { count: 100, label: "Master Critic", emoji: "🎓" },
  { count: 200, label: "Review Machine", emoji: "⚙️" },
  { count: 300, label: "Prolific Critic", emoji: "🗞️" },
  { count: 500, label: "Half-K Reviewer", emoji: "🎖️" },
  { count: 750, label: "Veteran Critic", emoji: "🛡️" },
  { count: 1000, label: "Thousand Verdicts", emoji: "⚖️" },
  { count: 1500, label: "Rating Sage", emoji: "🧙" },
  { count: 2000, label: "Legendary Reviewer", emoji: "🐉" },
  { count: 3000, label: "Beyond Critique", emoji: "🌠" },
  { count: 5000, label: "Critic Deity", emoji: "👑" },
  { count: 7500, label: "The Final Word", emoji: "🏯" },
  { count: 10000, label: "Ascended Critic", emoji: "✨" },
];

// Change these two arrays to adjust category-completionist thresholds/categories everywhere
export const CATEGORY_MILESTONES: number[] = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
export const CATEGORIES = ["manhwa", "webtoon", "manhua", "manga", "anime", "webnovel"];

export const FRIEND_MILESTONES: MilestoneDef[] = [
  { count: 1, label: "Made a Friend", emoji: "🤝" },
  { count: 5, label: "Social Otaku", emoji: "👥" },
  { count: 10, label: "Vault Community", emoji: "🎉" },
  { count: 25, label: "Popular", emoji: "🌟" },
  { count: 50, label: "Vault Celebrity", emoji: "🎤" },
];
export const REC_SENT_MILESTONES: MilestoneDef[] = [
  { count: 10, label: "Tastemaker", emoji: "📣" },
  { count: 50, label: "Recommendation Machine", emoji: "🤖" },
];
export const REC_RECEIVED_MILESTONES: MilestoneDef[] = [
  { count: 10, label: "Well-Liked", emoji: "💌" },
];
export const SHARE_MILESTONES: MilestoneDef[] = [
  { count: 5, label: "Open Book", emoji: "📖" },
];

export interface AchievementData {
  media: any[];
  friendCount: number;
  recSentCount: number;
  recReceivedCount: number;
  shareCount: number;
  blUnlocked: boolean;
  accountCreatedAt: Date | null;
}

export interface HiddenAchievement {
  id: string; emoji: string; label: string; desc: string;
  check: (d: AchievementData) => boolean;
}

export const HIDDEN_ACHIEVEMENTS: HiddenAchievement[] = [
  { id: "night_owl", emoji: "🦉", label: "Night Owl", desc: "Added or edited a title between 2–5 AM.",
    check: (d) => d.media.some((m) => { const h = new Date(m.updatedAt ?? m.createdAt ?? 0).getHours(); return h >= 2 && h < 5; }) },
  { id: "speed_reader", emoji: "⚡", label: "Speed Reader", desc: "Completed a title within 24 hours of adding it.",
    check: (d) => d.media.some((m) => m.status === "completed" && m.createdAt && m.updatedAt &&
      new Date(m.updatedAt).getTime() - new Date(m.createdAt).getTime() < 24 * 60 * 60 * 1000) },
  { id: "harsh_critic", emoji: "🔪", label: "Harsh Critic", desc: "Gave a title a rating of 2 or lower.",
    check: (d) => d.media.some((m) => m.rating != null && m.rating > 0 && m.rating <= 2) },
  { id: "perfectionist", emoji: "💎", label: "Perfectionist", desc: "Gave a perfect 10/10 to 10+ titles.",
    check: (d) => d.media.filter((m) => m.rating === 10).length >= 10 },
  { id: "dropped_hot", emoji: "🔥", label: "Dropped Like It's Hot", desc: "Dropped 10 titles.",
    check: (d) => d.media.filter((m) => m.status === "dropped").length >= 10 },
  { id: "bl_enthusiast", emoji: "🌹", label: "BL Enthusiast", desc: "Unlocked the Secret Vault.",
    check: (d) => d.blUnlocked },
  { id: "genre_explorer", emoji: "🗺️", label: "Genre Explorer", desc: "Have titles spanning 15+ different genres.",
    check: (d) => { const s = new Set<string>(); d.media.forEach((m) => (m.genres ?? []).forEach((g: string) => s.add(g))); return s.size >= 15; } },
  { id: "completion_streak", emoji: "🔗", label: "Completionist Streak", desc: "Completed 5 titles in the same category back to back.",
    check: (d) => {
      const c = d.media.filter((m) => m.status === "completed").sort((a, b) => new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime());
      let streak = 1;
      for (let i = 1; i < c.length; i++) { if (c[i].category === c[i - 1].category) { streak++; if (streak >= 5) return true; } else streak = 1; }
      return false;
    } },
  { id: "try_hard", emoji: "🧩", label: "The Try-Hard", desc: "Filled out every rating category on a single title.",
    check: (d) => d.media.some((m) => m.ratingStory > 0 && m.ratingArt > 0 && m.ratingCharacter > 0 && m.ratingWorldBuilding > 0 && m.ratingUniqueness > 0 && m.ratingEnjoyment > 0) },
  { id: "old_soul", emoji: "🕰️", label: "Old Soul", desc: "Account active for 1+ year.",
    check: (d) => !!d.accountCreatedAt && Date.now() - d.accountCreatedAt.getTime() >= 365 * 24 * 60 * 60 * 1000 },
  { id: "renaissance_otaku", emoji: "🎭", label: "Renaissance Otaku", desc: "Have at least one title in every category, including Normie Stuff.",
    check: (d) => { const need = ["manhwa","webtoon","manhua","manga","anime","webnovel","normie_tv","normie_movie","normie_book"]; const have = new Set(d.media.map((m) => m.category)); return need.every((c) => have.has(c)); } },
];

export interface UnlockedAchievement { id: string; emoji: string; label: string; desc: string; }

export function getAllUnlocked(d: AchievementData): UnlockedAchievement[] {
  const out: UnlockedAchievement[] = [];
  const total = d.media.length;
  const completed = d.media.filter((m) => m.status === "completed").length;
  const rated = d.media.filter((m) => m.rating && m.rating > 0).length;

  LIBRARY_MILESTONES.forEach((m) => { if (total >= m.count) out.push({ id: `lib_${m.count}`, emoji: m.emoji, label: m.label, desc: `${m.count}+ titles tracked` }); });
  COMPLETION_MILESTONES.forEach((m) => { if (completed >= m.count) out.push({ id: `comp_${m.count}`, emoji: m.emoji, label: m.label, desc: `${m.count}+ titles completed` }); });
  RATING_MILESTONES.forEach((m) => { if (rated >= m.count) out.push({ id: `rate_${m.count}`, emoji: m.emoji, label: m.label, desc: `${m.count}+ titles rated` }); });

  CATEGORIES.forEach((cat) => {
    const c = d.media.filter((m) => m.category === cat && m.status === "completed").length;
    CATEGORY_MILESTONES.forEach((count) => {
      if (c >= count) out.push({ id: `cat_${cat}_${count}`, emoji: "🏅", label: `${cat[0].toUpperCase()}${cat.slice(1)} Finisher (${count})`, desc: `${count}+ ${cat} completed` });
    });
  });

  FRIEND_MILESTONES.forEach((m) => { if (d.friendCount >= m.count) out.push({ id: `friend_${m.count}`, emoji: m.emoji, label: m.label, desc: `${m.count}+ friends` }); });
  REC_SENT_MILESTONES.forEach((m) => { if (d.recSentCount >= m.count) out.push({ id: `recsent_${m.count}`, emoji: m.emoji, label: m.label, desc: `Sent ${m.count}+ recommendations` }); });
  REC_RECEIVED_MILESTONES.forEach((m) => { if (d.recReceivedCount >= m.count) out.push({ id: `recrecv_${m.count}`, emoji: m.emoji, label: m.label, desc: `Received ${m.count}+ recommendations` }); });
  SHARE_MILESTONES.forEach((m) => { if (d.shareCount >= m.count) out.push({ id: `share_${m.count}`, emoji: m.emoji, label: m.label, desc: `Shared library with ${m.count}+ friends` }); });

  HIDDEN_ACHIEVEMENTS.forEach((h) => { if (h.check(d)) out.push({ id: `hidden_${h.id}`, emoji: h.emoji, label: h.label, desc: h.desc }); });

  return out;
}
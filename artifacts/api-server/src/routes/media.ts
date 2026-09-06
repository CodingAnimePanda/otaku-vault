// artifacts/api-server/src/routes/media.ts
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, mediaTable } from "@workspace/db";
import {
  ListMediaQueryParams, CreateMediaBody, UpdateMediaBody,
  UpdateMediaTierBody, GetMediaParams, UpdateMediaParams,
  DeleteMediaParams, UpdateMediaTierParams, CheckMediaUpdateParams,
  SearchCoverQueryParams, GetRecommendationsQueryParams,
  ListMediaResponseItem, GetMediaResponse, GetMediaStatsResponse,
  GetRecommendationsResponseItem, GetMediaUpdatesResponseItem,
  SearchCoverResponseItem, CheckMediaUpdateResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requireAuth(req: any, res: any): string | null {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

function serializeMedia(row: typeof mediaTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    category: row.category as "webtoon" | "manhwa" | "manhua" | "manga" | "anime" | "webnovel" | "normie_tv" | "normie_movie" | "normie_book",
    listType: row.listType as "library" | "to_read" | "avoid" | "bl",
    status: row.status as "reading" | "watching" | "completed" | "paused" | "dropped" | "plan_to_read" | null,
    coverUrl: row.coverUrl ?? null,
    customCoverUrl: row.customCoverUrl ?? null,
    tier: row.tier as "S" | "A" | "B" | "C" | "D" | "F" | null,
    rating: row.rating ?? null,
    ratingStory: row.ratingStory ?? null,
    ratingArt: row.ratingArt ?? null,
    ratingCharacter: row.ratingCharacter ?? null,
    ratingWorldBuilding: row.ratingWorldBuilding ?? null,
    ratingUniqueness: row.ratingUniqueness ?? null,
    ratingEnjoyment: row.ratingEnjoyment ?? null,
    ratingSourceAccuracy: row.ratingSourceAccuracy ?? null,
    reviewText: row.reviewText ?? null,
    genres: row.genres ?? [],
    notes: row.notes ?? null,
    hasUpdate: row.hasUpdate,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    currentChapter: row.currentChapter ?? null,
    totalChapters: row.totalChapters ?? null,
    addedBy: row.addedBy ?? null,
    readingUrl: row.readingUrl ?? null,
    description: row.description ?? null,
    topFavoriteRank: row.topFavoriteRank ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getLatestChapterFromMangaDex(title: string): Promise<string | null> {
  try {
    const searchUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=5&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;
    const searchResp = await fetch(searchUrl);
    if (!searchResp.ok) return null;
    const searchJson = await searchResp.json() as { data?: Array<{ id: string }> };
    if (!searchJson.data?.length) return null;
    const mangaId = searchJson.data[0].id;
    const chapUrl = `https://api.mangadex.org/chapter?manga=${mangaId}&translatedLanguage[]=en&order[chapter]=desc&limit=1`;
    const chapResp = await fetch(chapUrl);
    if (!chapResp.ok) return null;
    const chapJson = await chapResp.json() as { data?: Array<{ attributes?: { chapter?: string; title?: string } }> };
    if (!chapJson.data?.length) return null;
    const chap = chapJson.data[0].attributes;
    if (!chap?.chapter) return null;
    return `Chapter ${chap.chapter}${chap.title ? `: ${chap.title}` : ""}`;
  } catch (err) {
    logger.warn({ err, title }, "MangaDex lookup failed");
    return null;
  }
}

async function getLatestEpisodeFromJikan(title: string): Promise<string | null> {
  try {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=3&sfw=true`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const json = await resp.json() as { data?: Array<{ episodes?: number | null; airing?: boolean }> };
    if (!json.data?.length) return null;
    const anime = json.data[0];
    if (anime.episodes) return anime.airing ? `${anime.episodes}+ episodes (airing)` : `${anime.episodes} episodes`;
    if (anime.airing) return "Currently airing";
    return null;
  } catch (err) {
    logger.warn({ err, title }, "Jikan lookup failed");
    return null;
  }
}

// GET /media/stats
router.get("/media/stats", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const all = await db.select().from(mediaTable).where(eq(mediaTable.userId, userId));

  const totalByCategory: Record<string, number> = {};
  const completedByCategory: Record<string, number> = {};

  all.forEach(m => {
    totalByCategory[m.category] = (totalByCategory[m.category] || 0) + 1;
    if (m.status === "completed") {
      completedByCategory[m.category] = (completedByCategory[m.category] || 0) + 1;
    }
  });

  res.json({
    totalByCategory,
    completedByCategory,
    toReadCount: all.filter(m => m.listType === "to_read").length,
    avoidCount: all.filter(m => m.listType === "avoid").length,
  });
});

const CURATED_WEBNOVELS = [
  { title: "Omniscient Reader's Viewpoint", coverUrl: null, genres: ["Fantasy", "Action", "Apocalypse"], synopsis: "A reader becomes the sole person who knows how his favorite web novel's apocalypse will unfold." },
  { title: "Solo Leveling", coverUrl: null, genres: ["Action", "Fantasy"], synopsis: "The weakest hunter gains the power to level up infinitely." },
  { title: "The Beginning After the End", coverUrl: null, genres: ["Fantasy", "Reincarnation"], synopsis: "A king is reincarnated into a world of magic, keeping memories of his past life." },
  { title: "Lord of the Mysteries", coverUrl: null, genres: ["Mystery", "Steampunk", "Horror"], synopsis: "A man wakes in a body from another world and must navigate occult factions." },
  { title: "Mother of Learning", coverUrl: null, genres: ["Fantasy", "Time Loop"], synopsis: "A mage trapped in a time loop tries to break the cycle and save his city." },
  { title: "A Practical Guide to Evil", coverUrl: null, genres: ["Fantasy", "War"], synopsis: "An orphan girl claws her way into a role as a villain in a world of Good vs Evil." },
  { title: "Reverend Insanity", coverUrl: null, genres: ["Cultivation", "Dark Fantasy"], synopsis: "A ruthless cultivator repeatedly reincarnates to complete his ultimate scheme." },
  { title: "Warlock of the Magus World", coverUrl: null, genres: ["Sci-Fi", "Cultivation"], synopsis: "A scientist is reincarnated into a magical world and combines science with sorcery." },
  { title: "The Wandering Inn", coverUrl: null, genres: ["Fantasy", "Slice of Life"], synopsis: "A woman transported to a fantasy world opens an inn amid political and magical chaos." },
  { title: "Super Gene", coverUrl: null, genres: ["Sci-Fi", "Action"], synopsis: "A young man gains extraordinary abilities through genetic modification." },
  { title: "I Alone Level-Up" , coverUrl: null, genres: ["Action", "Fantasy"], synopsis: "Alternate title reference for Solo Leveling readers exploring similar LitRPG stories." },
  { title: "Beware of Chicken", coverUrl: null, genres: ["Cultivation", "Comedy", "Slice of Life"], synopsis: "A reincarnated man abandons the cultivation rat race to become a humble farmer." },
  { title: "Cradle Series (Will Wight)", coverUrl: null, genres: ["Cultivation", "Fantasy", "Action"], synopsis: "A young man in a sacred but weak clan strives to grow stronger through forbidden means." },
  { title: "He Who Fights With Monsters", coverUrl: null, genres: ["LitRPG", "Fantasy", "Comedy"], synopsis: "An everyday man is transported to a LitRPG-style world and must survive with unconventional abilities." },
  { title: "Overgeared", coverUrl: null, genres: ["LitRPG", "Action"], synopsis: "A poor blacksmith rises to legendary status within a popular VRMMORPG." },
  { title: "The Legendary Mechanic", coverUrl: null, genres: ["Sci-Fi", "LitRPG"], synopsis: "A player wakes up trapped inside a game as an overpowered mechanic character." },
  { title: "Iron Widow", coverUrl: null, genres: ["Sci-Fi", "Mecha", "Dystopian"], synopsis: "A vengeful concubine-pilot fights a patriarchal mecha empire from the inside." },
  { title: "Release That Witch", coverUrl: null, genres: ["Fantasy", "Isekai", "Politics"], synopsis: "A modern engineer reborn in a medieval world builds an empire with future technology." },
  { title: "Reign of the Hunters", coverUrl: null, genres: ["LitRPG", "Apocalypse"], synopsis: "Survivors of an alien invasion gain powers and must hunt monsters to survive." },
  { title: "Defiance of the Fall", coverUrl: null, genres: ["Cultivation", "LitRPG"], synopsis: "A man dies and is reborn into a video-game-like apocalyptic world of cultivation." },
  { title: "Shadow Slave", coverUrl: null, genres: ["Dark Fantasy", "LitRPG"], synopsis: "A boy becomes a Sunless in a deadly nightmare realm to save his sister." },
  { title: "The Perfect Run", coverUrl: null, genres: ["Sci-Fi", "Time Loop"], synopsis: "A man stuck in a time loop repeatedly attempts a heist in the world's most dangerous city." },
  { title: "Azarinth Healer", coverUrl: null, genres: ["LitRPG", "Fantasy"], synopsis: "A woman transported into a fantasy world becomes a powerful healer with a hidden dark side." },
  { title: "The Wandering Swordsman", coverUrl: null, genres: ["Action", "Wuxia"], synopsis: "A drifting swordsman gets tangled in the affairs of powerful martial sects." },
  { title: "Emperor's Domination", coverUrl: null, genres: ["Cultivation", "Action"], synopsis: "A genius cultivator repeatedly reincarnates to fulfill an ancient promise." },
  { title: "Way of the Devil", coverUrl: null, genres: ["Cultivation", "Dark Fantasy"], synopsis: "A modern man reincarnates into a chaotic cultivation world where only strength matters." },
  { title: "Chrysalis", coverUrl: null, genres: ["LitRPG", "Horror", "Isekai"], synopsis: "A man reincarnates as a monster in a world governed by game-like system mechanics." },
  { title: "Everyone Else Is A Returnee", coverUrl: null, genres: ["Fantasy", "Isekai"], synopsis: "A boy is the only one in his school without special powers after a dimensional rift event." },
  { title: "Return of the Mount Hua Sect", coverUrl: null, genres: ["Wuxia", "Comedy", "Action"], synopsis: "A dead martial arts master's soul is reincarnated a century later." },
  { title: "The Runesmith", coverUrl: null, genres: ["Fantasy", "Slice of Life"], synopsis: "A runesmith with unique magical crafting abilities builds a life in a fantasy world." },
  { title: "Super Sales on Superpowers", coverUrl: null, genres: ["Sci-Fi", "Comedy"], synopsis: "A man gains supernatural abilities from a bizarre alien vending machine." },
  { title: "Everybody Loves Large Chests", coverUrl: null, genres: ["LitRPG", "Comedy", "Isekai"], synopsis: "A man reincarnated as a treasure chest monster explores dungeon life with humor." },
  { title: "Sinner's Prayer", coverUrl: null, genres: ["Fantasy", "Grimdark"], synopsis: "A man reincarnates in a grim fantasy world plagued by demons and moral corruption." },
  { title: "Konosuba (Light Novel)", coverUrl: null, genres: ["Isekai", "Comedy", "Fantasy"], synopsis: "A NEET dies and is reincarnated in a fantasy world with a goddess and dysfunctional party." },
  { title: "Trash of the Count's Family", coverUrl: null, genres: ["Fantasy", "Isekai"], synopsis: "A man possesses the villain of a novel and works to escape his tragic fate." },
  { title: "Álvaro: The Ambitious Squire", coverUrl: null, genres: ["Fantasy", "Politics"], synopsis: "A squire schemes and maneuvers his way up the ranks of feudal power." },
  { title: "Praise the Orc", coverUrl: null, genres: ["Fantasy", "Isekai", "Comedy"], synopsis: "A man is reincarnated as a weak orc in a fantasy world and must survive by his wits." },
  { title: "The Extra's Academy Survival Guide", coverUrl: null, genres: ["Fantasy", "Isekai", "Academy"], synopsis: "A side character in a game world uses knowledge of the plot to survive dangerous academy life." },
  { title: "Second Coming of Gluttony", coverUrl: null, genres: ["Fantasy", "Time Travel"], synopsis: "A ruined gambler travels back in time with knowledge of a hidden magical world." },
  { title: "The Devil Is A Part-Timer! (Light Novel)", coverUrl: null, genres: ["Isekai", "Comedy"], synopsis: "A demon lord is banished to modern Tokyo and forced to work at a fast food joint." },
  { title: "So I'm a Spider, So What?", coverUrl: null, genres: ["Isekai", "Fantasy", "Comedy"], synopsis: "A high school girl reincarnates as a lowly spider monster and must fight to survive." },
  { title: "Legendary Moonlight Sculptor", coverUrl: null, genres: ["LitRPG", "Fantasy"], synopsis: "An impoverished young man becomes a legend inside a groundbreaking VRMMORPG." },
  { title: "The Novel's Extra", coverUrl: null, genres: ["Fantasy", "Isekai"], synopsis: "A man is transported into the world of a novel he was reading, as an extra character." },
  { title: "Beginning After The End: Companion (Sylvie POV)", coverUrl: null, genres: ["Fantasy", "Reincarnation"], synopsis: "Side-story style expansions exploring companion characters from a beloved reincarnation series." },
  { title: "Building the Ultimate Kingdom", coverUrl: null, genres: ["Fantasy", "Strategy", "Politics"], synopsis: "A reincarnated ruler uses strategy and hidden knowledge to build an unstoppable kingdom." },
  { title: "Player Who Returned 10,000 Years Later", coverUrl: null, genres: ["LitRPG", "Fantasy"], synopsis: "A legendary player wakes from a 10,000 year sleep to a drastically changed game world." },
  { title: "God of Blackfield", coverUrl: null, genres: ["Action", "LitRPG"], synopsis: "A retired special forces operative becomes overpowered within a virtual reality game." },
  { title: "The Max Level Hero Has Returned!", coverUrl: null, genres: ["Fantasy", "LitRPG"], synopsis: "A max-level hero returns to a world centuries after saving it, now forgotten by history." },
  { title: "Tower of God (Novel continuity)", coverUrl: null, genres: ["Fantasy", "Mystery", "Action"], synopsis: "A boy enters a mysterious tower in pursuit of his closest friend, facing deadly trials." },
  { title: "Log Horizon (Light Novel)", coverUrl: null, genres: ["LitRPG", "Fantasy", "Politics"], synopsis: "Players trapped in an MMORPG must build a new society and government within the game world." },
];

// GET /media/recommendations
router.get("/media/recommendations", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { category } = req.query as { category?: string };

  try {
    const library = await db.select().from(mediaTable).where(eq(mediaTable.userId, userId));
    const libraryTitles = new Set(library.map((m) => m.title.toLowerCase()));

    const results: any[] = [];

        const categoriesToFetch = category
      ? [category]
      : ["manhwa", "manga", "webtoon", "anime", "webnovel"];

    for (const cat of categoriesToFetch) {
      if (cat === "webnovel") {
        for (const item of CURATED_WEBNOVELS) {
          if (libraryTitles.has(item.title.toLowerCase())) continue;
          results.push({ ...item, category: "webnovel", score: null, source: "Curated" });
        }
        continue;
      }
      if (cat === "anime") {
        const resp = await fetch("https://api.jikan.moe/v4/top/anime?limit=20&filter=bypopularity");
        if (!resp.ok) continue;
        const json = await resp.json() as any;
        for (const item of json.data ?? []) {
          if (libraryTitles.has(item.title?.toLowerCase())) continue;
          results.push({
            title: item.title,
            category: "anime",
            coverUrl: item.images?.jpg?.large_image_url ?? null,
            genres: item.genres?.map((g: any) => g.name) ?? [],
            score: item.score ?? null,
            synopsis: item.synopsis ?? null,
            source: "MyAnimeList",
          });
        }
        await sleep(400);
      } else {
        const typeMap: Record<string, string> = {
          manga: "ja", manhwa: "ko", manhua: "zh", webtoon: "ko",
        };
        const lang = typeMap[cat] ?? "ja";
        const url = `https://api.mangadex.org/manga?limit=20&order[followedCount]=desc&originalLanguage[]=${lang}&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const json = await resp.json() as any;
        for (const item of json.data ?? []) {
          const rawTitle: string = item.attributes?.title?.en
            ?? item.attributes?.altTitles?.find((t: any) => t.en)?.en
            ?? Object.values(item.attributes?.title ?? {})[0]
            ?? "";
          const title = rawTitle;
          if (!title || libraryTitles.has((title as string).toLowerCase())) continue;
          const coverRel = item.relationships?.find((r: any) => r.type === "cover_art");
          const coverUrl = coverRel?.attributes?.fileName
            ? `https://uploads.mangadex.org/covers/${item.id}/${coverRel.attributes.fileName}.256.jpg`
            : null;
          const genres = item.attributes?.tags
            ?.filter((t: any) => t.attributes?.group === "genre")
            .map((t: any) => t.attributes?.name?.en)
            .filter(Boolean) ?? [];
          results.push({
            title,
            category: cat,
            coverUrl,
            genres,
            score: null,
            synopsis: item.attributes?.description?.en ?? null,
            source: "MangaDex",
          });
        }
      }
    }

    res.json(results.slice(0, 60));
  } catch (err) {
    logger.warn({ err }, "Recommendations fetch failed");
    res.json([]);
  }
});

// GET /media
router.get("/media", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = ListMediaQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { category, listType, status } = parsed.data;
  const conditions: any[] = [eq(mediaTable.userId, userId)];
  if (category) conditions.push(eq(mediaTable.category, category));
  if (listType) conditions.push(eq(mediaTable.listType, listType));
  if (status) conditions.push(eq(mediaTable.status, status));

  const rows = await db.select().from(mediaTable)
    .where(and(...conditions))
    .orderBy(mediaTable.createdAt);

  res.json(rows.map(serializeMedia).map((item) => ListMediaResponseItem.parse(item)));
});

// POST /media
router.post("/media", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = CreateMediaBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const data = parsed.data;
  const [row] = await db.insert(mediaTable).values({
    title: data.title,
    category: data.category,
    listType: data.listType,
    status: data.status ?? null,
    coverUrl: data.coverUrl ?? null,
    genres: (data as any).genres ?? [],
    notes: data.notes ?? null,
    addedBy: data.addedBy ?? null,
    userId: userId,
    readingUrl: data.readingUrl ?? null,
    description: (data as any).description ?? null,
    rating: (data as any).rating ?? null,
    ratingStory: (data as any).ratingStory ?? null,
    ratingArt: (data as any).ratingArt ?? null,
    ratingCharacter: (data as any).ratingCharacter ?? null,
    ratingWorldBuilding: (data as any).ratingWorldBuilding ?? null,
    ratingUniqueness: (data as any).ratingUniqueness ?? null,
    ratingEnjoyment: (data as any).ratingEnjoyment ?? null,
    ratingSourceAccuracy: (data as any).ratingSourceAccuracy ?? null,
  }).returning();

  res.status(201).json(serializeMedia(row));
});

// PUT /media/:id
router.put("/media/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const mediaId = parseInt(req.params.id);
  if (isNaN(mediaId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateMediaBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const data = parsed.data;
  const [updated] = await db.update(mediaTable)
    .set({
      title: data.title,
      category: data.category,
      status: data.status,
      listType: data.listType,
      notes: data.notes ?? null,
      coverUrl: data.coverUrl ?? null,
      readingUrl: data.readingUrl ?? null,
      description: (data as any).description ?? null,
      genres: data.genres ?? undefined,
      reviewText: req.body.reviewText ?? null,
      rating: req.body.rating ?? null,
      ratingStory: req.body.ratingStory ?? null,
      ratingArt: req.body.ratingArt ?? null,
      ratingCharacter: req.body.ratingCharacter ?? null,
      ratingWorldBuilding: req.body.ratingWorldBuilding ?? null,
      ratingUniqueness: req.body.ratingUniqueness ?? null,
      ratingEnjoyment: req.body.ratingEnjoyment ?? null,
      ratingSourceAccuracy: data.ratingSourceAccuracy,
    })
    .where(and(eq(mediaTable.id, mediaId), eq(mediaTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Media not found" }); return; }
  res.json(serializeMedia(updated));
});

// PUT /media/:id/tier
router.put("/media/:id/tier", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = UpdateMediaTierParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateMediaTierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(mediaTable)
    .set({ tier: parsed.data.tier })
    .where(and(eq(mediaTable.id, params.data.id), eq(mediaTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Media not found" }); return; }
  res.json(serializeMedia(updated));
});

// DELETE /media/:id
router.delete("/media/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = DeleteMediaParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [deleted] = await db.delete(mediaTable)
    .where(and(eq(mediaTable.id, params.data.id), eq(mediaTable.userId, userId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Media not found" }); return; }
  res.sendStatus(204);
});

// MangaDex proxy
router.get("/media/proxy/mangadex", async (req, res) => {
  const { title } = req.query as { title: string };
  if (!title) return res.status(400).json({ error: "Missing title" });
  try {
    const url = `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=5&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&includes[]=cover_art`;
    const r = await fetch(url);
    const data = await r.json() as { data?: Array<{ attributes?: { tags?: any[]; altTitles?: any[] } }> };
    res.json(data);
  } catch {
    res.status(500).json({ error: "MangaDex fetch failed" });
  }
});

async function fetchGenresForTitle(title: string, category: string): Promise<string[]> {
  try {
    if (category === "anime") {
      const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1&sfw=true`;
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const json = await resp.json() as any;
      if (!json.data?.length) return [];
      return json.data[0].genres?.map((g: any) => g.name) || [];
    } else {
      const url = `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=1`;
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const json = await resp.json() as any;
      if (!json.data?.length) return [];
      const tags = json.data[0].attributes?.tags || [];
      return tags.map((t: any) => t.attributes?.name?.en).filter(Boolean);
    }
  } catch (err) {
    logger.warn({ err, title }, "Bulk genre fetch failed");
    return [];
  }
}

// POST /media/bulk-auto-genre
router.post("/media/bulk-auto-genre", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const library = await db.select().from(mediaTable).where(eq(mediaTable.userId, userId));
  const toUpdate = library.filter((m) => !m.genres || m.genres.length === 0);

  let updatedCount = 0;

  for (const item of toUpdate) {
    const fetchedGenres = await fetchGenresForTitle(item.title, item.category);
    if (fetchedGenres.length > 0) {
      await db.update(mediaTable)
        .set({ genres: fetchedGenres })
        .where(eq(mediaTable.id, item.id));
      updatedCount++;
    }
    await sleep(600);
  }

  res.json({ updated: updatedCount, totalChecked: toUpdate.length });
});

// GET /media/proxy/image
router.get("/media/proxy/image", async (req, res) => {
  const { url } = req.query as { url: string };
  if (!url) return res.status(400).json({ error: "Missing url" });
  try {
    const r = await fetch(decodeURIComponent(url), {
      headers: { "Referer": "https://mangadex.org" }
    });
    if (!r.ok) return res.status(404).send("Not found");
    const contentType = r.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buffer = await r.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).json({ error: "Image proxy failed" });
  }
});

// PUT /media/:id/top-favorite
router.put("/media/:id/top-favorite", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const mediaId = parseInt(req.params.id);
  const { rank } = req.body as { rank: number | null }; // 1, 2, 3, or null to unset

  if (rank !== null) {
    // clear any existing item holding that rank
    await db.update(mediaTable).set({ topFavoriteRank: null })
      .where(and(eq(mediaTable.userId, userId), eq(mediaTable.topFavoriteRank, rank)));
  }
  const [updated] = await db.update(mediaTable).set({ topFavoriteRank: rank })
    .where(and(eq(mediaTable.id, mediaId), eq(mediaTable.userId, userId))).returning();
  if (!updated) { res.status(404).json({ error: "Media not found" }); return; }
  res.json(serializeMedia(updated));
});

export default router;
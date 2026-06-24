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

function requireAuth(req: any, res: any): string | null {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

function serializeMedia(row: typeof mediaTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    category: row.category as "webtoon" | "manhwa" | "manhua" | "manga" | "anime",
    listType: row.listType as "library" | "to_read" | "avoid" | "bl",
    status: row.status as "reading" | "watching" | "completed" | "paused" | "dropped" | "plan_to_read" | null,
    coverUrl: row.coverUrl ?? null,
    customCoverUrl: row.customCoverUrl ?? null,
    tier: row.tier as "S" | "A" | "B" | "C" | "D" | "F" | null,
    rating: row.rating ?? null,
    reviewText: row.reviewText ?? null,
    genres: row.genres ?? [],
    notes: row.notes ?? null,
    hasUpdate: row.hasUpdate,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    currentChapter: row.currentChapter ?? null,
    totalChapters: row.totalChapters ?? null,
    addedBy: row.addedBy ?? null,
    readingUrl: row.readingUrl ?? null,
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
    if (m.status === 'completed') {
      completedByCategory[m.category] = (completedByCategory[m.category] || 0) + 1;
    }
  });

  res.json({
    totalByCategory,
    completedByCategory,
    toReadCount: all.filter(m => m.listType === 'to_read').length,
    avoidCount: all.filter(m => m.listType === 'avoid').length
  });
});

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
      : ["manhwa", "manga", "webtoon", "anime"];

    for (const cat of categoriesToFetch) {
      if (cat === "anime") {
        // Jikan top anime
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
        // MangaDex — map category to content type
        const typeMap: Record<string, string> = {
          manga: "manga", manhwa: "manhwa", manhua: "manhua", webtoon: "manhwa",
        };
        const mdType = typeMap[cat] ?? "manga";
        const url = `https://api.mangadex.org/manga?limit=20&order[followedCount]=desc&originalLanguage[]=${mdType === "manhwa" ? "ko" : mdType === "manhua" ? "zh" : "ja"}&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const json = await resp.json() as any;
        for (const item of json.data ?? []) {
          const title = item.attributes?.title?.en ?? Object.values(item.attributes?.title ?? {})[0] ?? "";
          if (!title || libraryTitles.has((title as string).toLowerCase())) continue;
          const coverRel = item.relationships?.find((r: any) =>

// Helper to delay requests to prevent API rate-limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    genres: [],
    notes: data.notes ?? null,
    addedBy: data.addedBy ?? null,
    userId: userId,
    readingUrl: data.readingUrl ?? null,
  }).returning();

  res.status(201).json(serializeMedia(row));
});

// PUT /media/:id
router.put("/media/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const mediaId = parseInt(req.params.id); // Ensure ID is parsed
  if (isNaN(mediaId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateMediaBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const data = parsed.data;
  // Find your PATCH /media/:id route and update the .set block:
  const [updated] = await db.update(mediaTable)
    .set({
      title: data.title,
      category: data.category,
      status: data.status,
      listType: data.listType,
      notes: data.notes ?? null,
      coverUrl: data.coverUrl ?? null,
      readingUrl: data.readingUrl ?? null,
      genres: data.genres ?? undefined,
      reviewText: req.body.reviewText ?? null,
      rating: req.body.rating ?? null,         
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
    // Return first result — MangaDex already fuzzy matches
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

  // Get all items that don't have genres set yet
  const library = await db.select().from(mediaTable).where(eq(mediaTable.userId, userId));
  const toUpdate = library.filter((m) => !m.genres || m.genres.length === 0);

  let updatedCount = 0;

  // Process sequentially to respect external API rate limits (Jikan allows 3 req/sec)
  for (const item of toUpdate) {
    const fetchedGenres = await fetchGenresForTitle(item.title, item.category);
    if (fetchedGenres.length > 0) {
      await db.update(mediaTable)
        .set({ genres: fetchedGenres })
        .where(eq(mediaTable.id, item.id));
      updatedCount++;
    }
    // Sleep 600ms between items so we only make ~1.5 requests per second
    await sleep(600); 
  }

  res.json({ updated: updatedCount, totalChecked: toUpdate.length });
});

export default router;
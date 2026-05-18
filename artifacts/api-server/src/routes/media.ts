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
    category: row.category as "webtoon" | "manhwa" | "manga" | "anime",
    listType: row.listType as "library" | "to_read" | "avoid" | "bl",
    status: row.status as "reading" | "watching" | "completed" | "paused" | "dropped" | "plan_to_read" | null,
    coverUrl: row.coverUrl ?? null,
    customCoverUrl: row.customCoverUrl ?? null,
    tier: row.tier as "S" | "A" | "B" | "C" | "D" | "F" | null,
    rating: row.rating ?? null,
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
    genres: data.genres ?? [],
    notes: data.notes ?? null,
    currentChapter: data.currentChapter ?? null,
    addedBy: data.addedBy ?? null,
    readingUrl: data.readingUrl ?? null,
    userId,
  }).returning();

  res.status(201).json(GetMediaResponse.parse(serializeMedia(row)));
});

// GET /media/stats
router.get("/media/stats", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rows = await db.select().from(mediaTable).where(eq(mediaTable.userId, userId));

  const totalByCategory: Record<string, number> = { webtoon: 0, manhwa: 0, manga: 0, anime: 0 };
  const completedByCategory: Record<string, number> = { webtoon: 0, manhwa: 0, manga: 0, anime: 0 };
  const tierDistribution: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
  let toReadCount = 0, avoidCount = 0, updatesAvailable = 0;

  for (const row of rows) {
    if (row.listType === "library") {
      totalByCategory[row.category] = (totalByCategory[row.category] ?? 0) + 1;
      if (row.status === "completed") completedByCategory[row.category] = (completedByCategory[row.category] ?? 0) + 1;
      if (row.tier) tierDistribution[row.tier] = (tierDistribution[row.tier] ?? 0) + 1;
    }
    if (row.listType === "to_read") toReadCount++;
    if (row.listType === "avoid") avoidCount++;
    if (row.hasUpdate) updatesAvailable++;
  }

  res.json(GetMediaStatsResponse.parse({ totalByCategory, completedByCategory, tierDistribution, toReadCount, avoidCount, updatesAvailable }));
});

// GET /media/recommendations
router.get("/media/recommendations", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = GetRecommendationsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { category } = parsed.data;
  const libraryRows = await db.select().from(mediaTable)
    .where(and(eq(mediaTable.listType, "library"), eq(mediaTable.userId, userId)));
  const userTitles = new Set(libraryRows.map((r) => r.title.toLowerCase()));
  const avoidRows = await db.select({ title: mediaTable.title }).from(mediaTable)
    .where(and(eq(mediaTable.listType, "avoid"), eq(mediaTable.userId, userId)));
  const avoidSet = new Set(avoidRows.map((r) => r.title.toLowerCase()));

  const recommendations: Array<{
    title: string; category: string; coverUrl: string | null;
    genres: string[]; score: number | null; synopsis: string | null; source: string | null;
  }> = [];

  const targetCategories = category ? [category] : ["anime", "manga", "manhwa", "webtoon"];

  for (const cat of targetCategories) {
    if (cat === "anime") {
      try {
        const resp = await fetch(`https://api.jikan.moe/v4/anime?genres=1&order_by=score&sort=desc&limit=6&sfw=true`);
        if (resp.ok) {
          const json = await resp.json() as { data?: Array<{ title: string; images?: { jpg?: { image_url?: string } }; genres?: Array<{ name: string }>; score?: number; synopsis?: string }> };
          for (const item of json.data ?? []) {
            if (!userTitles.has(item.title?.toLowerCase()) && !avoidSet.has(item.title?.toLowerCase())) {
              recommendations.push({ title: item.title ?? "", category: "anime", coverUrl: item.images?.jpg?.image_url ?? null, genres: (item.genres ?? []).map((g) => g.name), score: item.score ?? null, synopsis: item.synopsis ?? null, source: "MyAnimeList" });
            }
          }
        }
      } catch (err) { logger.warn({ err }, "Failed to fetch anime recommendations"); }
    }
    if (cat === "manga") {
      try {
        const resp = await fetch(`https://api.jikan.moe/v4/manga?order_by=score&sort=desc&limit=6&sfw=true`);
        if (resp.ok) {
          const json = await resp.json() as { data?: Array<{ title: string; images?: { jpg?: { image_url?: string } }; genres?: Array<{ name: string }>; score?: number; synopsis?: string }> };
          for (const item of json.data ?? []) {
            if (!userTitles.has(item.title?.toLowerCase()) && !avoidSet.has(item.title?.toLowerCase())) {
              recommendations.push({ title: item.title ?? "", category: "manga", coverUrl: item.images?.jpg?.image_url ?? null, genres: (item.genres ?? []).map((g) => g.name), score: item.score ?? null, synopsis: item.synopsis ?? null, source: "MyAnimeList" });
            }
          }
        }
      } catch (err) { logger.warn({ err }, "Failed to fetch manga recommendations"); }
    }
    if (cat === "manhwa" || cat === "webtoon") {
      try {
        const resp = await fetch(`https://api.mangadex.org/manga?originalLanguage[]=ko&order[rating]=desc&limit=6&contentRating[]=safe&includes[]=cover_art`);
        if (resp.ok) {
          const json = await resp.json() as { data?: Array<{ id: string; attributes?: { title?: Record<string, string>; description?: Record<string, string>; tags?: Array<{ attributes?: { name?: Record<string, string> } }> }; relationships?: Array<{ type: string; attributes?: { fileName?: string } }> }> };
          for (const item of json.data ?? []) {
            const title = item.attributes?.title?.en ?? Object.values(item.attributes?.title ?? {})[0] ?? "Unknown";
            const coverRel = item.relationships?.find((r) => r.type === "cover_art");
            const coverUrl = coverRel?.attributes?.fileName ? `https://uploads.mangadex.org/covers/${item.id}/${coverRel.attributes.fileName}.256.jpg` : null;
            const genres = (item.attributes?.tags ?? []).map((t) => t.attributes?.name?.en ?? "").filter(Boolean);
            const synopsis = item.attributes?.description?.en ?? Object.values(item.attributes?.description ?? {})[0] ?? null;
            if (!userTitles.has(title.toLowerCase()) && !avoidSet.has(title.toLowerCase())) {
              recommendations.push({ title, category: cat, coverUrl, genres, score: null, synopsis: synopsis ?? null, source: "MangaDex" });
            }
          }
        }
      } catch (err) { logger.warn({ err }, "Failed to fetch manhwa/webtoon recommendations"); }
    }
  }

  res.json(recommendations.slice(0, 20).map((r) => GetRecommendationsResponseItem.parse(r)));
});

// GET /media/updates
router.get("/media/updates", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rows = await db.select().from(mediaTable)
    .where(and(eq(mediaTable.hasUpdate, true), eq(mediaTable.userId, userId)));
  res.json(rows.map((r) => GetMediaUpdatesResponseItem.parse(serializeMedia(r))));
});

// GET /media/cover-search
router.get("/media/cover-search", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = SearchCoverQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { title, category } = parsed.data;
  const results: Array<{ title: string; coverUrl: string; source: string | null; score: number | null }> = [];

  try {
    if (category === "anime") {
      const resp = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=8&sfw=true`);
      if (resp.ok) {
        const json = await resp.json() as { data?: Array<{ title: string; images?: { jpg?: { image_url?: string; large_image_url?: string } }; score?: number }> };
        for (const item of json.data ?? []) {
          const coverUrl = item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url;
          if (coverUrl) results.push({ title: item.title ?? "", coverUrl, source: "MyAnimeList", score: item.score ?? null });
        }
      }
    } else if (category === "manga") {
      const resp = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=8&sfw=true`);
      if (resp.ok) {
        const json = await resp.json() as { data?: Array<{ title: string; images?: { jpg?: { image_url?: string; large_image_url?: string } }; score?: number }> };
        for (const item of json.data ?? []) {
          const coverUrl = item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url;
          if (coverUrl) results.push({ title: item.title ?? "", coverUrl, source: "MyAnimeList", score: item.score ?? null });
        }
      }
    } else {
      const resp = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=8&sfw=false`);
      if (resp.ok) {
        const json = await resp.json() as { data?: Array<{ title: string; images?: { jpg?: { image_url?: string; large_image_url?: string } }; score?: number }> };
        for (const item of json.data ?? []) {
          const coverUrl = item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url;
          if (coverUrl) results.push({ title: item.title ?? "", coverUrl: coverUrl.replace("myanimelist.net", "cdn.myanimelist.net"), source: "MyAnimeList", score: item.score ?? null });
        }
      }
    }
  } catch (err) { logger.warn({ err, title, category }, "Cover search failed"); }

  res.json(results.map((r) => SearchCoverResponseItem.parse(r)));
});

// GET /media/proxy-cover
router.get("/media/proxy-cover", async (req, res): Promise<void> => {
  const url = req.query.url as string | undefined;
  if (!url) { res.status(400).json({ error: "url query param required" }); return; }
  try {
    const upstream = await fetch(url, { headers: { Referer: "https://mangadex.org/", "User-Agent": "Mozilla/5.0 (compatible; OtakuVault/1.0)" } });
    if (!upstream.ok) { res.status(upstream.status).send(); return; }
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) { logger.warn({ err, url }, "proxy-cover failed"); res.status(502).send(); }
});

// GET /media/:id
router.get("/media/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const params = GetMediaParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(mediaTable)
    .where(and(eq(mediaTable.id, params.data.id), eq(mediaTable.userId, userId)));
  if (!row) { res.status(404).json({ error: "Media not found" }); return; }
  res.json(GetMediaResponse.parse(serializeMedia(row)));
});

// PUT /media/:id
router.put("/media/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const params = UpdateMediaParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateMediaBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Partial<typeof mediaTable.$inferInsert> = {};
  const data = parsed.data;
  if (data.title !== undefined) updates.title = data.title;
  if ((data as any).category !== undefined) updates.category = (data as any).category;
  if (data.status !== undefined) updates.status = data.status ?? null;
  if (data.coverUrl !== undefined) updates.coverUrl = data.coverUrl ?? null;
  if (data.customCoverUrl !== undefined) updates.customCoverUrl = data.customCoverUrl ?? null;
  if (data.tier !== undefined) updates.tier = data.tier ?? null;
  if (data.rating !== undefined) updates.rating = data.rating ?? null;
  if (data.genres !== undefined) updates.genres = data.genres;
  if (data.notes !== undefined) updates.notes = data.notes ?? null;
  if (data.currentChapter !== undefined) updates.currentChapter = data.currentChapter ?? null;
  if (data.totalChapters !== undefined) updates.totalChapters = data.totalChapters ?? null;
  if (data.listType !== undefined) updates.listType = data.listType;
  if (data.addedBy !== undefined) updates.addedBy = data.addedBy ?? null;
  if (data.readingUrl !== undefined) updates.readingUrl = data.readingUrl ?? null;

  const [row] = await db.update(mediaTable).set(updates)
    .where(and(eq(mediaTable.id, params.data.id), eq(mediaTable.userId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Media not found" }); return; }
  res.json(GetMediaResponse.parse(serializeMedia(row)));
});

// DELETE /media/:id
router.delete("/media/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const params = DeleteMediaParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(mediaTable)
    .where(and(eq(mediaTable.id, params.data.id), eq(mediaTable.userId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Media not found" }); return; }
  res.sendStatus(204);
});

// PUT /media/:id/tier
router.put("/media/:id/tier", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const params = UpdateMediaTierParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateMediaTierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(mediaTable).set({ tier: parsed.data.tier ?? null })
    .where(and(eq(mediaTable.id, params.data.id), eq(mediaTable.userId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Media not found" }); return; }
  res.json(GetMediaResponse.parse(serializeMedia(row)));
});

// POST /media/:id/check-update
router.post("/media/:id/check-update", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const params = CheckMediaUpdateParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(mediaTable)
    .where(and(eq(mediaTable.id, params.data.id), eq(mediaTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Media not found" }); return; }

  const checkedAt = new Date();
  let latestChapter: string | null = null;

  if (existing.category === "anime") {
    latestChapter = await getLatestEpisodeFromJikan(existing.title);
  } else {
    latestChapter = await getLatestChapterFromMangaDex(existing.title);
  }

  let hasUpdate = false;
  if (latestChapter && existing.currentChapter) {
    const latestNum = parseFloat(latestChapter.replace(/[^\d.]/g, "") || "0");
    const currentNum = parseFloat(existing.currentChapter.replace(/[^\d.]/g, "") || "0");
    hasUpdate = latestNum > currentNum;
  } else if (latestChapter && !existing.currentChapter) {
    hasUpdate = true;
  }

  await db.update(mediaTable).set({ hasUpdate, lastCheckedAt: checkedAt })
    .where(and(eq(mediaTable.id, params.data.id), eq(mediaTable.userId, userId)));

  res.json(CheckMediaUpdateResponse.parse({ hasUpdate, latestChapter, checkedAt: checkedAt.toISOString() }));
});

export default router;
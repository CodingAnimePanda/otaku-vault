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
      reviewText: req.body.reviewText ?? null, // Ensure these lines use commas, not semicolons
      rating: req.body.rating ?? null,         
    })
    .where(and(eq(mediaTable.id, mediaId), eq(mediaTable.userId, userId)))
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

export default router;
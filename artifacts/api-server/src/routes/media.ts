import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, mediaTable } from "@workspace/db";
import {
  ListMediaQueryParams,
  CreateMediaBody,
  UpdateMediaBody,
  UpdateMediaTierBody,
  GetMediaParams,
  UpdateMediaParams,
  DeleteMediaParams,
  UpdateMediaTierParams,
  CheckMediaUpdateParams,
  SearchCoverQueryParams,
  GetRecommendationsQueryParams,
  ListMediaResponseItem,
  GetMediaResponse,
  GetMediaStatsResponse,
  GetRecommendationsResponseItem,
  GetMediaUpdatesResponseItem,
  SearchCoverResponseItem,
  CheckMediaUpdateResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Helper: serialize a DB row to the API shape
function serializeMedia(row: typeof mediaTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    category: row.category as "webtoon" | "manhwa" | "manga" | "anime",
    listType: row.listType as "library" | "to_read" | "avoid",
    status: row.status as
      | "reading"
      | "watching"
      | "completed"
      | "paused"
      | "dropped"
      | "plan_to_read"
      | null,
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /media
router.get("/media", async (req, res): Promise<void> => {
  const parsed = ListMediaQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, listType, status } = parsed.data;
  const conditions = [];
  if (category) conditions.push(eq(mediaTable.category, category));
  if (listType) conditions.push(eq(mediaTable.listType, listType));
  if (status) conditions.push(eq(mediaTable.status, status));

  const rows = await db
    .select()
    .from(mediaTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(mediaTable.createdAt);

  const items = rows.map(serializeMedia).map((item) =>
    ListMediaResponseItem.parse(item)
  );
  res.json(items);
});

// POST /media
router.post("/media", async (req, res): Promise<void> => {
  const parsed = CreateMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [row] = await db
    .insert(mediaTable)
    .values({
      title: data.title,
      category: data.category,
      listType: data.listType,
      status: data.status ?? null,
      coverUrl: data.coverUrl ?? null,
      genres: data.genres ?? [],
      notes: data.notes ?? null,
      currentChapter: data.currentChapter ?? null,
      addedBy: data.addedBy ?? null,
    })
    .returning();

  res.status(201).json(GetMediaResponse.parse(serializeMedia(row)));
});

// GET /media/stats
router.get("/media/stats", async (_req, res): Promise<void> => {
  const rows = await db.select().from(mediaTable);

  const totalByCategory: Record<string, number> = {
    webtoon: 0,
    manhwa: 0,
    manga: 0,
    anime: 0,
  };
  const completedByCategory: Record<string, number> = {
    webtoon: 0,
    manhwa: 0,
    manga: 0,
    anime: 0,
  };
  const tierDistribution: Record<string, number> = {
    S: 0,
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
  };
  let toReadCount = 0;
  let avoidCount = 0;
  let updatesAvailable = 0;

  for (const row of rows) {
    if (row.listType === "library") {
      totalByCategory[row.category] = (totalByCategory[row.category] ?? 0) + 1;
      if (row.status === "completed") {
        completedByCategory[row.category] =
          (completedByCategory[row.category] ?? 0) + 1;
      }
      if (row.tier) {
        tierDistribution[row.tier] = (tierDistribution[row.tier] ?? 0) + 1;
      }
    }
    if (row.listType === "to_read") toReadCount++;
    if (row.listType === "avoid") avoidCount++;
    if (row.hasUpdate) updatesAvailable++;
  }

  res.json(
    GetMediaStatsResponse.parse({
      totalByCategory,
      completedByCategory,
      tierDistribution,
      toReadCount,
      avoidCount,
      updatesAvailable,
    })
  );
});

// GET /media/recommendations
router.get("/media/recommendations", async (req, res): Promise<void> => {
  const parsed = GetRecommendationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category } = parsed.data;

  // Get user's library to base recommendations on genres
  const libraryRows = await db
    .select()
    .from(mediaTable)
    .where(eq(mediaTable.listType, "library"));

  const userTitles = new Set(libraryRows.map((r) => r.title.toLowerCase()));
  const avoidTitles = await db
    .select({ title: mediaTable.title })
    .from(mediaTable)
    .where(eq(mediaTable.listType, "avoid"));
  const avoidSet = new Set(avoidTitles.map((r) => r.title.toLowerCase()));

  // Find most common genres
  const genreCounts: Record<string, number> = {};
  for (const row of libraryRows) {
    for (const g of row.genres) {
      genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    }
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  // Fetch from Jikan for anime/manga, MangaDex for webtoon/manhwa
  const recommendations: Array<{
    title: string;
    category: string;
    coverUrl: string | null;
    genres: string[];
    score: number | null;
    synopsis: string | null;
    source: string | null;
  }> = [];

  const targetCategories = category ? [category] : ["anime", "manga", "manhwa", "webtoon"];

  for (const cat of targetCategories) {
    if (cat === "anime") {
      try {
        const genre = topGenres[0] ?? "action";
        const url = `https://api.jikan.moe/v4/anime?genres=1&order_by=score&sort=desc&limit=6&sfw=true`;
        const resp = await fetch(url);
        if (resp.ok) {
          const json = await resp.json() as { data?: Array<{
            title: string;
            images?: { jpg?: { image_url?: string } };
            genres?: Array<{ name: string }>;
            score?: number;
            synopsis?: string;
          }> };
          for (const item of json.data ?? []) {
            if (!userTitles.has(item.title?.toLowerCase()) && !avoidSet.has(item.title?.toLowerCase())) {
              recommendations.push({
                title: item.title ?? "",
                category: "anime",
                coverUrl: item.images?.jpg?.image_url ?? null,
                genres: (item.genres ?? []).map((g) => g.name),
                score: item.score ?? null,
                synopsis: item.synopsis ?? null,
                source: "MyAnimeList",
              });
            }
          }
        }
      } catch (err) {
        logger.warn({ err }, "Failed to fetch anime recommendations");
      }
    }

    if (cat === "manga") {
      try {
        const url = `https://api.jikan.moe/v4/manga?order_by=score&sort=desc&limit=6&sfw=true`;
        const resp = await fetch(url);
        if (resp.ok) {
          const json = await resp.json() as { data?: Array<{
            title: string;
            images?: { jpg?: { image_url?: string } };
            genres?: Array<{ name: string }>;
            score?: number;
            synopsis?: string;
          }> };
          for (const item of json.data ?? []) {
            if (!userTitles.has(item.title?.toLowerCase()) && !avoidSet.has(item.title?.toLowerCase())) {
              recommendations.push({
                title: item.title ?? "",
                category: "manga",
                coverUrl: item.images?.jpg?.image_url ?? null,
                genres: (item.genres ?? []).map((g) => g.name),
                score: item.score ?? null,
                synopsis: item.synopsis ?? null,
                source: "MyAnimeList",
              });
            }
          }
        }
      } catch (err) {
        logger.warn({ err }, "Failed to fetch manga recommendations");
      }
    }

    if (cat === "manhwa" || cat === "webtoon") {
      try {
        const url = `https://api.mangadex.org/manga?originalLanguage[]=ko&order[rating]=desc&limit=6&contentRating[]=safe&includes[]=cover_art`;
        const resp = await fetch(url);
        if (resp.ok) {
          const json = await resp.json() as {
            data?: Array<{
              id: string;
              attributes?: {
                title?: Record<string, string>;
                description?: Record<string, string>;
                tags?: Array<{ attributes?: { name?: Record<string, string> } }>;
              };
              relationships?: Array<{
                type: string;
                attributes?: { fileName?: string };
              }>;
            }>;
          };
          for (const item of json.data ?? []) {
            const title =
              item.attributes?.title?.en ??
              Object.values(item.attributes?.title ?? {})[0] ??
              "Unknown";
            const coverRel = item.relationships?.find(
              (r) => r.type === "cover_art"
            );
            const coverUrl = coverRel?.attributes?.fileName
              ? `https://uploads.mangadex.org/covers/${item.id}/${coverRel.attributes.fileName}.256.jpg`
              : null;
            const genres = (item.attributes?.tags ?? [])
              .map((t) => t.attributes?.name?.en ?? "")
              .filter(Boolean);
            const synopsis =
              item.attributes?.description?.en ??
              Object.values(item.attributes?.description ?? {})[0] ??
              null;

            if (!userTitles.has(title.toLowerCase()) && !avoidSet.has(title.toLowerCase())) {
              recommendations.push({
                title,
                category: cat,
                coverUrl,
                genres,
                score: null,
                synopsis: synopsis ?? null,
                source: "MangaDex",
              });
            }
          }
        }
      } catch (err) {
        logger.warn({ err }, "Failed to fetch manhwa/webtoon recommendations");
      }
    }
  }

  res.json(
    recommendations
      .slice(0, 20)
      .map((r) => GetRecommendationsResponseItem.parse(r))
  );
});

// GET /media/updates
router.get("/media/updates", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(mediaTable)
    .where(eq(mediaTable.hasUpdate, true));

  res.json(rows.map((r) => GetMediaUpdatesResponseItem.parse(serializeMedia(r))));
});

// GET /media/cover-search
router.get("/media/cover-search", async (req, res): Promise<void> => {
  const parsed = SearchCoverQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, category } = parsed.data;
  const results: Array<{ title: string; coverUrl: string; source: string | null; score: number | null }> = [];

  try {
    if (category === "anime") {
      const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=8&sfw=true`;
      const resp = await fetch(url);
      if (resp.ok) {
        const json = await resp.json() as { data?: Array<{
          title: string;
          images?: { jpg?: { image_url?: string; large_image_url?: string } };
          score?: number;
        }> };
        for (const item of json.data ?? []) {
          const coverUrl =
            item.images?.jpg?.large_image_url ??
            item.images?.jpg?.image_url;
          if (coverUrl) {
            results.push({
              title: item.title ?? "",
              coverUrl,
              source: "MyAnimeList",
              score: item.score ?? null,
            });
          }
        }
      }
    } else if (category === "manga") {
      const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=8&sfw=true`;
      const resp = await fetch(url);
      if (resp.ok) {
        const json = await resp.json() as { data?: Array<{
          title: string;
          images?: { jpg?: { image_url?: string; large_image_url?: string } };
          score?: number;
        }> };
        for (const item of json.data ?? []) {
          const coverUrl =
            item.images?.jpg?.large_image_url ??
            item.images?.jpg?.image_url;
          if (coverUrl) {
            results.push({
              title: item.title ?? "",
              coverUrl,
              source: "MyAnimeList",
              score: item.score ?? null,
            });
          }
        }
      }
    } else {
      // manhwa or webtoon — use MangaDex
      const url = `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=8&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art`;
      const resp = await fetch(url);
      if (resp.ok) {
        const json = await resp.json() as {
          data?: Array<{
            id: string;
            attributes?: { title?: Record<string, string> };
            relationships?: Array<{
              type: string;
              attributes?: { fileName?: string };
            }>;
          }>;
        };
        for (const item of json.data ?? []) {
          const itemTitle =
            item.attributes?.title?.en ??
            Object.values(item.attributes?.title ?? {})[0] ??
            "";
          const coverRel = item.relationships?.find(
            (r) => r.type === "cover_art"
          );
          const coverUrl = coverRel?.attributes?.fileName
            ? `https://uploads.mangadex.org/covers/${item.id}/${coverRel.attributes.fileName}.256.jpg`
            : null;
          if (coverUrl) {
            results.push({
              title: itemTitle,
              coverUrl,
              source: "MangaDex",
              score: null,
            });
          }
        }
      }
    }
  } catch (err) {
    logger.warn({ err, title, category }, "Cover search failed");
  }

  res.json(results.map((r) => SearchCoverResponseItem.parse(r)));
});

// GET /media/:id
router.get("/media/:id", async (req, res): Promise<void> => {
  const params = GetMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(mediaTable)
    .where(eq(mediaTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Media not found" });
    return;
  }

  res.json(GetMediaResponse.parse(serializeMedia(row)));
});

// PUT /media/:id
router.put("/media/:id", async (req, res): Promise<void> => {
  const params = UpdateMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof mediaTable.$inferInsert> = {};
  const data = parsed.data;

  if (data.title !== undefined) updates.title = data.title;
  if (data.status !== undefined) updates.status = data.status ?? null;
  if (data.coverUrl !== undefined) updates.coverUrl = data.coverUrl ?? null;
  if (data.customCoverUrl !== undefined)
    updates.customCoverUrl = data.customCoverUrl ?? null;
  if (data.tier !== undefined) updates.tier = data.tier ?? null;
  if (data.rating !== undefined) updates.rating = data.rating ?? null;
  if (data.genres !== undefined) updates.genres = data.genres;
  if (data.notes !== undefined) updates.notes = data.notes ?? null;
  if (data.currentChapter !== undefined)
    updates.currentChapter = data.currentChapter ?? null;
  if (data.totalChapters !== undefined)
    updates.totalChapters = data.totalChapters ?? null;
  if (data.listType !== undefined) updates.listType = data.listType;
  if (data.addedBy !== undefined) updates.addedBy = data.addedBy ?? null;

  const [row] = await db
    .update(mediaTable)
    .set(updates)
    .where(eq(mediaTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Media not found" });
    return;
  }

  res.json(GetMediaResponse.parse(serializeMedia(row)));
});

// DELETE /media/:id
router.delete("/media/:id", async (req, res): Promise<void> => {
  const params = DeleteMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(mediaTable)
    .where(eq(mediaTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Media not found" });
    return;
  }

  res.sendStatus(204);
});

// PUT /media/:id/tier
router.put("/media/:id/tier", async (req, res): Promise<void> => {
  const params = UpdateMediaTierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMediaTierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(mediaTable)
    .set({ tier: parsed.data.tier ?? null })
    .where(eq(mediaTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Media not found" });
    return;
  }

  res.json(GetMediaResponse.parse(serializeMedia(row)));
});

// POST /media/:id/check-update
router.post("/media/:id/check-update", async (req, res): Promise<void> => {
  const params = CheckMediaUpdateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(mediaTable)
    .where(eq(mediaTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Media not found" });
    return;
  }

  // Simulate update check — in a real app this would call an external API
  // For now, randomly mark some as having updates to demonstrate functionality
  const checkedAt = new Date();
  const hasUpdate = Math.random() > 0.6;

  const [updated] = await db
    .update(mediaTable)
    .set({
      hasUpdate,
      lastCheckedAt: checkedAt,
    })
    .where(eq(mediaTable.id, params.data.id))
    .returning();

  const latestChapter = updated?.currentChapter
    ? `Chapter ${parseInt(updated.currentChapter.replace(/\D/g, "") || "0", 10) + (hasUpdate ? 1 : 0)}`
    : null;

  res.json(
    CheckMediaUpdateResponse.parse({
      hasUpdate,
      latestChapter,
      checkedAt: checkedAt.toISOString(),
    })
  );
});

export default router;

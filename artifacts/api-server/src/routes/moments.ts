// artifacts/api-server/src/routes/moments.ts
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, momentsTable } from "@workspace/db";

const router: IRouter = Router();

function requireAuth(req: any, res: any): string | null {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

// GET /moments
router.get("/moments", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rows = await db.select().from(momentsTable)
    .where(eq(momentsTable.userId, userId))
    .orderBy(momentsTable.createdAt);
  res.json(rows.reverse());
});

// POST /moments
router.post("/moments", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { title, scene, category, notes, images, chapter, page, readingUrl } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [row] = await db.insert(momentsTable).values({
    userId,
    title,
    scene: scene ?? "",
    category: category ?? "other",
    notes: notes ?? "",
    images: images ?? [],
    chapter: chapter ?? "",
    page: page ?? "",
    readingUrl: readingUrl ?? "",
  }).returning();
  res.status(201).json(row);
});

// DELETE /moments/:id
router.delete("/moments/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [deleted] = await db.delete(momentsTable)
    .where(and(eq(momentsTable.id, id), eq(momentsTable.userId, userId)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, favoriteCharactersTable } from "@workspace/db";

const router: IRouter = Router();

function requireAuth(req: any, res: any): string | null {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

// GET /favorite-characters
router.get("/favorite-characters", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const rows = await db.select().from(favoriteCharactersTable)
    .where(eq(favoriteCharactersTable.userId, userId))
    .orderBy(asc(favoriteCharactersTable.sortOrder));
  res.json(rows);
});

// POST /favorite-characters
router.post("/favorite-characters", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const { name, imageUrl, mediaTitle, role, note } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [row] = await db.insert(favoriteCharactersTable).values({
    userId, name, imageUrl: imageUrl ?? null, mediaTitle: mediaTitle ?? "",
    role: role ?? "", note: note ?? "", sortOrder: Date.now(),
  }).returning();
  res.status(201).json(row);
});

// DELETE /favorite-characters/:id
router.delete("/favorite-characters/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id);
  const [deleted] = await db.delete(favoriteCharactersTable)
    .where(and(eq(favoriteCharactersTable.id, id), eq(favoriteCharactersTable.userId, userId))).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
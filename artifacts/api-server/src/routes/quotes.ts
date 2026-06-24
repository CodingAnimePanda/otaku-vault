// artifacts/api-server/src/routes/quotes.ts
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, quotesTable } from "@workspace/db";

const router: IRouter = Router();

function requireAuth(req: any, res: any): string | null {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

// GET /quotes
router.get("/quotes", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rows = await db.select().from(quotesTable)
    .where(eq(quotesTable.userId, userId))
    .orderBy(quotesTable.createdAt);
  res.json(rows.reverse());
});

// POST /quotes
router.post("/quotes", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { quote, character, mediaTitle, category, context, readingUrl } = req.body;
  if (!quote || !mediaTitle) { res.status(400).json({ error: "quote and mediaTitle required" }); return; }
  const [row] = await db.insert(quotesTable).values({
    userId,
    quote,
    character: character ?? "",
    mediaTitle,
    category: category ?? "other",
    context: context ?? "",
    readingUrl: readingUrl ?? "",
  }).returning();
  res.status(201).json(row);
});

// DELETE /quotes/:id
router.delete("/quotes/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [deleted] = await db.delete(quotesTable)
    .where(and(eq(quotesTable.id, id), eq(quotesTable.userId, userId)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
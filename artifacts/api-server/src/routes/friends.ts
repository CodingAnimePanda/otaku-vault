import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, friendshipsTable, recommendationsTable, mediaTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function requireAuth(req: any, res: any): string | null {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

// ─── User Profile ────────────────────────────────────────────────────────────

// POST /friends/profile — create or update your profile (called on first login)
router.post("/friends/profile", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { username, displayName, avatarUrl } = req.body;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "username is required" }); return;
  }

  // Check username not taken by someone else
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing && existing.clerkId !== userId) {
    res.status(409).json({ error: "Username already taken" }); return;
  }

  // Upsert
  const [existingProfile] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (existingProfile) {
    const [updated] = await db.update(usersTable)
      .set({ username, displayName: displayName ?? null, avatarUrl: avatarUrl ?? null })
      .where(eq(usersTable.clerkId, userId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(usersTable)
      .values({ clerkId: userId, username, displayName: displayName ?? null, avatarUrl: avatarUrl ?? null })
      .returning();
    res.status(201).json(created);
  }
});

// GET /friends/profile/me — get your own profile
// Replace your existing GET /friends/profile/me with this:
router.get("/friends/profile/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  
  const [profile] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  
  // Instead of 404, return 200 with null so the frontend can handle the "empty" state
  if (!profile) { 
    res.status(200).json(null); 
    return; 
  }
  res.json(profile);
});

// GET /friends/search?username=xxx — find a user to add
router.get("/friends/search", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const username = req.query.username as string | undefined;
  if (!username) { res.status(400).json({ error: "username query param required" }); return; }
  const [found] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!found) { res.status(404).json({ error: "User not found" }); return; }
  if (found.clerkId === userId) { res.status(400).json({ error: "That's you!" }); return; }
  res.json({ clerkId: found.clerkId, username: found.username, displayName: found.displayName, avatarUrl: found.avatarUrl });
});

// ─── Friend Requests ─────────────────────────────────────────────────────────

// POST /friends/request — send a friend request by username
router.post("/friends/request", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { username } = req.body;
  if (!username) { res.status(400).json({ error: "username is required" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.clerkId === userId) { res.status(400).json({ error: "You can't friend yourself" }); return; }

  // Check if a request already exists in either direction
  const [existing] = await db.select().from(friendshipsTable).where(
    or(
      and(eq(friendshipsTable.senderId, userId), eq(friendshipsTable.receiverId, target.clerkId)),
      and(eq(friendshipsTable.senderId, target.clerkId), eq(friendshipsTable.receiverId, userId))
    )
  );
  if (existing) {
    res.status(409).json({ error: existing.status === "accepted" ? "Already friends" : "Request already sent" }); return;
  }

  const [created] = await db.insert(friendshipsTable)
    .values({ senderId: userId, receiverId: target.clerkId, status: "pending" })
    .returning();
  res.status(201).json(created);
});

// GET /friends/requests — incoming pending requests
router.get("/friends/requests", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const pending = await db.select().from(friendshipsTable)
    .where(and(eq(friendshipsTable.receiverId, userId), eq(friendshipsTable.status, "pending")));

  // Enrich with sender profile
  const enriched = await Promise.all(pending.map(async (f) => {
    const [sender] = await db.select().from(usersTable).where(eq(usersTable.clerkId, f.senderId));
    return { ...f, sender: sender ?? null };
  }));

  res.json(enriched);
});

// POST /friends/requests/:id/accept
router.post("/friends/requests/:id/accept", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.update(friendshipsTable)
    .set({ status: "accepted" })
    .where(and(eq(friendshipsTable.id, id), eq(friendshipsTable.receiverId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Request not found" }); return; }
  res.json(row);
});

// POST /friends/requests/:id/reject
router.post("/friends/requests/:id/reject", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.delete(friendshipsTable)
    .where(and(eq(friendshipsTable.id, id), eq(friendshipsTable.receiverId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Request not found" }); return; }
  res.sendStatus(204);
});

// GET /friends — your accepted friends list
router.get("/friends", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rows = await db.select().from(friendshipsTable).where(
    and(
      eq(friendshipsTable.status, "accepted"),
      or(eq(friendshipsTable.senderId, userId), eq(friendshipsTable.receiverId, userId))
    )
  );

  const enriched = await Promise.all(rows.map(async (f) => {
    const friendId = f.senderId === userId ? f.receiverId : f.senderId;
    const [profile] = await db.select().from(usersTable).where(eq(usersTable.clerkId, friendId));
    return { friendshipId: f.id, friend: profile ?? null };
  }));

  res.json(enriched);
});

// DELETE /friends/:friendshipId — unfriend
router.delete("/friends/:friendshipId", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseInt(req.params.friendshipId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.delete(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.id, id),
        or(eq(friendshipsTable.senderId, userId), eq(friendshipsTable.receiverId, userId))
      )
    )
    .returning();
  if (!row) { res.status(404).json({ error: "Friendship not found" }); return; }
  res.sendStatus(204);
});

// ─── Friend's Library ─────────────────────────────────────────────────────────

// GET /friends/:friendClerkId/library — browse a friend's library
router.get("/friends/:friendClerkId/library", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { friendClerkId } = req.params;

  // Verify they are actually friends
  const [friendship] = await db.select().from(friendshipsTable).where(
    and(
      eq(friendshipsTable.status, "accepted"),
      or(
        and(eq(friendshipsTable.senderId, userId), eq(friendshipsTable.receiverId, friendClerkId)),
        and(eq(friendshipsTable.senderId, friendClerkId), eq(friendshipsTable.receiverId, userId))
      )
    )
  );
  if (!friendship) { res.status(403).json({ error: "Not friends with this user" }); return; }

  const rows = await db.select().from(mediaTable)
    .where(and(eq(mediaTable.userId, friendClerkId), eq(mediaTable.listType, "library")))
    .orderBy(mediaTable.createdAt);

  res.json(rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    coverUrl: row.coverUrl ?? null,
    tier: row.tier ?? null,
    genres: row.genres ?? [],
    currentChapter: row.currentChapter ?? null,
    readingUrl: row.readingUrl ?? null,
  })));
});

// ─── Recommendations ──────────────────────────────────────────────────────────

// POST /friends/recommendations — send a rec to a friend
router.post("/friends/recommendations", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { toUsername, title, category, coverUrl, readingUrl, message } = req.body;
  if (!toUsername || !title) { res.status(400).json({ error: "toUsername and title are required" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.username, toUsername));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  // Must be friends
  const [friendship] = await db.select().from(friendshipsTable).where(
    and(
      eq(friendshipsTable.status, "accepted"),
      or(
        and(eq(friendshipsTable.senderId, userId), eq(friendshipsTable.receiverId, target.clerkId)),
        and(eq(friendshipsTable.senderId, target.clerkId), eq(friendshipsTable.receiverId, userId))
      )
    )
  );
  if (!friendship) { res.status(403).json({ error: "You can only send recs to friends" }); return; }

  const [created] = await db.insert(recommendationsTable)
    .values({ fromUserId: userId, toUserId: target.clerkId, title, category: category ?? null, coverUrl: coverUrl ?? null, readingUrl: readingUrl ?? null, message: message ?? null, isRead: false })
    .returning();
  res.status(201).json(created);
});

// GET /friends/recommendations — your received recs
router.get("/friends/recommendations", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rows = await db.select().from(recommendationsTable)
    .where(eq(recommendationsTable.toUserId, userId))
    .orderBy(recommendationsTable.createdAt);

  const enriched = await Promise.all(rows.map(async (r) => {
    const [sender] = await db.select().from(usersTable).where(eq(usersTable.clerkId, r.fromUserId));
    return { ...r, from: sender ? { username: sender.username, displayName: sender.displayName } : null };
  }));

  res.json(enriched);
});

// PATCH /friends/recommendations/:id/read — mark a rec as read
router.patch("/friends/recommendations/:id/read", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.update(recommendationsTable)
    .set({ isRead: true })
    .where(and(eq(recommendationsTable.id, id), eq(recommendationsTable.toUserId, userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Recommendation not found" }); return; }
  res.json(row);
});

// GET /friends/notifications/count — unread recs + pending requests count (for badge)
router.get("/friends/notifications/count", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const pendingRequests = await db.select().from(friendshipsTable)
    .where(and(eq(friendshipsTable.receiverId, userId), eq(friendshipsTable.status, "pending")));

  const unreadRecs = await db.select().from(recommendationsTable)
    .where(and(eq(recommendationsTable.toUserId, userId), eq(recommendationsTable.isRead, false)));

  res.json({ pendingRequests: pendingRequests.length, unreadRecs: unreadRecs.length, total: pendingRequests.length + unreadRecs.length });
});

export default router;
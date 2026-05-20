import {
  pgTable,
  text,
  serial,
  timestamp,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mediaTable = pgTable("media", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(), // webtoon | manhwa | manga | anime
  listType: text("list_type").notNull().default("library"), // library | to_read | avoid | bl
  status: text("status"), // reading | watching | completed | paused | dropped | plan_to_read
  coverUrl: text("cover_url"),
  customCoverUrl: text("custom_cover_url"),
  tier: text("tier"), // S | A | B | C | D | F
  rating: real("rating"),
  genres: text("genres").array().notNull().default([]),
  notes: text("notes"),
  hasUpdate: boolean("has_update").notNull().default(false),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  currentChapter: text("current_chapter"),
  latestChapter: text("latest_chapter"),
  totalChapters: text("total_chapters"),
  addedBy: text("added_by"),
  userId: text("user_id"),
  readingUrl: text("reading_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertMediaSchema = createInsertSchema(mediaTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = typeof mediaTable.$inferSelect;

// --- Users (searchable profiles, separate from Clerk auth) ---
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// --- Friendships ---
export const friendshipsTable = pgTable("friendships", {
  id: serial("id").primaryKey(),
  senderId: text("sender_id").notNull(),   // Clerk user ID
  receiverId: text("receiver_id").notNull(), // Clerk user ID
  status: text("status").notNull().default("pending"), // pending | accepted | rejected
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertFriendshipSchema = createInsertSchema(friendshipsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendshipsTable.$inferSelect;

// --- Recommendations ---
export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  fromUserId: text("from_user_id").notNull(),  // Clerk user ID
  toUserId: text("to_user_id").notNull(),      // Clerk user ID
  title: text("title").notNull(),
  category: text("category"),                  // webtoon | manhwa | manga | anime
  coverUrl: text("cover_url"),
  readingUrl: text("reading_url"),
  message: text("message"),                    // optional personal note
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertRecommendationSchema = createInsertSchema(recommendationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendationsTable.$inferSelect;
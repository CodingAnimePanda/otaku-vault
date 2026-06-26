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
  ratingStory: real("rating_story"),
  ratingArt: real("rating_art"),
  ratingCharacter: real("rating_character"),
  ratingWorldBuilding: real("rating_world_building"),
  ratingUniqueness: real("rating_uniqueness"),
  ratingEnjoyment: real("rating_enjoyment"),
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
  reviewText: text("review_text"),
  description: text("description"),
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
  rating: real("rating"),
  ratingStory: real("rating_story"),
  ratingArt: real("rating_art"),
  ratingCharacter: real("rating_character"),
  ratingWorldBuilding: real("rating_world_building"),
  ratingUniqueness: real("rating_uniqueness"),
  ratingEnjoyment: real("rating_enjoyment"),
  reviewText: text("review_text"),
  genres: text("genres").array().notNull().default([]),
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

// --- Library Sharing (per-friend toggle for viewing tier list/reviews) ---
export const librarySharingTable = pgTable("library_sharing", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  friendId: text("friend_id").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLibrarySharingSchema = createInsertSchema(librarySharingTable).omit({
  id: true,
  createdAt: true,
});

export type InsertLibrarySharing = z.infer<typeof insertLibrarySharingSchema>;
// --- Quotes ---
export const quotesTable = pgTable("quotes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  quote: text("quote").notNull(),
  character: text("character").notNull().default(""),
  mediaTitle: text("media_title").notNull(),
  category: text("category").notNull().default("other"),
  context: text("context").notNull().default(""),
  readingUrl: text("reading_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Quote = typeof quotesTable.$inferSelect;

// --- Moments ---
export const momentsTable = pgTable("moments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  scene: text("scene").notNull().default(""),
  category: text("category").notNull().default("other"),
  notes: text("notes").notNull().default(""),
  images: text("images").array().notNull().default([]),
  chapter: text("chapter").notNull().default(""),
  page: text("page").notNull().default(""),
  readingUrl: text("reading_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Moment = typeof momentsTable.$inferSelect;
export type LibrarySharing = typeof librarySharingTable.$inferSelect;
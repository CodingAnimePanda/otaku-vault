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
  readingUrl: text("reading_url"), // link to reading site
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
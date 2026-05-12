import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "lib/db/src/schema/index.ts",
  out: "lib/db/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
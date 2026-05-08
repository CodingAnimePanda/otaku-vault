# OtakuVault

A full-stack media tracker for webtoons, manhwa, manga, and anime — with library management, tier lists, recommendations, to-read/avoid lists, and update tracking.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/media-tracker run dev` — run the frontend (dynamic port via $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — express session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, wouter routing, shadcn/ui, framer-motion
- Fonts: Outfit (display), Space Grotesk (body)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/media.ts` — DB schema (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated React Query hooks (from codegen)
- `lib/api-zod/` — generated Zod schemas (from codegen)
- `artifacts/api-server/src/routes/media.ts` — all media API routes
- `artifacts/media-tracker/src/` — React frontend
  - `pages/dashboard.tsx` — library overview with stats grid
  - `pages/tier-list.tsx` — drag-and-drop tier lists per category
  - `pages/recommendations.tsx` — AI-style recs from Jikan/MangaDex APIs
  - `pages/to-read.tsx` — friend recommendation queue
  - `pages/avoid.tsx` — warned titles list
  - `pages/updates.tsx` — new chapter/episode tracking
  - `components/add-media-dialog.tsx` — full add-media form with cover search
  - `components/layout.tsx` — sidebar nav

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → typed hooks + Zod validators on both client and server.
- External cover/rec APIs: Jikan (MAL) for anime/manga, MangaDex for manhwa/webtoon. No API keys required.
- Orval generates an `index.ts` barrel that conflicts with the TS types namespace; the codegen script patches it post-generation to only re-export `./generated/api`.
- Single `mediaTable` with a `listType` discriminator column (`library`, `to_read`, `avoid`) rather than three separate tables.
- All routes prefixed `/api/media` — the shared proxy routes `/api` to the API server artifact.

## Product

- **Library** — grid of all tracked media with cover art, tier badges, and status overlays
- **Tier Lists** — drag-and-drop S/A/B/C/D/F ranking per category (webtoon/manhwa/manga/anime)
- **Recommended** — personalized picks fetched from Jikan & MangaDex based on library contents
- **To-Read** — friend recommendation queue, can move items directly into the library
- **Avoid** — warned titles shown with strike-through and red theme; greyscale covers
- **Updates** — tracks currently-reading/watching titles and polls for new chapters/episodes

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`.
- Do NOT run `pnpm dev` at workspace root — use `restart_workflow` or the individual filter commands.
- Orval index.ts patch: see `lib/api-spec/package.json` codegen script for the post-generation sed command.
- `useSearchCover` requires non-undefined params; use `enabled: false` to suppress the query, not `undefined` as params.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

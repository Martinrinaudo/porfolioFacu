# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack, outputs to .next/dev)
npm run build    # production build (Turbopack)
npm run start    # run production server
npm run lint     # run ESLint directly (next lint no longer exists)
```

No test suite is configured yet.

## Stack

- **Next.js 16.2.10** — App Router, Turbopack by default
- **React 19.2.4** with React Compiler support (not enabled by default)
- **TypeScript 5** — strict mode, path alias `@/*` maps to root
- **Tailwind CSS v4** — uses `@import "tailwindcss"` in CSS (not `@tailwind` directives)
- **Supabase** (`@supabase/supabase-js`) — database / auth
- **Cloudinary** (`cloudinary`, `next-cloudinary`) — media uploads / optimization

## Architecture

All pages live under `app/` (App Router). There is no `pages/` directory.

- `app/layout.tsx` — root layout; sets up Geist fonts and global CSS variables
- `app/page.tsx` — home page (currently the default scaffold)
- `app/globals.css` — Tailwind v4 import + CSS custom properties for theme colors

## Project Status

- **Supabase — configured and applied.** Real project, schema tracked in `supabase/migrations/`. Tables: `categories`, `photos` (FK `photos.category_id → categories.id`). RLS enabled on both: public `SELECT`, writes (`INSERT`/`UPDATE`/`DELETE`) restricted to a single admin via the `public.is_admin()` helper (checks the JWT's `email` claim), not "any authenticated user". Admin auth flow: `app/admin/login` (sign in) + `app/admin/(protected)/*` (guarded by `proxy.ts` and server-side `getUser()` in the layout). `types/database.types.ts` is generated from the live schema (re-run via the Supabase MCP `generate_typescript_types` tool after schema changes); `types/database.ts` re-exports domain types derived from it. `lib/supabase/client.ts` / `server.ts` are typed with the `Database` generic.
- **Cloudinary — not integrated yet.** Dependencies (`cloudinary`, `next-cloudinary`) are installed and `next.config.ts` allows `res.cloudinary.com` as a remote image host, but there's no actual upload wiring. `app/admin/(protected)/upload/page.tsx` is a placeholder ("Cloudinary integration next step") — next work item is building the upload form there and writing the resulting `cloudinary_url`/`cloudinary_public_id` into `photos` via the authenticated Supabase client.
- No public-facing page reads from Supabase yet — `app/page.tsx` is still the default `create-next-app` scaffold.

## Next.js 16 Breaking Changes

Read `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` for the full list. The most impactful:

**Async Request APIs** — `cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` must be `await`ed. Synchronous access is removed.

```tsx
// correct in Next.js 16
export default async function Page(props: PageProps) {
  const params = await props.params
  const cookies = await cookies()
}
```

Run `npx next typegen` to generate `PageProps`, `LayoutProps`, and `RouteContext` helpers.

**`middleware` → `proxy`** — rename `middleware.ts` to `proxy.ts` and the named export from `middleware` to `proxy`. The proxy file runs on the Node.js runtime only (no edge runtime). Config flag `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.

**Linting** — `next lint` is removed. Run `eslint` directly. `next build` no longer runs the linter.

**`revalidateTag` requires second arg** — pass a `cacheLife` profile name:
```ts
revalidateTag('posts', 'max')
```
Use `updateTag` (Server Actions only) for immediate cache invalidation.

**Parallel routes** — every slot (`@slot`) must have an explicit `default.js`; builds fail without one.

**`next/image` defaults changed** — `minimumCacheTTL` is now 4 h (was 60 s), `qualities` now `[75]` only, `imageSizes` no longer includes 16. `images.domains` is deprecated; use `images.remotePatterns`. Local images with query strings require `images.localPatterns.search`.

**Removed** — AMP support, `serverRuntimeConfig`/`publicRuntimeConfig` (use `process.env`), `devIndicators.appIsrStatus/buildActivity`, `experimental.dynamicIO`/`experimental.useCache` (use top-level `cacheComponents`).

**Turbopack config** — `experimental.turbopack` is now the top-level `turbopack` key in `next.config.ts`. Sass tilde imports (`~package`) are not supported; remove the tilde.

**PPR** — `experimental.ppr` is removed; use `cacheComponents: true` for the new approach.

## Tailwind v4 Notes

CSS-first configuration — no `tailwind.config.*` file needed. Tokens are defined in CSS with `@theme`. Use `@import "tailwindcss"` not `@tailwind base/components/utilities`.

## Environment Variables

Server-only: access `process.env.VAR` directly in Server Components.  
Client-accessible: prefix with `NEXT_PUBLIC_`.  
For runtime (not build-time) reads, call `await connection()` from `next/server` first.

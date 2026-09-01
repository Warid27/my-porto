# Roadmap

Where this portfolio is heading. Items are loosely ordered; nothing here is committed until the entry is moved into a milestone.

## Deferred — Admin app at admin.warid.web.id

> Owner notes (Warid): planned but **not implemented or planned in detail** in the current session. Captured here so it doesn't get lost.

A separate Next.js admin app at `admin.warid.web.id` will eventually author content for the public site. Open questions for when work actually starts:

- **Where do admin-written posts land?** Options: (a) admin writes Markdown files to a Git repo and Cloudflare Pages rebuilds the public site on push, (b) admin writes to Cloudflare KV and the public site's Pages Function reads at request time, (c) admin calls a small API and the public site reads at build via a custom fetcher.
- **Auth model for admin**: Cloudflare Access, NextAuth with GitHub, or custom?
- **Schema beyond current JSON**: cover image URL, draft/published flag, author metadata, series?
- **Image hosting**: R2 bucket, `/public/uploads/`, external CDN?

The current public site reads blog content from `data/blog.json`. Any admin integration will either replace that file or layer on top of it; either way, the migration path is straightforward because the data shape is centralized in one file.

## P1 — SEO & content

- Replace `public/og-image.svg` with a PNG/JPG (Twitter/LinkedIn prefer raster for link previews).
- Make Cloudflare Web Analytics beacon (`beacon.min.js`) async or self-hosted; currently render-blocking.
- Expand content depth on `/` to ≥250 words of meaningful body copy (currently ~134 words).
- Add a 1200×630 brand-aligned OG image and per-page variation for blog posts.

## P2 — Performance & polish

- Trim AOS or replace with native CSS scroll-driven animations (lower CLS, fewer bytes).
- Inline-SVG project thumbnails are bulky in the initial HTML; move to `/public/thumbnails/*.svg` files so they cache.
- Add explicit `width`/`height` to every `<img>` (currently relying on aspect-ratio CSS).
- Add `apple-touch-icon` (180×180), `theme-color`, PWA manifest.
- Resolve the `lang` mismatch: site is `<html lang="en">` but blog posts are Indonesian. Either flip blog pages to `lang="id"` or add `hreflang` alternates.
- Drop `email-decode.min.js` from Cloudflare if no obfuscated emails are in use.

## P2 — Doc & repo hygiene

- Update `README.md` to reflect Cloudflare Pages deployment (currently claims GitHub Pages).
- Clean up accidental files in repo root (`$null`, `({src`, `a.href)`).
- Decide whether to commit `pnpm-lock.yaml` or stick with `bun.lock` (CI uses bun).
- Add CI step to lint or typecheck if/when Astro typecheck is wired up.

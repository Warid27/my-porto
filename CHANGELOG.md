# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- SEO infrastructure: per-page `<title>`, canonical URL, Open Graph (with `og:image`), Twitter Card, and JSON-LD (`ProfilePage` / `BlogPosting` with optional `BreadcrumbList`) via `src/layouts/Layout.astro`.
- `@astrojs/sitemap` integration; produces `sitemap-index.xml` and `sitemap-0.xml` on build.
- Custom `src/pages/404.astro` with proper `404` response status and helpful navigation links.
- `public/og-image.svg` (1200×630) used as the default social preview image.
- `public/robots.txt` updated to reference the generated sitemap.
- Font `preconnect` hints for `fonts.googleapis.com` and `fonts.gstatic.com`.
- `BreadcrumbList` JSON-LD on blog index and individual blog posts.
- Restored `src/pages/blog/[slug].astro` (previously empty locally) with proper SEO, `getStaticPaths`, and `ogType="article"`.
- `CHANGELOG.md` and `ROADMAP.md`.
- `docs/rankmyseo.md` — operating notes for the rankmyseo MCP integration.

### Changed
- `src/layouts/Layout.astro` rewritten to support per-page title, canonical, OG/Twitter image, `ogType`, `publishedTime`, and breadcrumbs via typed props.
- `src/pages/blog/index.astro` now emits breadcrumb metadata and a clean page title.
- `astro.config.mjs` registers the sitemap integration.
- `package.json` adds `@astrojs/sitemap@3.2.1` (pinned to the Astro 4.x-compatible release; 3.7.x requires Astro 5).

### Notes
- Live site is on Cloudflare Pages (`warid.web.id`), not GitHub Pages — the deploy workflow and `wrangler.jsonc` already reflect this. README's old GitHub Pages claim is stale (separate doc-cleanup follow-up).
- The SEO P0 fixes resolve the major crawlability problems found in the audit: empty `<title>` on every page, missing sitemap, soft-404 (SPA fallback), and missing `og:image`.

## [0.1.0] — Initial public site

### Added
- Astro.js v4 static portfolio site (neo-brutalism → Japandi redesign).
- Sections: Hero, About, Skills, Timeline, Projects, Contact.
- Blog index + dynamic `[slug].astro` reading from `data/blog.json`.
- Cloudflare Pages Function for contact form (`functions/api/contact.ts`).
- Deploy via GitHub Actions to Cloudflare Pages.

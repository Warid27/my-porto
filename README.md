# Sinatrya Al Warid — Portfolio

[![Deploy to GitHub Pages](https://github.com/Warid27/my-porto/actions/workflows/deploy.yml/badge.svg)](https://github.com/Warid27/my-porto/actions/workflows/deploy.yml)

Personal portfolio site built with **Astro.js**, styled in **neo-brutalism**, deployed to **GitHub Pages** at [al-warid.web.id](https://al-warid.web.id).

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Astro.js v4 (static output) |
| Styling | Tailwind CSS v3 + custom CSS variables |
| Fonts | Space Grotesk + JetBrains Mono (Google Fonts) |
| Icons | astro-icon + simple-icons |
| Animations | AOS.js |
| Package manager | pnpm |
| Deployment | GitHub Actions → gh-pages |

## Getting Started

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # outputs to dist/
pnpm preview    # preview the build
```

## Deployment

Push to `main` — GitHub Actions builds and deploys to the `gh-pages` branch automatically. CNAME `al-warid.web.id` is written during the workflow.

## License

MIT
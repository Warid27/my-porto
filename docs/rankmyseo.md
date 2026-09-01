# rankmyseo — operating notes

Reference for future sessions working with the [rankmyseo](https://rankmyseo.com) MCP server wired into Command Code.

## Connection

- MCP URL: `https://api.rankmyseo.com/mcp`
- Transport: HTTP (Streamable)
- Scope: **user** (stored in `~/.commandcode/mcp.json` so it applies across all projects)
- Auth: lasting bearer token from `https://app.rankmyseo.com/account`, sent as `Authorization: Bearer <token>`
- Project tracked: `warid.web.id` (locale auto-detected: `id` / `id`)

## Setup recap

```bash
commandcode mcp add --transport http rankmyseo https://api.rankmyseo.com/mcp --scope user
# then paste the lasting key as Authorization header into ~/.commandcode/mcp.json
```

```json
{
  "mcpServers": {
    "rankmyseo": {
      "url": "https://api.rankmyseo.com/mcp",
      "headers": {
        "Authorization": "Bearer rms_live_..."
      }
    }
  }
}
```

Verify with `commandcode mcp get rankmyseo` (CLI redacts the token to `***`).

## Available tools (16)

| Category | Tool | Notes |
|---|---|---|
| Account | `account_status` | Plan, allowances, feature gates — call first when a tool refuses |
| Account | `list_projects` | All tracked sites |
| Projects | `add_project` | Requires `website` arg |
| Projects | `project_overview` | Headline numbers per project |
| Projects | `site_issues` | Site audit summary — `status: "not run yet"` until first audit completes |
| Projects | `add_competitor` | Adds a rival domain (plan-gated count) |
| Keywords | `add_keyword` | Queues for first check |
| Keywords | `list_keywords` | Current positions + movement |
| Keywords | `keyword_history` | Position over time, oldest first |
| Keywords | `check_ranks` | Force a fresh rank pull |
| Competitors | `list_competitors` | Saved rivals per project |
| Competitors | `keyword_gap` | Growth+ |
| Competitors | `competitor_traffic` | Growth+ |
| Competitors | `rank_compare` | Growth+ |
| Discovery | `keyword_planner` | Growth+ — related terms, volume, difficulty |
| Discovery | `issue_pages` | URLs affected by a specific `site_issues` issue id |

## Plan gates (from `account_status`)

- **Starter** plan unlocks: `issue_pages`, base rank tracking.
- **Growth+** unlocks: `keyword_gap`, `competitor_traffic`, `keyword_planner`, `rank_compare`.
- Free / walk-up guest keys are limited to 1 site and 2 keywords and **cannot** run site audits until the owner approves via `request_link`.

For the full plan gate matrix, call `account_status` — it returns the current plan's feature flags and usage counts.

## Worked example — adding a keyword

```bash
# 1. Account status (verify auth + plan)
mcp call rankmyseo account_status

# 2. Add the project (only needed once)
mcp call rankmyseo add_project '{"website":"https://warid.web.id"}'

# 3. Add a keyword
mcp call rankmyseo add_keyword '{"project":"warid.web.id","keyword":"personal portfolio"}'

# 4. Force a rank pull (otherwise waits for weekly refresh)
mcp call rankmyseo check_ranks '{"project":"warid.web.id","keyword":"personal portfolio"}'

# 5. Read positions back after a few minutes
mcp call rankmyseo list_keywords '{"project":"warid.web.id"}'
```

When calling from Command Code in a session, you don't need to remember tool names — describe the intent in plain language and Command Code picks the right tool.

## Common pitfalls

- **First position is `null`, `outsideTop20: true`** — expected for new checks; the rank check ran but the site isn't in the top 20. Wait for the next refresh or call `check_ranks` again. A brand-new domain won't rank for competitive keywords regardless.
- **`site_issues` returns `"status": "not run yet"`** — no audit has been triggered for this project. The audit is started either by the dashboard UI or by calling `issue_pages` (which queues a collect for the URLs behind an issue id).
- **MCP `Input validation error: Invalid arguments for tool issue_pages: Required at issueId`** — `issue_pages` requires an existing issue id from a completed audit; you cannot use it to trigger an audit from scratch.
- **Tool says "Walk-up sessions must call request_link first"** — the key is on the free guest tier and the requested tool needs paid plan access. Either upgrade on the dashboard or accept the limitation.
- **Token pasted in chat logs** — treat the token as compromised and rotate it via `app.rankmyseo.com/account` if the conversation transcript leaves your control.

## Self-host alternative

If at any point the hosted service is unavailable, rankmyseo is also open-source (`https://github.com/madebyaris/rankmyseo`, `npm i rankmyseo`). The npm package exposes the same audit / rank / scan primitives plus a separate MCP server (`@rankmyseo/agent`) for agent integrations.

## SEO recommendation surface

rankmyseo exposes two tools for SEO advice:

- `site_issues` — on-page problems across the site (title length, meta description, canonical, headings, OG tags, JSON-LD, image alt, etc.) with page counts.
- `issue_pages` — URLs affected by one specific issue, with detail.

There is **no general "give me SEO recommendations" tool**. For a generic checklist when the audit hasn't run yet (or in addition to it), use the 16-rule audit list from the open-source engine (see `/specs` if a spec was written locally) or run a manual browser-based audit using the `agent-browser` skill in Command Code.

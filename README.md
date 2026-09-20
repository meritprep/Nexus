# NOVEXA

**The internet, organized.**

NOVEXA is a visual discovery site that brings fresh stories from live publisher feeds into one place.

## Live news

- BBC, The Verge, TechCrunch, IGN and NASA RSS feeds
- Real publisher/feed images when available
- Image fallback from the publisher page's Open Graph image
- Stories sorted by publication time
- Server-side caching for fast refreshes
- Homepage refreshes the feed every 5 minutes

## Read stories inside NOVEXA

Story cards now route to `/api/article` instead of sending visitors to another site. The article function fetches the whitelisted source server-side and creates a NOVEXA Brief inside the site.

When `OPENAI_API_KEY` is configured, the Responses API generates an original rewrite from extracted source material. The prompt explicitly forbids copying sentences, distinctive phrasing, invented facts and invented quotes. Without the key, the reader falls back to a limited source-derived brief.

The browser never receives the API key.

## Automatic updates

`vercel.json` warms `/api/feed?limit=28` daily. The homepage is the primary live-update path and refreshes the feed every five minutes while visitors are on the site.

Vercel Cron Jobs can trigger Vercel Functions on a schedule. On Vercel Hobby, scheduled Cron precision is limited, so a five-minute background warm is intended for a plan that supports per-minute Cron execution.

## Setup

Add this server-only environment variable in Vercel:

`OPENAI_API_KEY`

Do not expose it through a `VITE_` variable.

## Important image-rights note

The code uses images supplied by or referenced by publishers. A feed providing an image does not by itself grant permission to commercially republish that image. Before public production use, replace or supplement this with image sources whose licenses permit your intended use.

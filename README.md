# NEXUS

**The internet, organized.**

A live news site with a category switcher: Top, World, U.S., Politics, Business, Technology, AI, Science, Health, Sports, Entertainment, Gaming, Music, Environment, Food and Travel.

- `index.html` is the whole front end. It fetches `/api/feed` once, then switches categories in the browser. The URL hash deep-links to a category (e.g. `/#sports`).
- `api/feed.js` reads RSS feeds from BBC, NPR, The Guardian, ESPN, The Verge, TechCrunch, Ars Technica, NASA, IGN and Polygon, assigns each story a category, removes duplicates, and returns the newest stories per category. To add a category, add feeds to `FEEDS` and an entry to `CATEGORIES` in `index.html`. To add a source domain, add it to `DOMAINS` in `api/feed.js` and `SOURCES` in `api/article.js`.
- `api/article.js` builds the in-site reader brief for a clicked story.

## Deploy

Connect this GitHub repository to Vercel; pushes to the production branch deploy automatically.

## Article briefs

When a story is opened, `api/article.js` fetches the publisher's page, extracts the reporting, and has Claude write an original brief in its own words (attributed to the publisher, with a link to the original). Safeguards: it only uses facts in the source, skips pages with too little text (paywalls), rejects drafts that reuse the publisher's wording (8-word overlap check, one retry), and falls back to the publisher's own summary if anything fails. Briefs are cached for a day.

Set `ANTHROPIC_API_KEY` as a server-side Vercel environment variable to enable this (the briefs are written by Claude through the official `@anthropic-ai/sdk`). The default model is `claude-opus-5-5`; set `ANTHROPIC_MODEL` to use a cheaper, faster one such as `claude-sonnet-5-5` or `claude-haiku-4-5`. Without a key, the reader shows the publisher's summary and the link.

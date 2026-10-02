# NEXUS

**The internet, organized.**

A live news site with a category switcher: Top, World, U.S., Politics, Business, Technology, AI, Science, Health, Sports, Entertainment, Gaming, Music, Environment, Food and Travel.

- `index.html` is the whole front end. It fetches `/api/feed` once, then switches categories in the browser. The URL hash deep-links to a category (e.g. `/#sports`).
- `api/feed.js` reads RSS feeds from BBC, NPR, The Guardian, ESPN, The Verge, TechCrunch, Ars Technica, NASA, IGN and Polygon, assigns each story a category, removes duplicates, and returns the newest stories per category. To add a category, add feeds to `FEEDS` and an entry to `CATEGORIES` in `index.html`. To add a source domain, add it to `DOMAINS` in `api/feed.js` and `SOURCES` in `api/article.js`.
- `api/article.js` builds the in-site reader brief for a clicked story.

## Deploy

Connect this GitHub repository to Vercel; pushes to the production branch deploy automatically.

Set `OPENAI_API_KEY` as a server-side Vercel environment variable for original Brief generation. Without it, the reader falls back to the publisher's summary.

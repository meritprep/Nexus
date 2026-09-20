# NEXUS

**The internet, organized.**

This repository is the new NEXUS React/Vite site, replacing the previous prototype.

The site uses live RSS-backed content through the server-side `/api/feed` route and keeps article reading inside NEXUS at `/c/:slug` and `/a/:id`.

The source archive restores the full 83-file React/Vite project before every dev/build/typecheck command, while the server API files remain at the repository root for Vercel.

## Deploy

Connect this GitHub repository to Vercel. Vercel Git Integration can automatically deploy commits pushed to the configured production branch. citeturn870238search2turn870238search7

Set `OPENAI_API_KEY` as a server-side Vercel environment variable for original Brief generation.

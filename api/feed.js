const FEEDS = [
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "World", hosts: ["bbc.co.uk", "www.bbc.co.uk"] },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Technology", hosts: ["theverge.com", "www.theverge.com"] },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Technology", hosts: ["techcrunch.com", "www.techcrunch.com"] },
  { name: "IGN", url: "https://feeds.feedburner.com/ign/all", category: "Gaming", hosts: ["ign.com", "www.ign.com"] },
  { name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", category: "Science", hosts: ["nasa.gov", "www.nasa.gov"] }
];

const strip = (value = "") => value
  .replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "")
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]*>/g, " ")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/\s+/g, " ").trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return m ? strip(m[1]) : "";
};

const rawAttr = (raw, tagName, attrName) => {
  const m = raw.match(new RegExp("<" + tagName + "[^>]*" + attrName + "=[\"']([^\"']+)[\"']", "i"));
  return m ? m[1] : "";
};

function imageFromItem(raw) {
  return rawAttr(raw, "media:content", "url") || rawAttr(raw, "media:thumbnail", "url") || rawAttr(raw, "enclosure", "url") || rawAttr(raw, "image", "href") || "";
}

function safeUrl(value) { try { return new URL(value); } catch { return null; } }
function allowedSource(u) {
  const url = safeUrl(u); if (!url || url.protocol !== "https:") return null;
  return FEEDS.find(feed => feed.hosts.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) || null;
}
function idFor(url) { return Buffer.from(url, "utf8").toString("base64url"); }
function urlFromId(id) { try { return Buffer.from(id, "base64url").toString("utf8"); } catch { return ""; } }

async function pageImage(link) {
  const feed = allowedSource(link); if (!feed) return "";
  try {
    const r = await fetch(link, { headers: { "user-agent": "NEXUS/1.0 (+news-reader)" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return "";
    const html = (await r.text()).slice(0, 600000);
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return og?.[1] || "";
  } catch { return ""; }
}

async function readFeed(feed) {
  const response = await fetch(feed.url, { headers: { "user-agent": "NEXUS/1.0 (+news-reader)" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(feed.name + " returned " + response.status);
  const xml = await response.text();
  const chunks = [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0, 12);
  return chunks.map(match => {
    const raw = match[1];
    let link = tag(raw, "link");
    const atom = raw.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (atom) link = atom[1];
    return {
      source: feed.name,
      category: feed.category,
      title: tag(raw, "title"),
      link,
      description: (tag(raw, "description") || tag(raw, "summary")).slice(0, 900),
      publishedAt: tag(raw, "pubDate") || tag(raw, "published") || tag(raw, "updated"),
      image: imageFromItem(raw),
      id: link ? idFor(link) : ""
    };
  }).filter(item => item.title && item.link && allowedSource(item.link));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const limit = Math.min(Math.max(Number(req.query?.limit || 28), 1), 60);
  const q = String(req.query?.q || "").trim().toLowerCase();
  try {
    const batches = await Promise.allSettled(FEEDS.map(readFeed));
    let stories = batches.flatMap(x => x.status === "fulfilled" ? x.value : []);
    stories.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    if (q) stories = stories.filter(s => `${s.title} ${s.description} ${s.category} ${s.source}`.toLowerCase().includes(q));

    const needingImages = stories.filter(s => !s.image).slice(0, 10);
    const resolved = await Promise.all(needingImages.map(async s => [s.id, await pageImage(s.link)]));
    const map = new Map(resolved);
    stories = stories.map(s => ({
      id: s.id,
      link: `/api/article?id=${encodeURIComponent(s.id)}`,
      source: s.source,
      category: s.category,
      title: s.title,
      summary: s.description,
      publishedAt: s.publishedAt,
      image: s.image || map.get(s.id) || "",
      imageAlt: s.title,
      imageCredit: `${s.source} image`
    }));

    res.status(200).json({ updatedAt: new Date().toISOString(), stories: stories.slice(0, limit) });
  } catch (error) {
    res.status(502).json({ error: "Unable to refresh live feeds.", detail: String(error?.message || error) });
  }
}

export { idFor, urlFromId, allowedSource, strip };

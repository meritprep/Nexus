const FEEDS = [
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "World" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Technology" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Technology" },
  { name: "IGN", url: "https://feeds.feedburner.com/ign/all", category: "Gaming" },
  { name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", category: "Science" }
];

function strip(value = "") {
  return value.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

function tag(xml, name) {
  const m = xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return m ? strip(m[1]) : "";
}

function image(item) {
  const media = item.match(/<(?:media:content|media:thumbnail)[^>]+url=["']([^"']+)["']/i);
  if (media) return media[1];
  const enclosure = item.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enclosure) return enclosure[1];
  const html = item.match(/<img[^>]+src=["']([^"']+)["']/i);
  return html ? html[1] : "";
}

async function readFeed(feed) {
  const response = await fetch(feed.url, { headers: { "user-agent": "NOVEXA/1.0" } });
  if (!response.ok) throw new Error(feed.name + " returned " + response.status);
  const xml = await response.text();
  const items = [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0, 10);
  return items.map(match => {
    const raw = match[1];
    let link = tag(raw, "link");
    const atom = raw.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (atom) link = atom[1];
    return {
      source: feed.name,
      category: feed.category,
      title: tag(raw, "title"),
      link,
      description: tag(raw, "description") || tag(raw, "summary"),
      publishedAt: tag(raw, "pubDate") || tag(raw, "published") || tag(raw, "updated"),
      image: image(raw)
    };
  }).filter(x => x.title && x.link);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  try {
    const results = await Promise.allSettled(FEEDS.map(readFeed));
    const stories = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
    stories.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    res.status(200).json({ updatedAt: new Date().toISOString(), stories: stories.slice(0, 30) });
  } catch {
    res.status(502).json({ error: "Unable to refresh feeds." });
  }
}

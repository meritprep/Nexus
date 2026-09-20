const FEEDS = [
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "World" },
  { name: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "Technology" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Technology" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Technology" },
  { name: "IGN", url: "https://feeds.feedburner.com/ign/all", category: "Gaming" },
  { name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", category: "Science" },
  { name: "NPR Music", url: "https://feeds.npr.org/1039/rss.xml", category: "Music" },
  { name: "NPR Arts & Culture", url: "https://feeds.npr.org/1008/rss.xml", category: "Culture" }
];

function decode(value = "") {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function strip(value = "") {
  return decode(value.replace(/<[^>]*>/g, " "));
}

function tag(xml, name) {
  const match = xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return match ? strip(match[1]) : "";
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "NEXUS-News/1.0 (+https://nexus.example)",
        "accept": "application/rss+xml, application/xml, text/xml, */*"
      }
    });
    if (!response.ok) throw new Error(feed.name + " returned " + response.status);
    const xml = await response.text();

    const matches = [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0, 12);

    return matches.map(match => {
      const raw = match[1];
      let link = tag(raw, "link");
      const atom = raw.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (atom) link = atom[1];

      return {
        source: feed.name,
        category: feed.category,
        title: tag(raw, "title"),
        link,
        description: tag(raw, "description") || tag(raw, "summary") || tag(raw, "content"),
        publishedAt: tag(raw, "pubDate") || tag(raw, "published") || tag(raw, "updated"),
        image: image(raw)
      };
    }).filter(story => story.title && story.link);
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const results = await Promise.allSettled(FEEDS.map(readFeed));
  const stories = results.flatMap(result => result.status === "fulfilled" ? result.value : []);

  stories.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    sourceCount: results.filter(result => result.status === "fulfilled").length,
    stories: stories.slice(0, 40)
  });
}

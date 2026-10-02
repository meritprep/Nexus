// category ids here must match CATEGORIES in index.html
// Order matters: when a story appears in several feeds, the first (most specific) feed wins.
const FEEDS = [
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "world" },
  { name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", category: "world" },
  { name: "The Guardian", url: "https://www.theguardian.com/world/rss", category: "world" },
  { name: "BBC US & Canada", url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", category: "us" },
  { name: "NPR National", url: "https://feeds.npr.org/1003/rss.xml", category: "us" },
  { name: "The Guardian US", url: "https://www.theguardian.com/us-news/rss", category: "us" },
  { name: "BBC Politics", url: "https://feeds.bbci.co.uk/news/politics/rss.xml", category: "politics" },
  { name: "NPR Politics", url: "https://feeds.npr.org/1014/rss.xml", category: "politics" },
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "business" },
  { name: "NPR Business", url: "https://feeds.npr.org/1006/rss.xml", category: "business" },
  { name: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "tech" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "tech" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "tech" },
  { name: "Ars Technica", url: "https://arstechnica.com/feed/", category: "tech" },
  { name: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", category: "science" },
  { name: "NPR Science", url: "https://feeds.npr.org/1007/rss.xml", category: "science" },
  { name: "NASA", url: "https://www.nasa.gov/feed/", category: "science" },
  { name: "BBC Health", url: "https://feeds.bbci.co.uk/news/health/rss.xml", category: "health" },
  { name: "NPR Health", url: "https://feeds.npr.org/1128/rss.xml", category: "health" },
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", category: "sports" },
  { name: "ESPN", url: "https://www.espn.com/espn/rss/news", category: "sports" },
  { name: "The Guardian Sport", url: "https://www.theguardian.com/sport/rss", category: "sports" },
  { name: "BBC Culture", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", category: "entertainment" },
  { name: "NPR Arts & Culture", url: "https://feeds.npr.org/1008/rss.xml", category: "entertainment" },
  { name: "IGN", url: "https://feeds.feedburner.com/ign/all", category: "gaming" },
  { name: "Polygon", url: "https://www.polygon.com/rss/index.xml", category: "gaming" },
  { name: "NPR Music", url: "https://feeds.npr.org/1039/rss.xml", category: "music" },
  { name: "The Guardian Environment", url: "https://www.theguardian.com/environment/rss", category: "environment" },
  { name: "The Guardian Food", url: "https://www.theguardian.com/food/rss", category: "food" },
  { name: "The Guardian Travel", url: "https://www.theguardian.com/travel/rss", category: "travel" },
  // General front pages go last so they only add stories no specific feed already claimed.
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "top" },
  { name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml", category: "top" }
];
const DOMAINS = ["bbc.co.uk", "bbc.com", "npr.org", "theguardian.com", "espn.com", "theverge.com", "techcrunch.com", "arstechnica.com", "nasa.gov", "ign.com", "polygon.com"];
const PER_FEED = 12, PER_CATEGORY = 24, MAX_PAGE_IMAGES = 20;

function strip(value = "") { return value.replace(/<!\[CDATA\[/g,"").replace(/\]\]>/g,"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#x27;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g," ").trim(); }
function tag(xml,name){const m=xml.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+name+">","i"));return m?strip(m[1]):"";}
function attr(raw,tagName,attrName){const m=raw.match(new RegExp("<"+tagName+"[^>]*"+attrName+"=[\"']([^\"']+)[\"']","i"));return m?m[1]:"";}
function allowed(url){try{const u=new URL(url);return u.protocol==="https:"&&DOMAINS.some(h=>u.hostname===h||u.hostname.endsWith("."+h));}catch{return false;}}
function feedFor(url){return allowed(url)?url:null;}
function idFor(url){return Buffer.from(url,"utf8").toString("base64url");}
function imageFor(raw){return attr(raw,"media:content","url")||attr(raw,"media:thumbnail","url")||attr(raw,"enclosure","url")||"";}
function guessAi(title,description,category){
  if(!["top","tech","business","science"].includes(category))return category;
  const text=(title+" "+description).toLowerCase();
  return /\bai\b|openai|chatgpt|gemini|claude|anthropic|artificial intelligence|machine learning|\bllm\b|chatbot/.test(text)?"ai":category;
}
async function pageImage(url){if(!allowed(url))return "";try{const r=await fetch(url,{headers:{"user-agent":"NEXUS/1.0 (+live-reader)"},signal:AbortSignal.timeout(6000)});if(!r.ok)return "";const h=(await r.text()).slice(0,500000);const m=h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)||h.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);return m?.[1]||"";}catch{return "";}}
async function readFeed(feed){
  const r=await fetch(feed.url,{headers:{"user-agent":"NEXUS/1.0 (+live-feed)"},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error(feed.name+" returned "+r.status);
  const xml=await r.text();
  const chunks=[...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0,PER_FEED);
  return chunks.map(m=>{
    const raw=m[1];
    let link=tag(raw,"link");
    const atom=raw.match(/<link[^>]+href=["']([^"']+)["']/i);
    if(atom)link=atom[1];
    const title=tag(raw,"title");
    const summary=(tag(raw,"description")||tag(raw,"summary")||tag(raw,"content")).slice(0,300);
    const category=guessAi(title,summary,feed.category);
    return{id:link?idFor(link):"",kind:"article",category,title,summary,publishedAt:tag(raw,"pubDate")||tag(raw,"published")||tag(raw,"updated")||tag(raw,"dc:date"),sourceName:feed.name,imageUrl:imageFor(raw),imageAlt:title,_sourceUrl:link};
  }).filter(x=>x.title&&x._sourceUrl&&allowed(x._sourceUrl));
}
function dedupe(stories){const seen=new Set();return stories.filter(s=>{if(seen.has(s.id))return false;seen.add(s.id);return true;});}
function balance(stories){
  // newest first, but never more than PER_CATEGORY per category so busy desks don't crowd out quiet ones
  const counts={};
  return stories.filter(s=>(counts[s.category]=(counts[s.category]||0)+1)<=PER_CATEGORY);
}
export default async function handler(req,res){
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  const q=String(req.query?.q||"").trim().toLowerCase(),category=String(req.query?.category||"").trim().toLowerCase();
  try{
    const results=await Promise.allSettled(FEEDS.map(readFeed));
    let stories=dedupe(results.flatMap(x=>x.status==="fulfilled"?x.value:[]));
    stories.sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
    stories=balance(stories);
    if(category)stories=stories.filter(x=>x.category===category);
    if(q)stories=stories.filter(x=>(x.title+" "+x.summary+" "+x.sourceName+" "+x.category).toLowerCase().includes(q));
    const missing=stories.filter(x=>!x.imageUrl).slice(0,MAX_PAGE_IMAGES);
    const map=new Map(await Promise.all(missing.map(async x=>[x.id,await pageImage(x._sourceUrl)])));
    const failed=results.map((x,i)=>x.status==="rejected"?FEEDS[i].name:null).filter(Boolean);
    res.status(200).json({updatedAt:new Date().toISOString(),sourceCount:results.length-failed.length,failedSources:failed,stories:stories.map(x=>({...x,imageUrl:x.imageUrl||map.get(x.id)||"",_sourceUrl:undefined}))});
  }catch(error){res.status(502).json({error:"Live news is temporarily unavailable.",detail:String(error?.message||error)});}
}
export {idFor,feedFor,strip};

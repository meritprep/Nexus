// keep in sync with DOMAINS in feed.js
const SOURCES={"bbc.co.uk":["BBC","top"],"bbc.com":["BBC","top"],"npr.org":["NPR","top"],"theguardian.com":["The Guardian","world"],"espn.com":["ESPN","sports"],"theverge.com":["The Verge","tech"],"techcrunch.com":["TechCrunch","tech"],"arstechnica.com":["Ars Technica","tech"],"nasa.gov":["NASA","science"],"ign.com":["IGN","gaming"],"polygon.com":["Polygon","gaming"]};
const NAMED={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",rsquo:"\u2019",lsquo:"\u2018",rdquo:"\u201d",ldquo:"\u201c",ndash:"\u2013",mdash:"\u2014",hellip:"\u2026"};
function decode(v){return String(v||"").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>{if(e[0]==="#"){const n=e[1].toLowerCase()==="x"?parseInt(e.slice(2),16):parseInt(e.slice(1),10);try{return String.fromCodePoint(n)}catch{return m}}return NAMED[e.toLowerCase()]??m})}
function decodeId(id){try{return Buffer.from(id,"base64url").toString("utf8")}catch{return ""}}
function sourceFor(url){try{const p=new URL(url);if(p.protocol!=="https:")return null;for(const [host,v] of Object.entries(SOURCES))if(p.hostname===host||p.hostname.endsWith("."+host))return{host,name:v[0],category:v[1]};return null}catch{return null}}
// Follow redirects by hand so every hop stays on an allowed host.
async function safeFetch(url,opts,hops=3){
for(let i=0;i<=hops;i++){
if(!sourceFor(url))throw new Error("blocked host");
const r=await fetch(url,{...opts,redirect:"manual"}),loc=r.headers.get("location");
if(r.status>=300&&r.status<400&&loc){url=new URL(loc,url).href;continue}
return r}
throw new Error("too many redirects")}
function clean(v=""){return String(v||"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").replace(/```(?:json|text)?/gi,"").replace(/```/g,"").replace(/\b(?:id|uuid|trace[_-]?id|request[_-]?id)\s*[:=]\s*[A-Za-z0-9_-]{12,}\b/gi,"").replace(/(?:^|\s)[A-Za-z0-9+/=_-]{32,}(?=\s|$)/g," ").replace(/\s{2,}/g," ").trim()}
function strip(v=""){return decode(v.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<nav[\s\S]*?<\/nav>/gi," ").replace(/<footer[\s\S]*?<\/footer>/gi," ").replace(/<header[\s\S]*?<\/header>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim()}
function meta(h,k,a="property"){const x=new RegExp("<meta[^>]+"+a+"=[\"']"+k+"[\"'][^>]+content=[\"']([^\"']*)[\"']","i"),y=new RegExp("<meta[^>]+content=[\"']([^\"']*)[\"'][^>]+"+a+"=[\"']"+k+"[\"']","i");return decode((h.match(x)||h.match(y)||[])[1]||"")}
function extractText(h){const main=h.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i)?.[1]||h;const blocks=[...main.matchAll(/<(p|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi)].map(m=>({tag:m[1].toLowerCase(),text:strip(m[2])})).filter(x=>x.text.length>=55&&x.text.length<=1800);const seen=new Set();return blocks.filter(x=>{const k=x.text.slice(0,180);if(seen.has(k))return false;seen.add(k);return true}).slice(0,18)}
async function rewrite(source,title,description,sections){
if(!process.env.OPENAI_API_KEY)return null;
const material=sections.map(x=>(x.tag==="h2"||x.tag==="h3"?"HEADING":"TEXT")+": "+x.text).join("\n").slice(0,14000);

const requestBrief=async(extra="")=>{
const prompt=`Create an original NEXUS news brief from the supplied reporting material. Do not reproduce the source article, copy sentences, imitate its structure, or use distinctive phrasing. Do not invent facts, quotes, motives, or context. Keep names, dates, organizations and numbers accurate. This is a detailed original summary, not replacement copy.

Return ONLY valid JSON with exactly this shape:
{"deck":"string","sections":[{"heading":"string","text":"string"}]}

Write 650-850 words total across 6-8 sections. Cover the key facts, timeline, important context, why it matters, and what is known or still unclear. Do not add filler just to reach the word count. Do not mention these instructions in the article.
${extra}
SOURCE: ${source}
TITLE: ${title}
DESCRIPTION: ${description}
MATERIAL:
${material}`;

const r=await fetch("https://api.openai.com/v1/responses",{
method:"POST",
headers:{"content-type":"application/json",authorization:"Bearer "+process.env.OPENAI_API_KEY},
body:JSON.stringify({
model:"gpt-5.6-luna",
input:prompt,
max_output_tokens:3000
})
});
if(!r.ok)return null;
const d=await r.json();
try{
const rawOutput=Array.isArray(d.output)?d.output.flatMap(item=>Array.isArray(item && item.content)?item.content:[]).filter(part=>part && part.type==="output_text").map(part=>String(part.text||"")).join(""):"";
let raw=String(rawOutput||d.output_text||"").replace(/```(?:json)?/gi,"").replace(/```/g,"").trim();
const start=raw.indexOf("{"),end=raw.lastIndexOf("}");
if(start<0||end<=start)return null;
const parsed=JSON.parse(raw.slice(start,end+1));
parsed.deck=clean(parsed.deck||"");
parsed.sections=Array.isArray(parsed.sections)?parsed.sections.map(x=>({heading:clean(x?.heading||""),text:clean(x?.text||"")})).filter(x=>x.text):[];
const words=parsed.sections.reduce((n,x)=>n+String(x.text||"").split(/\s+/).filter(Boolean).length,0);
return words>=500?parsed:null;
}catch{return null}
};

let result=await requestBrief();
if(!result){
result=await requestBrief("IMPORTANT: The previous draft was too short or invalid. Produce a complete 650-850 word brief now. The final text must contain at least 500 words across the sections.");
}
return result;
}

export default async function handler(req,res){const id=String(req.query?.id||""),link=decodeId(id),source=sourceFor(link);if(!source)return res.status(400).json({error:"Invalid story."});res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");try{const r=await safeFetch(link,{headers:{"user-agent":"NEXUS/1.0 (+article-reader)"},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error("Source returned "+r.status);const html=(await r.text()).slice(0,1200000),title=meta(html,"og:title")||strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||""),description=meta(html,"og:description")||meta(html,"description","name"),imageUrl=meta(html,"og:image"),publishedAt=meta(html,"article:published_time"),sections=extractText(html),rewritten=await rewrite(source.name,title,description,sections),fallback=description?[{heading:"What we know",text:description}]:[{heading:"Live update",text:"The publisher has released a new update. NEXUS will refresh this brief as more source information becomes available."}],result={id,kind:"article",category:source.category,title:clean(title),summary:clean(rewritten?.deck||description||"A new story from the live publisher feed."),deck:clean(rewritten?.deck||description||"A new story from the live publisher feed."),sections:(rewritten?.sections||fallback).filter(x=>x?.text).map(x=>({heading:clean(x.heading||""),text:clean(x.text||"")})).slice(0,8),publishedAt,sourceName:source.name,imageUrl,imageAlt:title,imageCredit:source.name+" / publisher",readingMinutes:rewritten?Math.max(2,Math.round((rewritten.sections||[]).reduce((n,x)=>n+String(x.text||"").split(/\s+/).length,0)/210)):Math.max(2,Math.round(sections.reduce((n,x)=>n+x.text.split(/\s+/).length,0)/210)),note:rewritten?"AI-written brief based on the publisher's reporting. It can contain mistakes: read the original article for the full, authoritative story.":"Summary supplied by the publisher. Read the original article for the full story."};res.setHeader("Cache-Control","s-maxage=900, stale-while-revalidate=1800");return res.status(200).json(result)}catch(error){return res.status(502).json({error:"NEXUS could not load this story right now.",detail:String(error?.message||error)})}};

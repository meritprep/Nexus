// Open /api/status to see whether article writing is switched on. Never returns secret values.
export default function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  const keySet=Boolean(process.env.ANTHROPIC_API_KEY||process.env.ANTHROPIC_AUTH_TOKEN);
  res.status(200).json({
    articleBriefs:keySet?"on":"off: add ANTHROPIC_API_KEY in Vercel (Settings > Environment Variables) and redeploy",
    model:process.env.ANTHROPIC_MODEL||"claude-opus-5-5",
    checkedAt:new Date().toISOString()
  });
}

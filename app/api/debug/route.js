export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const out = {
    has_redis: !!(url && token),
    has_anthropic_key: !!process.env.ANTHROPIC_API_KEY,
    now: Date.now(),
  };
  if (url && token) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(["STRLEN", "site-brain:state"]),
        cache: "no-store",
      });
      const data = await res.json();
      out.state_bytes = data.result ?? data.error;
    } catch (e) {
      out.redis_error = String(e);
    }
  }
  return Response.json(out, { headers: { "cache-control": "no-store" } });
}

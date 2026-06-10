export const dynamic = "force-dynamic";

// Demo helper: stash a screenshot (base64) in Redis, read it back in slices.
const KEY = "site-brain:shot";

function env() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

async function cmd(c) {
  const { url, token } = env();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(c),
    cache: "no-store",
  });
  return (await res.json()).result;
}

export async function POST(req) {
  const body = await req.text();
  if (!body || body.length > 2_000_000) return new Response("bad size", { status: 400 });
  await cmd(["SET", KEY, body, "EX", "3600"]);
  return Response.json({ ok: true, length: body.length });
}

export async function GET(req) {
  const u = new URL(req.url);
  const from = parseInt(u.searchParams.get("from") || "0", 10);
  const len = Math.min(parseInt(u.searchParams.get("len") || "60000", 10), 100000);
  const data = (await cmd(["GETRANGE", KEY, String(from), String(from + len - 1)])) || "";
  const total = await cmd(["STRLEN", KEY]);
  return new Response(data, {
    headers: { "content-type": "text/plain", "x-total-length": String(total), "cache-control": "no-store" },
  });
}

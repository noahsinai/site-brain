import { seedState } from "./seed";

// State lives in Redis (Upstash via Vercel Marketplace) — strongly consistent,
// no CDN/list propagation issues. Falls back to in-memory for local dev.
const KEY = "site-brain:state";

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCmd(env, cmd) {
  const res = await fetch(env.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.token}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (data.error) throw new Error(`redis: ${data.error}`);
  return data.result;
}

export async function getState() {
  const env = redisEnv();
  if (!env) {
    if (!globalThis.__SB_STATE) globalThis.__SB_STATE = seedState();
    return globalThis.__SB_STATE;
  }
  const raw = await redisCmd(env, ["GET", KEY]);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("state parse failed, reseeding:", e);
    }
  }
  const s = seedState();
  await saveState(s);
  return s;
}

export async function saveState(state) {
  state.updated = Date.now();
  const env = redisEnv();
  if (!env) {
    globalThis.__SB_STATE = state;
    return;
  }
  await redisCmd(env, ["SET", KEY, JSON.stringify(state)]);
}

export async function resetState() {
  const s = seedState();
  await saveState(s);
  return s;
}

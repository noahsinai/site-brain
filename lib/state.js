import { put, list, del } from "@vercel/blob";
import { seedState } from "./seed";

// Each save writes a NEW blob (state-<ts>.json). Overwriting a single path
// doesn't work for live data: the Blob CDN serves stale content for minutes.
// list() is an API call (always fresh), and each new URL is never stale.
const PREFIX = "site-brain/state-";

async function latestBlob() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  if (!blobs.length) return null;
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  return blobs;
}

export async function getState() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (!globalThis.__SB_STATE) globalThis.__SB_STATE = seedState();
    return globalThis.__SB_STATE;
  }
  try {
    const blobs = await latestBlob();
    if (!blobs) throw new Error("no state yet");
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) throw new Error("blob fetch failed");
    return await res.json();
  } catch {
    const s = seedState();
    await saveState(s);
    return s;
  }
}

export async function saveState(state) {
  state.updated = Date.now();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    globalThis.__SB_STATE = state;
    return;
  }
  await put(`${PREFIX}${state.updated}.json`, JSON.stringify(state), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  // prune old versions, keep newest 5 (best-effort)
  try {
    const blobs = await latestBlob();
    if (blobs && blobs.length > 5) await del(blobs.slice(5).map((b) => b.url));
  } catch {}
}

export async function resetState() {
  const s = seedState();
  await saveState(s);
  return s;
}

import { put, list, del } from "@vercel/blob";
import { seedState } from "./seed";

// Each save writes a NEW blob (state-<ts>.json); reads list and take the
// newest READABLE one. New blobs can 404 for a few seconds (CDN propagation),
// so we fall back to older versions instead of treating it as "no state".
// We only seed-and-save when the store is truly empty — never on a transient
// read failure (that caused a reseed feedback loop).
const PREFIX = "site-brain/state-";
const KEEP = 20;

function tsOf(pathname) {
  const m = pathname.match(/state-(\d+)\.json$/);
  return m ? Number(m[1]) : 0;
}

async function listStateBlobs() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  blobs.sort((a, b) => tsOf(b.pathname) - tsOf(a.pathname));
  return blobs;
}

export async function getState() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (!globalThis.__SB_STATE) globalThis.__SB_STATE = seedState();
    return globalThis.__SB_STATE;
  }

  let blobs = [];
  try {
    blobs = await listStateBlobs();
  } catch (e) {
    console.error("blob list failed:", e);
  }

  for (const b of blobs.slice(0, 5)) {
    try {
      const res = await fetch(b.url, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch {}
  }

  const s = seedState();
  if (blobs.length === 0) {
    // store genuinely empty — first boot
    try {
      await saveState(s);
    } catch (e) {
      console.error("seed save failed:", e);
    }
  } else {
    console.error("all state blobs unreadable; serving seed WITHOUT saving");
  }
  return s;
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
  // prune old versions (best-effort)
  try {
    const blobs = await listStateBlobs();
    if (blobs.length > KEEP) await del(blobs.slice(KEEP).map((b) => b.url));
  } catch {}
}

export async function resetState() {
  const s = seedState();
  await saveState(s);
  return s;
}

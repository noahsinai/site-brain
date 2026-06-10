import { put, head } from "@vercel/blob";
import { seedState } from "./seed";

const BLOB_PATH = "site-brain/state.json";

export async function getState() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (!globalThis.__SB_STATE) globalThis.__SB_STATE = seedState();
    return globalThis.__SB_STATE;
  }
  try {
    const meta = await head(BLOB_PATH);
    const res = await fetch(`${meta.url}?t=${Date.now()}`, { cache: "no-store" });
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
  await put(BLOB_PATH, JSON.stringify(state), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

export async function resetState() {
  const s = seedState();
  await saveState(s);
  return s;
}

import { getState, saveState } from "@/lib/state";

export const dynamic = "force-dynamic";

// Create a site from the dashboard (click-to-add).
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  const name = (body.name || "").trim().slice(0, 40);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const type = ["well", "pad", "battery", "swd"].includes(body.type) ? body.type : "well";
  const who = (body.who || "Dispatcher").slice(0, 40);

  if (!name) return Response.json({ error: "name required" }, { status: 400 });
  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)
    return Response.json({ error: "valid lat/lng required" }, { status: 400 });

  const state = await getState();
  let id = name.toUpperCase().replace(/^WELL\s+/, "").replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || `SITE-${Date.now()}`;
  if (state.sites.some((s) => s.id === id)) id = `${id}-${String(Date.now()).slice(-4)}`;

  const site = {
    id,
    name,
    type,
    lat,
    lng,
    status: "online",
    emergency: false,
    crew_en_route: null,
    open_items: [],
    parts_on_pad: [],
    log: [{ ts: Date.now(), who, via: "dashboard", summary: `Site added from the dispatch map by ${who}.`, parts_taken: [], parts_left: [] }],
  };
  state.sites.push(site);
  state.feed.unshift({
    ts: Date.now(),
    who,
    site_id: id,
    text: `Added new ${type} "${name}" from the map.`,
    reply: `${name} registered at ${lat.toFixed(4)}, ${lng.toFixed(4)} — online, no open items.`,
  });
  state.feed = state.feed.slice(0, 50);
  await saveState(state);
  return Response.json({ ok: true, site });
}

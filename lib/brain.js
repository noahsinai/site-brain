import { ago } from "./time";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function siteContext(s) {
  const lines = [];
  lines.push(`SITE ${s.id} (${s.name}, ${s.type}) — status: ${s.status.toUpperCase()}${s.emergency ? " ⚠ ACTIVE EMERGENCY" : ""}`);
  if (s.crew_en_route)
    lines.push(`  Crew en route: ${s.crew_en_route.name} (${s.crew_en_route.skill}), ETA ${s.crew_en_route.eta}`);
  if (s.open_items.length)
    lines.push(`  Open items: ${s.open_items.map((o) => `[${o.id}] ${o.text} (${ago(o.created)})`).join(" | ")}`);
  if (s.parts_on_pad.length) lines.push(`  Parts/equipment on site: ${s.parts_on_pad.join("; ")}`);
  const recent = s.log.slice(0, 4);
  if (recent.length) {
    lines.push(`  Recent visits:`);
    for (const e of recent) {
      let l = `    - ${ago(e.ts)} by ${e.who}: ${e.summary}`;
      if (e.parts_taken?.length) l += ` [TOOK: ${e.parts_taken.join(", ")}]`;
      if (e.parts_left?.length) l += ` [LEFT: ${e.parts_left.join(", ")}]`;
      lines.push(l);
    }
  }
  return lines.join("\n");
}

function buildPrompt(state, who, text) {
  const sites = state.sites.map(siteContext).join("\n\n");
  return `You are SITE BRAIN — the shared memory for an oil & gas field (${state.field}). Field crews text you what they did, and ask you questions before driving out. You keep every site's story straight.

CURRENT FIELD STATE:
${sites}

A text message just arrived from "${who}":
"""${text}"""

Decide what it is and respond with ONLY a JSON object (no markdown, no fences):
{
  "site_id": "<the exact site id ONLY, e.g. \"42-17\" or \"HARTLEY-23-4\" — no \"SITE\" prefix — or null if unclear/general>",
  "intent": "log" | "question" | "both" | "general",
  "reply": "<your text-message reply>",
  "updates": {
    "status": "online" | "down" | "attention" | null,
    "crew_en_route": {"name": "...", "skill": "...", "eta": "..."} | "clear" | null,
    "log": {"summary": "<third-person summary of work reported>", "parts_taken": [], "parts_left": []} | null,
    "open_items_add": ["<new open item text>"],
    "open_items_resolve": ["<open item id like oi-1>"],
    "emergency": true | "clear" | null,
    "new_site": {"id": "<SHORT-ID>", "name": "<display name>", "type": "well" | "pad" | "battery" | "swd", "lat": <number or null>, "lng": <number or null>} | null
  }
}

Rules:
- Match site names loosely: "42-17", "well 42 17", "hartley" etc. If the message names no site but clearly continues about one, pick the best match; otherwise site_id null.
- "Heading to X" => crew_en_route set with their name (skill if stated, eta if stated, else "en route"). Also intent is usually "question" if they ask status — answer it.
- Work reported done => log entry, third person. If they fixed the down/attention issue, set status accordingly, resolve the matching open item ids, and clear crew_en_route for that person.
- Parts/equipment taken or left MUST go in parts_taken/parts_left.
- New problems reported => open_items_add, and status "down" (well not producing) or "attention" (degraded/needs work).
- REPLY STYLE: terse field dispatcher over SMS. Plain English, 1-4 short sentences. When answering "what's the status", lead with last visit (when, who, what), then what's NOT on site anymore, then what's open and what crew/equipment the job needs. Never invent history — only use what's in the field state. If you don't know, say so.
- EMERGENCIES: reports of fire, explosion, blowout, spill, H2S release, injury, or anything life/environment-threatening => set "emergency": true, status "down" (or "attention" if site still producing), add an open item describing it, and your reply MUST tell them to get to safety / account for people and that the site is flagged for emergency response. When someone reports the emergency is resolved or a false alarm => "emergency": "clear".
- NEW SITES: if asked to add/register a new site/well/pad/battery ("add a new well 88-4", "register Pecos Pad B") => fill "new_site". Create a SHORT-ID from the name (e.g. "88-4", "PECOS-PAD-B"). If they gave coordinates or a clear relative location ("half a mile south of Midkiff SWD" — estimate from that site's lat/lng), set lat/lng; otherwise null and say the site was placed near the field center until someone confirms coordinates. site_id stays null for new-site requests.
- If intent is "general" (greeting, unclear), reply helpfully: you track who's been to each site, what they did, what they took. updates all null.
- For pure questions, updates should be null/empty — except "heading to" which sets crew_en_route.`;
}

async function callAnthropic(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

function parseJson(text) {
  let t = text.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON in response");
  return JSON.parse(t.slice(start, end + 1));
}

export function findSite(state, siteId) {
  if (!siteId) return null;
  const norm = String(siteId).toUpperCase().replace(/^SITE\s+/, "").replace(/^WELL\s+/, "").trim();
  return (
    state.sites.find((s) => s.id.toUpperCase() === norm) ||
    state.sites.find((s) => norm.includes(s.id.toUpperCase()) || s.id.toUpperCase().includes(norm)) ||
    null
  );
}

function applyUpdates(state, siteId, who, text, u) {
  if (!siteId || !u) return;
  const site = findSite(state, siteId);
  if (!site) return;
  const now = Date.now();

  if (u.status && ["online", "down", "attention"].includes(u.status)) site.status = u.status;

  if (u.crew_en_route === "clear") site.crew_en_route = null;
  else if (u.crew_en_route && typeof u.crew_en_route === "object")
    site.crew_en_route = {
      name: u.crew_en_route.name || who,
      skill: u.crew_en_route.skill || "",
      eta: u.crew_en_route.eta || "en route",
    };

  if (u.log && u.log.summary) {
    const taken = Array.isArray(u.log.parts_taken) ? u.log.parts_taken : [];
    const left = Array.isArray(u.log.parts_left) ? u.log.parts_left : [];
    site.log.unshift({ ts: now, who, via: "text", summary: u.log.summary, parts_taken: taken, parts_left: left, raw: text });
    // move inventory
    for (const p of taken) {
      const i = site.parts_on_pad.findIndex((x) => x.toLowerCase().includes(p.toLowerCase().slice(0, 12)) || p.toLowerCase().includes(x.toLowerCase().slice(0, 12)));
      if (i !== -1) site.parts_on_pad.splice(i, 1);
    }
    for (const p of left) site.parts_on_pad.push(p);
  }

  if (Array.isArray(u.open_items_add))
    for (const t of u.open_items_add)
      if (t) site.open_items.push({ id: `oi-${now}-${Math.floor(Math.random() * 1000)}`, text: t, created: now });

  if (Array.isArray(u.open_items_resolve))
    site.open_items = site.open_items.filter((o) => !u.open_items_resolve.includes(o.id));

  if (u.emergency === true) site.emergency = true;
  else if (u.emergency === "clear" || u.emergency === false) site.emergency = false;
}

function addNewSite(state, who, ns) {
  if (!ns || !ns.id || !ns.name) return;
  const id = String(ns.id).toUpperCase().replace(/\s+/g, "-").slice(0, 24);
  if (state.sites.some((s) => s.id.toUpperCase() === id)) return;
  let { lat, lng } = ns;
  let approx = false;
  if (typeof lat !== "number" || typeof lng !== "number") {
    // place near field center with a small jitter until coordinates are confirmed
    lat = 31.95 + (Math.random() - 0.5) * 0.06;
    lng = -102.05 + (Math.random() - 0.5) * 0.08;
    approx = true;
  }
  state.sites.push({
    id,
    name: ns.name,
    type: ["well", "pad", "battery", "swd"].includes(ns.type) ? ns.type : "well",
    lat, lng,
    status: "online",
    emergency: false,
    crew_en_route: null,
    open_items: approx
      ? [{ id: `oi-${Date.now()}-loc`, text: "Confirm exact site coordinates (placed near field center)", created: Date.now() }]
      : [],
    parts_on_pad: [],
    log: [{ ts: Date.now(), who, via: "text", summary: `Site registered by ${who} via text.`, parts_taken: [], parts_left: [] }],
  });
}

export async function brainProcess(state, who, text) {
  if (!process.env.ANTHROPIC_API_KEY)
    return "Site Brain is not fully wired up yet (missing ANTHROPIC_API_KEY) — ask the admin to finish setup.";

  let out;
  try {
    out = parseJson(await callAnthropic(buildPrompt(state, who, text)));
  } catch (e) {
    console.error("brain error:", e);
    return "Hit a snag reading that one — try rephrasing, or mention the site by name (e.g. 42-17).";
  }

  try {
    applyUpdates(state, out.site_id, who, text, out.updates);
    if (out.updates?.new_site) addNewSite(state, who, out.updates.new_site);
  } catch (e) {
    console.error("apply error:", e);
  }

  const matched = findSite(state, out.site_id);
  state.feed.unshift({ ts: Date.now(), who, site_id: matched ? matched.id : null, text, reply: out.reply || "Logged." });
  state.feed = state.feed.slice(0, 50);

  return out.reply || "Logged.";
}

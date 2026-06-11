import { ago } from "./time";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function enRouteList(s) {
  if (Array.isArray(s.crew_en_route)) return s.crew_en_route;
  if (s.crew_en_route && typeof s.crew_en_route === "object") return [s.crew_en_route];
  return [];
}

function siteContext(s) {
  const lines = [];
  lines.push(`SITE ${s.id} (${s.name}, ${s.type}) — status: ${s.status.toUpperCase()}${s.emergency ? " ⚠ ACTIVE EMERGENCY" : ""} — priority ${s.priority || "C"}${s.bpd ? ` (${s.bpd} bbl/day)` : ""}`);
  const enr = enRouteList(s);
  if (enr.length)
    lines.push(`  Crews en route: ${enr.map((c) => `${c.name} [${c.team || c.skill || "?"}] ETA ${c.eta}`).join("; ")}`);
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

function senderTeam(state, who) {
  const crews = Array.isArray(state.crews) ? state.crews : [];
  const w = who.toLowerCase();
  for (const c of crews) {
    if ((c.members || []).some((m) => m.toLowerCase() === w || w.startsWith(m.toLowerCase().split(" ")[0]) || m.toLowerCase().startsWith(w.split(" ")[0])))
      return c.team;
  }
  return null;
}

function buildPrompt(state, who, text) {
  const sites = state.sites.map(siteContext).join("\n\n");
  const crews = Array.isArray(state.crews) ? state.crews : [];
  const roster = crews.map((c) => `- ${c.team}: ${(c.members || []).join(", ") || "(nobody)"}`).join("\n");
  const team = senderTeam(state, who);
  return `You are SITE BRAIN — the shared memory and dispatcher's assistant for an oil & gas field (${state.field}). Field crews text you what they did, and ask you questions before driving out. You keep every site's story straight and always know WHICH TYPE OF CREW a job needs.

FIELD ROSTER (team → members):
${roster}

The sender "${who}" is ${team ? `on the ${team} team` : "NOT in the roster (treat as general crew; if they report field work, you may suggest adding them to a team)"}.

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
    "crew_en_route": {"add": [{"name": "...", "team": "PUMPER|MECHANIC|ELECTRIC (I&E)|BATTERY|SCADA/IT|HSE|<other>", "eta": "..."}], "remove": ["<name>" or "all"]} | null,
    "roster": {"add": [{"name": "...", "team": "..."}], "remove": ["<name>"]} | null,
    "log": {"summary": "<third-person summary of work reported>", "parts_taken": [], "parts_left": []} | null,
    "open_items_add": ["<new open item text>"],
    "open_items_resolve": ["<open item id like oi-1>"],
    "emergency": true | "clear" | null,
    "new_site": {"id": "<SHORT-ID>", "name": "<display name>", "type": "well" | "pad" | "battery" | "swd", "lat": <number or null>, "lng": <number or null>} | null,
    "trip_avoided": true | null
  }
}

Rules:
- Match site names loosely: "42-17", "well 42 17", "hartley" etc. If the message names no site but clearly continues about one, pick the best match; otherwise site_id null.
- "Heading to X" => crew_en_route.add with their name, their ROSTER TEAM (or stated team), eta if stated else "en route". Also intent is usually "question" if they ask status — answer it.
- CREW TYPES MATTER: when recommending who to send, name the TEAM the job needs (VFD/electrical → ELECTRIC (I&E); gearbox/pumping unit → MECHANIC; tanks/hatches/separators → BATTERY; routine rounds → PUMPER; automation/comms → SCADA/IT; safety/incidents → HSE). If the wrong team is en route or proposed, say so.
- Dispatching a team without a named person ("send electric out to 53-1") => crew_en_route.add {"name": "Unassigned", "team": "ELECTRIC (I&E)", "eta": "..."}.
- Multiple crews can be en route to one site; only remove the people who arrived/finished/cancelled.
- ROSTER: "add NAME to the battery crew" / "NAME joined I&E" => roster.add. "Remove NAME" / "NAME left the company" => roster.remove (also remove them from any crew_en_route via the site updates if relevant).
- Work reported done => log entry, third person. If they fixed the down/attention issue, set status accordingly, resolve the matching open item ids, and crew_en_route.remove that person.
- Parts/equipment taken or left MUST go in parts_taken/parts_left.
- New problems reported => open_items_add, and status "down" (well not producing) or "attention" (degraded/needs work).
- REPLY STYLE: terse field dispatcher over SMS. Plain English, 1-4 short sentences. When answering "what's the status", lead with last visit (when, who, what), then what's NOT on site anymore, then what's open and what crew/equipment the job needs. Never invent history — only use what's in the field state. If you don't know, say so.
- EMERGENCIES: reports of fire, explosion, blowout, spill, H2S release, injury, or anything life/environment-threatening => set "emergency": true, status "down" (or "attention" if site still producing), add an open item describing it, and your reply MUST tell them to get to safety / account for people and that the site is flagged for emergency response. When someone reports the emergency is resolved or a false alarm => "emergency": "clear".
- NEW SITES: if asked to add/register a new site/well/pad/battery ("add a new well 88-4", "register Pecos Pad B") => fill "new_site". Create a SHORT-ID from the name (e.g. "88-4", "PECOS-PAD-B"). If they gave coordinates or a clear relative location ("half a mile south of Midkiff SWD" — estimate from that site's lat/lng), set lat/lng; otherwise null and say the site was placed near the field center until someone confirms coordinates. site_id stays null for new-site requests.
- PRIORITY TRIAGE: priority A sites carry the most production value — a day of downtime on an A well costs far more than any truck roll. When jobs compete or someone asks "what first?", order by: active emergencies → A-priority DOWN → B DOWN → A/B attention → C. Say why ("42-17 is an A well, 310 bbl/day deferred").
- "trip_avoided": set true when your information prevented a wasted truck roll — e.g. you told them a part is NOT on site before they drove out, a visit was cancelled because work was already done, a wrong-team dispatch was caught, or a scheduled crew run was cancelled as unneeded.
- "/briefing" or any ask for a field briefing/summary => intent "question". Give a crisp field-wide rundown in this order: ⚠ emergencies, DOWN sites by priority (with what crew each needs), crews en route, top open items. Keep it scannable, under 150 words. updates all null.
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

  let enr = enRouteList(site);
  const cu = u.crew_en_route;
  if (cu === "clear") enr = [];
  else if (cu && typeof cu === "object") {
    if (Array.isArray(cu.remove)) {
      if (cu.remove.some((r) => String(r).toLowerCase() === "all")) enr = [];
      else
        enr = enr.filter(
          (c) => !cu.remove.some((r) => (c.name || "").toLowerCase().includes(String(r).toLowerCase().split(" ")[0]))
        );
    }
    const adds = Array.isArray(cu.add) ? cu.add : cu.name ? [cu] : [];
    for (const c of adds) {
      if (!c) continue;
      const name = c.name || who;
      if (enr.some((x) => (x.name || "").toLowerCase() === name.toLowerCase())) continue;
      enr.push({ name, team: (c.team || c.skill || "CREW").toUpperCase(), eta: c.eta || "en route" });
    }
  }
  site.crew_en_route = enr;

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

  if (Array.isArray(u.open_items_resolve)) {
    const before = site.open_items.length;
    site.open_items = site.open_items.filter((o) => !u.open_items_resolve.includes(o.id));
    if (!state.metrics) state.metrics = { trips_avoided: 0, items_closed: 0 };
    state.metrics.items_closed += before - site.open_items.length;
  }

  if (u.emergency === true) site.emergency = true;
  else if (u.emergency === "clear" || u.emergency === false) site.emergency = false;
}

function applyRoster(state, r) {
  if (!r) return;
  if (!Array.isArray(state.crews)) state.crews = [];
  if (Array.isArray(r.add))
    for (const m of r.add) {
      if (!m?.name || !m?.team) continue;
      const t = String(m.team).toUpperCase();
      let team = state.crews.find((c) => c.team === t);
      if (!team) {
        team = { team: t, members: [] };
        state.crews.push(team);
      }
      if (!team.members.some((x) => x.toLowerCase() === m.name.toLowerCase())) team.members.push(m.name);
    }
  if (Array.isArray(r.remove))
    for (const name of r.remove) {
      for (const team of state.crews)
        team.members = (team.members || []).filter((x) => x.toLowerCase() !== String(name).toLowerCase());
    }
  state.crews = state.crews.filter((c) => (c.members || []).length > 0 || ["PUMPER", "MECHANIC", "ELECTRIC (I&E)", "BATTERY", "SCADA/IT", "HSE"].includes(c.team));
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
    priority: "C",
    bpd: null,
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
    if (out.updates?.roster) applyRoster(state, out.updates.roster);
    if (out.updates?.trip_avoided === true) {
      if (!state.metrics) state.metrics = { trips_avoided: 0, items_closed: 0 };
      state.metrics.trips_avoided += 1;
    }
  } catch (e) {
    console.error("apply error:", e);
  }

  const matched = findSite(state, out.site_id);
  state.feed.unshift({ ts: Date.now(), who, site_id: matched ? matched.id : null, text, reply: out.reply || "Logged." });
  state.feed = state.feed.slice(0, 50);

  return out.reply || "Logged.";
}

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ago } from "@/lib/time";

const FieldMap = dynamic(() => import("@/components/FieldMap"), { ssr: false });

export default function Dashboard() {
  const [state, setState] = useState(null);
  const [selected, setSelected] = useState("42-17");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [pendingPin, setPendingPin] = useState(null); // {lat, lng}
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("well");
  const [savingSite, setSavingSite] = useState(false);
  const feedRef = useRef(null);

  async function refresh() {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {}
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, []);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      await fetch("/api/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ who: "Dispatcher", text }),
      });
      await refresh();
    } finally {
      setSending(false);
    }
  }

  async function reseed() {
    if (!confirm("Reset the demo field to its seeded state?")) return;
    await fetch("/api/seed", { method: "POST" });
    await refresh();
  }

  function startAdd() {
    setAddMode(true);
    setPendingPin(null);
    setNewName("");
    setNewType("well");
  }

  function cancelAdd() {
    setAddMode(false);
    setPendingPin(null);
  }

  async function saveSite() {
    if (!pendingPin || !newName.trim() || savingSite) return;
    setSavingSite(true);
    try {
      const res = await fetch("/api/site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), type: newType, lat: pendingPin.lat, lng: pendingPin.lng, who: "Dispatcher" }),
      });
      const data = await res.json();
      if (data.ok) {
        cancelAdd();
        await refresh();
        setSelected(data.site.id);
      }
    } finally {
      setSavingSite(false);
    }
  }

  const sites = state?.sites || [];
  const site = sites.find((s) => s.id === selected) || null;
  const down = sites.filter((s) => s.status === "down").length;
  const attn = sites.filter((s) => s.status === "attention").length;
  const enroute = sites.filter((s) => s.crew_en_route).length;
  const emg = sites.filter((s) => s.emergency).length;

  return (
    <div className="app">
      <header className="hdr">
        <span className="logo">⬢ SITE BRAIN</span>
        <span className="field">{state?.field || "loading…"}</span>
        <span className="spacer" />
        <span className="stat"><b>{sites.length}</b> SITES</span>
        <span className="stat" style={{ color: down ? "var(--red)" : undefined }}><b>{down}</b> DOWN</span>
        <span className="stat" style={{ color: attn ? "var(--amber)" : undefined }}><b>{attn}</b> ATTENTION</span>
        {emg > 0 && <span className="stat" style={{ color: "var(--red)" }}>⚠ <b>{emg}</b> EMERGENCY</span>}
        <span className="stat"><b>{enroute}</b> CREW EN ROUTE</span>
        <button onClick={addMode ? cancelAdd : startAdd} style={addMode ? { color: "var(--orange)", borderColor: "var(--orange)" } : undefined}>
          {addMode ? "✕ CANCEL" : "+ ADD SITE"}
        </button>
        <button onClick={reseed}>RESET DEMO</button>
      </header>

      <div className="main">
        <div className={`mapwrap ${addMode ? "adding" : ""}`}>
          <div id="map" />
          <FieldMap
            sites={sites}
            selectedId={selected}
            onSelect={setSelected}
            addMode={addMode}
            onMapClick={(lat, lng) => setPendingPin({ lat, lng })}
            pendingPin={pendingPin}
          />
          {addMode && !pendingPin && (
            <div className="addbanner">CLICK THE MAP WHERE THE NEW SITE IS</div>
          )}
          {addMode && pendingPin && (
            <div className="addform">
              <div className="addform-title">NEW SITE · {pendingPin.lat.toFixed(4)}, {pendingPin.lng.toFixed(4)}</div>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveSite()}
                placeholder="Name, e.g. Well 91-2"
              />
              <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                <option value="well">Well</option>
                <option value="pad">Pad</option>
                <option value="battery">Tank battery</option>
                <option value="swd">SWD</option>
              </select>
              <div className="addform-row">
                <button className="ghost" onClick={cancelAdd}>CANCEL</button>
                <button className="primary" onClick={saveSite} disabled={!newName.trim() || savingSite}>
                  {savingSite ? "SAVING…" : "ADD SITE"}
                </button>
              </div>
            </div>
          )}
          <div className="legend">
            <div className="row"><span className="dot" style={{ background: "var(--green)" }} /> ONLINE</div>
            <div className="row"><span className="dot" style={{ background: "var(--amber)" }} /> NEEDS ATTENTION</div>
            <div className="row"><span className="dot" style={{ background: "var(--red)" }} /> DOWN</div>
            <div className="row"><span className="dot" style={{ border: "1.5px dashed var(--muted)", background: "transparent" }} /> CREW EN ROUTE</div>
          </div>
        </div>

        <aside className="side">
          <div className="scroll">
            {site ? (
              <>
                <div className="sechead">Site detail</div>
                <div className="detail">
                  <h2>
                    {site.name}
                    <span className={`badge ${site.status}`}>{site.status.toUpperCase()}</span>
                    {site.emergency && <span className="badge emergency">⚠ EMERGENCY</span>}
                  </h2>
                  <div className="kv">
                    <div className="k">Crew en route</div>
                    <div className={`v ${site.crew_en_route ? "" : "dim"}`}>
                      {site.crew_en_route
                        ? `${site.crew_en_route.name}${site.crew_en_route.skill ? ` — ${site.crew_en_route.skill}` : ""} · ETA ${site.crew_en_route.eta}`
                        : "Nobody headed here"}
                    </div>

                    <div className="k">Open items ({site.open_items.length})</div>
                    {site.open_items.length === 0 && <div className="v dim">None</div>}
                    {site.open_items.map((o) => (
                      <div key={o.id} className="openitem">
                        {o.text}
                        <div className="when">OPENED {ago(o.created).toUpperCase()}</div>
                      </div>
                    ))}

                    <div className="k">Parts / equipment on site</div>
                    <div className={`v ${site.parts_on_pad.length ? "" : "dim"}`}>
                      {site.parts_on_pad.length ? site.parts_on_pad.join(" · ") : "Nothing staged"}
                    </div>

                    <div className="k">Visit history</div>
                    {site.log.map((e, i) => (
                      <div key={i} className="logentry">
                        <div className="meta"><b>{e.who}</b> · {ago(e.ts).toUpperCase()} · VIA {String(e.via).toUpperCase()}</div>
                        {e.summary}
                        {(e.parts_taken?.length || e.parts_left?.length) ? (
                          <div className="parts">
                            {e.parts_taken?.length ? <div className="took">− TOOK: {e.parts_taken.join(", ")}</div> : null}
                            {e.parts_left?.length ? <div className="left">+ LEFT: {e.parts_left.join(", ")}</div> : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            <div className="sechead">All sites</div>
            <div className="sitelist">
              {sites.map((s) => (
                <div key={s.id} className={`siterow ${s.id === selected ? "sel" : ""}`} onClick={() => setSelected(s.id)}>
                  <span className="dot" style={{ background: s.status === "online" ? "var(--green)" : s.status === "down" ? "var(--red)" : "var(--amber)" }} />
                  <span className="nm">{s.name}</span>
                  <span className="sub">
                    {s.crew_en_route ? "CREW EN ROUTE · " : ""}
                    {s.open_items.length ? `${s.open_items.length} OPEN` : "CLEAR"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="feed">
            <div className="sechead">Live text thread</div>
            <div className="feedscroll" ref={feedRef}>
              {(state?.feed || []).length === 0 && (
                <div className="empty">No messages yet — text the Telegram bot or type below.</div>
              )}
              {(state?.feed || []).map((m, i) => (
                <div key={i} className="msg">
                  <div className="who"><b>{m.who}</b> · {ago(m.ts).toUpperCase()}{m.site_id ? ` · ${m.site_id}` : ""}</div>
                  <div className="bubble">{m.text}</div>
                  <div className="brain">
                    <div className="tag">SITE BRAIN</div>
                    {m.reply}
                  </div>
                </div>
              ))}
            </div>
            <div className="composer">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder='Try: "Heading to 42-17, what&apos;s the status?"'
                disabled={sending}
              />
              <button onClick={send} disabled={sending || !draft.trim()}>
                {sending ? "…" : "SEND"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

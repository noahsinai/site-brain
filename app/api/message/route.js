import { getState, saveState } from "@/lib/state";
import { brainProcess } from "@/lib/brain";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dashboard composer — same pipeline as Telegram, for demos without a phone.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const text = (body.text || "").trim();
  if (!text) return Response.json({ error: "empty" }, { status: 400 });
  const who = (body.who || "Dispatcher").slice(0, 40);

  const state = await getState();
  const reply = await brainProcess(state, who, text);
  await saveState(state);
  return Response.json({ reply });
}

// GET variant for environments that can't POST (testing/automation).
export async function GET(req) {
  const u = new URL(req.url);
  const text = (u.searchParams.get("text") || "").trim();
  if (!text) return Response.json({ error: "text param required" }, { status: 400 });
  const who = (u.searchParams.get("who") || "Dispatcher").slice(0, 40);
  const state = await getState();
  const reply = await brainProcess(state, who, text);
  await saveState(state);
  return Response.json({ reply });
}

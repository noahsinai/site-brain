import { resetState } from "@/lib/state";

export const dynamic = "force-dynamic";

// Reset the demo to its seeded state. GET for convenience, POST for buttons.
export async function GET() {
  await resetState();
  return Response.json({ ok: true, message: "Demo field re-seeded." });
}

export async function POST() {
  await resetState();
  return Response.json({ ok: true, message: "Demo field re-seeded." });
}

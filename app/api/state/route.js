import { getState } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getState();
  return Response.json(state, { headers: { "cache-control": "no-store" } });
}

import { list } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET() {
  const out = {
    has_blob_token: !!process.env.BLOB_READ_WRITE_TOKEN,
    has_anthropic_key: !!process.env.ANTHROPIC_API_KEY,
    now: Date.now(),
  };
  try {
    const { blobs } = await list({ prefix: "site-brain/", limit: 1000 });
    out.blobs = blobs.map((b) => ({ pathname: b.pathname, uploadedAt: b.uploadedAt, size: b.size }));
  } catch (e) {
    out.list_error = String(e);
  }
  return Response.json(out, { headers: { "cache-control": "no-store" } });
}

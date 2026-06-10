export const dynamic = "force-dynamic";

// One-shot: registers this deployment as the bot's webhook.
// Only ever points the webhook at this app's own production URL.
export async function GET(req) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return Response.json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });

  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || new URL(req.url).host;
  const url = `https://${host}/api/telegram`;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
      drop_pending_updates: true,
      allowed_updates: ["message"],
    }),
  });
  const set = await res.json();

  const info = await (await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)).json();
  const me = await (await fetch(`https://api.telegram.org/bot${token}/getMe`)).json();

  return Response.json({
    webhook_target: url,
    setWebhook: set,
    webhookInfo: info.result || info,
    bot: me.result ? { username: me.result.username, name: me.result.first_name } : me,
  });
}

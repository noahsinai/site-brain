import { getState, saveState } from "@/lib/state";
import { brainProcess } from "@/lib/brain";
import { sendTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WELCOME = `This is SITE BRAIN for the West Spraberry demo field.

Text me like you'd text the crew:
• "Heading to 42-17, what's the status?"
• "Swapped the motor on 42-17, well's back online. Left the old one on the pad."
• "Who was at Hartley last?"
• /briefing — full field rundown: emergencies, down wells by priority, crews rolling

I know every site's history, which team each job needs, and which wells are worth the most.`;

export async function POST(req) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected && req.headers.get("x-telegram-bot-api-secret-token") !== expected)
    return new Response("forbidden", { status: 403 });

  let update;
  try {
    update = await req.json();
  } catch {
    return Response.json({ ok: true });
  }

  const msg = update.message || update.edited_message;
  if (!msg?.text || !msg.chat?.id) return Response.json({ ok: true });

  const chatId = msg.chat.id;
  const who = msg.from?.first_name
    ? `${msg.from.first_name}${msg.from.last_name ? " " + msg.from.last_name[0] + "." : ""}`
    : "Crew";

  try {
    if (msg.text.startsWith("/start") || msg.text.startsWith("/help")) {
      await sendTelegram(chatId, WELCOME);
      return Response.json({ ok: true });
    }
    const state = await getState();
    const reply = await brainProcess(state, who, msg.text);
    await saveState(state);
    await sendTelegram(chatId, reply);
  } catch (e) {
    console.error("webhook error:", e);
    try {
      await sendTelegram(chatId, "Something went sideways on my end — try again in a minute.");
    } catch {}
  }
  return Response.json({ ok: true });
}

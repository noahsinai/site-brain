# Site Brain — Field Demo

A living brain for every well site, fed by text messages. Crews text a Telegram bot what they did; an LLM reads each message, files it to the right site, and answers questions from the full history. A live map dashboard shows every site's status, open items, parts on pad, and the running text thread.

Built as a working demo of the "OT Fieldsite Brain" pilot proposal.

## How it works

```
Telegram message ──► /api/telegram (webhook)
                          │
                          ▼
                  Claude (Anthropic API)
            parses: site, intent, work done,
            parts taken/left, status changes
                          │
                          ▼
                Vercel Blob (state.json)
                          │
                          ▼
            Dashboard polls /api/state every 4s
        (Leaflet map · site detail · live thread)
```

## Environment variables

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | LLM parsing + replies |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Any random string; verified on every webhook call |
| `BLOB_READ_WRITE_TOKEN` | Auto-added when you create a Vercel Blob store |
| `ANTHROPIC_MODEL` | Optional, defaults to `claude-sonnet-4-6` |

## Deploy

1. Push to GitHub, import the repo in Vercel.
2. In the Vercel project: **Storage → Create Blob store** (adds `BLOB_READ_WRITE_TOKEN`).
3. Add the env vars above, redeploy.
4. Point Telegram at the deployment:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-app>.vercel.app/api/telegram&secret_token=<SECRET>"
```

5. Seed the demo field: open `https://<your-app>.vercel.app/api/seed`.

## Demo script

- Text the bot: `Heading to 42-17, what's the status?` → it recounts the last visit, warns the spare motor is gone, says to send a mechanic + crane truck.
- Text: `Swapped the motor on 42-17, well's back online. Left the old one on the pad.` → 42-17 turns green on the map, the open item closes, the old motor appears in on-pad inventory.
- `Who was at Hartley last?`, `Anything open on the south wells?` — it answers from history.
- **RESET DEMO** button (or `GET /api/seed`) restores the seeded field.

The dashboard composer feeds the same pipeline — you can run the whole demo without a phone.

## Local dev

```bash
npm install
ANTHROPIC_API_KEY=sk-... npm run dev
```

Without `BLOB_READ_WRITE_TOKEN`, state lives in memory (fine for local dev).

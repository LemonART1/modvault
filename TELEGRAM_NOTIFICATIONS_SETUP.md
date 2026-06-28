# Telegram notifications setup

Sends a Telegram message to the site owner whenever someone reports a mod
(`mod_reports`), posts a comment (`mod_comments`), or registers an account
(`profiles`). No server of your own is needed - Supabase Database Webhooks
call an Edge Function, which calls the Telegram Bot API.

## 1. Create the bot

1. In Telegram, message **@BotFather** -> `/newbot` -> follow the prompts.
2. Save the token it gives you (looks like `123456789:ABC-defGhIjk...`).
3. Send any message (e.g. "hi") to your new bot from your own account, so
   it has something to read in the next step.

## 2. Get your chat id

Open this URL in a browser, with your real token in place of `<TOKEN>`:

```
https://api.telegram.org/bot<TOKEN>/getUpdates
```

Find `"chat":{"id":...}` in the response - that number is your `chat_id`.

## 3. Deploy the Edge Function

The function code lives at `supabase/functions/notify-telegram/index.ts`
in this repo. Deploy it via the Supabase Dashboard:

1. Supabase Dashboard -> **Edge Functions** -> **Deploy a new function**.
2. Name it `notify-telegram`, paste in the contents of
   `supabase/functions/notify-telegram/index.ts`, deploy.
3. Go to the function's **Secrets** and add:
   - `TELEGRAM_BOT_TOKEN` - the token from step 1
   - `TELEGRAM_CHAT_ID` - the id from step 2
   - `WEBHOOK_SECRET` - any random string you make up (e.g. a long password)
4. Copy the function's URL (Dashboard shows it, looks like
   `https://<project-ref>.supabase.co/functions/v1/notify-telegram`).

## 4. Create the Database Webhooks

Supabase Dashboard -> **Database** -> **Webhooks** -> **Create a new hook**.
Repeat this three times, once per table:

| Table | Events | URL | HTTP Headers |
|---|---|---|---|
| `mod_reports` | Insert | the function URL from step 3 | `x-webhook-secret: <your WEBHOOK_SECRET>` |
| `mod_comments` | Insert | same URL | same header |
| `profiles` | Insert | same URL | same header |

That's it - no code on the website itself changes. Test by submitting a
report on any mod page; you should get a Telegram message within a couple
seconds. If nothing arrives, check the Edge Function's **Logs** tab in the
Supabase Dashboard for errors (wrong token, wrong chat id, etc).

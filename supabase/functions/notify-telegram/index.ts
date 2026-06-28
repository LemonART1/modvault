// Supabase Edge Function: relays Database Webhook events (new mod report,
// new comment, new profile/registration) to a Telegram chat via the
// Telegram Bot API. Deploy this through the Supabase Dashboard's Edge
// Functions tab (or `supabase functions deploy notify-telegram` with the
// CLI) - see TELEGRAM_NOTIFICATIONS_SETUP.md for the full setup.
//
// Required function secrets (Dashboard > Edge Functions > Secrets):
//   TELEGRAM_BOT_TOKEN  - token from @BotFather
//   TELEGRAM_CHAT_ID    - your personal chat id
//   WEBHOOK_SECRET      - any random string; must match the header the
//                         Database Webhook sends, so this endpoint can't
//                         be triggered by a random visitor who finds the URL.

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (secret && req.headers.get("x-webhook-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json();
  const { table, record } = payload;
  const text = buildMessage(table, record);
  if (!text) return new Response("ignored", { status: 200 });

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  return new Response("ok", { status: 200 });
});

function buildMessage(table: string, record: Record<string, unknown>): string | null {
  switch (table) {
    case "mod_reports":
      return [
        "New report on mod " + record.mod_id,
        "Reason: " + (record.reason || "(no reason given)")
      ].join("\n");
    case "mod_comments":
      // Only notify on top-level comments and replies alike; both are useful.
      return [
        "New comment from " + record.username,
        "Mod " + record.mod_id + ": " + record.body
      ].join("\n");
    case "profiles":
      return "New account registered: " + (record.username || record.id);
    default:
      return null;
  }
}

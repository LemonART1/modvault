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
  const text = await buildMessage(table, record);
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

// mods.js is the static site's single source of truth for mod data, and is
// not duplicated into a Supabase table - so the mod's title/page is looked
// up by fetching the live file and pattern-matching the one entry, rather
// than keeping a second copy of the catalog in sync.
async function getModInfo(modId: number): Promise<{ title: string; url: string } | null> {
  try {
    const res = await fetch("https://modvault.space/js/data/mods.js");
    const code = await res.text();
    const re = /id:\s*(\d+),\s*game:\s*"([^"]*)",\s*title:\s*"((?:[^"\\]|\\.)*)"/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(code))) {
      if (Number(match[1]) === modId) {
        const game = match[2];
        const title = match[3].replace(/\\"/g, "\"");
        return { title, url: `https://modvault.space/mods/${game}/${slugify(`${modId}-${title}`)}` };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function buildMessage(table: string, record: Record<string, unknown>): Promise<string | null> {
  switch (table) {
    case "mod_reports": {
      const mod = await getModInfo(Number(record.mod_id));
      return [
        "New report on " + (mod ? mod.title : "mod " + record.mod_id),
        "Reason: " + (record.reason || "(no reason given)"),
        ...(mod ? [mod.url] : [])
      ].join("\n");
    }
    case "mod_comments": {
      const mod = await getModInfo(Number(record.mod_id));
      return [
        "New comment from " + record.username,
        "On " + (mod ? mod.title : "mod " + record.mod_id) + ": " + record.body,
        ...(mod ? [mod.url] : [])
      ].join("\n");
    }
    case "profiles":
      return "New account registered: " + (record.username || record.id);
    default:
      return null;
  }
}

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const SITE_URL = "https://modvault.space";

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function write(file, text) {
  fs.writeFileSync(path.join(root, file), text, "utf8");
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absUrl(url) {
  return `${SITE_URL}/${String(url || "").replace(/^\/+/, "")}`;
}

// Clean URL: drop the .html extension and map index.html to the site root,
// so canonical tags and the sitemap use pretty URLs (see netlify.toml).
function cleanUrl(file) {
  return file === "index.html" ? "" : String(file).replace(/\.html$/, "");
}

function metaTags({ title, description, url, image = "images/og-default.svg", type = "website", keywords = "" }) {
  const safeTitle = esc(title);
  const safeDescription = esc(description);
  const safeUrl = esc(absUrl(url));
  const safeImage = esc(absUrl(image));
  return `  <meta name="keywords" content="${esc(keywords || "game mods, PC mods, mod downloads, ModVault")}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${safeUrl}">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="shortcut icon" href="favicon.ico">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="ModVault">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:url" content="${safeUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
  <link rel="alternate" type="application/rss+xml" title="ModVault News &amp; Guides" href="${absUrl("feed.xml")}">`;
}

function stripManagedSeo(html) {
  return html
    .replace(/\n?\s*<meta name="keywords"[^>]*>/g, "")
    .replace(/\n?\s*<meta name="robots"[^>]*>/g, "")
    .replace(/\n?\s*<link rel="canonical"[^>]*>/g, "")
    .replace(/\n?\s*<link rel="icon"[^>]*>/g, "")
    .replace(/\n?\s*<link rel="shortcut icon"[^>]*>/g, "")
    .replace(/\n?\s*<meta property="og:[^"]+"[^>]*>/g, "")
    .replace(/\n?\s*<meta name="twitter:[^"]+"[^>]*>/g, "")
    .replace(/\n?\s*<link rel="alternate" type="application\/rss\+xml"[^>]*>/g, "");
}

function ensureStyles(html, file) {
  html = html.replace(/(<meta name="twitter:image"[^>]*>)\s*(<link rel="stylesheet")/g, "$1\n  $2");

  const styles = ["css/shared.css?v=27"];
  if (gamePages.includes(file)) {
    styles.push("css/gamepage.css?v=6");
  }
  styles.push("css/effects.css?v=6");

  for (const href of styles) {
    // Strip any existing link to this stylesheet (any version, including
    // stale duplicates left by older runs of this script), then add back
    // exactly one fresh link with the current version.
    const base = href.split("?")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingRe = new RegExp(`\\s*<link rel="stylesheet" href="${base}(?:\\?[^"]*)?">`, "g");
    html = html.replace(existingRe, "");
    html = html.replace("</head>", `\n  <link rel="stylesheet" href="${href}">\n</head>`);
  }

  return html;
}

function upsertHead(file, data) {
  let html = read(file);
  html = html.replace(/<title>.*?<\/title>/s, `<title>${esc(data.title)}</title>`);
  if (/<meta name="description" content=".*?">/s.test(html)) {
    html = html.replace(/<meta name="description" content=".*?">/s, `<meta name="description" content="${esc(data.description)}">`);
  } else {
    html = html.replace("</title>", `</title>\n  <meta name="description" content="${esc(data.description)}">`);
  }
  html = stripManagedSeo(html);
  html = html.replace(
    /(<meta name="description" content=".*?">)/s,
    `$1\n${metaTags(data)}`
  );
  html = ensureStyles(html, file);
  write(file, html);
}

function makeSvgIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#05060a"/>
  <path d="M10 47V17h10l12 18 12-18h10v30h-9V30L35 47h-6L19 30v17z" fill="#e8ff00"/>
</svg>`;
  write("favicon.svg", svg);
}

function makeIco() {
  const width = 32;
  const height = 32;
  const xorSize = width * height * 4;
  const andStride = Math.ceil(width / 32) * 4;
  const andSize = andStride * height;
  const dibSize = 40 + xorSize + andSize;
  const ico = Buffer.alloc(6 + 16 + dibSize);
  let o = 0;
  ico.writeUInt16LE(0, o); o += 2;
  ico.writeUInt16LE(1, o); o += 2;
  ico.writeUInt16LE(1, o); o += 2;
  ico[o++] = width;
  ico[o++] = height;
  ico[o++] = 0;
  ico[o++] = 0;
  ico.writeUInt16LE(1, o); o += 2;
  ico.writeUInt16LE(32, o); o += 2;
  ico.writeUInt32LE(dibSize, o); o += 4;
  ico.writeUInt32LE(22, o); o += 4;
  ico.writeUInt32LE(40, o); o += 4;
  ico.writeInt32LE(width, o); o += 4;
  ico.writeInt32LE(height * 2, o); o += 4;
  ico.writeUInt16LE(1, o); o += 2;
  ico.writeUInt16LE(32, o); o += 2;
  ico.writeUInt32LE(0, o); o += 4;
  ico.writeUInt32LE(xorSize + andSize, o); o += 4;
  ico.writeInt32LE(0, o); o += 4;
  ico.writeInt32LE(0, o); o += 4;
  ico.writeUInt32LE(0, o); o += 4;
  ico.writeUInt32LE(0, o); o += 4;

  const yellow = [0, 255, 232, 255];
  const dark = [10, 6, 5, 255];
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const on = (x >= 5 && x <= 9 && y >= 8 && y <= 24) ||
        (x >= 10 && x <= 13 && y >= 8 && y <= 13) ||
        (x >= 14 && x <= 18 && y >= 13 && y <= 20) ||
        (x >= 19 && x <= 22 && y >= 8 && y <= 13) ||
        (x >= 23 && x <= 27 && y >= 8 && y <= 24);
      const color = on ? yellow : dark;
      for (const byte of color) ico[o++] = byte;
    }
  }
  fs.writeFileSync(path.join(root, "favicon.ico"), ico);
}

function makeOgImage() {
  fs.mkdirSync(path.join(root, "images"), { recursive: true });
  write("images/og-default.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#05060a"/>
  <path d="M0 520h1200v110H0z" fill="#0c0d12"/>
  <text x="80" y="260" fill="#e8ff00" font-size="110" font-family="Arial Black, Impact, sans-serif">MOD</text>
  <text x="330" y="260" fill="#dde1f0" font-size="110" font-family="Arial Black, Impact, sans-serif">VAULT</text>
  <text x="86" y="345" fill="#6b738f" font-size="34" font-family="Arial, sans-serif">PC game mods, guides and modding news</text>
  <text x="86" y="555" fill="#363c52" font-size="24" font-family="Arial, sans-serif">modvault.space</text>
</svg>`);
}

function listHtmlFiles(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap(entry => {
    const rel = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) return listHtmlFiles(rel);
    // Match any non-directory .html entry rather than entry.isFile(): on
    // cloud-synced folders (OneDrive Files On-Demand) dehydrated files are
    // reparse points, so isFile() returns false and would silently drop
    // every mod page from the sitemap.
    return !entry.isDirectory() && entry.name.endsWith(".html") ? [rel] : [];
  });
}

const pageMeta = {
  "index.html": {
    title: "ModVault - PC Game Mods Hub",
    description: "Browse PC game mods, modding guides and real modding news for BeamNG.drive, Assetto Corsa, Subnautica 2, GTA V, ETS2, Cyberpunk 2077 and more.",
    keywords: "PC game mods, mod downloads, BeamNG mods, Assetto Corsa mods, GTA V mods, ETS2 mods"
  },
  "news.html": {
    title: "PC Modding News - ModVault",
    description: "Real modding news and update notes for popular PC games, focused on what mod users should watch before downloading or updating mods.",
    keywords: "modding news, PC gaming news, mod updates, game updates"
  },
  "guides.html": {
    title: "Modding Guides - ModVault",
    description: "Practical modding guides for installing, testing, organizing and troubleshooting mods across popular PC games.",
    keywords: "modding guides, how to install mods, PC mods guide"
  },
  "about.html": {
    title: "About ModVault",
    description: "Learn what ModVault is, how the catalog works and how mod reuploads are handled.",
    keywords: "about ModVault, mod catalog"
  },
  "contact.html": {
    title: "Contact ModVault",
    description: "Contact ModVault for questions, corrections, copyright issues or mod page updates.",
    keywords: "contact ModVault, mod takedown, copyright"
  },
  "privacy.html": {
    title: "Privacy Policy - ModVault",
    description: "Read the ModVault privacy policy and learn how the site handles basic local data and contact information.",
    keywords: "privacy policy, ModVault"
  },
  "terms.html": {
    title: "Terms of Use - ModVault",
    description: "Read the ModVault terms of use for browsing, downloads and external mod links.",
    keywords: "terms of use, ModVault"
  },
  "copyright.html": {
    title: "Copyright Policy - ModVault",
    description: "Read the ModVault copyright and takedown policy for reuploaded mod listings.",
    keywords: "copyright policy, mod takedown"
  },
  "account.html": {
    title: "Account - ModVault",
    description: "Create a ModVault account or log in to rate mods and use account features.",
    keywords: "ModVault account, login"
  }
};

const gamePages = ["beamng.html", "assetto.html", "subnautica2.html", "stardew.html", "gta5.html", "ets2.html", "cyberpunk.html", "bg3.html"];
const dataCtx = {};
vm.createContext(dataCtx);
vm.runInContext(`${read("js/data/mods.js")}\nthis.GAMES = GAMES;`, dataCtx);
for (const game of Object.values(dataCtx.GAMES)) {
  pageMeta[`${game.page}.html`] = {
    title: `${game.name} Mods - ModVault`,
    description: game.intro || game.description,
    keywords: `${game.name} mods, ${game.shortName} mods, PC game mods, mod downloads`
  };
}

for (const [file, meta] of Object.entries(pageMeta)) {
  if (fs.existsSync(path.join(root, file))) {
    upsertHead(file, { ...meta, url: cleanUrl(file) });
  }
}

for (const file of gamePages) {
  if (!fs.existsSync(path.join(root, file))) continue;
  let html = read(file);
  html = html.replace('<div class="page">', '<main class="page">');
  html = html.replace("</section></div><footer", "</section></main><footer");
  html = html.replace("</section>\n</div>\n<footer", "</section>\n</main>\n<footer");
  html = html.replace(/<div class="modal-overlay"[\s\S]*?(<script src="js\/data\/mods\.js">)/, "$1");
  write(file, html);
}

makeSvgIcon();
makeIco();
makeOgImage();

write("robots.txt", `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`);

const urls = [
  ...Object.keys(pageMeta),
  ...listHtmlFiles("mods"),
  ...listHtmlFiles("content/news"),
  ...listHtmlFiles("content/guides")
].filter((value, index, arr) => arr.indexOf(value) === index);

const today = new Date().toISOString().slice(0, 10);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${esc(absUrl(cleanUrl(url)))}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url === "index.html" ? "daily" : "weekly"}</changefreq>
    <priority>${url === "index.html" ? "1.0" : url.startsWith("mods/") ? "0.8" : "0.6"}</priority>
  </url>`).join("\n")}
</urlset>
`);

// RSS feed for news + guides. News posts carry a real publish date; guides
// are evergreen how-tos with no date in the data, so their <item> simply
// omits pubDate (optional per the RSS spec) rather than inventing one.
const editorialCtx = {};
vm.createContext(editorialCtx);
vm.runInContext(`${read("js/data/editorial.js")}\nthis.NEWS_POSTS = NEWS_POSTS; this.GUIDE_POSTS = GUIDE_POSTS;`, editorialCtx);
const { NEWS_POSTS, GUIDE_POSTS } = editorialCtx;

function rssItem(post) {
  const pubDate = post.date ? new Date(`${post.date}T12:00:00Z`).toUTCString() : "";
  return `  <item>
    <title>${esc(post.title)}</title>
    <link>${esc(absUrl(post.url))}</link>
    <guid isPermaLink="true">${esc(absUrl(post.url))}</guid>
    <description>${esc(post.summary)}</description>
    <category>${esc(post.tag)}</category>${pubDate ? `\n    <pubDate>${pubDate}</pubDate>` : ""}
  </item>`;
}

const feedItems = [...NEWS_POSTS, ...GUIDE_POSTS.map(g => ({ ...g, date: "" }))];
write("feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>ModVault News &amp; Guides</title>
  <link>${SITE_URL}/</link>
  <description>Real modding news and practical guides for popular PC games, from ModVault.</description>
  <language>en</language>
${feedItems.map(rssItem).join("\n")}
</channel>
</rss>
`);

console.log(`Generated SEO assets for ${urls.length} URLs.`);

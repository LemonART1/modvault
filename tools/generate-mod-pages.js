const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "js", "data", "mods.js");
const dataCode = fs.readFileSync(dataPath, "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${dataCode}\nthis.GAMES = GAMES; this.MODS = MODS;`, context);

const { GAMES, MODS } = context;

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absUrl(url) {
  return `https://modvault.space/${String(url || "").replace(/^\/+/, "")}`;
}

function metaTags({ title, description, image, url, type = "website" }) {
  const safeTitle = esc(title);
  const safeDescription = esc(description);
  const safeImage = esc(absUrl(image || "images/og-default.svg"));
  const safeUrl = esc(absUrl(url));
  return `  <meta name="keywords" content="game mods, PC mods, mod downloads, ${safeTitle}">
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

function getImages(mod) {
  const list = Array.isArray(mod.images) ? mod.images : [mod.image];
  return list.filter(Boolean).slice(0, 3);
}

// Real per-mod rating aggregates from Supabase, fetched once per run.
// Google requires structured-data ratings to match what's actually
// visible on the page, so a mod only gets aggregateRating once it has at
// least one real vote - never a fabricated count.
const SUPABASE_URL = "https://dccmwduvehkdrbxctmhf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_x6V_h5FGKgq-eMF7WqY6eQ_5f2n2dpz";

async function fetchRatingAggregates() {
  const aggregates = new Map();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/mod_ratings?select=mod_id,rating`, {
      headers: { apikey: SUPABASE_ANON_KEY }
    });
    if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
    const rows = await res.json();
    for (const row of rows) {
      const id = Number(row.mod_id);
      const entry = aggregates.get(id) || { count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += Number(row.rating) || 0;
      aggregates.set(id, entry);
    }
  } catch (error) {
    console.warn("Could not fetch live mod ratings, skipping aggregateRating in JSON-LD.", error.message);
  }
  return aggregates;
}

function softwareAppSchema(mod, game, pagePath, image, ratingAggregates) {
  const rating = ratingAggregates.get(Number(mod.id));
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: mod.title,
    description: mod.short,
    url: absUrl(pagePath.replace(/\.html$/, "")),
    applicationCategory: "GameApplication",
    operatingSystem: "Windows",
    softwareVersion: mod.version || undefined,
    fileSize: mod.size || undefined,
    image: image ? absUrl(image) : undefined,
    downloadUrl: mod.downloadUrl || undefined,
    aggregateRating: rating && rating.count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: (rating.sum / rating.count).toFixed(1),
      ratingCount: rating.count
    } : undefined,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    }
  };
  // Escape "</" so a mod title/description can never prematurely close the
  // surrounding <script> tag.
  const json = JSON.stringify(data).replace(/<\//g, "<\\/");
  return `  <script type="application/ld+json">${json}</script>`;
}

// BreadcrumbList structured data mirroring the visible breadcrumb
// (Home > Game > Mod), so Google can show the path in search results.
function breadcrumbSchema(mod, game, pagePath) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absUrl("") },
      { "@type": "ListItem", position: 2, name: game.name, item: absUrl(game.page) },
      { "@type": "ListItem", position: 3, name: mod.title, item: absUrl(pagePath.replace(/\.html$/, "")) }
    ]
  };
  const json = JSON.stringify(data).replace(/<\//g, "<\\/");
  return `  <script type="application/ld+json">${json}</script>`;
}

function catLabelSimple(cat) {
  return String(cat || "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getRelatedMods(mod, limit = 4) {
  const tagSet = new Set((mod.tags || []).filter(Boolean));
  const candidates = MODS.filter(m => m.id !== mod.id && m.game === mod.game && String(m.title || "").trim());
  return candidates
    .map(m => {
      const sharedTags = (m.tags || []).filter(t => tagSet.has(t)).length;
      const score = (m.category === mod.category ? 2 : 0) + sharedTags;
      return { m, score };
    })
    .sort((a, b) => b.score - a.score || a.m.id - b.m.id)
    .slice(0, limit)
    .map(x => x.m);
}

function relatedModsSection(mod) {
  const related = getRelatedMods(mod);
  if (!related.length) return "";
  return `<section class="related-mods-section">
    <h2>Related mods</h2>
    <div class="related-mods-grid">
      ${related.map(m => {
        const image = getImages(m)[0];
        const url = `mods/${m.game}/${slugify(`${m.id}-${m.title}`)}`;
        return `<a class="mod-card" href="${esc(url)}">
          <div class="card-thumb">
            ${image ? `<img src="${esc(image)}" alt="${esc(m.title)}" loading="lazy">` : ""}
            <span class="card-cat">${esc(catLabelSimple(m.category))}</span>
          </div>
          <div class="card-body">
            <div class="card-title">${esc(m.title)}</div>
            <div class="card-desc">${esc(m.short)}</div>
          </div>
        </a>`;
      }).join("")}
    </div>
  </section>`;
}

function staticModContent(mod, game) {
  const images = getImages(mod);
  return `<main class="page" id="mod-detail">
  <section class="mod-detail-hero">
    <div class="container mod-detail-layout">
      <div class="mod-detail-media">
        <div class="mod-detail-main-img">
          ${images[0] ? `<img src="${esc(images[0])}" alt="${esc(mod.title)} screenshot">` : ""}
        </div>
      </div>
      <article class="mod-detail-copy">
        <div class="modal-breadcrumb">
          <a class="bc-back" href="${esc(game.page)}">Back to ${esc(game.shortName)}</a>
          <span class="sep">/</span>
          <span>${esc(game.name)}</span>
        </div>
        <h1 class="modal-title">${esc(mod.title)}</h1>
        <p class="modal-short">${esc(mod.short)}</p>
        <div class="modal-stats" style="--stat-count:3">
          <div class="modal-stat"><span class="stat-val">v${esc(String(mod.version).replace(/^\s*v\.?\s*/i, ""))}</span><span class="stat-lbl">Version</span></div>
          <div class="modal-stat"><span class="stat-val">${esc(mod.size)}</span><span class="stat-lbl">File size</span></div>
          <div class="modal-stat"><span class="stat-val">${esc(game.name)}</span><span class="stat-lbl">Game</span></div>
        </div>
        <div class="modal-tags">${(mod.tags || []).filter(Boolean).map(tag => `<a class="tag" href="${esc(game.page)}?tag=${encodeURIComponent(tag)}">${esc(tag)}</a>`).join("")}</div>
        <a class="modal-dl-btn mod-detail-download" href="${esc(mod.downloadUrl)}" target="_blank" rel="noopener">Download Mod</a>
        <button class="report-link-btn" type="button" onclick="toggleReportForm(${mod.id})">Report a problem with this mod</button>
        <div class="report-form-slot" id="report-form-slot"></div>
      </article>
    </div>
  </section>
  <section class="mod-detail-about">
    <div class="container">
      <article class="modal-desc-section">
        <h2>About this mod</h2>
        <p class="modal-desc-text">${esc(mod.description)}</p>
      </article>
      ${relatedModsSection(mod)}
    </div>
  </section>
  <section class="mod-detail-comments">
    <div class="container">
      <div id="mod-comments"></div>
    </div>
  </section>
</main>`;
}

const nav = `<a href="/" class="nav-link">Home</a><div class="nav-dropdown"><button class="nav-link nav-dropdown-toggle active" type="button">Games</button><div class="nav-dropdown-menu"><a href="beamng" class="nav-dropdown-item"><span>BeamNG</span><span class="nav-dropdown-dot" style="--game-accent:#e8ff00"></span></a><a href="assetto" class="nav-dropdown-item"><span>Assetto</span><span class="nav-dropdown-dot" style="--game-accent:#ff5014"></span></a><a href="subnautica2" class="nav-dropdown-item"><span>Subnautica 2</span><span class="nav-dropdown-dot" style="--game-accent:#00d8ff"></span></a><a href="stardew" class="nav-dropdown-item"><span>Stardew</span><span class="nav-dropdown-dot" style="--game-accent:#7cff6b"></span></a><a href="gta5" class="nav-dropdown-item"><span>GTA V</span><span class="nav-dropdown-dot" style="--game-accent:#56ff9d"></span></a><a href="ets2" class="nav-dropdown-item"><span>ETS2</span><span class="nav-dropdown-dot" style="--game-accent:#ffb13b"></span></a><a href="cyberpunk" class="nav-dropdown-item"><span>Cyberpunk</span><span class="nav-dropdown-dot" style="--game-accent:#ffe600"></span></a><a href="bg3" class="nav-dropdown-item"><span>BG3</span><span class="nav-dropdown-dot" style="--game-accent:#c77dff"></span></a></div></div><a href="news" class="nav-link">News</a><a href="guides" class="nav-link">Guides</a><a href="about" class="nav-link">About</a><a href="contact" class="nav-link">Contact</a><a href="account" class="nav-link">Login</a>`;
const footer = `<footer class="site-footer"><div class="container footer-inner"><a href="/" class="footer-logo">MOD<span>VAULT</span></a><div class="footer-copy">CURATED MODS FOR POPULAR GAMES</div><div class="footer-links"><a href="news">News</a><a href="guides">Guides</a><a href="about">About</a><a href="contact">Contact</a><a href="privacy">Privacy</a><a href="terms">Terms</a><a href="copyright">Copyright</a></div></div></footer>`;

async function main() {
const ratingAggregates = await fetchRatingAggregates();
let count = 0;
// Renaming a mod's title changes its slug, so the old page file is never
// touched again by writeFileSync below - it just sits there as a dead/duplicate
// URL forever (this happened for real: mod 177's old long title left behind
// "177-bmw-m2-g87-high-quality-fully-openable.html" after being shortened).
// Track every page path we actually generate, then delete anything else already
// on disk under mods/<game>/ that isn't in that set.
const generatedPaths = new Set();
for (const mod of MODS.filter(mod => String(mod.title ?? "").trim())) {
  const game = GAMES[mod.game];
  const dir = path.join(root, "mods", mod.game);
  fs.mkdirSync(dir, { recursive: true });
  const pagePath = `mods/${mod.game}/${slugify(`${mod.id}-${mod.title}`)}.html`;
  generatedPaths.add(pagePath);
  const file = path.join(root, pagePath);
  const image = getImages(mod)[0];
  const title = `${mod.title} - Download ${game.name} Mod - ModVault`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <base href="../../">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(mod.short)}">
${metaTags({ title, description: `${mod.short} Download ${mod.title} for ${game.name} on ModVault.`, image, url: pagePath.replace(/\.html$/, ""), type: "article" })}
${softwareAppSchema(mod, game, pagePath, image, ratingAggregates)}
${breadcrumbSchema(mod, game, pagePath)}
  <link rel="stylesheet" href="css/shared.css?v=27">
  <link rel="stylesheet" href="css/effects.css?v=6">
</head>
<body style="--game-accent:${esc(game.accent)}">
<header class="site-header"><div class="container header-inner"><a href="/" class="logo">MOD<span>VAULT</span></a><nav class="header-nav">${nav}</nav>
  <button class="nav-menu-toggle" id="nav-menu-toggle" type="button" aria-label="Toggle menu" aria-expanded="false"><svg class="icon-menu" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 6h16M4 12h16M4 18h16"/></svg><svg class="icon-close" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  </div></header>
${staticModContent(mod, game)}
${footer}
<script src="js/data/mods.js?v=1"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-client.js?v=17"></script>
<script src="js/stats.js?v=11"></script>
<script src="js/site-search.js?v=9"></script>
<script src="js/account.js?v=8"></script>
<script src="js/comments.js?v=6"></script>
<script src="js/reports.js?v=1"></script>
<script src="js/pages/mod-detail.js?v=7"></script>
<script>initModDetail(${mod.id});</script>
</body>
</html>
`;
  fs.writeFileSync(file, html, "utf8");
  count += 1;
}

let removed = 0;
for (const gameKey of Object.keys(GAMES)) {
  const dir = path.join(root, "mods", gameKey);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    const rel = `mods/${gameKey}/${name}`;
    if (!name.endsWith(".html") || generatedPaths.has(rel)) continue;
    fs.unlinkSync(path.join(dir, name));
    console.log(`Removed stale mod page: ${rel}`);
    removed += 1;
  }
}

// Inject a static, crawlable index of every mod into each game landing page.
// The interactive grid (#mods-grid) is rendered by app.js, so Googlebot sees no
// links to individual mod pages there - which leaves them "Discovered, currently
// not indexed". This block gives real internal <a href> links (and is a handy
// browse-all list for users too). Rewritten between markers on every run.
let indexed = 0;
for (const [gameKey, game] of Object.entries(GAMES)) {
  const file = path.join(root, `${game.page}.html`);
  if (!fs.existsSync(file)) continue;
  const gameMods = MODS
    .filter(m => m.game === gameKey && String(m.title ?? "").trim())
    .sort((a, b) => Number(a.id) - Number(b.id));
  if (!gameMods.length) continue;

  const links = gameMods.map(m =>
    `<a href="mods/${gameKey}/${slugify(`${m.id}-${m.title}`)}">${esc(m.title)}</a>`).join("\n        ");
  const block = `<!-- MOD-INDEX:START -->
<section class="mod-index-section"><div class="container">
      <h2 class="mod-index-title">All ${esc(game.name)} mods</h2>
      <nav class="mod-index-links" aria-label="All ${esc(game.name)} mods">
        ${links}
      </nav>
    </div></section>
<!-- MOD-INDEX:END -->`;

  let html = fs.readFileSync(file, "utf8");
  if (/<!-- MOD-INDEX:START -->[\s\S]*?<!-- MOD-INDEX:END -->/.test(html)) {
    html = html.replace(/<!-- MOD-INDEX:START -->[\s\S]*?<!-- MOD-INDEX:END -->/, block);
  } else {
    html = html.replace(/<footer/, `${block}\n<footer`);
  }
  fs.writeFileSync(file, html, "utf8");
  indexed += 1;
}

console.log(`Generated ${count} mod pages.${removed ? ` Removed ${removed} stale page(s).` : ""} Injected mod index into ${indexed} game page(s).`);
}

main();

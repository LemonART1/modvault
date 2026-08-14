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

// Per-game installation guides — unique content injected into every mod page.
// This raises the information value of each page and helps Google see them
// as real, useful content rather than thin template duplicates.
const INSTALL_GUIDES = {
  beamng: [
    "Download the mod file (usually a .zip archive).",
    "Move the file into your BeamNG.drive <code>mods</code> folder: <code>Documents/BeamNG.drive/mods/</code>",
    "Launch the game and open the Mods Manager from the main menu.",
    "Find the mod in the list and activate it.",
    "Start a scenario or free roam to use the new content."
  ],
  ac: [
    "Download the mod archive.",
    "Extract the contents into your Assetto Corsa <code>content</code> folder: <code>steamapps/common/assettocorsa/content/</code>",
    "Cars go to <code>content/cars/</code>, tracks to <code>content/tracks/</code>, apps to <code>content/apps/</code>.",
    "Launch the game — new cars appear in the car selection, tracks in the track list.",
    "For apps, enable them from the in-game app bar."
  ],
  subnautica2: [
    "Download the mod file.",
    "Make sure UE4SS is installed in your game binaries folder.",
    "Extract the mod to <code>Subnautica 2/Win64/ue4ss/Mods/</code> (or <code>WinGDK/Mods/</code> for Game Pass).",
    "Some mods use the <code>~mods</code> Paks folder instead — check the mod description.",
    "Launch the game and verify the mod loads (check <code>UE4SS.log</code> if issues occur)."
  ],
  stardew: [
    "Download the mod.",
    "Install SMAPI (Stardew Modding API) if you haven't already.",
    "Extract the mod into your <code>Stardew Valley/Mods/</code> folder.",
    "Launch the game through SMAPI (not the default Steam shortcut).",
    "Check the SMAPI console for compatibility warnings on startup."
  ],
  gta5: [
    "Download the mod archive.",
    "For add-on vehicles: use OpenIV to place files in <code>dlcpacks</code> and update <code>dlclist.xml</code>.",
    "For scripts: copy <code>.asi</code> and <code>.dll</code> files to your main GTA V folder.",
    "Some mods require Script Hook V or FiveM — check requirements before installing.",
    "Always back up your game files before installing mods."
  ],
  ets2: [
    "Download the mod file (usually <code>.scs</code> or <code>.zip</code>).",
    "Place it in your <code>Euro Truck Simulator 2/mod/</code> folder.",
    "Launch the game and open the Mod Manager from the profile screen.",
    "Activate the mod by double-clicking it and confirming.",
    "Some map mods require DLC — check the mod description for compatibility."
  ],
  cyberpunk: [
    "Download the mod archive.",
    "For REDmods: extract to <code>Cyberpunk 2077/mods/</code> or install via the in-game REDlauncher.",
    "For archive mods: place files in <code>archive/pc/mod/</code> (create the folder if it doesn't exist).",
    "Some mods require Cyber Engine Tweaks or RED4ext — install those first.",
    "Launch the game and check for conflicts in the mod list."
  ],
  rdr2: [
    "Download the mod archive.",
    "Install Lenny's Mod Loader if the mod requires it.",
    "Extract mod files to the appropriate folders in your RDR2 directory.",
    "Some mods use ScriptHookRDR2 — place <code>.asi</code> files in the main game folder.",
    "Always verify game file integrity after removing mods."
  ],
  nierautomata: [
    "Download the mod file.",
    "Many mods require the NieR: Automata Mod Helper or Special K.",
    "Extract files to your <code>NieRAutomata/</code> game folder following the mod's structure.",
    "For texture/model mods, use the mod manager if provided.",
    "Launch the game and verify the changes appear in the main menu or in-game."
  ],
  re4: [
    "Download the mod archive.",
    "Install Fluffy Mod Manager if you haven't already.",
    "Place the mod folder in <code>Fluffy Mod Manager/Games/RE4R/Mods/</code>.",
    "Launch Fluffy Mod Manager, select the mod, and click <strong>Launch Game</strong>.",
    "Some mods require specific load order — arrange them in the manager if needed."
  ],
  starfield: [
    "Download the mod file.",
    "For standard mods: place files in <code>Starfield/Data/</code> (create <code>Data</code> if missing).",
    "Add the mod filename to your <code>StarfieldCustom.ini</code> under <code>[Archive]</code> or use a mod manager.",
    "Some mods require Starfield Script Extender (SFSE) — install that first.",
    "For Xbox/Game Pass versions, mod support is limited — check compatibility."
  ],
  bg3: [
    "Download the mod archive.",
    "Use BG3 Mod Manager for easiest installation.",
    "Place <code>.pak</code> files in <code>Baldurs Gate 3/Mods/</code> and import them in the manager.",
    "Some mods require Norbyte's Script Extender — install that first if needed.",
    "Launch the game through the mod manager to ensure proper load order."
  ]
};

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

// Renders a mod description as an intro paragraph plus a bullet list for
// any "- " lines, so AI-written feature lists show as an actual <ul>
// instead of a wall of text with literal dashes. Descriptions without
// "- " lines (the older single-paragraph style) still render as a plain
// <p>, unchanged.
//
// The AI doesn't always emit real newlines between bullets even when
// asked to - it sometimes writes them inline as "sentence.  - Bullet one.
// - Bullet two." on a single line. Detect that pattern (2+ ". - Capital"
// transitions - a real mid-sentence dash like "Patch 8 - Hotfix 36" never
// follows a period) and split it into the same line format real newlines
// would have produced.
function descriptionLines(description) {
  const raw = String(description ?? "").trim();
  let lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    const bulletTransitions = raw.match(/\.\s+-\s+[A-Z0-9]/g) || [];
    if (bulletTransitions.length >= 2) {
      const parts = raw.split(/\s+-\s+(?=[A-Z0-9])/).map(part => part.trim()).filter(Boolean);
      if (parts.length > 1) lines = [parts[0], ...parts.slice(1).map(part => `- ${part}`)];
    }
  }
  return lines;
}

function descriptionHtml(description) {
  const intro = [];
  const bullets = [];
  for (const line of descriptionLines(description)) {
    if (/^-\s+/.test(line)) bullets.push(line.replace(/^-\s+/, ""));
    else intro.push(line);
  }
  const introHtml = intro.map(p => `<p class="modal-desc-text">${esc(p)}</p>`).join("\n");
  const bulletsHtml = bullets.length
    ? `<ul class="modal-desc-list">${bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>`
    : "";
  return introHtml + bulletsHtml;
}

function absUrl(url) {
  return `https://modvault.space/${String(url || "").replace(/^\/+/, "")}`;
}

function metaTags({ title, description, image, url, type = "website", mature = false }) {
  const safeTitle = esc(title);
  const safeDescription = esc(description);
  const safeImage = esc(absUrl(image || "images/og-default.svg"));
  const safeUrl = esc(absUrl(url));
  return `  <meta name="keywords" content="game mods, PC mods, mod downloads, ${safeTitle}">
  <meta name="robots" content="${mature ? "noindex, follow" : "index, follow"}">${mature ? `
  <meta name="rating" content="RTA-5042-1996-1400-1577-RTA">
  <meta name="rating" content="adult">` : ""}
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

// Renders a game-specific "How to install" section with real, useful steps.
// The content is identical for every mod of the same game, but the *presence*
// of a substantive install guide raises the information value of the page
// and differentiates it from thin template clones.
function installGuideSection(gameKey) {
  const steps = INSTALL_GUIDES[gameKey];
  if (!steps || !steps.length) return "";
  const listItems = steps.map(step => `<li>${step}</li>`).join("");
  return `<article class="install-guide-section">
    <h2>How to install this ${esc(GAMES[gameKey]?.shortName || "mod")}</h2>
    <ol class="install-guide-steps">
      ${listItems}
    </ol>
  </article>`;
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
        ${descriptionHtml(mod.description)}
      </article>
      ${installGuideSection(mod.game)}
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

function gamesDropdownItems() {
  return Object.values(GAMES).map(g =>
    `<a href="${g.page}" class="nav-dropdown-item"><span>${esc(g.shortName)}</span><span class="nav-dropdown-dot" style="--game-accent:${g.accent}"></span></a>`
  ).join("");
}

const nav = `<a href="/" class="nav-link">Home</a><div class="nav-dropdown"><button class="nav-link nav-dropdown-toggle active" type="button">Games</button><div class="nav-dropdown-menu">${gamesDropdownItems()}</div></div><a href="news" class="nav-link">News</a><a href="guides" class="nav-link">Guides</a><a href="about" class="nav-link">About</a><a href="contact" class="nav-link">Contact</a><a href="account" class="nav-link">Login</a>`;
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
${metaTags({ title, description: `${mod.short} Download ${mod.title} for ${game.name} on ModVault.`, image, url: pagePath.replace(/\.html$/, ""), type: "article", mature: !!mod.mature })}
${softwareAppSchema(mod, game, pagePath, image, ratingAggregates)}
${breadcrumbSchema(mod, game, pagePath)}
  <link rel="stylesheet" href="css/shared.css?v=28">
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
<script src="js/account.js?v=9"></script>
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

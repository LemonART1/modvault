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
  <meta name="twitter:image" content="${safeImage}">`;
}

function getImages(mod) {
  const list = Array.isArray(mod.images) ? mod.images : [mod.image];
  return list.filter(Boolean).slice(0, 3);
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
          <div class="modal-stat"><span class="stat-val">v${esc(mod.version)}</span><span class="stat-lbl">Version</span></div>
          <div class="modal-stat"><span class="stat-val">${esc(mod.size)}</span><span class="stat-lbl">File size</span></div>
          <div class="modal-stat"><span class="stat-val">${esc(game.name)}</span><span class="stat-lbl">Game</span></div>
        </div>
        <div class="modal-tags">${(mod.tags || []).filter(Boolean).map(tag => `<a class="tag" href="${esc(game.page)}?tag=${encodeURIComponent(tag)}">${esc(tag)}</a>`).join("")}</div>
        <a class="modal-dl-btn mod-detail-download" href="${esc(mod.downloadUrl)}" target="_blank" rel="noopener">Download Mod</a>
      </article>
    </div>
  </section>
  <section class="mod-detail-about">
    <div class="container">
      <article class="modal-desc-section">
        <h2>About this mod</h2>
        <p class="modal-desc-text">${esc(mod.description)}</p>
      </article>
    </div>
  </section>
</main>`;
}

const nav = `<a href="/" class="nav-link">Home</a><div class="nav-dropdown"><button class="nav-link nav-dropdown-toggle active" type="button">Games</button><div class="nav-dropdown-menu"><a href="beamng" class="nav-dropdown-item"><span>BeamNG</span><span class="nav-dropdown-dot" style="--game-accent:#e8ff00"></span></a><a href="assetto" class="nav-dropdown-item"><span>Assetto</span><span class="nav-dropdown-dot" style="--game-accent:#ff5014"></span></a><a href="subnautica2" class="nav-dropdown-item"><span>Subnautica 2</span><span class="nav-dropdown-dot" style="--game-accent:#00d8ff"></span></a><a href="stardew" class="nav-dropdown-item"><span>Stardew</span><span class="nav-dropdown-dot" style="--game-accent:#7cff6b"></span></a><a href="gta5" class="nav-dropdown-item"><span>GTA V</span><span class="nav-dropdown-dot" style="--game-accent:#56ff9d"></span></a><a href="ets2" class="nav-dropdown-item"><span>ETS2</span><span class="nav-dropdown-dot" style="--game-accent:#ffb13b"></span></a><a href="cyberpunk" class="nav-dropdown-item"><span>Cyberpunk</span><span class="nav-dropdown-dot" style="--game-accent:#ffe600"></span></a><a href="bg3" class="nav-dropdown-item"><span>BG3</span><span class="nav-dropdown-dot" style="--game-accent:#c77dff"></span></a></div></div><a href="news" class="nav-link">News</a><a href="guides" class="nav-link">Guides</a><a href="about" class="nav-link">About</a><a href="contact" class="nav-link">Contact</a><a href="account" class="nav-link">Login</a>`;
const footer = `<footer class="site-footer"><div class="container footer-inner"><a href="/" class="footer-logo">MOD<span>VAULT</span></a><div class="footer-copy">CURATED MODS FOR POPULAR GAMES</div><div class="footer-links"><a href="news">News</a><a href="guides">Guides</a><a href="about">About</a><a href="contact">Contact</a><a href="privacy">Privacy</a><a href="terms">Terms</a><a href="copyright">Copyright</a></div></div></footer>`;

let count = 0;
for (const mod of MODS.filter(mod => String(mod.title ?? "").trim())) {
  const game = GAMES[mod.game];
  const dir = path.join(root, "mods", mod.game);
  fs.mkdirSync(dir, { recursive: true });
  const pagePath = `mods/${mod.game}/${slugify(`${mod.id}-${mod.title}`)}.html`;
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
  <link rel="stylesheet" href="css/shared.css?v=11">
  <link rel="stylesheet" href="css/effects.css?v=6">
</head>
<body style="--game-accent:${esc(game.accent)}">
<header class="site-header"><div class="container header-inner"><a href="/" class="logo">MOD<span>VAULT</span></a><nav class="header-nav">${nav}</nav></div></header>
${staticModContent(mod, game)}
${footer}
<script src="js/data/mods.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-client.js?v=15"></script>
<script src="js/stats.js?v=11"></script>
<script src="js/site-search.js?v=7"></script>
<script src="js/account.js?v=4"></script>
<script src="js/pages/mod-detail.js?v=3"></script>
<script>initModDetail(${mod.id});</script>
</body>
</html>
`;
  fs.writeFileSync(file, html, "utf8");
  count += 1;
}

console.log(`Generated ${count} mod pages.`);

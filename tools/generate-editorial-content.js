const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const games = {
  beamng: { name: "BeamNG.drive", accent: "#e8ff00" },
  ac: { name: "Assetto Corsa", accent: "#ff5014" },
  subnautica2: { name: "Subnautica 2", accent: "#00d8ff" },
  stardew: { name: "Stardew Valley", accent: "#7cff6b" },
  gta5: { name: "GTA V", accent: "#56ff9d" },
  ets2: { name: "Euro Truck Simulator 2", accent: "#ffb13b" },
  cyberpunk: { name: "Cyberpunk 2077", accent: "#ffe600" },
  bg3: { name: "Baldur's Gate 3", accent: "#c77dff" }
};

const nav = `<a href="/" class="nav-link">Home</a><div class="nav-dropdown"><button class="nav-link nav-dropdown-toggle" type="button">Games</button><div class="nav-dropdown-menu"><a href="beamng" class="nav-dropdown-item"><span>BeamNG</span><span class="nav-dropdown-dot" style="--game-accent:#e8ff00"></span></a><a href="assetto" class="nav-dropdown-item"><span>Assetto</span><span class="nav-dropdown-dot" style="--game-accent:#ff5014"></span></a><a href="subnautica2" class="nav-dropdown-item"><span>Subnautica 2</span><span class="nav-dropdown-dot" style="--game-accent:#00d8ff"></span></a><a href="stardew" class="nav-dropdown-item"><span>Stardew</span><span class="nav-dropdown-dot" style="--game-accent:#7cff6b"></span></a><a href="gta5" class="nav-dropdown-item"><span>GTA V</span><span class="nav-dropdown-dot" style="--game-accent:#56ff9d"></span></a><a href="ets2" class="nav-dropdown-item"><span>ETS2</span><span class="nav-dropdown-dot" style="--game-accent:#ffb13b"></span></a><a href="cyberpunk" class="nav-dropdown-item"><span>Cyberpunk</span><span class="nav-dropdown-dot" style="--game-accent:#ffe600"></span></a><a href="bg3" class="nav-dropdown-item"><span>BG3</span><span class="nav-dropdown-dot" style="--game-accent:#c77dff"></span></a></div></div><a href="news" class="nav-link">News</a><a href="guides" class="nav-link">Guides</a><a href="about" class="nav-link">About</a><a href="contact" class="nav-link">Contact</a><a href="account" class="nav-link">Login</a>`;
const footer = `<footer class="site-footer"><div class="container footer-inner"><a href="/" class="footer-logo">MOD<span>VAULT</span></a><div class="footer-copy">CURATED MODS FOR POPULAR GAMES</div><div class="footer-links"><a href="news">News</a><a href="guides">Guides</a><a href="about">About</a><a href="contact">Contact</a><a href="privacy">Privacy</a><a href="terms">Terms</a><a href="copyright">Copyright</a></div></div></footer>`;

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

function metaTags({ title, description, image = "images/og-default.svg", url, type = "article" }) {
  const safeTitle = esc(title);
  const safeDescription = esc(description);
  const safeImage = esc(absUrl(image));
  const safeUrl = esc(absUrl(url));
  return `  <meta name="keywords" content="game mods, PC mods, modding guide, modding news, ${safeTitle}">
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

function makePost({ gameKey, kind, date = "", title, summary, sourceLabel = "", sourceUrl = "", sections }) {
  const game = games[gameKey];
  const folder = kind === "news" ? "news" : "guides";
  return {
    kind,
    date,
    title,
    tag: game.name,
    url: `content/${folder}/${slugify(title)}.html`,
    summary,
    sourceLabel,
    sourceUrl,
    game,
    sections
  };
}

function newsPost(gameKey, date, title, summary, sourceLabel, sourceUrl, angle) {
  return makePost({
    gameKey,
    kind: "news",
    date,
    title,
    summary,
    sourceLabel,
    sourceUrl,
    sections: [
      ["What happened", `${angle} This is a real news item worth tracking because it can change what players search for, what mod pages need to explain and which categories become more important for the next few weeks.`],
      ["Why mod users should care", `A news page should not only repeat a headline. For mod users, the useful part is understanding whether the event affects loaders, multiplayer tools, save files, version compatibility, maps, vehicles, scripts, UI mods or the way people discover content. If a game update or community event changes the modding environment, players need a slower and clearer install routine.`],
      ["What to check before downloading", `Before adding new files, check the date of the mod, required game build, dependency list, comments from other users and whether the mod touches core systems. For vehicles and visual mods, screenshots are usually enough for a first scan. For scripts, maps, UI changes and gameplay tools, version notes matter much more.`],
      ["ModVault angle", `For ModVault, this kind of news is useful because it gives search engines and visitors context around the mod catalog. The goal is to connect a trending game event with practical next steps: what to download, what to avoid, and how to keep a working setup stable while the community reacts.`]
    ]
  });
}

const NEWS_POSTS = [
  newsPost("gta5", "2026-05-26", "RageMP shutdown makes GTA V multiplayer modding news again", "The reported shutdown of RageMP pushed GTA V multiplayer modding back into the spotlight and reminded players how fragile unofficial multiplayer ecosystems can be.", "PC Gamer", "https://www.pcgamer.com/games/action/gta-roleplaying-is-taking-a-huge-hit-as-a-popular-server-mod-is-shutting-down-under-suspicious-circumstances-leaving-fivem-as-take-twos-only-authorized-modding-platform/", "RageMP has been discussed as a major GTA V roleplay and multiplayer platform, so shutdown news is highly relevant for anyone who follows GTA V servers, scripts and mod tools."),
  newsPost("ets2", "2026-05-30", "ETS2 and ATS 1.60 add an expanded rest mechanic", "SCS Software previewed an expanded rest mechanic for update 1.60, making fatigue and route planning a more visible part of truck sim play.", "SCS Software / Steam", "https://store.steampowered.com/news/group/4036972/view/535954474507613616", "The rest mechanic is gameplay-facing, so it matters for players using economy mods, realism mods, route planning tools and long-haul profiles."),
  newsPost("ets2", "2026-05-28", "SCS previews improved material systems for update 1.60", "The 1.60 update preview includes improved material systems, which can affect how trucks, trailers, interiors and map objects look under new lighting.", "SCS Software Blog", "https://blog.scssoft.com/2026/05/160-update-improved-material-system.html", "Material changes are visual, but they still matter for modders because custom assets often need to match the current rendering style."),
  newsPost("ets2", "2026-05-27", "Euro Truck Simulator 2 update 1.60 improves game radio", "SCS showed changes to the in-game radio experience for update 1.60, a smaller feature that still matters to long-session simulator players.", "SCS Software / Steam", "https://store.steampowered.com/news/group/4036972/view/535954474507613526", "Radio and audio features are not as dramatic as a new map, but they affect immersion and can overlap with sound-focused mod setups."),
  newsPost("ets2", "2026-05-23", "ETS2 and ATS 1.60 refresh the job widget", "The job widget is being updated in 1.60, giving truck sim players a cleaner way to read delivery information while driving.", "SCS Software Blog", "https://blog.scssoft.com/2026/05/160-update-job-widget.html", "Interface changes are important for players who use HUD, navigation, economy and route-planning mods."),
  newsPost("ets2", "2026-05-06", "Euro Truck Simulator 2 update 1.59 is live", "ETS2 update 1.59 brought the Benelux Rework and a set of UI, traffic sound and gameplay changes that affect mod compatibility checks.", "SCS Software Blog", "https://blog.scssoft.com/2026/05/euro-truck-simulator-2-159-update.html", "Major truck sim updates are a classic moment when players need to re-check map combos, sound packs, truck mods and profile stability."),
  newsPost("subnautica2", "2026-05-14", "Subnautica 2 enters Early Access", "Subnautica 2 entered Early Access on May 14, 2026, creating a fresh wave of interest around survival tools, console commands and quality-of-life mods.", "Steam", "https://store.steampowered.com/news/app/1962700/view/524436508406925740", "Early Access survival games usually create fast-moving mod demand because players immediately want setup tools, UI fixes and experimentation features."),
  newsPost("ac", "2026-04-15", "Assetto Corsa EVO 0.6 adds Sebring and more cars", "Assetto Corsa EVO Early Access 0.6 added Sebring International Raceway, new cars and server-related improvements for sim racing players.", "Steam", "https://store.steampowered.com/news/app/3058630/view/525886773122485529", "Racing updates are important for mod catalogs because players look for cars, tracks, telemetry tools, filters and multiplayer support."),
  newsPost("ac", "2026-04-16", "Assetto Corsa EVO 0.6.1 follows the Sebring update", "Kunos followed the 0.6 release with a 0.6.1 update, keeping the Early Access cycle active for players watching stability and mod readiness.", "Steam", "https://store.steampowered.com/news/app/3058630/view/525886773122485530", "Small follow-up patches often matter more than they look because they can fix issues that affect apps, tracks and car testing."),
  newsPost("gta5", "2026-05-07", "GTA V Enhanced modding gets new tool support", "Community tool updates around GTA V Enhanced made PC players pay attention to asset conversion and the future of mod support on the newer version.", "GTA BOOM", "https://www.gtaboom.com/gta-5-enhanced-mod-tool-sollumz-update/", "GTA V Enhanced created a split between older setups and newer files, so tool support is important for long-term mod discovery."),
  newsPost("cyberpunk", "2026-03-17", "CD Projekt says Cyberpunk 2077 will not get more major content", "Cyberpunk 2077 is no longer expected to receive major new official content, which makes community mods more important for fresh playthroughs.", "TechRadar", "https://www.techradar.com/gaming/cyberpunk-2077-isnt-getting-any-more-content-after-the-release-of-update-2-21-cd-projekt-says", "When a game leaves its official content cycle, mods often become the main way players refresh visuals, vehicles, UI and immersion."),
  newsPost("cyberpunk", "2025-07-17", "Cyberpunk 2077 update 2.3 adds vehicles and quality-of-life changes", "Cyberpunk 2077 update 2.3 added vehicle content, photo mode improvements and other changes that remain relevant for mod users.", "CD PROJEKT RED", "https://www.cyberpunk.net/en/news/53557/update-2-3-is-live", "Vehicle and UI changes are especially relevant to Cyberpunk mod pages because many popular files touch the same player-facing systems."),
  newsPost("bg3", "2025-04-15", "Baldur's Gate 3 Patch 8 closes the major update era", "Baldur's Gate 3 Patch 8 added long-awaited features and effectively shifted more attention toward community-made content and modded runs.", "Larian Studios", "https://baldursgate3.game/news/patch-8-now-live_142", "When a major RPG reaches its last big patch, players often start looking harder at classes, spells, races, UI tweaks and cosmetic mods."),
  newsPost("bg3", "2025-01-28", "Baldur's Gate 3 Patch 8 stress testing highlighted mod compatibility", "Patch 8 stress testing gave players a preview of how future BG3 changes could affect modded playthroughs and saved campaigns.", "Larian Studios", "https://baldursgate3.game/news/patch-8-stress-test-now-live_137", "Stress tests matter to mod users because they reveal which categories may need updates before a patch reaches everyone."),
  newsPost("ets2", "2026-04-29", "ETS2 Soul of Anatolia adds a new region to watch", "The Soul of Anatolia expansion became a major ETS2 map topic, giving map mod users another region to consider when planning profiles.", "PC Gamer", "https://www.pcgamer.com/games/sim/euro-truck-simulator-2-rolls-out-soul-of-anatolia/", "Map expansions are always important for truck sim modding because they affect map combos, route connectors, traffic mods and long-term profiles.")
].sort((a, b) => String(b.date).localeCompare(String(a.date)));

function guidePost(gameKey, title, summary, focus) {
  return makePost({
    gameKey,
    kind: "guide",
    title,
    summary,
    sections: [
      ["Before you download", `${focus} Start by reading the title, file size, screenshots, tags and description. A useful mod page should make it clear what the file changes and whether any loader, DLC, framework or specific game version is required.`],
      ["Install carefully", `Do not copy files into random folders without checking archive structure. Many install problems come from double-packed zip files, wrong folder levels, old configs or missing dependencies. If a game has a dedicated mods folder, use it. If a mod replaces original files, back up the originals first.`],
      ["Test the mod", `Launch the game after each important install and test the exact thing the mod changes. For vehicles, spawn the car and check textures, dashboard, sound and lights. For maps, load the area and move around. For UI tools, open the menu they change. This catches problems early.`],
      ["Keep it organized", `Store downloaded archives by game and date. When a mod breaks after an update, this makes it much easier to remove or replace only the affected file instead of rebuilding the whole install.`]
    ]
  });
}

const GUIDE_POSTS = [
  guidePost("beamng", "How to install BeamNG.drive car mods", "A practical guide for placing BeamNG.drive vehicle mods in the right folder and testing new cars safely.", "BeamNG.drive vehicle mods are usually distributed as archives, but the important part is knowing whether the archive itself goes into the mods folder or whether it contains another archive inside."),
  guidePost("beamng", "How to check BeamNG.drive car mod quality", "A checklist for judging BeamNG.drive vehicles by screenshots, physics notes, configurations, sounds and interior detail.", "Quality in BeamNG.drive is about more than the model. A good vehicle should look right, deform believably and drive consistently."),
  guidePost("beamng", "How to fix missing textures in BeamNG.drive mods", "Missing textures are common when cache, folder structure or conflicting files go wrong.", "Pink, black or blank materials usually mean the game cannot find a texture or material definition."),
  guidePost("ac", "How to install Assetto Corsa apps and car mods", "Learn the usual install paths for Assetto Corsa car folders, tracks, apps and visual tools.", "Assetto Corsa mods can be cars, tracks, apps, filters or shader-related files, and each type has a slightly different install pattern."),
  guidePost("ac", "How to organize Assetto Corsa filters and apps", "Keep filters, apps, CSP settings and presets organized so visual experiments do not break a stable racing setup.", "Assetto Corsa visual modding can become messy because several tools may change lighting, weather and post-processing at the same time."),
  guidePost("subnautica2", "How to install Subnautica 2 UE4SS mods", "A simple overview of how UE4SS-based Subnautica 2 mods are usually arranged.", "UE4SS-style modding depends on both the loader and the mod folder structure, so the loader version matters as much as the downloaded file."),
  guidePost("subnautica2", "How to test Subnautica 2 gameplay mods safely", "A safe testing routine for Subnautica 2 mods that affect inventory, creatures, vehicles or progression.", "Survival saves are worth protecting. Before testing a mod that changes gameplay, make sure you can return to a clean save."),
  guidePost("stardew", "How to start modding Stardew Valley safely", "A beginner-friendly Stardew Valley modding routine for SMAPI, backups, portraits, UI mods and expansion packs.", "Stardew Valley saves can last for years, so the safest modding habit is to protect the save before changing the game."),
  guidePost("stardew", "How to choose Stardew Valley portrait and visual mods", "A guide to picking portrait, character, building and visual mods that fit the style of your save.", "Visual consistency matters in Stardew Valley because players spend many hours seeing the same characters and farm buildings."),
  guidePost("gta5", "How to browse GTA V vehicle mods without getting lost", "Use tags, screenshots, file size and category labels to find GTA V vehicles faster.", "GTA V has a huge variety of vehicle mods, so discovery is easier when you search by role and style instead of only by brand."),
  guidePost("gta5", "How to separate GTA V scripts, tools and maps", "A practical explanation of why GTA V scripts, tools, maps and vehicles should be managed separately.", "Script-heavy games are easier to troubleshoot when each mod type has its own mental bucket and backup routine."),
  guidePost("ets2", "How to manage ETS2 map mods and load order", "Map combos in Euro Truck Simulator 2 can be fragile, so this guide explains slow testing and load order habits.", "ETS2 maps often depend on other maps, road connections, DLC ownership and a specific game build."),
  guidePost("ets2", "How to install ETS2 truck, trailer and sound mods", "A clean routine for adding truck, trailer, interior and sound mods without damaging a long-running profile.", "Truck simulator profiles are long-term, so every new mod should be easy to remove if it causes issues."),
  guidePost("cyberpunk", "How to manage Cyberpunk 2077 clothing and appearance mods", "Appearance mods can overlap quickly. This guide explains how to test clothing, body, UI and preset files carefully.", "Cyberpunk 2077 modding is often visual, but visual mods can still conflict when they touch the same character or interface files."),
  guidePost("cyberpunk", "How to test Cyberpunk 2077 vehicle and UI mods", "A checklist for checking vehicle mods, UI changes, scripts and visual presets after installation.", "Night City is dense, so a mod should be tested in the exact situation where it is meant to be used."),
  guidePost("bg3", "How to choose Baldur's Gate 3 class and spell mods", "Class and spell mods affect balance, roleplay and progression, so this guide explains what to check before using them.", "Baldur's Gate 3 mods can change both the look and the rules of a playthrough."),
  guidePost("bg3", "How to manage Baldur's Gate 3 cosmetics and UI mods", "A guide to keeping armor, clothing, dice, portrait, UI and character customization mods organized.", "Cosmetic mods are usually safer than mechanics mods, but they still need clear organization when a mod list grows."),
  guidePost("subnautica2", "How to read UE4SS mod requirements", "Learn what to look for when a mod mentions UE4SS, loader folders, config files or enabled mod lists.", "Requirement text can look technical, but most install problems come down to matching the loader version and putting files in the expected folder.")
];

function page(post) {
  const isNews = post.kind === "news";
  const activeNav = nav.replace(
    isNews ? 'href="news" class="nav-link"' : 'href="guides" class="nav-link"',
    isNews ? 'href="news" class="nav-link active"' : 'href="guides" class="nav-link active"'
  );
  const kicker = `${esc(post.tag)}${post.date ? ` / ${esc(post.date)}` : ""}`;
  const source = post.sourceUrl
    ? `<div class="content-panel"><h2>Source</h2><p>This article is based on the linked source and rewritten for ModVault readers.</p><p><a href="${esc(post.sourceUrl)}" target="_blank" rel="noopener">${esc(post.sourceLabel || post.sourceUrl)}</a></p></div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <base href="../../">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(post.title)} - ModVault</title>
  <meta name="description" content="${esc(post.summary)}">
${metaTags({ title: `${post.title} - ModVault`, description: post.summary, url: post.url.replace(/\.html$/, "") })}
  <link rel="stylesheet" href="css/shared.css?v=7">
  <link rel="stylesheet" href="css/effects.css?v=6">
</head>
<body style="--game-accent:${post.game.accent}">
<header class="site-header"><div class="container header-inner"><a href="/" class="logo">MOD<span>VAULT</span></a><nav class="header-nav">${activeNav}</nav></div></header>
<main class="page content-page"><div class="container"><article class="content-hero"><span class="content-kicker">${kicker}</span><h1 class="content-title">${esc(post.title)}</h1><p class="content-lede">${esc(post.summary)}</p></article><section class="content-grid">${post.sections.map(([heading, body]) => `<div class="content-panel"><h2>${esc(heading)}</h2><p>${esc(body)}</p></div>`).join("")}${source}</section></div></main>
${footer}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-client.js?v=14"></script>
<script src="js/stats.js?v=11"></script>
<script src="js/site-search.js?v=7"></script></body>
</html>
`;
}

for (const folder of ["news", "guides"]) {
  fs.mkdirSync(path.join(root, "content", folder), { recursive: true });
}

const wanted = new Set([...NEWS_POSTS, ...GUIDE_POSTS].map(post => path.normalize(path.join(root, post.url))));
for (const folder of ["content/news", "content/guides"]) {
  for (const file of fs.readdirSync(path.join(root, folder))) {
    if (!file.endsWith(".html")) continue;
    const fullPath = path.normalize(path.join(root, folder, file));
    if (!wanted.has(fullPath)) fs.unlinkSync(fullPath);
  }
}

for (const post of [...NEWS_POSTS, ...GUIDE_POSTS]) {
  fs.writeFileSync(path.join(root, post.url), page(post), "utf8");
}

const editorial = `const NEWS_POSTS = ${JSON.stringify(NEWS_POSTS.map(({ date, title, tag, url, summary }) => ({ date, title, tag, url: url.replace(/\.html$/, ""), summary })), null, 2)};

const GUIDE_POSTS = ${JSON.stringify(GUIDE_POSTS.map(({ title, tag, url, summary }) => ({ title, tag, url: url.replace(/\.html$/, ""), summary })), null, 2)};
`;
fs.writeFileSync(path.join(root, "js", "data", "editorial.js"), editorial, "utf8");

console.log(`Generated ${NEWS_POSTS.length} real news posts and ${GUIDE_POSTS.length} guides.`);

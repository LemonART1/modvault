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
  newsPost("ets2", "2026-04-29", "ETS2 Soul of Anatolia adds a new region to watch", "The Soul of Anatolia expansion became a major ETS2 map topic, giving map mod users another region to consider when planning profiles.", "PC Gamer", "https://www.pcgamer.com/games/sim/euro-truck-simulator-2-rolls-out-soul-of-anatolia/", "Map expansions are always important for truck sim modding because they affect map combos, route connectors, traffic mods and long-term profiles."),
  newsPost("beamng", "2026-05-28", "BeamNG.drive confirmed for PS5, with version 0.39 detailed", "BeamNG.drive is coming to PlayStation 5 in 2026, and the studio detailed the parallel Early Access version 0.39 update for PC players.", "Gematsu", "https://www.gematsu.com/2026/05/beamng-drive-coming-to-ps5-in-2026-early-access-version-0-39-update-detailed", "A console release does not change PC modding directly, but it usually brings more attention and more players checking the mods folder for the first time."),
  newsPost("beamng", "2026-06-05", "BeamNG.drive's 2026 modding scene leans into physics tuning and scenarios", "Reporting on BeamNG.drive's 0.38.x cycle highlighted modders focusing on suspension tuning, configurations and complex scenario creation rather than just new vehicles.", "MSN", "https://www.msn.com/en-us/news/other/beamngdrive-2026-modders-master-physics-tuning-and-scenario-creation/gm-GM0E000CD3", "Scenario and physics-focused mods are easy to miss next to flashy car releases, but they often change how a vehicle actually feels to drive."),
  newsPost("beamng", "2026-06-10", "BeamNG.drive's mod catalog passes 37,000 uploads", "Mod repository tracking shows BeamNG.drive has crossed 37,000 total mods, including more than 30,000 vehicles and thousands of maps and trucks.", "ModLand.net", "https://www.modland.net/beamng.drive-mods", "A catalog this size makes filtering by category and current game version more important than ever before downloading anything."),
  newsPost("stardew", "2026-02-24", "Stardew Valley's 10th anniversary livestream teases update 1.7", "ConcernedApe used the Stardew Valley 10th anniversary livestream to confirm new romance options and a future 1.7 update, without a release date yet.", "PC Gamer", "https://www.pcgamer.com/games/life-sim/stardew-valley-1-7-guide/", "A confirmed future update is exactly the moment when players should start checking which of their mods are SMAPI-version sensitive."),
  newsPost("stardew", "2026-03-25", "Ad Astra brings a sci-fi expansion to Stardew Valley", "The Ad Astra mod adds a large free sci-fi themed expansion to Stardew Valley, going well beyond the game's usual farm-life setting.", "GamingBible", "https://www.gamingbible.com/news/stardew-valley-ad-astra-sci-fi-mod-264009-20260325", "Large expansion mods like this usually touch maps, NPCs and quests at once, so a fresh save or a backup is worth doing first."),
  newsPost("stardew", "2026-03-01", "Stardew Valley's Modfest fills March with fan-made content", "Nexus Mods ran a Stardew Valley Modfest to mark a decade in the valley, with creators uploading new mods and joining themed community events.", "ScreenRant", "https://screenrant.com/stardew-valley-new-content-march-2026-mod-event/", "Community events like this are a good time to find newly uploaded mods before they spread across other mod sites."),
  newsPost("stardew", "2026-02-26", "A fresh 2026 list highlights Stardew Valley's most essential mods", "A roundup of essential Stardew Valley mods for 2026 points to expansion packs, quality-of-life tools and cheese-making content as current community favorites.", "GamingBible", "https://www.gamingbible.com/list/news/stardew-valley-best-mods-311134-20260226", "Roundups like this are a fast way to see which mod categories are getting attention right now, even if the exact list changes over time."),
  newsPost("ac", "2026-06-03", "Assetto Corsa EVO 0.7 ships the official Editor Tool SDK", "Assetto Corsa EVO's 0.7 update added the first official release of its Editor Tool SDK, plus a new particle system and four cars.", "Assetto Corsa", "https://assettocorsa.gg/assetto-corsa-evo-early-access-0-7-now-available/", "An official SDK is a turning point for any sim, since it usually means a faster and more consistent flow of community-made cars and tracks."),
  newsPost("ac", "2026-06-04", "Assetto Corsa EVO's 0.7 update marks the start of official modding", "Traxion's coverage of the 0.7 release framed it as the beginning of Assetto Corsa EVO's modding era, with custom cars now possible through the new SDK.", "Traxion", "https://traxion.gg/assetto-corsa-evos-latest-update-marks-the-beginning-of-modding/", "Early modding tools can change quickly, so it is worth watching for SDK updates that affect car and track compatibility."),
  newsPost("ac", "2026-05-12", "Assetto Corsa EVO 0.6.3 focuses on stability fixes", "A 0.6.3 patch for Assetto Corsa EVO targeted crash fixes, aiming to keep the Early Access build stable while modding tools were still in development.", "OverTake.gg", "https://www.overtake.gg/news/assetto-corsa-evo-updated-to-v0-6-3-full-changelog.4452/", "Stability patches matter to anyone testing early mods, since a crash can be hard to tell apart from a bad install."),
  newsPost("ac", "2026-02-05", "Assetto Corsa EVO's 0.5.1 patch addressed early launch issues", "An early 0.5.1 patch fixed a batch of issues from Assetto Corsa EVO's Early Access launch, smoothing out the base the sim's later updates built on.", "OverTake.gg", "https://www.overtake.gg/news/assetto-corsa-evo-to-receive-minor-0-5-1-patch-addressing-launch-issues.4175/", "Early Access launch patches are routine, but they are useful history for understanding why later mod tools were built the way they were."),
  newsPost("subnautica2", "2026-05-16", "Unknown Worlds reflects on Subnautica 2's early access launch", "Unknown Worlds shared an update on Subnautica 2's early access debut, discussing reception after the game's May 14 launch.", "Unknown Worlds", "https://unknownworlds.com/en/news/subnautica-2-coming-2026", "Developer posts like this often hint at the pace of future content drops, which matters for anyone planning long-term mod setups."),
  newsPost("subnautica2", "2026-05-22", "Subnautica 2 hotfix adds more Silver and Troilite resource areas", "A May 22 hotfix expanded Silver locations and late-game Troilite sources in Subnautica 2, alongside fish AI tweaks and performance work.", "Game Rant", "https://gamerant.com/subnautica-2-update-may-22-patch-notes/", "Resource-focused hotfixes can quietly break mods that change spawn rates or material costs, so it is worth re-testing those after an update."),
  newsPost("subnautica2", "2026-06-01", "Subnautica 2's Hotfix 3 eases base-building costs", "Hotfix 3 cut the cost of Interior Walls to a quarter of their previous price and reduced the Nibbler creature's perception range.", "GameBrief", "https://www.gamebrief.net/blog/subnautica-2-update-hotfix-3-whats-next-2026", "Balance hotfixes like this are exactly the kind of change that can make an older creature or building mod feel out of sync with the base game."),
  newsPost("subnautica2", "2026-05-25", "Subnautica 2's EA1.1 roadmap teases new Biomods and a Leviathan zone", "Unknown Worlds outlined an EA1.1 content drop for Subnautica 2 with new Biomods, Blight visibility changes and a teased new Leviathan area.", "Game Rant", "https://gamerant.com/subnautica-2-updates-roadmap-2026/", "A public roadmap is useful for modders too, since it signals which systems are likely to change soon and which ones are safer to build around."),
  newsPost("gta5", "2026-06-01", "NaturalVision Enhanced's June 2026 update pushes GTA V's visuals further", "The NaturalVision Enhanced mod for GTA V Enhanced received a June 2026 update with reworked lighting, vehicle shaders and atmospheric effects.", "GameDecide", "https://gamedecide.com/nve-enhanced-june-2026-update/", "Big visual overhaul mods like NVE often require specific settings or companion files, so checking the latest update notes before installing pays off."),
  newsPost("gta5", "2026-05-20", "A 20,000-prop mega-mod brings GTA V's map into 2026", "A solo modder's environmental overhaul adds roughly 20,000 trees and street props across GTA V's map, refreshing how the world looks more than a decade after release.", "PC Gamer", "https://www.pcgamer.com/games/grand-theft-auto/a-mega-mod-is-kicking-gta-5-into-2026-thanks-to-one-hobbyist-creator-and-roughly-20-000-aggressively-placed-trees-and-street-props/", "Map-wide overhauls like this are ambitious and worth backing up your install before trying, since they touch a huge number of objects at once."),
  newsPost("gta5", "2026-04-10", "A 2026 roundup highlights GTA V's essential story and police mods", "A current roundup of essential GTA V mods points to story-expansion mods and police vehicle overhauls as standout 2026 picks.", "Sportskeeda", "https://www.sportskeeda.com/gta/essential-gta-5-mods-2026", "Story-expansion mods can be some of the most rewarding GTA V downloads, but they usually need a clean game version to avoid script conflicts."),
  newsPost("gta5", "2026-03-01", "What GTA V modding looks like as GTA 6 approaches", "GTA Boom looked at how the GTA V modding community is treating 2026 as one last major run before attention shifts toward GTA 6.", "GTA BOOM", "https://www.gtaboom.com/what-the-future-of-gta-modding-looks-like-after-gta-6-e87a", "Even with a new game on the horizon, GTA V's huge back catalog of mods means the older game will likely stay relevant for a long time."),
  newsPost("gta5", "2026-01-15", "A fresh guide rounds up the best GTA V mods to install now", "A 2026 guide collects currently recommended GTA V mods across graphics, vehicles and gameplay categories for players returning to the PC version.", "GAMES.GG", "https://games.gg/news/best-gta-5-mods-2026/", "General best-of lists are a good starting point for new players, even though it is always worth checking each mod's own page for current compatibility."),
  newsPost("ets2", "2026-06-18", "Euro Truck Simulator 2 update 1.60 is officially released", "SCS Software released Euro Truck Simulator 2 update 1.60 on June 18, 2026, bringing the Game Radio feature, improved materials and expanded rest mechanics out of beta.", "SCS Software Blog", "https://blog.scssoft.com/2026/06/euro-truck-simulator-2-160-update.html", "Major version releases like this are the moment to re-check map combos, sound mods and UI tools before driving long routes again."),
  newsPost("ets2", "2026-06-10", "Euro Truck Simulator 2's 1.60 Open Beta arrives with new visuals", "Ahead of the full release, SCS opened a 1.60 beta covering the updated Volvo FH Series 6, material system and lighting changes.", "SCS Software Blog", "https://blog.scssoft.com/2026/06/euro-truck-simulator-2-160-update-open.html", "Open betas are a useful early warning for modders, since visual and lighting changes can affect how truck and trailer mods look in-game."),
  newsPost("cyberpunk", "2026-02-02", "Outdoor V: Canyon Forest mod expands Night City's Badlands", "The Outdoor V: Canyon Forest mod adds a large new forest area to the edge of the Eastern Badlands for players to explore on foot or by vehicle.", "GamingBible", "https://www.gamingbible.com/news/platform/pc/cyberpunk-2077-mod-expansion-new-area-904066-20260202", "Area-expansion mods are some of the most ambitious Cyberpunk 2077 downloads, and they are worth testing in a save you do not mind reloading."),
  newsPost("cyberpunk", "2026-03-10", "Cyberpunk 2077's Fresh Start mod adds a brand-new lifepath", "The long-running Fresh Start mod received a major update adding a new lifepath storyline, giving returning players a fresh way to begin in Night City.", "ScreenRant", "https://screenrant.com/cyberpunk-2077-fresh-start-new-lifepath-march-2026-update/", "New lifepath mods usually touch the game's opening missions directly, so they are best started on a brand-new save rather than an existing one."),
  newsPost("cyberpunk", "2026-04-08", "Night City Reborn's mod collection gets a major April update", "The Night City Reborn collection added a large batch of new content in its April 2026 update, continuing to be one of Cyberpunk 2077's most followed mod projects.", "ScreenRant", "https://screenrant.com/cyberpunk-2077-night-city-reborn-april-2026-mod-update/", "Mod collections that update on a schedule are convenient, but each update is still worth a quick read before reinstalling."),
  newsPost("cyberpunk", "2026-05-15", "CyberMP multiplayer mod nears release after its most stable test yet", "The unreleased CyberMP mod, which adds PvP combat and races to Cyberpunk 2077, reportedly had its most stable internal test so far, with a 2026 release window in view.", "ScreenRant", "https://screenrant.com/cyberpunk-2077-multiplayer-2026-mods/", "Fan-made multiplayer mods are technically ambitious, so a stable internal test is a meaningful signal even before a public release."),
  newsPost("bg3", "2026-03-15", "Larian approves 19 more Baldur's Gate 3 console mods", "Larian Studios approved another wave of 19 community mods for Baldur's Gate 3 on console, continuing to narrow the gap with the PC mod scene.", "InGameNews", "https://www.ingamenews.com/2026/03/larian-studios-approves-19-new-baldurs.html", "Console mod approval waves are worth tracking even for PC players, since they show which categories Larian is comfortable certifying."),
  newsPost("bg3", "2026-04-15", "Larian adds 15 more approved console mods for April", "A follow-up approval round brought 15 additional Baldur's Gate 3 console mods, including new races and subclasses, further narrowing the PC-console mod gap.", "InGameNews", "https://www.ingamenews.com/2026/04/larian-studios-approves-15-new-baldurs.html", "Race and subclass mods change core character options, so it is worth reading patch notes before starting a new console run with them enabled."),
  newsPost("bg3", "2026-05-01", "Baldur's Gate 3's third annual Modathon draws hundreds of entries", "Nexus Mods ran the third Baldur's Gate 3 Modathon with weekly themes like Celestial and Shadows, drawing close to 400 community submissions.", "Nexus Mods", "https://www.nexusmods.com/news/15518", "Modathon-style events are a good time to discover smaller, recently uploaded mods that have not spread to other sites yet."),
  newsPost("bg3", "2026-02-10", "Path to Menzoberranzan keeps growing as one of BG3's biggest mods", "The team behind Path to Menzoberranzan, one of the largest Baldur's Gate 3 mod projects in development, said 2026 is going well and is recruiting more contributors.", "PC Guide", "https://www.pcguide.com/news/devs-of-the-biggest-baldurs-gate-3-mod-say-they-are-off-to-a-great-2026-but-looking-for-even-more-help/", "Large in-development mods like this are worth following even before release, since they often reshape what the community expects from future BG3 content.")
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
  guidePost("subnautica2", "How to read UE4SS mod requirements", "Learn what to look for when a mod mentions UE4SS, loader folders, config files or enabled mod lists.", "Requirement text can look technical, but most install problems come down to matching the loader version and putting files in the expected folder."),
  guidePost("beamng", "How to configure BeamNG.drive vehicle parts and customization mods", "A guide to picking and combining BeamNG.drive part packs, body kits and engine swaps without breaking a vehicle's base configuration.", "Many BeamNG.drive vehicles ship with their own part trees, so a part mod usually needs to match the exact vehicle and version it was built for."),
  guidePost("beamng", "How to choose BeamNG.drive map mods for your hardware", "A practical look at picking BeamNG.drive maps that match your PC's performance instead of just downloading the biggest one available.", "Large open-world BeamNG.drive maps can be demanding, so checking file size, object count notes and community comments helps avoid stutter before a long drive."),
  guidePost("beamng", "How to use BeamNG.drive scenario and mission mods", "An overview of how scenario and mission-style BeamNG.drive mods are packaged, and what to check before loading one for the first time.", "Scenario mods often depend on specific vehicles or maps being installed first, so missing dependencies are the most common reason one fails to start."),
  guidePost("ac", "How to install Assetto Corsa EVO car and track mods", "A guide to the Assetto Corsa EVO Editor Tool SDK workflow for adding community-made cars and tracks as official mod support expands.", "Assetto Corsa EVO's modding tools are newer than the original game's, so it helps to confirm a mod was built for EVO specifically and not the classic Assetto Corsa."),
  guidePost("ac", "How to use Content Manager with Assetto Corsa mods", "A practical look at using Content Manager to install, organize and enable Assetto Corsa car, track and app mods more safely than manual copying.", "Content Manager handles a lot of the folder structure work automatically, which cuts down on the most common manual-install mistakes."),
  guidePost("ac", "How to pick Assetto Corsa weather and shader mods", "A guide to choosing weather, time-of-day and shader mods that fit your CSP setup without conflicting with existing visual tools.", "Weather and shader mods often depend on a specific Custom Shaders Patch version, so mismatched versions are the most common cause of visual glitches."),
  guidePost("ac", "How to troubleshoot Assetto Corsa mod conflicts", "A step-by-step approach to finding which Assetto Corsa mod is causing a crash or visual issue when several are installed at once.", "The fastest way to isolate a conflict is to disable mods in groups and reload, rather than removing them one at a time from a large list."),
  guidePost("subnautica2", "How to back up Subnautica 2 saves before modding", "A simple backup routine for Subnautica 2 survival saves before testing any UE4SS-based mod for the first time.", "Subnautica 2 saves can represent many hours of progress, so a copied save folder is the cheapest insurance against a mod-related crash."),
  guidePost("subnautica2", "How to choose Subnautica 2 quality-of-life mods", "A guide to picking inventory, UI and console command mods that smooth out Subnautica 2 without removing its survival challenge.", "Quality-of-life mods are usually the safest category to start with, since most only change convenience rather than core gameplay systems."),
  guidePost("subnautica2", "How to update Subnautica 2 mods after a game patch", "What to check when a Subnautica 2 hotfix or content update breaks a previously working UE4SS mod.", "Hotfixes that change resource locations or creature stats are a common reason an older mod suddenly behaves differently."),
  guidePost("subnautica2", "How to find compatible UE4SS mod versions for Subnautica 2", "A guide to matching UE4SS loader versions with Subnautica 2 mods so they actually load instead of failing silently.", "A mismatched UE4SS version is one of the most common reasons a Subnautica 2 mod appears installed but never actually activates."),
  guidePost("stardew", "How to manage a large Stardew Valley mod list", "A guide to keeping a big Stardew Valley mod list organized using update checkers and clear folder naming.", "As a Stardew Valley mod list grows past a few dozen files, a dedicated update-tracking mod becomes far more useful than checking each page manually."),
  guidePost("stardew", "How to combine Stardew Valley expansion mods without conflicts", "A practical look at running multiple large Stardew Valley expansion mods together without breaking quests or map connections.", "Big expansion mods can add overlapping locations or characters, so checking compatibility notes before combining several at once saves a lot of troubleshooting."),
  guidePost("stardew", "How to choose Stardew Valley gameplay and farming mods", "A guide to picking farming, crop and automation mods that fit the pace you want for your Stardew Valley save.", "Gameplay mods can change how quickly a farm grows, so it is worth deciding early whether you want a relaxed or a more optimized playstyle."),
  guidePost("stardew", "How to update Stardew Valley mods safely after a new patch", "What Stardew Valley players should check on SMAPI and individual mod pages right after a new game update lands.", "SMAPI usually flags outdated mods on startup, which makes it the fastest way to see what needs an update before loading a save."),
  guidePost("gta5", "How to install GTA V graphics and visual overhaul mods", "A guide to installing GTA V visual overhaul mods like lighting and shader packs without conflicting with other graphics tools.", "Large visual overhauls often replace core game files, so a clean backup of the original files makes it much easier to roll back if something looks wrong."),
  guidePost("gta5", "How to pick GTA V police and emergency vehicle packs", "A guide to choosing police, fire and EMS vehicle packs for GTA V that fit your game version and existing vehicle mods.", "Emergency vehicle packs can replace default spawns, so it helps to check whether a pack is additive or a full replacement before installing."),
  guidePost("gta5", "How to add GTA V story expansion and mission mods", "What to check before installing story-expansion or new-mission mods that add content on top of GTA V's main campaign.", "Mission mods often depend on specific script frameworks, so confirming those dependencies first avoids missing-trigger issues mid-mission."),
  guidePost("gta5", "How to keep a stable GTA V mod setup across script and ASI mods", "A guide to organizing GTA V script mods, ASI loaders and trainers so they do not conflict with each other.", "Script-heavy GTA V setups are the most fragile, so installing one mod at a time and testing in between catches conflicts early."),
  guidePost("ets2", "How to choose ETS2 trailer and cargo mods", "A guide to picking Euro Truck Simulator 2 trailer and cargo mods that match your map mods and DLC ownership.", "Trailer mods are often tied to specific cargo routes, so checking map compatibility first avoids missing or broken delivery jobs."),
  guidePost("ets2", "How to set up ETS2 multiplayer-safe mod lists", "What Euro Truck Simulator 2 players should check before bringing a personal mod list into a multiplayer convoy.", "Multiplayer sessions usually require every player to run the same map and vehicle mods, so a shared mod list avoids most desync issues."),
  guidePost("ets2", "How to pick ETS2 sound and engine mods", "A guide to choosing engine sound and horn mods for Euro Truck Simulator 2 without breaking truck physics settings.", "Sound mods rarely affect physics directly, but bundled engine mods sometimes do, so it helps to read the description closely before installing."),
  guidePost("ets2", "How to test ETS2 map mods after a major game update", "A safe testing routine for Euro Truck Simulator 2 map mods after a version update like 1.60 changes lighting or materials.", "Map mods are some of the most update-sensitive Euro Truck Simulator 2 files, so a short test drive after every major patch is worth the time."),
  guidePost("cyberpunk", "How to install Cyberpunk 2077 area expansion mods", "A guide to installing large area-expansion mods for Cyberpunk 2077 like new districts or Badlands locations.", "Area-expansion mods can be some of the largest Cyberpunk 2077 downloads, so checking free disk space and required frameworks first avoids a failed install."),
  guidePost("cyberpunk", "How to choose Cyberpunk 2077 gameplay overhaul mods", "A guide to picking gameplay-overhaul mods for Cyberpunk 2077 that match the difficulty and pace you want from Night City.", "Gameplay overhauls often touch combat and economy systems together, so it helps to read what each one changes before combining several."),
  guidePost("cyberpunk", "How to manage Cyberpunk 2077 ReShade and graphics mods", "A practical guide to installing ReShade presets and graphics mods for Cyberpunk 2077 without conflicting with in-game settings.", "ReShade presets can interact with Cyberpunk 2077's own ray tracing and post-processing settings, so testing one change at a time avoids confusing visual bugs."),
  guidePost("cyberpunk", "How to prepare for a Cyberpunk 2077 multiplayer mod beta", "What to check before joining an early multiplayer mod test for Cyberpunk 2077, including save backups and clean mod lists.", "Early multiplayer mod betas are still experimental, so keeping a separate, lightly modded install reduces the risk to your main save."),
  guidePost("bg3", "How to install large Baldur's Gate 3 mods like Path to Menzoberranzan", "A guide to preparing for big, in-development Baldur's Gate 3 mods that add entire new regions or storylines.", "Large in-development mods change frequently, so checking the mod's own changelog before each playthrough avoids starting a run on an outdated build."),
  guidePost("bg3", "How to enter Baldur's Gate 3 community Modathon-style content", "A look at how Baldur's Gate 3 Modathon-style community events work and how players can find newly submitted mods early.", "Event-themed mods are often smaller and more experimental, which makes them a good way to try unusual ideas before they become major projects."),
  guidePost("bg3", "How to manage Baldur's Gate 3 console mod approvals", "A guide to understanding how approved Baldur's Gate 3 console mods differ from the full PC mod catalog.", "Console mod waves are curated in batches, so checking the latest approved list is the fastest way to know what is actually available right now.")
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
  <link rel="stylesheet" href="css/shared.css?v=8">
  <link rel="stylesheet" href="css/effects.css?v=6">
</head>
<body style="--game-accent:${post.game.accent}">
<header class="site-header"><div class="container header-inner"><a href="/" class="logo">MOD<span>VAULT</span></a><nav class="header-nav">${activeNav}</nav></div></header>
<main class="page content-page"><div class="container"><article class="content-hero"><span class="content-kicker">${kicker}</span><h1 class="content-title">${esc(post.title)}</h1><p class="content-lede">${esc(post.summary)}</p></article><section class="content-grid">${post.sections.map(([heading, body]) => `<div class="content-panel"><h2>${esc(heading)}</h2><p>${esc(body)}</p></div>`).join("")}${source}</section></div></main>
${footer}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-client.js?v=17"></script>
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

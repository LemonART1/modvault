const INSTALL_GUIDES = {
  cyberpunk: {
    gameName: "Cyberpunk 2077",
    steps: [
      "Download the mod archive.",
      "Extract the contents into your Cyberpunk 2077 <code>archive/pc/mod/</code> folder: <code>steamapps/common/Cyberpunk 2077/archive/pc/mod/</code>",
      "For REDmod mods, place them in <code>archive/pc/mod/</code> and enable in the launcher.",
      "Launch the game — mods load automatically."
    ]
  },
  witcher3: {
    gameName: "The Witcher 3",
    steps: [
      "Download the mod archive.",
      "Extract the contents into your Witcher 3 <code>mods/</code> folder: <code>steamapps/common/The Witcher 3/mods/</code>",
      "For script mods, you may need to merge them with the Witcher 3 Script Merger.",
      "Launch the game — mods load automatically."
    ]
  },
  eldenring: {
    gameName: "Elden Ring",
    steps: [
      "Download the mod archive.",
      "Install <a href='https://github.com/soulsmods/ModEngine2' target='_blank' rel='noopener'>Mod Engine 2</a> first if you haven't already.",
      "Extract mod files into the Mod Engine 2 <code>mod/</code> folder.",
      "Launch the game through <code>launchmod_eldenring.bat</code>."
    ]
  },
  bg3: {
    gameName: "Baldur's Gate 3",
    steps: [
      "Download the mod archive.",
      "Install <a href='https://github.com/LaughingLeader/BG3ModManager' target='_blank' rel='noopener'>BG3 Mod Manager</a>.",
      "Drag and drop the mod .pak file into BG3 Mod Manager.",
      "Click 'Export Order to Game' and launch through Steam/GOG."
    ]
  },
  stardew: {
    gameName: "Stardew Valley",
    steps: [
      "Download the mod archive.",
      "Install <a href='https://smapi.io/' target='_blank' rel='noopener'>SMAPI</a> first if you haven't already.",
      "Extract mod files into your Stardew Valley <code>Mods/</code> folder: <code>steamapps/common/Stardew Valley/Mods/</code>",
      "Launch the game through SMAPI."
    ]
  },
  skyrim: {
    gameName: "Skyrim Special Edition",
    steps: [
      "Download the mod archive.",
      "Use <a href='https://www.nexusmods.com/about/vortex/' target='_blank' rel='noopener'>Vortex</a> or <a href='https://www.nexusmods.com/skyrimspecialedition/mods/6194' target='_blank' rel='noopener'>Mod Organizer 2</a>.",
      "For manual install: extract to <code>steamapps/common/Skyrim Special Edition/Data/</code>",
      "Enable the mod in your mod manager or launcher."
    ]
  },
  fallout4: {
    gameName: "Fallout 4",
    steps: [
      "Download the mod archive.",
      "Use <a href='https://www.nexusmods.com/about/vortex/' target='_blank' rel='noopener'>Vortex</a> or <a href='https://www.nexusmods.com/fallout4/mods/133' target='_blank' rel='noopener'>Mod Organizer 2</a>.",
      "For manual install: extract to <code>steamapps/common/Fallout 4/Data/</code>",
      "Enable mods in <code>Fallout4Prefs.ini</code> and <code>Fallout4Custom.ini</code>."
    ]
  },
  minecraft: {
    gameName: "Minecraft",
    steps: [
      "Download the mod archive.",
      "Install the correct mod loader: <a href='https://files.minecraftforge.net/' target='_blank' rel='noopener'>Forge</a>, <a href='https://fabricmc.net/' target='_blank' rel='noopener'>Fabric</a>, or <a href='https://neoforged.net/' target='_blank' rel='noopener'>NeoForge</a>.",
      "Place the .jar file into your Minecraft <code>mods/</code> folder: <code>.minecraft/mods/</code>",
      "Launch the game through the modded profile."
    ]
  },
  gta5: {
    gameName: "Grand Theft Auto V",
    steps: [
      "Download the mod archive.",
      "Install <a href='https://openiv.com/' target='_blank' rel='noopener'>OpenIV</a> and enable Edit Mode.",
      "Follow the mod's specific install path (usually <code>update/x64/dlcpacks/</code> or <code>mods/</code> folder).",
      "Use a mod manager like <a href='https://www.gta5-mods.com/tools/heapadjuster' target='_blank' rel='noopener'>Heap Adjuster</a> and <a href='https://www.gta5-mods.com/tools/packfile-limit-adjuster' target='_blank' rel='noopener'>Packfile Limit Adjuster</a> for stability."
    ]
  },
  rdr2: {
    gameName: "Red Dead Redemption 2",
    steps: [
      "Download the mod archive.",
      "Install <a href='https://www.rdr2mods.com/downloads/rdr2/tools/9-red-dead-mod-manager/' target='_blank' rel='noopener'>Red Dead Mod Manager</a> or use <a href='https://www.nexusmods.com/about/vortex/' target='_blank' rel='noopener'>Vortex</a>.",
      "For LML mods, extract to <code>steamapps/common/Red Dead Redemption 2/lml/</code>",
      "Launch the game — mods load automatically."
    ]
  },
  mhw: {
    gameName: "Monster Hunter: World",
    steps: [
      "Download the mod archive.",
      "Use <a href='https://www.nexusmods.com/about/vortex/' target='_blank' rel='noopener'>Vortex</a> or install manually.",
      "For manual install: extract to <code>steamapps/common/Monster Hunter World/nativePC/</code>",
      "Use <a href='https://www.nexusmods.com/monsterhunterworld/mods/1982' target='_blank' rel='noopener'>Stracker's Loader</a> for nativePC mods."
    ]
  },
  starfield: {
    gameName: "Starfield",
    steps: [
      "Download the mod archive.",
      "Use <a href='https://www.nexusmods.com/about/vortex/' target='_blank' rel='noopener'>Vortex</a> with Starfield extension or install manually.",
      "For manual install: extract to <code>Documents/My Games/Starfield/Data/</code>",
      "Enable mods in <code>StarfieldCustom.ini</code>."
    ]
  },
  ac: {
    gameName: "Assetto Corsa",
    steps: [
      "Download the mod archive.",
      "Extract the contents into your Assetto Corsa <code>content</code> folder: <code>steamapps/common/assettocorsa/content/</code>",
      "Cars go to <code>content/cars/</code>, tracks to <code>content/tracks/</code>, apps to <code>content/apps/</code>.",
      "Launch the game — new cars appear in the car selection, tracks in the track list.",
      "For apps, enable them from the in-game app bar."
    ]
  }
};

function installGuideSection(gameKey) {
  const guide = INSTALL_GUIDES[gameKey];
  if (!guide) return "";
  const stepsHtml = guide.steps.map(step => `<li>${step}</li>`).join("");
  return `<article class="install-guide-section">
    <h2>How to install this ${esc(guide.gameName)} mod</h2>
    <ol class="install-guide-steps">
      ${stepsHtml}
    </ol>
  </article>`;
}

function initModDetail(modId) {
  const mod = MODS.find(item => item.id === modId);
  if (!mod) return;

  const game = GAMES[mod.game];
  const images = getModImages(mod);
  const stats = ModVaultStats.getModStats(mod);
  const root = document.getElementById("mod-detail");
  document.title = `${mod.title} - ${game.name} Mods - ModVault`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", mod.short);

  root.innerHTML = `
    <section class="mod-detail-hero">
      <div class="container mod-detail-layout">
        <div class="mod-detail-media">
          <div class="mod-detail-main-img" id="mod-detail-main-img" style="${thumbBg(mod)}">
            ${images.length ? `<img src="${esc(images[0])}" alt="${esc(mod.title)} screenshot">` : svgPlaceholderLg()}
          </div>
          ${images.length ? `
            <div class="mod-detail-thumbs">
              ${images.map((src, index) => `
                <button class="mod-detail-thumb ${index === 0 ? "active" : ""}" type="button" onclick="setModDetailImage('${esc(src)}', ${index})">
                  <img src="${esc(src)}" alt="${esc(mod.title)} screenshot ${index + 1}">
                </button>
              `).join("")}
            </div>
          ` : ""}
        </div>
        <article class="mod-detail-copy">
          <div class="mod-detail-views">${ModVaultStats.formatCompact(stats.views)} views</div>
          <div class="modal-breadcrumb">
            <a class="bc-back" href="${esc(game.page)}">Back to ${esc(game.shortName)}</a>
            <span class="sep">/</span>
            <span>${esc(game.name)}</span>
            <span class="sep">/</span>
            <span>${esc(catLabel(mod.game, mod.category))}</span>
          </div>
          <h1 class="modal-title">${esc(mod.title)}</h1>
          <p class="modal-short">${esc(mod.short)}</p>
          <div class="modal-stats" style="--stat-count:4">
            <div class="modal-stat"><span class="stat-val">v${esc(String(mod.version).replace(/^\s*v\.?\s*/i, ""))}</span><span class="stat-lbl">Version</span></div>
            <div class="modal-stat"><span class="stat-val">${esc(mod.size)}</span><span class="stat-lbl">File size</span></div>
            <div class="modal-stat"><span class="stat-val" id="mod-downloads">${ModVaultStats.formatCompact(stats.downloads)}</span><span class="stat-lbl">Downloads</span></div>
            <div class="modal-stat"><span class="stat-val" id="mod-rating">${ModVaultStats.formatRating(stats.ratingAverage)}</span><span class="stat-lbl">Rating</span></div>
          </div>
          <div class="modal-tags">
            ${mod.tags.filter(Boolean).map(tag => `<a class="tag" href="${esc(game.page)}?tag=${encodeURIComponent(tag)}">${esc(tag)}</a>`).join("")}
          </div>
          <div class="mod-detail-actions-row">
            <div class="mod-detail-fav" id="mod-detail-fav"></div>
            <div class="rating-control">
              <div class="rating-stars" aria-label="Rate this mod">
                ${[1,2,3,4,5].map(value => `<button class="rating-star-btn ${value <= stats.userRating ? "active" : ""}" type="button" onclick="rateCurrentMod(${mod.id}, ${value})">&#9733;</button>`).join("")}
              </div>
              <div class="rating-summary" id="rating-summary">${ModVaultStats.formatRating(stats.ratingAverage)} / 5 from ${stats.ratingCount} votes</div>
            </div>
          </div>
          <a class="modal-dl-btn mod-detail-download" href="${esc(mod.downloadUrl)}" target="_blank" rel="noopener" onclick="recordCurrentDownload(${mod.id})">Download Mod</a>
          <p class="dl-hint">Hosted on an external file service - click to proceed</p>
          <button class="report-link-btn" type="button" onclick="toggleReportForm(${mod.id})">Report a problem with this mod</button>
          <div class="report-form-slot" id="report-form-slot"></div>
        </article>
      </div>
    </section>
    <section class="mod-detail-about">
      <div class="container">
        <div class="modal-desc-section">
          <h2>About this mod</h2>
          ${descriptionHtml(mod.description)}
        </div>
        ${installGuideSection(mod.game)}
        ${relatedModsSection(mod)}
      </div>
    </section>
    <section class="mod-detail-comments">
      <div class="container">
        <div id="mod-comments"></div>
      </div>
    </section>
  `;

  Promise.allSettled([
    ModVaultStats.recordModView(mod.id),
    ModVaultStats.hydrateModStats([mod])
  ]).then(() => refreshCurrentModStats(mod));

  if (window.ModVaultAccount) ModVaultAccount.mountFavoriteButton(mod);
  if (window.ModVaultComments) ModVaultComments.mount(mod.id);
}

function toggleReportForm(modId) {
  const slot = document.getElementById("report-form-slot");
  if (!slot) return;
  if (slot.innerHTML) { slot.innerHTML = ""; return; }
  slot.innerHTML = `
    <form class="report-form" onsubmit="return submitReport(event, ${modId})">
      <textarea placeholder="What's wrong? (broken link, wrong file, outdated version...)" maxlength="500" rows="2"></textarea>
      <div class="report-form-row">
        <button type="submit">Send report</button>
        <button type="button" class="report-form-cancel" onclick="toggleReportForm(${modId})">Cancel</button>
      </div>
      <p class="report-form-status"></p>
    </form>
  `;
  slot.querySelector("textarea")?.focus();
}

async function submitReport(event, modId) {
  event.preventDefault();
  const form = event.target;
  const textarea = form.querySelector("textarea");
  const status = form.querySelector(".report-form-status");
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  const result = await window.ModVaultReports.submitReport(modId, textarea.value);
  if (result.ok) {
    form.outerHTML = `<p class="report-form-status ok">Thanks, we'll take a look.</p>`;
  } else {
    status.textContent = result.message || "Could not send report.";
    btn.disabled = false;
  }
  return false;
}

async function recordCurrentDownload(modId) {
  const mod = MODS.find(item => item.id === modId);
  if (!mod) return;
  if (window.ModVaultAccount) ModVaultAccount.recordUserDownload(modId);
  await ModVaultStats.recordDownload(modId);
  await ModVaultStats.hydrateModStats([mod]);
  refreshCurrentModStats(mod);
}

async function rateCurrentMod(modId, rating) {
  const mod = MODS.find(item => item.id === modId);
  if (!mod) return;
  setRatingButtons(rating);
  const summaryEl = document.getElementById("rating-summary");
  if (summaryEl) summaryEl.textContent = "Saving rating...";

  try {
    const stats = await ModVaultStats.rateMod(mod, rating);
    refreshCurrentModStats(mod, stats.error);
    if (stats.error) setRatingButtons(rating);
  } catch (error) {
    refreshCurrentModStats(mod, error.message || "Could not save rating.");
    setRatingButtons(rating);
  }
}

function refreshCurrentModStats(mod, message = "") {
  const stats = ModVaultStats.getModStats(mod);
  setRatingButtons(stats.userRating);
  const viewsEl = document.querySelector(".mod-detail-views");
  const downloadsEl = document.getElementById("mod-downloads");
  const ratingEl = document.getElementById("mod-rating");
  const summaryEl = document.getElementById("rating-summary");
  if (viewsEl) viewsEl.innerHTML = `${ModVaultStats.formatCompact(stats.views)} views`;
  if (downloadsEl) downloadsEl.textContent = ModVaultStats.formatCompact(stats.downloads);
  if (ratingEl) ratingEl.textContent = ModVaultStats.formatRating(stats.ratingAverage);
  if (summaryEl) {
    summaryEl.textContent = message || `${ModVaultStats.formatRating(stats.ratingAverage)} / 5 from ${stats.ratingCount} votes`;
  }
}

function setRatingButtons(value) {
  document.querySelectorAll(".rating-star-btn").forEach((button, index) => {
    button.classList.toggle("active", index < Number(value || 0));
  });
}

function getModImages(mod) {
  const list = Array.isArray(mod.images) ? mod.images : [mod.image];
  return list.filter(Boolean).slice(0, 3);
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
  return `<div class="related-mods-section">
    <h2>Related mods</h2>
    <div class="related-mods-grid">
      ${related.map(m => {
        const image = getModImages(m)[0];
        const url = `mods/${m.game}/${slugify(`${m.id}-${m.title}`)}`;
        return `<a class="mod-card" href="${esc(url)}">
          <div class="card-thumb">
            ${image ? `<img src="${esc(image)}" alt="${esc(m.title)}" loading="lazy">` : ""}
            <span class="card-cat">${esc(catLabel(m.game, m.category))}</span>
          </div>
          <div class="card-body">
            <div class="card-title">${esc(m.title)}</div>
            <div class="card-desc">${esc(m.short)}</div>
          </div>
        </a>`;
      }).join("")}
    </div>
  </div>`;
}

function setModDetailImage(src, index) {
  const imgWrap = document.getElementById("mod-detail-main-img");
  if (!imgWrap) return;
  imgWrap.innerHTML = `<img src="${esc(src)}" alt="Mod screenshot">`;
  document.querySelectorAll(".mod-detail-thumb").forEach((button, i) => {
    button.classList.toggle("active", i === index);
  });
}

function catLabel(gameKey, cat) {
  return CATEGORIES[gameKey]?.[normalizeCategory(gameKey, cat)] ?? cat;
}

function normalizeCategory(gameKey, cat) {
  const normalized = String(cat ?? "").trim().toLowerCase().replace(/_/g, "-");
  const aliases = {
    beamng: { car: "cars", configs: "other", parts: "other" },
    ac: { tools: "apps", motorcycles: "cars" },
    subnautica2: { tools: "miscellaneous", creatures: "gameplay", ui: "ui" },
    stardew: { tools: "modding-tools", visuals: "visuals-graphics", gameplay: "gameplay-mechanics", animals: "livestock-animals", "user-interface": "ui" },
    gta5: { characters: "player", graphics: "other" },
    ets2: { traffic: "other", characters: "other" },
    cyberpunk: { resources: "modders-resources", props: "props-decorations", ui: "user-interface", visuals: "visuals-graphics" },
    bg3: { characters: "character-customisation", ui: "user-interface" }
  };
  return aliases[gameKey]?.[normalized] || normalized;
}

function thumbBg(mod) {
  const palettes = {
    cars: "#0e1018", trucks: "#100e18", maps: "#0e1810", configs: "#0e1518",
    parts: "#18100e", tracks: "#18180e", apps: "#0e1818", skins: "#180e18",
    tools: "#0e1418", creatures: "#0b1820", ui: "#101525", biomes: "#0b1714",
    expansions: "#10180e", visuals: "#161126", crops: "#12180e", graphics: "#14131f",
    vehicles: "#0e1018", scripts: "#18120e", interiors: "#18140e", traffic: "#13181a",
    gameplay: "#181018", characters: "#17101f", spells: "#101224"
  };
  const c = palettes[normalizeCategory(mod.game, mod.category)] ?? "#0e1018";
  const accent = GAMES[mod.game]?.accent ?? "#e8ff00";
  return `background:linear-gradient(135deg,${c},rgba(5,6,10,.94)),radial-gradient(circle at 80% 20%,${accent}22,transparent 45%);`;
}

function svgPlaceholderLg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".6" style="width:80px;height:80px;opacity:.08">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>`;
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

// Mirrors tools/generate-mod-pages.js's descriptionHtml()/descriptionLines()
// so the static SEO snapshot and this client-side render produce the same
// markup, including the fallback for inline "sentence.  - Bullet." text
// the AI sometimes writes instead of real newlines between bullets.
function descriptionLines(description) {
  const raw = String(description ?? "").trim();
  let lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    const bulletTransitions = raw.match(/\.\s+-\s+[A-Z0-9]/g) || [];
    if (bulletTransitions.length >= 2) {
      const parts = raw.split(/\s-\s+(?=[A-Z0-9])/).map(part => part.trim()).filter(Boolean);
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
  const introHtml = intro.map(p => `<p class="modal-desc-text">${esc(p)}</p>`).join("");
  const bulletsHtml = bullets.length
    ? `<ul class="modal-desc-list">${bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>`
    : "";
  return introHtml + bulletsHtml;
}

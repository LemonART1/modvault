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
          ${images.length > 1 ? `
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
            <div class="modal-stat"><span class="stat-val">v${esc(mod.version)}</span><span class="stat-lbl">Version</span></div>
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
          <p class="modal-desc-text">${esc(mod.description)}</p>
        </div>
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

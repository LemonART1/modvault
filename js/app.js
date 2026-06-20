// ============================================================
//  app.js — shared mod grid + modal logic
//  Used by both beamng.html and assetto.html
//  Expects: GAME_KEY set before this script runs
// ============================================================

let filterCat    = "all";
let filterSearch = "";
let filterSort   = "newest";
let currentPage  = 1;
const PAGE_SIZE  = 24;

// ── INIT ─────────────────────────────────────────────────

function initModPage(gameKey) {
  renderGameIntro(gameKey);
  setupModsLayout();
  buildNav(gameKey);
  applyInitialSearch();
  buildGrid(gameKey);
  hydrateGameStats(gameKey);
  bindSearch(gameKey);
  bindSort(gameKey);
  handleHash(gameKey);
}

async function hydrateGameStats(gameKey) {
  const gameMods = MODS.filter(m => m.game === gameKey && isPublishedMod(m));
  await ModVaultStats.hydrateModStats(gameMods);
  buildGrid(gameKey);
}

function renderGameIntro(gameKey) {
  const wrap = document.getElementById("game-intro");
  if (!wrap) return;

  const game = GAMES[gameKey];
  const count = MODS.filter(mod => mod.game === gameKey && isPublishedMod(mod)).length;
  wrap.innerHTML = `
    <div class="game-intro-copy">
      <span class="section-label">Game overview</span>
      <h2>${esc(game.name)} mods</h2>
      <p>${esc(game.intro || game.description)}</p>
    </div>
    <div class="game-intro-stat">
      <span>${count}</span>
      <small>mods listed</small>
    </div>
  `;
}

function applyInitialSearch() {
  const params = new URLSearchParams(window.location.search);
  const tag = params.get("tag") || params.get("q") || "";
  filterSearch = tag.trim().toLowerCase();
  const input = document.getElementById("search-input");
  if (input) input.value = tag;
}

function setupModsLayout() {
  const container = document.querySelector(".grid-section .container");
  if (!container || container.querySelector(".mods-layout")) return;

  const toolbar = container.querySelector(".grid-toolbar");
  const toolbarLeft = toolbar?.querySelector(".toolbar-left");
  const toolbarRight = toolbar?.querySelector(".toolbar-right");
  const grid = container.querySelector("#mods-grid");
  const pagination = container.querySelector("#pagination");
  if (!toolbar || !toolbarLeft || !toolbarRight || !grid || !pagination) return;

  const layout = document.createElement("div");
  layout.className = "mods-layout";

  const sidebar = document.createElement("aside");
  sidebar.className = "mods-sidebar";
  sidebar.append(...toolbarLeft.childNodes);

  const main = document.createElement("div");
  main.className = "mods-main";
  toolbar.innerHTML = "";
  toolbar.appendChild(toolbarRight);
  main.append(toolbar, grid, pagination);

  layout.append(sidebar, main);
  container.innerHTML = "";
  container.appendChild(layout);
}

// ── NAV CATEGORIES ───────────────────────────────────────

function buildNav(gameKey) {
  const cats = CATEGORIES[gameKey];
  const nav  = document.getElementById("cat-nav");
  const gameMods = MODS.filter(mod => mod.game === gameKey && isPublishedMod(mod));
  const counts = gameMods.reduce((acc, mod) => {
    const key = getCategoryKey(mod);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  nav.innerHTML = `<button class="nav-btn active" data-cat="all"><span>All</span><em>${gameMods.length}</em></button>`;
  for (const [key, label] of Object.entries(cats)) {
    nav.innerHTML += `<button class="nav-btn" data-cat="${key}"><span>${label}</span><em>${counts[key] || 0}</em></button>`;
  }
  nav.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      filterCat = btn.dataset.cat;
      currentPage = 1;
      nav.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      buildGrid(gameKey);
    });
  });
}

// ── FEATURED STRIP ───────────────────────────────────────

function buildFeatured(gameKey) {
  const wrap     = document.getElementById("featured-strip");
  const featured = MODS.filter(m => m.game === gameKey && m.featured && isPublishedMod(m));
  if (!featured.length) { wrap.closest(".featured-section")?.remove(); return; }

  wrap.innerHTML = featured.map(mod => `
    <a class="feat-item" href="${getModPageUrl(mod)}">
      <div class="feat-item-thumb" style="${thumbBg(mod)}">
        ${getModImages(mod)[0] ? `<img src="${getModImages(mod)[0]}" alt="${esc(mod.title)}" loading="lazy">` : svgPlaceholder()}
      </div>
      <div class="feat-item-body">
        <div class="feat-item-cat">${catLabel(gameKey, mod.category)}</div>
        <div class="feat-item-title">${esc(mod.title)}</div>
        <div class="feat-item-sub">${esc(mod.short)}</div>
      </div>
    </a>
  `).join("");
}

// ── GRID ─────────────────────────────────────────────────

function buildGrid(gameKey) {
  let list = MODS.filter(m => m.game === gameKey && isPublishedMod(m));

  if (filterCat !== "all")
    list = list.filter(m => getCategoryKey(m) === filterCat);

  if (filterSearch)
    list = list.filter(m =>
      m.title.toLowerCase().includes(filterSearch) ||
      m.short.toLowerCase().includes(filterSearch) ||
      m.tags.some(t => t.toLowerCase().includes(filterSearch))
    );

  if (filterSort === "newest") list.sort((a, b) => b.id - a.id);
  else if (filterSort === "oldest") list.sort((a, b) => a.id - b.id);
  else if (filterSort === "az") list.sort((a, b) => a.title.localeCompare(b.title));

  const grid  = document.getElementById("mods-grid");
  const count = document.getElementById("mod-count");
  count.textContent = list.length;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  if (!list.length) {
    grid.innerHTML = `
      <div class="grid-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <p>No mods found</p>
        <button onclick="resetFilters('${gameKey}')">Clear filters</button>
      </div>`;
    renderPagination(gameKey, 0);
    return;
  }

  const pageList = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Trigger scroll reveal for new cards
  requestAnimationFrame(() => {
    if (typeof setupReveal === "function") setupReveal();
  });

  grid.innerHTML = pageList.map((mod, i) => {
    const image = getModImages(mod)[0];
    const stats = ModVaultStats.getModStats(mod);
    return `
    <a class="mod-card" href="${getModPageUrl(mod)}" style="animation-delay:${i * 35}ms">
      <div class="card-thumb" style="${thumbBg(mod)}">
        ${image
          ? `<img src="${image}" alt="${esc(mod.title)}" loading="lazy">`
          : `<div class="card-thumb-placeholder">${svgPlaceholder()}</div>`
        }
        <span class="card-cat">${catLabel(gameKey, mod.category)}</span>
      </div>
      <div class="card-body">
        <div class="card-title">${esc(mod.title)}</div>
        <div class="card-desc">${esc(mod.short)}</div>
        <div class="card-meta">
          <span>v${esc(mod.version)}</span>
          <span>${esc(mod.size)}</span>
          <span>${renderStars(stats.ratingAverage)} ${ModVaultStats.formatRating(stats.ratingAverage)}</span>
          <span>${ModVaultStats.formatCompact(stats.downloads)} downloads</span>
          <span class="card-meta-muted">&#128065; ${ModVaultStats.formatCompact(stats.views)} views</span>
        </div>
      </div>
    </a>
  `}).join("");

  renderPagination(gameKey, totalPages);
}

function resetFilters(gameKey) {
  filterCat = "all"; filterSearch = ""; filterSort = "newest"; currentPage = 1;
  document.getElementById("search-input").value = "";
  document.getElementById("sort-select").value  = "newest";
  document.querySelectorAll(".nav-btn").forEach((b, i) => b.classList.toggle("active", i === 0));
  buildGrid(gameKey);
}

function renderPagination(gameKey, totalPages) {
  const wrap = document.getElementById("pagination");
  if (!wrap) return;

  if (totalPages <= 1) {
    wrap.innerHTML = "";
    return;
  }

  const buttons = [];
  buttons.push(`<button class="page-btn" ${currentPage === 1 ? "disabled" : ""} onclick="goToPage('${gameKey}', ${currentPage - 1})">Prev</button>`);
  for (let page = 1; page <= totalPages; page++) {
    buttons.push(`<button class="page-btn ${page === currentPage ? "active" : ""}" onclick="goToPage('${gameKey}', ${page})">${page}</button>`);
  }
  buttons.push(`<button class="page-btn" ${currentPage === totalPages ? "disabled" : ""} onclick="goToPage('${gameKey}', ${currentPage + 1})">Next</button>`);
  wrap.innerHTML = buttons.join("");
}

function goToPage(gameKey, page) {
  currentPage = page;
  buildGrid(gameKey);
  document.querySelector(".grid-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── MODAL ────────────────────────────────────────────────

function openMod(id) {
  const mod = MODS.find(m => m.id === id);
  if (!mod) return;

  const gameKey = mod.game;

  // image / placeholder
  const imgWrap = document.getElementById("modal-img");
  const image = getModImages(mod)[0];
  imgWrap.innerHTML = image
    ? `<img src="${image}" alt="${esc(mod.title)}">`
    : `<div class="modal-img-placeholder">${svgPlaceholderLg()}</div>`;
  imgWrap.style = thumbBg(mod);

  document.getElementById("modal-breadcat").textContent  = catLabel(gameKey, mod.category);
  document.getElementById("modal-game-tag").textContent  = GAMES[gameKey]?.name ?? gameKey;
  document.getElementById("modal-title").textContent     = mod.title;
  document.getElementById("modal-short").textContent     = mod.short;
  document.getElementById("modal-stat-ver").textContent  = "v" + mod.version;
  document.getElementById("modal-stat-size").textContent = mod.size;

  document.getElementById("modal-desc").textContent = mod.description;
  document.getElementById("modal-tags").innerHTML   = mod.tags.map(t =>
    `<span class="tag" onclick="searchByTag('${t}', '${gameKey}')">${t}</span>`
  ).join("");

  document.getElementById("modal-dl-btn").onclick = () => {
    window.open(mod.downloadUrl, "_blank", "noopener");
  };

  window.location.hash = "mod-" + id;
  document.getElementById("modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
  document.body.style.overflow = "";
  history.replaceState(null, "", window.location.pathname);
}

function searchByTag(tag, gameKey) {
  window.location.href = `${GAMES[gameKey].page}?tag=${encodeURIComponent(tag)}`;
}

function handleHash(gameKey) {
  const hash = window.location.hash;
  if (hash.startsWith("#mod-")) {
    const id = parseInt(hash.replace("#mod-", ""));
    if (!isNaN(id)) openMod(id);
  }
}

// ── SEARCH & SORT ────────────────────────────────────────

function bindSearch(gameKey) {
  document.getElementById("search-input").addEventListener("input", e => {
    filterSearch = e.target.value.trim().toLowerCase();
    currentPage = 1;
    buildGrid(gameKey);
  });
}

function bindSort(gameKey) {
  document.getElementById("sort-select").addEventListener("change", e => {
    filterSort = e.target.value;
    currentPage = 1;
    buildGrid(gameKey);
  });
}

// ── HELPERS ──────────────────────────────────────────────

function catLabel(gameKey, cat) {
  return CATEGORIES[gameKey]?.[normalizeCategory(gameKey, cat)] ?? cat;
}

function getCategoryKey(mod) {
  return normalizeCategory(mod.game, mod.category);
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

function isPublishedMod(mod) {
  return Boolean(String(mod.title ?? "").trim());
}

const THUMB_PALETTES = {
  cars:    "#0e1018",
  trucks:  "#100e18",
  maps:    "#0e1810",
  configs: "#0e1518",
  parts:   "#18100e",
  tracks:  "#18180e",
  apps:    "#0e1818",
  skins:   "#180e18",
  tools:   "#0e1418",
  creatures: "#0b1820",
  ui:      "#101525",
  biomes:  "#0b1714",
  expansions: "#10180e",
  visuals: "#161126",
  crops:   "#12180e",
  graphics:"#14131f",
  vehicles:"#0e1018",
  scripts: "#18120e",
  interiors:"#18140e",
  traffic: "#13181a",
  gameplay:"#181018",
  characters:"#17101f",
  spells:"#101224",
};
function thumbBg(mod) {
  const c = THUMB_PALETTES[getCategoryKey(mod)] ?? "#0e1018";
  const accent = GAMES[mod.game]?.accent ?? "#e8ff00";
  return `background:linear-gradient(135deg,${c},rgba(5,6,10,.94)),radial-gradient(circle at 80% 20%,${accent}22,transparent 45%);`;
}

function getModImages(mod) {
  const list = Array.isArray(mod.images) ? mod.images : [mod.image];
  return list.filter(Boolean).slice(0, 3);
}

function getModPageUrl(mod) {
  return `mods/${mod.game}/${slugify(`${mod.id}-${mod.title}`)}`;
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderStars(rating) {
  const rounded = Math.round(rating || 0);
  return "★★★★★".split("").map((star, index) =>
    `<span class="star ${index < rounded ? "filled" : ""}">${star}</span>`
  ).join("");
}

function svgPlaceholder() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width:40px;height:40px;opacity:.12">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>`;
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
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── MODAL CLOSE EVENTS ───────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("modal").addEventListener("click", e => {
    if (e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
});

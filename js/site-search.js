(function () {
  const MAX_HEADER_RESULTS = 6;
  const MAX_HOME_RESULTS = 12;

  function getModsData() {
    if (typeof MODS === "undefined" || typeof GAMES === "undefined") return null;
    return {
      mods: MODS,
      games: GAMES,
      categories: typeof CATEGORIES === "undefined" ? {} : CATEGORIES
    };
  }

  function loadModsData() {
    if (getModsData()) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="js/data/mods.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", reject, { once: true });
        if (getModsData()) resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "js/data/mods.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function initSearch() {
    if (!getModsData()) return;
    mountHeaderSearch();
    mountHomeSearch();
  }

  function mountHeaderSearch() {
    const header = document.querySelector(".header-inner");
    const nav = document.querySelector(".header-nav");
    if (!header || !nav || document.querySelector(".global-search")) return;

    const search = document.createElement("form");
    search.className = "global-search";
    search.setAttribute("role", "search");
    search.innerHTML = `
      <input class="global-search-input" type="search" placeholder="Search mods..." autocomplete="off" aria-label="Search mods">
      <div class="global-search-results" aria-live="polite"></div>
    `;
    header.insertBefore(search, nav);

    const input = search.querySelector(".global-search-input");
    const results = search.querySelector(".global-search-results");

    input.addEventListener("input", () => {
      renderCompactResults(results, input.value);
    });

    search.addEventListener("submit", event => {
      event.preventDefault();
      const first = results.querySelector("a");
      if (first) window.location.href = first.href;
    });

    document.addEventListener("click", event => {
      if (!search.contains(event.target)) results.classList.remove("open");
    });
  }

  function mountHomeSearch() {
    const homeSlot = document.getElementById("home-search-slot");
    if (!homeSlot || document.querySelector(".home-mod-search")) return;

    homeSlot.innerHTML = `
      <section class="home-mod-search" aria-label="Search all mods">
        <input class="home-mod-search-input" type="search" placeholder="Search all mods by title, game or tag..." autocomplete="off">
        <div class="home-mod-search-meta" id="home-search-meta">Start typing to search across every game.</div>
        <div class="home-mod-results" id="home-mod-results"></div>
      </section>
    `;

    const input = homeSlot.querySelector(".home-mod-search-input");
    const meta = homeSlot.querySelector("#home-search-meta");
    const results = homeSlot.querySelector("#home-mod-results");

    input.addEventListener("input", () => {
      const query = input.value.trim();
      const matches = query ? searchMods(query).slice(0, MAX_HOME_RESULTS) : [];
      meta.textContent = query
        ? `${matches.length ? `${matches.length} result${matches.length === 1 ? "" : "s"} shown` : "No mods found"}`
        : "Start typing to search across every game.";
      results.innerHTML = matches.map(renderHomeResult).join("");
      results.classList.toggle("open", Boolean(query));
    });
  }

  function renderCompactResults(results, query) {
    const matches = query.trim() ? searchMods(query).slice(0, MAX_HEADER_RESULTS) : [];
    results.innerHTML = matches.length
      ? matches.map(renderCompactResult).join("")
      : query.trim()
        ? `<div class="global-search-empty">No mods found</div>`
        : "";
    results.classList.toggle("open", Boolean(query.trim()));
  }

  function searchMods(query) {
    const data = getModsData();
    if (!data) return [];

    const needle = normalizeText(query);
    return data.mods
      .filter(isPublishedMod)
      .filter(mod => {
        const game = data.games[mod.game];
        const haystack = [
          mod.title,
          mod.short,
          mod.description,
          game?.name,
          catLabel(mod.game, mod.category),
          ...(mod.tags || [])
        ].map(normalizeText).join(" ");
        return haystack.includes(needle);
      })
      .sort((a, b) => b.id - a.id);
  }

  function renderCompactResult(mod) {
    const data = getModsData();
    const game = data?.games[mod.game];
    return `
      <a class="global-search-item" href="${getModPageUrl(mod)}" style="--game-accent:${esc(game?.accent || "#e8ff00")}">
        <span class="global-search-game">${esc(game?.shortName || game?.name || mod.game)}</span>
        <strong>${esc(mod.title)}</strong>
        <small>${esc(catLabel(mod.game, mod.category))}</small>
      </a>
    `;
  }

  function renderHomeResult(mod) {
    const data = getModsData();
    const game = data?.games[mod.game];
    const image = getModImages(mod)[0];
    return `
      <a class="home-mod-result-card" href="${getModPageUrl(mod)}" style="--game-accent:${esc(game?.accent || "#e8ff00")}">
        <div class="home-mod-result-thumb">
          ${image ? `<img src="${esc(image)}" alt="${esc(mod.title)}" loading="lazy">` : ""}
          <span>${esc(catLabel(mod.game, mod.category))}</span>
        </div>
        <div class="home-mod-result-body">
          <small>${esc(game?.name || mod.game)}</small>
          <strong>${esc(mod.title)}</strong>
          <p>${esc(mod.short)}</p>
        </div>
      </a>
    `;
  }

  function catLabel(gameKey, cat) {
    const data = getModsData();
    return data?.categories?.[gameKey]?.[normalizeCategory(gameKey, cat)] ?? humanizeCategory(cat);
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

  function humanizeCategory(cat) {
    return String(cat ?? "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, char => char.toUpperCase());
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

  function normalizeText(value) {
    return String(value ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
  }

  function isPublishedMod(mod) {
    return Boolean(String(mod.title ?? "").trim());
  }

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadModsData().then(initSearch).catch(() => {});
  });
})();

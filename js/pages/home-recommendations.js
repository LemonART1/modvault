// ModVault homepage recommendations.
// Shows a "Recommended for you" / "Popular right now" strip between the stats
// block and the games grid. Personalised from the logged-in user's favorites
// and download history when available, otherwise falls back to the most
// popular mods (by downloads, views and ratings), spread across games.
// Depends on: js/data/mods.js (MODS, GAMES, CATEGORIES), js/stats.js
// (ModVaultStats), js/account.js (ModVaultAccount, optional).
(function () {
  const REC_COUNT = 8;
  const MAX_PER_GAME = 2;

  function publishedMods() {
    return (typeof MODS === "undefined" ? [] : MODS)
      .filter(mod => String(mod.title || "").trim());
  }

  // ---------- popularity ----------
  function popularityScore(stats) {
    const s = stats || {};
    const downloads = Number(s.downloads) || 0;
    const views = Number(s.views) || 0;
    const ratingAvg = Number(s.ratingAverage) || 0;
    const ratingCount = Number(s.ratingCount) || 0;
    // Downloads count most, views less, ratings act as a quality multiplier.
    return downloads * 1 + views * 0.3 + ratingAvg * ratingCount * 4;
  }

  function withScores(mods) {
    return mods.map(mod => {
      const stats = ModVaultStats.getModStats(mod);
      return { mod, stats, score: popularityScore(stats) };
    });
  }

  function sortByScore(list) {
    return list.slice().sort((a, b) =>
      b.score - a.score ||
      (b.stats.ratingCount || 0) - (a.stats.ratingCount || 0) ||
      (b.mod.featured ? 1 : 0) - (a.mod.featured ? 1 : 0) ||
      a.mod.id - b.mod.id
    );
  }

  // Pick top mods while keeping the strip varied across games.
  function pickDiverse(scored, count, maxPerGame) {
    const sorted = sortByScore(scored);
    const perGame = {};
    const chosen = [];
    for (const item of sorted) {
      if (chosen.length >= count) break;
      const g = item.mod.game;
      if ((perGame[g] || 0) >= maxPerGame) continue;
      perGame[g] = (perGame[g] || 0) + 1;
      chosen.push(item);
    }
    // If the per-game cap left us short, fill from the rest by score.
    if (chosen.length < count) {
      for (const item of sorted) {
        if (chosen.length >= count) break;
        if (!chosen.includes(item)) chosen.push(item);
      }
    }
    return chosen.map(item => item.mod);
  }

  // ---------- personalisation ----------
  function buildAffinity(historyMods) {
    const games = {};
    const cats = {};
    for (const mod of historyMods) {
      if (!mod) continue;
      games[mod.game] = (games[mod.game] || 0) + 1;
      const key = `${mod.game}:${normalizeCategory(mod.game, mod.category)}`;
      cats[key] = (cats[key] || 0) + 1;
    }
    const maxGame = Math.max(1, ...Object.values(games));
    const maxCat = Math.max(1, ...Object.values(cats));
    return { games, cats, maxGame, maxCat };
  }

  function personalize(scored, affinity, ownedIds) {
    const candidates = scored.filter(item => !ownedIds.has(Number(item.mod.id)));
    const boosted = candidates.map(item => {
      const mod = item.mod;
      const gameAff = (affinity.games[mod.game] || 0) / affinity.maxGame;
      const catKey = `${mod.game}:${normalizeCategory(mod.game, mod.category)}`;
      const catAff = (affinity.cats[catKey] || 0) / affinity.maxCat;
      const multiplier = 1 + gameAff * 0.6 + catAff * 0.4;
      // Add a small base so a brand-new catalog with zero stats still ranks
      // affinity matches above unrelated mods.
      const base = item.score + 1;
      return { ...item, score: base * multiplier };
    });
    return pickDiverse(boosted, REC_COUNT, 3);
  }

  // ---------- rendering ----------
  function gamesData() {
    return typeof GAMES === "undefined" ? {} : GAMES;
  }

  function catLabel(gameKey, cat) {
    const cats = typeof CATEGORIES === "undefined" ? {} : CATEGORIES;
    const normalized = normalizeCategory(gameKey, cat);
    return cats?.[gameKey]?.[normalized] ?? humanizeCategory(cat);
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

  function getModImage(mod) {
    const list = Array.isArray(mod.images) ? mod.images : [mod.image];
    return list.filter(Boolean)[0] || "";
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

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cardHtml(mod) {
    const game = gamesData()[mod.game];
    const image = getModImage(mod);
    return `
      <a class="home-mod-result-card" href="${getModPageUrl(mod)}" style="--game-accent:${esc(game?.accent || "#e8ff00")}">
        <div class="home-mod-result-thumb">
          ${image ? `<img src="${esc(image)}" alt="${esc(mod.title)}" loading="lazy">` : ""}
          <span>${esc(catLabel(mod.game, mod.category))}</span>
        </div>
        <div class="home-mod-result-body">
          <small>${esc(game?.name || mod.game)}</small>
          <strong>${esc(mod.title)}</strong>
          <p>${esc(mod.short || "")}</p>
        </div>
      </a>
    `;
  }

  function render(mods, personalized) {
    const section = document.getElementById("home-recs");
    const grid = document.getElementById("home-recs-grid");
    const kicker = document.getElementById("home-recs-kicker");
    const sub = document.getElementById("home-recs-sub");
    if (!section || !grid || !mods.length) return;

    if (kicker) kicker.textContent = personalized ? "Recommended for you" : "Popular right now";
    if (sub) {
      sub.textContent = personalized
        ? "Picked from the games and categories you save and download."
        : "The most downloaded and highest-rated mods on ModVault.";
    }
    grid.innerHTML = mods.map(cardHtml).join("");
    section.hidden = false;
  }

  // ---------- init ----------
  async function loadHistoryIds() {
    const account = window.ModVaultAccount;
    if (!account || typeof account.getUser !== "function") return null;
    try {
      const user = await account.getUser();
      if (!user) return null;
      const [favorites, downloads] = await Promise.all([
        account.loadFavorites(),
        account.loadDownloads()
      ]);
      const ids = new Set();
      (favorites || []).forEach(f => ids.add(Number(f.mod_id)));
      (downloads || []).forEach(d => ids.add(Number(d.mod_id)));
      return ids.size ? ids : null;
    } catch (error) {
      console.warn("Recommendations: could not load account history.", error);
      return null;
    }
  }

  async function init() {
    const published = publishedMods();
    if (!published.length) return;

    // Immediate render from whatever stats are cached locally, so the strip
    // never flashes empty while Supabase data loads.
    render(pickDiverse(withScores(published), REC_COUNT, MAX_PER_GAME), false);

    // Pull live popularity stats and the user's history in parallel.
    const [, historyIds] = await Promise.all([
      ModVaultStats.hydrateModStats
        ? ModVaultStats.hydrateModStats(published).catch(() => {})
        : Promise.resolve(),
      loadHistoryIds()
    ]);

    const scored = withScores(published);

    if (historyIds && historyIds.size) {
      const byId = new Map(published.map(m => [Number(m.id), m]));
      const historyMods = [...historyIds].map(id => byId.get(id)).filter(Boolean);
      const affinity = buildAffinity(historyMods);
      const recs = personalize(scored, affinity, historyIds);
      if (recs.length) { render(recs, true); return; }
    }

    render(pickDiverse(scored, REC_COUNT, MAX_PER_GAME), false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

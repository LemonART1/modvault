// ModVault homepage recommendations.
// Shows a "Recommended for you" / "Popular right now" strip between the stats
// block and the games grid. Personalised from the logged-in user's favorites
// and download history when available, otherwise falls back to the most
// popular mods (by downloads, views and ratings), spread across games.
// Depends on: js/data/mods.js (MODS, GAMES, CATEGORIES), js/stats.js
// (ModVaultStats), js/account.js (ModVaultAccount, optional).
(function () {
  const REC_COUNT = 12;
  const MAX_PER_GAME = 2;
  const SCROLL_SPEED = 0.4;   // px per frame for the auto-scroll
  const RESUME_DELAY = 1200;  // ms to wait after a manual interaction

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

  function cardHtml(mod, duplicate) {
    const game = gamesData()[mod.game];
    const image = getModImage(mod);
    // Duplicated cards are only there to make the loop seamless, so hide them
    // from assistive tech and keyboard tabbing.
    const dupAttrs = duplicate ? ` aria-hidden="true" tabindex="-1"` : "";
    return `
      <a class="home-mod-result-card" href="${getModPageUrl(mod)}"${dupAttrs} style="--game-accent:${esc(game?.accent || "#e8ff00")}">
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
    const track = document.getElementById("home-recs-track");
    const kicker = document.getElementById("home-recs-kicker");
    const sub = document.getElementById("home-recs-sub");
    if (!section || !track || !mods.length) return;

    if (kicker) kicker.textContent = personalized ? "Recommended for you" : "Popular right now";
    if (sub) {
      sub.textContent = personalized
        ? "Picked from the games and categories you save and download."
        : "The most downloaded and highest-rated mods on ModVault.";
    }
    // Render the set twice so the auto-scroll can loop back seamlessly.
    track.innerHTML = mods.map(m => cardHtml(m, false)).join("")
      + mods.map(m => cardHtml(m, true)).join("");
    track.scrollLeft = 0;
    section.hidden = false;
    startAutoScroll(track);
  }

  // ---------- auto-scrolling feed ----------
  let rafId = null;
  let paused = false;
  let resumeTimer = null;
  // We track the position ourselves: assigning sub-pixel values to scrollLeft
  // gets rounded by the browser, so a "+= 0.4" each frame never accumulates and
  // the feed would sit still. Keeping our own float fixes that.
  let pos = 0;

  function pause() { paused = true; clearTimeout(resumeTimer); }
  function resumeSoon() {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { paused = false; }, RESUME_DELAY);
  }

  function bindInteractions(track) {
    track.addEventListener("mouseenter", pause);
    track.addEventListener("mouseleave", resumeSoon);
    track.addEventListener("focusin", pause);
    track.addEventListener("focusout", resumeSoon);
    track.addEventListener("touchstart", pause, { passive: true });
    track.addEventListener("touchend", resumeSoon, { passive: true });

    // Mouse wheel scrolls the feed sideways.
    track.addEventListener("wheel", (e) => {
      if (e.deltaY !== 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        track.scrollLeft += e.deltaY;
        pos = track.scrollLeft;
        e.preventDefault();
      }
      pause(); resumeSoon();
    }, { passive: false });

    // Click-and-drag with the mouse (touch already swipes natively).
    let dragging = false, dragMoved = false, startX = 0, startScroll = 0;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      dragging = true; dragMoved = false;
      startX = e.clientX; startScroll = track.scrollLeft;
      pause();
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) dragMoved = true;
      track.scrollLeft = startScroll - dx;
      pos = track.scrollLeft;
    });
    window.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false; resumeSoon();
    });
    // If the pointer was dragged, swallow the click so it doesn't navigate.
    track.addEventListener("click", (e) => {
      if (dragMoved) { e.preventDefault(); e.stopPropagation(); dragMoved = false; }
    }, true);
  }

  function startAutoScroll(track) {
    // Attach the interaction listeners only once; re-renders reuse them.
    if (!track.dataset.scroller) {
      track.dataset.scroller = "1";
      bindInteractions(track);
    }

    const reduceMotion = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    pos = track.scrollLeft || 0;
    if (rafId) cancelAnimationFrame(rafId);
    function tick() {
      const half = track.scrollWidth / 2; // width of one (un-duplicated) set
      if (half > 0) {
        if (!paused && !reduceMotion && track.clientWidth < half) {
          pos += SCROLL_SPEED;
        } else {
          // Stay in sync with whatever the user scrolled to manually.
          pos = track.scrollLeft;
        }
        // Seamless wrap: the second (duplicate) half is identical.
        if (pos >= half) pos -= half;
        if (pos < 0) pos = 0;
        track.scrollLeft = pos;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
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

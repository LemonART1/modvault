(function () {
  const STORE_KEY = "modvault-stats-v3";
  const VISITOR_KEY = "modvault-visitor-id";
  const VIEWED_MODS_KEY = "modvault-viewed-mods-v1";
  const remoteCache = new Map();
  let userCountCache = null;

  function db() {
    return window.ModVaultSupabase || null;
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || { views: 0, visitors: 0, mods: {} };
    } catch {
      return { views: 0, visitors: 0, mods: {} };
    }
  }

  function save(data) {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function recordPageView() {
    const data = load();
    data.views = (data.views || 0) + 1;

    if (!localStorage.getItem(VISITOR_KEY)) {
      localStorage.setItem(VISITOR_KEY, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      data.visitors = (data.visitors || 0) + 1;
    }

    save(data);
  }

  function getEntry(data, mod) {
    const key = String(mod.id);
    const entry = data.mods[key] || {};
    return {
      downloads: entry.downloads || 0,
      views: entry.views || 0,
      ratingCount: entry.ratingCount || 0,
      ratingSum: entry.ratingSum || 0,
      userRating: entry.userRating || 0
    };
  }

  function getModStats(mod) {
    const local = getEntry(load(), mod);
    const remote = remoteCache.get(Number(mod.id));
    if (remote) {
      const ratingCount = Math.max(remote.ratingCount || 0, local.ratingCount || 0);
      const ratingSum = remote.ratingCount ? remote.ratingSum || 0 : local.ratingSum || 0;
      return {
        downloads: Math.max(remote.downloads || 0, local.downloads || 0),
        views: Math.max(remote.views || 0, local.views || 0),
        ratingCount,
        ratingAverage: ratingCount ? ratingSum / ratingCount : 0,
        userRating: remote.userRating || local.userRating || 0
      };
    }

    return {
      downloads: local.downloads,
      views: local.views,
      ratingCount: local.ratingCount,
      ratingAverage: local.ratingCount ? local.ratingSum / local.ratingCount : 0,
      userRating: local.userRating
    };
  }

  async function getCurrentUser() {
    if (!db()) return null;
    const cached = window.ModVaultUser?.getCachedUser?.();
    if (cached) return cached;

    try {
      const { data } = await withTimeout(db().auth.getUser(), 1200);
      return data?.user || null;
    } catch (error) {
      console.warn("Unable to read Supabase user.", error);
      return null;
    }
  }

  async function hydrateModStats(mods) {
    if (!db()) return mods.map(getModStats);
    const list = Array.isArray(mods) ? mods : [mods];
    const ids = [...new Set(list.filter(Boolean).map(mod => Number(mod.id)).filter(Boolean))];
    if (!ids.length) return [];

    try {
      const [{ data: statRows }, { data: ratingRows }] = await withTimeout(
        Promise.all([
          db().from("mod_stats").select("mod_id, views, downloads").in("mod_id", ids),
          db().from("mod_ratings").select("mod_id, user_id, rating").in("mod_id", ids)
        ]),
        3000
      );
      const user = window.ModVaultUser?.getCachedUser?.() || null;

      const statsById = new Map((statRows || []).map(row => [Number(row.mod_id), row]));
      const ratingsById = new Map();

      for (const row of ratingRows || []) {
        const id = Number(row.mod_id);
        const current = ratingsById.get(id) || { ratingCount: 0, ratingSum: 0, userRating: 0 };
        current.ratingCount += 1;
        current.ratingSum += Number(row.rating) || 0;
        if (user && row.user_id === user.id) current.userRating = Number(row.rating) || 0;
        ratingsById.set(id, current);
      }

      for (const id of ids) {
        const stat = statsById.get(id) || {};
        const rating = ratingsById.get(id) || {};
        remoteCache.set(id, {
          downloads: Number(stat.downloads) || 0,
          views: Number(stat.views) || 0,
          ratingCount: Number(rating.ratingCount) || 0,
          ratingSum: Number(rating.ratingSum) || 0,
          userRating: Number(rating.userRating) || 0
        });
      }
    } catch (error) {
      console.warn("Unable to hydrate Supabase stats.", error);
    }

    return list.map(getModStats);
  }

  async function recordModView(modId) {
    const viewerId = getViewerId();
    const viewKey = `${viewerId}:${Number(modId)}`;
    if (hasRecordedView(viewKey)) return;

    const data = load();
    const key = String(modId);
    data.views = (data.views || 0) + 1;
    data.mods[key] = data.mods[key] || {};
    data.mods[key].views = (data.mods[key].views || 0) + 1;
    save(data);
    markRecordedView(viewKey);
    mergeRemoteStat(modId, { views: data.mods[key].views });

    if (!db()) return;
    try {
      const { error } = await withTimeout(
        db().rpc("increment_unique_mod_view", {
          target_mod_id: Number(modId),
          target_viewer_id: viewerId
        }),
        2500
      );
      if (error) throw error;
    } catch (error) {
      try {
        await withTimeout(
          db().rpc("increment_mod_views", { target_mod_id: Number(modId) }),
          2500
        );
      } catch (fallbackError) {
        console.warn("Unable to record remote mod view.", fallbackError);
      }
    }
  }

  async function recordDownload(modId) {
    const data = load();
    const key = String(modId);
    data.mods[key] = data.mods[key] || {};
    data.mods[key].downloads = (data.mods[key].downloads || 0) + 1;
    save(data);
    mergeRemoteStat(modId, { downloads: data.mods[key].downloads });

    if (!db()) return;
    try {
      await withTimeout(
        db().rpc("increment_mod_downloads", { target_mod_id: Number(modId) }),
        2500
      );
    } catch (error) {
      console.warn("Unable to record remote download.", error);
    }
  }

  function rateLocalMod(mod, rating) {
    const value = Math.max(1, Math.min(5, Number(rating) || 0));
    const data = load();
    const key = String(mod.id);
    const entry = data.mods[key] || {};

    if (entry.userRating) {
      entry.ratingSum = (entry.ratingSum || 0) - entry.userRating + value;
    } else {
      entry.ratingCount = (entry.ratingCount || 0) + 1;
      entry.ratingSum = (entry.ratingSum || 0) + value;
    }

    entry.userRating = value;
    data.mods[key] = entry;
    save(data);
    return getModStats(mod);
  }

  async function rateMod(mod, rating) {
    const value = Math.max(1, Math.min(5, Number(rating) || 0));
    if (!db()) return rateLocalMod(mod, value);

    const user = await getCurrentUser();
    if (!user) {
      return { ...getModStats(mod), error: "Log in to rate mods." };
    }

    try {
      const { error } = await withTimeout(
        db()
          .from("mod_ratings")
          .upsert(
            { mod_id: Number(mod.id), user_id: user.id, rating: value },
            { onConflict: "mod_id,user_id" }
          ),
        3500
      );
      if (error) throw error;
      await hydrateModStats([mod]);
    } catch (error) {
      console.warn("Unable to save remote rating.", error);
      return { ...getModStats(mod), error: `Could not save rating: ${error.message || "Supabase rejected the request."}` };
    }

    return getModStats(mod);
  }

  function getSiteStats(mods) {
    const data = load();
    const published = mods.filter(mod => String(mod.title || "").trim());
    const downloads = published.reduce((sum, mod) => sum + getModStats(mod).downloads, 0);
    const views = published.reduce((sum, mod) => sum + getModStats(mod).views, 0) || data.views || 0;
    return {
      mods: published.length,
      downloads,
      views,
      visitors: getUserCount()
    };
  }

  async function hydrateSiteStats(mods) {
    await Promise.all([
      hydrateModStats(mods.filter(mod => String(mod.title || "").trim())),
      hydrateUserCount()
    ]);
    return getSiteStats(mods);
  }

  async function hydrateUserCount() {
    if (!db()) return getUserCount();

    try {
      const { count, error } = await db()
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      userCountCache = Number(count) || 0;
    } catch (error) {
      console.warn("Unable to load profile count.", error);
    }

    return getUserCount();
  }

  function getUserCount() {
    if (userCountCache !== null) return userCountCache;
    return localStorage.getItem(VISITOR_KEY) ? 1 : 0;
  }

  function mergeRemoteStat(modId, patch) {
    const id = Number(modId);
    const current = remoteCache.get(id) || {};
    remoteCache.set(id, {
      ...current,
      downloads: Math.max(current.downloads || 0, patch.downloads || 0),
      views: Math.max(current.views || 0, patch.views || 0),
      ratingCount: current.ratingCount || 0,
      ratingSum: current.ratingSum || 0,
      userRating: current.userRating || 0
    });
  }

  function getViewerId() {
    const user = window.ModVaultUser?.getCachedUser?.();
    return user?.id || getVisitorId();
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Supabase request timed out.")), ms);
      })
    ]);
  }

  function getVisitorId() {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  }

  function loadViewedMods() {
    try {
      return JSON.parse(localStorage.getItem(VIEWED_MODS_KEY)) || {};
    } catch {
      return {};
    }
  }

  function hasRecordedView(key) {
    return Boolean(loadViewedMods()[key]);
  }

  function markRecordedView(key) {
    const data = loadViewedMods();
    data[key] = Date.now();
    localStorage.setItem(VIEWED_MODS_KEY, JSON.stringify(data));
  }

  function formatCompact(num) {
    return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(num || 0);
  }

  function formatRating(num) {
    return Number(num || 0).toFixed(1);
  }

  window.ModVaultStats = {
    recordPageView,
    recordModView,
    hydrateModStats,
    hydrateSiteStats,
    hydrateUserCount,
    getModStats,
    recordDownload,
    rateMod,
    getSiteStats,
    formatCompact,
    formatRating
  };
})();

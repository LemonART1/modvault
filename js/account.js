// ModVault personal account: favorites, download history, version notifications.
// Depends on: js/data/mods.js (MODS, GAMES), js/supabase-client.js (ModVaultSupabase, ModVaultUser).
(function () {
  function db() { return window.ModVaultSupabase || null; }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
    ]);
  }

  async function getUser() {
    const cached = window.ModVaultUser?.getCachedUser?.();
    if (cached) return cached;
    if (!db()) return null;
    try {
      const { data } = await withTimeout(db().auth.getUser(), 1500);
      return data?.user || null;
    } catch { return null; }
  }

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function slugify(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function allMods() { return (typeof MODS !== "undefined" && MODS) ? MODS : []; }
  function gamesData() { return (typeof GAMES !== "undefined" && GAMES) ? GAMES : {}; }
  function modById(id) { return allMods().find(m => m.id === Number(id)) || null; }
  function modPageUrl(mod) { return `mods/${mod.game}/${slugify(`${mod.id}-${mod.title}`)}`; }
  function modImage(mod) {
    const list = Array.isArray(mod.images) ? mod.images : [mod.image];
    return list.filter(Boolean)[0] || "";
  }
  function gameName(mod) { return gamesData()[mod.game]?.name || mod.game; }

  // ---------- Favorites ----------
  async function loadFavorites() {
    if (!db() || !(await getUser())) return [];
    const { data, error } = await db().from("mod_favorites")
      .select("mod_id, saved_version, created_at")
      .order("created_at", { ascending: false });
    if (error) { console.warn("Unable to load favorites.", error); return []; }
    return data || [];
  }

  async function isFavorite(modId) {
    if (!db() || !(await getUser())) return false;
    const { data } = await db().from("mod_favorites")
      .select("mod_id").eq("mod_id", Number(modId)).maybeSingle();
    return !!data;
  }

  async function addFavorite(mod) {
    const user = await getUser();
    if (!db() || !user) return { ok: false, message: "Log in first." };
    const { error } = await db().from("mod_favorites").upsert({
      user_id: user.id, mod_id: Number(mod.id), saved_version: String(mod.version || "")
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  async function removeFavorite(modId) {
    if (!db() || !(await getUser())) return { ok: false };
    const { error } = await db().from("mod_favorites").delete().eq("mod_id", Number(modId));
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  // "Mark seen" = set saved_version to the current version, clearing the update flag.
  async function markSeen(modId) {
    const user = await getUser();
    const mod = modById(modId);
    if (!db() || !user || !mod) return;
    await db().from("mod_favorites")
      .update({ saved_version: String(mod.version || "") })
      .eq("mod_id", Number(modId));
  }

  // ---------- Download history ----------
  async function recordUserDownload(modId) {
    const user = await getUser();
    if (!db() || !user) return;
    try {
      await db().from("mod_downloads").insert({ user_id: user.id, mod_id: Number(modId) });
    } catch (error) { console.warn("Unable to record download history.", error); }
  }

  async function loadDownloads() {
    if (!db() || !(await getUser())) return [];
    const { data, error } = await db().from("mod_downloads")
      .select("mod_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { console.warn("Unable to load downloads.", error); return []; }
    return data || [];
  }

  // ---------- Favorite button on the mod detail page ----------
  const BOOKMARK_ICON = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" fill="none"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1z"/></svg>`;

  async function getFavoriteCount(modId) {
    if (!db()) return 0;
    try {
      const { data, error } = await db().rpc("get_mod_favorite_count", { target_mod_id: Number(modId) });
      return error ? 0 : Number(data || 0);
    } catch { return 0; }
  }

  async function mountFavoriteButton(mod) {
    const slot = document.getElementById("mod-detail-fav");
    if (!slot) return;
    const loggedIn = !!(await getUser());
    let fav = loggedIn ? await isFavorite(mod.id) : false;
    let count = await getFavoriteCount(mod.id);

    function render() {
      slot.innerHTML = `
        <button class="fav-btn ${fav ? "is-active" : ""}" type="button" id="fav-toggle-btn" title="${loggedIn ? "" : "Log in to save favorites"}">
          ${BOOKMARK_ICON}
          <span class="fav-count">${count}</span>
        </button>`;
      slot.querySelector("#fav-toggle-btn").addEventListener("click", onClick);
    }

    async function onClick() {
      if (!loggedIn) { window.location.href = "/account"; return; }
      const btn = slot.querySelector("#fav-toggle-btn");
      if (btn) btn.disabled = true;
      if (fav) {
        if ((await removeFavorite(mod.id)).ok) { fav = false; count = Math.max(0, count - 1); }
      } else {
        if ((await addFavorite(mod)).ok) { fav = true; count = count + 1; }
      }
      render();
    }

    render();
  }

  // ---------- Account dashboard ----------
  function thumb(mod) {
    const img = modImage(mod);
    return img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="account-item-noimg"></span>`;
  }
  function itemLink(mod, meta) {
    return `<a class="account-item" href="${esc(modPageUrl(mod))}">
      ${thumb(mod)}
      <span class="account-item-text"><strong>${esc(mod.title)}</strong><span>${meta}</span></span>
    </a>`;
  }

  function renderNotifications(updates) {
    if (!updates.length) return "";
    const rows = updates.map(f => {
      const mod = modById(f.mod_id); if (!mod) return "";
      return `<div class="account-item-row">
        ${itemLink(mod, `${esc(gameName(mod))} &middot; v${esc(f.saved_version)} &rarr; v${esc(mod.version)}`)}
        <button class="btn btn-ghost account-seen-btn" data-mod="${mod.id}" type="button">Mark seen</button>
      </div>`;
    }).join("");
    return `<section class="content-panel account-section">
      <h2>&#128276; Updates (${updates.length})</h2>
      <div class="account-list">${rows}</div>
    </section>`;
  }

  function renderFavorites(favorites) {
    const rows = favorites.map(f => {
      const mod = modById(f.mod_id); if (!mod) return "";
      return `<div class="account-item-row">
        ${itemLink(mod, `${esc(gameName(mod))} &middot; v${esc(mod.version)}`)}
        <button class="btn btn-ghost account-remove-btn" data-mod="${mod.id}" type="button">Remove</button>
      </div>`;
    }).join("");
    return `<section class="content-panel account-section">
      <h2>&#11088; Favorites (${favorites.length})</h2>
      ${favorites.length
        ? `<div class="account-list">${rows}</div>`
        : `<p class="account-empty">No favorites yet. Open any mod and press &ldquo;Add to favorites&rdquo;.</p>`}
    </section>`;
  }

  function renderDownloads(downloads) {
    const rows = downloads.map(d => {
      const mod = modById(d.mod_id); if (!mod) return "";
      const date = new Date(d.created_at).toLocaleDateString();
      return `<div class="account-item-row">
        ${itemLink(mod, `${esc(gameName(mod))} &middot; ${esc(date)}`)}
      </div>`;
    }).join("");
    return `<section class="content-panel account-section">
      <h2>&#128229; Download history</h2>
      ${downloads.length
        ? `<div class="account-list">${rows}</div>`
        : `<p class="account-empty">No downloads yet.</p>`}
    </section>`;
  }

  async function renderDashboard() {
    const root = document.getElementById("account-dashboard");
    if (!root) return;
    if (!(await getUser())) { root.innerHTML = ""; return; }

    root.innerHTML = `<p class="account-loading">Loading your data&hellip;</p>`;
    const [favorites, downloads] = await Promise.all([loadFavorites(), loadDownloads()]);
    const updates = favorites.filter(f => {
      const mod = modById(f.mod_id);
      return mod && String(mod.version || "") !== String(f.saved_version || "");
    });

    root.innerHTML = renderNotifications(updates) + renderFavorites(favorites) + renderDownloads(downloads);

    root.querySelectorAll(".account-seen-btn").forEach(btn => {
      btn.addEventListener("click", async () => { btn.disabled = true; await markSeen(btn.dataset.mod); renderDashboard(); });
    });
    root.querySelectorAll(".account-remove-btn").forEach(btn => {
      btn.addEventListener("click", async () => { btn.disabled = true; await removeFavorite(btn.dataset.mod); renderDashboard(); });
    });
  }

  function init() {
    if (!document.getElementById("account-dashboard")) return;
    renderDashboard();
    db()?.auth.onAuthStateChange(() => renderDashboard());
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.ModVaultAccount = {
    getUser, isFavorite, addFavorite, removeFavorite, markSeen,
    recordUserDownload, loadFavorites, loadDownloads,
    mountFavoriteButton, renderDashboard
  };
})();

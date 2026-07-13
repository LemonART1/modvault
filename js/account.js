// ModVault personal account: favorites, download history, version notifications.
// Depends on: js/data/mods.js (MODS, GAMES), js/supabase-client.js (ModVaultSupabase, ModVaultUser).
(function () {
  // Some mod entries store the version with a leading "v" already (e.g. "V10.0"),
  // which duplicated into "vv10.0" wherever we prefix our own "v". Strip it first.
  function cleanVersion(v) { return String(v || "").replace(/^\s*v\.?\s*/i, ""); }

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

  // ---------- Avatar ----------
  const AVATAR_BUCKET = "avatars";
  const AVATAR_DIM = 256;
  const DEFAULT_AVATAR_ICON = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" fill="none"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/></svg>`;

  async function getProfile(userId) {
    if (!db() || !userId) return null;
    const { data, error } = await db().from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) { console.warn("Unable to load profile.", error); return null; }
    return data;
  }

  // Crops to a centered square and downsizes to AVATAR_DIM, so uploads stay
  // tiny (a few KB) regardless of what the user picks.
  function resizeImageToWebp(file, dim) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = dim;
        canvas.height = dim;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, dim, dim);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not process image.")), "image/webp", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image.")); };
      img.src = url;
    });
  }

  async function uploadAvatar(file) {
    const user = await getUser();
    if (!db() || !user) return { ok: false, message: "Log in first." };
    if (!file || !file.type?.startsWith("image/")) return { ok: false, message: "Choose an image file." };

    let blob;
    try {
      blob = await resizeImageToWebp(file, AVATAR_DIM);
    } catch (error) {
      return { ok: false, message: error.message || "Could not process image." };
    }

    const path = `${user.id}/avatar.webp`;
    const { error: uploadError } = await db().storage.from(AVATAR_BUCKET)
      .upload(path, blob, { upsert: true, contentType: "image/webp" });
    if (uploadError) return { ok: false, message: uploadError.message };

    const { data } = db().storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // The path never changes on re-upload, so bust any CDN/browser cache
    // with a fresh query string each time.
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error: profileError } = await db().from("profiles")
      .upsert({ id: user.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() });
    if (profileError) return { ok: false, message: profileError.message };

    // Push the new avatar into the header immediately instead of waiting
    // for its cache to expire.
    window.ModVaultUser?.setAvatarUrl?.(user.id, avatarUrl);

    return { ok: true, url: avatarUrl };
  }

  function avatarImgHtml(url) {
    return url
      ? `<img class="account-avatar-img" src="${esc(url)}" alt="Avatar">`
      : `<span class="account-avatar-img account-avatar-placeholder">${DEFAULT_AVATAR_ICON}</span>`;
  }

  async function mountAvatarWidget() {
    const root = document.getElementById("account-avatar");
    if (!root) return;
    const user = await getUser();
    if (!user) { root.innerHTML = ""; return; }

    const profile = await getProfile(user.id);
    root.innerHTML = `
      <label class="account-avatar-circle" for="account-avatar-input" title="Change avatar">
        ${avatarImgHtml(profile?.avatar_url)}
        <span class="account-avatar-overlay">Change</span>
      </label>
      <input type="file" id="account-avatar-input" accept="image/*" hidden>
      <p class="account-avatar-status" id="account-avatar-status"></p>
    `;

    const input = document.getElementById("account-avatar-input");
    const status = document.getElementById("account-avatar-status");
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      status.textContent = "Uploading...";
      status.classList.remove("ok");
      const result = await uploadAvatar(file);
      if (result.ok) {
        status.textContent = "Avatar updated.";
        status.classList.add("ok");
        mountAvatarWidget();
      } else {
        status.textContent = result.message || "Could not upload avatar.";
      }
      input.value = "";
    });
  }

  // ---------- Account dashboard ----------
  const ACCOUNT_PAGE_SIZE = 7;
  let favoritesData = [];
  let downloadsData = [];
  let favPage = 1;
  let dlPage = 1;

  // Slices a list to the current page, clamping the page number if the
  // list shrank (e.g. after removing a favorite) so it never points past
  // the last page.
  function paginate(list, page) {
    const totalPages = Math.max(1, Math.ceil(list.length / ACCOUNT_PAGE_SIZE));
    const clamped = Math.min(Math.max(1, page), totalPages);
    return { slice: list.slice((clamped - 1) * ACCOUNT_PAGE_SIZE, clamped * ACCOUNT_PAGE_SIZE), page: clamped, totalPages };
  }

  function paginationHtml(section, page, totalPages) {
    if (totalPages <= 1) return "";
    return `<div class="account-pagination">
      <button class="btn btn-ghost account-page-btn" data-section="${section}" data-page="${page - 1}" type="button" ${page === 1 ? "disabled" : ""}>Prev</button>
      <span class="account-page-label">${page} / ${totalPages}</span>
      <button class="btn btn-ghost account-page-btn" data-section="${section}" data-page="${page + 1}" type="button" ${page === totalPages ? "disabled" : ""}>Next</button>
    </div>`;
  }

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
        ${itemLink(mod, `${esc(gameName(mod))} &middot; v${esc(cleanVersion(f.saved_version))} &rarr; v${esc(cleanVersion(mod.version))}`)}
        <button class="btn btn-ghost account-seen-btn" data-mod="${mod.id}" type="button">Mark seen</button>
      </div>`;
    }).join("");
    return `<section class="content-panel account-section">
      <h2>Updates (${updates.length})</h2>
      <div class="account-list">${rows}</div>
    </section>`;
  }

  function renderFavorites(favorites) {
    const { slice, page, totalPages } = paginate(favorites, favPage);
    favPage = page;
    const rows = slice.map(f => {
      const mod = modById(f.mod_id); if (!mod) return "";
      return `<div class="account-item-row">
        ${itemLink(mod, `${esc(gameName(mod))} &middot; v${esc(cleanVersion(mod.version))}`)}
        <button class="btn btn-ghost account-remove-btn" data-mod="${mod.id}" type="button">Remove</button>
      </div>`;
    }).join("");
    return `<section class="content-panel account-section">
      <h2>Favorites (${favorites.length})</h2>
      ${favorites.length
        ? `<div class="account-list">${rows}</div>${paginationHtml("favorites", page, totalPages)}`
        : `<p class="account-empty">No favorites yet. Open any mod and press &ldquo;Add to favorites&rdquo;.</p>`}
    </section>`;
  }

  function renderDownloads(downloads) {
    const { slice, page, totalPages } = paginate(downloads, dlPage);
    dlPage = page;
    const rows = slice.map(d => {
      const mod = modById(d.mod_id); if (!mod) return "";
      const date = new Date(d.created_at).toLocaleDateString();
      return `<div class="account-item-row">
        ${itemLink(mod, `${esc(gameName(mod))} &middot; ${esc(date)}`)}
      </div>`;
    }).join("");
    return `<section class="content-panel account-section">
      <h2>Download history</h2>
      ${downloads.length
        ? `<div class="account-list">${rows}</div>${paginationHtml("downloads", page, totalPages)}`
        : `<p class="account-empty">No downloads yet.</p>`}
    </section>`;
  }

  // Rebuilds the dashboard body from already-fetched data, so paging
  // through favorites/downloads doesn't refetch from Supabase each click.
  function renderDashboardBody() {
    const root = document.getElementById("account-dashboard");
    if (!root) return;
    const updates = favoritesData.filter(f => {
      const mod = modById(f.mod_id);
      return mod && String(mod.version || "") !== String(f.saved_version || "");
    });

    root.innerHTML = renderNotifications(updates)
      + `<div class="account-columns">${renderFavorites(favoritesData)}${renderDownloads(downloadsData)}</div>`;

    root.querySelectorAll(".account-seen-btn").forEach(btn => {
      btn.addEventListener("click", async () => { btn.disabled = true; await markSeen(btn.dataset.mod); renderDashboard(); });
    });
    root.querySelectorAll(".account-remove-btn").forEach(btn => {
      btn.addEventListener("click", async () => { btn.disabled = true; await removeFavorite(btn.dataset.mod); renderDashboard(); });
    });
    root.querySelectorAll(".account-page-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.section === "favorites") favPage = Number(btn.dataset.page);
        else dlPage = Number(btn.dataset.page);
        renderDashboardBody();
      });
    });
  }

  async function renderDashboard() {
    const root = document.getElementById("account-dashboard");
    if (!root) return;
    if (!(await getUser())) { root.innerHTML = ""; return; }

    root.innerHTML = `<p class="account-loading">Loading your data&hellip;</p>`;
    const [favorites, downloads] = await Promise.all([loadFavorites(), loadDownloads()]);
    favoritesData = favorites;
    downloadsData = downloads;
    renderDashboardBody();
  }

  function init() {
    if (!document.getElementById("account-dashboard") && !document.getElementById("account-avatar")) return;
    renderDashboard();
    mountAvatarWidget();
    db()?.auth.onAuthStateChange(() => { renderDashboard(); mountAvatarWidget(); });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.ModVaultAccount = {
    getUser, isFavorite, addFavorite, removeFavorite, markSeen,
    recordUserDownload, loadFavorites, loadDownloads,
    mountFavoriteButton, renderDashboard,
    getProfile, uploadAvatar, mountAvatarWidget, avatarImgHtml
  };
})();

// Public user profile: shows a user's avatar/username and the comments
// they've posted across the site. Anyone can view any profile (no login
// required) since profiles and mod_comments are both publicly readable.
// Depends on: js/data/mods.js (MODS, GAMES), js/supabase-client.js
// (ModVaultSupabase), js/account.js (ModVaultAccount.getProfile/avatarImgHtml).
(function () {
  const PAGE_SIZE = 7;
  let commentsData = [];
  let page = 1;

  function db() { return window.ModVaultSupabase || null; }

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function slugify(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function allMods() { return (typeof MODS !== "undefined" && MODS) ? MODS : []; }
  function gamesData() { return (typeof GAMES !== "undefined" && GAMES) ? GAMES : {}; }
  function modById(id) { return allMods().find(m => m.id === Number(id)) || null; }
  function modPageUrl(mod) { return `mods/${mod.game}/${slugify(`${mod.id}-${mod.title}`)}`; }

  function timeAgo(iso) {
    const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
    for (const [name, secs] of units) {
      const value = Math.floor(diffSec / secs);
      if (value >= 1) return `${value} ${name}${value > 1 ? "s" : ""} ago`;
    }
    return "just now";
  }

  async function loadComments(userId) {
    if (!db()) return [];
    const { data, error } = await db().from("mod_comments")
      .select("id, mod_id, body, parent_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { console.warn("Unable to load user comments.", error); return []; }
    return data || [];
  }

  function commentRowHtml(comment) {
    const mod = modById(comment.mod_id);
    const target = mod ? modPageUrl(mod) : null;
    const modLabel = mod ? `${gamesData()[mod.game]?.name || mod.game} - ${mod.title}` : `Mod #${comment.mod_id}`;
    return `
      <div class="account-item-row">
        <a class="account-item" href="${target ? esc(target) : "#"}">
          <div class="account-item-text">
            <strong>${esc(modLabel)}</strong>
            <span>${esc(comment.body)}</span>
          </div>
        </a>
        <span class="account-item-text"><span>${timeAgo(comment.created_at)}</span></span>
      </div>
    `;
  }

  function paginationHtml(p, totalPages) {
    if (totalPages <= 1) return "";
    return `<div class="account-pagination">
      <button class="btn btn-ghost profile-page-btn" data-page="${p - 1}" type="button" ${p === 1 ? "disabled" : ""}>Prev</button>
      <span class="account-page-label">${p} / ${totalPages}</span>
      <button class="btn btn-ghost profile-page-btn" data-page="${p + 1}" type="button" ${p === totalPages ? "disabled" : ""}>Next</button>
    </div>`;
  }

  function renderComments() {
    const root = document.getElementById("profile-comments");
    if (!root) return;
    if (!commentsData.length) {
      root.innerHTML = `<p class="account-empty">No comments yet.</p>`;
      return;
    }
    const totalPages = Math.max(1, Math.ceil(commentsData.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), totalPages);
    const slice = commentsData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    root.innerHTML = `<div class="account-list">${slice.map(commentRowHtml).join("")}</div>${paginationHtml(page, totalPages)}`;
    root.querySelectorAll(".profile-page-btn").forEach(btn => {
      btn.addEventListener("click", () => { page = Number(btn.dataset.page); renderComments(); });
    });
  }

  async function init() {
    const root = document.getElementById("profile-root");
    if (!root) return;
    const userId = new URLSearchParams(location.search).get("u");
    if (!userId) {
      root.innerHTML = `<p class="account-empty">No profile specified.</p>`;
      return;
    }

    const profile = await window.ModVaultAccount?.getProfile?.(userId);
    if (!profile) {
      root.innerHTML = `<p class="account-empty">This profile could not be found.</p>`;
      return;
    }

    root.innerHTML = `
      <div class="account-profile-card">
        <div class="account-profile-left">
          <div class="account-avatar-circle" style="cursor:default">
            ${window.ModVaultAccount.avatarImgHtml(profile.avatar_url)}
          </div>
          <div class="account-status"><strong>${esc(profile.username || "User")}</strong></div>
        </div>
      </div>
      <div class="account-section">
        <h2>Comments</h2>
        <div id="profile-comments"><p class="account-loading">Loading&hellip;</p></div>
      </div>
    `;

    commentsData = await loadComments(userId);
    renderComments();
  }

  window.ModVaultProfile = { init };
})();

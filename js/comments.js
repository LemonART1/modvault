// ModVault public mod comments. Anyone can read, only logged-in users can
// post, no profanity filter (length cap + login requirement is the only
// spam guard by design).
// Depends on: js/supabase-client.js (ModVaultSupabase), js/account.js
// (ModVaultAccount.getUser).
(function () {
  const MAX_LENGTH = 500;

  function db() { return window.ModVaultSupabase || null; }

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function timeAgo(iso) {
    const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
    for (const [name, secs] of units) {
      const value = Math.floor(diffSec / secs);
      if (value >= 1) return `${value} ${name}${value > 1 ? "s" : ""} ago`;
    }
    return "just now";
  }

  async function loadComments(modId) {
    if (!db()) return [];
    const { data, error } = await db().from("mod_comments")
      .select("id, user_id, username, body, created_at")
      .eq("mod_id", Number(modId))
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { console.warn("Unable to load comments.", error); return []; }
    return data || [];
  }

  async function postComment(modId, body) {
    const text = String(body || "").trim().slice(0, MAX_LENGTH);
    if (!text) return { ok: false, message: "Write something first." };
    const user = await window.ModVaultAccount?.getUser();
    if (!db() || !user) return { ok: false, message: "Log in first." };
    const username = user.user_metadata?.username || user.email?.split("@")[0] || "User";
    const { error } = await db().from("mod_comments").insert({
      mod_id: Number(modId), user_id: user.id, username, body: text
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  async function deleteComment(commentId) {
    if (!db()) return { ok: false };
    const { error } = await db().from("mod_comments").delete().eq("id", commentId);
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  function commentHtml(comment, currentUserId) {
    const mine = currentUserId && comment.user_id === currentUserId;
    return `
      <div class="mod-comment">
        <div class="mod-comment-head">
          <strong>${esc(comment.username)}</strong>
          <time>${timeAgo(comment.created_at)}</time>
          ${mine ? `<button class="mod-comment-delete" type="button" data-id="${comment.id}">Delete</button>` : ""}
        </div>
        <p>${esc(comment.body)}</p>
      </div>
    `;
  }

  async function mount(modId) {
    const root = document.getElementById("mod-comments");
    if (!root) return;
    root.innerHTML = `<p class="mod-comments-loading">Loading comments&hellip;</p>`;

    const [user, comments] = await Promise.all([
      window.ModVaultAccount?.getUser() ?? Promise.resolve(null),
      loadComments(modId)
    ]);

    const formHtml = user ? `
      <form class="mod-comment-form" id="mod-comment-form">
        <textarea id="mod-comment-input" maxlength="${MAX_LENGTH}" placeholder="Share your experience with this mod..." rows="3"></textarea>
        <div class="mod-comment-form-row">
          <span class="mod-comment-counter" id="mod-comment-counter">0 / ${MAX_LENGTH}</span>
          <button type="submit">Post comment</button>
        </div>
        <p class="mod-comment-error" id="mod-comment-error"></p>
      </form>
    ` : `<p class="mod-comments-login"><a href="account">Log in</a> to leave a comment.</p>`;

    root.innerHTML = `
      <h2>Comments${comments.length ? ` (${comments.length})` : ""}</h2>
      ${formHtml}
      <div class="mod-comment-list">
        ${comments.length ? comments.map(c => commentHtml(c, user?.id)).join("") : `<p class="mod-comments-empty">No comments yet. Be the first.</p>`}
      </div>
    `;

    const form = document.getElementById("mod-comment-form");
    if (form) {
      const input = document.getElementById("mod-comment-input");
      const counter = document.getElementById("mod-comment-counter");
      input.addEventListener("input", () => {
        counter.textContent = `${input.value.length} / ${MAX_LENGTH}`;
      });
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        const result = await postComment(modId, input.value);
        if (result.ok) {
          mount(modId);
        } else {
          document.getElementById("mod-comment-error").textContent = result.message || "Could not post comment.";
          btn.disabled = false;
        }
      });
    }

    root.querySelectorAll(".mod-comment-delete").forEach(btn => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        await deleteComment(Number(btn.dataset.id));
        mount(modId);
      });
    });
  }

  window.ModVaultComments = { mount, loadComments, postComment, deleteComment };
})();

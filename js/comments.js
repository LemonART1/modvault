// ModVault public mod comments: one level of replies, likes/dislikes.
// Anyone can read, only logged-in users can post (no profanity filter -
// length cap + login requirement is the only spam guard by design).
// Depends on: js/supabase-client.js (ModVaultSupabase), js/account.js
// (ModVaultAccount.getUser).
(function () {
  const MAX_LENGTH = 500;
  // Site owner's account - matches the RLS delete policy in
  // SUPABASE_COMMENTS_SETUP.sql, so this only controls whether the Delete
  // button is shown; the database enforces it either way.
  const ADMIN_USER_ID = "3e836ea2-bb01-406b-94c0-59bf49ab3bc9";

  const THUMB_UP = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" fill="none"><path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0 4.5-8a2 2 0 0 1 2 2.2L12.7 9H18a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 16.6 20H7"/></svg>`;
  const THUMB_DOWN = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" fill="none"><path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3zm0 0-4.5 8a2 2 0 0 1-2-2.2L11.3 15H6a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 7.4 4H17"/></svg>`;

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

  // Renders a leading "@username " in the body (added automatically when
  // replying) as a highlighted mention. Matched against the parent
  // comment's actual username rather than a regex guess, since usernames
  // can contain spaces (e.g. "@Patrick mods its not free" is a mention of
  // "Patrick mods", not just "Patrick").
  function renderBody(body, mentionUsername) {
    const text = String(body);
    const prefix = mentionUsername ? `@${mentionUsername} ` : null;
    if (prefix && text.startsWith(prefix)) {
      return `<span class="mod-comment-mention">@${esc(mentionUsername)}</span> ${esc(text.slice(prefix.length))}`;
    }
    return esc(text);
  }

  async function loadComments(modId) {
    if (!db()) return [];
    const { data, error } = await db().from("mod_comments")
      .select("id, user_id, username, body, parent_id, created_at")
      .eq("mod_id", Number(modId))
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { console.warn("Unable to load comments.", error); return []; }
    return data || [];
  }

  async function loadVotes(commentIds) {
    if (!db() || !commentIds.length) return [];
    const { data, error } = await db().from("mod_comment_votes")
      .select("comment_id, user_id, vote")
      .in("comment_id", commentIds);
    if (error) { console.warn("Unable to load comment votes.", error); return []; }
    return data || [];
  }

  function summarizeVotes(votes, currentUserId) {
    const summary = {};
    for (const v of votes) {
      const entry = summary[v.comment_id] || (summary[v.comment_id] = { likes: 0, dislikes: 0, mine: 0 });
      if (v.vote === 1) entry.likes++; else entry.dislikes++;
      if (currentUserId && v.user_id === currentUserId) entry.mine = v.vote;
    }
    return summary;
  }

  async function postComment(modId, body, parentId) {
    const text = String(body || "").trim().slice(0, MAX_LENGTH);
    if (!text) return { ok: false, message: "Write something first." };
    const user = await window.ModVaultAccount?.getUser();
    if (!db() || !user) return { ok: false, message: "Log in first." };
    const username = user.user_metadata?.username || user.email?.split("@")[0] || "User";
    const { error } = await db().from("mod_comments").insert({
      mod_id: Number(modId), user_id: user.id, username, body: text,
      parent_id: parentId ? Number(parentId) : null
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  async function deleteComment(commentId) {
    if (!db()) return { ok: false };
    const { error } = await db().from("mod_comments").delete().eq("id", commentId);
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  // Clicking the same vote again removes it (toggle off); clicking the
  // other one switches it.
  async function vote(commentId, value, currentVote) {
    const user = await window.ModVaultAccount?.getUser();
    if (!db() || !user) return { ok: false, message: "Log in first." };
    if (currentVote === value) {
      const { error } = await db().from("mod_comment_votes")
        .delete().eq("comment_id", commentId).eq("user_id", user.id);
      return error ? { ok: false, message: error.message } : { ok: true };
    }
    const { error } = await db().from("mod_comment_votes")
      .upsert({ comment_id: commentId, user_id: user.id, vote: value });
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  function voteRowHtml(comment, votes) {
    const v = votes[comment.id] || { likes: 0, dislikes: 0, mine: 0 };
    return `
      <button class="mod-comment-vote ${v.mine === 1 ? "active-up" : ""}" type="button" data-vote="1" data-id="${comment.id}">
        ${THUMB_UP}<span>${v.likes}</span>
      </button>
      <button class="mod-comment-vote ${v.mine === -1 ? "active-down" : ""}" type="button" data-vote="-1" data-id="${comment.id}">
        ${THUMB_DOWN}<span>${v.dislikes}</span>
      </button>
      <button class="mod-comment-reply-btn" type="button" data-reply="${comment.id}">Reply</button>
    `;
  }

  function commentHtml(comment, currentUserId, votes, parentUsername) {
    const mine = currentUserId && (comment.user_id === currentUserId || currentUserId === ADMIN_USER_ID);
    return `
      <div class="mod-comment${parentUsername ? " mod-comment-reply" : ""}" data-comment-id="${comment.id}">
        <div class="mod-comment-head">
          <strong>${esc(comment.username)}</strong>
          <time>${timeAgo(comment.created_at)}</time>
          ${mine ? `<button class="mod-comment-delete" type="button" data-id="${comment.id}">Delete</button>` : ""}
        </div>
        <p>${renderBody(comment.body, parentUsername)}</p>
        <div class="mod-comment-actions">${voteRowHtml(comment, votes)}</div>
        <div class="mod-comment-reply-slot" id="reply-slot-${comment.id}"></div>
      </div>
    `;
  }

  function replyFormHtml(username) {
    return `
      <form class="mod-comment-form mod-comment-reply-form">
        <textarea maxlength="${MAX_LENGTH}" rows="2">${esc(`@${username} `)}</textarea>
        <div class="mod-comment-form-row">
          <span class="mod-comment-counter">0 / ${MAX_LENGTH}</span>
          <button type="submit">Reply</button>
        </div>
        <p class="mod-comment-error"></p>
      </form>
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
    const votesRaw = await loadVotes(comments.map(c => c.id));
    const votes = summarizeVotes(votesRaw, user?.id);

    const topLevel = comments.filter(c => !c.parent_id);
    const repliesByParent = {};
    comments.filter(c => c.parent_id).forEach(c => {
      (repliesByParent[c.parent_id] || (repliesByParent[c.parent_id] = [])).push(c);
    });
    Object.values(repliesByParent).forEach(list => list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));

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
        ${topLevel.length ? topLevel.map(c => `
          ${commentHtml(c, user?.id, votes, null)}
          ${(repliesByParent[c.id] || []).map(r => commentHtml(r, user?.id, votes, c.username)).join("")}
        `).join("") : `<p class="mod-comments-empty">No comments yet. Be the first.</p>`}
      </div>
    `;

    bindForm(document.getElementById("mod-comment-form"), document.getElementById("mod-comment-input"),
      document.getElementById("mod-comment-counter"), document.getElementById("mod-comment-error"),
      async (text) => postComment(modId, text), () => mount(modId));

    root.querySelectorAll(".mod-comment-delete").forEach(btn => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        await deleteComment(Number(btn.dataset.id));
        mount(modId);
      });
    });

    root.querySelectorAll(".mod-comment-vote").forEach(btn => {
      btn.addEventListener("click", async () => {
        const commentId = Number(btn.dataset.id);
        const value = Number(btn.dataset.vote);
        const current = (votes[commentId] || {}).mine || 0;
        btn.disabled = true;
        const result = await vote(commentId, value, current);
        if (!result.ok) { setStatusOnce(root, result.message); }
        mount(modId);
      });
    });

    root.querySelectorAll(".mod-comment-reply-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!user) { setStatusOnce(root, "Log in to reply."); return; }
        const commentId = btn.dataset.reply;
        const slot = document.getElementById(`reply-slot-${commentId}`);
        if (!slot) return;
        if (slot.innerHTML) { slot.innerHTML = ""; return; }
        const authorEl = btn.closest(".mod-comment")?.querySelector(".mod-comment-head strong");
        const authorName = authorEl ? authorEl.textContent : "";
        slot.innerHTML = replyFormHtml(authorName);
        const form = slot.querySelector("form");
        bindForm(form, form.querySelector("textarea"), form.querySelector(".mod-comment-counter"),
          form.querySelector(".mod-comment-error"), async (text) => postComment(modId, text, commentId),
          () => mount(modId));
      });
    });
  }

  function bindForm(form, input, counter, errorEl, submitFn, onSuccess) {
    if (!form) return;
    counter.textContent = `${input.value.length} / ${MAX_LENGTH}`;
    input.addEventListener("input", () => {
      counter.textContent = `${input.value.length} / ${MAX_LENGTH}`;
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      const result = await submitFn(input.value);
      if (result.ok) {
        onSuccess();
      } else {
        errorEl.textContent = result.message || "Could not post comment.";
        btn.disabled = false;
      }
    });
  }

  function setStatusOnce(root, message) {
    if (!message) return;
    const error = document.getElementById("mod-comment-error");
    if (error) error.textContent = message;
  }

  window.ModVaultComments = { mount, loadComments, postComment, deleteComment, vote };
})();

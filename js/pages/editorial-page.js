function renderEditorialPage(kind) {
  const isNews = kind === "news";
  const posts = isNews ? NEWS_POSTS : GUIDE_POSTS;
  const wrap = document.getElementById("editorial-list");
  if (!wrap) return;

  wrap.innerHTML = posts.map(post => `
    <a class="editorial-card" href="${escEditorial(post.url)}">
      <div class="editorial-card-meta">
        <span>${escEditorial(post.tag)}</span>
        ${post.date ? `<time datetime="${escEditorial(post.date)}">${escEditorial(post.date)}</time>` : ""}
      </div>
      <h2>${escEditorial(post.title)}</h2>
      <p>${escEditorial(post.summary)}</p>
    </a>
  `).join("");
}

function escEditorial(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

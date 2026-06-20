const EDITORIAL_PAGE_SIZE = 20;
const editorialState = { news: 1, guides: 1 };

function renderEditorialPage(kind) {
  const isNews = kind === "news";
  const posts = isNews ? NEWS_POSTS : GUIDE_POSTS;
  const wrap = document.getElementById("editorial-list");
  if (!wrap) return;

  const totalPages = Math.max(1, Math.ceil(posts.length / EDITORIAL_PAGE_SIZE));
  const page = Math.min(Math.max(1, editorialState[kind] || 1), totalPages);
  editorialState[kind] = page;
  const pagePosts = posts.slice((page - 1) * EDITORIAL_PAGE_SIZE, page * EDITORIAL_PAGE_SIZE);

  wrap.innerHTML = pagePosts.map(post => `
    <a class="editorial-card" href="${escEditorial(post.url)}">
      <div class="editorial-card-meta">
        <span>${escEditorial(post.tag)}</span>
        ${post.date ? `<time datetime="${escEditorial(post.date)}">${escEditorial(post.date)}</time>` : ""}
      </div>
      <h2>${escEditorial(post.title)}</h2>
      <p>${escEditorial(post.summary)}</p>
    </a>
  `).join("");

  renderEditorialPagination(kind, totalPages, page);
}

function renderEditorialPagination(kind, totalPages, page) {
  const wrap = document.getElementById("editorial-pagination");
  if (!wrap) return;

  if (totalPages <= 1) {
    wrap.innerHTML = "";
    return;
  }

  const buttons = [];
  buttons.push(`<button class="page-btn" ${page === 1 ? "disabled" : ""} onclick="goToEditorialPage('${kind}', ${page - 1})">Prev</button>`);
  for (let p = 1; p <= totalPages; p++) {
    buttons.push(`<button class="page-btn ${p === page ? "active" : ""}" onclick="goToEditorialPage('${kind}', ${p})">${p}</button>`);
  }
  buttons.push(`<button class="page-btn" ${page === totalPages ? "disabled" : ""} onclick="goToEditorialPage('${kind}', ${page + 1})">Next</button>`);
  wrap.innerHTML = buttons.join("");
}

function goToEditorialPage(kind, page) {
  editorialState[kind] = page;
  renderEditorialPage(kind);
  document.querySelector(".editorial-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function escEditorial(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

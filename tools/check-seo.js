const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const SITE_URL = "https://modvault.space";

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function slugify(value) {
  return String(value).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const dataContext = {};
vm.createContext(dataContext);
vm.runInContext(`${read("js/data/mods.js")}\nthis.GAMES = GAMES; this.MODS = MODS;`, dataContext);
const { GAMES, MODS } = dataContext;

const problems = [];
const modPages = [];

for (const mod of MODS.filter(item => String(item.title ?? "").trim())) {
  const game = GAMES[mod.game];
  if (!game) {
    problems.push(`Mod #${mod.id} has an unknown game key: ${mod.game}`);
    continue;
  }

  const pagePath = `mods/${mod.game}/${slugify(`${mod.id}-${mod.title}`)}.html`;
  const cleanUrl = `${SITE_URL}/${pagePath.replace(/\.html$/, "")}`;
  modPages.push({ mod, game, pagePath, cleanUrl });

  if (!fs.existsSync(path.join(root, pagePath))) {
    problems.push(`Missing page: ${pagePath}`);
    continue;
  }

  const html = read(pagePath);
  const expectedTitle = `${esc(mod.title)} - Download ${esc(game.name)} Mod - ModVault`;
  if (!html.includes(`<title>${expectedTitle}</title>`)) problems.push(`Wrong or missing title: ${pagePath}`);
  if (!html.includes('<meta name="robots" content="index, follow">')) problems.push(`Missing index, follow robots meta: ${pagePath}`);
  if (!html.includes(`<link rel="canonical" href="${cleanUrl}">`)) problems.push(`Wrong or missing canonical URL: ${pagePath}`);
  if (!html.includes(`<h1 class="modal-title">${esc(mod.title)}</h1>`)) problems.push(`Missing static H1: ${pagePath}`);
  if (!html.includes(`<p class="modal-desc-text">${esc(mod.description)}</p>`)) problems.push(`Missing static mod description: ${pagePath}`);
  if (!html.includes('application/ld+json')) problems.push(`Missing structured data: ${pagePath}`);
}

for (const [gameKey, game] of Object.entries(GAMES)) {
  const gameFile = `${game.page}.html`;
  if (!fs.existsSync(path.join(root, gameFile))) {
    problems.push(`Missing game page: ${gameFile}`);
    continue;
  }
  const html = read(gameFile);
  if (!html.includes("<!-- MOD-INDEX:START -->") || !html.includes("<!-- MOD-INDEX:END -->")) {
    problems.push(`Missing crawlable mod index on ${gameFile}`);
    continue;
  }
  for (const { mod, pagePath } of modPages.filter(item => item.mod.game === gameKey)) {
    const href = pagePath.replace(/\.html$/, "");
    if (!html.includes(`href="${href}"`)) problems.push(`Missing internal link to mod #${mod.id} in ${gameFile}`);
  }
}

const sitemap = read("sitemap.xml");
for (const { pagePath, cleanUrl } of modPages) {
  if (!sitemap.includes(`<loc>${cleanUrl}</loc>`)) problems.push(`Missing sitemap URL: ${pagePath}`);
}

const robots = read("robots.txt");
if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) problems.push("robots.txt does not declare the sitemap");

if (problems.length) {
  console.error(`SEO validation failed: ${problems.length} issue(s).`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`SEO validation passed: ${modPages.length} mod pages, ${Object.keys(GAMES).length} game indexes and sitemap entries are ready for crawling.`);
}

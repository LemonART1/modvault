// One-off site checker: finds broken internal links, missing images and assets.
// All internal relative links resolve from the project root because deep pages
// (mods/*, content/*) use <base href="../../">. Run: node tools/check-links.js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function listHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".git", "tools"].includes(e.name)) return [];
      return listHtml(full);
    }
    return e.name.endsWith(".html") ? [full] : [];
  });
}

const exts = [".css", ".js", ".svg", ".ico", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".xml", ".txt", ".html"];

function existsTarget(target) {
  // strip query/hash
  let p = target.split(/[?#]/)[0];
  if (p === "" || p === "/") p = "index.html";
  p = p.replace(/^\/+/, "");
  const abs = path.join(root, p);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return true;
  // extensionless clean URL -> .html
  if (!exts.some(x => p.toLowerCase().endsWith(x))) {
    if (fs.existsSync(abs + ".html")) return true;
    if (fs.existsSync(path.join(abs, "index.html"))) return true;
  }
  return false;
}

function isExternal(u) {
  return /^(https?:)?\/\//i.test(u) || /^(mailto:|tel:|data:|javascript:|#)/i.test(u);
}

const files = listHtml(root);
const problems = [];
let checked = 0;

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const attrs = [...html.matchAll(/(?:href|src)\s*=\s*"([^"]*)"/gi)].map(m => m[1]);
  for (const a of attrs) {
    if (!a || isExternal(a)) continue;
    if (a.startsWith("../")) continue; // base href handles these; root-relative below
    checked++;
    if (!existsTarget(a)) problems.push(`${rel}  ->  ${a}`);
  }
}

console.log(`Checked ${checked} internal links/assets across ${files.length} HTML files.`);
if (problems.length === 0) {
  console.log("OK: no broken internal links or missing files.");
} else {
  console.log(`\nFOUND ${problems.length} problems:`);
  const uniq = [...new Set(problems)].sort();
  for (const p of uniq) console.log("  " + p);
}

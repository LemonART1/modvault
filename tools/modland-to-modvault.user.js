// ==UserScript==
// @name         Send to ModVault (modland)
// @namespace    modvault.space
// @version      1.5
// @description  Adds a "Send to ModVault" button on modland.net mod pages. Grabs title, description and screenshots (downloaded in the browser, since modland is behind Cloudflare) and hands them to the local ModVault admin.
// @match        https://www.modland.net/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @connect      modland.net
// @connect      *
// ==/UserScript==

// modland.net is fully behind Cloudflare (even robots.txt is challenged), so the
// ModVault server cannot scrape it. This userscript runs in the browser that
// already passed the challenge: it reads the mod's title/description/game and
// POSTs them to the local admin's /api/stash; the admin tab pulls it and fills
// the form (Gemini then cleans it up).
//
// Screenshots are best-effort: modland serves them from a Cloudflare host with
// no CORS, so their bytes usually can't be read from a script (direct XHR is
// 403'd, canvas is tainted). We try anyway; when it fails the user saves the 2-3
// screenshots by hand. Everything else still imports automatically.

(function () {
  "use strict";

  var ADMIN_ORIGIN = "http://localhost:8787";
  var BTN_ID = "modvault-send-btn";

  function detectGame() {
    var p = location.pathname.toLowerCase();
    if (p.indexOf("beamng") !== -1) return "beamng";
    if (p.indexOf("assetto") !== -1) return "assetto";
    return "";
  }

  function grabTitle() {
    var h = document.querySelector("h1");
    var t = (h && h.textContent.trim()) || document.title.replace(/\s*[-|]\s*ModLand\.net\s*$/i, "").trim();
    // modland names mods "Mod name - Author". Strip a trailing " - Author" when
    // the last segment is a single word (a username), but keep multi-word tails
    // like "- MASC FEM V" that are part of the real name.
    var parts = t.split(/\s+-\s+/);
    if (parts.length > 1 && !/\s/.test(parts[parts.length - 1])) {
      parts.pop();
      t = parts.join(" - ");
    }
    return t.trim();
  }

  function grabDescription() {
    // Greedy first pass: the biggest text block on the page (usually the mod
    // description), plus the meta description as a fallback. The admin shows this
    // in the editable "AI raw text" box, so noise can be trimmed before saving.
    var best = "";
    document.querySelectorAll("p, div, article, section").forEach(function (el) {
      var t = (el.innerText || "").trim();
      if (t.length > best.length && t.length < 4000) best = t;
    });
    var meta = document.querySelector('meta[name="description"]');
    var metaTxt = meta ? (meta.getAttribute("content") || "").trim() : "";
    return [metaTxt, best].filter(Boolean).join("\n\n").slice(0, 3000);
  }

  function grabImageCandidates() {
    // Return {url, el} pairs: url is the large-variant CDN link (best for GM
    // download), el is the already-rendered <img> (used as a canvas fallback
    // when Cloudflare 403s the direct request).
    var seen = {};
    var cands = [];
    document.querySelectorAll("img").forEach(function (img) {
      var w = img.naturalWidth || img.clientWidth || img.width || 0;
      if (w && w < 150) return; // skip small UI icons/logos
      var src = (img.currentSrc || img.src || "").trim();
      if (!/^https?:\/\//i.test(src)) return;
      if (/\.svg(\?|$)/i.test(src)) return;
      if (/\/avatars?\//i.test(src)) return; // skip uploader/commenter avatars
      try { if (!/modland/i.test(new URL(src).hostname)) return; } catch (e) { return; } // drop ad banners
      var lg = src.replace(/-(sm|th|md|xs)_modland\./i, "-lg_modland.");
      if (seen[lg]) return;
      seen[lg] = 1;
      cands.push({ url: lg, el: img });
    });
    return cands.slice(0, 6);
  }

  // Read an already-rendered image via canvas. Works only if the CDN sent CORS
  // headers (otherwise the canvas is tainted and toDataURL throws) — a free
  // fallback that costs nothing to try.
  function canvasDataUrl(img) {
    try {
      if (!img.naturalWidth) return null;
      var c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL("image/jpeg", 0.86);
    } catch (e) { return null; }
  }

  async function getImageData(cand) {
    var viaGm = await downloadImage(cand.url);
    if (viaGm) return viaGm;
    return canvasDataUrl(cand.el);
  }

  function downloadImage(url) {
    return new Promise(function (resolve) {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        responseType: "blob",
        // Cloudflare on temp2.modland.net serves the image to the browser's
        // <img> loads but 403s a bare XHR. Sending the same Referer + image
        // Accept as a real image request, plus cookies (anonymous:false), makes
        // it pass the managed challenge.
        headers: {
          "Referer": location.origin + "/",
          "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
        },
        anonymous: false,
        onload: function (r) {
          if (r.status < 200 || r.status >= 300) { resolve(null); return; }
          var reader = new FileReader();
          reader.onloadend = function () {
            resolve(typeof reader.result === "string" && reader.result.startsWith("data:image/") ? reader.result : null);
          };
          reader.onerror = function () { resolve(null); };
          reader.readAsDataURL(r.response);
        },
        onerror: function () { resolve(null); },
        ontimeout: function () { resolve(null); },
        timeout: 20000
      });
    });
  }

  async function send(btn) {
    btn.disabled = true;
    var original = btn.textContent;
    btn.textContent = "Downloading images...";
    try {
      var cands = grabImageCandidates();
      var images = (await Promise.all(cands.map(getImageData))).filter(Boolean);
      if (images.length === 0 && cands.length) {
        // modland screenshots sit on a Cloudflare host with no CORS, so their
        // bytes can't be read from a script (XHR is 403'd, canvas is tainted).
        // Everything else still imports; the user adds images by hand.
        alert("Картинки modland защищены Cloudflare — автоматически не скачиваются.\n\n" +
          "Сохрани 2-3 скриншота вручную (правый клик по картинке -> Сохранить) и добавь их в админке через 'Выбрать файлы'.\n\n" +
          "Остальные поля (название, игра, версия, описание, теги) заполнятся сами.");
      }
      var payload = {
        game: detectGame(),
        title: grabTitle(),
        description: grabDescription(),
        images: images,
        sourceUrl: location.href
      };
      btn.textContent = "Sending...";
      var res = await fetch(ADMIN_ORIGIN + "/api/stash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("server " + res.status);
      GM_openInTab(ADMIN_ORIGIN + "/local-admin.html#stash", { active: true });
      btn.textContent = "Sent - check ModVault tab";
    } catch (e) {
      alert("Не удалось отправить в ModVault. Запущен ли локальный сервер (localhost:8787)?\n\n" + e.message);
      btn.textContent = original;
    } finally {
      btn.disabled = false;
    }
  }

  function ensureButton() {
    if (document.getElementById(BTN_ID) || !document.body) return;
    var btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.textContent = "Send to ModVault";
    btn.style.cssText = [
      "position:fixed", "right:18px", "bottom:18px", "z-index:2147483647",
      "padding:12px 18px", "background:#e8ff00", "color:#05070a",
      "font:800 14px/1 Inter,Segoe UI,Arial,sans-serif", "border:0",
      "border-radius:8px", "cursor:pointer", "box-shadow:0 8px 28px rgba(0,0,0,.45)"
    ].join(";");
    btn.addEventListener("click", function () { send(btn); });
    document.body.appendChild(btn);
  }

  ensureButton();
  setInterval(ensureButton, 1500);
})();

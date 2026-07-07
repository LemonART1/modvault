// ==UserScript==
// @name         Send to ModVault (modland)
// @namespace    modvault.space
// @version      2.7
// @description  Adds a "Send to ModVault" button on modland.net mod pages. Grabs title, description and screenshots (via tab-relay around Cloudflare) and hands them to the local ModVault admin.
// @match        https://*.modland.net/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      modland.net
// @connect      *
// ==/UserScript==

// modland.net is fully behind Cloudflare (even robots.txt is challenged), so the
// ModVault server cannot scrape it. This userscript runs in the browser that
// already passed the challenge: it reads the mod's title/description/game and
// POSTs them to the local admin's /api/stash; the admin tab pulls it and fills
// the form (Gemini then cleans it up).
//
// Screenshots: the CDN (temp2.modland.net) has no CORS and 403s bare XHRs, so
// bytes can't be read in-page (XHR blocked, canvas tainted). BUT a top-level
// navigation to the image URL is served normally (same as the user opening the
// image in a new tab). So we relay: open the image in a background tab, where
// this same script (matched via *.modland.net) does a same-origin
// fetch(location.href) - no CORS needed - stores the data URL in Tampermonkey
// value storage, and the tab is closed. The mod-page side polls the storage.

(function () {
  "use strict";

  var ADMIN_ORIGIN = "http://localhost:8787";
  var BTN_ID = "modvault-send-btn";

  // ---- image-tab relay branch -------------------------------------------
  // Any non-www modland host (temp2.modland.net etc.) means this tab was opened
  // by the relay to fetch an image. Read it same-origin — which works even
  // though a bare XHR from the mod page is Cloudflare-403'd — and report back
  // through GM storage, then close. Non-image responses (a 404 for a missing
  // -lg variant) report FAIL fast so the opener doesn't wait out the timeout.
  if (!/^www\./i.test(location.hostname)) {
    var relayKey = "mvimg:" + location.href.split("#")[0];
    var reportAndClose = function (value) {
      GM_setValue(relayKey, value || "FAIL");
      setTimeout(function () { window.close(); }, 200);
    };
    fetch(location.href, { credentials: "include", cache: "force-cache" })
      .then(function (r) {
        var ct = r.headers.get("content-type") || "";
        return (r.ok && ct.indexOf("image/") === 0) ? r.blob() : null;
      })
      .then(function (blob) {
        if (!blob) { reportAndClose(null); return; }
        var fr = new FileReader();
        fr.onloadend = function () {
          reportAndClose(typeof fr.result === "string" && fr.result.indexOf("data:image/") === 0 ? fr.result : null);
        };
        fr.onerror = function () { reportAndClose(null); };
        fr.readAsDataURL(blob);
      })
      .catch(function () { reportAndClose(null); });
    return;
  }

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

  function galleryFolder(u) {
    // modland stores each mod's images under /i/{modHash}/...; the hash is
    // unique per mod, so it tells this mod's screenshots apart from the
    // related-mod thumbnails also present on the page.
    var m = u.match(/\/i\/([^/]+)\//);
    return m ? m[1] : null;
  }

  function grabImageCandidates() {
    // Primary source: the mod gallery is a lightGallery — every slide is an
    // <a href="full-size image"> wrapping the thumbnail. The href IS the exact
    // full-size file (no size-token guessing), the viewer and its thumbnail
    // point at the same file (so duplicates collapse), and related-mod/sidebar
    // thumbnails link to .html pages, not images (so junk is excluded).
    var seenA = {};
    var fromAnchors = [];
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = (a.href || "").split("#")[0].trim();
      if (!/^https?:\/\//i.test(href)) return;
      if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(href)) return;
      if (/\/avatars?\//i.test(href)) return;
      try { if (!/modland/i.test(new URL(href).hostname)) return; } catch (e) { return; }
      if (seenA[href]) return;
      seenA[href] = 1;
      fromAnchors.push({ url: href, origUrl: href, el: a.querySelector("img") });
    });
    if (fromAnchors.length) return fromAnchors.slice(0, 8);

    // Fallback (no image links found): collect every modland-hosted <img>, keep
    // only those sharing a CDN folder with the biggest one (this mod's gallery),
    // and normalise each to the full-size -lg variant.
    var all = [];
    document.querySelectorAll("img").forEach(function (img) {
      var w = img.naturalWidth || img.clientWidth || img.width || 0;
      var src = (img.currentSrc || img.src || "").trim();
      if (!/^https?:\/\//i.test(src)) return;
      if (/\.svg(\?|$)/i.test(src)) return;
      if (/\/avatars?\//i.test(src)) return; // skip uploader/commenter avatars
      try { if (!/modland/i.test(new URL(src).hostname)) return; } catch (e) { return; } // drop ad banners
      all.push({ src: src, w: w, el: img });
    });
    if (!all.length) return [];
    all.sort(function (a, b) { return b.w - a.w; });
    var anchor = galleryFolder(all[0].src); // folder of the biggest image = this mod

    var seen = {};
    var cands = [];
    all.forEach(function (it) {
      if (it.w && it.w < 150) return; // skip small UI icons/logos
      if (anchor && galleryFolder(it.src) !== anchor) return; // a different mod's image
      // Normalise to the full-size (-lg) variant. modland names images
      // {prefix}-{stamp}[-{size}]_modland.ext with several prefixes (img, photo,
      // izobrazhenie, numbered thumbs). If a size token is present, swap it for
      // lg; if there's no size token at all (e.g. photo-{stamp}_modland.webp,
      // which is a small version), insert -lg before _modland.
      var lg = it.src.replace(/-(sm|th|md|xs|s|m|thumb|small|medium)_modland\./i, "-lg_modland.");
      if (!/-lg_modland\./i.test(lg)) {
        lg = lg.replace(/_modland\.(\w+)(\?|$)/i, "-lg_modland.$1$2");
      }
      if (seen[lg]) return;
      seen[lg] = 1;
      // A gallery thumbnail has two path segments under /i/ (…/i/{mod}/{shot}/N-…);
      // the single-segment "…/i/{mod}/img-…" is just the main viewer, which
      // duplicates the first thumbnail. Prefer thumbnails and drop the viewer.
      var isThumb = /\/i\/[^/]+\/[^/]+\//.test(lg);
      cands.push({ url: lg, origUrl: it.src, el: it.el, isThumb: isThumb });
    });
    var thumbs = cands.filter(function (c) { return c.isThumb; });
    var chosen = thumbs.length ? thumbs : cands;
    return chosen.slice(0, 8); // admin stores 3; extra spares in case some -lg downloads fail
  }

  // Tab relay: open the image as a top-level background tab. Cloudflare serves
  // top-level navigations normally (same as a human opening the image in a new
  // tab); the copy of this script running there reads the bytes same-origin and
  // reports back through GM value storage.
  function relayDownload(url) {
    return new Promise(function (resolve) {
      var key = "mvimg:" + url.split("#")[0];
      GM_deleteValue(key);
      var tab = null;
      try { tab = GM_openInTab(url, { active: false, insert: true, setParent: true }); } catch (e) { resolve(null); return; }
      var done = false;
      var poll = setInterval(check, 400);
      var kill = setTimeout(function () { finish(null); }, 20000);
      function check() {
        var v = GM_getValue(key);
        if (v !== undefined) finish(v === "FAIL" ? null : v);
      }
      function finish(value) {
        if (done) return;
        done = true;
        clearInterval(poll);
        clearTimeout(kill);
        GM_deleteValue(key);
        try { if (tab && !tab.closed) tab.close(); } catch (e) { /* tab closed itself */ }
        resolve(value);
      }
    });
  }

  async function getImageData(cand) {
    // Always target the full-size (-lg) URL. Never fall back to the small
    // thumbnail: an empty slot the user can fill beats a blurry image. Callers
    // keep a spare candidate so a skipped shot is replaced by the next one.
    var viaGm = await downloadImage(cand.url);
    if (viaGm) return viaGm;
    return relayDownload(cand.url);
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
      // Sequential: the tab relay opens background tabs one at a time, so
      // parallel downloads would spawn a burst of tabs at once.
      var cands = grabImageCandidates();
      var images = [];
      for (var i = 0; i < cands.length && images.length < 3; i++) {
        btn.textContent = "Image " + (i + 1) + "/" + cands.length + "...";
        var data = await getImageData(cands[i]);
        if (data) images.push(data);
      }
      if (images.length === 0 && cands.length) {
        alert("Картинки не удалось скачать даже через вкладки.\n\n" +
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

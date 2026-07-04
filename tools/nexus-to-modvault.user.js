// ==UserScript==
// @name         Send to ModVault
// @namespace    modvault.space
// @version      1.1
// @description  Adds a "Send to ModVault" button on NexusMods mod pages that grabs the mod URL + gallery images and opens the local ModVault admin with everything pre-filled.
// @match        https://www.nexusmods.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// Why a userscript and not a bookmarklet: NexusMods sends a strict nonce-based
// Content-Security-Policy (script-src 'nonce-...'), which blocks javascript:
// bookmarklets from running on the page. A userscript runs in Tampermonkey's
// isolated world and is not bound by the page CSP, so it works reliably.
//
// NexusMods is a single-page app: navigating between mod pages does not reload
// the document, so a one-shot script would only add the button on the first
// full load. We poll every 1.5s to keep the button present on the current mod
// page and remove it elsewhere.

(function () {
  "use strict";

  var ADMIN_ORIGIN = "http://localhost:8787";
  var BTN_ID = "modvault-send-btn";

  function onClick() {
    var set = new Set();
    function add(u) {
      if (!u) return;
      u = String(u).split("?")[0];
      if (!/staticdelivery\.nexusmods\.com/.test(u)) return;
      u = u.replace("/thumbnails/", "/");
      set.add(u);
    }
    document.querySelectorAll("img").forEach(function (i) {
      add(i.currentSrc || i.src);
      if (i.srcset) i.srcset.split(",").forEach(function (x) { add(x.trim().split(" ")[0]); });
    });
    document.querySelectorAll("a").forEach(function (a) { add(a.href); });

    var payload = { url: location.href, images: Array.from(set).slice(0, 40) };
    var data = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    window.open(ADMIN_ORIGIN + "/local-admin.html#import=" + data, "_blank");
  }

  function ensureButton() {
    var onModPage = /\/[^\/]+\/mods\/\d+/.test(location.pathname);
    var existing = document.getElementById(BTN_ID);
    if (!onModPage) {
      if (existing) existing.remove();
      return;
    }
    if (existing || !document.body) return;
    var btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.textContent = "Send to ModVault";
    btn.style.cssText = [
      "position:fixed", "right:18px", "bottom:18px", "z-index:2147483647",
      "padding:12px 18px", "background:#e8ff00", "color:#05070a",
      "font:800 14px/1 Inter,Segoe UI,Arial,sans-serif", "border:0",
      "border-radius:8px", "cursor:pointer", "box-shadow:0 8px 28px rgba(0,0,0,.45)"
    ].join(";");
    btn.addEventListener("click", onClick);
    document.body.appendChild(btn);
  }

  ensureButton();
  setInterval(ensureButton, 1500);
})();

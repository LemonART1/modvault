// ==UserScript==
// @name         Send to ModVault (GTA5-Mods)
// @namespace    modvault.space
// @version      1.0
// @description  Adds a "Send to ModVault" button on GTA5-Mods pages. One click opens the local ModVault admin and imports the mod automatically.
// @match        https://www.gta5-mods.com/*
// @run-at       document-idle
// @grant        GM_openInTab
// ==/UserScript==

// gta5-mods.com sits behind Cloudflare but doesn't challenge normal requests,
// so the ModVault server scrapes the mod page itself via /api/gta5. This script
// only needs to pass the URL along - no in-page scraping or image downloading.

(function () {
  "use strict";

  var ADMIN_ORIGIN = "http://localhost:8787";
  var BTN_ID = "modvault-send-btn";

  // Mod pages look like /{category}/{slug}; these listing slugs share that
  // shape but are sort/filter views, not mods.
  var LISTING = ["day", "week", "month", "latest-uploads", "most-liked",
    "most-downloaded", "highest-rated", "recently-updated", "featured"];

  function isModPage() {
    var m = location.pathname.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/i);
    if (!m) return false;
    if (LISTING.indexOf(m[2].toLowerCase()) !== -1) return false;
    return true;
  }

  function onClick(btn) {
    if (!isModPage()) return;
    btn.disabled = true;
    btn.textContent = "Opening ModVault...";
    var payload = { source: "gta5", url: location.origin + location.pathname };
    var data = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    var url = ADMIN_ORIGIN + "/local-admin.html#autoimport=" + data;
    try {
      GM_openInTab(url, { active: true });
    } catch (e) {
      window.open(url, "_blank");
    }
    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = "Send to ModVault";
    }, 1500);
  }

  function ensureButton() {
    var existing = document.getElementById(BTN_ID);
    if (!isModPage()) {
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
    btn.addEventListener("click", function () { onClick(btn); });
    document.body.appendChild(btn);
  }

  ensureButton();
  setInterval(ensureButton, 1500);
})();

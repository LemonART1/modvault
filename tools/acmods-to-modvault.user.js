// ==UserScript==
// @name         Send to ModVault (AC Mods)
// @namespace    modvault.space
// @version      1.0
// @description  Adds a "Send to ModVault" button on acmods.net mod pages. One click opens the local ModVault admin and imports the mod automatically.
// @match        https://acmods.net/*
// @run-at       document-idle
// @grant        GM_openInTab
// ==/UserScript==

// acmods.net has no Cloudflare challenge on normal requests, so like
// GTA5-Mods.com and ModHub.us the ModVault server scrapes the mod page
// itself via /api/acmods (title, description, image). This script only
// needs to pass the URL along.

(function () {
  "use strict";

  var ADMIN_ORIGIN = "http://localhost:8787";
  var BTN_ID = "modvault-send-btn";

  // Mod pages look like /{category}/{slug}/ (e.g. /cars/assetto-corsa-...);
  // category/listing pages are /category/{category}/ and the homepage,
  // tag pages etc don't have a real mod to import.
  function isModPage() {
    if (/^\/(category|tag|page)\//i.test(location.pathname)) return false;
    return /^\/[a-z0-9-]+\/[a-z0-9-]+\/?$/i.test(location.pathname);
  }

  function onClick(btn) {
    if (!isModPage()) return;
    btn.disabled = true;
    btn.textContent = "Opening ModVault...";
    var payload = { source: "acmods", url: location.origin + location.pathname };
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

// ==UserScript==
// @name         Send to ModVault (Factorio)
// @namespace    modvault.space
// @version      1.0
// @description  Adds a "Send to ModVault" button on Factorio mod portal pages. One click opens the local ModVault admin and imports the mod automatically.
// @match        https://mods.factorio.com/*
// @run-at       document-idle
// @grant        GM_openInTab
// ==/UserScript==

// The Factorio mod portal has a fully open JSON API, so unlike the NexusMods
// and modland scripts this one doesn't need to scrape anything from the page:
// it just hands the mod URL to the admin, and the ModVault server pulls the
// title, description, version, category and images itself via /api/factorio.

(function () {
  "use strict";

  var ADMIN_ORIGIN = "http://localhost:8787";
  var BTN_ID = "modvault-send-btn";

  function modSlug() {
    // Mod pages are /mod/{name}; anything else (listings, user pages) is skipped.
    var m = location.pathname.match(/^\/mod\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function onClick(btn) {
    var slug = modSlug();
    if (!slug) return;
    btn.disabled = true;
    btn.textContent = "Opening ModVault...";
    var payload = { source: "factorio", url: "https://mods.factorio.com/mod/" + slug };
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
    var onModPage = !!modSlug();
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
    btn.addEventListener("click", function () { onClick(btn); });
    document.body.appendChild(btn);
  }

  ensureButton();
  // The portal navigates without full reloads in places, so keep the button in
  // sync with the current URL.
  setInterval(ensureButton, 1500);
})();

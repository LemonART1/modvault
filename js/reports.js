// ModVault mod reports: anyone can flag a broken link or a bad mod, no
// login required - gating this behind an account would just suppress
// reports from people who only stopped by to download a file.
// Depends on: js/supabase-client.js (ModVaultSupabase, optional ModVaultUser).
(function () {
  function db() { return window.ModVaultSupabase || null; }

  async function submitReport(modId, reason) {
    if (!db()) return { ok: false, message: "Could not connect. Try again later." };
    const user = window.ModVaultUser?.getCachedUser?.() || null;
    const { error } = await db().from("mod_reports").insert({
      mod_id: Number(modId),
      reason: String(reason || "").trim().slice(0, 500) || null,
      reporter_id: user?.id || null
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  window.ModVaultReports = { submitReport };
})();

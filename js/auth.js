(function () {
  function db() {
    return window.ModVaultSupabase || null;
  }

  async function getCurrentUser() {
    if (!db()) return null;
    const cached = window.ModVaultUser?.getCachedUser?.();
    if (cached) return cached;

    try {
      const { data } = await withTimeout(db().auth.getUser(), 1200);
      return data?.user || null;
    } catch {
      return null;
    }
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Supabase request timed out.")), ms);
      })
    ]);
  }

  async function register(username, email, password) {
    if (!db()) return { ok: false, message: "Supabase is not connected." };

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(username || "").trim();
    if (!cleanName || !cleanEmail || !password) return { ok: false, message: "Fill all fields." };

    const { data, error } = await db().auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { username: cleanName }
      }
    });

    if (error) return { ok: false, message: error.message };
    if (data?.user) await upsertProfile(data.user, cleanName);
    if (data?.user && !data?.session) return { ok: true, needsEmailConfirmation: true, message: "Account created. Check your email to confirm it." };
    return { ok: true, message: "Account created. You are logged in." };
  }

  async function login(email, password) {
    if (!db()) return { ok: false, message: "Supabase is not connected." };

    const cleanEmail = String(email || "").trim().toLowerCase();
    const { data, error } = await db().auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) return { ok: false, message: error.message };
    if (data?.user) await upsertProfile(data.user);
    return { ok: true, message: "Logged in." };
  }

  async function logout() {
    if (!db()) return;
    await db().auth.signOut();
  }

  async function initAccountPage() {
    const status = document.getElementById("account-status");
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const logoutButton = document.getElementById("logout-button");
    const authCard = document.getElementById("auth-card");
    const accountActions = document.getElementById("account-actions");
    const loginPanel = document.getElementById("login-panel");
    const registerPanel = document.getElementById("register-panel");

    function showPanel(name) {
      const showRegister = name === "register";
      loginPanel?.classList.toggle("active", !showRegister);
      registerPanel?.classList.toggle("active", showRegister);
    }

    async function renderStatus(message = "") {
      const current = await getCurrentUser();
      if (!status) return;

      if (current) {
        const name = current.user_metadata?.username || current.email;
        window.ModVaultUser?.cacheUser?.(current);
        window.ModVaultUser?.updateAccountNavFromUser?.(current);
        setTimeout(() => window.ModVaultUser?.updateAccountNavFromUser?.(current), 100);
        setTimeout(() => window.ModVaultUser?.updateAccountNavFromUser?.(current), 800);
        status.innerHTML = `<strong>${escapeHtml(name)}</strong><span>${escapeHtml(current.email)}</span>`;
        status.classList.add("is-logged-in");
        if (authCard) authCard.hidden = true;
        if (accountActions) accountActions.hidden = false;
      } else {
        window.ModVaultUser?.clearCachedUser?.();
        window.ModVaultUser?.updateAccountNavFromUser?.(null);
        setTimeout(() => window.ModVaultUser?.updateAccountNavFromUser?.(null), 100);
        status.innerHTML = `<strong>Guest</strong><span>${escapeHtml(message || "Create an account or log in to rate mods.")}</span>`;
        status.classList.remove("is-logged-in");
        if (authCard) authCard.hidden = false;
        if (accountActions) accountActions.hidden = true;
      }
    }

    function setMessage(id, result) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = normalizeMessage(result.message);
      el.classList.toggle("ok", result.ok);
    }

    await renderStatus();

    document.querySelectorAll("[data-auth-view]").forEach(button => {
      button.addEventListener("click", () => {
        showPanel(button.dataset.authView);
      });
    });

    registerForm?.addEventListener("submit", async event => {
      event.preventDefault();
      const button = registerForm.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      const result = await register(
        registerForm.username.value,
        registerForm.email.value,
        registerForm.password.value
      );
      setMessage("register-message", result);
      if (result.ok) {
        registerForm.reset();
        await renderStatus(result.message);
        await window.ModVaultUser?.updateAccountNav?.();
        await window.ModVaultStats?.hydrateUserCount?.();
        if (!result.needsEmailConfirmation) showPanel("login");
      }
      if (button) button.disabled = false;
    });

    loginForm?.addEventListener("submit", async event => {
      event.preventDefault();
      const button = loginForm.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      const result = await login(loginForm.email.value, loginForm.password.value);
      setMessage("login-message", result);
      if (result.ok) {
        loginForm.reset();
        await renderStatus(result.message);
        await window.ModVaultUser?.updateAccountNav?.();
        await window.ModVaultStats?.hydrateUserCount?.();
      }
      if (button) button.disabled = false;
    });

    logoutButton?.addEventListener("click", async () => {
      await logout();
      await renderStatus("Logged out.");
      await window.ModVaultUser?.updateAccountNav?.();
      showPanel("login");
      setMessage("login-message", { ok: true, message: "Logged out." });
    });

    db()?.auth.onAuthStateChange(async () => {
      await renderStatus();
      await window.ModVaultUser?.updateAccountNav?.();
    });
  }

  async function upsertProfile(user, username = "") {
    if (!db() || !user) return;
    const name = username || user.user_metadata?.username || user.email?.split("@")[0] || "User";

    try {
      await db()
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          username: name,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn("Unable to upsert profile.", error);
    }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeMessage(message) {
    if (/confirmation email/i.test(message || "")) {
      return "Supabase could not send the confirmation email. Disable email confirmation in Supabase Auth for testing.";
    }
    if (/invalid login credentials/i.test(message || "")) {
      return "Wrong email or password, or this account was not confirmed yet.";
    }
    return message || "";
  }

  window.ModVaultAuth = { register, login, logout, getCurrentUser, initAccountPage, upsertProfile };
})();

(function () {
  const SUPABASE_URL = "https://dccmwduvehkdrbxctmhf.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_x6V_h5FGKgq-eMF7WqY6eQ_5f2n2dpz";
  const CURRENT_USER_KEY = "modvault-current-user";
  let knownUser = null;

  if (!window.supabase) {
    console.warn("Supabase library is not loaded.");
    return;
  }

  window.ModVaultSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  function getDisplayName(user) {
    return user?.user_metadata?.username || user?.email?.split("@")[0] || "Account";
  }

  function getCachedUser() {
    try {
      const saved = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
      if (saved?.email) return saved;
    } catch {
      localStorage.removeItem(CURRENT_USER_KEY);
    }

    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || (!key.startsWith("sb-") && !key.includes("supabase"))) continue;
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        const user = data?.user || data?.currentSession?.user || data?.session?.user;
        if (user?.email) return user;
      }
    } catch {
      return null;
    }
    return null;
  }

  function cacheUser(user) {
    if (!user?.email) return;
    knownUser = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
      id: user.id || "",
      email: user.email,
      user_metadata: user.user_metadata || {}
    }));
  }

  function clearCachedUser() {
    knownUser = null;
    avatarCache = { userId: null, url: null };
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  // ---------- Header avatar ----------
  // Cached so the frequent nav refreshes (see scheduleNavRefreshes) don't
  // hit the profiles table on every tick.
  let avatarCache = { userId: null, url: null };

  async function getAvatarUrl(userId) {
    if (!userId) return null;
    if (avatarCache.userId === userId) return avatarCache.url;
    if (!window.ModVaultSupabase) return null;
    try {
      const { data } = await withTimeout(
        window.ModVaultSupabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
        1500
      );
      avatarCache = { userId, url: data?.avatar_url || null };
    } catch {
      avatarCache = { userId, url: null };
    }
    return avatarCache.url;
  }

  // Lets the account page push a freshly-uploaded avatar into the header
  // immediately, instead of waiting for the next cache-expiry fetch.
  function setAvatarUrl(userId, url) {
    avatarCache = { userId, url };
    updateAccountNavFromUser(knownUser || getCachedUser());
  }

  function renderNavAvatar(user) {
    const nav = document.querySelector(".header-nav");
    if (!nav) return;
    let img = nav.querySelector(".nav-avatar");
    if (!user) { img?.remove(); return; }
    if (!img) {
      img = document.createElement("img");
      img.className = "nav-avatar";
      img.alt = "";
      img.loading = "lazy";
      const link = nav.querySelector('[data-account-link="true"]');
      link?.insertAdjacentElement("afterend", img);
    }
    getAvatarUrl(user.id).then(url => {
      if (!img.isConnected) return;
      if (url) { img.src = url; img.style.display = ""; }
      else { img.removeAttribute("src"); img.style.display = "none"; }
    });
  }

  async function getCurrentUser() {
    if (knownUser?.email) return knownUser;

    const cached = getCachedUser();
    if (cached) {
      knownUser = cached;
      return cached;
    }

    try {
      const { data: sessionData } = await withTimeout(
        window.ModVaultSupabase.auth.getSession(),
        1200
      );
      if (sessionData?.session?.user) {
        cacheUser(sessionData.session.user);
        return sessionData.session.user;
      }
    } catch (error) {
      console.warn("Unable to read Supabase session.", error);
    }

    try {
      const { data } = await withTimeout(
        window.ModVaultSupabase.auth.getUser(),
        3000
      );
      if (data?.user) cacheUser(data.user);
      return data?.user || knownUser || null;
    } catch (error) {
      console.warn("Unable to read Supabase user.", error);
      return knownUser || null;
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

  async function updateAccountNav() {
    updateAccountNavFromUser(knownUser || getCachedUser());
    const nav = document.querySelector(".header-nav");
    if (!nav) return;

    try {
      const user = await getCurrentUser();
      if (user) updateAccountNavFromUser(user);
    } catch {
      updateAccountNavFromUser(knownUser || getCachedUser());
    }
  }

  function updateAccountNavFromUser(user) {
    const nav = document.querySelector(".header-nav");
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll("a.nav-link"));
    let link =
      nav.querySelector('a[data-account-link="true"]') ||
      links.find(item => !item.classList.contains("admin-nav-link") && /(^|\/)account(\.html)?$/i.test(item.getAttribute("href") || "")) ||
      links.find(item => !item.classList.contains("admin-nav-link") && /login|admin|account/i.test(item.textContent || "")) ||
      links[links.length - 1];
    if (!link) return;

    link.classList.add("nav-link");
    link.dataset.accountLink = "true";

    // Remove any stale admin links (the public admin page was removed).
    nav.querySelectorAll(".admin-nav-link").forEach(item => item.remove());

    if (!user) {
      link.href = "account";
      link.textContent = "Login";
      link.title = "Log in";
      renderNavAvatar(null);
      return;
    }

    const name = getDisplayName(user);
    link.href = "account";
    link.textContent = name.length > 14 ? `${name.slice(0, 13)}...` : name;
    link.title = name;
    renderNavAvatar(user);
  }

  function scheduleNavRefreshes() {
    updateAccountNav();
    [250, 750, 1500, 3000, 5000, 8000].forEach(delay => {
      setTimeout(updateAccountNav, delay);
    });
  }

  document.addEventListener("DOMContentLoaded", updateAccountNav);
  window.addEventListener("load", scheduleNavRefreshes);
  window.addEventListener("pageshow", scheduleNavRefreshes);
  setTimeout(scheduleNavRefreshes, 400);
  setInterval(() => updateAccountNavFromUser(knownUser || getCachedUser()), 1200);
  window.ModVaultSupabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) cacheUser(session.user);
    else if (event === "SIGNED_OUT") clearCachedUser();
    scheduleNavRefreshes();
  });
  window.ModVaultUser = {
    updateAccountNav,
    updateAccountNavFromUser,
    getCurrentUser,
    getCachedUser,
    cacheUser,
    clearCachedUser,
    getDisplayName,
    setAvatarUrl
  };
})();

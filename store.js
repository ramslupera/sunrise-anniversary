// ============================================================
//  DATA STORE — Supabase (live) or localStorage (demo mode)
//  Every value is a row in table `sunrise_kv` (key text, value jsonb).
//    g:<matchId> → score · t:<matchId> → call/move info · u:<id> → update
// ============================================================
window.Store = (function () {
  const cfg = window.SPC_CONFIG || {};
  const demo = !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || new URLSearchParams(location.search).has("demo");
  const TABLE = cfg.TABLE || "sunrise_kv";
  const LS = "spc-anniv-demo-v1";
  const SB_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  const state = new Map();
  const listeners = new Set();
  let sb = null, session = null, conn = demo ? "demo" : "connecting", lastSync = null;

  const emit = () => listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } });

  function lsLoad() {
    state.clear();
    try {
      const obj = JSON.parse(localStorage.getItem(LS) || "{}");
      Object.entries(obj).forEach(([k, v]) => state.set(k, v));
    } catch (e) { /* storage unavailable */ }
  }
  function lsSave() {
    try { localStorage.setItem(LS, JSON.stringify(Object.fromEntries(state))); } catch (e) { /* ignore */ }
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src));
      document.head.appendChild(s);
    });
  }

  async function refresh() {
    if (demo) return;
    const { data, error } = await sb.from(TABLE).select("key,value").limit(5000);
    if (error) { conn = "error"; console.error(error); emit(); return; }
    state.clear();
    data.forEach((r) => state.set(r.key, r.value));
    lastSync = new Date();
    if (conn !== "live") conn = "polling";
    emit();
  }

  async function init() {
    if (demo) {
      lsLoad();
      window.addEventListener("storage", (e) => { if (e.key === LS) { lsLoad(); emit(); } });
      emit();
      return;
    }
    try {
      await loadScript(SB_CDN);
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      const { data } = await sb.auth.getSession();
      session = data.session;
      sb.auth.onAuthStateChange((_evt, s) => { session = s; emit(); });
      await refresh();
      sb.channel("spc-live")
        .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, (p) => {
          if (p.eventType === "DELETE") state.delete(p.old.key);
          else state.set(p.new.key, p.new.value);
          lastSync = new Date();
          emit();
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") { conn = "live"; refresh(); }
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") { conn = "polling"; }
          emit();
        });
      setInterval(refresh, 20000); // safety net in case realtime drops
      document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
    } catch (e) {
      console.error(e); conn = "error"; emit();
    }
  }

  async function setMany(obj) {
    const entries = Object.entries(obj);
    if (!entries.length) return;
    const ups = entries.filter(([, v]) => v !== null && v !== undefined);
    const dels = entries.filter(([, v]) => v === null || v === undefined).map(([k]) => k);
    if (demo) {
      ups.forEach(([k, v]) => state.set(k, v));
      dels.forEach((k) => state.delete(k));
      lsSave(); emit(); return;
    }
    const now = new Date().toISOString();
    if (ups.length) {
      const { error } = await sb.from(TABLE).upsert(ups.map(([key, value]) => ({ key, value, updated_at: now })));
      if (error) throw error;
    }
    if (dels.length) {
      const { error } = await sb.from(TABLE).delete().in("key", dels);
      if (error) throw error;
    }
    ups.forEach(([k, v]) => state.set(k, v));
    dels.forEach((k) => state.delete(k));
    emit();
  }

  return {
    demo,
    init,
    refresh,
    get: (k) => state.get(k),
    keys: (prefix) => [...state.keys()].filter((k) => k.startsWith(prefix)),
    all: () => Object.fromEntries(state),
    set: (k, v) => setMany({ [k]: v }),
    del: (k) => setMany({ [k]: null }),
    setMany,
    replaceAll: async (obj) => {
      const del = {};
      [...state.keys()].forEach((k) => { if (!(k in obj)) del[k] = null; });
      await setMany({ ...del, ...obj });
    },
    on: (f) => { listeners.add(f); return () => listeners.delete(f); },
    conn: () => conn,
    lastSync: () => lastSync,
    authed: () => demo || !!session,
    user: () => (session && session.user ? session.user.email : demo ? "demo" : null),
    signIn: async (email, password) => {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => { if (sb) await sb.auth.signOut(); }
  };
})();

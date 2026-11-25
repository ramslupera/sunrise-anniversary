// ============================================================
//  MATCH CONTROL — score entry (open at  #/control )
// ============================================================
window.Admin = (function () {
  const X = Engine, D = SPC_DATA, { esc } = UI;
  let tab = null; // a time "HH:MM" | "updates" | "tools"

  function toast(msg, err) {
    let box = document.querySelector(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast" + (err ? " err" : "");
    t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.remove(), err ? 4500 : 2200);
  }
  async function run(fn, ok) { try { await fn(); if (ok) toast(ok); } catch (e) { console.error(e); toast("Not saved: " + (e.message || e), true); } }
  const val = (id) => { const el = document.getElementById(id); if (!el || el.value === "") return null; return +el.value; };
  const times = () => [...new Set(D.matches.map((m) => m.time))].sort();
  const atTime = (t) => X.all().filter((s) => s.m.time === t).sort((a, b) => a.court - b.court);
  function defaultTab() { const t = times().find((t) => atTime(t).some((s) => s.status !== "final")); return t || times().slice(-1)[0]; }

  function render() {
    if (!Store.authed()) return loginView();
    if (!tab) tab = defaultTab();
    const btns = times().map((t) => {
      const ss = atTime(t).map((s) => s.status);
      const dot = ss.every((x) => x === "final") ? "✓ " : ss.some((x) => x === "live" || x === "called") ? "● " : "";
      return `<button data-adm-tab="${t}" class="${tab === t ? "on" : ""}">${dot}${X.fmt(t)}</button>`;
    }).join("");
    const body = tab === "updates" ? updatesView() : tab === "tools" ? toolsView() : roundView(tab);
    return `<div class="page-head"><div><div class="eyebrow">Officials</div><h1>Match Control</h1>
      <p>Signed in as <b>${esc(Store.user())}</b>${Store.demo ? " · <span style='color:var(--warn)'>Demo mode: scores are saved in this browser only</span>" : ""}</p></div>
      <div class="row"><a class="btn sm" href="#/live" target="_blank">Live courts ↗</a><a class="btn sm" href="#/tv" target="_blank">TV mode ↗</a>${Store.demo ? "" : `<button class="btn sm danger" data-adm="signout">Sign out</button>`}</div></div>
      <div class="seg mb" style="border-radius:16px">${btns}<button data-adm-tab="updates" class="${tab === "updates" ? "on" : ""}">📣 Updates</button><button data-adm-tab="tools" class="${tab === "tools" ? "on" : ""}">⚙ Tools</button></div>
      ${body}`;
  }

  function loginView() {
    return `<div class="card" style="max-width:420px;margin:30px auto">
      <div class="eyebrow">Officials only</div><h2 style="margin-bottom:14px">Match Control sign-in</h2>
      <form id="adm-login" class="grid" style="gap:12px">
        <label class="f">Email<input type="email" id="adm-email" required autocomplete="username"></label>
        <label class="f">Password<input type="password" id="adm-pass" required autocomplete="current-password"></label>
        <button class="btn primary" type="submit">Sign in</button>
        <p class="small muted" style="margin:0">Same official accounts as the PYS Open site. Spectators don't need to sign in.</p>
      </form></div>`;
  }

  function roundView(t) {
    const ms = atTime(t);
    return `<div class="spread mb"><div><h2>${X.fmt(t)} round</h2><div class="small muted">${ms.length} match(es) · courts ${ms.map((s) => s.court).join(", ")}</div></div>
      <button class="btn sm" data-adm="call-round" data-t="${t}">📢 Call all matches in this round</button></div>
      ${ms.map(matchAdmin).join("")}
      <p class="small muted">Type both scores and press <b>Save final</b> (or Enter). <b>Live</b> shows a match in progress. Group and elimination games: to 11, win by 1, or the leader when 20 minutes are up. Medal matches: win by 2. The rule check warns but lets you save.</p>`;
  }

  function matchAdmin(s) {
    const m = s.m, id = m.id, md = X.meta(id);
    const nm = (k) => (s[k] ? esc(X.pairName(s[k])) : `<span class="ph">${esc(s["p" + k])}</span>`);
    const opt = (v, l) => `<option value="${v}" ${s.result === v ? "selected" : ""}>${l}</option>`;
    const pairsOf = D.pairs.filter((p) => p.ev === m.ev);
    const pairOpts = (sel) => `<option value="">Auto</option>` + pairsOf.map((p) => `<option value="${p.id}" ${sel === p.id ? "selected" : ""}>${esc(p.id)} · ${esc(X.pairShort(p.id))}</option>`).join("");
    const stat = s.status === "final" ? `<span class="pill final">Final ${s.sa}–${s.sb}</span>` : s.status === "live" ? `<span class="pill live">Live</span>` : s.status === "called" ? `<span class="pill called">Called</span>` : `<span class="pill">Upcoming</span>`;
    return `<div class="card pad0 admin-tie">
      <div class="tie-head"><div><span class="cat cat-${m.ev}">${m.ev}</span> <b>${esc(s.title)}</b> <span class="small muted">· ${X.fmt(s.time)} · Court ${s.court}${m.medal ? " · win by 2" : ""}</span></div>
        <div class="row">${stat}${s.called ? `<button class="btn sm" data-adm="uncall" data-id="${id}">Undo call</button>` : `<button class="btn sm primary" data-adm="call" data-id="${id}">📢 Call</button>`}</div></div>
      <div class="arow ${s.status}" data-keep>
        <div class="an">${nm("a")}</div>
        <input class="as" type="number" min="0" max="30" inputmode="numeric" id="in-${id}-a" value="${s.sa ?? ""}" aria-label="Score top pair">
        <div class="x muted" style="text-align:center">–</div>
        <input class="bs" type="number" min="0" max="30" inputmode="numeric" id="in-${id}-b" value="${s.sb ?? ""}" aria-label="Score bottom pair">
        <div class="bn">${nm("b")}</div>
        <div class="acts">
          <select id="in-${id}-r" title="Result type">${opt("normal", "Normal")}${opt("retired", "Retired")}${opt("forfeit", "Forfeit")}</select>
          <button class="btn sm warn" data-adm="live" data-id="${id}">Live</button>
          <button class="btn sm ok" data-adm="final" data-id="${id}">Save final</button>
          <button class="btn sm danger" data-adm="clear" data-id="${id}" title="Clear score">✕</button>
        </div></div>
      <details style="border-top:1px solid var(--line);padding:10px 16px"><summary class="small" style="cursor:pointer;color:var(--accent)">Match settings · move · forfeit</summary>
        <div class="row mt" style="align-items:flex-end">
          <label class="f">Start time<input type="time" id="ts-${id}-time" value="${esc(md.time || "")}" placeholder="${m.time}"></label>
          <label class="f">Court<input type="number" min="1" max="6" id="ts-${id}-court" value="${esc(md.court || "")}" placeholder="${m.court}" style="width:80px"></label>
          <label class="f" style="flex:1;min-width:180px">Public note<input type="text" id="ts-${id}-note" value="${esc(md.note || "")}" placeholder="e.g. Moved to Court 4"></label>
          ${m.stage === "KO" ? `<label class="f">Top pair<select id="ts-${id}-a">${pairOpts(md.a)}</select></label><label class="f">Bottom pair<select id="ts-${id}-b">${pairOpts(md.b)}</select></label>` : ""}
          <button class="btn sm primary" data-adm="save-meta" data-id="${id}">Save settings</button>
        </div>
        <div class="row mt"><span class="small muted">No-show (11–0):</span>
          <button class="btn sm danger" data-adm="ff" data-id="${id}" data-side="a" ${s.a ? "" : "disabled"}>Top pair wins by forfeit</button>
          <button class="btn sm danger" data-adm="ff" data-id="${id}" data-side="b" ${s.b ? "" : "disabled"}>Bottom pair wins by forfeit</button></div>
      </details></div>`;
  }

  function updatesView() {
    const ups = Updates.list();
    return `<div class="grid g2"><div class="card"><h3 class="mb">Post an update</h3>
      <div class="grid" style="gap:10px">
        <label class="f">Title<input type="text" id="up-title" data-keep placeholder="e.g. 10:40 round delayed by 10 minutes"></label>
        <label class="f">Message<textarea id="up-body" data-keep placeholder="Details for players and spectators"></textarea></label>
        <label class="f">Type<select id="up-level"><option value="info">Info</option><option value="important">Important</option><option value="success">Result / good news</option></select></label>
        <button class="btn primary" data-adm="post">Publish update</button></div></div>
      <div><h3 class="mb">Published (${ups.length})</h3>${ups.map((u) => `<div style="position:relative">${Updates.card(u)}<button class="btn sm danger" style="position:absolute;top:10px;right:10px" data-adm="unpost" data-uid="${esc(u.id)}">Delete</button></div>`).join("") || `<div class="card empty">Nothing yet.</div>`}</div></div>`;
  }

  function toolsView() {
    return `<div class="grid g2">
      <div class="card"><h3>Backup</h3><p class="small muted">Download every score, call and update as a JSON file. Do this every hour or so.</p>
        <div class="row"><button class="btn primary" data-adm="export">⬇ Download backup</button><label class="btn">⬆ Restore backup<input type="file" id="adm-import" accept=".json" hidden></label></div></div>
      <div class="card"><h3>Reset</h3><p class="small muted">Clear all scores, calls, changes and updates. Use after testing, before the event.</p>
        <button class="btn danger" data-adm="reset">Reset everything</button></div>
      <div class="card"><h3>Test data</h3><p class="small muted">Fill matches with random valid scores to preview standings and eliminations. Use <b>Reset everything</b> afterwards.</p>
        <div class="row"><button class="btn" data-adm="random" data-upto="10:00">Random up to 10:00 AM</button><button class="btn" data-adm="random" data-upto="13:40">Random up to 1:40 PM</button><button class="btn" data-adm="random" data-upto="ALL">Random: whole day</button></div></div>
      <div class="card"><h3>Status</h3><p class="small">Connection: <b>${esc(Store.conn())}</b>${Store.lastSync() ? ` · last sync ${Store.lastSync().toLocaleTimeString()}` : ""}</p>
        <p class="small muted">${Store.demo ? "Demo mode: scores stay in this browser." : "Connected to Supabase (table sunrise_kv). All devices update in real time."}</p></div></div>`;
  }

  async function saveScore(id, status) {
    const m = X.mById[id], s = X.match(m);
    const a = val(`in-${id}-a`), b = val(`in-${id}-b`);
    const result = document.getElementById(`in-${id}-r`).value;
    if (!s.a || !s.b) { if (!confirm("The pairs for this match aren't set yet. Save anyway?")) return; }
    if (status === "final") {
      if (a === null || b === null) return toast("Enter both scores first.", true);
      const err = X.validate(m, a, b, result);
      if (err && !confirm(`Rule check: ${err}\n\nSave ${a}–${b} anyway?`)) return;
    }
    await run(() => Store.set(`g:${id}`, { a, b, status, result, ts: new Date().toISOString(), by: Store.user() }),
      status === "final" ? `Saved ${a ?? "-"}–${b ?? "-"}` : "Marked live");
  }

  async function randomFill(upto) {
    const ts = times().filter((t) => upto === "ALL" || t <= upto);
    for (const t of ts) { // in order, so knockouts see finished groups
      const o = {};
      D.matches.filter((m) => m.time === t).forEach((m) => {
        const lo = Math.floor(Math.random() * 10), w = m.medal ? Math.max(11, lo + 2) : 11;
        const f = Math.random() < 0.5;
        o[`g:${m.id}`] = { a: f ? lo : w, b: f ? w : lo, status: "final", result: "normal", ts: new Date().toISOString(), by: "test" };
      });
      await Store.setMany(o);
    }
  }

  document.addEventListener("click", async (e) => {
    const tb = e.target.closest("[data-adm-tab]");
    if (tb) { tab = tb.dataset.admTab; App.render(); return; }
    const b = e.target.closest("[data-adm]");
    if (!b) return;
    const act = b.dataset.adm, id = b.dataset.id, nowIso = new Date().toISOString();
    switch (act) {
      case "signout": await Store.signOut(); App.render(); break;
      case "final": await saveScore(id, "final"); break;
      case "live": await saveScore(id, "live"); break;
      case "clear": if (confirm("Clear this score?")) await run(() => Store.del(`g:${id}`), "Cleared"); break;
      case "call": await run(() => Store.set(`t:${id}`, { ...X.meta(id), called: nowIso }), "Called — pairs have 3 minutes"); break;
      case "uncall": { const md = { ...X.meta(id) }; delete md.called; await run(() => Store.set(`t:${id}`, Object.keys(md).length ? md : null), "Call removed"); break; }
      case "call-round": { const o = {}; D.matches.filter((m) => m.time === b.dataset.t).forEach((m) => { if (X.match(m).status !== "final") o[`t:${m.id}`] = { ...X.meta(m.id), called: nowIso }; }); await run(() => Store.setMany(o), "Round called"); break; }
      case "save-meta": {
        const md = { ...X.meta(id) };
        const g = (k) => { const el = document.getElementById(`ts-${id}-${k}`); return el ? el.value.trim() : undefined; };
        ["time", "court", "note", "a", "b"].forEach((k) => { const v = g(k); if (v === undefined) return; if (v) md[k] = v; else delete md[k]; });
        await run(() => Store.set(`t:${id}`, Object.keys(md).length ? md : null), "Settings saved"); break;
      }
      case "ff": {
        const sd = b.dataset.side;
        if (!confirm(`Record a forfeit 11–0 for the ${sd === "a" ? "top" : "bottom"} pair?`)) return;
        await run(() => Store.set(`g:${id}`, { a: sd === "a" ? 11 : 0, b: sd === "b" ? 11 : 0, status: "final", result: "forfeit", ts: nowIso, by: Store.user() }), "Forfeit recorded"); break;
      }
      case "post": {
        const title = document.getElementById("up-title").value.trim(), body = document.getElementById("up-body").value.trim();
        if (!title) return toast("Add a title", true);
        await run(() => Store.set(`u:${Date.now()}`, { ts: nowIso, title, body, level: document.getElementById("up-level").value }), "Update published"); break;
      }
      case "unpost": if (confirm("Delete this update?")) await run(() => Store.del(b.dataset.uid), "Deleted"); break;
      case "export": {
        const blob = new Blob([JSON.stringify({ exported: nowIso, data: Store.all() }, null, 2)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `sunrise-backup-${nowIso.slice(0, 16).replace(/[:T]/g, "-")}.json`; a.click(); break;
      }
      case "reset": if (confirm("Reset EVERYTHING? All scores, calls and updates will be deleted.") && confirm("Are you sure? Download a backup first.")) await run(() => Store.replaceAll({}), "All data cleared"); break;
      case "random": await run(() => randomFill(b.dataset.upto), "Test results added"); break;
    }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "adm-import") return;
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!j.data || typeof j.data !== "object") throw new Error("Not a backup file");
      if (confirm(`Restore backup from ${j.exported}? Current data will be replaced.`)) await run(() => Store.replaceAll(j.data), "Backup restored");
    } catch (err) { toast(err.message, true); }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "adm-login") return;
    e.preventDefault();
    await run(() => Store.signIn(document.getElementById("adm-email").value, document.getElementById("adm-pass").value), "Signed in");
    App.render();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const mm = e.target.id && e.target.id.match(/^in-(.+)-[ab]$/);
    if (mm) { e.preventDefault(); saveScore(mm[1], "final"); }
  });
  return { render };
})();

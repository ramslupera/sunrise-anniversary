// ============================================================
//  SUNRISE · PUBLIC PAGES (hash router)
// ============================================================
(function () {
  const X = Engine, C = SPC_CONFIG, E = C.EVENT, D = SPC_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;
  window.UI = { esc, $ };

  // ?now=2026-11-29T09:10 previews the site at that Manila time
  const qNow = new URLSearchParams(location.search).get("now");
  if (qNow) window.__SPC_TIME_SHIFT = new Date(qNow + ":00+08:00").getTime() - Date.now();

  const myPair = {
    get() { try { return localStorage.getItem("spc-my-pair"); } catch (e) { return null; } },
    set(v) { try { v ? localStorage.setItem("spc-my-pair", v) : localStorage.removeItem("spc-my-pair"); } catch (e) {} }
  };

  // ---------- components ----------
  const catTag = (ev) => `<span class="cat cat-${ev}">${ev}</span>`;
  const pairLink = (id) => `<a href="#/players/${enc(id)}">${esc(X.pairName(id))}</a>`;
  function pill(st) {
    return { live: `<span class="pill live">Live</span>`, final: `<span class="pill final">Final</span>`, called: `<span class="pill called">Called</span>`, scheduled: `<span class="pill">Upcoming</span>` }[st] || "";
  }
  function side(s, k, link = true) {
    const id = s[k];
    if (id) return link ? pairLink(id) : esc(X.pairName(id));
    const proj = s["proj" + k.toUpperCase()];
    return `<span class="ph">${esc(s["p" + k])}</span>${proj ? ` <span class="tiny muted">(now: ${esc(X.pairShort(proj))})</span>` : ""}`;
  }
  function matchCard(s, opts = {}) {
    const showS = s.status === "live" || s.status === "final";
    const cls = (k) => (s.winSide ? (s.winSide === k ? "w" : "l") : "");
    const flag = s.result === "retired" ? "RET" : s.result === "forfeit" ? "FF" : "";
    const hl = opts.pair && (s.a === opts.pair || s.b === opts.pair) ? " mine" : "";
    return `<div class="card match${hl} ${s.m.medal ? "medal" : ""}">
      <div class="mh">${catTag(s.ev)}<span class="small muted">${X.fmt(s.time)} · Court ${s.court}</span>${pill(s.status)}</div>
      <div class="mtitle">${esc(s.title)}${s.m.medal ? " · win by 2" : ""}${flag ? ` · <b>${flag}</b>` : ""}</div>
      <div class="mrow ${cls("a")}"><span class="n">${side(s, "a")}</span><span class="s">${showS ? scoreOf(s, "a") : ""}</span></div>
      <div class="mrow ${cls("b")}"><span class="n">${side(s, "b")}</span><span class="s">${showS ? scoreOf(s, "b") : ""}</span></div>
      ${s.note ? `<div class="mnote">ⓘ ${esc(s.note)}</div>` : ""}</div>`;
  }
  const scoreOf = (s, k) => { const v = X.score(s.id)[k]; return v === null ? (s.status === "live" ? "•" : "") : v; };

  function standingsTable(ev, g, opts = {}) {
    const st = X.standings(ev, g);
    const mp = myPair.get();
    const rows = st.rows.map((r, i) => {
      const badge = r.clinched ? `<span class="pill q">${st.complete ? "Advances" : "Clinched"}</span>` : r.out ? `<span class="pill e">Out</span>` : "";
      const pd = `<span class="${r.PD > 0 ? "pos" : r.PD < 0 ? "neg" : ""}">${X.signed(r.PD)}</span>`;
      return `<tr class="${i < st.adv ? "qz" : ""} ${i === st.adv - 1 ? "cut" : ""} ${mp === r.id ? "me" : ""}"><td class="rank">${i + 1}</td>
        <td><div class="tname">${pairLink(r.id)} ${badge}</div>${opts.compact ? "" : `<div class="why">${esc(r.why)}</div>`}</td>
        <td class="b">${r.W}-${r.L}</td>${opts.compact ? "" : `<td class="hide-s">${r.PF}</td><td class="hide-s">${r.PA}</td>`}<td class="b">${pd}</td></tr>`;
    }).join("");
    const head = `<tr><th>#</th><th>Pair</th><th>W-L</th>${opts.compact ? "" : `<th class="hide-s">PF</th><th class="hide-s">PA</th>`}<th>PD</th></tr>`;
    const stat = st.complete ? `<span class="pill final">Complete</span>` : st.started ? `<span class="pill live">${st.nFinal}/${st.total} final</span>` : `<span class="pill">${st.total} games</span>`;
    return `<div class="card pad0"><div class="spread th"><h3>${opts.withCat ? catTag(ev) + " " : ""}${esc(st.label)}</h3>${stat}</div>
      <div style="padding:0 8px"><table class="table">${head}${rows}</table></div>
      <div class="tfoot tiny muted">Top ${st.adv} advance</div></div>`;
  }

  function sponsorStrip() {
    const items = C.SPONSORS.map((s) => s.file
      ? `<div class="sp"><img src="${esc(s.file)}" alt="${esc(s.name)}" loading="lazy"></div>`
      : `<div class="sp sp-txt">${esc(s.name)}</div>`).join("");
    return `<section class="sponsors" aria-label="Our sponsors"><div class="sp-title">Thank you to our sponsors</div>
      <div class="sp-viewport"><div class="sp-track">${items}${items.replace(/<div class="sp/g, '<div aria-hidden="true" class="sp')}</div></div></section>`;
  }

  // ---------- views ----------
  const views = {};

  views.home = () => {
    const es = X.eventStatus();
    const A = X.all();
    let focus = A.filter((s) => s.status === "live" || s.status === "called");
    const isLive = focus.length > 0;
    if (!isLive) { const nx = A.filter((s) => s.status !== "final").sort((a, b) => a.time.localeCompare(b.time)); focus = nx.length ? nx.filter((s) => s.time === nx[0].time) : []; }
    const mp = myPair.get();
    let mine = "";
    if (mp && X.pairById[mp]) {
      const ms = X.pairMatches(mp), nx = ms.find((s) => s.status !== "final");
      const p = X.pairById[mp], st = X.standings(p.ev, p.group), r = st.rows.find((x) => x.id === mp);
      mine = `<div class="card mypair"><div class="spread"><div><div class="eyebrow">My pair · ${esc(X.CAT[p.ev].short)}</div><h3>${pairLink(mp)}</h3></div>
        <div class="row"><span class="pill acc">#${r.rank} ${esc(st.label)}</span><span class="pill">${r.W}-${r.L}</span></div></div>
        ${nx ? `<p class="small" style="margin:10px 0 0">Next: <b>${X.fmt(nx.time)} · Court ${nx.court}</b> · ${esc(nx.title)} vs ${nx.a === mp ? side(nx, "b") : side(nx, "a")}</p>` : `<p class="small muted" style="margin:10px 0 0">No more matches scheduled.</p>`}</div>`;
    }
    const ups = Updates.list().slice(0, 2);
    return `
    <section class="hero">
      <div class="rays"></div>
      <img class="hero-logo" src="logo.png" alt="Sunrise Pickleball Crew logo">
      <div class="presents">Sunrise Pickleball Crew presents</div>
      <div class="big1">1<sup>ST</sup></div>
      <div class="anniv">Anniversary</div>
      <div class="tourn"><span>Tournament</span></div>
      <div class="tagline"><span class="y">Rise. Rally.</span> <span class="o">Celebrate.</span></div>
      <div class="infocard">
        <div class="ic-top"><div><small>${esc(E.dayLabel)}</small><b>${esc(E.dateLabel)}</b></div><i></i><div><small>Starts</small><b>8:00 AM</b></div></div>
        <div class="ic-venue"><small>Venue</small><b>${esc(E.venue)} · ${esc(E.city)}</b></div>
      </div>
      <div class="status-banner ${es.kind}"><div style="flex:1"><b>${esc(es.title)}</b><div class="small">${esc(es.text)}</div>
        ${es.kind === "pre" ? `<div class="countdown" id="countdown"></div>` : ""}</div></div>
      <div class="row hero-btns"><a class="btn primary" href="#/live">Live courts</a><a class="btn" href="#/schedule">Schedule</a><a class="btn" href="#/players">Find my pair</a></div>
    </section>
    ${sponsorStrip()}
    ${mine}
    <div class="page-head mt2"><div><div class="eyebrow">One call time per category</div><h2>When to arrive</h2></div><a href="#/rules" class="btn sm">Official rules</a></div>
    <div class="grid g5">${C.CATEGORIES.map((c) => `<div class="card callcard">${catTag(c.code)}<h3>${esc(c.short)}</h3>
      <div class="ct"><small>Call time</small><b>${X.fmt(c.call)}</b></div>
      <div class="small muted">First serve ${X.fmt(c.first)} · done by ${X.fmt(c.done)}</div></div>`).join("")}</div>
    <div class="page-head mt2"><div><div class="eyebrow">${isLive ? "On court now" : "Coming up"}</div><h2>${isLive ? "Live matches" : focus.length ? "Next up · " + X.fmt(focus[0].time) : "All done"}</h2></div><a href="#/schedule" class="btn sm">Full schedule</a></div>
    <div class="grid g3">${focus.map((s) => matchCard(s)).join("") || `<div class="card empty">All matches are final.</div>`}</div>
    ${ups.length ? `<div class="page-head mt2"><div><div class="eyebrow">From Match Control</div><h2>Latest updates</h2></div><a href="#/updates" class="btn sm">All updates</a></div>${ups.map(Updates.card).join("")}` : ""}
    <div class="page-head mt2"><div><div class="eyebrow">How it works</div><h2>The format</h2></div><a href="#/brackets" class="btn sm">Brackets</a></div>
    <div class="grid g3">
      <div class="card"><div class="tag">01 · Groups</div><h3 style="margin-top:6px">Every pair plays 4+ games</h3><p class="small muted">Novice categories play a modified round robin: 4 games against fixed opponents. Intermediate categories play a full round robin.</p></div>
      <div class="card"><div class="tag">02 · Eliminations</div><h3 style="margin-top:6px">Top pairs advance</h3><p class="small muted">Semifinals for every category, plus quarterfinals for Intermediate Men's. Bronze matches for Intermediate Men's and Mixed.</p></div>
      <div class="card"><div class="tag">03 · Scoring</div><h3 style="margin-top:6px">Side-out to 11</h3><p class="small muted">Win by 1 with a 20-minute limit in groups and eliminations. Medal matches are win by 2. Ranking: wins → head-to-head → point difference.</p></div>
    </div>`;
  };

  views.live = () => {
    const es = X.eventStatus();
    const courts = Array.from({ length: E.courts }, (_, i) => X.courtQueue(i + 1));
    return `<div class="page-head"><div><div class="eyebrow">Matchday · ${esc(E.venue)}</div><h1>Live courts</h1><p>${esc(es.text)}</p></div>
      <span class="pill ${es.kind === "live" ? "live" : es.kind === "done" ? "final" : "acc"}">${esc(es.title)}</span></div>
      <div class="courts">${courts.map(courtCard).join("")}</div>
      <p class="small muted mt">Each card shows the match on that court now, or the next one up. Pairs must report within 3 minutes of being called.</p>`;
  };
  function courtCard(q) {
    const s = q.current;
    if (!s) return `<div class="card court"><div class="court-head"><span class="cn">Court<b>${q.court}</b></span><span class="pill final">Done</span></div>
      <div class="court-body"><p class="muted small">All ${q.total} matches on this court are final.</p></div><div class="court-foot">Thanks for playing!</div></div>`;
    const st = s.status === "live" ? "live" : s.status === "called" ? "called" : "scheduled";
    const showS = s.status === "live";
    return `<div class="card court ${st === "live" ? "is-live" : st === "called" ? "is-called" : ""}">
      <div class="court-head"><span class="cn">Court<b>${q.court}</b></span>${pill(st)}</div>
      <div class="court-body"><div class="gt">${catTag(s.ev)} ${esc(s.title)}${s.m.medal ? " · win by 2" : ""}</div>
        <div class="score-row"><span class="n">${side(s, "a")}</span><span class="s">${showS ? scoreOf(s, "a") : ""}</span></div>
        <div class="score-row"><span class="n">${side(s, "b")}</span><span class="s">${showS ? scoreOf(s, "b") : ""}</span></div>
        <div class="small muted">${st === "called" ? `Called ${new Date(s.called).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })} · report now` : st === "live" ? "In play" : `Scheduled ${X.fmt(s.time)}`}</div></div>
      <div class="court-foot">${q.next ? `Next: ${q.next.ev} ${esc(q.next.title)} · ${X.fmt(q.next.time)}` : "Last match on this court"} · ${q.done}/${q.total} done</div></div>`;
  }

  // ---- schedule ----
  const sched = { view: "list", q: "", cat: "all", status: "all" };
  const seg = (obj, key, opts, attr) => `<div class="seg">${opts.map(([v, l]) => `<button data-${attr}="${key}" data-v="${v}" class="${obj[key] === v ? "on" : ""}">${l}</button>`).join("")}</div>`;
  views.schedule = () => {
    const A = X.all(), q = sched.q.trim().toLowerCase();
    const f = A.filter((s) => {
      if (sched.cat !== "all" && s.ev !== sched.cat) return false;
      if (sched.status === "live" && !(s.status === "live" || s.status === "called")) return false;
      if (sched.status === "upcoming" && s.status !== "scheduled") return false;
      if (sched.status === "final" && s.status !== "final") return false;
      if (q && ![s.a && X.pairName(s.a), s.b && X.pairName(s.b), s.pa, s.pb, s.title, s.a, s.b].join(" ").toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => a.time.localeCompare(b.time) || a.court - b.court);
    let body;
    if (sched.view === "grid") body = scheduleGrid();
    else {
      const times = [...new Set(f.map((s) => s.time))];
      body = times.map((t) => `<div class="slot-head"><span class="time">${X.fmt(t)}</span><span class="small muted">${f.filter((s) => s.time === t).length} match(es)</span></div>
        <div class="grid g3">${f.filter((s) => s.time === t).map((s) => matchCard(s)).join("")}</div>`).join("") || `<div class="card empty mt">No matches match your filters.</div>`;
    }
    return `<div class="page-head"><div><div class="eyebrow">Official schedule · ${E.courts} courts · 20-minute rounds</div><h1>Schedule</h1>
      <p>${D.matches.length} matches from 8:00 AM to 4:00 PM. Times can shift: listen for Match Control's calls.</p></div>
      ${seg(sched, "view", [["list", "Matches"], ["grid", "Court grid"]], "sched")}</div>
      ${sched.view === "list" ? `<div class="filters"><input id="sched-q" type="search" placeholder="Search a player's name…" value="${esc(sched.q)}" style="flex:1;min-width:200px">
      ${seg(sched, "cat", [["all", "All"], ...C.CATEGORIES.map((c) => [c.code, c.code])], "sched")}
      ${seg(sched, "status", [["all", "Any"], ["live", "Live"], ["upcoming", "Upcoming"], ["final", "Final"]], "sched")}</div>
      <div class="small muted">Showing ${f.length} of ${A.length} matches</div>` : ""}
      ${body}`;
  };
  function scheduleGrid() {
    const A = X.all();
    const times = [...new Set(A.map((s) => s.time))].sort();
    const head = `<tr><th>Time</th>${Array.from({ length: E.courts }, (_, i) => `<th>Court ${i + 1}</th>`).join("")}</tr>`;
    const rows = times.map((t) => {
      const cells = Array.from({ length: E.courts }, () => `<td class="muted tiny">${""}</td>`);
      A.filter((s) => s.time === t).forEach((s) => {
        const has = s.status === "live" || s.status === "final";
        cells[s.court - 1] = `<td class="cell ${s.status} cbg-${s.ev}"><div class="k">${s.ev} · ${esc(s.title)}</div>
          <div>${s.a ? esc(X.pairShort(s.a)) : `<span class="ph">${esc(s.pa)}</span>`}</div><div>${s.b ? esc(X.pairShort(s.b)) : `<span class="ph">${esc(s.pb)}</span>`}</div>
          ${has ? `<div class="sc">${scoreOf(s, "a")}–${scoreOf(s, "b")}${s.status === "live" ? " · live" : ""}</div>` : ""}</td>`;
      });
      return `<tr><td class="t">${X.fmt(t)}</td>${cells.join("")}</tr>`;
    }).join("");
    return `<div class="sgrid-wrap mt"><table class="sgrid">${head}${rows}</table></div>
      <p class="small muted">Empty slots in the afternoon are rest rounds before the Intermediate Men's knockouts.</p>`;
  }

  // ---- standings ----
  const stTab = { cat: "NWD" };
  views.standings = () => {
    const ev = stTab.cat, cat = X.CAT[ev];
    const groups = X.groupsOf(ev);
    const note = { NWD: "Modified round robin: each pair plays 4 of its 5 group-mates (1 & 2, 3 & 6, 4 & 5 don't meet). Top 2 of each group go to the semifinals.",
      NXD: "Modified round robin: each pair plays the 2 slots on either side of it, around a circle (NXD-1 plays 2, 3, 7, 8). Top 4 go to the semifinals.",
      NMD: "Modified round robin: each pair plays 4 of its 5 pool-mates (1 & 2, 3 & 6, 4 & 5 don't meet). Top 4 go to the semifinals.",
      IMD: "Full round robin in 4 groups. Top 2 of each group go to the quarterfinals. 3rd and 4th in Groups B–D play one consolation match.",
      IXD: "Full round robin. 1st vs 2nd play the final, 3rd vs 4th the bronze match." }[ev];
    return `<div class="page-head"><div><div class="eyebrow">Live standings</div><h1>Standings</h1><p>Updated the moment Match Control records a result.</p></div>
      <a class="btn" href="#/brackets">Eliminations</a></div>
      ${seg(stTab, "cat", C.CATEGORIES.map((c) => [c.code, c.short]), "st")}
      <h2 class="mt">${esc(cat.name)}</h2><p class="small muted">${esc(note)}</p>
      <div class="grid ${groups.length > 1 ? "g2" : ""}">${groups.map((g) => standingsTable(ev, g)).join("")}</div>
      <div class="legend"><span><b>W-L</b> wins–losses</span><span><b>PF/PA</b> points for/against</span><span><b>PD</b> point difference</span><span><b>Clinched</b> sure to advance</span><span><b>Out</b> can no longer advance</span></div>
      <p class="small muted">Ranking (Official Rules §6): 1) wins 2) head-to-head, for two tied pairs that played each other 3) point difference 4) points won. Forfeits count 11–0.</p>`;
  };

  // ---- brackets ----
  const bkTab = { cat: "NWD" };
  views.brackets = () => {
    const ev = bkTab.cat, cat = X.CAT[ev];
    const M = (k) => X.match(X.mById[`${ev}-${k}`]);
    const mini = (s) => {
      const sc = s.status === "live" || s.status === "final";
      const row = (k) => `<div class="mt ${s.winSide === k ? "w" : ""}"><span>${side(s, k)}</span><span class="sc b">${sc ? scoreOf(s, k) : ""}</span></div>`;
      return `<div class="mini"><div class="mh"><span>${esc(s.title)}</span><span>${X.fmt(s.time)} · Court ${s.court}${s.status === "scheduled" ? "" : " · " + s.status}</span></div>${row("a")}${row("b")}</div>`;
    };
    const has = (k) => !!X.mById[`${ev}-${k}`];
    const cols = [];
    if (has("QF1")) cols.push(`<div class="bk-col"><h3>Quarterfinals · ${X.fmt(M("QF1").time)}</h3>${["QF1", "QF2", "QF3", "QF4"].map((k) => mini(M(k))).join("")}</div>`);
    if (has("SF1")) cols.push(`<div class="bk-col"><h3>Semifinals · ${X.fmt(M("SF1").time)}</h3>${mini(M("SF1"))}${mini(M("SF2"))}</div>`);
    cols.push(`<div class="bk-col"><h3>Medal matches · ${X.fmt(M("F").time)}</h3>${mini(M("F"))}${has("BR") ? mini(M("BR")) : `<p class="small muted">No bronze match: both semifinal losers receive bronze.</p>`}</div>`);
    const cons = has("CN1") ? `<div class="page-head mt2"><div><div class="eyebrow">4th-game guarantee</div><h2>Consolation matches</h2></div></div>
      <p class="small muted">3rd and 4th place in Groups B, C and D play one extra match. It does not affect rankings or prizes.</p>
      <div class="grid g3">${["CN1", "CN2", "CN3"].map((k) => matchCard(M(k))).join("")}</div>` : "";
    const pd = X.podium(ev);
    const pod = (medal, place, ids) => `<div class="card"><div class="medal">${medal}</div><div class="place">${place}</div><div class="team">${ids.length ? ids.map(pairLink).join("<br>") : `<span class="ph">TBD</span>`}</div></div>`;
    return `<div class="page-head"><div><div class="eyebrow">Road to gold</div><h1>Eliminations</h1><p>Quarterfinals and semifinals are to 11, win by 1. Finals and bronze matches are to 11, win by 2.</p></div><a class="btn" href="#/standings">Standings</a></div>
      ${seg(bkTab, "cat", C.CATEGORIES.map((c) => [c.code, c.short]), "bk")}
      <h2 class="mt mb">${esc(cat.name)}</h2>
      <div class="bk" style="grid-template-columns:repeat(${cols.length},1fr)">${cols.join("")}</div>
      ${cons}
      <div class="page-head mt2"><div><div class="eyebrow">Medals right after each final</div><h2>Podium</h2></div></div>
      <div class="podium">${pod("🥇", "Gold", pd.gold ? [pd.gold] : [])}${pod("🥈", "Silver", pd.silver ? [pd.silver] : [])}${pod("🥉", "Bronze", pd.bronze.filter(Boolean))}</div>`;
  };

  // ---- players ----
  const plQ = { q: "" };
  views.players = (id) => {
    if (id && X.pairById[id]) return pairDetail(id);
    const q = plQ.q.trim().toLowerCase();
    const mp = myPair.get();
    const secs = C.CATEGORIES.map((c) => {
      const list = D.pairs.filter((p) => p.ev === c.code && (!q || `${p.p1} ${p.p2} ${p.id}`.toLowerCase().includes(q)));
      if (!list.length) return "";
      return `<h3 class="mt2 mb">${catTag(c.code)} ${esc(c.name)} <span class="small muted">· call time ${X.fmt(c.call)}</span></h3>
        <div class="grid g4">${list.map((p) => `<a class="card pair-card" href="#/players/${enc(p.id)}"><div><b>${esc(p.p1)}</b><br><b>${esc(p.p2)}</b><div class="tiny muted">${esc(p.id)} · ${esc(X.groupLabel(p.ev, p.group))}</div></div></a>`).join("")}</div>`;
    }).join("");
    return `<div class="page-head"><div><div class="eyebrow">Players</div><h1>Find my pair</h1><p>Search your name to see your matches, courts and standing. You can save your pair on this device.</p></div>
      ${mp && X.pairById[mp] ? `<a class="btn primary" href="#/players/${enc(mp)}">Go to my pair</a>` : ""}</div>
      <input id="pl-q" class="search" type="search" placeholder="Type a player's name…" value="${esc(plQ.q)}">
      ${secs || `<div class="card empty mt">No player matches “${esc(plQ.q)}”.</div>`}`;
  };
  function pairDetail(id) {
    const p = X.pairById[id], c = X.CAT[p.ev], st = X.standings(p.ev, p.group), r = st.rows.find((x) => x.id === id);
    const ms = X.pairMatches(id), nx = ms.find((s) => s.status !== "final");
    const mine = myPair.get() === id;
    return `<div class="page-head"><div><div class="eyebrow">${esc(c.name)} · ${esc(id)}</div><h1>${esc(p.p1)} <span class="muted">&amp;</span> ${esc(p.p2)}</h1></div>
      <div class="row"><button class="btn ${mine ? "" : "primary"}" data-mypair="${mine ? "" : esc(id)}">${mine ? "✓ My pair (remove)" : "Make this my pair"}</button><a class="btn" href="#/players">All players</a></div></div>
      <div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
        <div class="stat"><b>${X.fmt(c.call)}</b><span>Call time</span></div>
        <div class="stat"><b>#${r.rank}</b><span>${esc(st.label)}</span></div>
        <div class="stat"><b>${r.W}-${r.L}</b><span>Wins-losses</span></div>
        <div class="stat"><b class="${r.PD > 0 ? "pos" : r.PD < 0 ? "neg" : ""}">${X.signed(r.PD)}</b><span>Point diff</span></div>
        <div class="stat"><b>${r.clinched ? "✓" : r.out ? "—" : "…"}</b><span>${r.clinched ? (st.complete ? "Advances" : "Clinched") : r.out ? "Out" : "In the race"}</span></div>
      </div>
      <p class="small muted">${esc(r.why)}</p>
      ${nx ? `<div class="status-banner"><div><b>Next up · ${X.fmt(nx.time)} · Court ${nx.court}</b><div class="small">${esc(nx.title)} vs ${nx.a === id ? side(nx, "b") : side(nx, "a")}</div></div></div>` : ""}
      <h2 class="mt2 mb">Matches</h2><div class="grid g3">${ms.map((s) => matchCard(s, { pair: id })).join("")}</div>`;
  }

  views.updates = () => {
    const ups = Updates.list();
    return `<div class="page-head"><div><div class="eyebrow">From Match Control</div><h1>Updates</h1><p>Schedule changes, court moves and announcements.</p></div></div>
      ${ups.map(Updates.card).join("") || `<div class="card empty">No announcements yet.</div>`}`;
  };

  views.rules = () => `<div class="page-head"><div><div class="eyebrow">Official rules</div><h1>Rules</h1><p>Match Control has final authority on all matters below.</p></div></div>
    <div class="card rules">${window.RULES_HTML || ""}</div>`;

  views.tv = () => {
    document.body.classList.add("tv");
    const es = X.eventStatus();
    const courts = Array.from({ length: E.courts }, (_, i) => X.courtQueue(i + 1));
    const up = Updates.list()[0];
    const A = X.all().filter((s) => s.status !== "final").sort((a, b) => a.time.localeCompare(b.time));
    const nextT = [...new Set(A.map((s) => s.time))].slice(1, 3);
    return `<div class="tv"><div class="tv-head"><div class="row"><img src="logo.png" alt="" style="width:64px;height:64px"><div><div class="title">1st Anniversary Tournament</div><div class="muted">${esc(E.venue)}, ${esc(E.city)} · ${esc(es.title)} — ${esc(es.text)}</div></div></div>
      <div style="text-align:right"><div class="tv-clock" id="tv-clock"></div><div class="small muted">Follow live: <b style="color:var(--gold)">${esc(location.host + location.pathname)}</b></div></div></div>
      <div class="tv-courts">${courts.map(courtCard).join("")}</div>
      ${nextT.length ? `<h3 class="mt">Coming up</h3><div class="tv-next">${A.filter((s) => nextT.includes(s.time)).map((s) => `<div><b>${X.fmt(s.time)} · C${s.court}</b> ${s.ev} ${esc(s.title)}: ${s.a ? esc(X.pairShort(s.a)) : esc(s.pa)} vs ${s.b ? esc(X.pairShort(s.b)) : esc(s.pb)}</div>`).join("")}</div>` : ""}
      ${up ? `<div class="tv-ticker">📣 <b>${esc(up.title)}</b> — ${esc(up.body)}</div>` : ""}</div>`;
  };

  views.control = () => (window.Admin ? Admin.render() : "");

  window.Updates = {
    list: () => Store.keys("u:").map((k) => ({ id: k, ...Store.get(k) })).sort((a, b) => (b.ts || "").localeCompare(a.ts || "")),
    card: (u) => `<div class="update ${esc(u.level || "info")}"><div class="row"><span class="pill ${u.level === "important" ? "live" : u.level === "success" ? "final" : "acc"}">${esc(u.level || "info")}</span>
      <span class="small muted">${new Date(u.ts).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}</span></div>
      <h3>${esc(u.title)}</h3><p class="small">${esc(u.body)}</p></div>`
  };

  // ---------- router ----------
  const NAV = [["", "Home"], ["live", "Live"], ["schedule", "Schedule"], ["standings", "Standings"], ["brackets", "Eliminations"], ["players", "My Pair"], ["updates", "Updates"], ["rules", "Rules"]];
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const [r, ...rest] = h.split("/");
    return { r: views[r] ? r : "home", arg: rest.length ? decodeURIComponent(rest.join("/")) : null };
  }
  function renderNav() {
    const { r } = route();
    const anyLive = X.all().some((s) => s.status === "live");
    $("#nav").innerHTML = NAV.map(([k, l]) => `<a href="#/${k}" class="${(r === "home" ? "" : r) === k ? "active" : ""}">${k === "live" && anyLive ? `<span class="dot"></span>` : ""}${l}</a>`).join("");
    const c = Store.conn();
    const label = { demo: "Demo mode", live: "Live", polling: "Syncing", connecting: "Connecting…", error: "Offline" }[c];
    $("#conn").className = "conn " + (c === "live" ? "ok" : c === "error" ? "bad" : "");
    $("#conn").innerHTML = `<i></i>${label}`;
  }
  function render() {
    const { r, arg } = route();
    if (r !== "tv") document.body.classList.remove("tv");
    const main = $("#main");
    const act = document.activeElement;
    const focusId = act && main.contains(act) && act.id ? act.id : null;
    const sel = focusId && "selectionStart" in act ? [act.selectionStart, act.selectionEnd] : null;
    const dirty = {};
    main.querySelectorAll("[data-dirty]").forEach((el) => { if (el.id) dirty[el.id] = el.value; });
    main.innerHTML = views[r](arg);
    Object.entries(dirty).forEach(([id, v]) => { const el = document.getElementById(id); if (el) { el.value = v; el.dataset.dirty = "1"; } });
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); try { sel && el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
    renderNav();
    document.title = `${{ home: "Home", live: "Live courts", schedule: "Schedule", standings: "Standings", brackets: "Eliminations", players: "My pair", updates: "Updates", rules: "Rules", tv: "TV", control: "Match Control" }[r]} · Sunrise 1st Anniversary`;
    tick();
  }
  window.App = { render };

  function tick() {
    const cd = $("#countdown");
    if (cd) {
      const ms = Math.max(0, X.toDate(E.start) - X.now());
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      cd.innerHTML = [[d, "days"], [h, "hrs"], [m, "min"], [s, "sec"]].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("");
    }
    const clk = $("#tv-clock");
    if (clk) clk.textContent = X.now().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila" });
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sched],[data-st],[data-bk]");
    if (b) {
      if (b.dataset.sched) sched[b.dataset.sched] = b.dataset.v;
      if (b.dataset.st) stTab[b.dataset.st] = b.dataset.v;
      if (b.dataset.bk) bkTab[b.dataset.bk] = b.dataset.v;
      render(); return;
    }
    const m = e.target.closest("[data-mypair]");
    if (m) { myPair.set(m.dataset.mypair || null); render(); }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "sched-q") { sched.q = e.target.value; render(); }
    else if (e.target.id === "pl-q") { plQ.q = e.target.value; render(); }
    else if (e.target.closest("#main [data-keep]")) e.target.dataset.dirty = "1";
  });
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  Store.on(render);
  setInterval(tick, 1000);
  setInterval(() => { if (route().r !== "control") render(); }, 30000);

  document.addEventListener("DOMContentLoaded", async () => {
    if (Store.demo) $("#demo-bar").hidden = false;
    render();
    await Store.init();
    render();
  });
})();

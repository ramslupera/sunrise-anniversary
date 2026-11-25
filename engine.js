// ============================================================
//  ENGINE — turns raw scores into standings, knockout pairings,
//  court queues and event status.
//  Ranking (Official Rules §6): wins → head-to-head (2 tied pairs
//  only) → point difference → points won → Match Control decides.
//  Keys in the store:
//    g:<matchId> → {a,b,status:"live"|"final",result:"normal"|"retired"|"forfeit",ts}
//    t:<matchId> → {called,time,court,note,a,b}   (a/b = manual pair override)
//    u:<id>      → announcement {ts,level,title,body}
// ============================================================
window.Engine = (function () {
  const D = window.SPC_DATA, C = window.SPC_CONFIG, E = C.EVENT;
  const CAT = Object.fromEntries(C.CATEGORIES.map((c) => [c.code, c]));
  const pairById = Object.fromEntries(D.pairs.map((p) => [p.id, p]));
  const mById = Object.fromEntries(D.matches.map((m) => [m.id, m]));
  const n = (v) => (v === "" || v === null || v === undefined || isNaN(+v) ? null : +v);

  // ---------- time (Philippines = UTC+8) ----------
  const toDate = (hhmm) => new Date(`${E.date}T${hhmm}:00+08:00`);
  function fmt(hhmm) {
    if (!hhmm) return "";
    let [h, m] = hhmm.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${ap}`;
  }
  const now = () => new Date(Date.now() + (window.__SPC_TIME_SHIFT || 0));
  const addMin = (hhmm, k) => { const [h, m] = hhmm.split(":").map(Number); const t = h * 60 + m + k; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

  // ---------- names ----------
  const pairName = (id) => { const p = pairById[id]; return p ? `${p.p1} / ${p.p2}` : id; };
  const groupKey = (ev, g) => `${ev}-${g}`;
  const groupLabel = (ev, g) => (g === "P" ? (ev === "IXD" ? "Round robin" : "Pool") : `Group ${g}`);
  const groupsOf = (ev) => [...new Set(D.pairs.filter((p) => p.ev === ev).map((p) => p.group))];

  // ---------- raw ----------
  function score(id) {
    const v = Store.get(`g:${id}`) || {};
    return { a: n(v.a), b: n(v.b), status: v.status || "scheduled", result: v.result || "normal", ts: v.ts || null };
  }
  const meta = (id) => Store.get(`t:${id}`) || {};

  // ---------- cache ----------
  const cache = { m: {}, st: {} };
  Store.on(() => { cache.m = {}; cache.st = {}; });

  // ---------- who plays in a knockout slot ----------
  function srcLabel(m, s) {
    if (s.rank) return `${["", "1st", "2nd", "3rd", "4th", "5th"][s.rank]} ${s.group === "P" ? (m.ev === "IXD" ? "round robin" : "pool") : "Group " + s.group}`;
    const id = s.w || s.l, k = id.split("-")[1];
    const nice = k.replace("SF", "SF ").replace("QF", "QF ");
    return `${s.w ? "Winner" : "Loser"} ${nice}`;
  }
  function resolve(m, s) {
    if (s.rank) {
      const st = standings(m.ev, s.group);
      const row = st.rows[s.rank - 1];
      return { id: st.complete && row ? row.id : null, proj: st.started && row ? row.id : null };
    }
    const r = match(mById[s.w || s.l]);
    return { id: s.w ? r.winner : r.loser, proj: null };
  }

  // ---------- match summary ----------
  function match(m) {
    if (cache.m[m.id]) return cache.m[m.id];
    const md = meta(m.id), sc = score(m.id);
    let a, b, pa, pb, projA = null, projB = null;
    if (m.stage === "G") { a = m.a; b = m.b; pa = a; pb = b; }
    else {
      const A = resolve(m, m.srcA), B = resolve(m, m.srcB);
      a = md.a || A.id; b = md.b || B.id; projA = A.proj; projB = B.proj;
      pa = srcLabel(m, m.srcA); pb = srcLabel(m, m.srcB);
    }
    let status = sc.status;
    if (status === "scheduled" && md.called) status = "called";
    const fin = sc.status === "final" && sc.a !== null && sc.b !== null && sc.a !== sc.b;
    const winSide = fin ? (sc.a > sc.b ? "a" : "b") : null;
    const r = {
      m, id: m.id, ev: m.ev, a, b, pa, pb, projA, projB, sa: sc.a, sb: sc.b, result: sc.result, ts: sc.ts, status: fin ? "final" : status === "final" ? "live" : status,
      winSide, winner: winSide ? (winSide === "a" ? a : b) : null, loser: winSide ? (winSide === "a" ? b : a) : null,
      time: md.time || m.time, court: n(md.court) || m.court, called: md.called || null, note: md.note || "",
      title: m.stage === "G" ? groupLabel(m.ev, m.group) : m.label
    };
    cache.m[m.id] = r;
    return r;
  }
  const all = () => D.matches.map(match);

  // ---------- standings ----------
  const sg = (v) => (v > 0 ? `+${v}` : `${v}`);
  function standings(ev, g) {
    const key = groupKey(ev, g);
    if (cache.st[key]) return cache.st[key];
    const rows = D.pairs.filter((p) => p.ev === ev && p.group === g).map((p) => ({ id: p.id, P: 0, W: 0, L: 0, PF: 0, PA: 0, rem: 0, beat: new Set() }));
    const R = Object.fromEntries(rows.map((r) => [r.id, r]));
    const ms = D.matches.filter((m) => m.stage === "G" && m.ev === ev && m.group === g);
    let nFinal = 0, started = false;
    ms.forEach((m) => {
      const s = match(m), A = R[m.a], B = R[m.b];
      if (s.status === "live" || s.status === "final") started = true;
      if (s.status !== "final") { A.rem++; B.rem++; return; }
      nFinal++;
      A.P++; B.P++; A.PF += s.sa; A.PA += s.sb; B.PF += s.sb; B.PA += s.sa;
      if (s.winSide === "a") { A.W++; B.L++; A.beat.add(B.id); } else { B.W++; A.L++; B.beat.add(A.id); }
    });
    rows.forEach((r) => { r.PD = r.PF - r.PA; });
    // sort: wins, then (2-way) head-to-head, then PD, PF
    rows.sort((x, y) => y.W - x.W || y.PD - x.PD || y.PF - x.PF || x.id.localeCompare(y.id));
    for (let i = 0; i < rows.length - 1; i++) {
      const x = rows[i], y = rows[i + 1];
      const tiedW = rows.filter((r) => r.W === x.W);
      if (tiedW.length === 2 && x.W === y.W && y.beat.has(x.id)) { rows[i] = y; rows[i + 1] = x; }
    }
    const complete = nFinal === ms.length;
    const adv = advancing(ev);
    rows.forEach((r, i) => {
      r.rank = i + 1;
      const nx = rows[i + 1], pv = rows[i - 1];
      const cmpWhy = (p, q) => {
        if (p.W !== q.W) return `wins (${p.W} vs ${q.W})`;
        if (rows.filter((z) => z.W === p.W).length === 2 && p.beat.has(q.id)) return "head-to-head";
        if (p.PD !== q.PD) return `point difference (${sg(p.PD)} vs ${sg(q.PD)})`;
        if (p.PF !== q.PF) return `points won (${p.PF} vs ${q.PF})`;
        return null;
      };
      if (!started) r.why = "No results yet";
      else if (nx) { const w = cmpWhy(r, nx); r.why = w ? `Ahead of ${pairShort(nx.id)} on ${w}` : `Level with ${pairShort(nx.id)} — Match Control decides`; }
      else if (pv) { const w = cmpWhy(pv, r); r.why = w ? `Behind ${pairShort(pv.id)} on ${w}` : `Level with ${pairShort(pv.id)} — Match Control decides`; }
      // safe clinch/out using wins only
      const others = rows.filter((o) => o !== r);
      r.clinched = complete ? i < adv : others.filter((o) => o.W + o.rem >= r.W).length < adv;
      r.out = complete ? i >= adv : others.filter((o) => o.W > r.W + r.rem).length >= adv;
    });
    const res = { ev, g, key, label: groupLabel(ev, g), rows, complete, nFinal, total: ms.length, started, adv };
    cache.st[key] = res;
    return res;
  }
  function advancing(ev) { return { NWD: 2, NXD: 4, NMD: 4, IXD: 4, IMD: 2 }[ev]; }
  const pairShort = (id) => { const p = pairById[id]; return p ? `${p.p1.split(" ")[0]} / ${p.p2.split(" ")[0]}` : id; };

  // ---------- placements ----------
  function podium(ev) {
    const F = match(mById[`${ev}-F`]);
    const BR = mById[`${ev}-BR`] ? match(mById[`${ev}-BR`]) : null;
    let bronze = [];
    if (BR) bronze = BR.status === "final" ? [BR.winner] : [];
    else bronze = ["SF1", "SF2"].map((k) => match(mById[`${ev}-${k}`])).filter((s) => s.status === "final").map((s) => s.loser);
    return { gold: F.status === "final" ? F.winner : null, silver: F.status === "final" ? F.loser : null, bronze, final: F, bronzeMatch: BR, done: F.status === "final" && (!BR || BR.status === "final") };
  }

  // ---------- courts ----------
  function courtQueue(c) {
    const list = all().filter((s) => s.court === c).sort((x, y) => x.time.localeCompare(y.time));
    const live = list.find((x) => x.status === "live");
    const called = list.find((x) => x.status === "called");
    const pending = list.filter((x) => x.status !== "final");
    const current = live || called || pending[0] || null;
    const next = pending.find((x) => x !== current) || null;
    return { court: c, list, current, next, done: list.filter((x) => x.status === "final").length, total: list.length };
  }

  // ---------- event status ----------
  function eventStatus() {
    const A = all(), nowD = now();
    if (C.CATEGORIES.every((c) => podium(c.code).done)) return { kind: "done", title: "That's a wrap!", text: "All medal matches are final. Thank you for celebrating with Sunrise Pickleball Crew!" };
    const live = A.filter((s) => s.status === "live"), called = A.filter((s) => s.status === "called");
    if (!live.length && !called.length && !A.some((s) => s.status === "final") && nowD < toDate(E.start)) {
      return { kind: "pre", title: "Countdown to first serve", text: `Novice call time 7:15 AM · first serve 8:00 AM sharp.` };
    }
    if (live.length) return { kind: "live", title: "Live now", text: `${live.length} match${live.length > 1 ? "es" : ""} in play on court${live.length > 1 ? "s" : ""} ${live.map((s) => s.court).sort().join(", ")}.` };
    if (called.length) return { kind: "live", title: "Match call", text: `Court${called.length > 1 ? "s" : ""} ${called.map((s) => s.court).sort().join(", ")} called. Pairs have 3 minutes to report.` };
    const nx = A.filter((s) => s.status !== "final").sort((a, b) => a.time.localeCompare(b.time))[0];
    if (nx) return { kind: "next", title: "Up next", text: `${fmt(nx.time)} · ${CAT[nx.ev].short} ${nx.title} on Court ${nx.court}.` };
    return { kind: "next", title: "Stand by", text: "Waiting for final results." };
  }

  const pairMatches = (id) => all().filter((s) => s.a === id || s.b === id || (s.m.stage === "KO" && (s.projA === id || s.projB === id) && !s.a && !s.b)).sort((a, b) => a.time.localeCompare(b.time));

  // ---------- score check (Official Rules §4, §7) ----------
  function validate(m, a, b, result) {
    if (a === null || b === null) return "Enter both scores.";
    if (a < 0 || b < 0) return "Scores cannot be negative.";
    if (a === b) return "A game cannot end level.";
    const hi = Math.max(a, b), lo = Math.min(a, b);
    if (result === "forfeit") return hi === 11 && lo === 0 ? null : "Forfeit / no-show is recorded 11–0.";
    if (result === "retired") return hi === 11 ? null : "Retirement: the opponent is awarded 11 points.";
    if (m.medal) {
      if (hi < 11) return "Medal matches are played to 11.";
      if (hi - lo < 2) return "Medal matches are win by 2.";
      if (hi > 11 && hi - lo !== 2) return "Past 11, a win-by-2 game ends exactly 2 points apart.";
      return null;
    }
    if (hi !== 11) return "Time limit? Group and elimination games end at 11 (win by 1), or with the leader when 20 minutes are up.";
    return null;
  }

  return { D, C, E, CAT, pairById, mById, fmt, toDate, now, addMin, pairName, pairShort, groupsOf, groupLabel, match, all, standings, podium, courtQueue, eventStatus, pairMatches, validate, signed: sg, meta, score };
})();

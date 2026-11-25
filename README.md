# Sunrise Pickleball Crew · 1st Anniversary Tournament — Match Control site

Live courts, schedule, standings and eliminations for **Sunday, Nov 29, 2026 · 4th Shot, Porac, Pampanga**.
Same setup as the PYS Open site: a static site on GitHub Pages plus your existing Supabase project for live scores.

## Pages
| Page | URL | What it does |
|---|---|---|
| Home | `#/` | Poster-style hero, countdown/live status, sponsor carousel, call times per category, next matches |
| Live | `#/live` | All 6 courts: now playing, called, next up |
| Schedule | `#/schedule` | All 117 matches by time, filter by category/status, search by player; court-grid view |
| Standings | `#/standings` | Live tables per category and group, with tiebreak explanation |
| Eliminations | `#/brackets` | QF/SF/final/bronze per category, IMD consolation, podium |
| My Pair | `#/players` | Search a player; pair page shows call time, matches, courts, standing |
| Updates / Rules | `#/updates`, `#/rules` | Announcements and the official rules |
| TV mode | `#/tv` | Big screen: 6 courts, coming up, clock, ticker |
| Match Control | `#/control` | Score entry for officials (same logins as PYS Open) |

## Step 1 — Database (2 minutes)
Your PYS Open Supabase project is reused. Open **Supabase → SQL Editor → New query**, paste `setup.sql`, click **Run**.
It creates a separate table `sunrise_kv`; PYS data is untouched. The same official emails can write scores.

## Step 2 — Publish on GitHub Pages
1. Create a new public repository named **`sunrise-anniversary`**.
2. **Add file → Upload files** → drag in every file in this folder (they are all flat, no folders) → **Commit**.
3. **Settings → Pages** → Deploy from a branch → `main` / `(root)` → Save.
4. Live in about a minute at **https://ramslupera.github.io/sunrise-anniversary/**. Make a QR code of it for the venue.

## Sponsor logos
Upload each logo file next to `index.html`, then in `config.js` set its `file`, e.g. `{ name: "Bethany Cabin", file: "sp-bethany.png" }`.
Logos without a file show as a name chip.

## Before the event
- Practice without touching live data: add `?demo` to the URL (`…/sunrise-anniversary/?demo#/control`), then **Tools → Random**.
- On the live site, sign in at `#/control` and use **Tools → Reset everything** after any testing.
- Preview a time of day: `?demo&now=2026-11-29T11:30`.

## On match day
1. **Call a round:** 📢 *Call all matches in this round* (or *Call* per match). The 3-minute report window starts.
2. **In play:** click **Live**. **Done:** type both scores → **Save final** (or Enter). Standings and knockouts update everywhere.
   - Rule check: groups/eliminations to 11 win by 1 (or the leader at 20 minutes); medal matches win by 2. It warns but lets you save.
   - **Retired:** result type *Retired*, 11 for the opponent, the retiring pair's score at the stop. **No-show:** *Match settings → wins by forfeit* (11–0).
3. **Moves:** *Match settings* → new time/court + public note. Knockout pairs fill automatically when a group is complete; override there if Match Control decides a full tie.
4. **Tools → Download backup** every hour.

## Editing data
Pairs, times and courts are in `data.js` (generated from the Match Control sheet). Call times and event details are in `config.js`. Rules text is in `rules.js`.

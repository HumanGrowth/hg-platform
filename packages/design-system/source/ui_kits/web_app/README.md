# Web app — `ui_kits/web_app/`

A high-fidelity recreation of the **Human Growth** web app's authenticated home view. Sidebar nav, continue-state hero, "this week" rail (events + mentor sessions), recommended paths grid, badge wallet.

## Files
- `index.html` — entry, wires everything
- `Sidebar.jsx` — left rail nav with workspace switcher
- `AppHeader.jsx` — top bar (search, notif, profile)
- `ContinueHero.jsx` — the "pick up where you left off" big card
- `ThisWeek.jsx` — events + mentor sessions for the week
- `RecommendedPaths.jsx` — 3-card grid of paths
- `BadgeWallet.jsx` — earned + in-progress badges horizontal scroll
- `LessonPlayer.jsx` — modal lesson view (opens on path click)

## What it is / is not
- ✔ Visual fidelity to the tokens
- ✔ Click "Continue" or any path → opens the lesson player modal
- ✘ Not a real app — no router, no real data, no auth

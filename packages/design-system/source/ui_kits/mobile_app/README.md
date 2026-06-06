# Mobile app — `ui_kits/mobile_app/`

A 3-screen recreation of the **Human Growth** mobile app, framed inside an iOS device bezel. Side-by-side via a design canvas so reviewers can compare states.

## Screens shown
- **Home** — daily lesson card, today's events, paths in progress
- **Lesson player** — reading view, exercise prompt, swipeable progress
- **Badge wallet** — earned + locked badges, profile chip

## Files
- `index.html` — entry; renders all three screens inside iOS frames
- `Home.jsx` — home screen content
- `Lesson.jsx` — lesson screen content
- `Wallet.jsx` — badge wallet content
- `ios-frame.jsx` — iOS bezel + status bar (starter component)

## What it is / is not
- ✔ Visual fidelity to tokens + brand
- ✔ Three frozen states, side-by-side for review
- ✘ Not navigable — no tab transitions

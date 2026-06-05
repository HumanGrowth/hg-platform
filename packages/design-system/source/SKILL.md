---
name: human-growth-design
description: Use this skill to generate well-branded interfaces and assets for Human Growth, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Human Growth — design skill

This skill contains the **Human Growth** brand system: tokens, voice, iconography, and UI kit references for marketing, web app, and mobile.

## Start here
1. Read `README.md` for **content fundamentals**, **visual foundations**, **iconography**, and an index of everything in this folder.
2. Open `colors_and_type.css` — every color, type, spacing, radius, shadow, and motion token lives there as a CSS variable. Link it in any HTML artifact: `<link rel="stylesheet" href="colors_and_type.css">`.
3. Pull fonts from Google Fonts:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
   ```
4. Look at `ui_kits/marketing/`, `ui_kits/web_app/`, `ui_kits/mobile_app/` for production-equivalent React components. Each kit has a README — read it before lifting components.
5. Logos live in `assets/`. Use the cream-background or color lockup on light surfaces; the white lockup on the dark coffee ink.

## Output guidance
- **Mocks / prototypes / artifacts** → make a self-contained HTML file. Link the CSS, link the fonts, copy components out of the UI kits, and reference logos by relative path. Cream background is the default — never pure white.
- **Production code** → copy the tokens, voice rules, and UI kit components into the codebase. The kits are *cosmetic* React, not production-hardened — read the rules and re-implement against your real components.

## Rules the agent must follow
- All-caps **Anton** display, sentence-case Manrope body. Never invert.
- `cream-100` is the default canvas — never `#fff`. `warm-900` is ink — never `#000`.
- No emoji seeded in UI. No glassmorphism. No purple-blue gradients. No hand-drawn illustration.
- The faceted ring (logo motif) is reused for spinners, badges, dividers — never redrawn rounder.
- Voice is direct, dry, peer-to-peer. Never say "journey," "unlock," "rockstar," or "elevate."

## If the user invokes this skill bare
Ask what they want to build (deck, landing page, mobile mock, social tile, in-video lower third). Ask the audience and the one thing they want the asset to do. Then design accordingly, outputting either an HTML artifact (default) or production code (only if they say so).

# Human Growth — Marketing site (for Lovable / any React project)

A high-fidelity React mock of the Human Growth marketing site. This is **visual reference code**, not production — it uses Babel-in-browser, inline styles, and global `window` exports for hot reload. Use it as a spec when rebuilding in Lovable / Next.js / Vite.

## What's in here

| File | Purpose |
|---|---|
| `index.html` | Entry — pulls in fonts, the CSS, and every JSX file |
| `Nav.jsx` | Top nav with cream-glass on scroll |
| `Hero.jsx` | Display headline + dual CTA + faceted-ring bleed |
| `LogoCloud.jsx` | Companies-using-it strip |
| `Features.jsx` | 4-card grid (Paths / Mentorships / Badges / Talks) |
| `PathCard.jsx` | `PathCard` + `FeaturedPaths` grid |
| `MentorStrip.jsx` | Mentor portraits on dark coffee background |
| `Quote.jsx` | Editorial pull quote (Instrument Serif) |
| `PricingTable.jsx` | Personal / Team / Enterprise + monthly/annual toggle |
| `Footer.jsx` | Sitemap + fine print |
| `colors_and_type.css` | **The token system** — all CSS variables (color, type, spacing, radii, shadows, motion). The source of truth. |
| `assets/logo-*.svg` | The four logo lockups (color, color-on-cream, black, white) |
| `LOVABLE_BRIEF.md` | Prompt to paste into Lovable to convert this into production code |

## To open locally
Just double-click `index.html` in a browser — it works offline (Babel + React are loaded from unpkg).

## To send to Lovable
1. Drag this whole folder (or its zip) into the Lovable chat.
2. Paste the contents of `LOVABLE_BRIEF.md` after the upload.
3. Lovable will scaffold a Vite/Next project that matches this design.

## Important notes for any reimplementation
- **`colors_and_type.css` is the spec.** Either keep it and consume the variables, or port it to your framework's token system (Tailwind theme, design-tokens.json, etc).
- **Fonts** are pulled from Google Fonts — keep the `<link>` in `index.html` or import them per your framework.
- **No real router** here — the nav links are visual only. Wire them up in your real project.
- **No real auth / data** — copy is hardcoded. The strings ARE the brand voice, though; preserve them when possible.
- **Brand voice rules** are in the top-level `SKILL.md` of the design system project. Send those to Lovable too if you want it to write new copy that matches.

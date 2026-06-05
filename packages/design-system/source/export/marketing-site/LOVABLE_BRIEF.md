# Lovable handoff brief — Human Growth marketing site

Paste this into the Lovable chat after uploading the `marketing-site/` folder (or zip).

---

## Task

Convert the attached marketing site into a production-ready **Vite + React + TypeScript + Tailwind CSS** project. Match the design pixel-for-pixel.

## How to read the source

- `index.html` is the entry point. It loads Babel-in-browser to compile inline JSX. **You should remove Babel and Anton/Babel runtime in the rewrite** — set up proper Vite + React.
- Each `.jsx` file defines one section component and assigns it to `window.<Name>` at the bottom. Replace those with normal `export default`s.
- `colors_and_type.css` is the **token source of truth**. Every color, font size, spacing value, radius, shadow, and motion duration in the design is a CSS variable defined here. **Convert it to a Tailwind theme** so I can write `bg-cream-100`, `text-warm-900`, `font-display`, `rounded-lg`, etc.

## Stack to use

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** with a custom theme generated from `colors_and_type.css`
- **Google Fonts**: Anton, Manrope (400/500/600/700), Instrument Serif (italic), JetBrains Mono — loaded via `index.html` `<link>` tag, not via `@import` in CSS (better perf)
- **No UI library** (no shadcn, no MUI) — these are bespoke styled components

## Tailwind theme spec

From `colors_and_type.css`, generate this rough `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      orange: { 50: '#FFF1E8', 100: '#FFD9C2', 200: '#FFB48A', 300: '#FF8A52', 400: '#FF6A26', 500: '#FF4500', 600: '#E63E00', 700: '#B33000', 800: '#7A2100', 900: '#4A1400' },
      cream:  { 50: '#FFFCF6', 100: '#FDF5E6', 200: '#F8EDD4', 300: '#F0E0BD', 400: '#E2CDA0' },
      warm:   { 300: '#B8A799', 400: '#8A7765', 500: '#6B5949', 600: '#5C4A3F', 700: '#3D3027', 800: '#2A2018', 900: '#1A140F' },
    },
    fontFamily: {
      display: ['Anton', 'sans-serif'],
      sans:    ['Manrope', 'system-ui', 'sans-serif'],
      serif:   ['"Instrument Serif"', 'Georgia', 'serif'],
      mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
    },
    borderRadius: { sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px' },
  },
}
```

Default background should be `cream-100`, default text `warm-900`. No `#fff`, no `#000`.

## Section-by-section: component structure

Create these files in `src/components/marketing/`:

- `Nav.tsx` — fixed top nav, transparent over hero, cream-glass `backdrop-blur` on scroll
- `Hero.tsx` — full-bleed cream background, big Anton headline ("Grow on purpose."), dual CTA, faded logo bleed in the corner
- `LogoCloud.tsx` — single row of company wordmarks set in Anton, opacity 0.55
- `Features.tsx` — 2x2 grid of "Paths / Mentorships / Badges / Talks & Events"
- `PathCard.tsx` — reusable card; export both `<PathCard>` and a `<FeaturedPaths>` section
- `MentorStrip.tsx` — dark coffee section, 5-up mentor portraits (use placeholder gradient blocks with initials — real photos go in later)
- `Quote.tsx` — Instrument Serif pull quote, large
- `PricingTable.tsx` — 3 tiers, monthly/annual toggle (state in component), middle tier highlighted in `warm-900`
- `Footer.tsx` — 5-col grid with logo column

Compose them all in `src/App.tsx`. Section order matches `index.html`.

## Voice / copy rules (KEEP exactly)

The copy in the JSX is the brand voice. **Do not paraphrase** when porting — these specific phrasings ("Grow on purpose," "Reframing a stuck project," "people who hate the word *journey*") are the brand. Preserve word-for-word.

If you need new copy elsewhere:
- Sentence case for UI, ALL CAPS for display and metadata
- No emoji, no "journey," no "unlock," no "rockstar"
- "You" for the reader; "we" sparingly for the company
- Numerals not words ("12 paths," not "twelve paths")
- Time as "20 min" / "1 hr 20 min"

## Visual rules

- Cream `#FDF5E6` is the canvas — never white
- Ink `#1A140F` is the text — never black
- Orange `#FF4500` is for: primary CTAs, eyebrow accents, active states, the brand mark — **not** body links, **not** background floods
- The logo's faceted ring is a recurring motif — use it for spinners, badges, dividers
- Radii: sharp by default (`rounded-md` 8px), generous on cards (`rounded-lg` 12px), `rounded-full` only on avatars + chips
- No glassmorphism, no purple-blue gradients, no hand-drawn illustration, no auto-playing video

## After scaffolding

- Set up routing (React Router) with `/`, `/paths`, `/pricing`, `/for-teams` as stubs
- Add scroll-restoration on route change
- Set page title to "Human Growth — Grow on purpose"
- Default light theme; add a `data-theme="dark"` mode that flips canvas to `#13100D` and text to `#F5EBD6` (already defined in the CSS)

That's it. Start with the Tailwind theme + `Hero.tsx` so I can sanity-check colors before you build the rest.

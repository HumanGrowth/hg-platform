# Human Growth — Design System

> ⚠️ **Project naming note.** The project was auto-named "Ember Design System" early on (before I'd opened the logo and seen the wordmark). The brand is actually **Human Growth** — all files and tokens use that. Rename the project from the org picker when convenient.

> ⚠️ **Working assumptions.** This system was built from a logo set alone — no codebase, no Figma, no existing screens. Every UI kit screen is a *proposed direction* based on the reference vibes you cited (delphi.ai, claude.ai/design) plus the logo's color and weight. Please review the visual foundations card-by-card and tell me what to push, soften, or scrap.

---

## What is Human Growth?

Human Growth is an **educational platform for professionals inside companies** — not a traditional LMS. It treats learning as something people *do at work*, on their terms, with their peers. The product surfaces:

- **Learning paths** — curated journeys, not catalogs
- **Educational assets** — bite-sized lessons, articles, videos, playbooks
- **Badge certifications** — proof of skill, portable across roles
- **Mentorships** — 1:1 and group, matched to growth goals
- **Talks & events** — live + on-demand, with reactions/Q&A
- **Internal communities** — cohorts, study groups, alumni networks

The audience is **working adults inside companies** — IC's growing into senior roles, managers leveling up, teams onboarding a new skill. The tone is *peer-to-peer, not classroom*. Think "your most thoughtful colleague," not "your professor."

### Product surfaces this system supports

| Surface | What it is | UI kit |
|---|---|---|
| **Marketing site** | hg.com — what we are, who it's for, pricing | `ui_kits/marketing/` |
| **Web app** | The dashboard, learning paths, library, mentorship hub | `ui_kits/web_app/` |
| **Mobile app** | Daily learning, badge progress, event check-in, chat | `ui_kits/mobile_app/` |
| **In-video** | Lower thirds, end cards, chapter markers for video content | covered in `slides/` + `ui_kits/video/` |
| **Socials** | Quote cards, lesson teasers, badge announcements | covered in `slides/` |

### Sources reviewed
- `uploads/Black logo - no background.svg`
- `uploads/Color logo - no background.svg`
- `uploads/Color logo with background.svg`
- `uploads/White logo - no background.svg`
- **Reference vibes:** [delphi.ai](https://www.delphi.ai), [claude.ai/design](https://claude.ai/design)

No codebase, no Figma file, no slide deck was attached. If those exist, please import them — the UI kits will get sharper.

---

## CONTENT FUNDAMENTALS

> *Voice of a thoughtful senior peer who's been there. Confident, never preachy. Practical, never academic.*

### Voice

**We are:** direct, warm, specific, a little dry. We trust the reader is smart.
**We are not:** corporate, motivational-poster-y, jargony, breathless. No "unlock your potential." No "journey." No "rockstar."

### Person & address
- **"You"** for the reader, always. "You'll finish this in 20 min."
- **"We"** for the company, sparingly. "We made this because…"
- **No "I"** in product copy. Reserve first-person for mentor / talk authors.

### Casing
- **Wordmark + brand**: ALL CAPS — `HUMAN GROWTH`
- **Display headlines (hero, section starters)**: ALL CAPS, condensed, weight-driven. Short. 3–6 words.
- **UI titles / sentence body**: Sentence case. "Your learning paths," not "Your Learning Paths."
- **Buttons**: Sentence case. "Start lesson," "Save for later." Never SHOUTY.
- **Metadata / labels**: ALL CAPS, tracked +0.08em. "12 MIN · BEGINNER"

### Sentence shape
- Short clauses. Frequent periods. Em-dashes welcome.
- Numbers as numerals: "5 lessons," not "five lessons."
- Time as "20 min," "1 hr 10 min," never "20:00."
- Prefer active verbs: "Ship a brief," not "How to write a brief."

### Examples

| Don't | Do |
|---|---|
| Unlock your career potential | Get promoted on purpose |
| Embark on your learning journey | Pick a path. Start today. |
| Connect with world-class mentors | Talk to people who've done it |
| Earn industry-recognized credentials | Badges your manager will care about |
| Welcome back, learner! | Back. Pick up where you left off. |

### Emoji & symbols
- **No emoji in product UI.** None. Not in empty states, not in toasts.
- Emoji *allowed* in user-generated content (chat, comments, reactions) — but the system never seeds them.
- Use typographic symbols freely: **·** (middot for metadata), **→** (arrow for next/CTA), **—** (em-dash).

### Capitalization of features
- Treat product nouns like common nouns unless they're a proper feature name with a marketing identity:
  - "your dashboard" — common
  - "Paths" — feature surface, capitalized
  - "Badge" — credential, capitalized when the credential
  - "mentorship" — common, lowercase

---

## VISUAL FOUNDATIONS

### Color
- **Primary** is `#FF4500` — the Human Growth orange, pulled straight from the logo. It's loud. Use it for: the wordmark, primary CTAs, badges-when-earned, the active state of a path. **Not** for body links, **not** as a background flood behind paragraphs.
- **Base** is warm cream `#FDF5E6` (logo background). This is our *default light surface* — not white. White feels clinical against the orange; cream gives it room.
- **Ink** is a warm near-black `#1A140F` — never pure black. Black against cream feels harsh; warm ink reads like coffee on paper.
- **Neutrals** are warm browns desaturated toward gray — `#5C4A3F`, `#8A7765`, `#B8A799` etc. No cool grays anywhere.
- **Dark mode surface** is `#13100D` (deep coffee), not `#000`. Same orange. Slightly lifted ink (#F5EBD6) for body type.
- See `colors_and_type.css` for the full token list.

### Typography
- **Display:** Anton — heavy condensed grotesk, all-caps. Matches the wordmark. Use for hero headlines, section starters, big numbers, badge names. *Tight tracking (-0.01em). Tight leading (0.95).*
- **Body / UI:** Manrope — modern humanist sans. 400/500/600/700. Tracking 0 at body, +0.08em at uppercase metadata.
- **Editorial accent:** Instrument Serif — warm transitional serif, only italic-feels-best moments (course taglines, "by [mentor]", pull quotes inside articles). Used sparingly. Italic-leaning.
- **Mono:** JetBrains Mono — for code snippets, keyboard shortcuts.
- **Scale:** see `colors_and_type.css`. Display is dramatic (64 / 48 / 36 → 28 H1 / 22 H2 / 18 H3); body is calm (16 base, 14 small, 13 micro).

### Spacing & rhythm
- **4px base unit.** Tokens: `--space-1` (4) through `--space-16` (64). Most UI lives on the 8/12/16/24 grid.
- **Generous paragraph rhythm:** body `line-height: 1.55`; display `0.95`–`1.05`.
- **Component padding:** cards `24px`, buttons `12px 20px`, inputs `12px 16px`, sheet/dialog `32px`.

### Corner radii
- **Sharp by default, soft on touch.** The brand is geometric/faceted — we don't pillow everything.
  - Buttons / inputs / chips: `8px`
  - Cards / panels: `12px`
  - Sheets / modals: `16px`
  - **Avatars + badges-as-circles** are the only fully-round elements.

### Borders
- 1px, **warm ink at low alpha** (`rgba(26,20,15,0.12)`). Never pure black, never gray-blue.
- Active / focused: 2px orange, no halo glow.
- Cards: optional 1px border *or* shadow — pick one per surface, never both.

### Shadows
- **Restrained elevation, warm tint.** No purple-blue defaults from CSS frameworks.
  - `--shadow-sm`: `0 1px 2px rgba(26,20,15,0.06)`
  - `--shadow-md`: `0 6px 16px -4px rgba(26,20,15,0.08), 0 2px 4px rgba(26,20,15,0.04)`
  - `--shadow-lg`: `0 24px 48px -12px rgba(26,20,15,0.18)` (dialogs only)
- No inner shadows on inputs. Insets read as "skeuomorphic" and we are not that.

### Backgrounds
- **Cream is the default canvas.** Not white. Not gray.
- **Texture is allowed, in moderation.** A very subtle paper grain (3–5% opacity) on hero sections is on-brand. No noise on UI surfaces.
- **No gradients on big areas.** Especially: **no blue-purple gradients, no glow blurs, no glassmorphism.** A single hero may use a tight orange→amber radial as a focal accent — that's it.
- **Full-bleed photography** for talks, mentors, events — warm, slightly golden white balance, no cold cyan shadows. Slight grain (8% film grain) is on-brand.
- **Hand-drawn illustration** is *not* part of the system. We are geometric, not folksy. If we need illustration, it's vector + faceted + reuses the logo's triangle motif.

### The faceted-ring motif
The logo's triangulated ring is the brand's **one true visual element.** Reuse it for:
- Loading states (rotating ring)
- Empty states (faded ring centered)
- Badge frames (small ring around a category icon)
- Section dividers (a single row of facets as a horizontal rule)
Never redraw it with rounder triangles. Never lose its 60-segment count.

### Animation
- **Easing:** `cubic-bezier(0.32, 0.72, 0, 1)` — Apple-ish ease-out for entries; `cubic-bezier(0.4, 0, 0.2, 1)` for state changes. No bounces, no springs that overshoot dramatically (max 1 overshoot, ≤4%).
- **Durations:** 120ms (hover), 200ms (state changes), 320ms (sheets/dialogs), 600ms (page transitions max).
- **Fades + small translates only.** A new card fades in + slides up 8px. No 3D rotates, no flip-cards, no parallax on hero.
- **The ring rotates.** When loading, the faceted ring rotates 360° in 2.4s linear. That's our spinner.

### Hover / press states
- **Hover (primary button):** background darkens 6% (orange → deeper terra `#E63E00`). No shadow change. 120ms.
- **Hover (text link / nav):** underline appears at 1px, 1px below the text baseline. Color unchanged.
- **Hover (card):** shadow goes `sm → md`. No transform. No border color change.
- **Press (button):** background darkens 12%, scale 0.98, 80ms. Releases to hover state on mouseup.
- **Disabled:** opacity 0.4, no pointer events, no shadow.

### Transparency & blur
- **Used only for**: top nav glass on scroll (`backdrop-filter: blur(12px)` over cream at 80% opacity), and modal scrims (`rgba(26,20,15,0.45)` no blur).
- Not used for: card backgrounds, sheets, chips, anything else. We're not a glassmorphism brand.

### Imagery direction
- **Photography:** warm/golden, real people doing real work, mid-distance — not extreme close-ups, not stock-handshake. Slight film grain. Avoid cool/cyan tints, avoid heavy bokeh.
- **Avatars:** circle crops, warm fallback ground (`#F5EBD6`) with initials in ink, never colored-by-name.
- **Black-and-white** is allowed for mentor portraits and editorial pieces — gives them gravity. With a slight warm tint (`sepia(8%)`).

### Layout rules
- **Max content width** for marketing: 1280px. App: fluid up to 1440px with sidebars.
- **Vertical rhythm**: section padding `120px` desktop, `64px` mobile. Within a section, group → group spacing is `64px` desktop, `40px` mobile.
- **Fixed elements**: top nav only. No fixed footers, no chat bubbles in the corner, no cookie banners that bottom-stick. (Cookies bar at the top, dismissible.)
- **Grid**: 12-col desktop, 4-col mobile, 24px gutters.

### What we never do
- Blue/purple gradients
- Emoji in seeded UI
- Glassmorphism on cards
- Hand-drawn illustration
- Pure white backgrounds
- Pure black text
- Drop-shadows on type
- Auto-playing video with sound
- Microcopy that says "journey," "unlock," "rockstar," or "elevate"

---

## ICONOGRAPHY

**System:** [Lucide](https://lucide.dev) (linked from CDN — `https://unpkg.com/lucide-static@latest`). Stroke-based, 1.75px stroke weight at 20–24px size. Rounded line-caps. Outline by default; filled variants only inside the active state of nav items.

**Why Lucide:** stroke-based icons sit comfortably next to a heavy condensed wordmark — there's tonal contrast (light line + heavy type) without competing for weight. Avoid filled-bubble icon systems (Heroicons solid, Phosphor fill) — they fight the wordmark.

**Sizes:** 16px (inline), 20px (default), 24px (toolbar), 32px (empty state), 48px (feature). Stroke weight stays 1.75px across all sizes — we don't get bolder at larger sizes.

**Color:** inherit from the surrounding text by default. The primary orange `#FF4500` is reserved for icons inside active/earned states (active nav, earned badge). Otherwise icons are ink or muted ink.

**Brand icons (logos for partner companies, mentor employers, etc.):** monochrome ink-on-cream by default, never colored. The page is busy enough.

**Emoji:** never seeded in UI. See CONTENT FUNDAMENTALS.

**Unicode symbols** are encouraged for inline use: `→` `·` `—` `↗` `★` (for ratings, ink-colored). They're typographic, not iconographic.

**Logo lockups:**
- `assets/logo-color.svg` — full color, light backgrounds
- `assets/logo-color-bg.svg` — full color, brand cream background (poster lockup)
- `assets/logo-white.svg` — white, dark backgrounds
- `assets/logo-black.svg` — black, monochrome contexts
- All four contain the wordmark **HUMAN GROWTH** below the faceted ring. There is no symbol-only mark — request one if you need a favicon-scale lockup.

---

## INDEX

| File / folder | What's in it |
|---|---|
| `README.md` | You're here. Context, voice, visual foundations, iconography. |
| `colors_and_type.css` | All design tokens — CSS variables for color, type, spacing, radii, shadows. Plus semantic element styles. |
| `SKILL.md` | Skill manifest. Lets this folder be used as a Claude Skill outside the project too. |
| `fonts/` | (None bundled — Anton, Manrope, Instrument Serif, JetBrains Mono are pulled from Google Fonts.) |
| `assets/` | Logo lockups (color, color-on-cream, white, black). |
| `preview/` | Design-system swatch + spec cards rendered for the Design System tab. |
| `ui_kits/marketing/` | Marketing site — hero, features, pricing, footer. |
| `ui_kits/web_app/` | Web app — dashboard, paths, library, mentorship. |
| `ui_kits/mobile_app/` | Mobile app — home, lesson player, badge wallet. |
| `slides/` | Title, section, quote, comparison, end-card slide templates. |

---

## Caveats / open questions

- **Project title is "Ember"** in the org picker (auto-set before I saw the wordmark) — manual rename needed.
- **Fonts are Google Fonts substitutes.** If you have a specific licensed display face (Druk Wide Condensed? Roc Grotesk? Founders Grotesk Condensed?), drop it in `fonts/` and I'll swap the variables.
- **No codebase or Figma was provided** — the UI kits are *proposals* extrapolated from the brand. Hand me the real product and I'll align.
- **Mentor / event photography is placeholder.** Replace `assets/img/*-placeholder.svg` with real photography when ready.

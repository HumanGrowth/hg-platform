# Marketing site — `ui_kits/marketing/`

A single-page recreation of what the **Human Growth** marketing site could look like, built from the brand foundations. Click-thru pretend interactions on the nav, pricing toggle, and CTA forms.

## Files
- `index.html` — entry, wires everything together
- `Nav.jsx` — top nav with cream-glass scroll background
- `Hero.jsx` — display headline + dual CTA + faceted ring accent
- `LogoCloud.jsx` — companies-using-it strip (mono ink)
- `Features.jsx` — what the platform offers (paths, mentorships, badges, talks)
- `PathCard.jsx` — featured paths grid
- `MentorStrip.jsx` — mentor portraits, B&W warm-tinted
- `PricingTable.jsx` — Personal / Team / Enterprise, monthly/annual toggle
- `Quote.jsx` — pull quote (Instrument Serif)
- `Footer.jsx` — sitemap, logo, fine print

## What it is / is not
- ✔ Pixel-correct uses of the tokens in `colors_and_type.css`
- ✔ Cosmetic-only React — handlers are stubbed
- ✘ Not production code, no router, no real auth
- ✘ No real content management; copy is hardcoded specimens

## To plug in real content
Replace the strings in `Hero.jsx`, `Features.jsx`, `PathCard.jsx`. Photography goes in `../../assets/img/` and is referenced by path. All colors / type pull from `../../colors_and_type.css` via CSS variables.

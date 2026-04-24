# 42 Wonders of Our Night Sky

An immersive web companion to the *42 Wonders of Our Night Sky* astronomy series by Damon Scotting. Forty-two deep-sky wonders across fourteen episodes, each with a dedicated page covering what it is, how to find it, key facts, a three-tier telescope comparison ($500 → $1,000,000 → $1,000,000,000), and a Wonder Rating.

## Run locally

No build step — it's vanilla HTML, CSS and JS.

```bash
# from this directory
python -m http.server 5744
```

Then open <http://localhost:5744/>.

## Structure

```
index.html              Master page — 14-episode grid
wonders/<slug>/         One folder per wonder; thin HTML shell hydrated from JSON
_wonder-template.html   Master wonder template (duplicate + sed the slug)
data/wonders.json       Single source of truth for every wonder's content
scripts/
  master.js             Home page grid + hero
  wonder.js             Wonder page interactions (hero play, scroll, dials)
  wonder-render.js      Hydrates a wonder page from wonders.json
  stardust-cursor.js    Cursor flourish
styles/
  base.css              Shared typography, colors, starfield
  master.css            Home page
  wonder.css            Wonder page
assets/
  posters/              Hero stills (1 per wonder)
  telescopes/           Three-tier comparison stills (500 / 1M / 1B)
  clips/                Inline scroll-clips (a/b/c per wonder)
  howspot/              "How to find it" tutorial clips
  wall/                 Wonderwall placement clips
  book/                 Sky-map reference stills
  hero/                 Home page hero video
  graphics/             Hyperframes-rendered stat cards
```

## Content model

Every wonder is a single entry in `data/wonders.json` with: `slug`, `episode`, `hero`, `metaStrip`, `prose`, `clips`, `features` (quotes), `ratings` (beauty / power / mystery / wonder + breakdown), `telescopes` (three tiers), optional `featureGraphic`, and footer navigation.

Adding a new wonder is three steps:

1. Add a JSON entry.
2. Duplicate `_wonder-template.html` into `wonders/<slug>/index.html` and sed-replace `SLUG_HERE`.
3. Drop the posters, tier stills, clips, and sky map into the matching `assets/` folders.

## Credits

- Series, writing, cinematography, voiceover — Damon Scotting.
- Telescope imagery — Damon Scotting ($500 tier), Telescope Live ($1M tier), public science-archive images ($1B tier).

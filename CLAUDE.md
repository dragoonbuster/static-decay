# IRON PERIMETER (DroneDefender)

Counter-UAS tower-defense game. The entire game is one self-contained file,
`iron-perimeter-v8.html` (no build step, no assets, no dependencies beyond
Google Fonts, which degrade gracefully). `DEPLOY.md` documents hosting and
the leaderboard backends.

## Project Rules

- Set up a new git project on new project instantiation.
- Commit frequently and after every meaningful change.
- NEVER use emojis, emoticons, or symbols that are not standard punctuation, numerals, or letters that can be typed normally.
- Keep track of plans as we develop them. Always understand the project intent and the specific change/feature intent before fixing, modifying, or adding any code.
- Use best practices. Minimize the use of odd, uncommon, or fragile dependencies.
- Maintain a reasonable number of code files. Split up and refactor things as needed to help with code readability, maintainability, and context window management.
- Always ultrathink and plan changes before executing them.

Note on the emoji rule: the shipped game UI already contains a few unicode
glyphs (power bolt, checkpoint chip, pause bars, etc.). Those are existing
gameplay UI and stay as-is; the rule applies to everything we write from now
on (code, comments, commits, docs, chat).

## Architecture map (iron-perimeter-v8.html)

- CSS + markup: top status rail, canvas stage with three overlays
  (menu / pause / end-of-run), intel strip, shop rack + detail panel.
- `NET` config at the top of the script: paste a Firebase RTDB URL here to
  enable the site-wide leaderboard (see DEPLOY.md).
- Catalogs: `ETYPES` (hostile drones), `TT` + `TKEYS` (defense systems),
  `DIFFS` (difficulty tiers, including the adaptive-enemy parameters).
- Simulation: `updEnemies` / `updTowers` / `updProjs` / `updBirds` /
  `updWaves`, fixed-substep loop in `frame()`.
- Sensor fusion rule: weapons only engage enemies with `revealT > 0`
  (confirmed track from FOB sensors, radar, or optic).
- Waves: scripted `WAVES[0..14]`, then `genEndless()`; adaptive routing via
  `axisKills` / `axisLeaks` / `intelBoost`.
- Checkpoint codec: `encodeSave` / `decodeSave` pack the full run into a
  base-62 "IP6..." string with a 2-char checksum. If you add fields, mind
  the bit widths and the validation in `decodeSave`.
- Leaderboard: `LB` adapter auto-detects Firebase / Claude artifact
  storage / localStorage / in-memory. Top 5 per difficulty, keyed by X-RATE
  (`destroyed / spent`), wave 5 minimum to qualify.

## Constraints

- Keep the game a single self-contained HTML file; anything static can host
  it. Do not introduce a build step or runtime dependencies.
- Do not change gameplay balance or mechanics unless that is the explicit
  intent of the change.

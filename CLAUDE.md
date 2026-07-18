# STATIC DECAY (DroneDefender)

Formerly IRON PERIMETER; renamed 2026-07-18. The checkpoint-code prefix
switched from "IP6" to "SD1" at the same time (pre-deployment, so no
codes were in the wild). Old IP6 codes no longer load.

Counter-UAS tower-defense game. The entire game is one self-contained file,
`index.html` (no build step, no assets, no dependencies beyond Google Fonts,
which degrade gracefully). `DEPLOY.md` documents hosting and the leaderboard
backends. `PLANS.md` tracks the development roadmap and open tuning
questions — keep it current as plans evolve.

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

## Architecture map (index.html)

- CSS + markup: top status rail, canvas stage with overlays (menu with
  SKIRMISH/RAID tabs, pause, end-of-run), intel strip, shop rack + detail
  panel (the detail panel doubles as the raid manifest in raid mode).
- `NET` config at the top of the script: paste a Firebase RTDB URL here to
  enable the site-wide leaderboard (see DEPLOY.md).
- Catalogs: `ETYPES` (hostile drones), `TT` + `TKEYS` (defense systems),
  `DIFFS` (difficulty tiers: adaptive-enemy params, `fieldPwr`, `env`),
  raid side: `RKEYS` / `PCOST` / `PRESET_GRIDS` / `genGrid()`.
- Simulation: `updEnemies` / `updTowers` / `updProjs` / `updBirds` /
  `updWaves`, driven by `stepSim()` on a FIXED timestep (`SIM_DT` = 1/60)
  from an accumulator in `frame()`.
- DETERMINISM RULE: anything that affects sim outcome must roll on the
  seeded stream (`simRand` / `sr` / `sri`); `Math.random` / `rand` / `ri`
  are cosmetics-only. Violating this silently breaks replay and future
  PvP verification. `startWave` records a wave record (checkpoint code,
  seed, post-adaptation groups, env, input log) used by `beginReplay`.
- Player actions are DOM-free cores (`placeTower`, `sellTower`,
  `upgradeTower`, `cycleModeT`, `setPrioT`, `toggleEmconT`) shared by UI
  handlers and the replay applier; they self-record via `recAction`.
- Sensor fusion rule: weapons only engage enemies with `revealT > 0`
  (confirmed track from FOB sensors, radar, or optic).
- Environment: `env` multipliers (sense/optic/laser) from day-night cycle
  (mission clock, 65 min per wave from D+3 04:20) + weather; gated by
  `DIFFS[..].env` (EASY exempt); radar deliberately immune. Values and
  rationale in PLANS.md.
- Waves: scripted `WAVES[0..14]`, then `genEndless()`; adaptive routing via
  `axisKills` / `axisLeaks` / `intelBoost` (these decay; the after-action
  map uses separate non-decaying `killPts` / `leakDmgAxis` etc).
- Game modes: `gameMode` 'skirmish' | 'raid'; states add `rdesign`
  (raid designer) and `rover` (raid end) beside menu/build/combat/over/won.
  Raid flow: `enterRaidDesign` -> `launchRaid` -> `beginRaidCombat` ->
  `raidOver`; deterministic per `raid.seed` (REWATCH re-runs it).
- Checkpoint codec: `encodeSave` / `decodeSave` pack the full run into a
  base-62 "SD1..." string with a 2-char checksum. If you add fields, mind
  the bit widths and the validation in `decodeSave`. Raid mode reuses the
  codec: any pasted code becomes an attackable grid.
- Leaderboard: `LB` adapter auto-detects Firebase / Claude artifact
  storage / localStorage / in-memory. Top 5 per difficulty, keyed by X-RATE
  (`destroyed / spent`), wave 5 minimum. Skirmish only; raids post nothing.

## Testing

- `node test/run.js` — headless suite (DOM stubs + the real game script):
  codec round-trips, grid validity, live waves, replay restoration, raid
  determinism. Run it after every change to the sim; extend it with the
  feature you add.

## Constraints

- Keep the game a single self-contained HTML file; anything static can host
  it. Do not introduce a build step or runtime dependencies. (The test
  harness is dev-only tooling and does not ship.)
- Do not change gameplay balance or mechanics unless that is the explicit
  intent of the change.

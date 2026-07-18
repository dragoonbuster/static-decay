# SIGNAL DECAY — Development Plans

Living document. Update as plans evolve (project rule: keep track of plans).

## Roadmap (agreed 2026-07-17)

1. DONE — Housekeeping: rename to index.html, docs, SKIRMISH/RAID split.
2. DONE (awaiting playtest) — Immersion + determinism layer (v0.9):
   - Fixed-timestep simulation + seeded sim RNG (foundation for replays and
     later async PvP).
   - Radio log with tower callsigns + mission clock.
   - Environment: day/night cycle + weather (STANDARD and above).
   - After-action engagement map on the end screen.
   - Instant replay of the last wave from the end screen.
3. DONE (awaiting playtest) — RAID mode v1: design a drone raid under
   budget and fly it against AI defense grids (presets, procedural, or any
   pasted SD1 checkpoint code). Offense X-RATE scoring, REWATCH,
   RE-DESIGN. Headless suite: node test/run.js (45 checks).
4. LATER — Campaign/theater layer: 3-5 FOBs on a front, system inventory,
   logistics/convoys, doctrine auto-resolve, enemy procurement adaptation
   (composition adapts to SYS_STATS kills, not just routing).
5. LATER — Ghost-grid attacks via leaderboard-posted checkpoints, then
   async PvP raid rooms over the same Firebase RTDB (DEPLOY.md section 5).
6. MAYBE — Drone-war RTS as its own project, only after 4-5 prove out.

## Design decisions (phase 2-3)

- Sim determinism: fixed step SIM_DT = 1/60; all simulation-affecting
  randomness goes through the seeded stream (sr / sri / simRand), cosmetic
  effects keep Math.random. Wave record = checkpoint code + seed +
  post-adaptation groups + env + input log; replay re-simulates.
- elapsed stays real-time (not speed-scaled), display-only, as before.
- Environment gates by difficulty flag (env: true on STANDARD+; EASY is
  always clear daylight, consistent with how fieldPwr gates on VETERAN+).
  Radar is deliberately unaffected by weather - that is its niche.
  - NIGHT: FOB organic sense x0.8, EO/IR coverage x0.85.
  - RAIN:  sense x0.9, EO/IR x0.8, laser DPS x0.75.
  - FOG:   sense x0.7, EO/IR x0.55, laser DPS x0.85.
  - Night and weather stack multiplicatively; floors: sense 0.55,
    optic 0.45, laser 0.6.
  - Day cycle: mission clock starts D+3 04:20, advances 65 min per wave;
    night = clock hour < 05:30 or >= 19:30. Waves 1-2 are night, wave 15
    hits dusk. Weather odds per wave: CLEAR 60%, RAIN 25%, FOG 15%.
- Skirmish balance is otherwise untouched. NOTE: environment on STANDARD+
  is a real (requested) balance change - existing leaderboard scores
  predate it. Version bumped to v0.9.
- Raid mode economy:
  - Procurement costs = the genEndless budget table (hornet 5, viper 8,
    geran 12, decoy 2, wasp 14, ghost 18, specter 24, static 26, mule 25,
    hive 50) + kraken 250. Sparrow excluded (recon has no role until
    fog-of-war raids).
  - Attacker budget = 250 + 1.1 x grid invested value (rounded to 10).
  - Defender wallet (SAM ammo money) = 150 + 0.2 x grid value; defender
    also earns bounties on kills mid-raid - draining their wallet with
    decoys before sending heavies is intended tactics.
  - Offense score: value inflicted = FOB damage x $5 (repair price/hp)
    + invested value of destroyed generators + $300 breach bonus if the
    FOB falls. RAID X-RATE = value inflicted / raid cost. Same letter
    grades as defense.
  - Attacker picks environment freely in the designer (vs AI; revisit for
    PvP). No leaderboard for raid v1.

## Open tuning questions

- Raid budget multiplier (1.1x) and defender wallet - first-pass numbers,
  tune after playtests. Harness data point: vs GUN LINE ($790 grid,
  $1120 budget), a piecemeal $248 raid scored zero while a time-on-target
  $298 package (mules leading, escorts and specter dives synced, hornet
  saturation last) destroyed the FOB losing 12/20 airframes - raid rate
  2.68, grade S. Timing dominates; budgets may even be generous.
- Whether raids should cost extra for night/weather selection.
- Radio log density (throttle currently ~2.5s between routine kill calls).
- Env modifier magnitudes above.
- Day-phase display nuance: the mission clock also advances with real
  elapsed time, so the displayed phase can drift slightly from the
  wave-locked conditions; conditions are frozen per wave as announced.

## Test checklist (manual, after phase 2-3)

- Skirmish EASY: no environment effects ever; plays exactly like v0.8.
- Skirmish STANDARD: night waves 1-2, weather announcements in intel strip,
  optic/laser/organic-sense rings shrink appropriately.
- Checkpoint codes: save/load round-trip on all four difficulties
  (NIGHTMARE was broken pre-v0.9, now fixed).
- Replay: finish a run, WATCH LAST WAVE, confirm it ends identically;
  exit replay early, confirm end screen restores.
- Raid: beat GUN LINE preset with mixed raid; wasps kill radar; decoys
  drain SAM wallet; paste own skirmish checkpoint and raid it.
- Raid designer: MENU button and pause menu both exit without launching.
- Settings (pause menu): UI scale, HUD text, volume, radio density,
  screen shake, scanlines - all persist across reloads (localStorage).
- Leaderboard still posts from skirmish only.

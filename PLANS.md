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
4. PARTIAL (2026-07-19) — Terrain, Theater and Convoy shipped as v1:
   - TERRAIN: ridge capsules block sensor LOS to low-altitude drones
     (radar shadows = attack corridors; hi-alt seen over ridges; no
     placement on ridges; weapons unaffected - only sensing). Four AOs
     (OPEN / RIDGE LINE / THE PASS / BADLANDS) + RANDOM on the DEFEND
     tab; terrain id appended to SD1 codes (old codes read OPEN).
   - THEATER (unlocked by winning any skirmish; sd_prog localStorage):
     three FOBs (NORTH=The Pass, CENTER=Open, SOUTH=Ridge Line), one
     $420 wallet, intel odds per rotation with a hidden weighted target,
     rotations use WAVES[2,4,5,6,8,9,11,12,14] with their own hp/spd
     ramp, transfers cost 15% (min $10) and arrive as crates (C key),
     rotation-clear bonus 60 + 15xrotation. Any FOB falls = loss; hold
     9 rotations = win. No save codes/replay (one sitting).
   - CONVOY: train base at (720,360), six flatcar hardpoints, spawning
     from all four edges starting at 12s; tier = elapsed/45s drives
     rate (1.7 x 0.93^tier, floor 0.4s), roster unlocks, and hp ramp
     (+8%/tier); kraken every 180s after 240s; $3/s supply trickle;
     repairs and MOVE allowed mid-run; score = km at 32 m/s.
   Deferred to later phases: system inventory/logistics depth, doctrine
   auto-resolve, enemy procurement adaptation.
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
- Tower MOVE (2026-07-18): redeploy for 10% of invested value (min $5,
  rounds to $5), build phase only, same placement/coverage rules as
  building. Cheaper than the 30% sell haircut; costs count into spent
  like ammo/repairs, not into invested.
- Skirmish balance is otherwise untouched. NOTE: environment on STANDARD+
  is a real (requested) balance change - existing leaderboard scores
  predate it. Version bumped to v0.9.
- Raid mode = OPERATIONS (redesigned 2026-07-19 after "hundred vipers"
  feedback; single unlimited strikes were degenerate):
  - 5 strikes per operation (buy up to 2 more at $150 each). Breach the
    FOB in any strike = victory; otherwise graded on operation X-RATE
    (total inflicted / total spent, upgrades and unlocks included).
  - Sortie cap: 16 airframes per strike; +8 per LAUNCH RAILS purchase
    (cost 80 x 1.5^n rounded to 10). This is the mass limiter.
    (v1 was 12/+6 at 100x1.6^n - playtest said too tight.)
  - Attacker wallet: starts 250 + 0.5 x grid value (round 10), carries
    across strikes; income after each strike = $150 + 75% of value
    inflicted that strike. Drones are paid for at launch - losses real.
    (v1: 200 + 0.35x start, $120 + 60% income - too thin.)
  - Drone unlocks (persist per operation): start hornet/geran/decoy;
    viper 50, wasp 70, mule 80, ghost 90, specter 100, haze 110,
    hive 130, kraken 350. Locked cards show the price; click to buy.
  - Defender: wallet persists (bounties stay banked), +$60 stipend per
    interphase; spends up to 50% of spendable on repairs at $5/hp, then
    up to 2 reinforcement actions (40% upgrade an existing system, else
    place a new one via weighted table + power checks), always keeping a
    $150 ammo reserve. FOB integrity persists across strikes.
    (v1: $100 stipend / 60% repairs / 3 actions - compounded too fast.)
  - Value inflicted per strike = integrity damage x $5 + destroyed
    generators + $300 breach bonus. Same letter grades as defense.
  - Procurement costs = the genEndless table + kraken 250; sparrow still
    excluded (no recon role until fog-of-war raids).
  - Mid-strike pause offers FAST-RESOLVE (skip ahead), never a redo.
  - Manifests (SDR codes) carry over between strikes and re-trim to the
    new budget/cap/locks. No leaderboard for raids yet.

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

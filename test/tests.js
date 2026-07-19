
/* ---- tests ---- */
let __fails = 0, __passes = 0;
function T(cond, msg) { if (cond) { __passes++; console.log('ok  ' + msg); } else { __fails++; console.log('FAIL ' + msg); } }
function ff(maxSteps) { let g = maxSteps || 200000; while (state === 'combat' && g-- > 0) stepSim(); }

T(state === 'menu', 'boots to menu');
T(Array.isArray(PRESET_GRIDS) && PRESET_GRIDS.length === 4, 'presets present');

function gridValid(spec, label) {
  let okAll = true;
  const pts = [];
  for (const t of spec.towers) {
    const nearBase = Math.hypot(t.x - BASE.x, t.y - BASE.y) < 92;
    const inb = t.x >= 24 && t.x <= W - 24 && t.y >= 24 && t.y <= H - 24;
    const clash = pts.some(p => Math.hypot(p[0] - t.x, p[1] - t.y) < 34);
    if (nearBase || !inb || clash) {
      okAll = false;
      console.log('   bad placement ' + t.k + '@' + t.x + ',' + t.y + ' in ' + label + (nearBase ? ' (base)' : '') + (clash ? ' (overlap)' : '') + (!inb ? ' (bounds)' : ''));
    }
    pts.push([t.x, t.y]);
  }
  T(okAll, label + ' placement valid');
}
PRESET_GRIDS.forEach(p => gridValid(p, 'preset ' + p.name));
[700, 1200, 1800].forEach(b => { for (let i = 0; i < 3; i++) gridValid(genGrid(b), 'genGrid(' + b + ') #' + i); });

for (const dk of DKEYS) {
  diffKey = dk; restartGame();
  placeTower('vulcan', 900, 300); placeTower('radar', 800, 400);
  const code = encodeSave();
  let s = null, err = '';
  try { s = decodeSave(code); } catch (e) { err = e.message; }
  T(!!s && s.towers.length === 2 && DKEYS[s.diffIdx] === dk, 'codec round-trip ' + dk + (err ? ' (' + err + ')' : ''));
}

diffKey = 'ez'; restartGame();
T(env.sense === 1 && env.optic === 1 && env.laser === 1 && nextEnv.wx === 'CLEAR' && !nextEnv.night, 'EASY always clear daylight');
diffKey = 'std'; restartGame();
T(nextEnv.night === true, 'STANDARD wave 1 is night (04:20 local)');

diffKey = 'std'; restartGame();
placeTower('vulcan', 1000, 300); placeTower('vulcan', 1000, 420); placeTower('radar', 950, 360);
T(cash === 260 - 60 - 60 - 80, 'build spend accounting (cash=' + cash + ')');
startWave();
T(state === 'combat' && wave === 1, 'wave 1 launches');
ff();
T(state === 'build', 'wave 1 cleared, back to build (state=' + state + ')');
T(baseHP > 0, 'FOB survived wave 1 (hp=' + baseHP + ')');
T(kills > 0, 'kills recorded (' + kills + ')');
T(killPts.length > 0, 'AAR kill points recorded (' + killPts.length + ')');
startWave(); ff();
T(state === 'build' || state === 'over', 'wave 2 resolves (state=' + state + ')');

if (state === 'build') {
  const pre = JSON.stringify({ c: cash, h: baseHP, k: kills, w: wave, t: towers.length, s: spent, d: destroyed });
  beginReplay();
  T(state === 'combat' && replaying, 'replay starts');
  let g = 300000;
  while (replaying && g-- > 0) {
    if (waveRec) { while (replayIdx < waveRec.actions.length && waveRec.actions[replayIdx].s <= simStep) applyAction(waveRec.actions[replayIdx++]); }
    stepSim();
  }
  T(!replaying, 'replay finishes');
  const post = JSON.stringify({ c: cash, h: baseHP, k: kills, w: wave, t: towers.length, s: spent, d: destroyed });
  T(pre === post, 'replay restores run state exactly');
  if (pre !== post) console.log('   pre  ' + pre + '\n   post ' + post);
}

raidSel.g = 'p1';
enterRaidDesign(raidTargetSpec());
T(state === 'rdesign' && gameMode === 'raid', 'raid designer opens');
T(raid.budget > 0 && towers.length === PRESET_GRIDS[1].towers.length, 'firebase target built (budget $' + raid.budget + ')');
raid.groups.push(
  { type: 'decoy', count: 8, edge: 'left', delay: 0, interval: 0.35 },
  { type: 'wasp', count: 3, edge: 'top', delay: 2, interval: 1.1 },
  { type: 'mule', count: 2, edge: 'left', delay: 5, interval: 1.1 },
  { type: 'hornet', count: 8, edge: 'bottom', delay: 8, interval: 0.35 });
T(raidCost() === 8 * 2 + 3 * 14 + 2 * 25 + 8 * 5, 'raid cost math ($' + raidCost() + ')');
launchRaid();
T(state === 'combat', 'raid launches');
ff(400000);
T(state === 'rover', 'raid resolves (state=' + state + ')');
const r1 = JSON.stringify({ k: kills, h: Math.round(baseHP), c: Math.round(cash), g: raid.genValue });
rewatchRaid();
T(state === 'combat' && replaying === true, 'rewatch starts');
ff(400000);
T(state === 'rover', 'rewatch resolves');
const r2 = JSON.stringify({ k: kills, h: Math.round(baseHP), c: Math.round(cash), g: raid.genValue });
T(r1 === r2, 'raid deterministic: rewatch reproduces outcome ' + r1);
if (r1 !== r2) console.log('   r1 ' + r1 + '\n   r2 ' + r2);

restartGame();
T(gameMode === 'skirmish' && state === 'build' && cash === 260, 'restart restores skirmish');

/* mid-combat action recording + replay */
diffKey = 'ez'; restartGame();
placeTower('vulcan', 1000, 300); placeTower('radar', 950, 360);
startWave();
for (let i = 0; i < 200; i++) stepSim();
placeTower('vulcan', 1000, 420);
T(waveRec.actions.length === 1 && waveRec.actions[0].a === 'place' && waveRec.actions[0].s === 200, 'mid-combat action recorded at step 200');
ff();
T(state === 'build', 'action-wave cleared');
{
  const pre = JSON.stringify({ c: cash, h: baseHP, k: kills, t: towers.length });
  beginReplay();
  let g = 300000;
  while (replaying && g-- > 0) {
    if (waveRec) { while (replayIdx < waveRec.actions.length && waveRec.actions[replayIdx].s <= simStep) applyAction(waveRec.actions[replayIdx++]); }
    stepSim();
  }
  const post = JSON.stringify({ c: cash, h: baseHP, k: kills, t: towers.length });
  T(pre === post, 'replay with recorded mid-combat action restores exactly');
  if (pre !== post) console.log('   pre  ' + pre + '\n   post ' + post);
}

/* heavy fixed-seed raid vs GUN LINE — expect real damage */
raidSel.g = 'p0';
enterRaidDesign(raidTargetSpec());
// synchronized time-on-target: slow mules first, escorts and divers timed to mass at the wire
raid.groups.push(
  { type: 'mule', count: 4, edge: 'left', delay: 0, interval: 1.1 },
  { type: 'haze', count: 2, edge: 'left', delay: 9, interval: 1.1 },
  { type: 'specter', count: 4, edge: 'top', delay: 20, interval: 1.1 },
  { type: 'hornet', count: 10, edge: 'left', delay: 24, interval: 0.35 });
raid.cost = raidCost();
raid.total = raid.groups.reduce((a, g) => a + g.count, 0);
raid.seed = 123456789;
beginRaidCombat();
ff(400000);
T(state === 'rover', 'heavy raid resolves');
console.log('   heavy raid vs GUN LINE: hp ' + Math.round(baseHP) + '/' + baseMax + ', attacker lost ' + kills + '/' + raid.total + ', cost $' + raid.cost);
T(baseHP < baseMax, 'heavy raid inflicts damage');
restartGame();

/* security hardening */
{
  const s = sanitizeEntry({ n: '<img src=x onerror=alert(1)>', x: '2.5', w: '7.9', k: 1e9, t: 'x' });
  T(s.n === 'IMGS' && !/[<>&"'\/]/.test(s.n), 'leaderboard callsign sanitized (' + s.n + ')');
  T(s.x === 2.5 && s.w === 8 && s.k === 99999 && s.t === 0, 'leaderboard fields coerced and clamped');
}
{
  diffKey = 'std'; restartGame();
  towers.push(makeTower('vulcan', 2000, 300)); // bypasses placement validation on purpose
  const bad = encodeSave();
  let threw = false;
  try { decodeSave(bad); } catch (e) { threw = true; }
  T(threw, 'decodeSave rejects off-map towers from crafted codes');
  restartGame();
}
T(feedbackAvailable() === true, 'feedback available with the firebase backend configured');

/* tower move */
diffKey = 'ez'; restartGame();
placeTower('vulcan', 900, 300);
{
  const t0 = towers[0], preCash = cash, mc = moveCost(t0);
  T(mc === 5, 'move cost ~10% of value, min $5 (got $' + mc + ')');
  moveTower(t0, 700, 400);
  T(t0.x === 700 && t0.y === 400 && cash === preCash - mc && towers.length === 1, 'moveTower relocates and charges $' + mc);
  placeTower('radar', 760, 400);
  T(validPlace(705, 400, t0) === true, 'validPlace ignores the mover itself');
  T(validPlace(755, 400, t0) === false, 'validPlace still blocks other towers');
}
restartGame();

/* grid lock */
{
  settings.snap = false;
  const a = snapXY(413, 287);
  T(a.x === 413 && a.y === 287, 'snap off: coordinates pass through');
  settings.snap = true;
  const b = snapXY(413, 287);
  T(b.x === 400 && b.y === 280, 'snap on: rounds to the 40px map grid');
  const c = snapXY(5, 715);
  T(c.x === 40 && c.y === 680, 'snap clamps to buildable grid intersections');
  settings.snap = false;
}

/* tutorial + codex */
T(TUT.length >= 20 && TUT.every(s => (typeof s.done === 'function') !== !!s.next), 'every skirmish tutorial step has exactly one advance mechanism');
T(TUTR.length >= 8 && TUTR.every(s => (typeof s.done === 'function') !== !!s.next), 'every raid tutorial step has exactly one advance mechanism');
T(document.getElementById('cdxSys').innerHTML.includes('VULCAN') && document.getElementById('cdxSys').innerHTML.includes('GENERATOR'), 'codex systems built from catalog');
T(document.getElementById('cdxUas').innerHTML.includes('KRAKEN') && document.getElementById('cdxUas').innerHTML.includes('HAZE'), 'codex drones built from catalog');
startTutorial();
T(tut && tut.i === 0 && tut.s === TUT && state === 'build' && diffKey === 'ez' && gameMode === 'skirmish', 'tutorial starts a fresh EASY build');
tutAdvance(); tutAdvance(); tutAdvance(); tutAdvance(); // past the four intro NEXT steps
placeTower('vulcan', 990, 310); tutUpdate();
T(tut.i === 5, 'advances on first vulcan');
placeTower('vulcan', 990, 420); tutUpdate();
T(tut.i === 6, 'advances on second vulcan');
placeTower('radar', 950, 360); tutUpdate();
T(tut.i === 7, 'advances on radar');
startWave(); tutUpdate();
T(tut.i === 8, 'advances on wave launch');
ff(); tutUpdate();
T(state === 'build' && tut.i === 9, 'advances on wave clear');
endTutorial(false);
T(tut === null, 'tutorial skippable');
restartGame();

/* raid tutorial */
startRaidTutorial();
T(tut && tut.s === TUTR && state === 'rdesign' && gameMode === 'raid', 'raid tutorial opens the designer on GUN LINE');
tutAdvance(); tutAdvance(); // past the two intro NEXT steps
addRaidGroup('hornet'); tutUpdate();
T(tut.i === 3, 'raid tut advances on hornets');
addRaidGroup('mule'); tutUpdate();
T(tut.i === 4, 'raid tut advances on mules');
tutAdvance(); // axis/timing NEXT
addRaidGroup('wasp'); tutUpdate();
T(tut.i === 6, 'raid tut advances on wasps');
launchRaid(); tutUpdate();
T(tut.i === 7, 'raid tut advances on launch');
ff(400000); tutUpdate();
T(state === 'rover' && tut === null, 'raid tut completes at assessment');
restartGame();

/* auto-launch */
diffKey = 'ez'; restartGame();
placeTower('vulcan', 1000, 300); placeTower('vulcan', 1000, 420); placeTower('radar', 950, 360);
settings.auto = 'instant';
startWave(); ff();
T(state === 'build' && autoAt > 0, 'auto-launch armed after wave clear');
time = autoAt + 0.01;
refreshTop();
T(state === 'combat' && wave === 2, 'auto-launch fires the next wave');
settings.auto = 'off'; autoAt = 0;
ff(); restartGame();

/* oracle override */
diffKey = 'ez'; restartGame();
placeTower('optic', 700, 300); placeTower('vulcan', 700, 360);
towers[0].prio = 'wasp'; towers[0].override = true;
stepSim();
T(towers[1].prioForced === 'wasp', 'oracle override forces linked weapon priority');
towers[0].override = false;
stepSim();
T(towers[1].prioForced === null, 'override toggles off');
{
  towers[0].override = true;
  const cOn = encodeSave();
  towers[0].override = false;
  const cOff = encodeSave();
  applySave(decodeSave(cOn));
  T(towers[0].k === 'optic' && towers[0].override === true, 'override=on survives the codec');
  applySave(decodeSave(cOff));
  T(towers[0].override === false, 'override=off survives the codec');
}
setModeT(towers[1], 'weak');
T(towers[1].mode === 'weak', 'setModeT applies a direct mode (bulk orders)');
restartGame();

/* presence net */
{
  const cid = clientId();
  T(typeof cid === 'string' && /^[a-f0-9]{16}$/.test(cid), 'client id well-formed (' + cid + ')');
  T(presenceActive() === true, 'presence active during play');
  const _s = state; state = 'menu';
  T(presenceActive() === false, 'presence inactive on the menu');
  state = _s;
}

console.log('');
console.log(__passes + ' passed, ' + __fails + ' failed');
process.exit(__fails ? 1 : 0);

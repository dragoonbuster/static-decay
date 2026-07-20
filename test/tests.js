
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
T(raid.budget > 0 && raid.op.cap === 16 && raid.op.strike === 1 && towers.length === PRESET_GRIDS[1].towers.length, 'operation opens on firebase (budget $' + raid.budget + ')');
raid.op.cap = 30; // determinism test flies a big mixed package
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
addRaidGroup('mule'); tutUpdate(); // locked: routes to tryUnlock
T(tut.i === 4 && raid.op.unlocked.mule === 1, 'raid tut advances on mule unlock');
addRaidGroup('mule'); tutUpdate();
T(tut.i === 5, 'raid tut advances on mule group');
tutAdvance(); // axis/timing NEXT
launchRaid(); tutUpdate();
T(tut.i === 7, 'raid tut advances on launch');
ff(400000); tutUpdate();
T(state === 'rover' && tut === null, 'raid tut completes at the interphase');
restartGame();

/* operation economy */
raidSel.g = 'p0';
enterRaidDesign(raidTargetSpec());
T(raid.op.strike === 1 && raid.op.cap === 16 && !raid.op.unlocked.viper && raid.op.unlocked.hornet === 1, 'operation starts lean: 16-cap, locked roster');
{
  const b0 = raid.budget;
  tryUnlock('viper');
  T(raid.op.unlocked.viper === 1 && raid.budget === b0 - 50, 'unlock spends budget');
  const c1 = railCost(), b1 = raid.budget;
  opBuy('rails');
  T(raid.op.cap === 24 && raid.budget === b1 - c1, 'launch rails raise the cap');
  raid.op.cap = 12; // back to baseline for the cap test
  addRaidGroup('hornet'); addRaidGroup('hornet');
  T(raidTotal() === 12 && raid.groups.length === 2, 'two hornet groups fill the cap');
  addRaidGroup('hornet');
  T(raidTotal() === 12 && raid.groups.length === 2, 'cap rejects a third group');
  const bLaunch = raid.budget;
  launchRaid();
  T(state === 'combat' && raid.budget === bLaunch - raid.cost, 'launch deducts the package cost');
  ff(400000);
  T(state === 'rover' && raid.op.strike === 1 && !raid.op.over, 'strike 1 resolves, operation continues');
  const v0 = raid.value;
  nextStrike();
  T(state === 'rdesign' && raid.op.strike === 2, 'interphase advances to strike 2');
  T(raid.value > v0, 'defender reinforced between strikes ($' + v0 + ' -> $' + raid.value + ')');
}
restartGame();

/* draggable manifest positioning */
enterRaidDesign(PRESET_GRIDS[0]);
T(maniPos && maniPos.x > 4 && maniPos.y > 4, 'manifest starts centered on a fresh target');
maniPos.x = -500; maniPos.y = 99999;
positionManifest();
T(maniPos.x >= 4 && maniPos.y >= 4 && maniPos.x <= 1280 && maniPos.y <= 720, 'manifest clamped to the stage');
restartGame();

/* strike-manifest codec */
raidSel.g = 'p1';
enterRaidDesign(raidTargetSpec());
raid.night = true; raid.wx = 'FOG';
raid.groups.push(
  { type: 'hornet', count: 12, edge: 'left', delay: 0, interval: 0.35 },
  { type: 'wasp', count: 3, edge: 'top', delay: 8, interval: 1.1 },
  { type: 'kraken', count: 1, edge: 'bottom', delay: 20, interval: 1.1 });
{
  const code = encodeManifest();
  T(code.startsWith('SDR'), 'manifest code has SDR prefix (' + code + ')');
  const m = decodeManifest(code);
  T(m.night === true && m.wx === 'FOG' && m.groups.length === 3 &&
    m.groups[2].type === 'kraken' && m.groups[2].delay === 20 && m.groups[1].edge === 'top' &&
    m.groups[0].count === 12 && m.groups[0].interval === 0.35,
    'manifest codec round-trips groups and conditions');
  let threw = false;
  try { decodeManifest('SDRjunkjunk'); } catch (e) { threw = true; }
  T(threw, 'manifest codec rejects garbage');
  // reload on a fresh op: locked designs drop, the rest trims to budget and cap
  enterRaidDesign(genGrid(700));
  applyManifest(decodeManifest(code));
  T(raidCost() <= raid.budget && raidTotal() <= raid.op.cap && raid.night === true && raid.wx === 'FOG' &&
    raid.groups.every(g => raid.op.unlocked[g.type]), 'manifest reload respects budget, cap and locks');
}
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

/* gif encoder: round-trip against a spec-faithful LZW decoder */
function lzwDecode(bytes) {
  let pos = 0, bitBuf = 0, bitCnt = 0, codeSize = 9;
  const read = () => {
    while (bitCnt < codeSize && pos < bytes.length) { bitBuf |= bytes[pos++] << bitCnt; bitCnt += 8; }
    const c = bitBuf & ((1 << codeSize) - 1);
    bitBuf >>>= codeSize; bitCnt -= codeSize;
    return c;
  };
  const out = [];
  let table, next, prev;
  const resetT = () => { table = []; for (let i = 0; i < 256; i++) table[i] = [i]; next = 258; codeSize = 9; prev = null; };
  resetT();
  for (; ;) {
    const code = read();
    if (code === 256) { resetT(); continue; }
    if (code === 257) break;
    let entry;
    if (prev === null) { entry = table[code]; out.push(...entry); prev = code; continue; }
    if (code < next && table[code]) entry = table[code];
    else entry = table[prev].concat(table[prev][0]);
    out.push(...entry);
    if (next < 4096) {
      table[next++] = table[prev].concat(entry[0]);
      if (next === (1 << codeSize) && codeSize < 12) codeSize++;
    }
    prev = code;
  }
  return out;
}
{
  const cases = [
    new Uint8Array(5000),
    Uint8Array.from({ length: 20000 }, () => Math.floor(Math.random() * 256)),
    Uint8Array.from({ length: 70000 }, () => Math.floor(Math.random() * 256)), // forces 12-bit codes + dictionary reset
    Uint8Array.from({ length: 9000 }, (_, i) => i % 7),
  ];
  let rtOK = true, why = '';
  for (const cse of cases) {
    const dec = lzwDecode(gifLzw(cse));
    if (dec.length !== cse.length) { rtOK = false; why = 'len ' + dec.length + ' vs ' + cse.length; break; }
    for (let i = 0; i < cse.length; i++) if (dec[i] !== cse[i]) { rtOK = false; why = 'byte ' + i; break; }
    if (!rtOK) break;
  }
  T(rtOK, 'GIF LZW round-trips vs spec decoder (incl. 12-bit + reset)' + (why ? ' [' + why + ']' : ''));
  const h = gifHeaderBytes(480, 270);
  T(h[0] === 71 && h[1] === 73 && h[2] === 70 && h[3] === 56 && h[4] === 57 && h[5] === 97 &&
    h.length === 13 + 768 + 19, 'GIF header well-formed (GIF89a + palette + loop)');
  const f = gifFrameBytes(4, 4, new Uint8Array(16));
  T(f[0] === 0x21 && f[8] === 0x2C && f[17] === 0 && f[18] === 8 && f[f.length - 1] === 0, 'GIF frame block well-formed');
  T(gifQuant(0, 0, 0) === 216 && gifQuant(255, 255, 255) === 255 && gifQuant(255, 0, 0) === 180, 'palette quantizer maps anchors');
}

/* voice limiter */
{
  const _ac = AC, _s = soundOn;
  AC = { currentTime: 1 }; soundOn = true;
  T(voiceOK('t1', 2) && voiceOK('t1', 2) && !voiceOK('t1', 2), 'voice limiter caps stacked triggers');
  AC.currentTime = 1.2;
  T(voiceOK('t1', 2), 'voice limiter window expires');
  AC = _ac; soundOn = _s;
}

/* terrain */
{
  setTerrain(1); // RIDGE LINE: ridge from (300,175) to (620,115) r30
  T(losBlocked(460, 40, 460, 260) === true, 'ridge blocks LOS through it');
  T(losBlocked(100, 650, 1200, 650) === false, 'clear LOS away from ridges');
  T(onRidge(460, 145, 0) === true && onRidge(460, 300, 0) === false, 'onRidge point test');
  T(validPlace(460, 145) === false && validPlace(460, 320) === true, 'no towers on ridges');
  diffKey = 'std'; menuTer = 2; restartGame();
  T(terId === 2, 'restart applies the selected AO');
  placeTower('vulcan', 900, 300);
  const code = encodeSave();
  menuTer = 0; restartGame();
  T(terId === 0, 'AO resets');
  applySave(decodeSave(code));
  T(terId === 2, 'terrain survives the checkpoint codec');
  menuTer = 0; restartGame();
}

/* theater */
prog.theater = 1; // certified for the test
startTheater();
T(theater !== null && theater.fobs.length === 3 && state === 'build' && cash === 420, 'theater opens: three FOBs, shared wallet');
switchFob(1);
T(theater.cur === 1 && terId === FOB_DEFS[1].ter, 'FOB switch applies its terrain');
placeTower('vulcan', 900, 300);
switchFob(2);
T(towers.length === 0, 'each FOB has its own grid');
switchFob(1);
T(towers.length === 1 && towers[0].k === 'vulcan', 'grid persists across switches');
{
  const preCash = cash;
  transferTower(towers[0], 2);
  T(towers.length === 0 && theater.pend[2].length === 1 && cash < preCash, 'transfer departs with a fee');
  switchFob(2);
  startCrate();
  T(placingCrate !== null, 'crate ready to deploy');
  placeCrate(700, 300);
  T(towers.length === 1 && towers[0].k === 'vulcan' && theater.pend[2].length === 0, 'crate deploys at destination');
}
placeTower('vulcan', 1000, 300); placeTower('radar', 950, 380);
theater.target = theater.cur; // force the fight here for determinism of the test
commitRotation();
T(state === 'combat' && theater !== null, 'rotation commits at the target FOB');
ff(400000);
T((state === 'build' && theater.rotation === 2) || state === 'over', 'rotation resolves (rot=' + (theater ? theater.rotation : '-') + ', state=' + state + ')');
if (state === 'build') {
  theater.rotation = theater.rotations; // jump to the finale
  theater.target = theater.cur;
  commitRotation(); ff(400000);
  T(state === 'won' || state === 'over', 'theater ends after the final rotation (state=' + state + ')');
}
restartGame();
T(theater === null, 'restart clears theater');

/* convoy */
startConvoy();
T(convoy !== null && state === 'combat' && BASE.x === 720, 'convoy starts hot with the train base');
{
  const si = nearestFreeSlot(605, 355, 'vulcan');
  T(si >= 0 && CV_SLOTS[si].x === 604, 'slot picker finds the nearest flatcar hardpoint');
  T(nearestFreeSlot(1000, 360, 'gen') >= 0 && CV_SLOTS[nearestFreeSlot(1000, 360, 'gen')].gen === 1, 'generators route to locomotive mounts');
  T(nearestFreeSlot(1000, 360, 'vulcan') === -1, 'weapons rejected at the locomotive');
  T(nearestFreeSlot(605, 355, 'gen') === -1, 'generators rejected on flatcars');
  placeTower('vulcan', CV_SLOTS[si].x, 360);
  T(slotFree(si) === false && slotFree(0) === true, 'slot occupancy tracked');
}
{
  let g = 60 * 40; // 40s of sim — spawning starts at 12s
  while (g-- > 0 && state === 'combat') stepSim();
  T(kills + enemies.length > 0, 'continuous spawner produced hostiles (' + (kills + enemies.length) + ')');
}
/* convoy: open-ended upgrades */
{
  cash = 99999;
  const si2 = nearestFreeSlot(800, 355, 'vulcan');
  placeTower('vulcan', CV_SLOTS[si2].x, 360);
  const tv = towers[towers.length - 1];
  for (let i = 0; i < 5; i++) upgradeTower(tv);
  T(tv.level === 6 && isFinite(tv.dmg) && tv.range > TT.vulcan.range * 1.4, 'convoy towers climb past MK-3 (MK-' + tv.level + ')');
  T(upCost(tv) > upCost({ k: 'vulcan', level: 2 }), 'upgrade costs escalate with mark');
  T(upCost({ k: 'vulcan', level: 1 }) === 60 && upCost({ k: 'vulcan', level: 2 }) === 95, 'MK-2/MK-3 prices unchanged (codec-critical)');
  const sj = nearestFreeSlot(850, 355, 'jammer');
  placeTower('jammer', CV_SLOTS[sj].x, 360);
  const tj = towers[towers.length - 1];
  for (let i = 0; i < 7; i++) upgradeTower(tj);
  T(tj.slow <= 0.85, 'jammer slow clamped at high marks (' + tj.slow.toFixed(2) + ')');
  const so = nearestFreeSlot(900, 355, 'optic');
  placeTower('optic', CV_SLOTS[so].x, 360);
  const to2 = towers[towers.length - 1];
  for (let i = 0; i < 5; i++) upgradeTower(to2);
  T(isFinite(to2.dmgBuff) && to2.dmgBuff > 0.15, 'optic fire-control scales past MK-3 (' + to2.dmgBuff.toFixed(2) + ')');
}
towers = []; // strip the (now MK-6) defense so something can get through
baseHP = 0.5; // force the ending
{
  let g = 60 * 30;
  while (g-- > 0 && state === 'combat') stepSim();
}
T(state === 'over' && convoy !== null, 'convoy ends via convoyOver');
restartGame();
T(convoy === null && BASE.x === 1128, 'restart clears convoy and restores the FOB');
{
  diffKey = 'ez'; restartGame();
  placeTower('vulcan', 900, 300);
  sel = towers[0]; cash = 99999;
  for (let i = 0; i < 5; i++) doUpgrade();
  T(towers[0].level === 3, 'skirmish upgrade cap stays MK-3');
  sel = null; restartGame();
}

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

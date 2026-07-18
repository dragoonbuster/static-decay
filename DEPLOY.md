# STATIC DECAY — Deployment Guide (v0.9)

The game is a single self-contained HTML file with no build step, no assets,
and no server code. Anything that can serve a static file can serve this game
at full speed.

## 0. Production setup: staticdecay.xyz via GitHub Pages (live config)

The repo is https://github.com/dragoonbuster/static-decay and GitHub Pages
serves `main` at the root, so **every `git push` deploys automatically**.
The `CNAME` file in the repo pins the custom domain.

One-time DNS at the registrar for staticdecay.xyz:

- Four `A` records on the apex (`@`), one per GitHub Pages IP:
  `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- Optional but recommended: `CNAME` record `www` -> `dragoonbuster.github.io`
  (GitHub then redirects www to the apex).

After DNS propagates (minutes to an hour), GitHub auto-issues the TLS
certificate; then tick **Enforce HTTPS** in repo Settings -> Pages.
Fallback URL while DNS settles: https://dragoonbuster.github.io/static-decay/

REMINDER: the site-wide leaderboard is NOT live until a Firebase URL is
pasted into `NET` (section 2, Mode B). Until then every visitor gets a
this-device-only board.

## 1. Hosting (pick one, all free-tier friendly)

- **Cloudflare Pages** — dashboard → Workers & Pages → Create → Pages →
  "Upload assets" → drag `index.html` in. Global CDN, custom domains, done
  in ~2 minutes. (Recommended.)
- **Netlify Drop** — https://app.netlify.com/drop → drag `index.html` in.
- **GitHub Pages** — put `index.html` in a repo, enable Pages in settings.

"Snappy" is inherent: ~95 KB total, one request (plus Google Fonts, which
fail gracefully to system monospace if blocked).

## 2. The leaderboard: three modes, auto-detected

The game shows which mode is live in the board's title on the end screen.

### Mode A — Claude shared storage (`GLOBAL · SHARED NET`)
If you publish the game as a Claude artifact, it automatically uses
Claude's built-in shared storage. **Zero setup**, genuinely site-wide across
everyone using your published artifact. Note: scores are visible to all
users of the artifact (that's the point of a leaderboard, but worth knowing).

### Mode B — Firebase Realtime Database (`GLOBAL · COMMAND NET`)
For your own hosted website. You create a database in a web console and
paste one URL — the game talks to it directly over REST. **You write no
server code.**

1. https://console.firebase.google.com → Add project (any name; disable
   Analytics if you like).
2. Build → **Realtime Database** → Create database → start in *locked mode*.
3. Rules tab → paste, then Publish. These rules shape-validate every
   leaderboard field (the client also sanitizes on read — defense in
   depth) and make `/feedback` a write-only, create-only mailbox:
   ```json
   {
     "rules": {
       ".read": false,
       ".write": false,
       "lb": {
         "$diff": {
           ".read": true,
           ".write": "$diff === 'ez' || $diff === 'std' || $diff === 'vet' || $diff === 'ngt'",
           "$i": {
             ".validate": "($i === '0' || $i === '1' || $i === '2' || $i === '3' || $i === '4') && newData.hasChildren(['n','x','w','k','t'])",
             "n": { ".validate": "newData.isString() && newData.val().matches(/^[A-Z0-9·]{4}$/)" },
             "x": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999" },
             "w": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999" },
             "k": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999" },
             "t": { ".validate": "newData.isNumber()" },
             "$other": { ".validate": false }
           }
         }
       },
       "feedback": {
         ".read": false,
         "$id": {
           ".write": "!data.exists() && newData.exists()",
           ".validate": "newData.hasChildren(['t','ts'])",
           "t": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 500" },
           "v": { ".validate": "newData.isString() && newData.val().length <= 12" },
           "mode": { ".validate": "newData.isString() && newData.val().length <= 12" },
           "diff": { ".validate": "newData.isString() && newData.val().length <= 4" },
           "wave": { ".validate": "newData.isNumber()" },
           "out": { ".validate": "newData.isString() && newData.val().length <= 12" },
           "xr": { ".validate": "newData.isNumber()" },
           "$other": { ".validate": false }
         }
       }
     }
   }
   ```
4. Copy the database URL shown at the top of the Data tab
   (looks like `https://YOUR-PROJECT-default-rtdb.firebaseio.com`).
5. In the game file, find the `NET` config near the top of the script and
   paste it:
   ```js
   const NET = { firebaseUrl: 'https://YOUR-PROJECT-default-rtdb.firebaseio.com' };
   ```
6. Redeploy the file. Done — four boards live at `/lb/ez`, `/lb/std`,
   `/lb/vet`, `/lb/ngt`.

### Mode C — fallback (`THIS DEVICE ONLY`)
No artifact storage, no Firebase URL → the board persists in the browser's
localStorage (or session memory as a last resort). The game never breaks.

## 3. Security posture (reviewed 2026-07-18)

Defenses in the shipped client:

- **Stored XSS (the one real vuln class for a static game): closed.** The
  leaderboard is the only remote data the game renders; every entry is
  sanitized at the load boundary (`sanitizeEntry`: callsigns reduced to
  `[A-Z0-9]{4}`, all numeric fields coerced and clamped) before touching
  `innerHTML`. Feedback text is write-only — never rendered by the game.
- **CSP meta tag**: no external scripts, no frames, network egress limited
  to Google Fonts and Firebase RTDB domains. Inline script must stay
  allowed (single-file game), so sanitization remains the primary defense.
- **Checkpoint codes**: checksum + strict field validation + map-bounds
  checks; a crafted code cannot place off-map towers or out-of-range enums.
  Codes contain no strings, only bit-packed numbers.
- **Firebase rules** (section 2) shape-validate all writes; `/feedback` is
  create-only and unreadable by clients.

Accepted risks (documented tradeoffs, fine for an arcade board):

- Anyone can overwrite or wipe the leaderboard with *valid-shaped* entries;
  rules validate shape, not honesty, and scores can be spoofed from the
  dev console. Cheat resistance = a ~40-line Cloudflare Worker (or Firebase
  Function) validating a submitted checkpoint code — the SD1 codes already
  contain enough state to sanity-check a claimed X-RATE.
- Feedback can be spammed (no auth); it is capped at 500 chars, create-only,
  and invisible to other players. Delete nodes in the console if needed.

Admin: the **Firebase console is the admin panel** — read `/feedback`,
edit or clear `/lb/*` there. A custom admin page adds nothing until there
is real moderation volume, and doing one *safely* requires Firebase Auth
(admin UID in the rules). Revisit alongside PvP raid rooms.

## 4. Leaderboard behavior (as shipped)

- Top **5** entries per threat level, keyed by **X-RATE** (ties broken by
  wave reached, then earliest post).
- Shown on every end screen (defeat and victory).
- Qualification floor: reach **wave 5** (stops wave-1 ratio sandbagging).
- If you place, an arcade-style **4-character callsign** field appears
  (A–Z, 0–9); Enter or POST submits. Submissions re-read the board first,
  so a simultaneous poster can still bump you — the game tells you if so.

## 5. PvP, later

The `LB` adapter is the seam PvP will plug into: the same Firebase RTDB can
hold "raid rooms" where one player's adaptive-attack parameters (or a
designed wave, encoded like a checkpoint) are fetched and flown against
another player's grid asynchronously — no realtime netcode needed for a
first version. Realtime head-to-head would come after, via a small
WebSocket relay. Nothing in today's build blocks either path.

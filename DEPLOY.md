# STATIC DECAY — Deployment Guide (v0.9)

The game is a single self-contained HTML file with no build step, no assets,
and no server code. Anything that can serve a static file can serve this game
at full speed.

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
3. Rules tab → paste, then Publish:
   ```json
   {
     "rules": {
       "lb": {
         "$diff": {
           ".read": true,
           ".write": true,
           ".validate": "newData.val().length <= 5"
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

## 3. Honest security note

Any leaderboard written directly by client code can be spoofed by someone
who opens the dev console — Firebase rules validate shape, not honesty.
For an arcade board this is the right tradeoff. If you ever need
cheat-resistant scores, that's the moment a ~40-line Cloudflare Worker (or
Firebase Function) validating a submitted checkpoint code becomes worth it —
the SD1 codes already contain enough state to sanity-check a claimed X-RATE.

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

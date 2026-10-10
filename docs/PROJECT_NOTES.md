# Asteroid Field Nav HUD — Project Notes

## Files
- `asteroid_hud.html` — v1: original single-file three.js build with a hand-built CSS HUD.
- `claude/asteroid_hud_v2.html` — v2: "fly-through" version. HUD rebuilt from the Figma "Gamescreen" frame,
  phasers, thrust/brake and a timed field-crossing mission. Self-contained (Figma assets inlined as data URIs).
  Live link: https://claude.ai/artifact/Bd54gmVVLntFGjRjZ3aEhs
  (replaces …/3UXMD87hYXNQUCUF7kg2wK, deleted by accident on 2026-10-04).
- `claude/asteroid_hud_v3.html` — v3 (experiment, 2026-10-04): 360° first-person classic Asteroids.
  Same HUD/assets; new flight model, splitting rocks, rounds, radar, line-art rocks/planets, hostile saucers.
  Live link: https://claude.ai/artifact/WgxyztaBcZkDWY2wQPCgTH
  v2 is kept so we can revert if v3 doesn't work out.
- Both standalone files load the Adobe Fonts kit for Eurostile Extended; the live links can't (CSP),
  so they show the Michroma fallback.

## Figma source
- File: Star-Trek — https://www.figma.com/design/OviBaaNalAz3uFG4ZAc4d7/Star-Trek?node-id=2005-2
- Frame: `Gamescreen` (node 2045:3125), 1920×1080. Background art in "Asteroids Screen" is FPO;
  only its `Top` and `Bottom` viewscreen bezel layers are used.
- Frame: `Gamescreen Overlay` (node 2275:11), 1920×1080 — the pause / fail screen design (used for all v3 overlay
  screens, 2026-10-08). See "Overlay screens" below.
- Tokens pulled: cyan #0BD5ED, ice #D1FAFF, dim segment #044760, warning red #FC4340, key-bar border #253B3D,
  key-bar fill rgba(4,71,96,0.1).

## Fonts
- Orbitron (Google; 400/500/700/800) for numbers and small HUD text.
- Eurostile Extended for labels, the alert slot and overlay titles. Figma uses Extended Bold, which the Adobe kit
  doesn't offer. Kit `gon5nqi` (`<link rel="stylesheet" href="https://use.typekit.net/gon5nqi.css">`) has
  Extended Medium (400) and Extended Black (900).
- Default is Black (closest to the Figma Bold look). Press F in the standalone file to toggle Medium/Black;
  a small tag bottom-right shows the active weight. Weight is the CSS token `--ext-w`.
- Fallback when the kit can't load: Michroma (Google) with a slight text stroke to fake the bold.
- Tracking: big numbers −5.5% (Figma −7%); overlay titles −6.5% (Figma −10%); alert slot (v3) −3% (Orlando 2026-10-09: SHIELDS CRITICAL too tight).
  SCORE (HUD + overlay) loosened to −2% (Orlando, 2026-10-09: "so tight"); timer −4%.
- Fixed-width digits (2026-10-09, fixes "numbers jumping around"): Orbitron/Eurostile digits are proportional and
  `tabular-nums` has no effect, so live numbers (timer, score, overlay score, velocity, phasers, shield) are drawn
  one span per character; every digit sits centred in a cell as wide as the widest digit in the current font
  (measured at runtime, re-measured when fonts load). In SCORE (HUD + overlay) a 1 keeps its own narrow width (Orlando: the 1s looked too far apart), so the score's
  width changes only when a 1 appears or disappears; the timer and other readouts keep full cells.

## Copy / naming rules (Orlando)
- Use plain words players already know: "ROUND", not "wave" (renamed 2026-10-06) or "sector".
- Don't phrase a failure like an achievement: only mention rounds cleared when at least one was cleared
  (the Figma mock's "0 SECTORS CLEARED" is intentionally not shown).
- Round numbers are spelled out on overlay screens (ROUND ONE … TWENTY, then digits), matching the Figma mock.

## Game design principles (Orlando, 2026-10-08)
- No adding time. Each round has a fixed clock; you accomplish what you accomplish in that round, pass or fail.
  If you pass, the next round is harder. (The earlier "+1.5 s per hit" made rounds feel endless — removed.)
- The shield meter has to matter and be readable: damage sticks for the rest of the round (no auto-recharge),
  and the meter visibly drains.
- The game must feel threatening, not boring: asteroids come at you (Orlando, 2026-10-08: "currently, the game is
  kinda boring" — rocks used to just drift randomly and you had to hunt them).

## Overlay screens (v3, from Figma "Gamescreen Overlay", 2026-10-08)
- One shared layout for every screen; the HUD fades out behind it, top/bottom bezels and the 3D scene stay
  (scene dimmed by a rgba(0,4,8,.74) scrim).
- Positions/styles from Figma: SCORE label (Eurostile 24px cyan, y108) + score (Orbitron Bold 64px gradient, y139);
  big title (Eurostile 115px, y305); two-line subtitle (Orbitron Medium 24px, white then cyan, y475);
  pill button (692,584, 537.52×120.96, radius 63.36, 8.64px white→ice→cyan gradient ring, rgba(0,0,0,.6) fill,
  Orbitron ExtraBold 36px white); key bar (230,785, 1460×172; 1px #253B3D border, radius 8, 4px cyan inset
  edges left/right; label Orbitron Medium 16px cyan over key Orbitron ExtraBold 30px white; 1×74px #044760
  dividers; gap 80): DODGE WASD · TURN L / R · THRUST E · BRAKE Q · FIRE SPACE · PAUSE ESC.
- States:
  - Start: no score · "ROUND ONE" (cyan) · "THE ASTEROIDS ARE COMING FOR YOU" /
    "CLEAR THEM BEFORE THE CLOCK RUNS OUT • EACH ROUND GETS HARDER" · CLICK TO ENGAGE.
  - Pause (Esc, focus lost): score · "PAUSED" (cyan) · "ROUND TWO • 01:02:33 LEFT" / "18 HITS TO CLEAR" ·
    CLICK TO RESUME.
  - Fail: score · "MISSION FAILED" (red) · reason (OUT OF TIME / HULL BREACH) / "ROUND ONE" (+ "• 2 ROUNDS CLEARED"
    only if >0) · CLICK TO TRY AGAIN (the mock says RESUME, but there's nothing to resume after a failure).
- Not in the key bar (Figma has 6 slots): mouse turning, Shift for thrust, C look back, M sound, L rock style.

## v3 — 360° classic Asteroids, first person
- Idea (Orlando): classic Asteroids, but first person instead of top-down, with a small top-down map.
- Controls (mouse + keyboard; Orlando wanted to keep dodging):
  mouse turns (pointer lock; Esc releases & pauses) or ←/→ keys turn · WASD (and ↑/↓) dodge sideways/up-down ·
  Shift/E thrust · Q brake · click/Space fire · hold C to look back · L rock style · M sound · F font weight.
  A quick tap of Space/click always fires (queued for the next frame), in v2 too.
- Flight: flat-ish world (wide, thin layer). Classic inertia — thrust along your facing, you keep drifting
  (light drag 0.16/s, max speed 75). Dodge = v2-style quick sideways/vertical slides (±40 altitude).
- Sector wraps (±210 around the ship), so there's no edge and rocks always surround you.
- Rocks split on a phaser hit: large (20 pts) → 2 medium (50) → 2 small (100) → gone. One large rock = 7 hits.
  Kills count double while thrusting. Ramming a rock splits it too, costs shield and shoves you away.
- Homing rocks (2026-10-08): every rock steers its drift toward the ship each frame (velocity lerps toward a
  "seek" vector), each with its own approach angle offset (±0.3 rad) and height offset (±8), so they come from
  different lines and from all sides — including behind, which makes the radar, edge arrows and rear view matter.
  - Top speed: large 12 / medium 14 / small 18, +2.2 / +2.6 / +3 per round after the first.
  - Turn rate: large 0.22 / medium 0.38 / small 0.55 per second, ×(1 + 0.18 per round) — small pieces are the
    fast, sharp-turning threats.
  - Missed rocks turn around and come back. Pieces split off by a phaser hit scatter for 0.6 s before homing;
    pieces split off by ramming scatter for 1.6 s (so one ram doesn't chain into several hits).
  - Attack lanes (2026-10-09, Orlando: rocks came in noticeable clusters): every rock has its own attack side
    (a world bearing from the ship). If it isn't on that side yet it arcs around you at range until it is, then
    comes straight in. Split pieces fan out to opposite flanks (lane ±0.7–1.2 rad, ±1.1–1.6 from round 3) instead
    of following each other in.
  - Start spread: rounds 1–2 spread rocks evenly around you, 95–170 out. From round 3 they come as a pincer:
    3 fronts (4 from round 5, 5 from round 7), evenly spaced, all starting ~150–165 out so they arrive at about the
    same time; extra rocks on a front sit ~23° to one side and ~22 further out (a spread, not a queue).
  - Each rock starts with a gentle 6–10 inward drift; homing takes over from there.
- Shields (2026-10-08): 257 max. No recharge during a round (was: refilled 14/s after 2.5 s — made the meter feel
  useless). Damage: saucer bolt −45, saucer ram −70, rock ram −60 / −42 / −28 (large/medium/small), each ±10.
  Any hit at 0 = HULL BREACH (mission failed). Clearing a round gives +60.
  - Meter: 17 segments per side, lit count = ceil(shield/257 × 17), draining from the outer ends inward; spent
    segments drop to #044760 at 35% opacity. Lit segments are cyan; at ≤ 1/3 shield the lit segments and the
    number's glow turn red.
  - Status: PRIMARY SYSTEM ACTIVE (> 2/3) → SECONDARY SYSTEM ACTIVE (> 1/3) → CRITICAL (≤ 1/3, red) →
    CRITICAL, REROUTING POWER at 0; IMPACT DETECTED for ~1 s after each hit.
  - Alert slot adds "SHIELDS CRITICAL" (pulsing) at ≤ 1/3 and "SHIELDS DOWN" (steady) at 0.
  - On every hit the whole shield block flashes red and shakes.
- Rounds (fixed clock + difficulty ramp):
  - Every round: 01:14:03 (1 min 14.03 s), nothing adds time.
  - Round n starts with 3+n large rocks: round 1 = 4 (28 hits), round 2 = 5 (35), +1 per round. (Back up from 3
    because rocks now come to you, so less of the clock goes to hunting.)
  - Saucers: round 1 gets a single large saucer ~40 s in; from round 2 the first arrives after
    max(8, 22 − 3n) + 0–6 s and repeats every max(9, 30 − 4n) + 0–10 s; small sharp-shooting saucers from round 3
    (chance 25% rising 15% per round, max 75%).
  - Under the clock: "ROUND 1 · 28 HITS TO CLEAR" (counts the splits still to come), "ROUND 2 INCOMING" in the break.
  - Clear every rock → ROUND CLEARED banner, leftover time → points (hundredths left), +60 shield,
    next round after 3 s (verified round 1 → 2 transition works). Fail: OUT OF TIME or HULL BREACH.
  - History: originally 7 rocks/49 hits, "impossible"; then 4 rocks + 1.5 s per hit (felt endless); then 3 rocks
    with a fixed clock and random drift (Orlando failed round 2, and found it boring); now homing rocks, 4 to start.
  - (Code still calls these "waves" internally — wave, startWave, wavesCleared.)
- Line-art look (Orlando loves it, 2026-10-05) — the art direction for v3:
  - Rocks: chunky 20-face rocks, every edge drawn in ice #D1FAFF over a near-black fill; debris shards wireframe
    (ice, orange for phaser kills, red for saucers); lines fade with distance via fog. L flips back to shaded rocks.
  - Planets (backdrop, travel with the camera): main globe (r150, 10 lat × 12 long, cyan, ahead-left of start;
    rings removed per Orlando), small moon (r26, ice), second world (r95, cyan) behind the start heading.
    Near-black fill, camera-facing silhouette ring, slow spin; dimmer than the rocks.
- Hostile saucers (classic saucer, Orlando's pick):
  - Red #FC4340 line art (dome/rim/belly profile → rings + 8 meridians), dark fill, slow spin + wobble.
  - One at a time (schedule above). Spawns ~230 out, crosses near you, zig-zags, leaves after 26 s.
  - Large (r4.4, speed 16, 200 pts): fires every 1.7–2.6 s, aimed at you ± spread.
    Small (r2.4, speed 26, 1,000 pts): fires every 1.1–1.7 s, leads its shots.
  - Bolts: red sprites at 70 u/s, dodgeable, −45 shield; they split rocks they hit. Ramming: −70 shield.
  - One phaser hit kills. HUD: "VESSEL DETECTED", "HOSTILE BEHIND", HOSTILE lock label (saucers win the lock),
    red radar diamond (pinned to the rim when out of range), edge arrows. Classic warble + zap sounds.
  - Saucers don't count toward clearing a round.
- Radar: Figma "Radar" frame in Gamescreen (node 2381:151, 2026-10-09) at 1748,58, 132px: outer ring 1px cyan,
  rgba(0,0,0,.05) fill, 10px cyan glow; inner ring 124px with a 6px white stroke, rgba(0,0,0,.09) fill and an inset
  34px #2AAEBE glow drawn over the stroke too (that's what tints it ice-cyan, as in Figma). The live scope is a 112px
  canvas inside the inner ring. No label. Range 210; heading up; dots sized by rock size, red = on a collision course,
  faded = far above/below; saucers = red diamonds pinned near the rim when out of range; view cone flips in rear view.
- GRAVITY readout removed in v3 (decorative).
- Advice line (2026-10-09, Orlando's idea): the old decorative "GRAVITATION OUTPUT" label under the alert slot is now
  a live hint line (Orbitron Medium 13px, +12% tracking, centred at x960 y325). One hint at a time, most urgent wins,
  each held ≥2 s (tips 4 s); cyan = guidance, white = positive, soft red = danger. Order:
  round cleared "+60 SHIELD · TIME BONUS +N" (white) → rock <35 "DODGE WITH WASD · OR FIRE" → saucer behind
  "TURN AROUND · ONE HIT DESTROYS IT" → rock behind "HOLD C TO LOOK BACK · CHECK YOUR RADAR" → shield 0 "ONE MORE HIT
  ENDS THE MISSION" → shield ≤1/3 "AVOID CONTACT · CLEAR THE ROUND FOR +60 SHIELD" → phasers <15 "PHASERS RECHARGING ·
  EASE OFF THE TRIGGER" → <15 s left "TIME RUNNING OUT · N HITS LEFT" → saucer "HOSTILE SAUCER · DODGE ITS FIRE" →
  first 5 s of a round (round 1 "ROCKS ARE CLOSING IN…", round 2 "MORE ROCKS · FASTER THIS TIME", 3+ "INCOMING FROM
  MULTIPLE SIDES…") → ≤3 hits left "FINAL ROCKS · CHECK YOUR RADAR" → after 4 s calm, one-time tips (thrust kills
  double, shields only recharge on clear, small rocks fastest, C looks back, leftover time = bonus).
- HUD remaps: VELOCITY = real drift speed; W/E pointer = turning + sideways dodge; left tape = altitude;
  right tape = sideways drift.
- Rendering: directional lights only, distant stars + planets ride with the camera, near-star volume wraps
  around the ship; fog 0.0042. WebGL lines are always 1px.

## v2 — fly-through mission (kept as the fallback)
- Goal: cross 3,000m of asteroid field before the clock runs out (01:14:03 read as MM:SS:hundredths).
  Cruise covers ~2,200m in that time, so you need to thrust ~a third of the run.
- "FIELD EXIT 2,431M" under TIME REMAINING. Last 450m: rocks stop respawning.
- Win → FIELD CLEARED (rocks + time bonus + shield × 2). Lose → OUT OF TIME or HULL BREACH.
- Thrust: Shift/E; brake: Q (Ctrl avoided — Ctrl+W closes the tab). Speed 12/30/60 → VELOCITY ≈18/45/90.
  FOV widens, star streaks, slight shake, engine rumble. No thrust meter, per Orlando.
- Steering ±40 (WASD/arrows), camera nose turns into the steer; field re-forms around the ship,
  ~25% of rocks spawn on your path.
- GRAVITY MCH readout: rises as you drift left toward the planet (decorative).
- 32 low-poly rocks (scale 0.9–4.0, >3 takes 2 hits), flat-shaded Phong (Lambert can't flat-shade in r128).
- Shields still auto-recharge in v2 with the older meter. Overlay screens still use the older simple layout.

## Shared HUD decisions (v2 and v3)
- Fixed 1920×1080 stage, scaled uniformly to fit the window (letterboxed). No responsive layout.
- Every HUD element sits at its Figma coordinates; numbers are live text with the Figma white→ice gradient + cyan glow.
- Opens on an ENGAGE screen; RESUME screen when focus leaves. (The game runs in a frame and only hears keys
  once focused — the original "arrows do nothing" bug.)
- Alert slot (DEBRIS AHEAD position), most urgent wins: EVASIVE ACTION → [v3: HOSTILE BEHIND → DEBRIS BEHIND →
  VESSEL DETECTED] → DEBRIS AHEAD → [v3: ROUND CLEARED, white — positive messages are white, Orlando 2026-10-09] → SHIELDS DOWN / SHIELDS CRITICAL.
- W/E compass: arc static, pointer rides the arc (±22°).
- Reticle + range to locked target; red LOCK (or HOSTILE) brackets track it.
- Tapes ±200M, labels 200/100/0/100/200 (Figma had all 200 placeholders).
- Ship outline stationary (Orlando's call); flashes red on impact. 2× PNG export (vector was 3.5MB).
- Shield 257 + 17-segment-per-side meter in the Figma lit/unlit colors (v3 behaviour above).
- Figma's hidden "Thrust" slot reused as SCORE; mirrored bottom-right as PHASERS charge.
- 3D starfield of ~1,400–1,500 round points + fixed-pixel distant layers.
- Phasers: hold to auto-fire ~4/s, 10% charge per shot, twin alternating orange beams, impact flare,
  synthesized Web Audio sfx.

## Open ideas / next steps
- Playtest the homing rocks: too much / too little pressure? Levers: top speeds, turn rates, approach-angle spread,
  rocks per round, ram damage, shield top-up between rounds.
- Playtest v3 vs v2 and pick a direction; confirm line art and drop the L toggle.
- v3: decide what the freed bottom-left space should do; hyperspace jump as a panic button; decide whether the key bar should show mouse / Shift / C (look back).
- Port the Figma overlay screens and the v3 shield behaviour to v2 if v2 stays in play.
- Pick final Eurostile weight (Medium vs Black) and drop the F toggle.
- Touch controls (tap-to-fire works; no on-screen steering).
- Vite + npm three.js migration and module split (scene / hud / controls / phasers / main).

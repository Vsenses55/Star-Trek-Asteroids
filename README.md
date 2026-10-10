# Star Trek Asteroids — Flight Sim HUD

A first-person, 360° take on classic *Asteroids*, played through a starship viewscreen HUD designed in Figma.
Single-file HTML + three.js — no install, no build step needed to play.

**Play:** open `index.html` in a browser (Chrome recommended), click **ENGAGE**.

## Controls

| Action | Keys |
|---|---|
| Turn | Mouse (pointer lock) or ← / → |
| Dodge | W A S D (and ↑ / ↓) |
| Thrust / Brake | Shift or E / Q |
| Fire phasers | Click or Space (hold to auto-fire) |
| Look back | Hold C |
| Pause | Esc |
| Sound / rock style / font weight | M / L / F |

## How it plays

- Every round has a fixed clock (01:14:03). Nothing adds time — clear every rock before it runs out.
- Large rocks split into 2 medium, then 2 small (7 hits per large rock). Leftover time becomes bonus points.
- Rocks hunt you, each from its own side; from round 3 they come as a pincer from 3+ directions at once.
- Shields only recharge (+60) when you clear a round. Rams and saucer fire drain them; a hit at 0 ends the mission.
- Hostile saucers show up from time to time and shoot back. One phaser hit takes them out.
- The radar (top right) and the hint line under the alert slot tell you where the danger is and what to do.

## Project layout

```
index.html                    v3 — the game (built, self-contained)
versions/v2-flythrough.html   v2 — earlier fly-through mission (kept as a fallback)
versions/v1-original.html     v1 — the original HUD prototype
src/v3/markup.html            v3 HUD markup + CSS (Figma "Gamescreen" coordinates, 1920×1080 stage)
src/v3/script.js              v3 game code (three.js r128 from cdnjs)
src/v2/template.html          v2 source
assets/                       Figma exports (bezels, reticle, tapes, shield meter, ship, compass)
build.py                      inlines assets/ as data URIs → index.html and versions/v2-flythrough.html
docs/PROJECT_NOTES.md         design decisions, tuning values and history
```

## Editing

Change `src/`, then rebuild:

```
python3 build.py
```

Source placeholders like `%%top.png%%` are replaced with the matching file from `assets/` as a data URI, so the
outputs stay single files you can open anywhere or host on GitHub Pages.

## Credits

- HUD design: Orlando (Figma file "Star-Trek", frames *Gamescreen* and *Gamescreen Overlay*).
- Fonts: Eurostile Extended via Adobe Fonts kit `gon5nqi` (needs the kit's allowed domains to include wherever you host
  it; otherwise falls back to Michroma), Orbitron (Google Fonts).
- Fan project; Star Trek is a trademark of CBS Studios / Paramount. Not affiliated or endorsed.

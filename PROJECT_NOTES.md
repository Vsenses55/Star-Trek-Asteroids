# Asteroid Field Nav HUD — Project Notes

## What this is
A single-file three.js (r128, CDN) recreation of a sci-fi cockpit HUD: live
asteroid field flying toward the camera, with a data overlay (velocity,
thrust, gravitation output, countdown timer, target-lock reticle, shield
status) styled after a reference screenshot.

Current file: `asteroid_hud.html` — everything (scene, HUD, controls) lives
in one file for now. Splitting it into modules is the first migration task.

## Current features
- **Scene**: procedurally displaced icosahedron asteroids (26, recycled/
  respawned as they pass the camera), starfield, distant planet, fog for
  depth, cyan rim lighting to match the reference glow.
- **HUD overlay**: absolutely-positioned DOM elements over the canvas —
  velocity/thrust/gravitation readouts jitter live, countdown timer actually
  counts down, center reticle reports live distance to the nearest asteroid
  in the forward view.
- **Steering**: arrow keys / WASD move the ship laterally + vertically
  (acceleration + drag, not snap-to). Ship icon in the HUD banks/dips to
  match input.
- **Collision + fracture**: clipping a rock triggers a screen flash + camera
  shake, knocks down the shield value (regenerates after ~2.5s clear), and
  bursts the rock into pooled shard debris (max 48 concurrent shards) before
  it respawns ~1s later.
- **Asteroid detail (3 layers, kept cheap on purpose)**:
  - *Shape*: 3-octave noise displacement on an icosahedron (subdivision
    level 2, ~1,280 tris/rock × 26 rocks ≈ 33K tris total).
  - *Materials*: 3 rock "families" (carbonaceous/rough, icy/smoother, warm-
    metallic), each with a procedurally generated bump map (craters) and
    crack map (glowing veins) — textures are baked ONCE at startup and
    shared across all 26 meshes, so texture memory doesn't scale with rock
    count.
  - *Behavior*: rotation does a slow random-walk (asymmetric tumbling, not
    fixed spin).

## Known next steps / ideas not yet built
- **Migrate to Vite + npm three.js** instead of the CDN script tag. Split
  into `scene.js` (asteroids/lighting/camera), `hud.js` (DOM overlay + data
  sim), `controls.js` (steering), `main.js` (wiring).
- **Design system integration**: swap placeholder CSS tokens (`--cyan`,
  `--red`, Orbitron/Share Tech Mono pairing) for the real design system once
  it's available (Figma tokens / Tailwind config / component lib — TBD
  which).
- **Performance headroom if rock count goes way up**: switch to
  `THREE.InstancedMesh` with a small set of pre-baked geometry variants
  (currently each rock has fully unique geometry, which is fine at ~26 rocks
  but wouldn't scale to hundreds without instancing).
- **LOD**: simpler geometry for distant rocks, detailed only up close — not
  needed yet at current asteroid count/subdivision level, but worth it if
  detail or count increases further.
- **Reticle**: currently fixed at screen center with a live distance
  readout; a real next step is projecting the actual locked asteroid's
  screen position so the reticle can drift/track instead of staying static.
- **No game-over state yet**: shield dips and regenerates but never ends
  the "run" — open question whether to add a hull-breach/reset sequence or
  keep it as an endless dodging sim.

## Reference
Original inspiration was a static HUD screenshot (velocity/thrust/
gravitation readouts, red "DEBRIS AHEAD" warning, target reticle, shield
modulation bar) — not attached here, but the visual language (cyan glow,
Orbitron + Share Tech Mono, dark vignette, scanlines) was built to match it.

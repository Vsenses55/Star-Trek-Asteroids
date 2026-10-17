<script>
(function(){
  "use strict";
  const W = 1920, H = 1080;
  const $ = id => document.getElementById(id);
  const clamp = THREE.MathUtils.clamp;

  // ---------------------------------------------------------------
  // STAGE SCALING — fixed 1920x1080, scaled proportionally
  // ---------------------------------------------------------------
  const stage = $('stage');
  let stageScale = 1, renderer = null;
  function fit(){
    // presentation margin: the stage never touches the window edges (≈2.5% of the width, 16–48px)
    const pad = Math.round(Math.min(48, Math.max(16, window.innerWidth * 0.025)));
    stageScale = Math.min((window.innerWidth - pad*2) / W, (window.innerHeight - pad*2) / H);
    stage.style.setProperty('--s', stageScale);
    if (renderer){
      renderer.setPixelRatio(Math.min(2, Math.max(0.5, (window.devicePixelRatio || 1) * stageScale)));
      renderer.setSize(W, H, false);
    }
  }
  renderer = new THREE.WebGLRenderer({ canvas:$('scene'), antialias:true, alpha:false });
  renderer.setClearColor(0x01050a, 1);
  fit();
  window.addEventListener('resize', fit);

  // ---------------------------------------------------------------
  // SCENE — an open sector you can turn around in
  // ---------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x01060a, 0.0042);
  const camera = new THREE.PerspectiveCamera(58, W/H, 0.1, 1400);
  camera.rotation.order = 'YXZ';

  // directional lights only, so rocks are lit the same wherever you fly
  scene.add(new THREE.AmbientLight(0x1a2a30, 1.15));
  const key = new THREE.DirectionalLight(0x9fd8e0, 0.7); key.position.set(20, 30, 10); scene.add(key);
  const rimA = new THREE.DirectionalLight(0x8ff3ff, 0.9); rimA.position.set(-1, 0.5, -0.6); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0x3a6b78, 0.6); rimB.position.set(1, -0.3, 0.5); scene.add(rimB);

  // backdrop that travels with the camera: distant stars all around + a landmark planet
  const sky = new THREE.Group(); scene.add(sky);
  function skyStars(n, rMin, rMax, size, opacity, color){
    const g = new THREE.BufferGeometry(), p = new Float32Array(n*3);
    for (let i=0;i<n;i++){
      const r = rMin + Math.random()*(rMax-rMin), th = Math.random()*Math.PI*2, ph = Math.acos(Math.random()*2-1);
      p[i*3] = r*Math.sin(ph)*Math.cos(th); p[i*3+1] = r*Math.cos(ph)*0.8; p[i*3+2] = r*Math.sin(ph)*Math.sin(th);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p,3));
    sky.add(new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation:false, transparent:true, opacity, fog:false, depthWrite:false })));
  }
  skyStars(2600, 900, 1200, 1.4, 0.55, 0xbfe9f2);
  skyStars(360, 900, 1200, 2.4, 0.9, 0xeafcff);
  // line-art planets (same vector style as the rocks): lat/long wire globe, optional rings, near-black fill
  // so stars and rings behind them are hidden. They sit in the backdrop, so they work as landmarks for 360° flying.
  function circlePts(out, r, y, seg, tilt){
    for (let i=0;i<seg;i++){
      const a0 = i/seg*Math.PI*2, a1 = (i+1)/seg*Math.PI*2;
      out.push(Math.cos(a0)*r, y, Math.sin(a0)*r, Math.cos(a1)*r, y, Math.sin(a1)*r);
    }
  }
  function makeWirePlanet(o){
    const g = new THREE.Group(), R = o.radius, pts = [];
    for (let i=1;i<o.lat;i++){                       // latitude rings
      const phi = -Math.PI/2 + i/o.lat*Math.PI;
      circlePts(pts, Math.cos(phi)*R, Math.sin(phi)*R, 72);
    }
    for (let j=0;j<o.lon;j++){                        // longitude meridians
      const th = j/o.lon*Math.PI;
      for (let i=0;i<48;i++){
        const p0 = i/48*Math.PI*2, p1 = (i+1)/48*Math.PI*2;
        pts.push(Math.cos(p0)*R*Math.cos(th), Math.sin(p0)*R, Math.cos(p0)*R*Math.sin(th),
                 Math.cos(p1)*R*Math.cos(th), Math.sin(p1)*R, Math.cos(p1)*R*Math.sin(th));
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lineMat = new THREE.LineBasicMaterial({ color:o.color, transparent:true, opacity:o.opacity, fog:false, depthWrite:false });
    const globe = new THREE.LineSegments(geo, lineMat);
    const fill = new THREE.Mesh(new THREE.SphereGeometry(R*0.995, 40, 28),
      new THREE.MeshBasicMaterial({ color:0x01070b, fog:false, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1 }));
    // brighter outline ring so the silhouette reads cleanly against the stars
    const rimPts = []; circlePts(rimPts, R, 0, 128);
    const rimGeo = new THREE.BufferGeometry(); rimGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimPts, 3));
    const rim = new THREE.LineLoop ? new THREE.LineSegments(rimGeo, new THREE.LineBasicMaterial({ color:o.color, transparent:true, opacity:Math.min(1, o.opacity*1.8), fog:false })) : null;
    const spin = new THREE.Group(); spin.add(fill); spin.add(globe);
    spin.rotation.z = o.axisTilt || 0;
    g.add(spin);
    if (rim){ rim.userData.billboard = true; g.add(rim); }
    if (o.rings){
      const rp = [];
      for (const k of o.rings) circlePts(rp, R*k, 0, 128);
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
      const rings = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color:o.color, transparent:true, opacity:o.opacity*0.9, fog:false }));
      rings.rotation.x = o.ringTilt || 0.35; rings.rotation.z = o.ringRoll || 0.2;
      g.add(rings);
    }
    g.position.copy(o.pos);
    g.userData = { spin, rim, speed:o.spinSpeed || 0.02 };
    sky.add(g);
    return g;
  }
  const planets = [
    // the landmark planet (rings removed per Orlando)
    makeWirePlanet({ radius:150, lat:10, lon:12, color:0x0bd5ed, opacity:0.55, axisTilt:0.25,
      pos:new THREE.Vector3(-520, 40, -880), spinSpeed:0.03 }),
    // its moon
    makeWirePlanet({ radius:26, lat:6, lon:6, color:0xd1faff, opacity:0.6, axisTilt:-0.4,
      pos:new THREE.Vector3(-250, 150, -900), spinSpeed:0.08 }),
    // a second, distant world behind your starting heading, so there's a landmark when you turn around
    makeWirePlanet({ radius:95, lat:8, lon:10, color:0x0bd5ed, opacity:0.45, axisTilt:-0.5,
      pos:new THREE.Vector3(620, -60, 760), spinSpeed:0.02 }),
  ];
  function updatePlanets(dt){
    for (const p of planets){
      p.userData.spin.rotation.y += p.userData.speed*dt;
      // keep the silhouette ring facing the camera
      if (p.userData.rim) p.userData.rim.quaternion.copy(camera.quaternion).multiply(_rimFix);
    }
  }
  const _rimFix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI/2);

  // near stars: a volume of points around the ship that wraps as you move, so it's endless in every direction
  const starDot = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'), g = x.createRadialGradient(16,16,0,16,16,16);
    g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.35,'rgba(200,245,255,0.8)'); g.addColorStop(1,'rgba(200,245,255,0)');
    x.fillStyle = g; x.fillRect(0,0,32,32); return new THREE.CanvasTexture(c);
  })();
  const DUST = 1500, BOX = { x:260, y:130, z:260 };
  const dustGeo = new THREE.BufferGeometry(), dustPos = new Float32Array(DUST*3);
  for (let i=0;i<DUST;i++){
    dustPos[i*3] = (Math.random()*2-1)*BOX.x; dustPos[i*3+1] = (Math.random()*2-1)*BOX.y; dustPos[i*3+2] = (Math.random()*2-1)*BOX.z;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos,3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map:starDot, color:0xdff8ff, size:0.9, sizeAttenuation:true, transparent:true, opacity:0.95,
    depthWrite:false, fog:false, blending:THREE.AdditiveBlending }));
  dust.frustumCulled = false; scene.add(dust);
  const streakPos = new Float32Array(DUST*6), streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos,3));
  const streakMat = new THREE.LineBasicMaterial({ color:0xbff4ff, transparent:true, opacity:0, depthWrite:false, fog:false, blending:THREE.AdditiveBlending });
  const streaks = new THREE.LineSegments(streakGeo, streakMat); streaks.visible = false; streaks.frustumCulled = false; scene.add(streaks);
  function wrapNear(v, c, half){ if (v - c > half) return v - 2*half; if (v - c < -half) return v + 2*half; return v; }
  function updateDust(c, vel, t){
    for (let i=0;i<DUST;i++){
      dustPos[i*3]   = wrapNear(dustPos[i*3],   c.x, BOX.x);
      dustPos[i*3+1] = wrapNear(dustPos[i*3+1], c.y, BOX.y);
      dustPos[i*3+2] = wrapNear(dustPos[i*3+2], c.z, BOX.z);
    }
    dustGeo.attributes.position.needsUpdate = true;
    streaks.visible = t > 0.03;
    if (!streaks.visible) return;
    const k = 0.18 * t; // trail points back the way the star "came from" relative to you
    for (let i=0;i<DUST;i++){
      const x = dustPos[i*3], y = dustPos[i*3+1], z = dustPos[i*3+2];
      streakPos[i*6] = x; streakPos[i*6+1] = y; streakPos[i*6+2] = z;
      streakPos[i*6+3] = x + vel.x*k; streakPos[i*6+4] = y + vel.y*k; streakPos[i*6+5] = z + vel.z*k;
    }
    streakGeo.attributes.position.needsUpdate = true;
    streakMat.opacity = 0.55 * t;
  }

  // ---------------------------------------------------------------
  // ASTEROIDS — classic sizes that split: large → 2 medium → 2 small → gone
  // ---------------------------------------------------------------
  function makeAsteroidGeometry(seed, detail){
    const geo = new THREE.IcosahedronGeometry(1, detail); // low-poly on purpose
    const pos = geo.attributes.position;
    for (let i=0;i<pos.count;i++){
      const n = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const n1 = 0.5*Math.sin(seed + n.x*2.2 + n.y*1.3) + 0.5*Math.cos(seed*1.7 + n.y*2.7 + n.z*1.9);
      const n2 = 0.5*Math.sin(seed*2.3 + n.x*6.1 + n.z*5.4) + 0.5*Math.cos(seed*3.1 + n.y*7.2 + n.x*4.8);
      n.multiplyScalar(Math.max(0.55, 1 + 0.28*n1 + 0.12*n2));
      pos.setXYZ(i, n.x, n.y, n.z);
    }
    geo.computeVertexNormals();
    return geo;
  }
  const rockGeos = Array.from({length:10}, (_, i) => makeAsteroidGeometry(i*1.7 + 0.3, 1));
  // line-art look (classic Asteroids vector style): chunkier 20-face rocks, every edge drawn, with a near-black
  // fill so the rock still hides the stars and lines behind it
  const lineGeos = Array.from({length:10}, (_, i) => makeAsteroidGeometry(i*2.3 + 0.9, 0));
  const lineEdges = lineGeos.map(g => new THREE.EdgesGeometry(g, 1));
  const lineFill = new THREE.MeshBasicMaterial({ color:0x01070b, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1 });
  const LINE_COLOR = 0xd1faff;
  let lineArt = true; // L toggles
  const ROCK_COLORS = [0x2a3338, 0x34474e, 0x3b342b];
  const SIZES = { 3:{ r:5.2, pts:20, dot:5.5 }, 2:{ r:2.7, pts:50, dot:4 }, 1:{ r:1.4, pts:100, dot:2.8 } };
  const SECTOR = 210;        // half-width of the wrapping sector (fly off one side, rocks come round the other)
  const ALT_BAND = 42;       // rocks drift within this height band, same as your vertical dodge range
  const POOL = 72, rocks = [];
  for (let i=0;i<POOL;i++){
    const mat = new THREE.MeshPhongMaterial({ color:ROCK_COLORS[i%3], flatShading:true, shininess:4, specular:0x0a1418, emissive:new THREE.Color(0x0b3a44), emissiveIntensity:0.1 });
    const mesh = new THREE.Mesh(rockGeos[i % rockGeos.length], mat); mesh.visible = false; scene.add(mesh);
    const edgeMat = new THREE.LineBasicMaterial({ color:LINE_COLOR, transparent:true, opacity:0.95 });
    const edges = new THREE.LineSegments(lineEdges[i % lineEdges.length], edgeMat); mesh.add(edges);
    rocks.push({ mesh, edges, solidMat:mat, solidGeo:mesh.geometry, lineGeo:lineGeos[i % lineGeos.length],
      active:false, size:3, r:1, vel:new THREE.Vector3(), rot:new THREE.Vector3(), threat:false });
  }
  function applyRockStyle(){
    for (const k of rocks){
      k.mesh.geometry = lineArt ? k.lineGeo : k.solidGeo;
      k.mesh.material = lineArt ? lineFill : k.solidMat;
      k.edges.visible = lineArt;
    }
    for (const sh of shards) sh.mesh.material = shardMatFor(sh.hot);
  }
  function toggleRockStyle(){ lineArt = !lineArt; applyRockStyle(); }
  function spawnRock(size, pos, vel){
    const k = rocks.find(x => !x.active); if (!k) return null;
    k.active = true; k.size = size; k.r = SIZES[size].r;
    k.mesh.position.copy(pos); k.mesh.scale.setScalar(k.r); k.mesh.visible = true;
    k.mesh.rotation.set(Math.random()*6, Math.random()*6, Math.random()*6);
    k.vel.copy(vel);
    k.rot.set((Math.random()-0.5)*1.2, (Math.random()-0.5)*1.2, (Math.random()-0.5)*1.2);
    k.stun = 0;
    k.aimOff = (Math.random()-0.5) * 0.6; // each rock comes at you from a slightly different line
    k.aimY = (Math.random()-0.5) * 16;
    k.lane = Math.random() * Math.PI * 2; // the side (world bearing from the ship) this rock attacks from
    return k;
  }
  function rocksAlive(){ let n = 0; for (const k of rocks) if (k.active) n++; return n; }
  // hits still needed to clear the wave (a large rock = itself + 2 medium + 4 small = 7 hits)
  function hitsLeft(){ let n = 0; for (const k of rocks) if (k.active) n += k.size === 3 ? 7 : k.size === 2 ? 3 : 1; return n; }

  // --- pooled shard debris ---
  const shardGeo = new THREE.TetrahedronGeometry(0.4, 0);
  const shardMatCyan = new THREE.MeshStandardMaterial({ color:0x232a2e, emissive:0x8ff3ff, emissiveIntensity:0.5, roughness:0.8 });
  const shardMatHot  = new THREE.MeshStandardMaterial({ color:0x2a1a12, emissive:0xff8a3a, emissiveIntensity:0.9, roughness:0.8 });
  const shardLineCyan = new THREE.MeshBasicMaterial({ color:0xd1faff, wireframe:true });
  const shardLineHot  = new THREE.MeshBasicMaterial({ color:0xff9a4a, wireframe:true });
  const shardLineRed  = new THREE.MeshBasicMaterial({ color:0xfc4340, wireframe:true });
  function shardMatFor(hot){
    if (hot === 'red') return shardLineRed;
    return lineArt ? (hot ? shardLineHot : shardLineCyan) : (hot ? shardMatHot : shardMatCyan);
  }
  const shards = [];
  for (let i=0;i<90;i++){
    const mesh = new THREE.Mesh(shardGeo, shardMatCyan); mesh.visible = false; scene.add(mesh);
    shards.push({ mesh, vel:new THREE.Vector3(), rot:new THREE.Vector3(), life:0, maxLife:1, active:false });
  }
  function spawnFracture(position, scale, count, hot, baseVel){
    let n = 0;
    for (const sh of shards){
      if (sh.active) continue;
      sh.active = true; sh.mesh.visible = true; sh.hot = hot;
      sh.mesh.material = shardMatFor(hot);
      sh.mesh.position.copy(position);
      sh.mesh.scale.setScalar(0.4 + Math.random()*0.5*Math.min(scale,3));
      const sp = hot ? 22 : 14;
      sh.vel.set((Math.random()-0.5)*sp, (Math.random()-0.5)*sp, (Math.random()-0.5)*sp);
      if (baseVel) sh.vel.add(baseVel);
      sh.rot.set((Math.random()-0.5)*6, (Math.random()-0.5)*6, (Math.random()-0.5)*6);
      sh.maxLife = sh.life = 0.5 + Math.random()*(hot ? 0.7 : 0.4);
      if (++n >= count) break;
    }
  }
  function updateShards(dt){
    for (const sh of shards){
      if (!sh.active) continue;
      sh.life -= dt;
      if (sh.life <= 0){ sh.active = false; sh.mesh.visible = false; continue; }
      sh.vel.multiplyScalar(1 - 2.4*dt);
      sh.mesh.position.addScaledVector(sh.vel, dt);
      sh.mesh.rotation.x += sh.rot.x*dt; sh.mesh.rotation.y += sh.rot.y*dt; sh.mesh.rotation.z += sh.rot.z*dt;
      sh.mesh.scale.multiplyScalar(0.985 + 0.015*Math.max(0, sh.life/sh.maxLife));
    }
  }

  // ---------------------------------------------------------------
  // PHASERS
  // ---------------------------------------------------------------
  function glowTexture(inner, outer){
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d'), g = ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0, inner); g.addColorStop(0.25, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(c);
  }
  const impactTex = glowTexture('rgba(255,240,220,1)', 'rgba(255,138,58,0.55)');
  const beamCoreMat = new THREE.MeshBasicMaterial({ color:0xffe2c4, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
  const beamGlowMat = new THREE.MeshBasicMaterial({ color:0xff6a1f, transparent:true, opacity:0.45, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const beams = [];
  for (let i=0;i<4;i++){
    const g = new THREE.Group();
    const core = new THREE.Mesh(beamGeo, beamCoreMat.clone()); core.scale.set(0.08, 1, 0.08);
    const glow = new THREE.Mesh(beamGeo, beamGlowMat.clone()); glow.scale.set(0.34, 1, 0.34);
    g.add(core); g.add(glow); g.visible = false; scene.add(g);
    beams.push({ g, core, glow, life:0, side:1, target:null, end:new THREE.Vector3() });
  }
  const impacts = [];
  for (let i=0;i<6;i++){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:impactTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }));
    sp.visible = false; scene.add(sp); impacts.push({ sp, life:0, size:6 });
  }
  function spawnImpact(pos, size){
    const im = impacts.find(i => i.life <= 0) || impacts[0];
    im.sp.position.copy(pos); im.size = size; im.life = 0.3; im.sp.visible = true;
  }
  const _up = new THREE.Vector3(0,1,0), _a = new THREE.Vector3(), _d = new THREE.Vector3();
  function placeBeam(b){
    _a.set(2.4*b.side, -2.1, -2.5).applyMatrix4(camera.matrixWorld); // emitters below/beside the viewscreen
    if (b.target && b.target.active) b.end.copy(b.target.mesh.position);
    _d.subVectors(b.end, _a);
    const len = _d.length();
    b.g.position.copy(_a).addScaledVector(_d, 0.5);
    b.g.quaternion.setFromUnitVectors(_up, _d.normalize());
    b.g.scale.set(1, len, 1);
  }

  // ---------------------------------------------------------------
  // HOSTILE SAUCERS — classic Asteroids flying saucers, red line art
  //   large: slow, wanders, fires roughly at you (200 pts)
  //   small: from wave 3, faster, leads its shots (1,000 pts)
  // ---------------------------------------------------------------
  const SAUCER_RED = 0xfc4340;
  function makeSaucer(){
    // side profile (radius, height), spun into rings + meridians, like the 1979 saucer drawn in 3D
    const prof = [[0.0,0.62],[0.22,0.6],[0.36,0.36],[1.0,0.06],[1.0,-0.02],[0.62,-0.3],[0.0,-0.32]];
    const pts = [], SEG = 40, MER = 8;
    for (let i=1;i<prof.length-1;i++){
      const [r, y] = prof[i];
      for (let k=0;k<SEG;k++){
        const a0 = k/SEG*Math.PI*2, a1 = (k+1)/SEG*Math.PI*2;
        pts.push(Math.cos(a0)*r, y, Math.sin(a0)*r, Math.cos(a1)*r, y, Math.sin(a1)*r);
      }
    }
    for (let m=0;m<MER;m++){
      const a = m/MER*Math.PI*2, c = Math.cos(a), sn = Math.sin(a);
      for (let i=0;i<prof.length-1;i++){
        const [r0,y0] = prof[i], [r1,y1] = prof[i+1];
        pts.push(c*r0, y0, sn*r0, c*r1, y1, sn*r1);
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const g = new THREE.Group();
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color:SAUCER_RED }));
    const fill = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r,y]) => new THREE.Vector2(r*0.98, y)), 24),
      new THREE.MeshBasicMaterial({ color:0x0a0203, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1 }));
    g.add(fill); g.add(lines); g.visible = false; scene.add(g);
    return g;
  }
  const saucers = [makeSaucer(), makeSaucer()].map(mesh => ({ mesh, active:false, isSaucer:true, small:false, r:4,
    vel:new THREE.Vector3(), life:0, turnT:0, fireT:0, threat:true }));
  const boltTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(255,235,230,1)'); g.addColorStop(0.3,'rgba(252,67,64,0.9)'); g.addColorStop(1,'rgba(252,67,64,0)');
    x.fillStyle = g; x.fillRect(0,0,64,64); return new THREE.CanvasTexture(c);
  })();
  const bolts = [];
  for (let i=0;i<16;i++){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:boltTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }));
    sp.scale.setScalar(2.6); sp.visible = false; scene.add(sp);
    bolts.push({ sp, vel:new THREE.Vector3(), life:0 });
  }
  const BOLT_SPEED = 70;
  let saucerTimer = 35, saucerAlert = 0, hostileBehind = Infinity;

  function spawnSaucer(){
    const s = saucers.find(x => !x.active); if (!s) return;
    s.small = wave >= 3 && Math.random() < Math.min(0.75, 0.25 + (wave-3)*0.15);
    s.r = s.small ? 2.4 : 4.4;
    s.mesh.scale.setScalar(s.r);
    const a = Math.random()*Math.PI*2, d = 230;
    s.mesh.position.set(ship.pos.x + Math.cos(a)*d, (Math.random()*2-1)*ALT_BAND*0.6, ship.pos.z + Math.sin(a)*d);
    // head roughly across your area, passing somewhere near you
    _d.set(ship.pos.x + (Math.random()-0.5)*120 - s.mesh.position.x, 0, ship.pos.z + (Math.random()-0.5)*120 - s.mesh.position.z).normalize();
    s.vel.copy(_d).multiplyScalar(s.small ? 26 : 16);
    s.life = 26; s.turnT = 2 + Math.random()*2; s.fireT = 1.5 + Math.random();
    s.active = true; s.mesh.visible = true;
    saucerAlert = 2.5;
    startWarble(s);
  }
  function removeSaucer(s){
    s.active = false; s.mesh.visible = false; stopWarble(s);
    if (lockTarget === s) lockTarget = null;
  }
  function destroySaucer(s, byPhaser){
    spawnFracture(s.mesh.position, 3, 18, 'red', s.vel);
    spawnImpact(s.mesh.position, s.r * 3.5);
    if (byPhaser) score += (s.small ? 1000 : 200) * (thrustAmt > 0.5 ? 2 : 1);
    sfxBoom(true);
    removeSaucer(s);
  }
  function saucerFire(s){
    const b = bolts.find(x => x.life <= 0); if (!b) return;
    const from = s.mesh.position;
    if (s.small){
      // lead the target: aim where you'll be when the bolt arrives
      const t = from.distanceTo(ship.pos) / BOLT_SPEED;
      _a.copy(ship.pos).addScaledVector(shipVel, t * 0.9);
    } else {
      _a.copy(ship.pos);
      _a.x += (Math.random()-0.5)*40; _a.y += (Math.random()-0.5)*14; _a.z += (Math.random()-0.5)*40;
    }
    b.vel.subVectors(_a, from).normalize().multiplyScalar(BOLT_SPEED);
    b.sp.position.copy(from); b.life = 3.6; b.sp.visible = true;
    sfxSaucerShot(from.distanceTo(ship.pos));
  }

  function updateSaucers(dt, flying, best, bestDist){
    hostileBehind = Infinity;
    if (flying && waveBreak <= 0){
      saucerTimer -= dt;
      if (saucerTimer <= 0){
        spawnSaucer();
        saucerTimer = wave === 1 ? 999 : Math.max(9, 30 - wave*4) + Math.random()*10; // round 1: just the one
      }
    }
    if (saucerAlert > 0) saucerAlert -= dt;
    for (const s of saucers){
      if (!s.active) continue;
      const p = s.mesh.position;
      s.life -= dt;
      if (s.life <= 0){ removeSaucer(s); continue; }
      // classic zig-zag: change course every couple of seconds
      s.turnT -= dt;
      if (s.turnT <= 0){
        s.turnT = 1.6 + Math.random()*1.8;
        const ang = (Math.random()-0.5) * 1.3, c = Math.cos(ang), sn = Math.sin(ang);
        const vx = s.vel.x*c - s.vel.z*sn, vz = s.vel.x*sn + s.vel.z*c; s.vel.x = vx; s.vel.z = vz;
        s.vel.y = (Math.random()-0.5) * 8;
      }
      p.addScaledVector(s.vel, dt);
      if (Math.abs(p.y) > ALT_BAND){ p.y = Math.sign(p.y)*ALT_BAND; s.vel.y *= -1; }
      p.x = wrapNear(p.x, ship.pos.x, SECTOR); p.z = wrapNear(p.z, ship.pos.z, SECTOR);
      s.mesh.rotation.y += dt * 1.6;
      s.mesh.rotation.z = Math.sin(camT*2 + s.r) * 0.08;

      _rel.subVectors(p, ship.pos);
      const dist = _rel.length();
      updateWarble(s, dist);
      if (flying){
        s.fireT -= dt;
        if (s.fireT <= 0 && dist < 210){ saucerFire(s); s.fireT = s.small ? 1.1 + Math.random()*0.6 : 1.7 + Math.random()*0.9; }
        if (invuln <= 0 && dist < s.r + 2.4){ damageShip(70, p); destroySaucer(s, false); continue; }
      }
      if (_rel.dot(fwd) < 0 && dist < 140) hostileBehind = Math.min(hostileBehind, dist);

      _cam.copy(p).applyMatrix4(camera.matrixWorldInverse);
      let onScreen = false;
      if (_cam.z < -2){
        _proj.copy(p).project(camera);
        const sx = (_proj.x + 1) * 0.5 * W, sy = (1 - _proj.y) * 0.5 * H;
        onScreen = sx > 40 && sx < W-40 && sy > 40 && sy < H-40;
        // hostiles win the lock over rocks if they're inside the reticle at all
        if (!keys.rear && dist < LOCK_RANGE && Math.hypot(sx - RETICLE_CX, sy - RETICLE_CY) < RETICLE_R){
          if (!best || !best.isSaucer || dist < bestDist){ best = s; bestDist = dist; }
        }
      }
      if (!onScreen && dist < 200) edgeList.push({ x:_cam.x, y:_cam.y, d:Math.min(dist, 20), threat:true });
    }
    // bolts
    for (const b of bolts){
      if (b.life <= 0) continue;
      b.life -= dt;
      if (b.life <= 0){ b.sp.visible = false; continue; }
      b.sp.position.addScaledVector(b.vel, dt);
      b.sp.scale.setScalar(2.2 + Math.sin(camT*40)*0.4);
      if (flying && invuln <= 0 && b.sp.position.distanceTo(ship.pos) < 2.8){
        b.life = 0; b.sp.visible = false; damageShip(45, b.sp.position); continue;
      }
      // saucer shots break any rock they hit, like the original
      for (const k of rocks){
        if (k.active && b.sp.position.distanceTo(k.mesh.position) < k.r){ splitRock(k, false); b.life = 0; b.sp.visible = false; break; }
      }
    }
    return { best, bestDist };
  }

  // ---------------------------------------------------------------
  // INPUT — mouse turns (pointer lock), keys dodge / thrust / fire
  // ---------------------------------------------------------------
  const keys = { turnL:false, turnR:false, strafeL:false, strafeR:false, up:false, down:false, thrust:false, brake:false, rear:false };
  const keyMap = { ArrowLeft:'turnL', ArrowRight:'turnR', ArrowUp:'up', ArrowDown:'down',
                   a:'strafeL', A:'strafeL', d:'strafeR', D:'strafeR', w:'up', W:'up', s:'down', S:'down',
                   Shift:'thrust', e:'thrust', E:'thrust', q:'brake', Q:'brake', c:'rear', C:'rear' };
  const codeMap = { KeyA:'strafeL', KeyD:'strafeR', KeyW:'up', KeyS:'down', KeyE:'thrust', KeyQ:'brake', KeyC:'rear',
                    ShiftLeft:'thrust', ShiftRight:'thrust', ArrowLeft:'turnL', ArrowRight:'turnR', ArrowUp:'up', ArrowDown:'down' };
  let mouseDX = 0, hadLock = false;
  window.addEventListener('keydown', e => {
    const k = keyMap[e.key] || codeMap[e.code];
    if (mission === 'ready' || (paused && mission === 'flying' && e.key !== 'Escape')) engage();
    else if (mission === 'lost' && e.key === 'Enter') engage();
    if (k){ keys[k] = true; e.preventDefault(); }
    if (e.code === 'Space'){ e.preventDefault(); if (!e.repeat){ firing = true; fireQueued = true; } }
    if (e.key === 'm' || e.key === 'M') toggleMute();
    if (e.key === 'f' || e.key === 'F') toggleWeight();
    if (e.key === 'l' || e.key === 'L') toggleRockStyle();
    if (e.key === 'Escape' && mission === 'flying' && !paused) pause();
  });
  window.addEventListener('keyup', e => {
    const k = keyMap[e.key] || codeMap[e.code];
    if (k){ keys[k] = false; e.preventDefault(); }
    if (e.code === 'Space') firing = false;
  });
  stage.addEventListener('mousemove', e => {
    if (document.pointerLockElement === stage) mouseDX += e.movementX || 0;
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === stage) hadLock = true;
    else if (hadLock && mission === 'flying' && !paused) pause();
  });

  const engageEl = $('engage');
  let engageHideT = 0;
  const ov = { scoreLbl:$('ov-score-lbl'), score:$('ov-score'), title:$('ov-title'), sub:$('ov-sub'), btn:$('ov-btn-txt') };
  const NUM_WORDS = ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE',
    'THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN','TWENTY'];
  function numWord(n){ return NUM_WORDS[n] || String(n); }
  let engaged = false, paused = true, mission = 'ready'; // ready | flying | lost
  // one layout for every screen (Figma "Gamescreen Overlay"): score, big title, two-line subtitle, pill button, key bar
  // ---- fixed-width digits: each digit gets a cell as wide as the widest digit in the current font ----
  const _mc = document.createElement('canvas').getContext('2d');
  const _monoW = new Map();
  function monoCell(elm){
    const cs = getComputedStyle(elm);
    const key = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    let w = _monoW.get(key);
    if (w === undefined){
      _mc.font = key; w = 0;
      for (let d = 0; d < 10; d++) w = Math.max(w, _mc.measureText(String(d)).width);
      w = { all: w, one: _mc.measureText('1').width };
      _monoW.set(key, w);
    }
    const ls = parseFloat(cs.letterSpacing) || 0;
    return { key, w: w.all + ls, w1: w.one + ls };
  }
  if (document.fonts) document.fonts.addEventListener('loadingdone', () => _monoW.clear());
  // tightOne: a '1' keeps its own narrow width instead of a full cell (used for SCORE, which changes in steps,
  // so the occasional width change when a 1 appears is fine; the timer keeps full cells so it never shifts)
  function setMono(elm, str, tightOne){
    str = String(str);
    const c = monoCell(elm);
    if (elm._mono === str && elm._monoK === c.key && elm._monoW === c.w) return;
    elm._mono = str; elm._monoK = c.key; elm._monoW = c.w;
    let h = '';
    for (const ch of str){
      if (ch >= '0' && ch <= '9'){
        const w = (tightOne && ch === '1') ? c.w1 : c.w;
        h += '<span class="dg" style="width:' + w.toFixed(2) + 'px">' + ch + '</span>';
      } else h += '<span class="sp">' + ch + '</span>';
    }
    elm.innerHTML = h;
  }
  function showOverlay(o){
    const showScore = o.score != null;
    ov.scoreLbl.hidden = ov.score.hidden = !showScore;
    if (showScore) setMono(ov.score, o.score.toLocaleString(), true);
    ov.title.textContent = o.title;
    ov.title.classList.toggle('cyan', !o.red);
    ov.sub.innerHTML = '<div class="l1">' + o.line1 + '</div><div class="l2">' + o.line2 + '</div>';
    ov.btn.textContent = o.button;
    clearTimeout(engageHideT);
    engageEl.hidden = false; void engageEl.offsetWidth; engageEl.classList.remove('out'); stage.classList.add('overlay-on');
  }
  function lockPointer(){
    try { const p = stage.requestPointerLock && stage.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch(e){}
  }
  function engage(){
    if (mission === 'lost') resetMission();
    mission = 'flying'; engaged = true; paused = false; stage.classList.remove('overlay-on');
    engageEl.classList.add('out'); clearTimeout(engageHideT); engageHideT = setTimeout(() => { if (!paused) engageEl.hidden = true; }, 460);
    try { window.focus(); stage.focus({ preventScroll:true }); } catch(e){}
    lockPointer(); audio(); clock.getDelta();
  }
  function pause(){
    paused = true; firing = false; for (const k in keys) keys[k] = false;
    const hl = hitsLeft();
    showOverlay({ score, title:'PAUSED', line1:'ROUND ' + numWord(wave) + ' &nbsp;•&nbsp; ' + fmtTime(waveTime) + ' LEFT',
      line2: waveBreak > 0 ? 'ROUND ' + numWord(wave+1) + ' INCOMING' : hl + (hl === 1 ? ' HIT' : ' HITS') + ' TO CLEAR', button:'CLICK TO RESUME' });
    if (document.pointerLockElement === stage) try { document.exitPointerLock(); } catch(e){}
  }
  // no preventDefault: it would stop the frame from taking keyboard focus
  stage.addEventListener('pointerdown', () => {
    if (!engaged || paused){ engage(); return; }
    if (document.pointerLockElement !== stage) lockPointer();
    firing = true; fireQueued = true;
  });
  window.addEventListener('pointerup', () => { firing = false; });
  window.addEventListener('blur', () => { if (mission === 'flying' && !paused) pause(); });

  // ---------------------------------------------------------------
  // SOUND (Web Audio, synthesized)
  // ---------------------------------------------------------------
  let actx = null, muted = false, engine = null;
  const muteEl = $('mute');
  function audio(){
    if (!actx){ try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
    ensureEngine();
    return muted ? null : actx;
  }
  function ensureEngine(){
    if (engine || !actx) return;
    const len = actx.sampleRate * 2, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i=0;i<len;i++){ last = (last + 0.02*(Math.random()*2-1)) / 1.02; d[i] = last * 3.5; }
    const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
    const g = actx.createGain(); g.gain.value = 0;
    src.connect(lp); lp.connect(g); g.connect(actx.destination); src.start();
    engine = { lp, g };
  }
  function updateEngine(t, speedFrac){
    if (!engine) return;
    const now = actx.currentTime, on = !muted && mission === 'flying' && !paused;
    engine.g.gain.setTargetAtTime(on ? 0.03 + speedFrac*0.06 + t*0.24 : 0, now, 0.12);
    engine.lp.frequency.setTargetAtTime(110 + speedFrac*80 + t*300, now, 0.15);
  }
  function toggleMute(){ muted = !muted; muteEl.textContent = muted ? 'SOUND OFF' : 'SOUND ON'; }
  function sfxPhaser(){
    const ac = audio(); if (!ac) return;
    const t = ac.currentTime, out = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.09, t+0.02); out.gain.exponentialRampToValueAtTime(0.0001, t+0.32);
    lp.connect(out); out.connect(ac.destination);
    [880, 886, 1320].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = i === 2 ? 'square' : 'sawtooth';
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f*0.82, t+0.3);
      const g = ac.createGain(); g.gain.value = i === 2 ? 0.25 : 0.5;
      o.connect(g); g.connect(lp); o.start(t); o.stop(t+0.34);
    });
  }
  function sfxBoom(big){
    const ac = audio(); if (!ac) return;
    const t = ac.currentTime, len = big ? 0.9 : 0.5;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate*len), ac.sampleRate), d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 2);
    const src = ac.createBufferSource(); src.buffer = buf;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(big ? 900 : 1400, t);
    lp.frequency.exponentialRampToValueAtTime(120, t+len);
    const g = ac.createGain(); g.gain.value = big ? 0.5 : 0.32;
    src.connect(lp); lp.connect(g); g.connect(ac.destination); src.start(t);
  }
  // saucer warble: two-tone square wave, louder as it gets closer (large = low, small = high)
  function startWarble(s){
    const ac = audio(); if (!ac) return;
    const o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'square'; o.frequency.value = s.small ? 880 : 440;
    lfo.type = 'square'; lfo.frequency.value = s.small ? 9 : 5; lg.gain.value = s.small ? 160 : 80;
    lfo.connect(lg); lg.connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 1800; g.gain.value = 0;
    o.connect(lp); lp.connect(g); g.connect(ac.destination); o.start(); lfo.start();
    s.snd = { o, lfo, g };
  }
  function updateWarble(s, dist){
    if (!s.snd || !actx) return;
    const v = (muted || paused) ? 0 : 0.05 * clamp(1 - dist/260, 0, 1);
    s.snd.g.gain.setTargetAtTime(v, actx.currentTime, 0.1);
  }
  function stopWarble(s){
    if (!s.snd) return;
    try { s.snd.o.stop(); s.snd.lfo.stop(); } catch(e){}
    s.snd = null;
  }
  function sfxSaucerShot(dist){
    const ac = audio(); if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(260, t+0.18);
    g.gain.setValueAtTime(0.06 * clamp(1 - dist/260, 0.15, 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t+0.2);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.22);
  }
  function sfxImpact(){
    const ac = audio(); if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t+0.4);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t+0.45);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.5);
    sfxBoom(false);
  }

  // ---------------------------------------------------------------
  // HUD ELEMENTS
  // ---------------------------------------------------------------
  const el = {
    velocity:$('velocity'), time:$('time'), range:$('range'), reticle:$('reticle'),
    warning:$('warning'), ptr:$('compass-ptr'), altL:$('alt-l'), altR:$('alt-r'), altLTxt:$('alt-l-txt'), altRTxt:$('alt-r-txt'),
    shipHit:$('ship-hit'), shieldNum:$('shield-num'), shieldWord:$('shield-word'), shieldStatus:$('shield-status'),
    score:$('score'), dist:$('dist'), energy:$('energy'), lock:$('lock'), hit:$('hit-flash'), pflash:$('phaser-flash'), rear:$('rear')
  };
  const shieldBlock = $('shield');
  shieldBlock.addEventListener('animationend', () => shieldBlock.classList.remove('hit'));
  const segL = Array.from(document.querySelectorAll('#meter-l path'));
  const segR = Array.from(document.querySelectorAll('#meter-r path'));
  const SEGS = segL.length;
  let litShown = -1;
  // 17 segments per side drain from the outside in. Lit = cyan (red once shields are critical);
  // spent segments drop to a faint trace so the remaining charge reads at a glance.
  let meterCrit = null;
  function setShieldMeter(frac){
    const lit = shield > 0 ? Math.max(1, Math.ceil(frac * SEGS - 0.001)) : 0;
    const crit = frac <= 1/3;
    if (lit === litShown && crit === meterCrit) return; litShown = lit; meterCrit = crit;
    for (let i=0;i<SEGS;i++){
      const on = i < lit, c = on ? (crit ? '#FC4340' : '#0BD5ED') : '#044760';
      for (const seg of [segL[i], segR[i]]){ seg.setAttribute('fill', c); seg.setAttribute('fill-opacity', on ? '1' : '0.35'); }
    }
    shieldBlock.classList.toggle('crit', crit);
  }
  const TAPE_ZERO = 542.5, TAPE_PX_PER_UNIT = 0.74;
  function tapeY(v){ return TAPE_ZERO - clamp(v, -200, 200) * TAPE_PX_PER_UNIT; }
  function fmtM(v){ const r = Math.round(v); return (r > 0 ? '+' : '') + r + 'M'; }

  // edge arrows for close rocks you can't see (behind you or off-screen)
  const edgeEls = [];
  for (let i=0;i<6;i++){ const d = document.createElement('div'); d.className = 'edge'; $('edges').appendChild(d); edgeEls.push(d); }

  // radar
  const radar = $('radar'), rctx = radar.getContext('2d');
  const RADAR_RANGE = 210, RC = 200, RR = 200, RS = 1.6; // canvas is 400px for the 112px scope inside the Figma ring; RS scales marks

  // Eurostile Extended (Adobe kit) when available, Michroma fallback otherwise
  const typetag = $('typetag');
  let euro = false, heavy = true;
  function showWeight(){
    document.documentElement.style.setProperty('--ext-w', heavy ? 900 : 400);
    typetag.textContent = 'F  EUROSTILE EXT ' + (heavy ? 'BLACK' : 'MEDIUM');
  }
  function toggleWeight(){ if (!euro) return; heavy = !heavy; showWeight(); }
  const fontLoads = document.fonts ? Promise.all(['400 12px "eurostile-extended"', '900 12px "eurostile-extended"']
    .map(f => document.fonts.load(f).catch(() => []))) : Promise.resolve([]);
  fontLoads.then(() => {
    euro = !!document.fonts && [...document.fonts].some(f => f.family.replace(/"/g,'') === 'eurostile-extended' && f.status === 'loaded');
    stage.classList.toggle('no-euro', !euro);
    if (euro){ typetag.hidden = false; showWeight(); }
  });

  // ---------------------------------------------------------------
  // GAME STATE
  // ---------------------------------------------------------------
  const SHIELD_MAX = 257, WAVE_TIME = 74.03; // 01:14:03 = 1 min 14.03 s per wave
  const THRUST_ACC = 40, MAX_SPEED = 75, DRIFT_DRAG = 0.16, BRAKE_DEC = 60;
  const TURN_RATE = 1.9, MOUSE_TURN = 0.0024;
  const STRAFE_ACC = 70, STRAFE_DRAG = 3.0, STRAFE_MAX = 34, ALT_MAX = 40;
  const ship = { pos:new THREE.Vector3(), vel:new THREE.Vector3(), yaw:0, yawRate:0, strafeV:0, vy:0 };
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), shipVel = new THREE.Vector3();
  let shield = SHIELD_MAX, flashTimer = 0, regenDelay = 0, impactNote = 0, invuln = 0;
  let score = 0, energy = 100, cooldown = 0, energyDelay = 0, firing = false, nextSide = 1;
  let timeBump = 0, fireQueued = false;
  let wave = 1, waveTime = WAVE_TIME, waveBreak = 0, wavesCleared = 0;
  let thrustAmt = 0, brakeAmt = 0, lockTarget = null, camT = 0;

  function fmtTime(s){
    const m = Math.floor(s/60), sec = Math.floor(s%60), cs = Math.floor((s%1)*100);
    return [m,sec,cs].map(v => String(v).padStart(2,'0')).join(':');
  }

  function startWave(n){
    // difficulty ramp (fixed clock every round, no time added):
        const count = 3 + n; // round 1 = 4 large rocks (28 hits); they now come to you, so less time is spent hunting
    const p = new THREE.Vector3(), v = new THREE.Vector3();
    // Rocks are spread evenly around you, each with its own attack side ("lane"), so they don't bunch up.
    // From round 3 they come as a pincer: 3 fronts (4 from round 5, 5 from round 7), evenly spaced and all
    // starting at the same range, so they arrive at about the same time from different sides.
    const pincer = n >= 3;
    const fronts = pincer ? Math.min(count, 1 + Math.ceil(n/2)) : count;
    const rot0 = Math.random() * Math.PI * 2;
    for (let i=0;i<count;i++){
      const base = rot0 + (i % fronts) * Math.PI * 2 / fronts;
      // extra rocks on the same front sit off to one side and a bit further out, so a front is a spread, not a queue
      const row = Math.floor(i / fronts), sideOff = row === 0 ? 0 : (row % 2 ? 1 : -1) * 0.4;
      const b = pincer ? base + sideOff + (Math.random()-0.5)*0.2 : base + (Math.random()-0.5) * (Math.PI*2/fronts) * 0.5;
      const dist = pincer ? 150 + Math.random()*15 + row * 22 : 95 + Math.random()*75;
      p.set(ship.pos.x + Math.cos(b)*dist, (Math.random()*2-1)*ALT_BAND*0.8, ship.pos.z + Math.sin(b)*dist);
      const sp = 6 + Math.random()*4; // gentle drift inward to start; homing takes over from there
      v.set(-Math.cos(b)*sp, (Math.random()-0.5)*2, -Math.sin(b)*sp);
      const k = spawnRock(3, p, v);
      if (k) k.lane = b;
    }
    waveTime = WAVE_TIME;
    // saucers: round 1 gets one late visitor; later rounds bring them sooner and more often
    saucerTimer = n === 1 ? 40 : Math.max(8, 22 - n*3) + Math.random()*6;
  }

  function splitRock(k, byPhaser){
    const size = k.size, pos = k.mesh.position.clone(), vel = k.vel.clone(), lane = k.lane;
    k.active = false; k.mesh.visible = false;
    if (lockTarget === k) lockTarget = null;
    spawnFracture(pos, k.r, size === 3 ? 16 : size === 2 ? 10 : 7, byPhaser, vel);
    spawnImpact(pos, k.r * 3);
    if (byPhaser){
      score += SIZES[size].pts * (thrustAmt > 0.5 ? 2 : 1); // kills while thrusting count double
    }
    sfxBoom(size === 3);
    if (size > 1){
      // classic split: two smaller rocks peel off at right angles to the parent's path
      const side = new THREE.Vector3(-vel.z, 0, vel.x);
      if (side.lengthSq() < 0.01) side.set(1, 0, 0);
      side.normalize();
      for (const s of [1, -1]){
        const v = vel.clone().multiplyScalar(1.15).addScaledVector(side, s*(6 + Math.random()*7));
        v.y += (Math.random()-0.5)*4;
        const child = spawnRock(size - 1, pos.clone().addScaledVector(side, s*SIZES[size-1].r*1.2), v);
        if (child){
          child.stun = byPhaser ? 0.6 : 1.6; // scatter briefly before homing again
          // the pieces don't follow each other in: each swings out to its own flank (wider in later rounds)
          const fan = (wave >= 3 ? 1.1 : 0.7) + Math.random()*0.5;
          child.lane = lane + s * fan;
        }
      }
    }
  }

  // --- hull damage sections on the ship outline (see .dmg in the CSS)
  const DMG = { aft:$('dmg-aft'), bridge:$('dmg-bridge'), nose:$('dmg-nose'), pod:$('dmg-pod') };
  const dmgLevel = { aft:0, bridge:0, nose:0, pod:0 };
  const _hd = new THREE.Vector3();
  function paintDamage(){ for (const k in DMG) DMG[k].className = 'dmg' + (dmgLevel[k] ? ' l' + dmgLevel[k] : ''); }
  function hitSection(fromPos){
    // which part of the profile faces the hit: front → nose, behind → aft, below → lower pod, otherwise bridge
    _hd.subVectors(fromPos, ship.pos);
    const f = _hd.dot(fwd), sd = Math.abs(_hd.dot(right)), u = _hd.y;
    if (u < -2.5 && -u > Math.abs(f) * 0.6) return 'pod';
    if (Math.abs(f) > sd * 0.8) return f > 0 ? 'nose' : 'aft';
    return 'bridge';
  }
  function damageSection(fromPos){
    const k = hitSection(fromPos);
    dmgLevel[k] = Math.min(3, dmgLevel[k] + 1);
    paintDamage();
    DMG[k].classList.add('flash');
    setTimeout(() => DMG[k].classList.remove('flash'), 140);
  }
  function repairDamage(all){ for (const k in dmgLevel) dmgLevel[k] = all ? 0 : Math.max(0, dmgLevel[k] - 1); paintDamage(); }

  function damageShip(amount, fromPos){
    if (shield <= 0){ sfxImpact(); endMission('HULL BREACH'); return false; }
    shield = Math.max(0, shield - amount - Math.random()*10);
    flashTimer = 0.18; regenDelay = 2.5; impactNote = 1.2; invuln = 0.8;
    el.hit.classList.add('on'); el.shipHit.classList.add('on'); damageSection(fromPos);
    shieldBlock.classList.remove('hit'); void shieldBlock.offsetWidth; shieldBlock.classList.add('hit');
    setTimeout(() => { el.hit.classList.remove('on'); el.shipHit.classList.remove('on'); }, 160);
    sfxImpact();
    // bump: the impact shoves you away from whatever hit you
    _d.subVectors(ship.pos, fromPos).setY(0);
    if (_d.lengthSq() > 0.001) ship.vel.addScaledVector(_d.normalize(), 14);
    return true;
  }
  function registerHit(k){
    if (damageShip(k.size === 3 ? 60 : k.size === 2 ? 42 : 28, k.mesh.position)) splitRock(k, false);
  }

  function endMission(reason){
    mission = 'lost'; paused = true; firing = false;
    for (const k in keys) keys[k] = false;
    if (document.pointerLockElement === stage) try { document.exitPointerLock(); } catch(e){}
    // only mention rounds cleared when there were some, so a failure never reads like an achievement
    const cleared = wavesCleared > 0 ? ' &nbsp;•&nbsp; ' + wavesCleared + (wavesCleared === 1 ? ' ROUND' : ' ROUNDS') + ' CLEARED' : '';
    showOverlay({ score, title:'MISSION FAILED', red:true, line1:reason, line2:'ROUND ' + numWord(wave) + cleared, button:'CLICK TO TRY AGAIN' });
  }

  function resetMission(){
    for (const k of rocks){ k.active = false; k.mesh.visible = false; }
    for (const sh of shards){ sh.active = false; sh.mesh.visible = false; }
    ship.pos.set(0,0,0); ship.vel.set(0,0,0); ship.yaw = 0; ship.yawRate = 0; ship.strafeV = 0; ship.vy = 0;
    shield = SHIELD_MAX; score = 0; energy = 100; cooldown = 0; regenDelay = 0; impactNote = 0; flashTimer = 0; invuln = 0;
    repairDamage(true);
    wave = 1; wavesCleared = 0; waveBreak = 0; lockTarget = null; litShown = -1;
    for (const sc of saucers) removeSaucer(sc);
    for (const b of bolts){ b.life = 0; b.sp.visible = false; }
    saucerTimer = 35; saucerAlert = 0;
    startWave(1);
  }

  function fire(){
    if (cooldown > 0 || energy < 10 || keys.rear) return;
    cooldown = 0.24; energy -= 10; energyDelay = 0.5;
    const b = beams.find(x => x.life <= 0) || beams[0];
    b.side = nextSide; nextSide *= -1; b.life = 0.2; b.g.visible = true; b.target = lockTarget;
    if (lockTarget){
      b.end.copy(lockTarget.mesh.position);
      spawnImpact(lockTarget.mesh.position, 3 + lockTarget.r);
      if (lockTarget.isSaucer) destroySaucer(lockTarget, true); else splitRock(lockTarget, true);
      b.target = null;
    } else {
      b.end.set(0, 0, -260).applyMatrix4(camera.matrixWorld);
    }
    el.pflash.classList.add('on'); setTimeout(() => el.pflash.classList.remove('on'), 90);
    sfxPhaser();
  }

  // ---------------------------------------------------------------
  // LOOP
  // ---------------------------------------------------------------
  const clock = new THREE.Clock();
  const _proj = new THREE.Vector3(), _rel = new THREE.Vector3(), _rv = new THREE.Vector3(), _cam = new THREE.Vector3();
  const RETICLE_CX = 960, RETICLE_CY = 539.5, RETICLE_R = 175, LOCK_RANGE = 230;
  let hudTick = 0, jitterV = 0, jitterG = 0, banner = 0, lastBonus = 0;
  // --- advice line: one short hint telling you what to do about what's happening right now.
  // Most urgent wins; a hint stays up at least 2 s so it can be read, unless something more urgent replaces it.
  // When nothing is going on, a few one-time tips are shown (once per session each).
  const adviceEl = document.getElementById('advice');
  let advText = '', advPri = 99, advHold = 0, calmFor = 0, roundAge = 0;
  const TIPS = [
    'KILLS WHILE THRUSTING SCORE DOUBLE',
    'SHIELDS ONLY RECHARGE WHEN YOU CLEAR A ROUND',
    'SMALL ROCKS ARE THE FASTEST · TAKE THEM OUT FIRST',
    'HOLD C TO LOOK BEHIND YOU',
    'LEFTOVER TIME BECOMES BONUS POINTS',
  ];
  let tipIdx = 0;
  function pickAdvice(hl){
    const sh = shield / SHIELD_MAX;
    if (banner > 0) return [0, '+60 SHIELD · TIME BONUS +' + lastBonus.toLocaleString(), 'good'];
    if (threats.ahead < 35) return [1, 'DODGE WITH WASD · OR FIRE', ''];
    if (hostileBehind < 140) return [2, 'TURN AROUND · ONE HIT DESTROYS IT', ''];
    if (threats.behind < 60) return [3, 'HOLD C TO LOOK BACK · CHECK YOUR RADAR', ''];
    if (shield <= 0) return [4, 'ONE MORE HIT ENDS THE MISSION', 'warn'];
    if (sh <= 1/3) return [5, 'AVOID CONTACT · CLEAR THE ROUND FOR +60 SHIELD', 'warn'];
    if (energy < 15) return [6, 'PHASERS RECHARGING · EASE OFF THE TRIGGER', ''];
    if (waveBreak <= 0 && waveTime < 15) return [7, 'TIME RUNNING OUT · ' + hl + (hl === 1 ? ' HIT' : ' HITS') + ' LEFT', 'warn'];
    if (saucerAlert > 0) return [8, 'HOSTILE SAUCER · DODGE ITS FIRE', ''];
    if (waveBreak <= 0 && roundAge < 5) return [9, wave >= 3 ? 'INCOMING FROM MULTIPLE SIDES · WATCH THE RADAR' : wave === 1 ? 'ROCKS ARE CLOSING IN · WATCH THE RADAR' : 'MORE ROCKS · FASTER THIS TIME', ''];
    if (waveBreak <= 0 && hl > 0 && hl <= 3) return [10, 'FINAL ROCKS · CHECK YOUR RADAR', ''];
    if (calmFor > 4 && tipIdx < TIPS.length) return [11, TIPS[tipIdx], ''];
    return [99, '', ''];
  }
  function updateAdvice(dt, hl){
    roundAge = (waveBreak > 0 || waveTime >= WAVE_TIME - 0.001) ? 0 : roundAge + dt;
    if (advHold > 0) advHold -= dt;
    const [pri, text, tone] = pickAdvice(hl);
    calmFor = pri >= 10 ? calmFor + dt : 0;
    if (text === advText) { if (text) advHold = Math.max(advHold, 0.3); return; }
    if (advHold > 0 && pri >= advPri) return; // keep the current one readable
    if (advPri === 11 && text !== advText) { tipIdx++; calmFor = 0; } // a tip was shown — move on to the next one later
    advText = text; advPri = pri; advHold = text ? (pri === 11 ? 4 : 2) : 0;
    if (text){ adviceEl.textContent = text; adviceEl.className = 'abs trim on ' + tone; }
    else adviceEl.className = 'abs trim';
  }
  const threats = { ahead:Infinity, behind:Infinity };
  const edgeList = [];
  const lockLabel = document.querySelector('#lock em');

  applyRockStyle();
  startWave(1);

  let idleAmt = 1;
  function animate(){
    requestAnimationFrame(animate);
    // rawDt keeps running behind the start / pause screens so the scene stays alive (planet spin, star drift,
    // rock tumble, camera sway); gameplay uses dt, which is 0 while paused. Nothing jumps when you resume.
    const rawDt = Math.min(clock.getDelta(), 0.1);
    let dt = paused ? 0 : rawDt;
    camT += rawDt;
    idleAmt += ((paused ? 1 : 0) - idleAmt) * Math.min(1, rawDt * 1.4); // eases in behind overlays, out on resume
    const flying = mission === 'flying' && !paused;

    // --- turning: mouse (pointer lock) or ← → keys
    const turnTarget = ((keys.turnL ? 1 : 0) - (keys.turnR ? 1 : 0)) * TURN_RATE;
    ship.yawRate += (turnTarget - ship.yawRate) * Math.min(1, 8*dt);
    const mouseTurn = flying ? -mouseDX * MOUSE_TURN : 0; mouseDX = 0;
    ship.yaw += ship.yawRate*dt + mouseTurn;
    const turnFeel = dt > 0 ? ship.yawRate + mouseTurn/dt*0.15 : 0;
    fwd.set(-Math.sin(ship.yaw), 0, -Math.cos(ship.yaw));
    right.set(Math.cos(ship.yaw), 0, -Math.sin(ship.yaw));

    // --- thrust / brake / drift (classic inertia: you keep sliding until you brake or thrust elsewhere)
    if (keys.thrust) ship.vel.addScaledVector(fwd, THRUST_ACC*dt);
    const sp = ship.vel.length();
    if (keys.brake && sp > 0) ship.vel.multiplyScalar(Math.max(0, sp - BRAKE_DEC*dt) / sp);
    ship.vel.multiplyScalar(1 - DRIFT_DRAG*dt);
    if (ship.vel.length() > MAX_SPEED) ship.vel.setLength(MAX_SPEED);
    thrustAmt += ((keys.thrust ? 1 : 0) - thrustAmt) * Math.min(1, 4*dt);
    brakeAmt  += ((keys.brake  ? 1 : 0) - brakeAmt)  * Math.min(1, 4*dt);

    // --- dodge: quick sideways and up/down slides with heavy damping (same feel as v2)
    ship.strafeV += ((keys.strafeR ? 1 : 0) - (keys.strafeL ? 1 : 0)) * STRAFE_ACC*dt;
    ship.strafeV -= ship.strafeV*STRAFE_DRAG*dt;
    ship.strafeV = clamp(ship.strafeV, -STRAFE_MAX, STRAFE_MAX);
    ship.vy += ((keys.up ? 1 : 0) - (keys.down ? 1 : 0)) * STRAFE_ACC*dt;
    ship.vy -= ship.vy*STRAFE_DRAG*dt;
    ship.vy = clamp(ship.vy, -STRAFE_MAX, STRAFE_MAX);
    ship.pos.addScaledVector(ship.vel, dt);
    ship.pos.addScaledVector(right, ship.strafeV*dt);
    ship.pos.y = clamp(ship.pos.y + ship.vy*dt, -ALT_MAX, ALT_MAX);
    if (Math.abs(ship.pos.y) >= ALT_MAX) ship.vy = 0;
    shipVel.copy(ship.vel).addScaledVector(right, ship.strafeV); shipVel.y = ship.vy;

    // --- camera
    let shakeX = 0, shakeY = 0;
    if (dt > 0){ shakeX = (Math.random()-0.5)*0.25*thrustAmt; shakeY = (Math.random()-0.5)*0.25*thrustAmt; }
    if (flashTimer > 0){ flashTimer -= dt; shakeX += (Math.random()-0.5)*1.4; shakeY += (Math.random()-0.5)*1.4; }
    camera.position.copy(ship.pos);
    camera.position.y += Math.cos(camT*0.22)*0.8 + shakeY;
    camera.position.addScaledVector(right, Math.sin(camT*0.3)*0.8 + shakeX);
    camera.rotation.set(-ship.vy*0.004 + Math.sin(camT*0.09)*0.025*idleAmt,
      ship.yaw + (keys.rear ? Math.PI : 0) + Math.sin(camT*0.06)*0.09*idleAmt, // slow look-around behind overlays
      Math.sin(camT*0.18)*0.015 - ship.strafeV*0.008 - clamp(turnFeel, -2.5, 2.5)*0.05);
    const fov = 58 + thrustAmt*8 - brakeAmt*3;
    if (Math.abs(camera.fov - fov) > 0.01){ camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    sky.position.copy(camera.position);
    sky.rotation.y += rawDt * 0.0035; // distant stars wheel very slowly, always
    updatePlanets(rawDt);
    updateDust(camera.position, shipVel, clamp((shipVel.length() - 30) / 40, 0, 1) * (0.4 + 0.6*thrustAmt));

    // --- rocks
    let best = null, bestDist = Infinity;
    threats.ahead = threats.behind = Infinity;
    edgeList.length = 0;
    if (invuln > 0) invuln -= dt;
    for (const k of rocks){
      if (!k.active) continue;
      const p = k.mesh.position;
      // rocks home in on you: steer their drift toward the ship. Smaller pieces are faster and turn harder,
      // and every round makes them all quicker and more aggressive.
      if (k.stun > 0) k.stun -= dt;
      else if (flying){
        const r1 = wave - 1;
        const top  = k.size === 3 ? 12 + r1*2.2 : k.size === 2 ? 14 + r1*2.6 : 18 + r1*3;
        const turn = (k.size === 3 ? 0.22 : k.size === 2 ? 0.38 : 0.55) * (1 + r1*0.18);
        _d.subVectors(ship.pos, p); _d.y += k.aimY;
        // lane: if the rock isn't on its attack side yet, it arcs around you (staying out at range) until it is,
        // then comes straight in. Arcing, not cutting across, so it never just passes through you on the way.
        const rx = -_d.x, rz = -_d.z, rd = Math.hypot(rx, rz) || 1;
        let off = k.lane - Math.atan2(rz, rx);
        off = Math.atan2(Math.sin(off), Math.cos(off));
        if (Math.abs(off) > 0.45 && rd > 28){
          const nb = Math.atan2(rz, rx) + Math.max(-0.9, Math.min(0.9, off)), R = Math.max(40, rd * 0.92);
          _d.x = ship.pos.x + Math.cos(nb)*R - p.x; _d.z = ship.pos.z + Math.sin(nb)*R - p.z;
        } else {
          const c = Math.cos(k.aimOff), sn = Math.sin(k.aimOff), dx = _d.x*c - _d.z*sn, dz = _d.x*sn + _d.z*c;
          _d.x = dx; _d.z = dz;
        }
        _a.copy(_d).normalize().multiplyScalar(top);
        k.vel.lerp(_a, Math.min(1, turn*dt));
      }
      p.addScaledVector(k.vel, dt);
      if (Math.abs(p.y) > ALT_BAND){ p.y = Math.sign(p.y)*ALT_BAND; k.vel.y *= -1; }
      p.x = wrapNear(p.x, ship.pos.x, SECTOR); p.z = wrapNear(p.z, ship.pos.z, SECTOR);
      k.mesh.rotation.x += k.rot.x*rawDt; k.mesh.rotation.y += k.rot.y*rawDt; k.mesh.rotation.z += k.rot.z*rawDt; // tumble never stops

      _rel.subVectors(p, ship.pos);
      const dist = _rel.length();

      if (flying && invuln <= 0 && dist < k.r + 2.2){ registerHit(k); if (mission !== 'flying') break; continue; }

      // collision course? closest approach within the next 4 s
      _rv.subVectors(k.vel, shipVel);
      const rv2 = _rv.lengthSq();
      k.threat = false;
      if (rv2 > 0.01 && dist < 140){
        const t = -_rel.dot(_rv) / rv2;
        if (t > 0 && t < 4){
          const miss = _proj.copy(_rel).addScaledVector(_rv, t).length();
          if (miss < k.r + 4){
            k.threat = true;
            if (_rel.dot(fwd) >= 0) threats.ahead = Math.min(threats.ahead, dist); else threats.behind = Math.min(threats.behind, dist);
          }
        }
      }
      if (_rel.dot(fwd) < 0 && dist < 28 + k.r) threats.behind = Math.min(threats.behind, dist); // something right on your tail

      // screen position (also used for lock + edge arrows)
      _cam.copy(p).applyMatrix4(camera.matrixWorldInverse);
      const inFront = _cam.z < -2;
      let onScreen = false, sx = 0, sy = 0;
      if (inFront){
        _proj.copy(p).project(camera);
        sx = (_proj.x + 1) * 0.5 * W; sy = (1 - _proj.y) * 0.5 * H;
        onScreen = sx > 40 && sx < W-40 && sy > 40 && sy < H-40;
        if (!keys.rear && dist < LOCK_RANGE && Math.hypot(sx - RETICLE_CX, sy - RETICLE_CY) < RETICLE_R && dist < bestDist){ best = k; bestDist = dist; }
      }
      if (!onScreen && dist < 80) edgeList.push({ x:_cam.x, y:_cam.y, d:dist, threat:k.threat });

    }
    if (mission === 'flying' || paused){ const sr = updateSaucers(dt, flying, best, bestDist); best = sr.best; bestDist = sr.bestDist; }
    lockTarget = best;
    updateShards(dt);

    // --- phasers
    cooldown = Math.max(0, cooldown - dt);
    if ((firing || fireQueued) && flying) fire(); // a quick tap still fires even if released before the next frame
    fireQueued = false;
    if (energyDelay > 0) energyDelay -= dt; else energy = Math.min(100, energy + 22*dt);
    for (const b of beams){
      if (b.life <= 0) continue;
      b.life -= dt;
      if (b.life <= 0){ b.g.visible = false; continue; }
      placeBeam(b);
      const k = b.life / 0.2;
      b.core.material.opacity = Math.min(1, k*1.6);
      b.glow.material.opacity = 0.45 * k;
      const w = 0.6 + 0.4*Math.sin(camT*90);
      b.glow.scale.set(0.34*w, 1, 0.34*w);
    }
    for (const im of impacts){
      if (im.life <= 0) continue;
      im.life -= dt;
      if (im.life <= 0){ im.sp.visible = false; continue; }
      const k = im.life / 0.3;
      im.sp.material.opacity = k; im.sp.scale.setScalar(im.size * (1.3 - 0.5*k));
    }

    // --- shields
    // shields don't recharge during a round any more — damage sticks until the round is cleared
    if (regenDelay > 0) regenDelay -= dt;
    if (impactNote > 0) impactNote -= dt;

    // --- waves
    if (flying){
      if (waveBreak > 0){
        waveBreak -= dt;
        if (waveBreak <= 0){ wave++; startWave(wave); }
      } else {
        waveTime = Math.max(0, waveTime - dt);
        if (rocksAlive() === 0){
          const bonus = Math.floor(waveTime * 100);
          score += bonus; wavesCleared++; waveBreak = 3; banner = 3; lastBonus = bonus;
          shield = Math.min(SHIELD_MAX, shield + 60); repairDamage(false);
        } else if (waveTime <= 0) endMission('OUT OF TIME');
      }
    }
    if (banner > 0) banner -= dt;

    if (actx) updateEngine(thrustAmt, ship.vel.length() / MAX_SPEED);
    updateHud(dt, bestDist, turnFeel);
    drawRadar();
    renderer.render(scene, camera);
  }

  function updateHud(dt, lockDist, turnFeel){
    setMono(el.time, fmtTime(waveTime));
    hudTick += dt;
    if (hudTick > 0.12){ hudTick = 0; jitterV = Math.round(Math.random()*2 - 1); jitterG = Math.round((Math.random()-0.5)*8); }
    const speed = Math.hypot(shipVel.x, shipVel.z);
    setMono(el.velocity, Math.max(0, Math.round(speed*1.2) + (speed > 1 ? jitterV : 0)));
    const left = rocksAlive();
    const hl = hitsLeft();
    el.dist.textContent = waveBreak > 0 ? 'ROUND ' + (wave+1) + ' INCOMING' : 'ROUND ' + wave + ' · ' + hl + (hl === 1 ? ' HIT' : ' HITS') + ' TO CLEAR';
    if (timeBump > 0){ timeBump -= dt; }
    el.time.style.filter = timeBump > 0 ? 'drop-shadow(0 0 8px #0bd5ed) brightness(1.4)' : '';

    // compass pointer rides the arc with turning + sideways dodge
    const heading = clamp(turnFeel*9 + ship.strafeV*0.35, -22, 22);
    const th = THREE.MathUtils.degToRad(heading), RP = 226;
    el.ptr.style.transform = 'translate(' + (114 + RP*Math.sin(th) - 4.5).toFixed(1) + 'px,' + (235.5 - RP*Math.cos(th) - 2.5).toFixed(1) + 'px) rotate(' + heading.toFixed(1) + 'deg)';

    // alert slot — most urgent wins
    let alert = '', cls = '';
    if (threats.ahead < 35) { alert = 'EVASIVE ACTION'; cls = 'urgent'; }
    else if (hostileBehind < 140) { alert = 'HOSTILE BEHIND'; cls = 'urgent'; }
    else if (threats.behind < 60) { alert = 'DEBRIS BEHIND'; cls = 'urgent'; }
    else if (saucerAlert > 0) { alert = 'VESSEL DETECTED'; }
    else if (threats.ahead < 90) alert = 'DEBRIS AHEAD';
    else if (banner > 0) { alert = 'ROUND CLEARED'; cls = 'steady info'; }
    else if (shield <= 0) { alert = 'SHIELDS DOWN'; cls = 'steady'; }
    else if (shield / SHIELD_MAX <= 1/3) { alert = 'SHIELDS CRITICAL'; }
    if (alert && el.warning.textContent !== alert) el.warning.textContent = alert;
    updateAdvice(dt, hl);
    el.warning.className = 'abs' + (alert ? ' on ' + cls : '');

    el.rear.hidden = !keys.rear;

    // reticle + lock
    if (lockTarget){
      el.reticle.classList.add('locked');
      el.range.textContent = Math.max(1, Math.round(lockDist)) + 'm';
      _proj.copy(lockTarget.mesh.position).project(camera);
      const sx = (_proj.x + 1) * 0.5 * W, sy = (1 - _proj.y) * 0.5 * H;
      const pxPerUnit = (H/2) / Math.tan(THREE.MathUtils.degToRad(camera.fov/2)) / Math.max(1, lockDist);
      const size = clamp(lockTarget.r * 2.4 * pxPerUnit, 34, 220);
      el.lock.style.width = el.lock.style.height = size + 'px';
      el.lock.style.transform = 'translate(' + (sx - size/2).toFixed(1) + 'px,' + (sy - size/2).toFixed(1) + 'px)';
      el.lock.classList.add('on');
      lockLabel.textContent = lockTarget.isSaucer ? 'HOSTILE' : 'LOCK';
    } else {
      el.reticle.classList.remove('locked'); el.range.textContent = '---'; el.lock.classList.remove('on');
    }

    // edge arrows: nearest off-screen rocks
    edgeList.sort((a, b) => a.d - b.d);
    for (let i=0;i<edgeEls.length;i++){
      const e = edgeEls[i], t = edgeList[i];
      if (!t){ e.style.opacity = 0; continue; }
      let ang = Math.atan2(t.y, t.x);
      if (Math.abs(t.x) < 0.5 && Math.abs(t.y) < 0.5) ang = -Math.PI/2; // dead behind: show at the bottom
      const ex = 960 + Math.cos(ang)*850, ey = 540 - Math.sin(ang)*440;
      e.style.transform = 'translate(' + (ex - 10).toFixed(1) + 'px,' + (ey - 8.5).toFixed(1) + 'px) rotate(' + (90 - ang*180/Math.PI).toFixed(1) + 'deg)';
      e.style.opacity = (t.threat ? 1 : 0.45) * clamp(1.4 - t.d/80, 0.25, 1);
    }

    // side tapes: left = altitude (vertical dodge), right = sideways drift
    const alt = ship.pos.y * 5, lat = clamp((shipVel.dot(right)) * 5, -200, 200);
    el.altL.style.top = (tapeY(alt) - 29.35).toFixed(1) + 'px';
    el.altR.style.top = (tapeY(lat) - 28.35).toFixed(1) + 'px';
    el.altLTxt.textContent = fmtM(alt);
    el.altRTxt.textContent = fmtM(lat);

    // shields
    setMono(el.shieldNum, Math.round(shield));
    setShieldMeter(shield / SHIELD_MAX);
    const f = shield / SHIELD_MAX;
    let word, crit = false;
    if (shield <= 0){ word = ' CRITICAL, REROUTING POWER'; crit = true; }
    else if (impactNote > 0){ word = ' IMPACT DETECTED'; crit = f < 0.25; }
    else if (f > 2/3) word = ' PRIMARY SYSTEM ACTIVE';
    else if (f > 1/3) word = ' SECONDARY SYSTEM ACTIVE';
    else { word = ' CRITICAL'; crit = true; }
    if (el.shieldWord.textContent !== word) el.shieldWord.textContent = word;
    el.shieldStatus.classList.toggle('crit', crit);

    setMono(el.score, score, true);
    setMono(el.energy, Math.floor(energy));
  }

  function drawRadar(){
    const c = rctx;
    c.clearRect(0, 0, 400, 400);
    c.save();
    // the Figma ring frames the scope, so no outer circle here — just faint range rings and crosshair
    c.beginPath(); c.arc(RC, RC, RR, 0, Math.PI*2); c.fillStyle = 'rgba(0,8,14,0.5)'; c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(11,213,237,0.22)';
    for (const f of [1/3, 2/3]){ c.beginPath(); c.arc(RC, RC, RR*f, 0, Math.PI*2); c.stroke(); }
    c.beginPath(); c.moveTo(RC, RC-RR); c.lineTo(RC, RC+RR); c.moveTo(RC-RR, RC); c.lineTo(RC+RR, RC); c.stroke();
    // view cone (flips when looking back)
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2)) * W/H);
    const dir = keys.rear ? Math.PI/2 : -Math.PI/2;
    c.beginPath(); c.moveTo(RC, RC); c.arc(RC, RC, RR, dir - half, dir + half); c.closePath();
    c.fillStyle = 'rgba(11,213,237,0.08)'; c.fill();
    c.beginPath(); c.arc(RC, RC, RR, 0, Math.PI*2); c.clip();
    // rocks, rotated so your heading points up
    for (const k of rocks){
      if (!k.active) continue;
      _rel.subVectors(k.mesh.position, ship.pos);
      const lx = _rel.dot(right), lf = _rel.dot(fwd);
      const d = Math.hypot(lx, lf);
      if (d > RADAR_RANGE * 1.05) continue;
      const x = RC + lx / RADAR_RANGE * RR, y = RC - lf / RADAR_RANGE * RR;
      const altFade = Math.abs(_rel.y) > 18 ? 0.5 : 1;
      c.globalAlpha = altFade;
      c.fillStyle = k.threat ? '#fc4340' : '#d1faff';
      c.shadowColor = k.threat ? '#fc4340' : '#0bd5ed'; c.shadowBlur = 12;
      c.beginPath(); c.arc(x, y, SIZES[k.size].dot * RS, 0, Math.PI*2); c.fill();
    }
    c.globalAlpha = 1;
    // hostile saucers: red diamonds
    for (const sc of saucers){
      if (!sc.active) continue;
      _rel.subVectors(sc.mesh.position, ship.pos);
      let lx = _rel.dot(right), lf = _rel.dot(fwd);
      const d = Math.hypot(lx, lf);
      if (d > RADAR_RANGE){ lx *= RADAR_RANGE/d; lf *= RADAR_RANGE/d; } // pin to the rim when out of range
      const x = RC + lx / RADAR_RANGE * RR * 0.9, y = RC - lf / RADAR_RANGE * RR * 0.9, z = (sc.small ? 6 : 8) * RS;
      c.fillStyle = '#fc4340'; c.shadowColor = '#fc4340'; c.shadowBlur = 10;
      c.beginPath(); c.moveTo(x, y-z); c.lineTo(x+z, y); c.lineTo(x, y+z); c.lineTo(x-z, y); c.closePath(); c.fill();
    }
    c.shadowBlur = 0;
    // you
    c.fillStyle = '#0bd5ed'; c.shadowColor = '#0bd5ed'; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(RC, RC-11*RS); c.lineTo(RC+8*RS, RC+8*RS); c.lineTo(RC, RC+4*RS); c.lineTo(RC-8*RS, RC+8*RS); c.closePath(); c.fill();
    c.restore();
  }

  animate();
})();
</script>

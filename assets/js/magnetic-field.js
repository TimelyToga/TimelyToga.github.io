/*
 * Magnetic field — iron filings canvas.
 *
 * A full-viewport bed of iron shavings above a set of living magnets.
 * Unlike a static dipole render, the magnets here are *choreographed*:
 *
 *   - a rotating north/south pole pair (the "rotor") drifts slowly across
 *     the page, sweeping its loops around like a compass needle spinning
 *   - two satellite poles orbit the rotor, and every so often a pole
 *     flips polarity — the field-line topology collapses and re-forms
 *   - the visitor's cursor is the strongest magnet in the room, a single
 *     pole that throws clean radial spokes (click to flip its sign)
 *
 * On top of the filings, actual field lines are traced from the poles
 * every frame, so the page shows the same structured loops and spoke
 * bursts you get from real shavings on paper. The filings themselves
 * drift along the field and clump into chains near the poles, then
 * respawn out in the gaps — a slow, permanent circulation.
 *
 * Clicking taps the paper: a pulse knocks shavings loose near the ring
 * and flips the cursor magnet's polarity.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('magnetic-field');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Config ---------------------------------------------------------------
  var MAX_FILINGS = 1500;
  var MAX_FILINGS_SMALL = 900;
  var BASE_LEN = 4.0;
  var HOT_LEN = 5.0;
  var LINE_WIDTH = 1.05;
  var SETTLE_BASE = 0.09;          // filings snap to alignment quickly
  var SETTLE_HOT = 0.22;
  var DRIFT_SPEED = 0.5;           // px/frame of along-field migration at full heat
  var BUCKETS = 7;

  var LINE_STEP = 6;               // px per integration step
  var LINE_STEPS = 170;
  var LINE_SEED_R = 18;            // seed ring radius around poles
  var LINE_CAPTURE = 14;           // lines end this close to an opposite pole
  var LINE_BUCKETS = 3;

  var PULSE_SPEED = 0.55;          // px per ms
  var PULSE_WIDTH = 46;
  var PULSE_LIFE = 1400;           // ms

  var FLIP_EVERY_MIN = 13000;      // ms between polarity flips (per pole)
  var FLIP_EVERY_SPAN = 14000;
  var FLIP_DURATION = 1700;        // sign crossfade time

  var Q_REF = 100;                 // reference pole strength
  var POLE_SOFT = 14;              // core softening, px

  // Steel (cold, far) -> copper (energized, near a pole)
  var COLD = { r: 150, g: 160, b: 172 };
  var HOT = { r: 240, g: 168, b: 106 };
  var LINE_COLD = { r: 156, g: 170, b: 186 };
  var LINE_HOT = { r: 235, g: 170, b: 112 };

  // --- State ----------------------------------------------------------------
  var W = 0, H = 0, DPR = 1, SCALE = 1;
  var filings = [];  // {x, y, c2, s2, hot, dir}
  var pulses = [];   // {x, y, t0}
  var mouse = { x: 0, y: 0, active: false, strength: 0, sign: 1, boost: 0 };
  var lastHudUpdate = 0;

  // Free poles. Positions are computed fresh each frame from `t` so the whole
  // system is a deterministic function of time.
  var poles = [
    { role: 'rotorN', q: 95,  flipAt: 9000,  flipFrom: 1 },
    { role: 'rotorS', q: -95, flipAt: 1e18,  flipFrom: -1 }, // rotorS never flips: the rotor keeps one anchor
    { role: 'orbA',   q: 70,  flipAt: 21000, flipFrom: 1 },
    { role: 'orbB',   q: -70, flipAt: 34000, flipFrom: -1 }
  ];
  var polePos = [];   // {x, y, q} refreshed per frame, plus cursor appended
  for (var pi = 0; pi < poles.length; pi++) polePos.push({ x: 0, y: 0, q: 0 });
  var cursorPole = { x: 0, y: 0, q: 0 };

  var hudRoot = document.getElementById('field-hud');
  var hudFlux = document.getElementById('flux-value');
  var hudPole = document.getElementById('pole-value');

  function smoothstep(a, b, x) {
    var u = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return u * u * (3 - 2 * u);
  }

  // --- Pole choreography ------------------------------------------------------
  function updatePoles(t) {
    var cx = W * (0.5 + 0.26 * Math.sin(t * 0.000049 + 1.2));
    var cy = H * (0.5 + 0.24 * Math.sin(t * 0.000037 + 4.0));
    var ra = t * 0.00021;                       // rotor spin
    var sep = 68 * SCALE;                       // rotor pole separation
    var rx = Math.cos(ra) * sep, ry = Math.sin(ra) * sep;

    var R1 = 250 * SCALE, R2 = 365 * SCALE;
    var t1 = t * 0.000123 + 0.8, t2 = -t * 0.000086 + 3.6;

    var px = [cx + rx, cx - rx, cx + Math.cos(t1) * R1, cx + Math.cos(t2) * R2];
    var py = [cy + ry, cy - ry, cy + Math.sin(t1) * R1 * 0.82, cy + Math.sin(t2) * R2 * 0.82];

    for (var i = 0; i < poles.length; i++) {
      var p = poles[i];
      var sign = p.flipFrom;
      if (t > p.flipAt) {
        var u = (t - p.flipAt) / FLIP_DURATION;
        if (u >= 1) {
          p.flipFrom = -p.flipFrom;
          p.flipAt = t + FLIP_EVERY_MIN + Math.random() * FLIP_EVERY_SPAN;
        }
        sign = p.flipFrom * (1 - 2 * smoothstep(0, 1, u));
      }
      polePos[i].x = px[i];
      polePos[i].y = py[i];
      polePos[i].q = Math.abs(p.q) * sign;
    }

    cursorPole.x = mouse.x;
    cursorPole.y = mouse.y;
    cursorPole.q = mouse.sign * (130 + mouse.boost * 220) * mouse.strength;
  }

  // --- Field ----------------------------------------------------------------
  // Writes field vector at (x, y) into out {x, y, hot}. `hot` is the pole-only
  // magnitude, used for brightness, so the ambient bands stay cold.
  function fieldAt(x, y, t, out) {
    var hx = 0, hy = 0;
    for (var i = 0; i < polePos.length; i++) {
      var p = polePos[i];
      var vx = x - p.x, vy = y - p.y;
      var d = Math.sqrt(vx * vx + vy * vy) + POLE_SOFT;
      var f = p.q / (d * d);                    // ~1/r radial pole field
      hx += vx * f;
      hy += vy * f;
    }
    if (cursorPole.q !== 0) {
      var cvx = x - cursorPole.x, cvy = y - cursorPole.y;
      var cd = Math.sqrt(cvx * cvx + cvy * cvy) + POLE_SOFT;
      var cf = cursorPole.q / (cd * cd);
      hx += cvx * cf;
      hy += cvy * cf;
    }
    out.hot = Math.sqrt(hx * hx + hy * hy);

    // Traveling bands: a weak ambient orientation wave sweeping the page so
    // far-field regions shimmer instead of sitting still.
    var bn = t * 0.000022;
    var nx = Math.cos(bn), ny = Math.sin(bn);
    var u = (x * nx + y * ny) * 0.0055 - t * 0.00016;
    var bandAngle = bn + Math.PI / 2 + 0.95 * Math.sin(u);
    out.x = hx + Math.cos(bandAngle) * 0.2;
    out.y = hy + Math.sin(bandAngle) * 0.2;
  }

  // --- Filings grid ---------------------------------------------------------
  function randomSpawn(f) {
    // Prefer low-field spots so clumps stay clumped and gaps stay sprinkled.
    var x = 0, y = 0;
    for (var tries = 0; tries < 8; tries++) {
      x = Math.random() * W;
      y = Math.random() * H;
      fieldAt(x, y, perfNow(), B);
      if (B.hot < 0.28) break;
    }
    f.x = x; f.y = y;
    var a = Math.random() * Math.PI;
    f.c2 = Math.cos(2 * a); f.s2 = Math.sin(2 * a);
    f.hot = 0;
    f.dir = Math.random() < 0.5 ? -1 : 1;
  }

  function perfNow() {
    return typeof performance !== 'undefined' ? performance.now() : 0;
  }

  function buildFilings() {
    filings = [];
    var area = W * H;
    var small = Math.min(W, H) < 700;
    var cap = small ? MAX_FILINGS_SMALL : MAX_FILINGS;
    var count = Math.min(cap, Math.floor(area / 900));
    for (var i = 0; i < count; i++) {
      var f = { x: 0, y: 0, c2: 1, s2: 0, hot: 0, dir: 1 };
      var a = Math.random() * Math.PI;
      f.x = Math.random() * W;
      f.y = Math.random() * H;
      f.c2 = Math.cos(2 * a); f.s2 = Math.sin(2 * a);
      f.dir = Math.random() < 0.5 ? -1 : 1;
      filings.push(f);
    }
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    SCALE = Math.min(1, Math.min(W, H) / 820);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildFilings();
  }

  // --- Field line tracing -----------------------------------------------------
  var linePts = [];   // flat x,y pairs with NaN separators, one array per bucket
  for (var lb = 0; lb < LINE_BUCKETS; lb++) linePts.push([]);

  var LB = { x: 0, y: 0, hot: 0 };

  function traceLines(t) {
    for (var b = 0; b < LINE_BUCKETS; b++) linePts[b].length = 0;
    var margin = 30;

    for (var i = 0; i < polePos.length; i++) {
      var p = polePos[i];
      if (p.q <= 6) continue;                    // seed from north poles only
      var seeds = Math.round(9 + 7 * Math.min(1, p.q / Q_REF));
      for (var s = 0; s < seeds; s++) {
        var ang = (s / seeds) * Math.PI * 2;
        var x = p.x + Math.cos(ang) * LINE_SEED_R;
        var y = p.y + Math.sin(ang) * LINE_SEED_R;
        fieldAt(x, y, t, LB);
        var heat = Math.min(1, LB.hot * 1.1);
        var bucket = Math.min(LINE_BUCKETS - 1, (heat * LINE_BUCKETS) | 0);
        var pts = linePts[bucket];
        pts.push(x, y);

        for (var step = 0; step < LINE_STEPS; step++) {
          fieldAt(x, y, t, LB);
          var m1 = Math.sqrt(LB.x * LB.x + LB.y * LB.y);
          if (m1 < 0.02) break;
          var d1x = LB.x / m1, d1y = LB.y / m1;
          var mx = x + d1x * LINE_STEP * 0.5, my = y + d1y * LINE_STEP * 0.5;
          fieldAt(mx, my, t, LB);
          var m2 = Math.sqrt(LB.x * LB.x + LB.y * LB.y);
          if (m2 < 0.02) break;
          x += (LB.x / m2) * LINE_STEP;
          y += (LB.y / m2) * LINE_STEP;

          if (x < -margin || x > W + margin || y < -margin || y > H + margin) break;

          // Captured by a south pole (or the cursor when it is south)?
          var captured = false;
          for (var j = 0; j < polePos.length; j++) {
            var q = polePos[j];
            if (q.q >= -6) continue;
            var ddx = x - q.x, ddy = y - q.y;
            if (ddx * ddx + ddy * ddy < LINE_CAPTURE * LINE_CAPTURE) { captured = true; break; }
          }
          if (!captured && cursorPole.q < -6) {
            var cdx = x - cursorPole.x, cdy = y - cursorPole.y;
            if (cdx * cdx + cdy * cdy < LINE_CAPTURE * LINE_CAPTURE) captured = true;
          }
          pts.push(x, y);
          if (captured) break;
        }
        pts.push(NaN, NaN);
      }
    }

    // Cursor as a north pole throws clean radial spokes.
    if (cursorPole.q > 6) {
      var cseeds = 22;
      var cpts = linePts[LINE_BUCKETS - 1];
      for (var cs = 0; cs < cseeds; cs++) {
        var cang = (cs / cseeds) * Math.PI * 2 + t * 0.0002;
        var cx0 = cursorPole.x + Math.cos(cang) * LINE_SEED_R;
        var cy0 = cursorPole.y + Math.sin(cang) * LINE_SEED_R;
        cpts.push(cx0, cy0);
        var lx = cx0, ly = cy0;
        for (var cstep = 0; cstep < LINE_STEPS; cstep++) {
          fieldAt(lx, ly, t, LB);
          var cm = Math.sqrt(LB.x * LB.x + LB.y * LB.y);
          if (cm < 0.02) break;
          lx += (LB.x / cm) * LINE_STEP;
          ly += (LB.y / cm) * LINE_STEP;
          if (lx < -margin || lx > W + margin || ly < -margin || ly > H + margin) break;
          var stop = false;
          for (var cj = 0; cj < polePos.length; cj++) {
            var cq = polePos[cj];
            if (cq.q >= -6) continue;
            var dx2 = lx - cq.x, dy2 = ly - cq.y;
            if (dx2 * dx2 + dy2 * dy2 < LINE_CAPTURE * LINE_CAPTURE) { stop = true; break; }
          }
          cpts.push(lx, ly);
          if (stop) break;
        }
        cpts.push(NaN, NaN);
      }
    }
  }

  function strokeLines() {
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    for (var b = 0; b < LINE_BUCKETS; b++) {
      var pts = linePts[b];
      if (!pts.length) continue;
      var mix = b / (LINE_BUCKETS - 1);
      var r = Math.round(LINE_COLD.r + (LINE_HOT.r - LINE_COLD.r) * mix);
      var g = Math.round(LINE_COLD.g + (LINE_HOT.g - LINE_COLD.g) * mix);
      var bl = Math.round(LINE_COLD.b + (LINE_HOT.b - LINE_COLD.b) * mix);
      var alpha = 0.065 + 0.12 * mix;
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      var pen = false;
      for (var q = 0; q < pts.length; q += 2) {
        var x = pts[q], y = pts[q + 1];
        if (x !== x) { pen = false; continue; }  // NaN separator
        if (!pen) { ctx.moveTo(x, y); pen = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // --- Frame ----------------------------------------------------------------
  var B = { x: 0, y: 0, hot: 0 };
  var buckets = [];
  for (var fb = 0; fb < BUCKETS; fb++) buckets.push([]);

  function frame(t) {
    updatePoles(t);
    ctx.clearRect(0, 0, W, H);

    for (var p = pulses.length - 1; p >= 0; p--) {
      if (t - pulses[p].t0 > PULSE_LIFE) pulses.splice(p, 1);
    }

    var target = mouse.active ? 1 : 0;
    mouse.strength += (target - mouse.strength) * 0.06;
    mouse.boost *= 0.94;

    traceLines(t);
    strokeLines();

    for (var i = 0; i < filings.length; i++) {
      var f = filings[i];
      fieldAt(f.x, f.y, t, B);

      // Tap pulses knock shavings loose as the ring passes.
      for (var j = 0; j < pulses.length; j++) {
        var pu = pulses[j];
        var age = t - pu.t0;
        var ringR = age * PULSE_SPEED;
        var pdx = f.x - pu.x, pdy = f.y - pu.y;
        var dist = Math.sqrt(pdx * pdx + pdy * pdy);
        var band = Math.abs(dist - ringR);
        if (band < PULSE_WIDTH) {
          var amp = (1 - band / PULSE_WIDTH) * (1 - age / PULSE_LIFE);
          var ra = Math.random() * Math.PI;
          f.c2 += (Math.cos(2 * ra) - f.c2) * amp * 0.55;
          f.s2 += (Math.sin(2 * ra) - f.s2) * amp * 0.55;
          f.hot = Math.min(1, f.hot + amp * 0.9);
        }
      }

      var mag = Math.sqrt(B.x * B.x + B.y * B.y);
      var heat = Math.min(1, B.hot * 1.15);

      if (mag > 0.0001) {
        // Align: doubled-angle space treats +t and -t as one orientation.
        var ta = Math.atan2(B.y, B.x);
        var settle = SETTLE_BASE + SETTLE_HOT * heat;
        f.c2 += (Math.cos(2 * ta) - f.c2) * settle;
        f.s2 += (Math.sin(2 * ta) - f.s2) * settle;
        var n = Math.sqrt(f.c2 * f.c2 + f.s2 * f.s2) || 1;
        f.c2 /= n; f.s2 /= n;

        // Migrate along the field line so shavings clump into chains, with a
        // whisper of Brownian paper-roughness on top.
        var inv = 1 / mag;
        var drift = DRIFT_SPEED * (0.15 + 0.85 * heat) * f.dir;
        f.x += B.x * inv * drift + (Math.random() - 0.5) * 0.22;
        f.y += B.y * inv * drift + (Math.random() - 0.5) * 0.22;

        f.hot += (heat - f.hot) * 0.06;
      } else {
        f.hot *= 0.98;
      }

      // Consumed at a pole core: respawn out in the gaps.
      if (B.hot > 3.2) {
        randomSpawn(f);
        continue;
      }
      if (f.x < -10 || f.x > W + 10 || f.y < -10 || f.y > H + 10) {
        randomSpawn(f);
        continue;
      }

      var half = (BASE_LEN + HOT_LEN * f.hot) * 0.5;
      var ang2 = Math.atan2(f.s2, f.c2) * 0.5;
      var ca = Math.cos(ang2) * half, sa = Math.sin(ang2) * half;
      var bucket = Math.min(BUCKETS - 1, (f.hot * BUCKETS) | 0);
      buckets[bucket].push(f.x - ca, f.y - sa, f.x + ca, f.y + sa);
    }

    ctx.lineWidth = LINE_WIDTH;
    for (var bi = 0; bi < BUCKETS; bi++) {
      var seg = buckets[bi];
      if (!seg.length) continue;
      var mix = bi / (BUCKETS - 1);
      var r = Math.round(COLD.r + (HOT.r - COLD.r) * mix);
      var g = Math.round(COLD.g + (HOT.g - COLD.g) * mix);
      var bl = Math.round(COLD.b + (HOT.b - COLD.b) * mix);
      var alpha = 0.15 + 0.5 * mix;
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      for (var q = 0; q < seg.length; q += 4) {
        ctx.moveTo(seg[q], seg[q + 1]);
        ctx.lineTo(seg[q + 2], seg[q + 3]);
      }
      ctx.stroke();
      seg.length = 0;
    }

    drawPoles(t);
    updateHud(t);
  }

  function drawPoles(t) {
    // Faint halos + small pole markers so the magnets anchor the structure.
    for (var i = 0; i < polePos.length; i++) {
      var p = polePos[i];
      var north = p.q > 0;
      var strength = Math.min(1, Math.abs(p.q) / Q_REF);
      var col = north ? '240,168,106' : '150,170,196';
      var rad = 120 * strength + 40;
      var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      grad.addColorStop(0, 'rgba(' + col + ',' + (0.07 * strength).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2 + 2.4 * strength, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + col + ',' + (0.35 * strength + 0.12).toFixed(3) + ')';
      ctx.fill();
    }

    if (mouse.strength > 0.02) {
      var north2 = cursorPole.q > 0;
      var col2 = north2 ? '240,168,106' : '150,170,196';
      var rad2 = 150 + mouse.boost * 90;
      var grad2 = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, rad2);
      grad2.addColorStop(0, 'rgba(' + col2 + ',' + (0.09 * mouse.strength + mouse.boost * 0.05).toFixed(3) + ')');
      grad2.addColorStop(1, 'rgba(' + col2 + ',0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(mouse.x - rad2, mouse.y - rad2, rad2 * 2, rad2 * 2);
    }

    for (var pu = 0; pu < pulses.length; pu++) {
      var pulse = pulses[pu];
      var age = t - pulse.t0;
      var rr = age * PULSE_SPEED;
      var alpha = 0.16 * (1 - age / PULSE_LIFE);
      if (alpha <= 0) continue;
      ctx.strokeStyle = 'rgba(240,168,106,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function updateHud(t) {
    if (!hudRoot || !hudFlux || t - lastHudUpdate < 140) return;
    lastHudUpdate = t;
    if (!mouse.active) {
      hudFlux.textContent = 'drifting';
      if (hudPole) hudPole.textContent = '';
      return;
    }
    fieldAt(mouse.x, mouse.y, t, B);
    var flux = B.hot / (B.hot + 1.2);
    hudFlux.textContent = flux.toFixed(2) + ' µT';
    if (hudPole) hudPole.textContent = mouse.sign > 0 ? 'N' : 'S';
  }

  // --- Static render for reduced motion -------------------------------------
  function renderStatic() {
    var t = 12000;
    updatePoles(t);
    ctx.clearRect(0, 0, W, H);
    traceLines(t);
    strokeLines();
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    for (var i = 0; i < filings.length; i++) {
      var f = filings[i];
      fieldAt(f.x, f.y, t, B);
      var heat = Math.min(1, B.hot * 1.15);
      var ang = Math.atan2(B.y, B.x);
      var half = (BASE_LEN + HOT_LEN * heat) * 0.5;
      var r = Math.round(COLD.r + (HOT.r - COLD.r) * heat);
      var g = Math.round(COLD.g + (HOT.g - COLD.g) * heat);
      var bl = Math.round(COLD.b + (HOT.b - COLD.b) * heat);
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + (0.13 + 0.4 * heat).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(f.x - Math.cos(ang) * half, f.y - Math.sin(ang) * half);
      ctx.lineTo(f.x + Math.cos(ang) * half, f.y + Math.sin(ang) * half);
      ctx.stroke();
    }
    drawPoles(t);
  }

  // --- Events ---------------------------------------------------------------
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });

  document.addEventListener('mouseleave', function () { mouse.active = false; });
  window.addEventListener('blur', function () { mouse.active = false; });

  window.addEventListener('touchstart', trackTouch, { passive: true });
  window.addEventListener('touchmove', trackTouch, { passive: true });
  window.addEventListener('touchend', function () { mouse.active = false; }, { passive: true });
  function trackTouch(e) {
    var t0 = e.touches[0];
    if (!t0) return;
    mouse.x = t0.clientX;
    mouse.y = t0.clientY;
    mouse.active = true;
  }

  window.addEventListener('click', function (e) {
    pulses.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
    if (pulses.length > 4) pulses.shift();
    mouse.boost = 1;
    mouse.sign = -mouse.sign;                    // flip the cursor magnet
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduceMotion) renderStatic();
    }, 150);
  });

  // --- Main loop --------------------------------------------------------------
  var rafId = null;
  function loop(t) {
    rafId = null;
    frame(t);
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!reduceMotion && !rafId) {
      rafId = requestAnimationFrame(loop);
    }
  });

  resize();
  if (hudRoot) hudRoot.hidden = false;
  if (reduceMotion) {
    renderStatic();
  } else {
    rafId = requestAnimationFrame(loop);
  }
})();

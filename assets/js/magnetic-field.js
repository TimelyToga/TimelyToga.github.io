/*
 * Magnetic field — iron filings canvas.
 *
 * A full-viewport field of tiny iron shavings that align themselves to a
 * living magnetic field. The field is the sum of:
 *   - traveling "bands": a slowly drifting, slowly rotating wave of field
 *     orientation, like magnetic viewing film sweeping across the page
 *   - two autonomous dipole magnets wandering on Lissajous paths
 *   - the visitor's cursor, which acts as a handheld magnet
 *
 * Clicking "taps the paper": a pulse ring expands, shavings near the ring
 * are knocked loose and settle back along the field.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('magnetic-field');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Config ---------------------------------------------------------------
  var MAX_FILINGS = 2400;          // hard cap, desktop
  var MAX_FILINGS_SMALL = 1300;    // cap for small screens
  var BASE_LEN = 4.2;              // filing length at zero field
  var HOT_LEN = 5.0;               // extra length at full field
  var LINE_WIDTH = 1.05;
  var SETTLE_BASE = 0.055;         // min per-frame alignment rate
  var SETTLE_HOT = 0.16;           // extra alignment rate at full field
  var BUCKETS = 7;                 // strength quantization for batched strokes
  var PULSE_SPEED = 0.55;          // px per ms
  var PULSE_WIDTH = 46;            // ring thickness in px
  var PULSE_LIFE = 1400;           // ms

  // Steel (cold, far) -> copper (energized, near the coil)
  var COLD = { r: 148, g: 158, b: 170 };
  var HOT = { r: 240, g: 168, b: 106 };

  // --- State ----------------------------------------------------------------
  var W = 0, H = 0, DPR = 1;
  var filings = [];  // {x, y, c2, s2, hot}  orientation kept as (cos 2t, sin 2t)
  var pulses = [];   // {x, y, t0}
  var mouse = { x: 0, y: 0, active: false, strength: 0, mx: 1, my: 0, boost: 0 };
  var lastHudUpdate = 0;

  // Two wandering magnets so the field never sits still.
  var drifters = [
    { ax: 0.32, ay: 0.26, w1: 0.000111, w2: 0.000087, p1: 0.0, p2: 1.7, spin: 0.000061, phase: 0.4, strength: 1.05 },
    { ax: 0.30, ay: 0.30, w1: 0.000093, w2: 0.000131, p1: 2.9, p2: 0.6, spin: -0.000047, phase: 2.2, strength: 0.85 }
  ];

  var hudRoot = document.getElementById('field-hud');
  var hudFlux = document.getElementById('flux-value');
  var hudPole = document.getElementById('pole-value');

  // --- Filings grid ---------------------------------------------------------
  function buildFilings() {
    filings = [];
    var area = W * H;
    var small = Math.min(W, H) < 700;
    var cap = small ? MAX_FILINGS_SMALL : MAX_FILINGS;
    var count = Math.min(cap, Math.floor(area / 620));
    var spacing = Math.sqrt(area / count);
    var cols = Math.max(1, Math.round(W / spacing));
    var rows = Math.max(1, Math.round(H / spacing));
    var gx = W / cols, gy = H / rows;

    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var x = (i + 0.5) * gx + (Math.random() - 0.5) * gx * 0.7;
        var y = (j + 0.5) * gy + (Math.random() - 0.5) * gy * 0.7;
        var a = Math.random() * Math.PI;
        filings.push({ x: x, y: y, c2: Math.cos(2 * a), s2: Math.sin(2 * a), hot: 0 });
      }
    }
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildFilings();
  }

  // --- Field ----------------------------------------------------------------
  // Writes the field vector at (x, y) into out {x, y, hot}. `hot` is the
  // magnitude of the dipole contribution alone, used for brightness, so the
  // ambient bands don't light up the whole page.
  function fieldAt(x, y, t, out) {
    // Traveling bands: orientation sweeps across the page along a slowly
    // rotating normal. Produces visible stripes of alignment that drift.
    var bn = t * 0.000022;                       // band normal rotation
    var nx = Math.cos(bn), ny = Math.sin(bn);
    var u = (x * nx + y * ny) * 0.0055 - t * 0.00016;
    var bandAngle = bn + Math.PI / 2 + 0.95 * Math.sin(u);
    var bx = Math.cos(bandAngle) * 0.32;
    var by = Math.sin(bandAngle) * 0.32;
    var hx = 0, hy = 0;

    // Dipoles: B proportional to (3(m.r)r - m r^2) / r^5 in 2D section.
    dipole(x, y, drifters[0], t, _d);
    hx += _d.x; hy += _d.y;
    dipole(x, y, drifters[1], t, _d);
    hx += _d.x; hy += _d.y;

    // Cursor magnet — the strongest source in the field.
    var ms = mouse.strength + mouse.boost * 2;
    if (ms > 0.003) {
      var rx = x - mouse.x, ry = y - mouse.y;
      var r2 = rx * rx + ry * ry + 2600;         // softening so the core stays calm
      var inv = 1 / (r2 * r2 * Math.sqrt(r2));   // 1/r^5: true dipole falloff
      var s = ms * 4500000;
      var mdotr = mouse.mx * rx + mouse.my * ry;
      hx += (3 * mdotr * rx - mouse.mx * r2) * inv * s;
      hy += (3 * mdotr * ry - mouse.my * r2) * inv * s;
    }

    out.x = bx + hx;
    out.y = by + hy;
    out.hot = Math.sqrt(hx * hx + hy * hy);
  }

  var _d = { x: 0, y: 0 };
  function dipole(x, y, d, t, out) {
    var dx = W * (0.5 + d.ax * Math.sin(d.w1 * t + d.p1));
    var dy = H * (0.5 + d.ay * Math.sin(d.w2 * t + d.p2));
    var ma = d.spin * t + d.phase;
    var mx = Math.cos(ma), my = Math.sin(ma);
    var rx = x - dx, ry = y - dy;
    var r2 = rx * rx + ry * ry + 9000;
    var inv = 1 / (r2 * r2 * Math.sqrt(r2));     // 1/r^5: true dipole falloff
    var s = d.strength * 4000000;
    var mdotr = mx * rx + my * ry;
    out.x = (3 * mdotr * rx - mx * r2) * inv * s;
    out.y = (3 * mdotr * ry - my * r2) * inv * s;
  }

  // --- Frame ----------------------------------------------------------------
  var B = { x: 0, y: 0, hot: 0 };
  var buckets = [];   // per-bucket arrays of [x1, y1, x2, y2]
  for (var b = 0; b < BUCKETS; b++) buckets.push([]);

  function frame(t) {
    ctx.clearRect(0, 0, W, H);

    // Update pulses, drop dead ones.
    var now = t;
    for (var p = pulses.length - 1; p >= 0; p--) {
      if (now - pulses[p].t0 > PULSE_LIFE) pulses.splice(p, 1);
    }

    // Ease the cursor magnet in and out.
    var target = mouse.active ? 1 : 0;
    mouse.strength += (target - mouse.strength) * 0.06;
    mouse.boost *= 0.94;

    for (var i = 0; i < filings.length; i++) {
      var f = filings[i];
      fieldAt(f.x, f.y, t, B);

      // Pulses knock shavings loose as the ring passes over them.
      for (var j = 0; j < pulses.length; j++) {
        var pu = pulses[j];
        var age = now - pu.t0;
        var ringR = age * PULSE_SPEED;
        var pdx = f.x - pu.x, pdy = f.y - pu.y;
        var dist = Math.sqrt(pdx * pdx + pdy * pdy);
        var band = Math.abs(dist - ringR);
        if (band < PULSE_WIDTH) {
          var amp = (1 - band / PULSE_WIDTH) * (1 - age / PULSE_LIFE);
          var ra = Math.random() * Math.PI;
          var rc2 = Math.cos(2 * ra), rs2 = Math.sin(2 * ra);
          var k = amp * 0.55;
          f.c2 += (rc2 - f.c2) * k;
          f.s2 += (rs2 - f.s2) * k;
          f.hot = Math.min(1, f.hot + amp * 0.9);
        }
      }

      var mag = Math.sqrt(B.x * B.x + B.y * B.y);
      if (mag > 0.0001) {
        // Settle toward the field direction, in doubled-angle space so the
        // shavings treat +t and -t as the same orientation (as real ones do).
        var ta = Math.atan2(B.y, B.x);
        var tc2 = Math.cos(2 * ta), ts2 = Math.sin(2 * ta);
        var heat = Math.min(1, B.hot * 1.15);
        var settle = SETTLE_BASE + SETTLE_HOT * heat;
        f.c2 += (tc2 - f.c2) * settle;
        f.s2 += (ts2 - f.s2) * settle;
        var n = Math.sqrt(f.c2 * f.c2 + f.s2 * f.s2) || 1;
        f.c2 /= n; f.s2 /= n;
        f.hot += (heat - f.hot) * 0.05;
      } else {
        f.hot *= 0.98;
      }

      var half = (BASE_LEN + HOT_LEN * f.hot) * 0.5;
      var ang = Math.atan2(f.s2, f.c2) * 0.5;
      var ca = Math.cos(ang) * half, sa = Math.sin(ang) * half;
      var bucket = Math.min(BUCKETS - 1, (f.hot * BUCKETS) | 0);
      buckets[bucket].push(f.x - ca, f.y - sa, f.x + ca, f.y + sa);
    }

    // Stroke each strength bucket in one pass.
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    for (var bi = 0; bi < BUCKETS; bi++) {
      var seg = buckets[bi];
      if (!seg.length) continue;
      var mix = bi / (BUCKETS - 1);
      var r = Math.round(COLD.r + (HOT.r - COLD.r) * mix);
      var g = Math.round(COLD.g + (HOT.g - COLD.g) * mix);
      var bl = Math.round(COLD.b + (HOT.b - COLD.b) * mix);
      var alpha = 0.16 + 0.5 * mix;
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      for (var q = 0; q < seg.length; q += 4) {
        ctx.moveTo(seg[q], seg[q + 1]);
        ctx.lineTo(seg[q + 2], seg[q + 3]);
      }
      ctx.stroke();
      seg.length = 0;
    }

    drawGlows(t);
    updateHud(t);
  }

  function drawGlows(t) {
    // Faint halos so the magnets themselves are just barely visible.
    var sources = [];
    for (var i = 0; i < drifters.length; i++) {
      var d = drifters[i];
      sources.push({
        x: W * (0.5 + d.ax * Math.sin(d.w1 * t + d.p1)),
        y: H * (0.5 + d.ay * Math.sin(d.w2 * t + d.p2)),
        r: 150,
        a: 0.05
      });
    }
    if (mouse.strength > 0.02) {
      sources.push({ x: mouse.x, y: mouse.y, r: 190 + mouse.boost * 90, a: 0.085 * mouse.strength + mouse.boost * 0.05 });
    }
    for (var s = 0; s < sources.length; s++) {
      var src = sources[s];
      var grad = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, src.r);
      grad.addColorStop(0, 'rgba(240,168,106,' + src.a.toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(240,168,106,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(src.x - src.r, src.y - src.r, src.r * 2, src.r * 2);
    }

    // Expanding click rings.
    for (var p = 0; p < pulses.length; p++) {
      var pu = pulses[p];
      var age = t - pu.t0;
      var rr = age * PULSE_SPEED;
      var alpha = 0.16 * (1 - age / PULSE_LIFE);
      if (alpha <= 0) continue;
      ctx.strokeStyle = 'rgba(240,168,106,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, rr, 0, Math.PI * 2);
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
    hudFlux.textContent = flux.toFixed(2) + ' \u00b5T';
    if (hudPole) hudPole.textContent = Math.sin(t * 0.0006) > 0 ? 'N' : 'S';
  }

  // --- Static render for reduced motion -------------------------------------
  function renderStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    for (var i = 0; i < filings.length; i++) {
      var f = filings[i];
      fieldAt(f.x, f.y, 12000, B);
      var heat = Math.min(1, B.hot * 1.15);
      var ang = Math.atan2(B.y, B.x);
      var half = (BASE_LEN + HOT_LEN * heat) * 0.5;
      var mix = heat;
      var r = Math.round(COLD.r + (HOT.r - COLD.r) * mix);
      var g = Math.round(COLD.g + (HOT.g - COLD.g) * mix);
      var bl = Math.round(COLD.b + (HOT.b - COLD.b) * mix);
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + (0.16 + 0.4 * mix).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(f.x - Math.cos(ang) * half, f.y - Math.sin(ang) * half);
      ctx.lineTo(f.x + Math.cos(ang) * half, f.y + Math.sin(ang) * half);
      ctx.stroke();
    }
  }

  // --- Events ---------------------------------------------------------------
  window.addEventListener('mousemove', function (e) {
    var nx = e.clientX, ny = e.clientY;
    if (mouse.active) {
      // Aim the cursor magnet's moment along its direction of travel.
      var vx = nx - mouse.x, vy = ny - mouse.y;
      var v = Math.sqrt(vx * vx + vy * vy);
      if (v > 2) {
        var tx = vx / v, ty = vy / v;
        mouse.mx += (tx - mouse.mx) * 0.12;
        mouse.my += (ty - mouse.my) * 0.12;
        var m = Math.sqrt(mouse.mx * mouse.mx + mouse.my * mouse.my) || 1;
        mouse.mx /= m; mouse.my /= m;
      }
    }
    mouse.x = nx; mouse.y = ny;
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

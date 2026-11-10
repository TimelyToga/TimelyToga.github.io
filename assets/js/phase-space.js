(function () {
  "use strict";

  var canvas = document.getElementById("phase-space-canvas");
  if (!canvas || !canvas.getContext) {
    return;
  }

  var ctx = canvas.getContext("2d", { alpha: true });
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;

  // Header scroll elevation & reading progress hairline
  var headerEl = document.getElementById("site-header");
  var progressEl = document.getElementById("reading-progress");
  var hasReadingTrack = !!document.querySelector("[data-reading-track]");

  // HUD elements
  var hudEl = document.getElementById("phase-hud");
  var hudPanel = document.getElementById("phase-hud-panel");
  var hudToggle = document.getElementById("phase-hud-toggle");
  var hudClose = document.getElementById("phase-hud-close");
  var hudName = document.getElementById("phase-hud-name");
  var hudEq = document.getElementById("phase-hud-eq");
  var hudParam = document.getElementById("phase-hud-param");
  var hudVel = document.getElementById("phase-hud-vel");
  var hudCount = document.getElementById("phase-hud-count");
  var pillLabel = document.getElementById("phase-pill-label");
  var pillSub = document.getElementById("phase-pill-sub");
  var liveDot = document.getElementById("phase-live-dot");
  var btnPerturb = document.getElementById("phase-btn-perturb");
  var btnInspect = document.getElementById("phase-btn-inspect");
  var btnPause = document.getElementById("phase-btn-pause");
  var btnExitInspect = document.getElementById("phase-exit-inspect");
  var regimeButtons = hudEl
    ? Array.prototype.slice.call(hudEl.querySelectorAll("[data-regime]"))
    : [];

  // Four genuine 3D chaotic dynamical systems normalized to canonical phase space u in [-1.4, 1.4]^3
  var REGIMES = {
    thomas: {
      key: "thomas",
      name: "Thomas Attractor",
      pill: "Thomas Manifold",
      sub: "b = 0.1998",
      eq: "dx/dt = sin(y) \u2212 bx,  dy/dt = sin(z) \u2212 by",
      param: "b = 0.1998",
      cx: 0,
      cy: 0,
      cz: 0,
      scale: 3.25,
      dt: 0.052,
      camZoom: 1.04,
      basePitch: 0.42,
      seedRadius: 0.62,
      evalField: function (ux, uy, uz, out) {
        var s = 3.25;
        var x = ux * s;
        var y = uy * s;
        var z = uz * s;
        var b = 0.1998;
        var k = 0.052 / s;
        out[0] = (Math.sin(y) - b * x) * k;
        out[1] = (Math.sin(z) - b * y) * k;
        out[2] = (Math.sin(x) - b * z) * k;
      }
    },
    aizawa: {
      key: "aizawa",
      name: "Aizawa Attractor",
      pill: "Aizawa Manifold",
      sub: "d = 3.50",
      eq: "dz/dt = c + az \u2212 z\u00b3/3 \u2212 (x\u00b2+y\u00b2)(1+ez)",
      param: "a = 0.95, d = 3.5",
      cx: 0,
      cy: 0,
      cz: 0.72,
      scale: 1.38,
      dt: 0.0046,
      camZoom: 1.08,
      basePitch: -0.58,
      seedRadius: 0.45,
      evalField: function (ux, uy, uz, out) {
        var s = 1.38;
        var x = ux * s;
        var y = uy * s;
        var z = 0.72 + uz * s;
        var k = 0.0046 / s;
        var r2 = x * x + y * y;
        var dx = (z - 0.7) * x - 3.5 * y;
        var dy = 3.5 * x + (z - 0.7) * y;
        var dz = 0.6 + 0.95 * z - (z * z * z) / 3 - r2 * (1 + 0.25 * z) + 0.1 * z * x * x * x;
        out[0] = dx * k;
        out[1] = dy * k;
        out[2] = dz * k;
      }
    },
    lorenz: {
      key: "lorenz",
      name: "Lorenz Attractor",
      pill: "Lorenz Manifold",
      sub: "\u03c1 = 28.0",
      eq: "dx/dt = \u03c3(y \u2212 x),  dy/dt = x(\u03c1 \u2212 z) \u2212 y",
      param: "\u03c3 = 10, \u03c1 = 28",
      cx: 0,
      cy: 0,
      cz: 25.5,
      scale: 19.5,
      dt: 0.0035,
      camZoom: 0.98,
      basePitch: -0.32,
      seedRadius: 0.42,
      evalField: function (ux, uy, uz, out) {
        var s = 19.5;
        var x = ux * s;
        var y = uy * s;
        var z = 25.5 + uz * s;
        var k = 0.0035 / s;
        out[0] = 10 * (y - x) * k;
        out[1] = (x * (28 - z) - y) * k;
        out[2] = (x * y - (8 / 3) * z) * k;
      }
    },
    halvorsen: {
      key: "halvorsen",
      name: "Halvorsen Attractor",
      pill: "Halvorsen Manifold",
      sub: "a = 1.40",
      eq: "dx/dt = \u2212ax \u2212 4y \u2212 4z \u2212 y\u00b2",
      param: "a = 1.40",
      cx: -2.1,
      cy: -2.1,
      cz: -2.1,
      scale: 5.6,
      dt: 0.0029,
      camZoom: 0.96,
      basePitch: 0.52,
      seedRadius: 0.36,
      evalField: function (ux, uy, uz, out) {
        var s = 5.6;
        var x = -2.1 + ux * s;
        var y = -2.1 + uy * s;
        var z = -2.1 + uz * s;
        var a = 1.4;
        var k = 0.0029 / s;
        var dx = (-a * x - 4 * y - 4 * z - y * y) * k;
        var dy = (-a * y - 4 * z - 4 * x - z * z) * k;
        var dz = (-a * z - 4 * x - 4 * y - x * x) * k;
        var r2 = ux * ux + uy * uy + uz * uz;
        if (r2 > 3.6) {
          var pull = (r2 - 3.6) * 0.045;
          dx -= ux * pull;
          dy -= uy * pull;
          dz -= uz * pull;
        }
        out[0] = dx;
        out[1] = dy;
        out[2] = dz;
      }
    }
  };

  var initialKey = (body && body.getAttribute("data-phase-regime")) || "thomas";
  if (!REGIMES[initialKey]) {
    initialKey = "thomas";
  }
  var pageKind = (body && body.getAttribute("data-page-kind")) || "standard";

  var activeRegime = REGIMES[initialKey];
  var fromRegime = activeRegime;
  var morphProgress = 1;

  // Responsive filament budget
  var isCompactScreen = window.innerWidth < 720;
  var FILAMENT_COUNT = isCompactScreen ? 130 : 210;
  var TRAIL_LEN = isCompactScreen ? 40 : 52;
  var DUST_COUNT = isCompactScreen ? 120 : 220;

  if (hudCount) {
    hudCount.textContent = String(FILAMENT_COUNT);
  }

  // Ring-buffer storage for filaments: [FILAMENT_COUNT * TRAIL_LEN * 3]
  var trailPos = new Float32Array(FILAMENT_COUNT * TRAIL_LEN * 3);
  var trailSpd = new Float32Array(FILAMENT_COUNT * TRAIL_LEN);
  var headIndex = new Int32Array(FILAMENT_COUNT);
  var curPos = new Float32Array(FILAMENT_COUNT * 3);
  var projBuf = new Float32Array(TRAIL_LEN * 4); // screenX, screenY, zCam, speed

  // Ambient phase-dust motes
  var dustPos = new Float32Array(DUST_COUNT * 3);
  var dustPhase = new Float32Array(DUST_COUNT);

  // Scratch vectors for RK4
  var k1 = [0, 0, 0];
  var k2 = [0, 0, 0];
  var k3 = [0, 0, 0];
  var k4 = [0, 0, 0];
  var tmpA = [0, 0, 0];
  var tmpB = [0, 0, 0];

  // Viewport & camera state
  var width = 0;
  var height = 0;
  var dpr = 1;
  var yaw = 0.55;
  var pitch = activeRegime.basePitch;
  var targetPitch = activeRegime.basePitch;
  var userYawOffset = 0;
  var userPitchOffset = 0;
  var zoom = activeRegime.camZoom;
  var targetZoom = activeRegime.camZoom;
  var scrollNormalized = 0;

  // Pointer & perturbation state
  var pointer = {
    x: 0.5,
    y: 0.5,
    smoothX: 0.5,
    smoothY: 0.5,
    vx: 0,
    vy: 0,
    active: false,
    dragging: false,
    lastDragX: 0,
    lastDragY: 0
  };
  var pulseEnergy = 0;
  var pulsePhase = 0;
  var isPaused = false;
  var isInspecting = false;
  var frameCounter = 0;
  var smoothedMeanSpeed = 0.011;

  // Spectral color palette: 5 velocity bands x 4 alpha tiers = 20 batched stroke styles
  // Transitions from deep Cerenkov verdigris -> celestial slate -> warm alabaster -> burnished amber
  var PALETTE_RGB = [
    [76, 178, 174],   // Slow saddle glide: deep verdigris teal
    [108, 198, 191],  // Luminous Cerenkov teal
    [214, 208, 198],  // Mid-velocity: warm silvered alabaster
    [228, 158, 96],   // Accelerating fold: burnished brass/amber
    [244, 192, 128]   // Peak plunge: incandescent gold
  ];
  var ALPHA_TIERS = [0.055, 0.115, 0.205, 0.33];
  var ALPHA_TIERS_HOME = [0.068, 0.14, 0.25, 0.39];
  var ALPHA_TIERS_INSPECT = [0.075, 0.16, 0.28, 0.45];
  var BUCKET_COUNT = PALETTE_RGB.length * ALPHA_TIERS.length;

  // Pre-build glow sprite for leading filament tracers
  var spriteTeal = createGlowSprite(107, 201, 193);
  var spriteAmber = createGlowSprite(236, 172, 108);

  function createGlowSprite(r, g, b) {
    var sCanvas = document.createElement("canvas");
    sCanvas.width = 32;
    sCanvas.height = 32;
    var sCtx = sCanvas.getContext("2d");
    var grad = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255, 250, 242, 0.95)");
    grad.addColorStop(0.22, "rgba(" + r + "," + g + "," + b + ", 0.65)");
    grad.addColorStop(0.58, "rgba(" + r + "," + g + "," + b + ", 0.14)");
    grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ", 0)");
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 32, 32);
    return sCanvas;
  }

  // Deterministic-ish Halton/golden-ratio low-discrepancy seeding so filaments fill all lobes evenly
  function seedPoint(idx, radius, outArr, offset) {
    var phi = idx * 2.399963229728653;
    var u = ((idx * 0.618033988749895) % 1) * 2 - 1;
    var r = radius * (0.28 + 0.72 * ((idx * 0.7548776662466927) % 1));
    var s = Math.sqrt(Math.max(0, 1 - u * u));
    outArr[offset] = r * s * Math.cos(phi);
    outArr[offset + 1] = r * s * Math.sin(phi);
    outArr[offset + 2] = r * u;
  }

  function evalBlendedField(ux, uy, uz, out) {
    if (morphProgress >= 0.999) {
      activeRegime.evalField(ux, uy, uz, out);
    } else {
      var t = morphProgress * morphProgress * (3 - 2 * morphProgress);
      fromRegime.evalField(ux, uy, uz, tmpA);
      activeRegime.evalField(ux, uy, uz, tmpB);
      out[0] = tmpA[0] + (tmpB[0] - tmpA[0]) * t;
      out[1] = tmpA[1] + (tmpB[1] - tmpA[1]) * t;
      out[2] = tmpA[2] + (tmpB[2] - tmpA[2]) * t;
    }

    if (pulseEnergy > 0.0005) {
      var wave = pulseEnergy * 0.022;
      out[0] += Math.sin(uy * 4.2 + pulsePhase) * wave;
      out[1] += Math.sin(uz * 4.2 + pulsePhase * 1.13) * wave;
      out[2] += Math.cos(ux * 4.2 - pulsePhase * 0.89) * wave;
    }
  }

  function rk4Step(posArr, baseOffset) {
    var x = posArr[baseOffset];
    var y = posArr[baseOffset + 1];
    var z = posArr[baseOffset + 2];

    evalBlendedField(x, y, z, k1);
    evalBlendedField(x + k1[0] * 0.5, y + k1[1] * 0.5, z + k1[2] * 0.5, k2);
    evalBlendedField(x + k2[0] * 0.5, y + k2[1] * 0.5, z + k2[2] * 0.5, k3);
    evalBlendedField(x + k3[0], y + k3[1], z + k3[2], k4);

    var dx = (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6;
    var dy = (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6;
    var dz = (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) / 6;

    posArr[baseOffset] = x + dx;
    posArr[baseOffset + 1] = y + dy;
    posArr[baseOffset + 2] = z + dz;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function resetFilament(i) {
    var cOff = i * 3;
    seedPoint(i + 17 + frameCounter, activeRegime.seedRadius, curPos, cOff);
    // Warm onto the invariant manifold
    var w;
    var spd = 0.01;
    for (w = 0; w < 70; w += 1) {
      spd = rk4Step(curPos, cOff);
    }
    var base = i * TRAIL_LEN * 3;
    var sBase = i * TRAIL_LEN;
    for (w = 0; w < TRAIL_LEN; w += 1) {
      spd = rk4Step(curPos, cOff);
      var idx3 = base + w * 3;
      trailPos[idx3] = curPos[cOff];
      trailPos[idx3 + 1] = curPos[cOff + 1];
      trailPos[idx3 + 2] = curPos[cOff + 2];
      trailSpd[sBase + w] = spd;
    }
    headIndex[i] = TRAIL_LEN - 1;
  }

  function initSimulation() {
    var i;
    var step;
    for (i = 0; i < FILAMENT_COUNT; i += 1) {
      var cOff = i * 3;
      seedPoint(i + 1, activeRegime.seedRadius, curPos, cOff);
      // Stagger warmup lengths so filaments distribute organically along the whole attractor
      var warmupCount = 90 + ((i * 19) % 140);
      for (step = 0; step < warmupCount; step += 1) {
        rk4Step(curPos, cOff);
      }
      var base = i * TRAIL_LEN * 3;
      var sBase = i * TRAIL_LEN;
      for (step = 0; step < TRAIL_LEN; step += 1) {
        rk4Step(curPos, cOff);
        var spd = rk4Step(curPos, cOff);
        var idx3 = base + step * 3;
        trailPos[idx3] = curPos[cOff];
        trailPos[idx3 + 1] = curPos[cOff + 1];
        trailPos[idx3 + 2] = curPos[cOff + 2];
        trailSpd[sBase + step] = spd * 2;
      }
      headIndex[i] = TRAIL_LEN - 1;
    }

    for (i = 0; i < DUST_COUNT; i += 1) {
      var dOff = i * 3;
      seedPoint(i + 503, activeRegime.seedRadius * 1.45, dustPos, dOff);
      for (step = 0; step < 60; step += 1) {
        rk4Step(dustPos, dOff);
      }
      dustPhase[i] = (i * 1.6180339) % 6.283185;
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth || document.documentElement.clientWidth;
    height = window.innerHeight || document.documentElement.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stepSimulation() {
    if (morphProgress < 1) {
      morphProgress = Math.min(1, morphProgress + 0.016);
    }
    if (pulseEnergy > 0.0004) {
      pulseEnergy *= 0.962;
      pulsePhase += 0.19;
    } else {
      pulseEnergy = 0;
    }

    // Camera trigonometric basis (needed for pointer sight-ray perturbation)
    var effYaw = yaw + userYawOffset + (pointer.smoothX - 0.5) * 0.34 + scrollNormalized * 0.85;
    var effPitch = pitch + userPitchOffset + (pointer.smoothY - 0.5) * 0.24;
    var cy = Math.cos(effYaw);
    var sy = Math.sin(effYaw);
    var cp = Math.cos(effPitch);
    var sp = Math.sin(effPitch);

    var hasPointerImpulse = pointer.active && (Math.abs(pointer.vx) + Math.abs(pointer.vy) > 0.0004);
    var ptrNdcX = (pointer.smoothX - 0.5) * 2.4;
    var ptrNdcY = (pointer.smoothY - 0.5) * 2.4;

    var totalSpeed = 0;
    var i;

    for (i = 0; i < FILAMENT_COUNT; i += 1) {
      var cOff = i * 3;
      rk4Step(curPos, cOff);
      var s2 = rk4Step(curPos, cOff);
      var stepSpd = s2 * 2;

      var ux = curPos[cOff];
      var uy = curPos[cOff + 1];
      var uz = curPos[cOff + 2];

      // Gentle localized curl deflection when the cursor sweeps near a filament
      if (hasPointerImpulse) {
        var rx = ux * cy + uz * sy;
        var rz = -ux * sy + uz * cy;
        var ry = uy * cp - rz * sp;
        var dxScreen = rx - ptrNdcX;
        var dyScreen = -ry - ptrNdcY;
        var d2 = dxScreen * dxScreen + dyScreen * dyScreen;
        if (d2 < 0.26) {
          var falloff = (1 - d2 / 0.26) * 0.028;
          // Convert screen swirl impulse back along camera right/up vectors
          var impRight = (pointer.vx * 18 - dyScreen * 0.12) * falloff;
          var impUp = (-pointer.vy * 18 + dxScreen * 0.12) * falloff;
          ux += cy * impRight - sy * sp * impUp;
          uy += cp * impUp;
          uz += sy * impRight + cy * sp * impUp;
          curPos[cOff] = ux;
          curPos[cOff + 1] = uy;
          curPos[cOff + 2] = uz;
          stepSpd += falloff * 0.35;
        }
      }

      var mag2 = ux * ux + uy * uy + uz * uz;
      if (mag2 > 9.5 || !(mag2 >= 0)) {
        resetFilament(i);
        continue;
      }

      var nextHead = (headIndex[i] + 1) % TRAIL_LEN;
      headIndex[i] = nextHead;
      var tOff = (i * TRAIL_LEN + nextHead) * 3;
      trailPos[tOff] = ux;
      trailPos[tOff + 1] = uy;
      trailPos[tOff + 2] = uz;
      trailSpd[i * TRAIL_LEN + nextHead] = stepSpd;
      totalSpeed += stepSpd;
    }

    smoothedMeanSpeed += (totalSpeed / FILAMENT_COUNT - smoothedMeanSpeed) * 0.08;

    // Step ambient phase-dust at 0.35x speed for calm parallax
    for (i = 0; i < DUST_COUNT; i += 1) {
      var dOff = i * 3;
      evalBlendedField(dustPos[dOff], dustPos[dOff + 1], dustPos[dOff + 2], k1);
      dustPos[dOff] += k1[0] * 0.55;
      dustPos[dOff + 1] += k1[1] * 0.55;
      dustPos[dOff + 2] += k1[2] * 0.55;
      var dm2 =
        dustPos[dOff] * dustPos[dOff] +
        dustPos[dOff + 1] * dustPos[dOff + 1] +
        dustPos[dOff + 2] * dustPos[dOff + 2];
      if (dm2 > 8.5 || !(dm2 >= 0)) {
        seedPoint(i + frameCounter, activeRegime.seedRadius * 1.2, dustPos, dOff);
      }
    }

    pointer.vx *= 0.86;
    pointer.vy *= 0.86;
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    var effYaw = yaw + userYawOffset + (pointer.smoothX - 0.5) * 0.34 + scrollNormalized * 0.85;
    var effPitch = pitch + userPitchOffset + (pointer.smoothY - 0.5) * 0.24;
    var cy = Math.cos(effYaw);
    var sy = Math.sin(effYaw);
    var cp = Math.cos(effPitch);
    var sp = Math.sin(effPitch);

    // Subtle asymmetric composition on standard/prose pages so wings grace the viewport margins
    var centerX = width * 0.5;
    var centerY = height * 0.5;
    if (!isInspecting && width > 960) {
      if (pageKind === "home") {
        centerY = height * 0.44;
      } else if (pageKind === "prose") {
        centerX = width * 0.54;
        centerY = height * 0.48;
      }
    }

    var minDim = Math.min(width, height);
    var stageSpan = isInspecting
      ? minDim * (isCompactScreen ? 0.44 : 0.46)
      : Math.max(width * 0.38, minDim * 0.56);
    var baseScale = stageSpan * zoom;
    var camDist = 3.55;

    var alphaTable = isInspecting
      ? ALPHA_TIERS_INSPECT
      : pageKind === "home"
        ? ALPHA_TIERS_HOME
        : ALPHA_TIERS;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // 1. Render deep phase-dust motes
    var i;
    ctx.fillStyle = "rgba(150, 206, 202, 0.14)";
    ctx.beginPath();
    for (i = 0; i < DUST_COUNT; i += 1) {
      var dOff = i * 3;
      var dx = dustPos[dOff];
      var dy = dustPos[dOff + 1];
      var dz = dustPos[dOff + 2];

      var rx1 = dx * cy + dz * sy;
      var rz1 = -dx * sy + dz * cy;
      var ry2 = dy * cp - rz1 * sp;
      var rz2 = dy * sp + rz1 * cp;

      var depth = camDist - rz2;
      if (depth <= 0.35) {
        continue;
      }
      var persp = (camDist * 0.72) / depth;
      var sx = centerX + rx1 * baseScale * persp;
      var syScreen = centerY - ry2 * baseScale * persp;
      if (sx < -20 || sx > width + 20 || syScreen < -20 || syScreen > height + 20) {
        continue;
      }
      var rad = rz2 > 0.2 ? 1.25 : 0.85;
      ctx.moveTo(sx + rad, syScreen);
      ctx.arc(sx, syScreen, rad, 0, 6.283185);
    }
    ctx.fill();

    // 2. Bucket filament segments into 20 (colorBand x alphaTier) Path2D/canvas batches
    var buckets = new Array(BUCKET_COUNT);
    for (i = 0; i < BUCKET_COUNT; i += 1) {
      buckets[i] = [];
    }

    var invMean = 1 / Math.max(0.004, smoothedMeanSpeed * 2.05);
    var tracerHeads = [];

    for (i = 0; i < FILAMENT_COUNT; i += 1) {
      var head = headIndex[i];
      var fBase = i * TRAIL_LEN;
      var s;

      // Project ordered trail from oldest (s = 0) to newest (s = TRAIL_LEN - 1)
      for (s = 0; s < TRAIL_LEN; s += 1) {
        var ringIdx = (head + 1 + s) % TRAIL_LEN;
        var pOff = (fBase + ringIdx) * 3;
        var ux = trailPos[pOff];
        var uy = trailPos[pOff + 1];
        var uz = trailPos[pOff + 2];

        var x1 = ux * cy + uz * sy;
        var z1 = -ux * sy + uz * cy;
        var y2 = uy * cp - z1 * sp;
        var z2 = uy * sp + z1 * cp;

        var d = camDist - z2;
        var p = d > 0.25 ? (camDist * 0.72) / d : 0;
        var pb = s * 4;
        projBuf[pb] = centerX + x1 * baseScale * p;
        projBuf[pb + 1] = centerY - y2 * baseScale * p;
        projBuf[pb + 2] = z2;
        projBuf[pb + 3] = trailSpd[fBase + ringIdx];
      }

      for (s = 1; s < TRAIL_LEN; s += 1) {
        var pb0 = (s - 1) * 4;
        var pb1 = s * 4;
        var xA = projBuf[pb0];
        var yA = projBuf[pb0 + 1];
        var xB = projBuf[pb1];
        var yB = projBuf[pb1 + 1];

        // Guard against wrap jumps
        var segDx = xB - xA;
        var segDy = yB - yA;
        if (segDx * segDx + segDy * segDy > 9000) {
          continue;
        }

        var ageFrac = s / (TRAIL_LEN - 1); // 0 = tail, 1 = head
        var zCam = projBuf[pb1 + 2];
        var depthFactor = Math.max(0.25, Math.min(1.25, 0.72 + zCam * 0.34));
        var intensity = ageFrac * ageFrac * depthFactor;

        var alphaIdx =
          intensity > 0.78 ? 3 : intensity > 0.46 ? 2 : intensity > 0.2 ? 1 : 0;

        var spdNorm = projBuf[pb1 + 3] * invMean;
        var colorIdx =
          spdNorm > 1.32
            ? 4
            : spdNorm > 1.02
              ? 3
              : spdNorm > 0.76
                ? 2
                : spdNorm > 0.52
                  ? 1
                  : 0;

        buckets[colorIdx * 4 + alphaIdx].push(xA, yA, xB, yB);
      }

      // Every 5th filament gets a soft luminous tracer spark at its leading head
      if (i % 5 === 0) {
        var hOff = (TRAIL_LEN - 1) * 4;
        tracerHeads.push(
          projBuf[hOff],
          projBuf[hOff + 1],
          projBuf[hOff + 2],
          projBuf[hOff + 3] * invMean
        );
      }
    }

    ctx.lineCap = "round";
    for (i = 0; i < BUCKET_COUNT; i += 1) {
      var segs = buckets[i];
      var len = segs.length;
      if (!len) {
        continue;
      }
      var cIdx = (i / 4) | 0;
      var aIdx = i % 4;
      var rgb = PALETTE_RGB[cIdx];
      var alpha = alphaTable[aIdx];

      ctx.strokeStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha + ")";
      ctx.lineWidth = aIdx === 3 ? 1.45 : aIdx === 2 ? 1.15 : 0.9;
      ctx.beginPath();
      var j;
      for (j = 0; j < len; j += 4) {
        ctx.moveTo(segs[j], segs[j + 1]);
        ctx.lineTo(segs[j + 2], segs[j + 3]);
      }
      ctx.stroke();
    }

    // 3. Draw luminous tracer heads
    for (i = 0; i < tracerHeads.length; i += 4) {
      var hx = tracerHeads[i];
      var hy = tracerHeads[i + 1];
      var hz = tracerHeads[i + 2];
      var hSpd = tracerHeads[i + 3];
      var size = Math.max(5.5, Math.min(14, 9 + hz * 2.8));
      ctx.globalAlpha = isInspecting ? 0.9 : pageKind === "home" ? 0.78 : 0.62;
      ctx.drawImage(
        hSpd > 0.92 ? spriteAmber : spriteTeal,
        hx - size * 0.5,
        hy - size * 0.5,
        size,
        size
      );
    }

    ctx.restore();
  }

  function updateHudReadout() {
    if (hudVel && frameCounter % 12 === 0) {
      hudVel.textContent = (smoothedMeanSpeed * 38).toFixed(2);
    }
  }

  function switchRegime(key) {
    var next = REGIMES[key];
    if (!next || next === activeRegime) {
      return;
    }
    fromRegime = activeRegime;
    activeRegime = next;
    morphProgress = 0;
    targetPitch = next.basePitch;
    targetZoom = next.camZoom;

    if (hudName) hudName.textContent = next.name;
    if (hudEq) hudEq.textContent = next.eq;
    if (hudParam) hudParam.textContent = next.param;
    if (pillLabel) pillLabel.textContent = next.pill;
    if (pillSub) pillSub.textContent = next.sub;

    regimeButtons.forEach(function (btn) {
      var active = btn.getAttribute("data-regime") === key;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function syncHudInitial() {
    if (hudName) hudName.textContent = activeRegime.name;
    if (hudEq) hudEq.textContent = activeRegime.eq;
    if (hudParam) hudParam.textContent = activeRegime.param;
    if (pillLabel) pillLabel.textContent = activeRegime.pill;
    if (pillSub) pillSub.textContent = activeRegime.sub;
    regimeButtons.forEach(function (btn) {
      var active = btn.getAttribute("data-regime") === activeRegime.key;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function triggerPerturb() {
    pulseEnergy = 1;
    if (isPaused) {
      stepSimulation();
      render();
    }
  }

  function setInspectMode(enabled) {
    isInspecting = enabled;
    body.classList.toggle("is-inspecting-field", enabled);
    if (btnExitInspect) {
      btnExitInspect.hidden = !enabled;
    }
    if (btnInspect) {
      btnInspect.classList.toggle("is-active", enabled);
    }
    if (!enabled) {
      targetZoom = activeRegime.camZoom;
    }
    if (isPaused) {
      render();
    }
  }

  function updateScrollTelemetry() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    var docHeight = Math.max(
      1,
      (document.documentElement.scrollHeight || 1) - (window.innerHeight || 1)
    );
    scrollNormalized = Math.max(0, Math.min(1, scrollTop / docHeight));

    if (headerEl) {
      headerEl.classList.toggle("is-scrolled", scrollTop > 12);
    }
    if (progressEl) {
      if (hasReadingTrack && docHeight > 160) {
        progressEl.style.transform = "scaleX(" + scrollNormalized.toFixed(4) + ")";
        progressEl.style.opacity = scrollTop > 24 ? "1" : "0";
      } else {
        progressEl.style.opacity = "0";
      }
    }
  }

  // Event wiring
  window.addEventListener(
    "pointermove",
    function (e) {
      var nx = e.clientX / Math.max(1, width);
      var ny = e.clientY / Math.max(1, height);
      if (pointer.active) {
        pointer.vx = nx - pointer.x;
        pointer.vy = ny - pointer.y;
      }
      pointer.x = nx;
      pointer.y = ny;
      pointer.active = true;

      if (pointer.dragging) {
        var dx = e.clientX - pointer.lastDragX;
        var dy = e.clientY - pointer.lastDragY;
        pointer.lastDragX = e.clientX;
        pointer.lastDragY = e.clientY;
        userYawOffset += dx * 0.0065;
        userPitchOffset = Math.max(
          -1.25,
          Math.min(1.25, userPitchOffset + dy * 0.0065)
        );
        if (isPaused) {
          render();
        }
      }
    },
    { passive: true }
  );

  window.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) {
      return;
    }
    // Allow 3D orbit dragging when in Inspect 3D mode or clicking empty background margin
    var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
    var isEmptyMargin =
      e.target === body ||
      e.target === document.documentElement ||
      (e.target && e.target.classList && e.target.classList.contains("site-shell")) ||
      (e.target && e.target.classList && e.target.classList.contains("page-content"));

    if (isInspecting || (isEmptyMargin && tag !== "a" && tag !== "button")) {
      pointer.dragging = true;
      pointer.lastDragX = e.clientX;
      pointer.lastDragY = e.clientY;
    }
  });

  window.addEventListener("pointerup", function () {
    pointer.dragging = false;
  });

  window.addEventListener(
    "wheel",
    function (e) {
      if (!isInspecting) {
        return;
      }
      e.preventDefault();
      targetZoom = Math.max(0.55, Math.min(2.15, targetZoom - e.deltaY * 0.0012));
      if (isPaused) {
        zoom = targetZoom;
        render();
      }
    },
    { passive: false }
  );

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (isInspecting) {
        setInspectMode(false);
      } else if (hudPanel && !hudPanel.hidden) {
        hudPanel.hidden = true;
        if (hudToggle) hudToggle.setAttribute("aria-expanded", "false");
      }
    }
  });

  if (hudToggle && hudPanel) {
    hudToggle.addEventListener("click", function () {
      var willOpen = hudPanel.hidden;
      hudPanel.hidden = !willOpen;
      hudToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  }

  if (hudClose && hudPanel && hudToggle) {
    hudClose.addEventListener("click", function () {
      hudPanel.hidden = true;
      hudToggle.setAttribute("aria-expanded", "false");
    });
  }

  regimeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchRegime(btn.getAttribute("data-regime"));
    });
  });

  if (btnPerturb) {
    btnPerturb.addEventListener("click", triggerPerturb);
  }

  if (btnInspect) {
    btnInspect.addEventListener("click", function () {
      setInspectMode(!isInspecting);
    });
  }

  if (btnExitInspect) {
    btnExitInspect.addEventListener("click", function () {
      setInspectMode(false);
    });
  }

  if (btnPause) {
    btnPause.addEventListener("click", function () {
      isPaused = !isPaused;
      btnPause.textContent = isPaused ? "Resume" : "Pause";
      btnPause.setAttribute("aria-pressed", isPaused ? "true" : "false");
      if (liveDot) {
        liveDot.classList.toggle("is-paused", isPaused);
      }
      if (!isPaused) {
        requestAnimationFrame(tick);
      }
    });
  }

  var scrollTicking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(function () {
          scrollTicking = false;
          updateScrollTelemetry();
          if (isPaused || prefersReducedMotion) {
            render();
          }
        });
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", function () {
    resize();
    updateScrollTelemetry();
    render();
  });

  function tick() {
    if (isPaused) {
      return;
    }
    if (!document.hidden) {
      frameCounter += 1;
      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.065;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.065;
      pitch += (targetPitch - pitch) * 0.035;
      zoom += (targetZoom - zoom) * 0.07;

      if (!pointer.dragging) {
        yaw += 0.0014;
      }

      stepSimulation();
      render();
      updateHudReadout();
    }
    if (!prefersReducedMotion) {
      requestAnimationFrame(tick);
    }
  }

  // Graceful broken-cover fallback for external book cover URLs
  function attachCoverFallbacks() {
    var imgs = document.querySelectorAll(
      ".book-cover-small, .mini-cover-stack img, .year-cover-strip img, .ledger-thumb"
    );
    Array.prototype.forEach.call(imgs, function (img) {
      function handleBroken() {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = "1";
        if (img.classList.contains("book-cover-small")) {
          var frame = img.parentElement;
          if (frame && frame.classList.contains("book-cover-frame")) {
            var title = (img.getAttribute("alt") || "?").trim();
            var ph = document.createElement("div");
            ph.className = "book-cover-placeholder book-cover-placeholder-tall";
            ph.setAttribute("aria-hidden", "true");
            var span = document.createElement("span");
            span.className = "placeholder-monogram";
            span.textContent = title.charAt(0).toUpperCase() || "?";
            ph.appendChild(span);
            frame.appendChild(ph);
            img.style.display = "none";
          }
        } else {
          img.style.display = "none";
        }
      }
      img.addEventListener("error", handleBroken);
      if (img.complete && img.naturalWidth === 0) {
        handleBroken();
      }
    });
  }

  // Boot
  resize();
  syncHudInitial();
  initSimulation();
  updateScrollTelemetry();
  attachCoverFallbacks();
  render();

  if (prefersReducedMotion) {
    isPaused = true;
    if (btnPause) {
      btnPause.textContent = "Resume";
      btnPause.setAttribute("aria-pressed", "true");
    }
    if (liveDot) {
      liveDot.classList.add("is-paused");
    }
  } else {
    requestAnimationFrame(tick);
  }
})();

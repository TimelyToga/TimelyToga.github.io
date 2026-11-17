(function () {
  "use strict";

  var canvas = document.getElementById("phase-space-canvas");
  if (!canvas || !canvas.getContext) {
    return;
  }

  var ctx = canvas.getContext("2d", { alpha: true });
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;
  var pageKind = (body && body.getAttribute("data-page-kind")) || "standard";

  // Minimal bottom-right controls
  var hudEl = document.getElementById("phase-hud");
  var liveDot = document.getElementById("phase-live-dot");
  var btnQuickToggle = document.getElementById("phase-bg-quick-toggle");
  var quickToggleText = document.getElementById("phase-bg-toggle-text");
  var barSlider = document.getElementById("phase-bg-slider");
  var btnPrev = document.getElementById("phase-flow-prev");
  var btnNext = document.getElementById("phase-flow-next");
  var btnShuffle = document.getElementById("phase-flow-shuffle");

  var LEVEL_KEY = "timelytoga_phase_bg_level";
  var DEFAULT_BG_LEVEL = 78;

  // Library of 18 intricate 3D fluid, topological & strange vector fields (no textbook cliches)
  // Flow 01 models the 2026 OpenAI Navier-Stokes inward-spiraling stretched vortex + annulus pulses
  var FLOWS = [
    {
      // 01: Axisymmetric Swirling Stretched-Vortex Singularity (Navier-Stokes 2026)
      seedRadius: 0.95,
      camZoom: 1.06,
      basePitch: -0.38,
      evalField: function (x, y, z, t, out) {
        var r2 = x * x + z * z;
        var r = Math.sqrt(r2 + 1e-5);
        var r02 = 0.4 + 0.06 * Math.sin(t * 0.23);
        var y02 = 0.72 + 0.08 * Math.cos(t * 0.19);
        var env = Math.exp(-(r2 / (r02 * 2.2) + (y * y) / (y02 * 2.0)));
        var wm = 0.021;
        var ur = -wm * r * (1 - (1.95 * y * y) / y02) * env;
        var uy = wm * 1.45 * y * (1 - r2 / r02) * env;
        var eps2 = 0.03 + 0.01 * (0.5 + 0.5 * Math.sin(t * 0.29));
        var omega =
          (0.0125 / Math.pow(r2 + eps2, 0.66)) * Math.exp(-0.28 * (r2 + 0.42 * y * y));
        var theta = Math.atan2(z, x);
        var ann = r * Math.exp(-Math.pow((r - 0.62) / 0.28, 2));
        var pulse = 0.0038 * ann * Math.sin(3 * theta - 4.0 * y + t * 0.52);
        var bowl = Math.max(0, r2 + 0.75 * y * y - 0.78) * 0.008;
        var tilt = 0.0018 * Math.sin(t * 0.17);
        out[0] = (ur * x) / r - omega * z + pulse * Math.cos(theta) - x * bowl + tilt * y;
        out[1] = uy - y * bowl * 1.15;
        out[2] = (ur * z) / r + omega * x + pulse * Math.sin(theta) - z * bowl - tilt * x;
      }
    },
    {
      // 02: Stereographic Hopf Fibration Link (interlocking Villarceau circles)
      seedRadius: 0.9,
      camZoom: 1.04,
      basePitch: 0.44,
      evalField: function (x, y, z, t, out) {
        var a = 0.76 + 0.09 * Math.sin(t * 0.18);
        var r2 = x * x + y * y + z * z;
        var k = 0.0155 / ((a * a + r2) * 0.85 + 0.35);
        var hx = 2 * (-a * z + x * y);
        var hy = a * a + y * y - x * x - z * z;
        var hz = 2 * (a * x + y * z);
        var pull = (r2 - 0.86) * 0.0045;
        var twist = 0.22 * Math.sin(t * 0.14);
        out[0] = (hx + twist * z) * k - x * pull;
        out[1] = (hy + 0.14 * Math.cos(t * 0.21) * x) * k - y * pull;
        out[2] = (hz - twist * x) * k - z * pull;
      }
    },
    {
      // 03: Travelling Beltrami Curl Eigenfield Labyrinth
      seedRadius: 0.92,
      camZoom: 1.0,
      basePitch: 0.35,
      evalField: function (x, y, z, t, out) {
        var s = 2.55;
        var X = x * s + 0.35 * t * 0.4;
        var Y = y * s + 0.28 * Math.cos(t * 0.17);
        var Z = z * s - 0.3 * t * 0.35;
        var A = 1.0 + 0.16 * Math.sin(t * 0.17);
        var B = 0.86 + 0.15 * Math.cos(t * 0.21);
        var C = 0.74 + 0.15 * Math.sin(t * 0.13 + 1.2);
        var k = 0.011;
        var pull = Math.max(0, x * x + y * y + z * z - 0.78) * 0.014;
        out[0] = (A * Math.sin(Z) + C * Math.cos(Y)) * k - z * 0.0035 - x * pull;
        out[1] = (B * Math.sin(X) + A * Math.cos(Z)) * k - y * pull;
        out[2] = (C * Math.sin(Y) + B * Math.cos(X)) * k + x * 0.0035 - z * pull;
      }
    },
    {
      // 04: Trefoil (2,3) Knotted Vortex Filament
      seedRadius: 0.88,
      camZoom: 1.06,
      basePitch: -0.48,
      evalField: function (x, y, z, t, out) {
        var R = Math.sqrt(x * x + z * z) + 1e-4;
        var Rs = Math.max(0.34, R);
        var phi = Math.atan2(z, x);
        var ph = phi + t * 0.07;
        var Rk = 0.7 + 0.21 * Math.cos(3 * ph);
        var Yk = 0.26 * Math.sin(3 * ph);
        var dR = R - Rk;
        var dY = y - Yk;
        var swirl = 0.0054 / Math.pow(dR * dR + dY * dY + 0.045, 0.54);
        var uPhi = 0.0086;
        var angRate = uPhi / Rs;
        var uR =
          -dY * swirl -
          dR * 0.0045 -
          0.63 * Math.sin(3 * ph) * angRate +
          0.0018 * Math.cos(2 * ph - t * 0.28);
        var uY =
          dR * swirl -
          dY * 0.0045 +
          0.78 * Math.cos(3 * ph) * angRate +
          0.0018 * Math.sin(2 * ph + t * 0.24);
        out[0] = (uR * x - uPhi * z) / R;
        out[1] = uY;
        out[2] = (uR * z + uPhi * x) / R;
      }
    },
    {
      // 05: Stellarator 5-Period Twisted Flux Islands
      seedRadius: 0.88,
      camZoom: 1.06,
      basePitch: -0.52,
      evalField: function (x, y, z, t, out) {
        var R = Math.sqrt(x * x + z * z) + 1e-4;
        var phi = Math.atan2(z, x);
        var twist = 2.5 * phi - t * 0.16;
        var c = Math.cos(twist);
        var s = Math.sin(twist);
        var dr = R - 0.74;
        var u = dr * c + y * s;
        var v = -dr * s + y * c;
        var rho2 = 1.55 * u * u + 0.65 * v * v;
        var iota = 0.0135 * (1.18 - 0.42 * rho2);
        var du = -0.65 * v * iota - u * (rho2 - 0.17) * 0.007;
        var dv = 1.55 * u * iota - v * (rho2 - 0.17) * 0.007;
        var uR = du * c - dv * s + 0.002 * Math.sin(5 * phi + t * 0.28);
        var uY = du * s + dv * c;
        var uPhi = 0.0105 * (1 + 0.2 * dr);
        out[0] = (uR * x - uPhi * z) / R;
        out[1] = uY;
        out[2] = (uR * z + uPhi * x) / R;
      }
    },
    {
      // 06: Taylor-Couette Wavy Azimuthal Vortex Cells
      seedRadius: 0.9,
      camZoom: 1.04,
      basePitch: -0.34,
      evalField: function (x, y, z, t, out) {
        var R = Math.sqrt(x * x + z * z) + 1e-4;
        var phi = Math.atan2(z, x);
        var wave = 0.15 * Math.sin(4 * phi - t * 0.32);
        var Yw = (y + wave) * 3.3;
        var dr = R - 0.68;
        var uR = 0.011 * Math.cos(Yw) * (0.14 - dr * dr) * 3.2 - dr * 0.004;
        var uY = -0.011 * Math.sin(Yw) * (dr * 2.2) - y * Math.max(0, y * y - 0.72) * 0.015;
        var uPhi = 0.011 * (1.15 - 0.52 * R);
        out[0] = (uR * x - uPhi * z) / R;
        out[1] = uY;
        out[2] = (uR * z + uPhi * x) / R;
      }
    },
    {
      // 07: Dadras Four-Scroll Calligraphic Braid
      seedRadius: 0.8,
      camZoom: 1.0,
      basePitch: 0.36,
      evalField: function (ux, uy, uz, t, out) {
        var s = 5.4;
        var x = ux * s;
        var y = uy * s;
        var z = uz * s;
        var a = 3.0 + 0.14 * Math.sin(t * 0.16);
        var e = 9.0 + 0.35 * Math.cos(t * 0.13);
        var k = 0.0056 / s;
        var dx = (y - a * x + 2.7 * y * z) * k;
        var dy = (1.7 * y - x * z + z) * k;
        var dz = (2.0 * x * y - e * z) * k;
        var r2 = ux * ux + uy * uy + uz * uz;
        if (r2 > 2.2) {
          var p = (r2 - 2.2) * 0.025;
          dx -= ux * p;
          dy -= uy * p;
          dz -= uz * p;
        }
        out[0] = dx;
        out[1] = dy;
        out[2] = dz;
      }
    },
    {
      // 08: Four-Wing Tetrahedral Saddle Clover
      seedRadius: 0.82,
      camZoom: 1.06,
      basePitch: 0.42,
      evalField: function (ux, uy, uz, t, out) {
        var s = 1.28;
        var x = ux * s;
        var y = uy * s;
        var z = uz * s;
        var a = 0.2 + 0.022 * Math.sin(t * 0.17);
        var c = -0.4 + 0.025 * Math.cos(t * 0.14);
        var k = 0.044 / s;
        out[0] = (a * x + y * z) * k;
        out[1] = (0.01 * x + c * y - x * z) * k;
        out[2] = (-z - x * y) * k;
      }
    },
    {
      // 09: Rabinovich-Fabrikant Plasma Saddle Canopies
      seedRadius: 0.72,
      camZoom: 1.02,
      basePitch: -0.44,
      evalField: function (ux, uy, uz, t, out) {
        var s = 1.55;
        var x = ux * s;
        var y = uz * s;
        var z = 0.92 + uy * s;
        var gamma = 0.1 + 0.008 * Math.sin(t * 0.15);
        var k = 0.014 / s;
        var dx = (y * (z - 1 + x * x) + gamma * x) * k;
        var dz = (x * (3 * z + 1 - x * x) + gamma * y) * k;
        var dy = -2 * z * (0.14 + x * y) * k;
        var r2 = ux * ux + uy * uy + uz * uz;
        if (r2 > 1.65) {
          var p = (r2 - 1.65) * 0.03;
          dx -= ux * p;
          dy -= uy * p;
          dz -= uz * p;
        }
        out[0] = dx;
        out[1] = dy;
        out[2] = dz;
      }
    },
    {
      // 10: Burke-Shaw Twisted Mobius Ribbon
      seedRadius: 0.8,
      camZoom: 1.06,
      basePitch: 0.32,
      evalField: function (ux, uy, uz, t, out) {
        var s = 1.72;
        var x = ux * s;
        var y = uy * s;
        var z = uz * s;
        var S = 10.0 + 0.6 * Math.sin(t * 0.16);
        var V = 4.272 + 0.25 * Math.cos(t * 0.19);
        var k = 0.0027 / s;
        out[0] = -S * (x + y) * k;
        out[1] = (-y - S * x * z) * k;
        out[2] = (S * x * y + V) * k;
      }
    },
    {
      // 11: Spherical-Harmonic Geostrophic Shell Gyres
      seedRadius: 0.9,
      camZoom: 1.04,
      basePitch: 0.3,
      evalField: function (x, y, z, t, out) {
        var r = Math.sqrt(x * x + y * y + z * z + 1e-5);
        var nx = x / r;
        var ny = y / r;
        var nz = z / r;
        var c1 = Math.cos(t * 0.2);
        var s1 = Math.sin(t * 0.2);
        var X = nx * c1 + nz * s1;
        var Z = -nx * s1 + nz * c1;
        var gx = 2 * ny * X + 0.68 * (3 * X * X - 3 * Z * Z) * (1 - 2 * ny * ny);
        var gy = X * X - Z * Z - 2.72 * X * (X * X - 3 * Z * Z) * ny;
        var gz = -2 * ny * Z - 4.08 * X * Z * (1 - 2 * ny * ny);
        var wx = gx * c1 - gz * s1;
        var wy = gy;
        var wz = gx * s1 + gz * c1;
        var tx = ny * wz - nz * wy;
        var ty = nz * wx - nx * wz;
        var tz = nx * wy - ny * wx;
        var targetR = 0.84 + 0.18 * Math.sin(3 * Math.atan2(Z, X) + 2.2 * ny + t * 0.24);
        var ur = (targetR - r) * 0.016;
        var k = 0.0108;
        out[0] = tx * k + nx * ur;
        out[1] = ty * k + ny * ur;
        out[2] = tz * k + nz * ur;
      }
    },
    {
      // 12: Cinquefoil (2,5) Star-Torus Jet Stream
      seedRadius: 0.88,
      camZoom: 1.06,
      basePitch: -0.5,
      evalField: function (x, y, z, t, out) {
        var R = Math.sqrt(x * x + z * z) + 1e-4;
        var Rs = Math.max(0.36, R);
        var phi = Math.atan2(z, x);
        var ph = phi - t * 0.05;
        var Rk = 0.72 + 0.18 * Math.cos(5 * ph);
        var Yk = 0.21 * Math.sin(5 * ph) + 0.08 * Math.cos(2 * ph + t * 0.18);
        var dR = R - Rk;
        var dY = y - Yk;
        var swirl = 0.0044 / Math.pow(dR * dR + dY * dY + 0.042, 0.52);
        var uPhi = 0.0074;
        var angRate = uPhi / Rs;
        var uR = -dY * swirl - dR * 0.0055 - 0.9 * Math.sin(5 * ph) * angRate;
        var uY = dR * swirl - dY * 0.0055 + 1.05 * Math.cos(5 * ph) * angRate;
        out[0] = (uR * x - uPhi * z) / R;
        out[1] = uY;
        out[2] = (uR * z + uPhi * x) / R;
      }
    },
    {
      // 13: Braided Double-Helix Vortex Merger
      seedRadius: 0.85,
      camZoom: 1.02,
      basePitch: -0.28,
      evalField: function (x, y, z, t, out) {
        var r2 = x * x + z * z;
        var ang = t * 0.24 + y * 2.5;
        var cA = Math.cos(ang);
        var sA = Math.sin(ang);
        var sep = 0.44 + 0.06 * Math.sin(t * 0.19);
        var d1x = x - sep * cA;
        var d1z = z - sep * sA;
        var d2x = x + sep * cA;
        var d2z = z + sep * sA;
        var w1 = 0.0054 / (d1x * d1x + d1z * d1z + 0.065);
        var w2 = 0.0054 / (d2x * d2x + d2z * d2z + 0.065);
        out[0] = -d1z * w1 - d2z * w2 - x * (r2 - 0.58) * 0.009;
        out[1] = 0.0115 * Math.cos(r2 * 3.4 - t * 0.22) * (1 - 0.85 * y * y) - y * 0.0045;
        out[2] = d1x * w1 + d2x * w2 - z * (r2 - 0.58) * 0.009;
      }
    },
    {
      // 14: Nose-Hoover Interlaced Torus Web
      seedRadius: 0.82,
      camZoom: 1.04,
      basePitch: 0.36,
      evalField: function (ux, uy, uz, t, out) {
        var s = 2.1;
        var x = ux * s;
        var y = uy * s;
        var z = uz * s;
        var a = 1.5 + 0.22 * Math.sin(t * 0.18);
        var k = 0.0108 / s;
        var dx = y * k;
        var dy = (-x + y * z) * k;
        var dz = (a - y * y) * k;
        var r2 = ux * ux + uy * uy + uz * uz;
        if (r2 > 2.0) {
          var p = (r2 - 2.0) * 0.022;
          dx -= ux * p;
          dy -= uy * p;
          dz -= uz * p;
        }
        out[0] = dx;
        out[1] = dy;
        out[2] = dz;
      }
    },
    {
      // 15: Polar Spindle-Torus Shroud
      seedRadius: 0.78,
      camZoom: 1.08,
      basePitch: -0.52,
      evalField: function (ux, uy, uz, t, out) {
        var s = 1.18;
        var x = ux * s;
        var y = uz * s;
        var z = 0.72 + uy * s;
        var d = 3.5 + 0.25 * Math.cos(t * 0.14);
        var c = 0.62 + 0.025 * Math.sin(t * 0.19);
        var r2 = x * x + y * y;
        var k = 0.0054 / s;
        out[0] = ((z - 0.7) * x - d * y) * k;
        out[1] = (c + 0.95 * z - (z * z * z) / 3 - r2 * (1 + 0.25 * z) + 0.1 * z * x * x * x) * k;
        out[2] = (d * x + (z - 0.7) * y) * k;
      }
    },
    {
      // 16: Cyclic Sinusoidal Crystal Filigree
      seedRadius: 0.85,
      camZoom: 0.96,
      basePitch: 0.42,
      evalField: function (ux, uy, uz, t, out) {
        var s = 3.6;
        var x = ux * s;
        var y = uy * s;
        var z = uz * s;
        var b = 0.176 + 0.015 * Math.sin(t * 0.19);
        var k = 0.048 / s;
        out[0] = (Math.sin(y) - b * x + 0.045 * Math.sin(t * 0.13 + uz)) * k;
        out[1] = (Math.sin(z) - b * y + 0.045 * Math.cos(t * 0.17 + ux)) * k;
        out[2] = (Math.sin(x) - b * z + 0.045 * Math.sin(t * 0.11 - uy)) * k;
      }
    },
    {
      // 17: Cyclic Three-Crown Braid
      seedRadius: 0.68,
      camZoom: 0.92,
      basePitch: 0.5,
      evalField: function (ux, uy, uz, t, out) {
        var s = 6.2;
        var x = -2.1 + ux * s;
        var y = -2.1 + uy * s;
        var z = -2.1 + uz * s;
        var a = 1.42 + 0.06 * Math.sin(t * 0.17);
        var k = 0.0023 / s;
        var dx = (-a * x - 4 * y - 4 * z - y * y + 0.34 * Math.sin(t * 0.13)) * k;
        var dy = (-a * y - 4 * z - 4 * x - z * z + 0.34 * Math.cos(t * 0.16)) * k;
        var dz = (-a * z - 4 * x - 4 * y - x * x - 0.34 * Math.sin(t * 0.19)) * k;
        var r2 = ux * ux + uy * uy + uz * uz;
        if (r2 > 2.8) {
          var p = (r2 - 2.8) * 0.035;
          dx -= ux * p;
          dy -= uy * p;
          dz -= uz * p;
        }
        out[0] = dx;
        out[1] = dy;
        out[2] = dz;
      }
    },
    {
      // 18: Figure-Eight Lissajous Vortex Knot
      seedRadius: 0.88,
      camZoom: 1.04,
      basePitch: 0.26,
      evalField: function (x, y, z, t, out) {
        var phi = Math.atan2(z, x);
        var R = Math.sqrt(x * x + z * z) + 1e-4;
        var Rs = Math.max(0.35, R);
        var ph = phi + t * 0.06;
        var Rk = 0.66 + 0.24 * Math.cos(2 * ph);
        var Yk = 0.34 * Math.sin(3 * ph);
        var dR = R - Rk;
        var dY = y - Yk;
        var swirl = 0.005 / Math.pow(dR * dR + dY * dY + 0.045, 0.54);
        var uPhi = 0.0082;
        var angRate = uPhi / Rs;
        var uR = -dY * swirl - dR * 0.0048 - 0.48 * Math.sin(2 * ph) * angRate;
        var uY = dR * swirl - dY * 0.0048 + 1.02 * Math.cos(3 * ph) * angRate;
        out[0] = (uR * x - uPhi * z) / R;
        out[1] = uY;
        out[2] = (uR * z + uPhi * x) / R;
      }
    }
  ];

  function loadInitialBgLevel() {
    try {
      var raw = window.localStorage.getItem(LEVEL_KEY);
      if (raw !== null && raw !== "") {
        var parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          return parsed;
        }
      }
    } catch (err) {
      // Ignore storage errors
    }
    return prefersReducedMotion ? 0 : DEFAULT_BG_LEVEL;
  }

  function persistBgLevel(val) {
    try {
      window.localStorage.setItem(LEVEL_KEY, String(val));
    } catch (err) {
      // Ignore storage errors
    }
  }

  // Slight selection boost for standout sculptural flows (07-11, 14, 16) while keeping all 18 in rotation
  var FAVORITE_WEIGHTS = [
    1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2.6,
    1, 1, 2, 1, 2,
    1, 1
  ];

  function pickRandomFlowIndex(excludeIdx) {
    var totalWeight = 0;
    var i;
    for (i = 0; i < FLOWS.length; i += 1) {
      if (i !== excludeIdx) {
        totalWeight += FAVORITE_WEIGHTS[i] || 1;
      }
    }
    var roll = Math.random() * totalWeight;
    for (i = 0; i < FLOWS.length; i += 1) {
      if (i === excludeIdx) {
        continue;
      }
      roll -= FAVORITE_WEIGHTS[i] || 1;
      if (roll <= 0) {
        return i;
      }
    }
    return ((excludeIdx + 1) % FLOWS.length + FLOWS.length) % FLOWS.length;
  }

  function nextCycleInterval() {
    return 55 + Math.random() * 12; // ~55-67 seconds ("every minute or so")
  }

  var activeIdx = pickRandomFlowIndex(-1);
  var activeFlow = FLOWS[activeIdx];
  var fromFlow = activeFlow;
  var morphProgress = 1;
  var timeSinceSwitch = 0;
  var autoCycleTarget = nextCycleInterval();

  // Filament & dust buffers — rich, luminous density
  var isCompactScreen = window.innerWidth < 720;
  var MAX_FILAMENTS = isCompactScreen ? 104 : 164;
  var TRAIL_LEN = isCompactScreen ? 52 : 70;
  var MAX_DUST = isCompactScreen ? 60 : 110;

  var trailPos = new Float32Array(MAX_FILAMENTS * TRAIL_LEN * 3);
  var trailSpd = new Float32Array(MAX_FILAMENTS * TRAIL_LEN);
  var headIndex = new Int32Array(MAX_FILAMENTS);
  var trailFill = new Int32Array(MAX_FILAMENTS);
  var curPos = new Float32Array(MAX_FILAMENTS * 3);
  var lifeRemaining = new Float32Array(MAX_FILAMENTS);
  var projBuf = new Float32Array(TRAIL_LEN * 4);
  var dustPos = new Float32Array(MAX_DUST * 3);

  // RK4 scratch vectors
  var k1 = [0, 0, 0];
  var k2 = [0, 0, 0];
  var k3 = [0, 0, 0];
  var k4 = [0, 0, 0];
  var tmpA = [0, 0, 0];
  var tmpB = [0, 0, 0];

  // Viewport & camera
  var width = 0;
  var height = 0;
  var dpr = 1;
  var yaw = 0.55;
  var pitch = activeFlow.basePitch;
  var targetPitch = activeFlow.basePitch;
  var userYawOffset = 0;
  var userPitchOffset = 0;
  var zoom = activeFlow.camZoom;
  var targetZoom = activeFlow.camZoom;
  var scrollNormalized = 0;

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

  var bgLevel = loadInitialBgLevel();
  var lastActiveLevel = bgLevel > 0 ? bgLevel : DEFAULT_BG_LEVEL;
  var simInitialized = false;
  var rafId = 0;
  var lastFrameTime = 0;
  var simTime = 0;
  var trailSampleAccum = 0;
  var spawnCounter = 0;
  var frameCounter = 0;
  var smoothedMeanSpeed = 0.012;

  // Palette harmonized with warm minimal theme + Navier-Stokes teal (slow) -> orange/amber (fast)
  var PALETTE_RGB = [
    [94, 194, 188],   // Slow outer circulation: deep luminous teal
    [126, 214, 207],  // Mid-slow inflow: bright verdigris teal
    [236, 228, 218],  // Shear transition: warm cream/alabaster
    [224, 152, 98],   // Inner spin-up: warm terracotta orange
    [245, 184, 118]   // Peak core velocity: incandescent amber-gold
  ];
  var ALPHA_TIERS = [0.055, 0.12, 0.22, 0.35];
  var ALPHA_TIERS_HOME = [0.068, 0.148, 0.265, 0.42];
  var BUCKET_COUNT = PALETTE_RGB.length * ALPHA_TIERS.length;

  var spriteTeal = createGlowSprite(121, 214, 207);
  var spriteAmber = createGlowSprite(240, 165, 107);

  function createGlowSprite(r, g, b) {
    var sCanvas = document.createElement("canvas");
    sCanvas.width = 32;
    sCanvas.height = 32;
    var sCtx = sCanvas.getContext("2d");
    var grad = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255, 248, 238, 0.88)");
    grad.addColorStop(0.24, "rgba(" + r + "," + g + "," + b + ", 0.58)");
    grad.addColorStop(0.6, "rgba(" + r + "," + g + "," + b + ", 0.14)");
    grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ", 0)");
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 32, 32);
    return sCanvas;
  }

  function getActiveFilamentCount() {
    if (bgLevel <= 0) {
      return 0;
    }
    var levelNorm = bgLevel / 100;
    return Math.max(24, Math.round(MAX_FILAMENTS * (0.35 + 0.65 * levelNorm)));
  }

  function getActiveDustCount() {
    if (bgLevel <= 0) {
      return 0;
    }
    return Math.round(MAX_DUST * (bgLevel / 100));
  }

  function seedWavepacketPoint(idx, packetIndex, radius, timeOffset, outArr, offset) {
    var baseAngle = packetIndex * 2.0943951 + timeOffset * 0.14;
    var elev = packetIndex === 0 ? 0.38 : packetIndex === 1 ? -0.34 : 0.06;
    var cx = radius * 0.82 * Math.cos(baseAngle) * Math.cos(elev);
    var cy = radius * 0.82 * Math.sin(elev) + 0.16 * Math.sin(timeOffset * 0.09 + packetIndex);
    var cz = radius * 0.82 * Math.sin(baseAngle) * Math.cos(elev);

    var phi = idx * 2.399963229728653;
    var u = ((idx * 0.618033988749895) % 1) * 2 - 1;
    var spread = radius * 0.3 * (0.18 + 0.82 * ((idx * 0.7548776662466927) % 1));
    var s = Math.sqrt(Math.max(0, 1 - u * u));

    outArr[offset] = cx + spread * s * Math.cos(phi);
    outArr[offset + 1] = cy + spread * s * Math.sin(phi);
    outArr[offset + 2] = cz + spread * u;
  }

  function seedDustPoint(idx, radius, outArr, offset) {
    var phi = idx * 2.399963229728653;
    var u = ((idx * 0.618033988749895) % 1) * 2 - 1;
    var r = radius * (0.3 + 0.85 * ((idx * 0.7548776662466927) % 1));
    var s = Math.sqrt(Math.max(0, 1 - u * u));
    outArr[offset] = r * s * Math.cos(phi);
    outArr[offset + 1] = r * s * Math.sin(phi);
    outArr[offset + 2] = r * u;
  }

  function evalBlendedField(ux, uy, uz, out) {
    if (morphProgress >= 0.999) {
      activeFlow.evalField(ux, uy, uz, simTime, out);
    } else {
      var t = morphProgress * morphProgress * (3 - 2 * morphProgress);
      fromFlow.evalField(ux, uy, uz, simTime, tmpA);
      activeFlow.evalField(ux, uy, uz, simTime, tmpB);
      out[0] = tmpA[0] + (tmpB[0] - tmpA[0]) * t;
      out[1] = tmpA[1] + (tmpB[1] - tmpA[1]) * t;
      out[2] = tmpA[2] + (tmpB[2] - tmpA[2]) * t;
    }

    // Subtle slow phase shear so trajectories keep evolving gracefully
    var drift = 0.00075;
    out[0] += Math.sin(uy * 2.1 + simTime * 0.21) * drift;
    out[1] += Math.cos(uz * 2.1 - simTime * 0.16) * drift;
    out[2] += Math.sin(ux * 2.1 + simTime * 0.14) * drift;
  }

  function rk4Step(posArr, baseOffset, h) {
    var x = posArr[baseOffset];
    var y = posArr[baseOffset + 1];
    var z = posArr[baseOffset + 2];

    evalBlendedField(x, y, z, k1);
    var k1x = k1[0] * h;
    var k1y = k1[1] * h;
    var k1z = k1[2] * h;

    evalBlendedField(x + k1x * 0.5, y + k1y * 0.5, z + k1z * 0.5, k2);
    var k2x = k2[0] * h;
    var k2y = k2[1] * h;
    var k2z = k2[2] * h;

    evalBlendedField(x + k2x * 0.5, y + k2y * 0.5, z + k2z * 0.5, k3);
    var k3x = k3[0] * h;
    var k3y = k3[1] * h;
    var k3z = k3[2] * h;

    evalBlendedField(x + k3x, y + k3y, z + k3z, k4);
    var k4x = k4[0] * h;
    var k4y = k4[1] * h;
    var k4z = k4[2] * h;

    var dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
    var dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
    var dz = (k1z + 2 * k2z + 2 * k3z + k4z) / 6;

    posArr[baseOffset] = x + dx;
    posArr[baseOffset + 1] = y + dy;
    posArr[baseOffset + 2] = z + dz;

    return Math.sqrt(dx * dx + dy * dy + dz * dz) / Math.max(0.05, h);
  }

  function reincarnateFilament(i) {
    spawnCounter += 1;
    var cOff = i * 3;
    var pkt = (i + spawnCounter) % 3;
    seedWavepacketPoint(
      i + 31 + spawnCounter * 7,
      pkt,
      activeFlow.seedRadius * 1.04,
      simTime,
      curPos,
      cOff
    );

    var spd = rk4Step(curPos, cOff, 1);
    var base = i * TRAIL_LEN * 3;
    var sBase = i * TRAIL_LEN;
    trailPos[base] = curPos[cOff];
    trailPos[base + 1] = curPos[cOff + 1];
    trailPos[base + 2] = curPos[cOff + 2];
    trailSpd[sBase] = spd;

    spd = rk4Step(curPos, cOff, 1);
    trailPos[base + 3] = curPos[cOff];
    trailPos[base + 4] = curPos[cOff + 1];
    trailPos[base + 5] = curPos[cOff + 2];
    trailSpd[sBase + 1] = spd;

    headIndex[i] = 1;
    trailFill[i] = 2;
    lifeRemaining[i] = 24 + ((i * 13 + spawnCounter * 5) % 28);
  }

  function initSimulation() {
    var i;
    var step;
    for (i = 0; i < MAX_FILAMENTS; i += 1) {
      var cOff = i * 3;
      seedWavepacketPoint(i + 1, i % 3, activeFlow.seedRadius, 0, curPos, cOff);

      var warmupCount = 8 + ((i * 11) % 26);
      for (step = 0; step < warmupCount; step += 1) {
        rk4Step(curPos, cOff, 1);
      }

      var initialLen = Math.min(TRAIL_LEN, 18 + ((i * 7) % 28));
      var base = i * TRAIL_LEN * 3;
      var sBase = i * TRAIL_LEN;
      var spd = 0.011;
      for (step = 0; step < initialLen; step += 1) {
        spd = rk4Step(curPos, cOff, 1);
        var idx3 = base + step * 3;
        trailPos[idx3] = curPos[cOff];
        trailPos[idx3 + 1] = curPos[cOff + 1];
        trailPos[idx3 + 2] = curPos[cOff + 2];
        trailSpd[sBase + step] = spd;
      }
      headIndex[i] = initialLen - 1;
      trailFill[i] = initialLen;
      lifeRemaining[i] = 16 + ((i * 17) % 32);
    }

    for (i = 0; i < MAX_DUST; i += 1) {
      var dOff = i * 3;
      seedDustPoint(i + 503, activeFlow.seedRadius * 1.4, dustPos, dOff);
      for (step = 0; step < 20; step += 1) {
        rk4Step(dustPos, dOff, 1);
      }
    }

    simInitialized = true;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth || document.documentElement.clientWidth;
    height = window.innerHeight || document.documentElement.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function switchToFlow(nextIdx) {
    var wrapped = ((nextIdx % FLOWS.length) + FLOWS.length) % FLOWS.length;
    if (bgLevel <= 0) {
      setBgLevel(lastActiveLevel, true);
    }
    if (wrapped === activeIdx && morphProgress >= 1) {
      return;
    }
    fromFlow = activeFlow;
    activeIdx = wrapped;
    activeFlow = FLOWS[activeIdx];
    morphProgress = 0;
    timeSinceSwitch = 0;
    autoCycleTarget = nextCycleInterval();
    targetPitch = activeFlow.basePitch;
    targetZoom = activeFlow.camZoom;
    syncControlUi();
  }

  function stepSimulation(dt) {
    var stepScale = dt * 60;
    simTime += dt;
    timeSinceSwitch += dt;

    // Randomly morph to a new formation every minute or so
    if (timeSinceSwitch >= autoCycleTarget && morphProgress >= 1) {
      fromFlow = activeFlow;
      activeIdx = pickRandomFlowIndex(activeIdx);
      activeFlow = FLOWS[activeIdx];
      morphProgress = 0;
      timeSinceSwitch = 0;
      autoCycleTarget = nextCycleInterval();
      targetPitch = activeFlow.basePitch;
      targetZoom = activeFlow.camZoom;
      syncControlUi();
    }

    if (morphProgress < 1) {
      morphProgress = Math.min(1, morphProgress + dt * 0.18); // ~5.5s smooth 3D morph
    }

    var commitSample = false;
    trailSampleAccum += stepScale;
    if (trailSampleAccum >= 1) {
      commitSample = true;
      trailSampleAccum -= Math.floor(trailSampleAccum);
    }

    var effYaw = yaw + userYawOffset + (pointer.smoothX - 0.5) * 0.12 + scrollNormalized * 0.38;
    var effPitch = pitch + userPitchOffset + (pointer.smoothY - 0.5) * 0.08;
    var cy = Math.cos(effYaw);
    var sy = Math.sin(effYaw);
    var cp = Math.cos(effPitch);
    var sp = Math.sin(effPitch);

    var hasPointerImpulse = pointer.active && (Math.abs(pointer.vx) + Math.abs(pointer.vy) > 0.0006);
    var ptrNdcX = (pointer.smoothX - 0.5) * 2.4;
    var ptrNdcY = (pointer.smoothY - 0.5) * 2.4;

    var activeFilaments = getActiveFilamentCount();
    var totalSpeed = 0;
    var i;

    for (i = 0; i < MAX_FILAMENTS; i += 1) {
      lifeRemaining[i] -= dt;
      if (lifeRemaining[i] <= 0) {
        reincarnateFilament(i);
        continue;
      }

      var cOff = i * 3;
      var stepSpd = rk4Step(curPos, cOff, stepScale);

      var ux = curPos[cOff];
      var uy = curPos[cOff + 1];
      var uz = curPos[cOff + 2];

      if (hasPointerImpulse && i < activeFilaments) {
        var rx = ux * cy + uz * sy;
        var rz = -ux * sy + uz * cy;
        var ry = uy * cp - rz * sp;
        var dxScreen = rx - ptrNdcX;
        var dyScreen = -ry - ptrNdcY;
        var d2 = dxScreen * dxScreen + dyScreen * dyScreen;
        if (d2 < 0.24) {
          var falloff = (1 - d2 / 0.24) * 0.011 * stepScale;
          var impRight = (pointer.vx * 15 - dyScreen * 0.1) * falloff;
          var impUp = (-pointer.vy * 15 + dxScreen * 0.1) * falloff;
          ux += cy * impRight - sy * sp * impUp;
          uy += cp * impUp;
          uz += sy * impRight + cy * sp * impUp;
          curPos[cOff] = ux;
          curPos[cOff + 1] = uy;
          curPos[cOff + 2] = uz;
          stepSpd += falloff * 0.28;
        }
      }

      var mag2 = ux * ux + uy * uy + uz * uz;
      if (mag2 > 9.5 || !(mag2 >= 0)) {
        reincarnateFilament(i);
        continue;
      }

      var head = headIndex[i];
      if (commitSample) {
        head = (head + 1) % TRAIL_LEN;
        headIndex[i] = head;
        if (trailFill[i] < TRAIL_LEN) {
          trailFill[i] += 1;
        }
      }

      var tOff = (i * TRAIL_LEN + head) * 3;
      trailPos[tOff] = ux;
      trailPos[tOff + 1] = uy;
      trailPos[tOff + 2] = uz;
      trailSpd[i * TRAIL_LEN + head] = stepSpd;

      if (i < activeFilaments) {
        totalSpeed += stepSpd;
      }
    }

    if (activeFilaments > 0) {
      smoothedMeanSpeed += (totalSpeed / activeFilaments - smoothedMeanSpeed) * Math.min(1, dt * 3.5);
    }

    var dustStep = 0.42 * stepScale;
    for (i = 0; i < MAX_DUST; i += 1) {
      var dOff = i * 3;
      evalBlendedField(dustPos[dOff], dustPos[dOff + 1], dustPos[dOff + 2], k1);
      dustPos[dOff] += k1[0] * dustStep;
      dustPos[dOff + 1] += k1[1] * dustStep;
      dustPos[dOff + 2] += k1[2] * dustStep;
      var dm2 =
        dustPos[dOff] * dustPos[dOff] +
        dustPos[dOff + 1] * dustPos[dOff + 1] +
        dustPos[dOff + 2] * dustPos[dOff + 2];
      if (dm2 > 8.5 || !(dm2 >= 0)) {
        seedDustPoint(i + frameCounter, activeFlow.seedRadius * 1.25, dustPos, dOff);
      }
    }

    var ptrDecay = Math.pow(0.85, stepScale);
    pointer.vx *= ptrDecay;
    pointer.vy *= ptrDecay;
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    if (bgLevel <= 0) {
      return;
    }

    var effYaw = yaw + userYawOffset + (pointer.smoothX - 0.5) * 0.12 + scrollNormalized * 0.38;
    var effPitch = pitch + userPitchOffset + (pointer.smoothY - 0.5) * 0.08;
    var cy = Math.cos(effYaw);
    var sy = Math.sin(effYaw);
    var cp = Math.cos(effPitch);
    var sp = Math.sin(effPitch);

    var centerX = width * 0.5;
    var centerY = pageKind === "home" ? height * 0.46 : height * 0.5;

    var minDim = Math.min(width, height);
    var stageSpan = Math.max(width * 0.39, minDim * 0.58);
    var baseScale = stageSpan * zoom;
    var camDist = 3.55;

    var alphaTable = pageKind === "home" ? ALPHA_TIERS_HOME : ALPHA_TIERS;
    // Calibrated so default 78% gives 1.0x rich luminance, up to 1.35x at 100%
    var levelNorm = bgLevel / 100;
    var intensityScale = 0.14 + 1.21 * Math.pow(levelNorm, 1.15);
    var activeFilaments = getActiveFilamentCount();
    var activeDust = getActiveDustCount();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // 1. Ambient phase-dust motes
    var i;
    if (activeDust > 0) {
      var dustAlpha = Math.min(0.24, 0.12 * intensityScale).toFixed(3);
      ctx.fillStyle = "rgba(165, 214, 208, " + dustAlpha + ")";
      ctx.beginPath();
      for (i = 0; i < activeDust; i += 1) {
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
        var rad = rz2 > 0.2 ? 1.2 : 0.82;
        ctx.moveTo(sx + rad, syScreen);
        ctx.arc(sx, syScreen, rad, 0, 6.283185);
      }
      ctx.fill();
    }

    // 2. Bucket filament segments into 20 (colorBand x alphaTier) canvas batches
    var buckets = new Array(BUCKET_COUNT);
    for (i = 0; i < BUCKET_COUNT; i += 1) {
      buckets[i] = [];
    }

    var invMean = 1 / Math.max(0.0025, smoothedMeanSpeed * 1.12);
    var tracerHeads = [];

    for (i = 0; i < activeFilaments; i += 1) {
      var fillCount = trailFill[i];
      if (fillCount < 2) {
        continue;
      }

      var head = headIndex[i];
      var startRing = (head - fillCount + 1 + TRAIL_LEN) % TRAIL_LEN;
      var fBase = i * TRAIL_LEN;
      var lifeFade = Math.min(1, lifeRemaining[i] / 2.6);
      var s;

      for (s = 0; s < fillCount; s += 1) {
        var ringIdx = (startRing + s) % TRAIL_LEN;
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

      var denom = Math.max(1, fillCount - 1);
      for (s = 1; s < fillCount; s += 1) {
        var pb0 = (s - 1) * 4;
        var pb1 = s * 4;
        var xA = projBuf[pb0];
        var yA = projBuf[pb0 + 1];
        var xB = projBuf[pb1];
        var yB = projBuf[pb1 + 1];

        var segDx = xB - xA;
        var segDy = yB - yA;
        if (segDx * segDx + segDy * segDy > 9000) {
          continue;
        }

        var ageFrac = s / denom;
        var zCam = projBuf[pb1 + 2];
        var depthFactor = Math.max(0.28, Math.min(1.25, 0.74 + zCam * 0.34));
        var intensity = ageFrac * ageFrac * depthFactor * lifeFade;

        var alphaIdx =
          intensity > 0.78 ? 3 : intensity > 0.46 ? 2 : intensity > 0.2 ? 1 : 0;

        var spdNorm = projBuf[pb1 + 3] * invMean;
        var colorIdx =
          spdNorm > 1.3
            ? 4
            : spdNorm > 1.0
              ? 3
              : spdNorm > 0.74
                ? 2
                : spdNorm > 0.5
                  ? 1
                  : 0;

        buckets[colorIdx * 4 + alphaIdx].push(xA, yA, xB, yB);
      }

      if (i % 6 === 0 && lifeFade > 0.35) {
        var hOff = (fillCount - 1) * 4;
        tracerHeads.push(
          projBuf[hOff],
          projBuf[hOff + 1],
          projBuf[hOff + 2],
          projBuf[hOff + 3] * invMean,
          lifeFade
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
      var alpha = Math.min(0.72, alphaTable[aIdx] * intensityScale);

      ctx.strokeStyle =
        "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha.toFixed(4) + ")";
      ctx.lineWidth = aIdx === 3 ? 1.45 : aIdx === 2 ? 1.15 : 0.9;
      ctx.beginPath();
      var j;
      for (j = 0; j < len; j += 4) {
        ctx.moveTo(segs[j], segs[j + 1]);
        ctx.lineTo(segs[j + 2], segs[j + 3]);
      }
      ctx.stroke();
    }

    // 3. Luminous leading tracer sparks
    var baseHeadAlpha = (pageKind === "home" ? 0.65 : 0.52) * intensityScale;
    for (i = 0; i < tracerHeads.length; i += 5) {
      var hx = tracerHeads[i];
      var hy = tracerHeads[i + 1];
      var hz = tracerHeads[i + 2];
      var hSpd = tracerHeads[i + 3];
      var hFade = tracerHeads[i + 4];
      var size = Math.max(5.5, Math.min(12.5, 8.2 + hz * 2.5));
      ctx.globalAlpha = Math.min(0.92, baseHeadAlpha * hFade);
      ctx.drawImage(
        hSpd > 0.94 ? spriteAmber : spriteTeal,
        hx - size * 0.5,
        hy - size * 0.5,
        size,
        size
      );
    }

    ctx.restore();
  }

  function formatFlowIndex(idx) {
    var n = idx + 1;
    var total = FLOWS.length;
    return (n < 10 ? "0" + n : String(n)) + "/" + total;
  }

  function syncControlUi() {
    var isOff = bgLevel <= 0;
    var pctStr = bgLevel + "%";
    var valueText = isOff ? "Off" : pctStr;

    if (barSlider) {
      barSlider.value = String(bgLevel);
      barSlider.style.setProperty("--slider-pct", pctStr);
      barSlider.classList.toggle("is-zero", isOff);
      barSlider.setAttribute("aria-valuetext", valueText);
    }
    if (quickToggleText) {
      quickToggleText.textContent = isOff ? "Off" : "Bg";
    }
    if (btnQuickToggle) {
      btnQuickToggle.setAttribute("aria-pressed", isOff ? "false" : "true");
    }
    if (liveDot) {
      liveDot.classList.toggle("is-off", isOff);
    }
    if (btnShuffle) {
      btnShuffle.textContent = formatFlowIndex(activeIdx);
    }
    body.classList.toggle("is-phase-off", isOff);
  }

  function scheduleLoop() {
    if (!rafId && bgLevel > 0) {
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  function stopLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function setBgLevel(rawVal, shouldPersist) {
    var val = Math.max(0, Math.min(100, Math.round(Number(rawVal) || 0)));
    if (val <= 3) {
      val = 0;
    }
    bgLevel = val;
    if (val > 0) {
      lastActiveLevel = val;
    }
    if (shouldPersist !== false) {
      persistBgLevel(val);
    }

    if (val > 0 && !simInitialized) {
      initSimulation();
    }

    syncControlUi();

    if (val <= 0) {
      stopLoop();
      ctx.clearRect(0, 0, width, height);
    } else {
      render();
      scheduleLoop();
    }
  }

  function updateScrollNormalized() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    var docHeight = Math.max(
      1,
      (document.documentElement.scrollHeight || 1) - (window.innerHeight || 1)
    );
    scrollNormalized = Math.max(0, Math.min(1, scrollTop / docHeight));
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
        userPitchOffset = Math.max(-1.25, Math.min(1.25, userPitchOffset + dy * 0.0065));
      }
    },
    { passive: true }
  );

  window.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) {
      return;
    }
    if (hudEl && e.target && e.target.closest && e.target.closest("#phase-hud")) {
      return;
    }
    var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
    var isEmptyMargin =
      e.target === body ||
      e.target === document.documentElement ||
      (e.target && e.target.classList && e.target.classList.contains("site-shell")) ||
      (e.target && e.target.classList && e.target.classList.contains("page-content"));

    if (isEmptyMargin && tag !== "a" && tag !== "button" && tag !== "input") {
      pointer.dragging = true;
      pointer.lastDragX = e.clientX;
      pointer.lastDragY = e.clientY;
    }
  });

  window.addEventListener("pointerup", function () {
    pointer.dragging = false;
  });

  if (barSlider) {
    barSlider.addEventListener("input", function () {
      setBgLevel(barSlider.value, true);
    });
  }

  if (btnQuickToggle) {
    btnQuickToggle.addEventListener("click", function () {
      if (bgLevel > 0) {
        setBgLevel(0, true);
      } else {
        setBgLevel(lastActiveLevel, true);
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", function () {
      switchToFlow(activeIdx - 1);
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", function () {
      switchToFlow(activeIdx + 1);
    });
  }

  if (btnShuffle) {
    btnShuffle.addEventListener("click", function () {
      switchToFlow(pickRandomFlowIndex(activeIdx));
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
          updateScrollNormalized();
        });
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", function () {
    resize();
    updateScrollNormalized();
    if (bgLevel > 0) {
      render();
    }
  });

  function tick(now) {
    rafId = 0;
    if (bgLevel <= 0) {
      return;
    }

    var dt = lastFrameTime ? (now - lastFrameTime) / 1000 : 1 / 60;
    lastFrameTime = now;
    dt = Math.min(0.05, Math.max(0.001, dt));

    if (!document.hidden) {
      frameCounter += 1;
      var smoothLerp = 1 - Math.exp(-dt * 2.2);
      pointer.smoothX += (pointer.x - pointer.smoothX) * smoothLerp;
      pointer.smoothY += (pointer.y - pointer.smoothY) * smoothLerp;
      pitch += (targetPitch - pitch) * (1 - Math.exp(-dt * 2.0));
      zoom += (targetZoom - zoom) * (1 - Math.exp(-dt * 3.5));

      if (!pointer.dragging) {
        yaw += dt * 0.04;
      }

      stepSimulation(dt);
      render();
    }

    rafId = requestAnimationFrame(tick);
  }

  // Boot
  resize();
  updateScrollNormalized();
  syncControlUi();

  if (bgLevel > 0) {
    initSimulation();
    render();
    scheduleLoop();
  }
})();

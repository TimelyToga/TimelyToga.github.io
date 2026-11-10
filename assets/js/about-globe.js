(function () {
  "use strict";

  var canvas = document.getElementById("about-globe-canvas");
  var root = document.querySelector("[data-about-globe]");

  if (!canvas || !root || !canvas.getContext) {
    return;
  }

  var ctx = canvas.getContext("2d");
  var titleEl = document.getElementById("about-globe-title");
  var subtitleEl = document.getElementById("about-globe-subtitle");
  var coordsEl = document.getElementById("about-globe-coords");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var RAD = Math.PI / 180;
  var DEG = 180 / Math.PI;
  var TAU = Math.PI * 2;

  var locations = {
    "austin": { name: "Austin, TX", lat: 30.2672, lon: -97.7431 },
    "beijing": { name: "Beijing, China", lat: 39.9042, lon: 116.4074 },
    "durham": { name: "Durham, NC", lat: 35.994, lon: -78.8986 },
    "jupiter": { name: "Jupiter, FL", lat: 26.9342, lon: -80.0942 },
    "mountain-view": { name: "Mountain View, CA", lat: 37.3861, lon: -122.0839 },
    "new-york": { name: "New York City, NY", lat: 40.7128, lon: -74.006 },
    "northeast-tennessee": { name: "Far Northeastern TN", lat: 36.5484, lon: -82.5618 },
    "palo-alto": { name: "Palo Alto, CA", lat: 37.4419, lon: -122.143 },
    "san-francisco": { name: "San Francisco, CA", lat: 37.7749, lon: -122.4194 },
    "shanghai": { name: "Shanghai, China", lat: 31.2304, lon: 121.4737 }
  };

  var moves = [
    {
      id: "northeast-tennessee-durham",
      from: "northeast-tennessee",
      to: "durham",
      label: "Moved to Durham, NC",
      date: "2013"
    },
    {
      id: "durham-shanghai",
      from: "durham",
      to: "shanghai",
      label: "Moved to Shanghai, China",
      date: "2017"
    },
    {
      id: "shanghai-new-york",
      from: "shanghai",
      to: "new-york",
      label: "Moved to New York City, NY",
      date: "2018"
    },
    {
      id: "new-york-mountain-view",
      from: "new-york",
      to: "mountain-view",
      label: "Moved to Mountain View, CA",
      date: "2018"
    },
    {
      id: "mountain-view-austin",
      from: "mountain-view",
      to: "austin",
      label: "Moved to Austin, TX",
      date: "2021"
    },
    {
      id: "austin-jupiter",
      from: "austin",
      to: "jupiter",
      label: "Moved to Jupiter, FL",
      date: "Dec 2021",
      note: "met a girl"
    },
    {
      id: "jupiter-austin",
      from: "jupiter",
      to: "austin",
      label: "Moved back to Austin, TX",
      date: "Mar 2023",
      note: "married the girl"
    }
  ];

  var moveById = {};
  var allKnownIds = {};

  Object.keys(locations).forEach(function (k) {
    allKnownIds[k] = true;
  });

  moves.forEach(function (move) {
    moveById[move.id] = move;
  });

  var activeMoveId = "jupiter-austin";
  var activeLocationId = "austin";
  var activeElement = null;
  var focus = getMoveFocus(moveById[activeMoveId]);
  var view = { lat: focus.lat, lon: focus.lon };
  var target = { lat: focus.lat, lon: focus.lon };
  var metrics = { width: 0, height: 0, centerX: 0, centerY: 0, radius: 0 };
  var timelineElements = Array.prototype.slice.call(
    root.querySelectorAll("[data-move-id], [data-location-id]")
  );
  var isScrollScheduled = false;
  var landPolygons = [];
  var landDataUrl = canvas.getAttribute("data-land-url") || "/assets/data/land-110m.json";
  var pulseProgress = 0;
  var isDraggingGlobe = false;
  var manualOverrideUntil = 0;
  var dragStart = { x: 0, y: 0, lat: 0, lon: 0 };

  function formatCoords(lat, lon) {
    var ns = lat >= 0 ? "N" : "S";
    var ew = lon >= 0 ? "E" : "W";
    return Math.abs(lat).toFixed(2) + "\u00b0" + ns + ", " + Math.abs(lon).toFixed(2) + "\u00b0" + ew;
  }

  function vectorFromLatLon(lat, lon) {
    var latRad = lat * RAD;
    var lonRad = lon * RAD;
    var cosLat = Math.cos(latRad);

    return {
      x: cosLat * Math.cos(lonRad),
      y: Math.sin(latRad),
      z: cosLat * Math.sin(lonRad)
    };
  }

  function vectorForLocation(id) {
    var location = locations[id];
    return vectorFromLatLon(location.lat, location.lon);
  }

  function normalizeVector(vector) {
    var length = Math.sqrt(
      vector.x * vector.x + vector.y * vector.y + vector.z * vector.z
    );

    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length
    };
  }

  function slerp(fromVector, toVector, t) {
    var dot = fromVector.x * toVector.x + fromVector.y * toVector.y + fromVector.z * toVector.z;
    dot = Math.max(-1, Math.min(1, dot));

    var theta = Math.acos(dot);
    var sinTheta = Math.sin(theta);

    if (sinTheta < 0.001) {
      return normalizeVector({
        x: fromVector.x + (toVector.x - fromVector.x) * t,
        y: fromVector.y + (toVector.y - fromVector.y) * t,
        z: fromVector.z + (toVector.z - fromVector.z) * t
      });
    }

    var fromScale = Math.sin((1 - t) * theta) / sinTheta;
    var toScale = Math.sin(t * theta) / sinTheta;

    return {
      x: fromVector.x * fromScale + toVector.x * toScale,
      y: fromVector.y * fromScale + toVector.y * toScale,
      z: fromVector.z * fromScale + toVector.z * toScale
    };
  }

  function latLonFromVector(vector) {
    return {
      lat: Math.asin(vector.y) * DEG,
      lon: Math.atan2(vector.z, vector.x) * DEG
    };
  }

  function getMoveFocus(move) {
    return latLonFromVector(
      slerp(vectorForLocation(move.from), vectorForLocation(move.to), 0.56)
    );
  }

  function project(lat, lon, lift) {
    var latRad = lat * RAD;
    var lonRad = lon * RAD;
    var viewLatRad = view.lat * RAD;
    var viewLonRad = view.lon * RAD;
    var deltaLon = lonRad - viewLonRad;
    var cosLat = Math.cos(latRad);
    var sinLat = Math.sin(latRad);
    var cosViewLat = Math.cos(viewLatRad);
    var sinViewLat = Math.sin(viewLatRad);
    var x = cosLat * Math.sin(deltaLon);
    var y = cosViewLat * sinLat - sinViewLat * cosLat * Math.cos(deltaLon);
    var z = sinViewLat * sinLat + cosViewLat * cosLat * Math.cos(deltaLon);
    var scale = 1 + (lift || 0);

    return {
      x: metrics.centerX + metrics.radius * x * scale,
      y: metrics.centerY - metrics.radius * y * scale,
      z: z
    };
  }

  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var displayWidth = Math.max(240, Math.round(rect.width));
    var displayHeight = displayWidth;
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    if (
      canvas.width !== displayWidth * pixelRatio ||
      canvas.height !== displayHeight * pixelRatio
    ) {
      canvas.width = displayWidth * pixelRatio;
      canvas.height = displayHeight * pixelRatio;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    metrics.width = displayWidth;
    metrics.height = displayHeight;
    metrics.centerX = displayWidth / 2;
    metrics.centerY = displayHeight / 2;
    metrics.radius = displayWidth * 0.415;
  }

  function drawProjectedPath(samples, strokeStyle, lineWidth, visibilityFloor) {
    var drawing = false;

    ctx.beginPath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    samples.forEach(function (point) {
      var projected = project(point[0], point[1], point[2] || 0);

      if (projected.z >= visibilityFloor) {
        if (!drawing) {
          ctx.moveTo(projected.x, projected.y);
          drawing = true;
        } else {
          ctx.lineTo(projected.x, projected.y);
        }
      } else if (drawing) {
        ctx.stroke();
        ctx.beginPath();
        drawing = false;
      }
    });

    if (drawing) {
      ctx.stroke();
    }
  }

  function drawGlobeBase() {
    // Outer orbital tick ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(metrics.centerX, metrics.centerY, metrics.radius * 1.065, 0, TAU);
    ctx.strokeStyle = "rgba(107, 201, 193, 0.14)";
    ctx.setLineDash([2, 6]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    var gradient = ctx.createRadialGradient(
      metrics.centerX - metrics.radius * 0.34,
      metrics.centerY - metrics.radius * 0.38,
      metrics.radius * 0.1,
      metrics.centerX,
      metrics.centerY,
      metrics.radius
    );

    gradient.addColorStop(0, "#152b2e");
    gradient.addColorStop(0.46, "#0c181d");
    gradient.addColorStop(1, "#05080b");

    ctx.save();
    ctx.beginPath();
    ctx.arc(metrics.centerX, metrics.centerY, metrics.radius + 2, 0, TAU);
    ctx.shadowColor = "rgba(107, 201, 193, 0.18)";
    ctx.shadowBlur = metrics.radius * 0.18;
    ctx.fillStyle = "#05080b";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(metrics.centerX, metrics.centerY, metrics.radius, 0, TAU);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.clip();

    drawGraticule();
    drawLandPolygons();

    ctx.restore();

    // Specular limb ring
    ctx.beginPath();
    ctx.arc(metrics.centerX, metrics.centerY, metrics.radius, 0, TAU);
    ctx.strokeStyle = "rgba(239, 233, 223, 0.18)";
    ctx.lineWidth = Math.max(1, metrics.radius * 0.007);
    ctx.stroke();
  }

  function drawGraticule() {
    var lat;
    var lon;
    var samples;

    for (lat = -60; lat <= 60; lat += 30) {
      samples = [];
      for (lon = -180; lon <= 180; lon += 3) {
        samples.push([lat, lon, 0]);
      }
      drawProjectedPath(
        samples,
        lat === 0 ? "rgba(107, 201, 193, 0.14)" : "rgba(239, 233, 223, 0.065)",
        1,
        0
      );
    }

    for (lon = -180; lon < 180; lon += 30) {
      samples = [];
      for (lat = -80; lat <= 80; lat += 3) {
        samples.push([lat, lon, 0]);
      }
      drawProjectedPath(samples, "rgba(239, 233, 223, 0.05)", 1, 0);
    }
  }

  function drawLandPolygons() {
    landPolygons.forEach(function (polygon) {
      polygon.forEach(function (ring) {
        drawProjectedPath(ring, "rgba(130, 196, 188, 0.42)", 1.08, 0);
      });
    });
  }

  function drawArcStroke(move, strokeStyle, lineWidth, visibilityFloor) {
    var fromVector = vectorForLocation(move.from);
    var toVector = vectorForLocation(move.to);
    var samples = [];
    var steps = 96;
    var i;

    for (i = 0; i <= steps; i += 1) {
      var t = i / steps;
      var vector = slerp(fromVector, toVector, t);
      var latLon = latLonFromVector(vector);
      var lift = Math.sin(Math.PI * t) * 0.24;
      samples.push([latLon.lat, latLon.lon, lift]);
    }

    drawProjectedPath(samples, strokeStyle, lineWidth, visibilityFloor);
  }

  function drawActivePulse(move) {
    var fromVector = vectorForLocation(move.from);
    var toVector = vectorForLocation(move.to);
    var vector = slerp(fromVector, toVector, pulseProgress);
    var latLon = latLonFromVector(vector);
    var lift = Math.sin(Math.PI * pulseProgress) * 0.24;
    var projected = project(latLon.lat, latLon.lon, lift);

    if (projected.z < -0.22) {
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, 6, 0, TAU);
    ctx.fillStyle = "rgba(242, 182, 125, 0.28)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(projected.x, projected.y, 2.6, 0, TAU);
    ctx.fillStyle = "#fff6eb";
    ctx.fill();
    ctx.restore();
  }

  function drawMoveArcs() {
    moves.forEach(function (move) {
      if (move.id !== activeMoveId) {
        drawArcStroke(
          move,
          "rgba(107, 201, 193, 0.26)",
          Math.max(1.15, metrics.radius * 0.0055),
          -0.18
        );
      }
    });

    if (activeMoveId && moveById[activeMoveId]) {
      var activeMove = moveById[activeMoveId];
      drawArcStroke(
        activeMove,
        "rgba(242, 182, 125, 0.34)",
        Math.max(4.5, metrics.radius * 0.02),
        -0.24
      );
      drawArcStroke(
        activeMove,
        "#df9559",
        Math.max(2.2, metrics.radius * 0.01),
        -0.24
      );
      if (!prefersReducedMotion) {
        drawActivePulse(activeMove);
      }
    }
  }

  function drawPoint(locationId, state) {
    var location = locations[locationId];

    if (!location) {
      return;
    }

    var projected = project(location.lat, location.lon, state.active ? 0.04 : 0.015);

    if (projected.z < -0.08) {
      return;
    }

    var radius = state.active
      ? Math.max(5, metrics.radius * 0.024)
      : Math.max(2.6, metrics.radius * 0.012);
    var fill = state.active ? "#6bc9c1" : "rgba(239, 233, 223, 0.68)";

    if (state.active) {
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, radius + 5.5, 0, TAU);
      ctx.strokeStyle = "rgba(107, 201, 193, 0.32)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius + (state.active ? 2.5 : 1.5), 0, TAU);
    ctx.fillStyle = "rgba(5, 8, 11, 0.9)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();

    if (state.origin) {
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, radius + 3.2, 0, TAU);
      ctx.strokeStyle = "rgba(223, 149, 89, 0.8)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  function decodeTopology(topology) {
    var transform = topology && topology.transform;
    var land = topology && topology.objects && topology.objects.land;

    if (!transform || !land || !topology.arcs) {
      return [];
    }

    var decodedArcs = topology.arcs.map(function (arc) {
      var x = 0;
      var y = 0;

      return arc.map(function (point) {
        x += point[0];
        y += point[1];

        return [
          x * transform.scale[0] + transform.translate[0],
          y * transform.scale[1] + transform.translate[1]
        ];
      });
    });

    function readArc(index) {
      var arc = decodedArcs[index < 0 ? ~index : index] || [];
      return index < 0 ? arc.slice().reverse() : arc;
    }

    function ringFromArcs(arcIndexes) {
      var ring = [];

      arcIndexes.forEach(function (arcIndex, arcPosition) {
        readArc(arcIndex).forEach(function (point, pointPosition) {
          if (arcPosition > 0 && pointPosition === 0) {
            return;
          }

          ring.push([point[1], point[0], 0]);
        });
      });

      return ring;
    }

    function geometryToPolygons(geometry) {
      if (!geometry) {
        return [];
      }

      if (geometry.type === "Polygon") {
        return [geometry.arcs.map(ringFromArcs)];
      }

      if (geometry.type === "MultiPolygon") {
        return geometry.arcs.map(function (polygon) {
          return polygon.map(ringFromArcs);
        });
      }

      if (geometry.type === "GeometryCollection") {
        return geometry.geometries.reduce(function (polygons, child) {
          return polygons.concat(geometryToPolygons(child));
        }, []);
      }

      return [];
    }

    return geometryToPolygons(land);
  }

  function loadLandData() {
    if (!window.fetch) {
      return;
    }

    window.fetch(landDataUrl)
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (topology) {
        var polygons = decodeTopology(topology);

        if (polygons.length) {
          landPolygons = polygons;
        }
      })
      .catch(function () {
        landPolygons = [];
      });
  }

  function drawPoints() {
    Object.keys(allKnownIds).forEach(function (locationId) {
      drawPoint(locationId, { active: false, origin: false });
    });

    if (activeMoveId && moveById[activeMoveId]) {
      drawPoint(moveById[activeMoveId].from, { active: false, origin: true });
    }

    if (activeLocationId) {
      drawPoint(activeLocationId, { active: true, origin: false });
    }
  }

  function draw() {
    resizeCanvas();
    ctx.clearRect(0, 0, metrics.width, metrics.height);
    drawGlobeBase();
    drawMoveArcs();
    drawPoints();
  }

  function normalizeLon(lon) {
    return ((lon + 180) % 360 + 360) % 360 - 180;
  }

  function shortestLonDelta(fromLon, toLon) {
    return ((toLon - fromLon + 540) % 360) - 180;
  }

  function setTarget(lat, lon) {
    target.lat = Math.max(-68, Math.min(68, lat));
    target.lon = normalizeLon(lon);

    if (coordsEl) {
      coordsEl.textContent = formatCoords(target.lat, target.lon);
    }

    if (prefersReducedMotion) {
      view.lat = target.lat;
      view.lon = target.lon;
    }
  }

  function moveTitle(move) {
    return locations[move.from].name + " \u2192 " + locations[move.to].name;
  }

  function setActiveElement(element) {
    if (!element || element === activeElement) {
      return;
    }

    if (activeElement) {
      activeElement.classList.remove("is-globe-active");
    }

    activeElement = element;
    activeElement.classList.add("is-globe-active");

    if (element.dataset.moveId) {
      setMoveContext(element.dataset.moveId);
    } else {
      setLocationContext(element);
    }
  }

  function setMoveContext(moveId) {
    var move = moveById[moveId];

    if (!move) {
      return;
    }

    var moveFocus = getMoveFocus(move);
    activeMoveId = move.id;
    activeLocationId = move.to;
    pulseProgress = 0;

    if (titleEl) {
      titleEl.textContent = moveTitle(move);
    }

    if (subtitleEl) {
      subtitleEl.textContent =
        move.label + " \u00b7 " + move.date + (move.note ? " \u00b7 " + move.note : "");
    }

    setTarget(moveFocus.lat, moveFocus.lon);
  }

  function setLocationContext(element) {
    var locationId = element.dataset.locationId;
    var location = locations[locationId];

    if (!location) {
      return;
    }

    var title = element.querySelector(".timeline-title");
    var place = element.querySelector(".timeline-place");
    var date = element.querySelector(".timeline-date");
    var subtitleParts = [];

    activeLocationId = locationId;
    activeMoveId = null;

    if (titleEl) {
      titleEl.textContent = title ? title.textContent : location.name;
    }

    if (place) {
      subtitleParts.push(place.textContent);
    }

    if (date) {
      subtitleParts.push(date.textContent);
    }

    if (subtitleEl) {
      subtitleEl.textContent = subtitleParts.join(" \u00b7 ");
    }

    setTarget(location.lat, location.lon);
  }

  function chooseVisibleTimelineElement() {
    if (Date.now() < manualOverrideUntil || isDraggingGlobe) {
      return;
    }

    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var focusY = viewportHeight * 0.44;
    var bestElement = null;
    var bestDistance = Infinity;

    timelineElements.forEach(function (element) {
      var rect = element.getBoundingClientRect();

      if (rect.bottom < viewportHeight * 0.08 || rect.top > viewportHeight * 0.88) {
        return;
      }

      var elementCenter = rect.top + rect.height / 2;
      var distance = Math.abs(elementCenter - focusY);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestElement = element;
      }
    });

    if (bestElement) {
      setActiveElement(bestElement);
    }
  }

  function scheduleScrollRead() {
    if (isScrollScheduled) {
      return;
    }

    isScrollScheduled = true;
    window.requestAnimationFrame(function () {
      isScrollScheduled = false;
      chooseVisibleTimelineElement();
    });
  }

  // Click any timeline item or move to lock focus immediately
  timelineElements.forEach(function (element) {
    element.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("a")) {
        return;
      }
      manualOverrideUntil = Date.now() + 1400;
      setActiveElement(element);
    });
  });

  // Interactive drag-to-rotate on the globe canvas
  canvas.addEventListener("pointerdown", function (e) {
    isDraggingGlobe = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    dragStart.lat = target.lat;
    dragStart.lon = target.lon;
    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!isDraggingGlobe) {
      return;
    }
    var dx = e.clientX - dragStart.x;
    var dy = e.clientY - dragStart.y;
    var degPerPx = 140 / Math.max(180, metrics.width);
    setTarget(dragStart.lat + dy * degPerPx, dragStart.lon - dx * degPerPx);
  });

  function endGlobeDrag() {
    if (isDraggingGlobe) {
      isDraggingGlobe = false;
      manualOverrideUntil = Date.now() + 1800;
    }
  }

  canvas.addEventListener("pointerup", endGlobeDrag);
  canvas.addEventListener("pointercancel", endGlobeDrag);

  function animate() {
    var easing = isDraggingGlobe ? 0.28 : prefersReducedMotion ? 1 : 0.085;
    var lonDelta = shortestLonDelta(view.lon, target.lon);

    view.lon = normalizeLon(view.lon + lonDelta * easing);
    view.lat += (target.lat - view.lat) * easing;
    pulseProgress = (pulseProgress + 0.0085) % 1;

    draw();
    window.requestAnimationFrame(animate);
  }

  window.addEventListener("scroll", scheduleScrollRead, { passive: true });
  window.addEventListener("resize", function () {
    resizeCanvas();
    scheduleScrollRead();
  });

  loadLandData();
  setMoveContext(activeMoveId);
  scheduleScrollRead();
  animate();
})();

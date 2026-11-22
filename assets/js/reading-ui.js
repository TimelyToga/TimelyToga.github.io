(function () {
  "use strict";

  var archive = document.getElementById("reading-archive");
  if (!archive) {
    return;
  }

  var railYearEl = document.getElementById("rail-active-year");
  var railMetaEl = document.getElementById("rail-active-meta");
  var railBodyEl = document.getElementById("reading-rail-body");
  var chartEl = document.getElementById("reading-cadence-chart");
  var filterRoot = document.getElementById("reading-filter-pills");
  var emptyStateEl = document.getElementById("reading-empty-state");
  var sheetBackdrop = document.getElementById("reading-sheet-backdrop");
  var mobileSheet = document.getElementById("reading-mobile-sheet");

  var sections = Array.prototype.slice.call(
    archive.querySelectorAll(".reading-year-section")
  );
  var allCards = Array.prototype.slice.call(
    archive.querySelectorAll(".shelf-book-card")
  );
  var chartCols = Array.prototype.slice.call(
    chartEl ? chartEl.querySelectorAll("[data-year-target]") : []
  );
  var modeBtns = Array.prototype.slice.call(
    archive.querySelectorAll(".reading-mode-btn")
  );

  var currentFilter = "all";
  var currentMode = "shelf";
  var activeYear = sections.length ? Number(sections[0].getAttribute("data-year")) : 2026;
  var hoveredKey = null;
  var pinnedKey = null;
  var hoverSourceYear = null;

  function isMobileLayout() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  function getEra(year) {
    if (year >= 2024) {
      return {
        tag: "2024–2026 · Power & Materials",
        prose:
          "Zooming out to how the physical world actually runs—China, semiconductors, shipping, energy, raw commodities, and institutional power—alongside first-contact hard SF."
      };
    }
    if (year >= 2022) {
      return {
        tag: "2022–2023 · Founding & Finance",
        prose:
          "A surge to 30+ books a year around launching Throne: Wall Street disasters, management, hardware and visual craft, clinical diagnostics, and deep Culture rereads."
      };
    }
    return {
      tag: "2016–2021 · Hard Sci-Fi Deep End",
      prose:
        "Wide-screen space opera, megastructures, orbital physics, and alien minds—Alastair Reynolds, Peter F. Hamilton, Greg Egan, Vernor Vinge, Cixin Liu, and Ted Chiang."
    };
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wireCoverImage(img) {
    if (!img) return;
    function discardInvalidCover() {
      if (img.naturalWidth <= 2 || img.naturalHeight <= 2) {
        img.remove();
      }
    }
    if (img.complete) {
      discardInvalidCover();
    } else {
      img.addEventListener("load", discardInvalidCover, { once: true });
      img.addEventListener("error", discardInvalidCover, { once: true });
    }
  }

  allCards.forEach(function (card) {
    wireCoverImage(card.querySelector(".shelf-cover-img"));
  });

  function getVisibleCards() {
    return allCards.filter(function (c) {
      return !c.hidden;
    });
  }

  function findCardByKey(key) {
    if (!key) return null;
    for (var i = 0; i < allCards.length; i++) {
      if (allCards[i].getAttribute("data-book-key") === key) {
        return allCards[i];
      }
    }
    return null;
  }

  function findPriorEntries(card) {
    var bid = card.getAttribute("data-book-id");
    var yr = Number(card.getAttribute("data-year"));
    var attempt = card.getAttribute("data-attempt");
    if (!bid || (attempt !== "reread" && attempt !== "restart")) {
      return [];
    }
    var cardIdx = allCards.indexOf(card);
    return allCards.filter(function (other, idx) {
      if (other === card || other.getAttribute("data-book-id") !== bid) {
        return false;
      }
      var oYr = Number(other.getAttribute("data-year"));
      var isEarlier = oYr < yr || (oYr === yr && idx > cardIdx);
      if (!isEarlier) return false;
      if (attempt === "restart") {
        return other.getAttribute("data-outcome") === "dnf";
      }
      return true;
    });
  }

  function buildBookReaderMarkup(card, opts) {
    var key = card.getAttribute("data-book-key");
    var title = card.getAttribute("data-title");
    var author = card.getAttribute("data-author");
    var year = card.getAttribute("data-year");
    var cover = card.getAttribute("data-cover");
    var payload = card.querySelector(".shelf-book-payload");
    var pillsHtml = payload ? payload.querySelector(".payload-pills").innerHTML : "";
    var notesHtml = payload ? payload.querySelector(".payload-notes").innerHTML.trim() : "";

    var visible = getVisibleCards();
    var pos = visible.indexOf(card);
    var prevKey = pos > 0 ? visible[pos - 1].getAttribute("data-book-key") : null;
    var nextKey = pos >= 0 && pos < visible.length - 1 ? visible[pos + 1].getAttribute("data-book-key") : null;

    var priors = findPriorEntries(card);
    var priorLinksHtml = "";
    if (priors.length) {
      priorLinksHtml =
        '<div class="reader-prior-links">' +
        priors
          .map(function (p) {
            var pKey = p.getAttribute("data-book-key");
            var pYr = p.getAttribute("data-year");
            var label =
              card.getAttribute("data-attempt") === "restart"
                ? "Prior DNF in " + pYr
                : "Previous read in " + pYr;
            return (
              '<button type="button" class="reader-prior-btn" data-jump-book="' +
              escapeHtml(pKey) +
              '">' +
              escapeHtml(label) +
              " &rarr;</button>"
            );
          })
          .join("") +
        "</div>";
    }

    var coverThumb = cover
      ? '<div class="reader-thumb"><div class="shelf-cover-fallback" aria-hidden="true"><div class="shelf-cover-fallback-top"><span class="shelf-cover-fallback-rule"></span><span class="shelf-cover-fallback-title">' +
        escapeHtml(title) +
        '</span></div></div><img class="shelf-cover-img" src="' +
        escapeHtml(cover) +
        '" alt="' +
        escapeHtml(title) +
        '"></div>'
      : '<div class="reader-thumb"><div class="shelf-cover-fallback"><div class="shelf-cover-fallback-top"><span class="shelf-cover-fallback-rule"></span><span class="shelf-cover-fallback-title">' +
        escapeHtml(title) +
        "</span></div></div></div>";

    var statusLabel = opts.isMobile
      ? "Book Notes"
      : opts.pinned
      ? '<span class="reader-pin-badge">Pinned</span>'
      : "Book Notes";

    var closeLabel = opts.isMobile ? "Close &times;" : opts.pinned ? "Unpin &times;" : "Era &times;";

    var notesSection = notesHtml
      ? '<div class="reader-notes">' + notesHtml + "</div>"
      : '<p class="reader-empty">Logged in ' + escapeHtml(year) + " without written notes.</p>";

    return (
      '<div class="reader-header">' +
      '<span class="reader-kicker">' +
      statusLabel +
      "</span>" +
      '<div class="reader-nav-btns">' +
      (prevKey
        ? '<button type="button" class="reader-mini-btn" data-step-book="' +
          escapeHtml(prevKey) +
          '" title="Previous book" aria-label="Previous book">&larr;</button>'
        : "") +
      (nextKey
        ? '<button type="button" class="reader-mini-btn" data-step-book="' +
          escapeHtml(nextKey) +
          '" title="Next book" aria-label="Next book">&rarr;</button>'
        : "") +
      '<button type="button" class="reader-mini-btn" data-clear-reader="true">' +
      closeLabel +
      "</button>" +
      "</div>" +
      "</div>" +
      '<div class="reader-hero">' +
      coverThumb +
      '<div class="reader-hero-meta">' +
      '<h3 class="reader-book-title">' +
      escapeHtml(title) +
      "</h3>" +
      '<div class="reader-book-author">' +
      escapeHtml(author) +
      "</div>" +
      '<div class="reader-pills">' +
      pillsHtml +
      "</div>" +
      "</div>" +
      "</div>" +
      notesSection +
      priorLinksHtml +
      (!opts.isMobile && !opts.pinned
        ? '<p class="reader-hint-foot">Click cover to pin · hover another cover to switch</p>'
        : "")
    );
  }

  function bindReaderActions(container, isMobile) {
    wireCoverImage(container.querySelector(".shelf-cover-img"));

    var clearBtn = container.querySelector("[data-clear-reader]");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (isMobile) {
          closeMobileSheet();
        } else {
          pinnedKey = null;
          hoveredKey = null;
          hoverSourceYear = null;
          syncCardStates();
          renderRailBody();
        }
      });
    }

    Array.prototype.slice
      .call(container.querySelectorAll("[data-step-book]"))
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          var nextK = btn.getAttribute("data-step-book");
          var target = findCardByKey(nextK);
          if (!target) return;
          if (isMobile) {
            openMobileSheet(target);
          } else {
            pinnedKey = nextK;
            hoveredKey = nextK;
            syncCardStates();
            renderRailBody();
            target.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });
      });

    Array.prototype.slice
      .call(container.querySelectorAll("[data-jump-book]"))
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          var jumpKey = btn.getAttribute("data-jump-book");
          var target = findCardByKey(jumpKey);
          if (!target) return;
          if (target.hidden && currentFilter !== "all") {
            applyFilter("all");
          }
          if (isMobile) {
            closeMobileSheet();
          }
          pinnedKey = jumpKey;
          hoveredKey = jumpKey;
          syncCardStates();
          renderRailBody();
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          if (isMobile) {
            openMobileSheet(target);
          }
        });
      });
  }

  function renderRailBody() {
    var displayKey = pinnedKey || hoveredKey;
    var card = findCardByKey(displayKey);

    if (!card || card.hidden) {
      var era = getEra(activeYear);
      railBodyEl.innerHTML =
        '<div class="reading-era-card">' +
        '<div class="reading-era-tag">' +
        escapeHtml(era.tag) +
        "</div>" +
        '<p class="reading-era-prose">' +
        escapeHtml(era.prose) +
        "</p>" +
        '<p class="reading-era-hint">Hover any cover on the shelf to preview notes here. Click a cover to pin it.</p>' +
        "</div>";
      return;
    }

    railBodyEl.innerHTML = buildBookReaderMarkup(card, {
      pinned: Boolean(pinnedKey),
      isMobile: false
    });
    railBodyEl.scrollTop = 0;
    bindReaderActions(railBodyEl, false);
  }

  function openMobileSheet(card) {
    if (!mobileSheet || !sheetBackdrop) return;
    mobileSheet.innerHTML = buildBookReaderMarkup(card, {
      pinned: true,
      isMobile: true
    });
    mobileSheet.hidden = false;
    sheetBackdrop.hidden = false;
    requestAnimationFrame(function () {
      mobileSheet.classList.add("is-open");
      sheetBackdrop.classList.add("is-open");
    });
    bindReaderActions(mobileSheet, true);
  }

  function closeMobileSheet() {
    if (!mobileSheet || !sheetBackdrop) return;
    mobileSheet.classList.remove("is-open");
    sheetBackdrop.classList.remove("is-open");
    setTimeout(function () {
      if (!mobileSheet.classList.contains("is-open")) {
        mobileSheet.hidden = true;
        sheetBackdrop.hidden = true;
      }
    }, 220);
  }

  if (sheetBackdrop) {
    sheetBackdrop.addEventListener("click", closeMobileSheet);
  }

  function syncCardStates() {
    allCards.forEach(function (card) {
      var key = card.getAttribute("data-book-key");
      card.classList.toggle("is-pinned", key === pinnedKey);
      card.classList.toggle("is-hovered", !pinnedKey && key === hoveredKey);
    });
  }

  function updateYearTelemetry(yr) {
    var yearChanged = yr !== activeYear;
    activeYear = yr;

    var sec = null;
    for (var i = 0; i < sections.length; i++) {
      if (Number(sections[i].getAttribute("data-year")) === yr) {
        sec = sections[i];
        break;
      }
    }
    if (!sec) return;

    var count = Number(sec.getAttribute("data-count") || 0);
    var noted = Number(sec.getAttribute("data-noted") || 0);
    var reading = Number(sec.getAttribute("data-reading") || 0);
    var rereads = Number(sec.getAttribute("data-rereads") || 0);
    var dnfs = Number(sec.getAttribute("data-dnfs") || 0);

    if (railYearEl) railYearEl.textContent = String(yr);
    if (railMetaEl) {
      var parts = [count + (count === 1 ? " book" : " books")];
      if (noted) parts.push(noted + " noted");
      else if (reading) parts.push(reading + " reading");
      else if (dnfs) parts.push(dnfs + " DNF");
      railMetaEl.textContent = parts.join(" · ");
    }

    chartCols.forEach(function (col) {
      col.classList.toggle("is-active", Number(col.getAttribute("data-year-target")) === yr);
    });

    sections.forEach(function (s) {
      s.classList.toggle("is-active-year", Number(s.getAttribute("data-year")) === yr);
    });

    // If user scrolled into a new year and nothing is pinned, release stale hover so the Era prose updates cleanly
    if (yearChanged && !pinnedKey) {
      if (hoveredKey && hoverSourceYear !== yr) {
        hoveredKey = null;
        hoverSourceYear = null;
        syncCardStates();
      }
      renderRailBody();
    }
  }

  // Card hover + click + keyboard interactions
  allCards.forEach(function (card) {
    var key = card.getAttribute("data-book-key");
    var yr = Number(card.getAttribute("data-year"));

    card.addEventListener("mouseenter", function () {
      if (isMobileLayout() || currentMode === "list") return;
      if (pinnedKey) return;
      if (hoveredKey === key) return;
      hoveredKey = key;
      hoverSourceYear = yr;
      syncCardStates();
      renderRailBody();
    });

    card.addEventListener("focus", function () {
      if (isMobileLayout() || currentMode === "list") return;
      if (pinnedKey) return;
      hoveredKey = key;
      hoverSourceYear = yr;
      syncCardStates();
      renderRailBody();
    });

    function handleActivate() {
      if (currentMode === "list") return;
      if (isMobileLayout()) {
        openMobileSheet(card);
        return;
      }
      if (pinnedKey === key) {
        pinnedKey = null;
        hoveredKey = key;
      } else {
        pinnedKey = key;
        hoveredKey = key;
      }
      syncCardStates();
      renderRailBody();
    }

    card.addEventListener("click", handleActivate);
    card.addEventListener("keydown", function (e) {
      if (currentMode === "list") return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleActivate();
      }
    });
  });

  // Keyboard shortcuts: Escape unpins/closes; Left/Right steps when pinned
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (mobileSheet && mobileSheet.classList.contains("is-open")) {
        closeMobileSheet();
      } else if (pinnedKey || hoveredKey) {
        pinnedKey = null;
        hoveredKey = null;
        hoverSourceYear = null;
        syncCardStates();
        renderRailBody();
      }
    } else if (pinnedKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      var visible = getVisibleCards();
      var cur = findCardByKey(pinnedKey);
      var idx = visible.indexOf(cur);
      if (idx === -1) return;
      var targetIdx = e.key === "ArrowLeft" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= visible.length) return;
      e.preventDefault();
      var nextCard = visible[targetIdx];
      pinnedKey = nextCard.getAttribute("data-book-key");
      hoveredKey = pinnedKey;
      syncCardStates();
      renderRailBody();
      nextCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  // Cadence bar click -> smooth scroll to that year
  chartCols.forEach(function (col) {
    col.addEventListener("click", function () {
      var yr = Number(col.getAttribute("data-year-target"));
      var sec = document.getElementById("year-" + yr);
      if (!sec || sec.hidden) return;
      var y = sec.getBoundingClientRect().top + window.scrollY - (isMobileLayout() ? 150 : 28);
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      updateYearTelemetry(yr);
    });
  });

  // Filter pills
  function applyFilter(filter) {
    currentFilter = filter;
    if (filterRoot) {
      Array.prototype.slice
        .call(filterRoot.querySelectorAll(".reading-pill"))
        .forEach(function (btn) {
          btn.classList.toggle("is-active", btn.getAttribute("data-filter") === filter);
        });
    }

    var totalShown = 0;
    sections.forEach(function (sec) {
      var yr = Number(sec.getAttribute("data-year"));
      var cards = Array.prototype.slice.call(sec.querySelectorAll(".shelf-book-card"));
      var shownInYear = 0;
      cards.forEach(function (c) {
        var match =
          filter === "all" ||
          (filter === "noted" && c.getAttribute("data-has-notes") === "true") ||
          (filter === "fav" && c.getAttribute("data-is-fav") === "true");
        c.hidden = !match;
        if (match) {
          shownInYear += 1;
          totalShown += 1;
        }
      });
      sec.hidden = shownInYear === 0;
      var lbl = sec.querySelector("[data-year-count-label]");
      if (lbl) {
        var origCount = Number(sec.getAttribute("data-count") || 0);
        var origNoted = Number(sec.getAttribute("data-noted") || 0);
        if (filter === "all") {
          lbl.textContent =
            origCount +
            (origCount === 1 ? " book" : " books") +
            (origNoted > 0 ? " · " + origNoted + " noted" : "");
        } else {
          lbl.textContent = shownInYear + " of " + origCount + " books";
        }
      }
      chartCols.forEach(function (col) {
        if (Number(col.getAttribute("data-year-target")) === yr) {
          col.classList.toggle("is-dimmed", shownInYear === 0);
        }
      });
    });

    if (emptyStateEl) {
      emptyStateEl.hidden = totalShown > 0;
    }

    var curCard = findCardByKey(pinnedKey || hoveredKey);
    if (curCard && curCard.hidden) {
      pinnedKey = null;
      hoveredKey = null;
      syncCardStates();
    }
    renderRailBody();
    onScroll();
  }

  if (filterRoot) {
    Array.prototype.slice
      .call(filterRoot.querySelectorAll(".reading-pill"))
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          applyFilter(btn.getAttribute("data-filter"));
        });
      });
  }

  function setMode(mode) {
    currentMode = mode;
    archive.setAttribute("data-view-mode", mode);
    modeBtns.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-mode") === mode));
    });
    allCards.forEach(function (card) {
      if (mode === "list") {
        card.removeAttribute("tabindex");
        card.removeAttribute("role");
      } else {
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
      }
    });
    if (mode === "list") {
      pinnedKey = null;
      hoveredKey = null;
      hoverSourceYear = null;
      syncCardStates();
    }
    renderRailBody();
    onScroll();
  }

  modeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.getAttribute("data-mode");
      if (mode === currentMode) return;

      var viewportTop = isMobileLayout()
        ? archive.querySelector(".reading-rail").getBoundingClientRect().bottom
        : 0;
      var anchor = getVisibleCards().find(function (card) {
        var rect = card.getBoundingClientRect();
        return rect.bottom > viewportTop && rect.top < window.innerHeight;
      });
      var anchorTop = anchor && anchor.getBoundingClientRect().top;
      setMode(mode);
      if (anchor) {
        window.scrollBy(0, anchor.getBoundingClientRect().top - anchorTop);
      }
      try {
        window.localStorage.setItem("reading-view-mode", mode);
      } catch (error) {
        // The switch also works when browser storage is unavailable.
      }
    });
  });

  // Scroll-spy linked to window scroll
  var rafPending = false;
  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      var visibleSections = sections.filter(function (s) {
        return !s.hidden;
      });
      if (!visibleSections.length) return;

      var offset = isMobileLayout() ? 180 : 120;
      var current = Number(visibleSections[0].getAttribute("data-year"));
      for (var i = 0; i < visibleSections.length; i++) {
        var rect = visibleSections[i].getBoundingClientRect();
        if (rect.top <= offset) {
          current = Number(visibleSections[i].getAttribute("data-year"));
        } else {
          break;
        }
      }
      updateYearTelemetry(current);
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // Support #year-2023 or #2023 deep links
  function handleHash() {
    var h = window.location.hash.replace(/^#/, "");
    if (!h) return;
    var match = h.match(/^(?:year-)?(\d{4})$/);
    if (match) {
      var target = document.getElementById("year-" + match[1]);
      if (target) {
        setTimeout(function () {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          updateYearTelemetry(Number(match[1]));
        }, 60);
      }
    }
  }

  updateYearTelemetry(activeYear);
  try {
    if (window.localStorage.getItem("reading-view-mode") === "list") {
      setMode("list");
    }
  } catch (error) {
    // Keep the default shelf when browser storage is unavailable.
  }
  handleHash();
})();

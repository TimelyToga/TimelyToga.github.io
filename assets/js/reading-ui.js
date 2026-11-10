(function () {
  "use strict";

  // 1. Interactive cadence chart -> year card highlight on /reading/
  var chartCols = Array.prototype.slice.call(
    document.querySelectorAll("[data-year-target]")
  );
  if (chartCols.length) {
    chartCols.forEach(function (col) {
      var yr = col.getAttribute("data-year-target");
      var card = document.querySelector('[data-year-card="' + yr + '"]');
      if (!card) {
        return;
      }
      col.addEventListener("mouseenter", function () {
        card.classList.add("is-chart-hovered");
      });
      col.addEventListener("mouseleave", function () {
        card.classList.remove("is-chart-hovered");
      });
    });

    var yearCards = Array.prototype.slice.call(
      document.querySelectorAll("[data-year-card]")
    );
    yearCards.forEach(function (card) {
      var yr = card.getAttribute("data-year-card");
      var col = document.querySelector('[data-year-target="' + yr + '"]');
      if (!col) {
        return;
      }
      card.addEventListener("mouseenter", function () {
        col.classList.add("is-card-hovered");
      });
      card.addEventListener("mouseleave", function () {
        col.classList.remove("is-card-hovered");
      });
    });
  }

  // 2. Interactive filter & instant search on individual yearly reading pages
  var controls = document.querySelector("[data-reading-controls]");
  var root = document.querySelector("[data-reading-root]");
  if (!controls || !root) {
    return;
  }

  var filterBtns = Array.prototype.slice.call(
    controls.querySelectorAll("[data-filter]")
  );
  var searchInput = controls.querySelector("[data-reading-search]");
  var statusEl = controls.querySelector("[data-reading-status]");
  var emptyEl = root.querySelector("[data-reading-empty]");
  var sections = Array.prototype.slice.call(
    root.querySelectorAll("[data-reading-section]")
  );
  var entries = Array.prototype.slice.call(
    root.querySelectorAll("[data-book-entry]")
  );

  // Cache searchable text once
  entries.forEach(function (el) {
    el._searchText = (el.textContent || "").toLowerCase();
  });

  var activeFilter = "all";
  var query = "";

  function matchesFilter(el) {
    if (activeFilter === "notes" && el.getAttribute("data-has-notes") !== "true") {
      return false;
    }
    if (activeFilter === "reread") {
      var att = el.getAttribute("data-attempt");
      if (att !== "reread" && att !== "restart") {
        return false;
      }
    }
    if (activeFilter === "dnf" && el.getAttribute("data-outcome") !== "dnf") {
      return false;
    }
    if (activeFilter === "audible" && el.getAttribute("data-audible") !== "true") {
      return false;
    }
    if (query && el._searchText.indexOf(query) === -1) {
      return false;
    }
    return true;
  }

  function applyFilters() {
    var visibleTotal = 0;

    sections.forEach(function (sec) {
      var secEntries = Array.prototype.slice.call(
        sec.querySelectorAll("[data-book-entry]")
      );
      if (!secEntries.length) {
        // Placeholder-only section (e.g. "Coming soon" favorites): hide when filtering
        sec.hidden = activeFilter !== "all" || query !== "";
        return;
      }
      var secVisible = 0;
      secEntries.forEach(function (el) {
        var show = matchesFilter(el);
        el.hidden = !show;
        if (show) {
          secVisible += 1;
          visibleTotal += 1;
        }
      });
      sec.hidden = secVisible === 0;
    });

    if (emptyEl) {
      emptyEl.hidden = visibleTotal > 0;
    }
    if (statusEl) {
      if (activeFilter === "all" && !query) {
        statusEl.textContent = "";
      } else {
        statusEl.textContent = visibleTotal + " shown";
      }
    }
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      activeFilter = btn.getAttribute("data-filter") || "all";
      filterBtns.forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      query = (searchInput.value || "").trim().toLowerCase();
      applyFilters();
    });
  }

  // Highlight targeted anchor book entry if navigated via cross-year reread link
  function highlightHashTarget() {
    if (!window.location.hash) {
      return;
    }
    var id = window.location.hash.slice(1);
    var target = document.getElementById(id);
    if (target && target.classList.contains("book-entry")) {
      target.classList.add("is-anchor-target");
    }
  }
  highlightHashTarget();
  window.addEventListener("hashchange", highlightHashTarget);
})();

(function () {
  "use strict";

  var chartCols = Array.prototype.slice.call(
    document.querySelectorAll("[data-year-target]")
  );
  if (!chartCols.length) {
    return;
  }

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
})();

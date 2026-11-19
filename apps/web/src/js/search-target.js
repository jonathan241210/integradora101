/* Resaltado temporal del destino de búsqueda (web-012). */
(function (root) {
  'use strict';

  var HIGHLIGHT_CLASS = 'search-target-highlight';
  var HIGHLIGHT_DURATION = 2400;
  var activeTarget = null;
  var activeTimer = null;
  var generation = 0;

  function highlight(target) {
    if (!target) return null;
    var tagName = String(target.tagName || '').toUpperCase();
    var destination = target;
    if ((tagName === 'SECTION' || tagName === 'MAIN') && typeof target.querySelector === 'function') {
      destination = target.querySelector('h1, h2') || target;
    }
    if (!destination.classList || typeof destination.classList.add !== 'function' || typeof destination.classList.remove !== 'function') return null;

    generation += 1;
    var currentGeneration = generation;
    if (activeTimer !== null) root.clearTimeout(activeTimer);
    if (activeTarget) activeTarget.classList.remove(HIGHLIGHT_CLASS);
    destination.classList.remove(HIGHLIGHT_CLASS);
    // Una lectura de layout reinicia el pulso al elegir de nuevo el mismo destino.
    void destination.offsetWidth;
    destination.classList.add(HIGHLIGHT_CLASS);
    activeTarget = destination;
    activeTimer = root.setTimeout(function () {
      if (generation !== currentGeneration) return;
      destination.classList.remove(HIGHLIGHT_CLASS);
      activeTarget = null;
      activeTimer = null;
    }, HIGHLIGHT_DURATION);
    return destination;
  }

  root.ArcaSearchTarget = { highlight: highlight };
})(globalThis);

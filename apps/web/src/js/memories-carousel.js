/* Comportamiento del carrusel de «Momentos para recordar» (web-010). Script clásico:
   expone ArcaMemoriesCarousel.mount(container, slides, deps) -> { destroy }.
   Solo controla qué momento se ve (fundido cruzado por CSS), las dos flechas, el teclado, el avance
   automático, la pausa por cursor o foco y el anuncio de cambios pedidos por el visitante;
   no conoce la red ni el contenido de cada momento. */
(function (root) {
  'use strict';

  var CAROUSEL_INTERVAL_MS = 5000;
  var REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  function mount(container, slides, deps) {
    var options = deps || {};
    var total = slides.length;
    var prev = container.querySelector('#memPrev');
    var next = container.querySelector('#memNext');
    var arrows = container.querySelector('#memArrows');
    var announce = container.querySelector('#memAnnounce');
    var intervalMs = options.intervalMs || CAROUSEL_INTERVAL_MS;
    var current = 0;
    var timer = null;
    var hovering = false;
    var focusInside = false;
    var bound = [];
    var query = null;
    var destroyed = false;

    function setTimer(fn, ms) {
      return options.setInterval ? options.setInterval(fn, ms) : root.setInterval(fn, ms);
    }
    function clearTimer(id) {
      if (options.clearInterval) options.clearInterval(id);
      else root.clearInterval(id);
    }
    function bind(target, type, fn) {
      if (!target || !target.addEventListener) return;
      target.addEventListener(type, fn);
      bound.push([target, type, fn]);
    }
    function setHidden(node, value) { if (node) node.hidden = value; }

    var matchMedia = options.matchMedia || (typeof root.matchMedia === 'function' ? function (q) { return root.matchMedia(q); } : null);
    query = matchMedia ? matchMedia(REDUCED_MOTION_QUERY) : null;
    function reduced() { return !!(query && query.matches); }
    function multiple() { return total >= 2; }

    function show(index) {
      current = index;
      slides.forEach(function (slide, i) {
        var active = i === current;
        slide.setAttribute('class', active ? 'mem-slide mem-slide-active' : 'mem-slide');
        if (active) slide.removeAttribute('aria-hidden');
        else slide.setAttribute('aria-hidden', 'true');
      });
    }

    function shouldRun() {
      return multiple() && !reduced() && !hovering && !focusInside;
    }

    function syncTimer() {
      if (timer !== null) { clearTimer(timer); timer = null; }
      if (destroyed || !shouldRun()) return;
      timer = setTimer(function () { show((current + 1) % total); }, intervalMs);
    }

    function syncControls() {
      var many = multiple();
      setHidden(prev, !many);
      setHidden(next, !many);
      setHidden(arrows, !many);
    }

    /* Cambio pedido por el visitante: se anuncia; el avance automático nunca escribe aquí. */
    function go(index) {
      show((index + total) % total);
      if (announce) announce.textContent = 'Momento ' + (current + 1) + ' de ' + total;
      if (timer !== null) syncTimer(); /* la navegación manual reinicia la cuenta de 5 s */
    }

    slides.forEach(function (slide, i) {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'diapositiva');
      slide.setAttribute('aria-label', 'Momento ' + (i + 1) + ' de ' + total);
    });

    if (announce) announce.textContent = '';

    if (multiple()) {
      bind(prev, 'click', function () { go(current - 1); });
      bind(next, 'click', function () { go(current + 1); });
      bind(container, 'keydown', function (event) {
        if (!event || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key === 'ArrowLeft') go(current - 1);
        else if (event.key === 'ArrowRight') go(current + 1);
      });
    }
    bind(container, 'mouseenter', function () { hovering = true; syncTimer(); });
    bind(container, 'mouseleave', function () { hovering = false; syncTimer(); });
    bind(container, 'focusin', function () { focusInside = true; syncTimer(); });
    bind(container, 'focusout', function (event) {
      var related = event && event.relatedTarget;
      if (related && typeof container.contains === 'function' && container.contains(related)) return;
      focusInside = false;
      syncTimer();
    });
    if (query) {
      var onChange = function () { syncControls(); syncTimer(); };
      if (typeof query.addEventListener === 'function') bind(query, 'change', onChange);
      else if (typeof query.addListener === 'function') {
        query.addListener(onChange);
        bound.push([query, 'legacy', onChange]);
      }
    }

    syncControls();
    show(0);
    syncTimer();

    return {
      destroy: function () {
        destroyed = true;
        if (timer !== null) { clearTimer(timer); timer = null; }
        bound.forEach(function (entry) {
          if (entry[1] === 'legacy') entry[0].removeListener(entry[2]);
          else if (typeof entry[0].removeEventListener === 'function') entry[0].removeEventListener(entry[1], entry[2]);
        });
        bound = [];
      }
    };
  }

  root.ArcaMemoriesCarousel = { mount: mount, CAROUSEL_INTERVAL_MS: CAROUSEL_INTERVAL_MS };
})(globalThis);

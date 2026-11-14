/* Galería dinámica «Momentos para recordar» (web-010). Script clásico: expone ArcaMemories.
   Todo texto de la API se escribe con textContent; este módulo no accede a la red
   (la lectura ocurre solo en js/api.js, función getMemories). El comportamiento del
   carrusel vive en js/memories-carousel.js. */
(function (root) {
  'use strict';

  var MEMORY_LIMIT = 6;
  var ALT_TEXT = 'Foto compartida por un visitante del zoológico';
  var TEXTS = {
    loading: 'Cargando momentos…',
    empty: 'Aún no hay momentos publicados.',
    error: 'No pudimos cargar los momentos. Inténtalo más tarde.'
  };

  /* ---------- Helpers puros ---------- */

  function safeImageUrl(value) {
    if (typeof value !== 'string') return null;
    var url = value.trim();
    if (!url) return null;
    if (/^https?:/i.test(url)) {
      try {
        var parsed = new root.URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
      } catch (e) {
        return null;
      }
    }
    if (url.charAt(0) === '/' && url.charAt(1) !== '/' && url.charAt(1) !== '\\') return url;
    return null;
  }

  function el(tag, className, content) {
    var node = root.document.createElement(tag);
    if (className) node.setAttribute('class', className);
    if (content !== undefined && content !== null) node.textContent = content;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function placeholder() {
    var span = el('span', 'mem-placeholder');
    span.setAttribute('aria-hidden', 'true');
    span.appendChild(el('i', 'bi bi-image'));
    return span;
  }

  /* Un momento: solo se leen image_url y opinion (RN-07). */
  function buildSlide(memory) {
    var slide = el('div', 'mem-slide');
    var media = el('div', 'mem-media');
    var url = safeImageUrl(memory ? memory.image_url : null);
    if (url === null) {
      media.appendChild(placeholder());
    } else {
      var img = el('img');
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      img.setAttribute('alt', ALT_TEXT);
      img.addEventListener('error', function () {
        if (img.parentNode === media) media.removeChild(img);
        media.appendChild(placeholder());
      });
      img.src = url;
      media.appendChild(img);
    }
    slide.appendChild(media);
    slide.appendChild(el('p', 'mem-opinion', memory && typeof memory.opinion === 'string' ? memory.opinion : ''));
    return slide;
  }

  function validMemories(data) {
    var out = [];
    for (var i = 0; i < data.length && out.length < MEMORY_LIMIT; i += 1) {
      var item = data[i];
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) out.push(item);
    }
    return out;
  }

  /* ---------- Controlador ---------- */

  function controller() {
    var doc = root.document;
    var $ = function (id) { return doc.getElementById(id); };
    var gallery = $('memGallery');
    var status = $('memStatus');
    var retry = $('memRetry');
    var carouselEl = $('memCarousel');
    var slidesEl = $('memSlides');
    if (!gallery || !status) return null;

    var busy = false;
    var carousel = null;

    function hide(node, value) { if (node) node.hidden = value; }

    function reset() {
      if (carousel) { carousel.destroy(); carousel = null; }
      if (slidesEl) clear(slidesEl);
      hide(carouselEl, true);
      hide(retry, true);
    }

    function show(message, withRetry) {
      status.textContent = message;
      status.hidden = false;
      hide(retry, !withRetry);
    }

    function load(opts) {
      if (busy) return Promise.resolve(null);
      busy = true;
      var refocus = !!(opts && opts.refocus);
      reset();
      gallery.setAttribute('aria-busy', 'true');
      show(TEXTS.loading, false);
      if (refocus) status.focus();

      var request;
      try {
        request = Promise.resolve(root.ArcaApi.getMemories({ limit: MEMORY_LIMIT }));
      } catch (e) {
        request = Promise.resolve({ ok: false, reason: 'network' });
      }
      return request.catch(function () { return { ok: false, reason: 'network' }; }).then(function (result) {
        busy = false;
        gallery.setAttribute('aria-busy', 'false');
        reset();
        if (!result || !result.ok || !Array.isArray(result.data)) {
          show(TEXTS.error, true);
          if (refocus && retry) retry.focus();
          return result;
        }
        var list = validMemories(result.data);
        if (list.length === 0) {
          show(TEXTS.empty, false);
          if (refocus) status.focus();
          return result;
        }
        var slides = list.map(buildSlide);
        slides.forEach(function (slide) { slidesEl.appendChild(slide); });
        status.hidden = true;
        hide(carouselEl, false);
        if (root.ArcaMemoriesCarousel) carousel = root.ArcaMemoriesCarousel.mount(carouselEl, slides, {});
        if (refocus) gallery.focus();
        return result;
      });
    }

    if (retry) retry.addEventListener('click', function () { load({ refocus: true }); });
    gallery.setAttribute('tabindex', '-1');
    return { load: load };
  }

  var instance = null;

  function init() {
    if (!root.document || !root.ArcaApi) return null;
    instance = controller();
    if (instance) instance.load();
    return instance;
  }

  root.ArcaMemories = {
    helpers: { safeImageUrl: safeImageUrl, buildSlide: buildSlide, MEMORY_LIMIT: MEMORY_LIMIT, ALT_TEXT: ALT_TEXT },
    init: init,
    load: function (opts) { return instance ? instance.load(opts) : Promise.resolve(null); }
  };

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(globalThis);

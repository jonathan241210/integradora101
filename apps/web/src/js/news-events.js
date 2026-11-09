/* Presentación de noticias y eventos (web-009). Script clásico: expone ArcaNewsEvents.
   Todo texto de la API se escribe con textContent; este módulo no accede a la red. */
(function (root) {
  'use strict';

  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var TEXTS = {
    news: {
      loading: 'Cargando noticias…',
      empty: 'Aún no hay noticias publicadas',
      error: 'No pudimos cargar las noticias. Inténtalo más tarde.'
    },
    events: {
      loading: 'Cargando eventos…',
      empty: 'Aún no hay eventos vigentes',
      error: 'No pudimos cargar los eventos. Inténtalo más tarde.'
    }
  };
  var CONTENT_LOADING = 'Cargando contenido…';
  var CONTENT_ERROR = 'No pudimos cargar el contenido de esta noticia. Inténtalo más tarde.';

  /* ---------- Helpers puros ---------- */

  function parseDate(value) {
    if (typeof value !== 'string') return null;
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1) return null;
    var leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    var days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    if (day > days) return null;
    return { year: year, month: month, day: day };
  }

  function formatSpanishDate(value) {
    var date = parseDate(value);
    if (!date) return '';
    return date.day + ' de ' + MONTHS[date.month - 1] + ' de ' + date.year;
  }

  function formatEventRange(start, end) {
    var from = parseDate(start);
    if (!from) return '';
    var to = parseDate(end);
    var fromKey = from.year * 10000 + from.month * 100 + from.day;
    if (!to || (to.year * 10000 + to.month * 100 + to.day) <= fromKey) return formatSpanishDate(start);
    if (to.year === from.year && to.month === from.month) {
      return 'del ' + from.day + ' al ' + to.day + ' de ' + MONTHS[to.month - 1] + ' de ' + to.year;
    }
    return 'del ' + formatSpanishDate(start) + ' al ' + formatSpanishDate(end);
  }

  function formatTimeRange(start, end) {
    function hm(value) {
      var match = /^(\d{2}):(\d{2})/.exec(typeof value === 'string' ? value : '');
      return match ? match[1] + ':' + match[2] : '';
    }
    var a = hm(start);
    var b = hm(end);
    if (a && b) return a + '–' + b + ' hrs';
    if (a) return a + ' hrs';
    return '';
  }

  function safeImageUrl(value) {
    if (typeof value !== 'string') return null;
    var url = value.trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.charAt(0) === '/' && url.charAt(1) !== '/') return url;
    return null;
  }

  function positiveId(value) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
  }

  /* ---------- DOM ---------- */

  function el(tag, className, text) {
    var node = root.document.createElement(tag);
    if (className) node.setAttribute('class', className);
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function icon(name) {
    var node = el('i', 'bi ' + name);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function placeholder(iconName) {
    var box = el('span', 'ne-placeholder');
    box.setAttribute('aria-hidden', 'true');
    box.appendChild(icon(iconName));
    return box;
  }

  function mediaBox(url, alt, iconName) {
    var box = el('div', 'ne-media');
    var safe = safeImageUrl(url);
    if (!safe) {
      box.appendChild(placeholder(iconName));
      return box;
    }
    var img = el('img', 'ne-image');
    img.setAttribute('src', safe);
    img.setAttribute('alt', String(alt || ''));
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.addEventListener('error', function () {
      clear(box);
      box.appendChild(placeholder(iconName));
    });
    box.appendChild(img);
    return box;
  }

  /* ---------- Estados ---------- */

  function renderState(container, kind, state, options) {
    var opts = options || {};
    var texts = TEXTS[kind];
    if (!opts.keep) clear(container);
    if (state === 'loading') container.setAttribute('aria-busy', 'true');
    else container.removeAttribute('aria-busy');

    var wrapper = el('div', 'ne-state ne-state-' + state);
    var status = el('p', 'ne-status', texts[state]);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    wrapper.appendChild(status);

    if (state === 'error' && typeof opts.onRetry === 'function') {
      var retry = el('button', 'btn btn-primary ne-retry', 'Reintentar');
      retry.setAttribute('type', 'button');
      retry.addEventListener('click', opts.onRetry);
      wrapper.appendChild(retry);
    }
    container.appendChild(wrapper);
    if (opts.refocus) {
      var target = state === 'error' ? wrapper.querySelector('.ne-retry') : status;
      if (!target) target = status;
      if (target.setAttribute) target.setAttribute('tabindex', '-1');
      if (typeof target.focus === 'function') target.focus();
    }
    return wrapper;
  }

  function finish(container) {
    container.removeAttribute('aria-busy');
    clear(container);
  }

  /* ---------- Tarjetas ---------- */

  function newsCard(item) {
    var card = el('article', 'news-card ne-card');
    card.appendChild(mediaBox(item.image_url, item.title, 'bi-newspaper'));

    if (item.category) {
      var category = el('span', 'news-date');
      category.appendChild(icon('bi-megaphone'));
      category.appendChild(root.document.createTextNode(' '));
      var label = el('span', null, item.category);
      category.appendChild(label);
      card.appendChild(category);
    }

    card.appendChild(el('h3', null, item.title));

    var published = formatSpanishDate(item.published_date);
    if (published) {
      var time = el('time', 'ne-date', published);
      time.setAttribute('datetime', item.published_date);
      card.appendChild(time);
    }
    if (item.description) card.appendChild(el('p', 'ne-description', item.description));

    var id = positiveId(item.id);
    if (id !== null) card.appendChild(contentBlock(id));
    return card;
  }

  function contentBlock(id) {
    var block = el('div', 'ne-content-block');
    block.setAttribute('id', 'ne-content-' + id);

    function focusIf(node, refocus) {
      if (!refocus || !node) return;
      node.setAttribute('tabindex', '-1');
      if (typeof node.focus === 'function') node.focus();
    }

    function showLoading(refocus) {
      clear(block);
      var status = el('p', 'ne-status', CONTENT_LOADING);
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      block.appendChild(status);
      focusIf(status, refocus);
    }

    function showError(refocus) {
      clear(block);
      var status = el('p', 'ne-status', CONTENT_ERROR);
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      var retry = el('button', 'btn btn-primary ne-retry', 'Reintentar');
      retry.setAttribute('type', 'button');
      retry.addEventListener('click', function () { load(true); });
      block.appendChild(status);
      block.appendChild(retry);
      if (refocus && typeof retry.focus === 'function') retry.focus();
    }

    function load(refocus) {
      showLoading(refocus);
      root.ArcaApi.getNewsItem(id).then(function (result) {
        if (!(result && result.ok && result.data)) { showError(refocus); return; }
        var content = typeof result.data.content === 'string' ? result.data.content : '';
        clear(block);
        if (!content.trim()) {
          if (block.parentNode) block.parentNode.removeChild(block);
          return;
        }
        block.appendChild(el('strong', 'ne-content-label', 'Contenido:'));
        var body = el('p', 'ne-content', content);
        block.appendChild(body);
        focusIf(body, refocus);
      });
    }

    load();
    return block;
  }

  function eventCard(item) {
    var card = el('article', 'event-card ne-card ne-event-card');
    var inner = el('div', 'ne-event-body');
    inner.appendChild(mediaBox(item.image_url, item.name, 'bi-calendar-event'));
    inner.appendChild(el('h3', null, item.name));

    var range = formatEventRange(item.start_date, item.end_date);
    if (range) inner.appendChild(el('p', 'ne-date', range));
    var hours = formatTimeRange(item.start_time, item.end_time);
    if (hours) {
      var schedule = el('p', 'ne-schedule');
      schedule.appendChild(icon('bi-clock'));
      schedule.appendChild(root.document.createTextNode(' ' + hours));
      inner.appendChild(schedule);
    }
    if (item.location) {
      var place = el('p', 'ne-location');
      place.appendChild(icon('bi-geo-alt'));
      place.appendChild(root.document.createTextNode(' '));
      place.appendChild(el('span', null, item.location));
      inner.appendChild(place);
    }
    if (item.description) inner.appendChild(el('p', 'ne-description', item.description));
    card.appendChild(inner);
    return card;
  }

  function renderNews(container, items) {
    items.forEach(function (item) { container.appendChild(newsCard(item)); });
  }

  function renderEvents(container, items) {
    items.forEach(function (item) { container.appendChild(eventCard(item)); });
  }

  /* ---------- Carga de secciones ---------- */

  function loadSection(container, kind, fetcher, opts) {
    var options = opts || {};
    var refocus = options.refocus === true;
    renderState(container, kind, 'loading', { refocus: refocus });
    return fetcher().then(function (result) {
      var retryOptions = { retry: options.retry, refocus: true, onSuccess: options.onSuccess };
      if (!result.ok) {
        renderState(container, kind, 'error', {
          refocus: refocus,
          onRetry: options.retry ? function () { loadSection(container, kind, fetcher, retryOptions); } : null
        });
        return result;
      }
      if (typeof options.onSuccess === 'function') options.onSuccess(result);
      if (result.data.length === 0) {
        renderState(container, kind, 'empty', { refocus: refocus });
        return result;
      }
      finish(container);
      if (kind === 'news') renderNews(container, result.data);
      else renderEvents(container, result.data);
      if (refocus && container.setAttribute) {
        container.setAttribute('tabindex', '-1');
        if (typeof container.focus === 'function') container.focus();
      }
      return result;
    });
  }

  function setupNewsPage(container, moreHost) {
    var limit = 10;
    var page = 1;
    var button = null;
    var note = null;

    function updateMore(meta) {
      if (!moreHost) return;
      if (meta && meta.has_more === true) {
        if (!button) {
          button = el('button', 'btn btn-primary ne-more-btn', 'Cargar más');
          button.setAttribute('type', 'button');
          button.addEventListener('click', loadNext);
          moreHost.appendChild(button);
        }
      } else if (button) {
        moreHost.removeChild(button);
        button = null;
      }
    }

    function setNote(text) {
      if (!moreHost) return;
      if (note) { moreHost.removeChild(note); note = null; }
      if (text) {
        note = el('p', 'ne-status', text);
        note.setAttribute('role', 'status');
        note.setAttribute('aria-live', 'polite');
        moreHost.appendChild(note);
      }
    }

    function fetchPage(n) { return root.ArcaApi.getNews({ page: n, limit: limit }); }

    function loadNext() {
      if (button) button.disabled = true;
      setNote(TEXTS.news.loading);
      return fetchPage(page + 1).then(function (result) {
        if (button) button.disabled = false;
        if (!result.ok) { setNote(TEXTS.news.error); return result; }
        setNote('');
        page += 1;
        renderNews(container, result.data);
        updateMore(result.meta);
        return result;
      });
    }

    return loadSection(container, 'news', function () { return fetchPage(1); }, {
      retry: true,
      onSuccess: function (result) { updateMore(result.meta); }
    });
  }

  function init() {
    var doc = root.document;
    if (!doc || !root.ArcaApi) return;
    var lists = doc.querySelectorAll('[data-ne-list]');
    for (var i = 0; i < lists.length; i += 1) {
      var container = lists[i];
      var kind = container.getAttribute('data-ne-list');
      var limit = container.getAttribute('data-ne-limit');
      var paged = container.getAttribute('data-ne-paged') === 'true';
      var moreId = container.getAttribute('data-ne-more');
      var moreHost = moreId ? doc.getElementById(moreId) : null;
      if (kind === 'news' && paged) {
        setupNewsPage(container, moreHost);
      } else if (kind === 'news') {
        loadSection(container, 'news', makeFetcher('getNews', limit), { retry: true });
      } else if (kind === 'events') {
        loadSection(container, 'events', makeFetcher('getEvents', limit), { retry: true });
      }
    }
  }

  function makeFetcher(method, limit) {
    return function () { return root.ArcaApi[method](limit ? { limit: Number(limit) } : {}); };
  }

  root.ArcaNewsEvents = {
    formatSpanishDate: formatSpanishDate,
    formatEventRange: formatEventRange,
    formatTimeRange: formatTimeRange,
    safeImageUrl: safeImageUrl,
    renderState: renderState,
    renderNews: renderNews,
    renderEvents: renderEvents,
    loadSection: loadSection,
    init: init
  };

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(globalThis);

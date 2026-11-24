/* Búsqueda global pública del portal (web-012).
   js/api.js es el único módulo de red; este archivo trabaja con sus respuestas en memoria. */
(function (root) {
  'use strict';

  var PAGE_LIMIT = 50;
  var NEWS_PAGE_LIMIT = 10; // Tamaño del listado de noticias en js/news-events.js.
  var MAX_QUERY_LENGTH = 120;
  var TYPE_ORDER = ['Información', 'Especies', 'Noticias', 'Eventos', 'Momentos'];
  var CATEGORY_LABELS = {
    mammal: 'Mamífero', bird: 'Ave', reptile: 'Reptil', amphibian: 'Anfibio', fish: 'Pez', invertebrate: 'Invertebrado'
  };
  var FIELD_KEYS = ['scientific_name', 'origin', 'habitat', 'conservation_status', 'size_cm', 'gestation_period', 'diet', 'longevity', 'characteristics'];

  function clean(value) {
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  }

  function normalize(value) {
    return clean(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }

  function validQuery(value) {
    var query = clean(value);
    if (!query) return { ok: false, reason: 'empty' };
    if (query.length > MAX_QUERY_LENGTH) return { ok: false, reason: 'long' };
    return { ok: true, value: query };
  }

  function positiveId(value) {
    var number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
  }

  function collectStaticRecords(doc) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return [];
    var records = [];
    var selectors = 'h2,h3,h4,p,li,dt,dd,figcaption,a,label,summary,span,strong,em,small,button,img[alt]';
    var excluded = '#animalGrid,#newsGrid,#eventGrid,#memGallery,#animalFilters,#animalStatus,#animalCount,#noAnimals';
    var main = typeof doc.querySelector === 'function' ? doc.querySelector('main') : null;

    function collectValues(elements, skipNamedSection) {
      var values = [];
      for (var j = 0; j < elements.length; j += 1) {
        var element = elements[j];
        if (element.hidden || (element.closest && element.closest('[hidden]'))) continue;
        if (element.closest && element.closest(excluded)) continue;
        if (skipNamedSection && element.closest && element.closest('section[id]')) continue;
        var text = element.tagName === 'IMG' ? clean(element.getAttribute('alt')) : clean(element.innerText || element.textContent);
        if (text && values.indexOf(text) === -1) values.push(text);
      }
      return values;
    }

    if (main) {
      var looseValues = collectValues(main.querySelectorAll(selectors), true);
      if (looseValues.length) {
        var mainHeading = main.querySelector('h1');
        records.push({ type: 'Información', title: mainHeading ? clean(mainHeading.innerText || mainHeading.textContent) : 'Inicio', text: looseValues.join(' '), url: '#inicio', order: -1 });
      }
    }

    var sections = doc.querySelectorAll('main section[id]');
    for (var i = 0; i < sections.length; i += 1) {
      var section = sections[i];
      var id = section.getAttribute('id');
      if (!id || section.hidden) continue;
      var elements = section.querySelectorAll(selectors);
      var values = collectValues(elements, false);
      if (!values.length) continue;
      var heading = section.querySelector('h2');
      var title = heading ? clean(heading.innerText || heading.textContent) : id;
      records.push({ type: 'Información', title: title, text: values.join(' '), url: '#' + encodeURIComponent(id), order: i });
    }
    return records;
  }

  function hasMore(result) {
    return !!(result && result.meta && result.meta.has_more === true);
  }

  function loadNews(api) {
    return fetchPagedRecords(api, 'getNews').then(function (items) {
      var output = new Array(items.length);
      var nextIndex = 0;
      var failed = false;
      var workers = Math.min(4, items.length);
      function worker() {
        var index = nextIndex++;
        if (index >= items.length) return Promise.resolve();
        var item = items[index];
        var id = item && positiveId(item.id);
        if (id === null) {
          failed = true;
          output[index] = item;
          return worker();
        }
        return Promise.resolve().then(function () { return api.getNewsItem(id); }).then(function (detail) {
          if (detail && detail.ok && detail.data) output[index] = Object.assign({}, item, detail.data);
          else { failed = true; output[index] = item; }
        }, function () {
          failed = true;
          output[index] = item;
        }).then(worker);
      }
      var tasks = [];
      for (var i = 0; i < workers; i += 1) tasks.push(worker());
      return Promise.all(tasks).then(function () { return { items: output, partial: failed }; });
    });
  }

  function speciesText(item) {
    var values = [clean(item.common_name)];
    var category = clean(item.category);
    if (category) values.push(CATEGORY_LABELS[category] || category);
    FIELD_KEYS.forEach(function (key) {
      var value = clean(item[key]);
      if (value) values.push(value);
    });
    return values.join(' ');
  }

  function toRecords(name, items) {
    var records = [];
    items.forEach(function (item, index) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      var id = positiveId(item.id);
      var title = '';
      var values = [];
      var url = '';
      if (name === 'species') {
        title = clean(item.common_name);
        values = [speciesText(item)];
        url = id ? '#animal-' + id : '#animales';
      } else if (name === 'news') {
        title = clean(item.title);
        values = [title, clean(item.category), clean(item.description), clean(item.content), clean(item.published_date)];
        url = id ? 'noticias.html?page=' + encodeURIComponent(String(item._searchPage || 1)) + '#news-' + id : 'noticias.html';
      } else if (name === 'events') {
        title = clean(item.name);
        values = [title, clean(item.description), clean(item.location), clean(item.start_date), clean(item.end_date), clean(item.start_time), clean(item.end_time)];
        url = id ? 'eventos.html#event-' + id : 'eventos.html';
      } else if (name === 'memories') {
        title = 'Momento compartido';
        values = [clean(item.opinion)];
        url = '#galeria';
      }
      var text = values.filter(Boolean).join(' ');
      if (!title || !text) return;
      records.push({ type: name === 'species' ? 'Especies' : name === 'news' ? 'Noticias' : name === 'events' ? 'Eventos' : 'Momentos', title: title, text: text, url: url, order: index });
    });
    return records;
  }

  function fetchPagedRecords(api, method) {
    var all = [];
    var page = 1;
    function next() {
      return Promise.resolve().then(function () { return api[method]({ page: page, limit: PAGE_LIMIT }); }).then(function (result) {
        if (!result || !result.ok || !Array.isArray(result.data)) throw new Error('source');
        result.data.forEach(function (item, index) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            var copy = Object.assign({}, item);
            copy._searchPage = method === 'getNews' ? Math.floor(((page - 1) * PAGE_LIMIT + index) / NEWS_PAGE_LIMIT) + 1 : page;
            all.push(copy);
          }
        });
        if (!hasMore(result)) return all;
        page += 1;
        return next();
      });
    }
    return next();
  }

  var LOADERS = {
    species: function (api) { return api.getSpecies().then(function (result) { if (!result || !result.ok || !Array.isArray(result.data)) throw new Error('source'); return { items: result.data, partial: false }; }); },
    news: loadNews,
    events: function (api) { return api.getEvents().then(function (result) { if (!result || !result.ok || !Array.isArray(result.data)) throw new Error('source'); return { items: result.data, partial: false }; }); },
    memories: function (api) { return fetchPagedRecords(api, 'getMemories').then(function (items) { return { items: items, partial: false }; }); }
  };

  function loadSources(api, staticRecords, cache, onlyNames) {
    var sourceCache = cache || {};
    var names = Array.isArray(onlyNames) ? onlyNames : ['species', 'news', 'events', 'memories'];
    return Promise.all(names.map(function (name) {
      if (sourceCache[name] && !sourceCache[name].error) return Promise.resolve([name, sourceCache[name]]);
      return Promise.resolve().then(function () { return LOADERS[name](api); }).then(function (loaded) {
        var status = { error: false, partial: loaded.partial, items: loaded.items };
        sourceCache[name] = status;
        return [name, status];
      }, function () {
        var status = { error: true, partial: false, items: [] };
        sourceCache[name] = status;
        return [name, status];
      });
    })).then(function () {
      var output = Array.isArray(staticRecords) ? staticRecords.slice() : [];
      var errors = [];
      var partial = [];
      Object.keys(sourceCache).forEach(function (name) {
        var status = sourceCache[name];
        if (status.error) errors.push(name);
        if (status.partial) { partial.push(name); if (errors.indexOf(name) === -1) errors.push(name); }
        output = output.concat(toRecords(name, status.items));
      });
      return { records: output, errors: errors, partial: partial, cache: sourceCache };
    });
  }

  function matching(records, query) {
    var needle = normalize(query);
    var typeRank = {};
    TYPE_ORDER.forEach(function (type, index) { typeRank[type] = index; });
    return records.filter(function (record) { return normalize(record.text).indexOf(needle) !== -1; }).sort(function (a, b) {
      var rank = (typeRank[a.type] || 0) - (typeRank[b.type] || 0);
      return rank || ((a.order || 0) - (b.order || 0));
    }).map(function (record) {
      var normalized = normalize(record.text);
      var index = normalized.indexOf(needle);
      var start = Math.max(0, index - 55);
      var snippet = record.text.slice(start, Math.min(record.text.length, start + 155));
      if (start > 0) snippet = '…' + snippet;
      if (start + 155 < record.text.length) snippet += '…';
      return { type: record.type, title: record.title, snippet: snippet, url: record.url };
    });
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function element(doc, tag, className, value) {
    var node = doc.createElement(tag);
    if (className) node.setAttribute('class', className);
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function render(panel, results, options) {
    if (!panel || !panel.ownerDocument) return;
    var doc = panel.ownerDocument;
    var opts = options || {};
    clear(panel);
    panel.hidden = false;
    panel.appendChild(element(doc, 'h2', 'search-panel-title', 'Resultados de búsqueda'));
    var status = element(doc, 'p', 'search-status' + ((opts.errors || []).length ? ' search-status-warning' : ''), opts.status || (results.length ? results.length + (results.length === 1 ? ' resultado encontrado.' : ' resultados encontrados.') : 'No encontramos resultados.'));
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.appendChild(status);
    if ((opts.errors || []).length) {
      var actions = element(doc, 'div', 'search-retry-actions');
      actions.setAttribute('role', 'group');
      actions.setAttribute('aria-label', 'Volver a consultar contenido');
      opts.errors.forEach(function (name) {
        var button = element(doc, 'button', 'search-retry', 'Reintentar ' + sourceLabel(name));
        button.setAttribute('type', 'button');
        button.setAttribute('data-search-source', name);
        actions.appendChild(button);
      });
      panel.appendChild(actions);
    }
    if (!results.length) return;
    TYPE_ORDER.forEach(function (type) {
      var group = results.filter(function (result) { return result.type === type; });
      if (!group.length) return;
      var section = element(doc, 'section', 'search-group');
      section.appendChild(element(doc, 'h3', null, type));
      var list = element(doc, 'ul', 'search-results-list');
      group.forEach(function (result) {
        var item = element(doc, 'li', 'search-result');
        item.appendChild(element(doc, 'span', 'search-result-type', type));
        var link = element(doc, 'a', 'search-result-link', result.title);
        link.setAttribute('href', result.url);
        item.appendChild(link);
        item.appendChild(element(doc, 'p', 'search-result-snippet', result.snippet));
        list.appendChild(item);
      });
      section.appendChild(list);
      panel.appendChild(section);
    });
  }

  function sourceLabel(name) {
    return ({ species: 'especies', news: 'noticias', events: 'eventos', memories: 'momentos' })[name] || 'contenido';
  }

  function sourceErrorText() {
    return 'Algunas secciones no están disponibles. Puedes reintentarlo o consultar los resultados encontrados.';
  }

  function init() {
    var doc = root.document;
    if (!doc) return null;
    var form = doc.getElementById('searchForm');
    var input = doc.getElementById('searchInput');
    var panel = doc.getElementById('searchResults');
    if (!form || !input || !panel || !root.ArcaApi) return null;
    var cache = {};
    var staticRecords = collectStaticRecords(doc);
    var currentQuery = '';
    var busy = false;
    var expanded = false;

    function setExpanded(value) {
      expanded = value;
      panel.hidden = !value;
      input.setAttribute('aria-expanded', String(value));
    }

    function updatePanel(results, options) {
      render(panel, results, options);
      setExpanded(expanded);
    }

    function execute(query) {
      if (root.ArcaTulanpedia && typeof root.ArcaTulanpedia.cancelInitialFocus === 'function') root.ArcaTulanpedia.cancelInitialFocus();
      var valid = validQuery(query);
      setExpanded(true);
      if (!valid.ok) {
        currentQuery = '';
        updatePanel([], { status: valid.reason === 'long' ? 'La búsqueda admite hasta 120 caracteres.' : 'Escribe una palabra o frase para buscar.' });
        return Promise.resolve(null);
      }
      currentQuery = valid.value;
      if (busy) {
        updatePanel([], { status: 'Buscando en el portal…' });
        return Promise.resolve(null);
      }
      busy = true;
      updatePanel([], { status: 'Buscando en el portal…' });
      return loadSources(root.ArcaApi, staticRecords, cache).then(function (loaded) {
        if (!currentQuery) return loaded;
        var results = matching(loaded.records, currentQuery);
        var message = loaded.errors.length ? sourceErrorText(loaded.errors) : loaded.partial.length ? 'Algunos contenidos no se pudieron consultar; los resultados pueden estar incompletos.' : '';
        updatePanel(results, { status: message || undefined, errors: loaded.errors });
        return loaded;
      }).catch(function () {
        if (currentQuery) updatePanel([], { status: 'No pudimos buscar en el portal. Inténtalo de nuevo.' });
        return null;
      }).then(function (value) { busy = false; return value; });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      execute(input.value);
    }, true);
    panel.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a.search-result-link') : null;
      if (link && panel.contains(link)) {
        setExpanded(false);
        // Los enlaces conservan el destino nativo, incluidas las aperturas en otra pestaña.
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          var href = link.getAttribute('href') || '';
          var species = /^#animal-([1-9]\d*)$/.exec(href);
          if (species && root.ArcaTulanpedia) root.ArcaTulanpedia.focusCard(species[1]);
          else if (/^#[\w-]+$/.test(href)) {
            var target = doc.getElementById(href.slice(1));
            if (target) {
              target.setAttribute('tabindex', '-1');
              target.focus({ preventScroll: true });
              if (root.ArcaSearchTarget) root.ArcaSearchTarget.highlight(target);
            }
          }
        }
        return;
      }
      var button = event.target && event.target.closest ? event.target.closest('[data-search-source]') : null;
      if (!button || busy) return;
      var name = button.getAttribute('data-search-source');
      if (!Object.prototype.hasOwnProperty.call(LOADERS, name)) return;
      busy = true;
      button.disabled = true;
      var label = sourceLabel(name);
      updatePanel([], { status: 'Actualizando ' + label + '…' });
      delete cache[name];
      loadSources(root.ArcaApi, staticRecords, cache, [name]).then(function (loaded) {
        if (!currentQuery) return;
        updatePanel(matching(loaded.records, currentQuery), {
          status: loaded.errors.length ? sourceErrorText(loaded.errors) : loaded.partial.length ? 'Algunos contenidos no se pudieron consultar; los resultados pueden estar incompletos.' : undefined,
          errors: loaded.errors
        });
      }).finally(function () { busy = false; });
    });
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        setExpanded(false);
        input.focus();
      }
    }
    input.addEventListener('keydown', closeOnEscape);
    panel.addEventListener('keydown', closeOnEscape);
    doc.addEventListener('click', function (event) {
      // El reintento puede sustituir su botón antes de que el clic llegue al documento.
      var path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      var inside = path.indexOf(form) !== -1 || path.indexOf(panel) !== -1 || form.contains(event.target) || panel.contains(event.target);
      if (!panel.hidden && !inside) setExpanded(false);
    });
    return { execute: execute, cache: cache };
  }

  root.ArcaPortalSearch = {
    init: init,
    helpers: {
      collectStaticRecords: collectStaticRecords,
      loadSources: loadSources,
      matching: matching,
      normalize: normalize,
      positiveId: positiveId,
      toRecords: toRecords,
      validQuery: validQuery,
      render: render,
      MAX_QUERY_LENGTH: MAX_QUERY_LENGTH,
      PAGE_LIMIT: PAGE_LIMIT
    }
  };

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(globalThis);

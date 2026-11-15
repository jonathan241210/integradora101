/* TulanPedia dinámica (web-011). Script clásico: expone ArcaTulanpedia.
   Todo texto de la API se escribe con textContent; este módulo no accede a la red
   (la lectura ocurre solo en js/api.js, función getSpecies). */
(function (root) {
  'use strict';

  var TEXTS = {
    loading: 'Cargando especies…',
    empty: 'Aún no hay especies publicadas.',
    error: 'No pudimos cargar las especies. Inténtalo más tarde.',
    retry: 'Reintentar',
    moreTitle: 'Conocer más sobre la especie'
  };

  /* Tabla de presentación (RN-11): solo traduce claves de DBR-004; no decide qué tipos existen. */
  var CATEGORY_LABELS = {
    mammal: 'Mamífero',
    bird: 'Ave',
    reptile: 'Reptil',
    amphibian: 'Anfibio',
    fish: 'Pez',
    invertebrate: 'Invertebrado'
  };

  /* Orden de la ficha (plan): category primero; después el orden de CA-19. */
  var FIELDS = [
    { key: 'scientific_name', label: 'Nombre científico' },
    { key: 'origin', label: 'Área de distribución natural' },
    { key: 'habitat', label: 'Hábitat' },
    { key: 'conservation_status', label: 'Estado de conservación' },
    { key: 'size_cm', label: 'Tamaño' },
    { key: 'gestation_period', label: 'Gestación' },
    { key: 'diet', label: 'Alimentación' },
    { key: 'longevity', label: 'Esperanza de vida' },
    { key: 'characteristics', label: 'Características' }
  ];

  /* ---------- Helpers puros ---------- */

  function text(value) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  }

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

  function categoryLabel(key) {
    if (Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, key)) return CATEGORY_LABELS[key];
    return key;
  }

  function habitatKey(value) {
    var t = text(value);
    return t === null ? null : t.toLocaleLowerCase('es');
  }

  function fieldRows(species) {
    var rows = [];
    var cat = text(species && species.category);
    if (cat !== null) rows.push({ label: 'Tipo de animal', text: categoryLabel(cat) });
    FIELDS.forEach(function (field) {
      var value = species ? species[field.key] : null;
      var shown = null;
      if (field.key === 'size_cm') {
        if (typeof value === 'number' && isFinite(value)) shown = String(value) + ' cm';
        else if (text(value) !== null) shown = text(value) + ' cm';
      } else {
        shown = text(value);
      }
      if (shown !== null) rows.push({ label: field.label, text: shown });
    });
    return rows;
  }

  function countText(n) {
    return n === 1 ? '1 especie encontrada' : n + ' especies encontradas';
  }

  function sortByLabel(list) {
    return list.slice().sort(function (a, b) { return a.label.localeCompare(b.label, 'es'); });
  }

  /* ---------- DOM ---------- */

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
    var span = el('span', 'tp-placeholder');
    span.setAttribute('aria-hidden', 'true');
    span.appendChild(el('i', 'bi bi-image'));
    return span;
  }

  function buildMedia(species) {
    var media = el('div', 'tp-media');
    var url = safeImageUrl(species.image_url);
    if (url === null) {
      media.appendChild(placeholder());
      return media;
    }
    var img = el('img');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.setAttribute('alt', species.common_name);
    img.addEventListener('error', function () {
      if (img.parentNode === media) media.removeChild(img);
      media.appendChild(placeholder());
    });
    img.src = url;
    media.appendChild(img);
    return media;
  }

  function buildCard(species) {
    var card = el('article', 'animal-card');
    card.appendChild(buildMedia(species));
    var body = el('div', 'animal-card-body');
    body.appendChild(el('h3', null, species.common_name));
    var rows = fieldRows(species);
    if (rows.length > 0) {
      var details = el('div', 'tp-details');
      details.appendChild(el('p', 'tp-details-title', TEXTS.moreTitle));
      var dl = el('dl');
      rows.forEach(function (row) {
        dl.appendChild(el('dt', null, row.label));
        dl.appendChild(el('dd', null, row.text));
      });
      details.appendChild(dl);
      body.appendChild(details);
    }
    card.appendChild(body);
    return card;
  }

  function validSpecies(data) {
    var out = [];
    for (var i = 0; i < data.length; i += 1) {
      var item = data[i];
      if (item !== null && typeof item === 'object' && !Array.isArray(item) && typeof item.common_name === 'string' && item.common_name.trim() !== '') {
        out.push(item);
      }
    }
    return out;
  }

  /* ---------- Controlador de la sección ---------- */

  function controller() {
    var doc = root.document;
    var $ = function (id) { return doc.getElementById(id); };
    var grid = $('animalGrid');
    var status = $('animalStatus');
    if (!grid || !status) return null;

    var filters = $('animalFilters');
    var count = $('animalCount');
    var none = $('noAnimals');
    var selects = { species: $('speciesFilter'), habitat: $('habitatFilter'), category: $('categoryFilter') };
    var fields = { species: $('speciesFilterField'), habitat: $('habitatFilterField'), category: $('categoryFilterField') };
    var clearButton = $('clearFilters');
    var busy = false;
    var items = [];

    grid.setAttribute('tabindex', '-1');
    status.setAttribute('tabindex', '-1');

    function hide(node, value) { if (node) node.hidden = value; }

    function resetView() {
      clear(grid);
      items = [];
      hide(filters, true);
      hide(count, true);
      hide(none, true);
    }

    function showStatus(message, withRetry) {
      status.textContent = message;
      status.hidden = false;
      if (withRetry) {
        var retry = el('button', 'btn btn-outline tp-retry', TEXTS.retry);
        retry.setAttribute('type', 'button');
        retry.setAttribute('id', 'animalRetry');
        retry.addEventListener('click', function () { load({ refocus: true }); });
        status.appendChild(retry);
        return retry;
      }
      return null;
    }

    function fillSelect(select, firstLabel, options) {
      if (!select) return;
      clear(select);
      var first = el('option', null, firstLabel);
      first.value = '';
      select.appendChild(first);
      options.forEach(function (o) {
        var opt = el('option', null, o.label);
        opt.value = o.value;
        select.appendChild(opt);
      });
      select.value = '';
    }

    function buildFilters(list) {
      var seenNames = {};
      var names = [];
      var seenHabitats = {};
      var habitats = [];
      var seenTypes = {};
      var types = [];
      list.forEach(function (sp) {
        if (!Object.prototype.hasOwnProperty.call(seenNames, sp.common_name)) {
          seenNames[sp.common_name] = true;
          names.push({ value: sp.common_name, label: sp.common_name });
        }
        var hk = habitatKey(sp.habitat);
        if (hk !== null && !Object.prototype.hasOwnProperty.call(seenHabitats, hk)) {
          seenHabitats[hk] = true;
          habitats.push({ value: hk, label: text(sp.habitat) });
        }
        var cat = text(sp.category);
        if (cat !== null && !Object.prototype.hasOwnProperty.call(seenTypes, cat)) {
          seenTypes[cat] = true;
          types.push({ value: cat, label: categoryLabel(cat) });
        }
      });
      fillSelect(selects.species, 'Todas las especies', sortByLabel(names));
      fillSelect(selects.habitat, 'Todos los hábitats', sortByLabel(habitats));
      fillSelect(selects.category, 'Todos los tipos', sortByLabel(types));
      hide(fields.species, false);
      hide(fields.habitat, habitats.length === 0);
      hide(fields.category, false);
      if (selects.category) selects.category.disabled = types.length === 0;
      hide(filters, false);
    }

    function apply() {
      var species = selects.species ? selects.species.value : '';
      var habitat = selects.habitat ? selects.habitat.value : '';
      var category = selects.category ? selects.category.value : '';
      var visible = 0;
      items.forEach(function (item) {
        var match = (!species || item.data.common_name === species)
          && (!habitat || habitatKey(item.data.habitat) === habitat)
          && (!category || text(item.data.category) === category);
        item.card.hidden = !match;
        if (match) visible += 1;
      });
      if (count) {
        count.textContent = countText(visible);
        count.hidden = false;
      }
      hide(none, visible !== 0);
    }

    function render(list) {
      list.forEach(function (sp) {
        var card = buildCard(sp);
        grid.appendChild(card);
        items.push({ data: sp, card: card });
      });
      buildFilters(list);
      apply();
    }

    function load(opts) {
      if (busy) return Promise.resolve(null);
      busy = true;
      var refocus = !!(opts && opts.refocus);
      resetView();
      grid.setAttribute('aria-busy', 'true');
      showStatus(TEXTS.loading, false);
      if (refocus) status.focus();

      var request;
      try {
        request = Promise.resolve(root.ArcaApi.getSpecies());
      } catch (e) {
        request = Promise.resolve({ ok: false, reason: 'network' });
      }
      return request.catch(function () { return { ok: false, reason: 'network' }; }).then(function (result) {
        busy = false;
        grid.setAttribute('aria-busy', 'false');
        resetView();
        if (!result || !result.ok || !Array.isArray(result.data)) {
          var retry = showStatus(TEXTS.error, true);
          if (refocus && retry) retry.focus();
          return result;
        }
        var list = validSpecies(result.data);
        if (list.length === 0) {
          showStatus(TEXTS.empty, false);
          if (refocus) status.focus();
          return result;
        }
        status.hidden = true;
        render(list);
        if (refocus) grid.focus();
        return result;
      });
    }

    ['species', 'habitat', 'category'].forEach(function (name) {
      if (selects[name]) selects[name].addEventListener('change', apply);
    });
    if (clearButton) {
      clearButton.addEventListener('click', function () {
        ['species', 'habitat', 'category'].forEach(function (name) {
          if (selects[name]) selects[name].value = '';
        });
        apply();
        clearButton.focus();
      });
    }

    return { load: load };
  }

  var instance = null;

  function init() {
    if (!root.document || !root.ArcaApi) return null;
    instance = controller();
    if (instance) instance.load();
    return instance;
  }

  root.ArcaTulanpedia = {
    helpers: {
      safeImageUrl: safeImageUrl,
      categoryLabel: categoryLabel,
      habitatKey: habitatKey,
      fieldRows: fieldRows,
      countText: countText,
      sortByLabel: sortByLabel,
      CATEGORY_LABELS: CATEGORY_LABELS
    },
    init: init,
    load: function (opts) { return instance ? instance.load(opts) : Promise.resolve(null); }
  };

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(globalThis);

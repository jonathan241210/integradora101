import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const webSource = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const searchSource = readFileSync(path.join(webSource, 'js/search.js'), 'utf8');
const apiSource = readFileSync(path.join(webSource, 'js/api.js'), 'utf8');
const htmlSource = readFileSync(path.join(webSource, 'index.html'), 'utf8');
const cssSource = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
const newsEventsSource = readFileSync(path.join(webSource, 'js/news-events.js'), 'utf8');
const portalSource = readFileSync(path.join(webSource, 'script.js'), 'utf8');

function searchApi() {
  const context = { URLSearchParams, Promise, Number, Object, Array, String, Math, RegExp };
  runInNewContext(searchSource, context);
  return context.ArcaPortalSearch.helpers;
}

function response(data, meta = {}) {
  return Promise.resolve({ ok: true, data, meta });
}

function publicApi() {
  return {
    getSpecies: () => response([{ id: 1, common_name: 'Zorro del parque', category: 'mammal', habitat: 'Parque' }]),
    getNews: ({ page }) => page === 1
      ? response([{ id: 11, title: 'Parque abierto', category: 'Aviso', description: 'Visita el parque' }], { has_more: true })
      : response([{ id: 12, title: 'Sendero del parque', description: 'Nuevo sendero' }], { has_more: false }),
    getNewsItem: (id) => response({ id, content: 'El parque tiene un sendero familiar.' }),
    getEvents: () => response([{ id: 21, name: 'Día del parque', description: 'Actividad en el parque', location: 'Tulancingo', start_date: '2026-11-20' }]),
    getMemories: ({ page }) => page === 1
      ? response([{ id: 31, opinion: 'El parque fue divertido.' }], { has_more: true })
      : response([{ id: 32, opinion: 'Volveré al parque pronto.' }], { has_more: false })
  };
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.attributes = {};
    this.children = [];
    this._text = '';
    this.hidden = false;
    this.listeners = {};
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id' && this.ownerDocument && this.ownerDocument.nodes) this.ownerDocument.nodes[String(value)] = this;
  }
  getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; }
  removeAttribute(name) { delete this.attributes[name]; }
  appendChild(node) { this.children.push(node); node.parentNode = this; return node; }
  removeChild(node) { this.children.splice(this.children.indexOf(node), 1); node.parentNode = null; return node; }
  addEventListener(name, callback, capture = false) {
    const listeners = capture ? (this.captureListeners ||= {}) : this.listeners;
    (listeners[name] ||= []).push(callback);
  }
  dispatch(name, options = {}) {
    const event = {
      target: this, defaultPrevented: false, immediatePropagationStopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.immediatePropagationStopped = true; }, ...options
    };
    for (const callback of [...(this.captureListeners?.[name] || []), ...(this.listeners[name] || [])]) {
      callback(event);
      if (event.immediatePropagationStopped) break;
    }
    return event;
  }
  contains(node) { return node === this || this.children.some((child) => child.contains(node)); }
  closest(selector) {
    if (selector === 'a.search-result-link' && this.tagName === 'A' && (this.getAttribute('class') || '').split(' ').includes('search-result-link')) return this;
    if (selector === '[data-search-source]' && this.getAttribute('data-search-source') !== null) return this;
    return this.parentNode?.closest(selector) || null;
  }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  scrollIntoView() { this.scrolledIntoView = true; }
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(''); }
  set textContent(value) { this.children = []; this._text = String(value); }
}

function fakePanel() {
  const document = { nodes: {}, createElement: (tag) => new FakeElement(tag, document) };
  const panel = new FakeElement('div', document);
  return panel;
}

function fakeNewsEventsModule(kind, location, list) {
  const document = {
    readyState: 'loading',
    nodes: {},
    createElement(tag) { return new FakeElement(tag, this); },
    createTextNode(text) { const node = new FakeElement('#text', this); node.textContent = text; return node; },
    addEventListener() {},
    getElementById(id) { return this.nodes[id] || null; },
    querySelectorAll() { return [grid]; }
  };
  const grid = new FakeElement('div', document);
  grid.setAttribute('data-ne-list', kind);
  if (kind === 'news') {
    grid.setAttribute('data-ne-paged', 'true');
    grid.setAttribute('data-ne-more', 'newsMore');
    document.nodes.newsMore = new FakeElement('div', document);
  }
  const calls = [];
  const highlighted = [];
  const context = {
    document,
    location,
    URLSearchParams,
    Promise,
    Number,
    ArcaSearchTarget: { highlight: (target) => highlighted.push(target) },
    ArcaApi: {
      getNews(options) { calls.push(options.page); return response(list, { has_more: false }); },
      getNewsItem(id) { return response({ id, content: '' }); },
      getEvents() { return response(list); }
    }
  };
  runInNewContext(newsEventsSource, context);
  context.ArcaNewsEvents.init();
  return { api: context.ArcaNewsEvents, calls, document, grid, highlighted };
}

function flatten(node) {
  return [node, ...node.children.flatMap(flatten)];
}

function mountSearch(api = publicApi(), withPortal = false, beforeInit = () => {}) {
  const document = {
    readyState: 'loading', nodes: {}, listeners: {},
    createElement(tag) { return new FakeElement(tag, this); },
    getElementById(id) { return this.nodes[id] || null; },
    addEventListener: FakeElement.prototype.addEventListener,
    dispatch: FakeElement.prototype.dispatch,
    querySelector(selector) { return selector === '.map-section' ? this.nodes.mapa : null; },
    querySelectorAll(selector) { return selector === 'main section[id]' ? [this.nodes.preguntas] : []; }
  };
  for (const id of ['searchForm', 'searchInput', 'searchResults', 'preguntas', 'animales', 'mapa', 'outside', ...[...portalSource.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1])]) {
    if (document.nodes[id]) continue;
    const node = document.createElement('div');
    node.setAttribute('id', id);
    node.style = { setProperty() {} };
    node.value = '';
  }
  const form = document.nodes.searchForm;
  const input = document.nodes.searchInput;
  const panel = document.nodes.searchResults;
  form.appendChild(input);
  panel.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  const faq = document.nodes.preguntas;
  const heading = document.createElement('h2');
  heading.textContent = 'Preguntas frecuentes';
  faq.appendChild(heading);
  faq.querySelectorAll = () => [heading];
  faq.querySelector = () => heading;
  const context = {
    document, ArcaApi: api, URLSearchParams, Promise,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    setTimeout, clearTimeout
  };
  context.window = context;
  if (withPortal) runInNewContext(portalSource, context);
  runInNewContext(searchSource, context);
  beforeInit({ context, document, form, input, panel });
  const controller = context.ArcaPortalSearch.init();
  return { document, form, input, panel, controller, context };
}

async function flushSearch() {
  for (let index = 0; index < 4; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

test('test_ca01_searches_static_and_all_public_sources', async () => {
  const helpers = searchApi();
  const api = publicApi();
  const heading = { tagName: 'H2', textContent: 'Visita', innerText: 'Visita', closest: () => null };
  const paragraph = { tagName: 'P', textContent: 'Horario del parque', innerText: 'Horario del parque', closest: () => null };
  const section = { hidden: false, getAttribute: () => 'visita', querySelectorAll: () => [heading, paragraph], querySelector: () => heading };
  const staticRecords = helpers.collectStaticRecords({ querySelectorAll: () => [section] });
  const heroTitle = { tagName: 'H1', textContent: 'Inicio del zoológico', innerText: 'Inicio del zoológico' };
  const heroText = { tagName: 'P', textContent: 'Horarios y aventura', innerText: 'Horarios y aventura', closest: () => null };
  const main = { querySelectorAll: () => [heroTitle, heroText], querySelector: () => heroTitle };
  const mainRecords = helpers.collectStaticRecords({ querySelector: () => main, querySelectorAll: () => [] });
  assert.equal(mainRecords[0].url, '#inicio');
  assert.match(mainRecords[0].text, /Horarios y aventura/);
  const loaded = await helpers.loadSources(api, staticRecords, {});
  const results = helpers.matching(loaded.records, 'PARQUE');
  assert.deepEqual(new Set(results.map((result) => result.type)), new Set(['Información', 'Especies', 'Noticias', 'Eventos', 'Momentos']));
  assert.equal(api.getNews ? loaded.cache.news.items.length : 0, 2);
  assert.equal(loaded.cache.memories.items.length, 2);
  assert.equal(loaded.cache.news.items[1]._searchPage, 6);
  assert.match(loaded.cache.news.items[1].content, /sendero familiar/);
});

test('test_ca02_renders_typed_results_with_title_snippet_and_link', () => {
  const helpers = searchApi();
  const panel = fakePanel();
  helpers.render(panel, [{ type: 'Noticias', title: 'Aviso del zoológico', snippet: 'Abre el parque hoy.', url: 'noticias.html?page=2#news-3' }]);
  const nodes = flatten(panel);
  const link = nodes.find((node) => node.tagName === 'A');
  assert.equal(panel.hidden, false);
  assert.equal(nodes.find((node) => node.tagName === 'P').getAttribute('role'), 'status');
  assert.equal(link.textContent, 'Aviso del zoológico');
  assert.equal(link.getAttribute('href'), 'noticias.html?page=2#news-3');
  assert.ok(nodes.some((node) => node.tagName === 'H3' && node.textContent === 'Noticias'));
  assert.ok(nodes.some((node) => node.textContent === 'Abre el parque hoy.'));
});

test('test_ca03_announces_empty_results_and_accepts_new_query', () => {
  const helpers = searchApi();
  assert.equal(helpers.validQuery('   ').reason, 'empty');
  assert.equal(helpers.validQuery('a'.repeat(121)).reason, 'long');
  assert.equal(helpers.validQuery('tortuga').ok, true);
  assert.deepEqual(helpers.matching([], 'tortuga'), []);
  const panel = fakePanel();
  helpers.render(panel, [], { status: 'No encontramos resultados.' });
  assert.match(panel.textContent, /No encontramos resultados/);
});

test('test_ca04_deep_links_to_static_species_news_and_event', () => {
  const helpers = searchApi();
  assert.equal(helpers.toRecords('species', [{ id: 4, common_name: 'Lobo' }])[0].url, '#animal-4');
  const news = helpers.toRecords('news', [{ id: 5, title: 'Aviso', _searchPage: 3 }])[0];
  assert.equal(news.url, 'noticias.html?page=3#news-5');
  assert.equal(helpers.toRecords('events', [{ id: 6, name: 'Visita guiada' }])[0].url, 'eventos.html#event-6');
  assert.equal(helpers.toRecords('memories', [{ id: 7, opinion: 'Una gran visita' }])[0].url, '#galeria');
  assert.equal(helpers.positiveId('0'), null);
  assert.equal(helpers.positiveId('7'), 7);
});

test('test_ca04_news_and_event_pages_load_and_focus_the_linked_card', async () => {
  const news = fakeNewsEventsModule('news', { search: '?page=3', hash: '#news-5' }, [{ id: 5, title: 'Aviso' }]);
  assert.equal(news.api.requestedNewsPage(), 3);
  assert.equal(news.api.requestedCardId('news'), 5);
  assert.deepEqual(news.calls, [3]);
  await new Promise((resolve) => setImmediate(resolve));
  const newsCard = news.document.getElementById('news-5');
  assert.ok(newsCard);
  assert.equal(newsCard.getAttribute('tabindex'), '-1');
  assert.equal(news.document.activeElement, newsCard);
  assert.deepEqual(news.highlighted, [newsCard]);

  const events = fakeNewsEventsModule('events', { search: '', hash: '#event-8' }, [{ id: 8, name: 'Actividad' }]);
  await new Promise((resolve) => setImmediate(resolve));
  const eventCard = events.document.getElementById('event-8');
  assert.ok(eventCard);
  assert.equal(events.document.activeElement, eventCard);
  assert.deepEqual(events.highlighted, [eventCard]);
});

test('test_ca04_submit_with_portal_script_stays_in_place_and_result_uses_its_destination', async () => {
  const { document, form, input, panel } = mountSearch(publicApi(), true);
  input.value = 'frecuentes';
  const submit = form.dispatch('submit');
  await flushSearch();
  assert.equal(submit.defaultPrevented, true);
  assert.equal(document.nodes.animales.scrolledIntoView, undefined);
  assert.equal(panel.hidden, false);
  const link = flatten(panel).find((node) => node.tagName === 'A');
  assert.equal(link.getAttribute('href'), '#preguntas');
  const click = panel.dispatch('click', { target: link });
  assert.equal(click.defaultPrevented, false, 'el enlace conserva su navegación nativa al resultado');
  assert.equal(panel.hidden, true);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, document.nodes.preguntas);
});

test('test_ca04_submit_ignores_legacy_animal_redirects_and_cancels_pending_catalog_focus', async () => {
  let cancellations = 0;
  const { document, form, input, panel } = mountSearch(publicApi(), true, ({ form, context, document }) => {
    form.addEventListener('submit', () => document.nodes.animales.scrollIntoView());
    context.ArcaTulanpedia = { cancelInitialFocus: () => { cancellations += 1; } };
  });
  form.addEventListener('submit', () => document.nodes.animales.scrollIntoView());
  input.value = 'frecuente';
  form.dispatch('submit');
  await flushSearch();
  assert.equal(document.nodes.animales.scrolledIntoView, undefined, 'los manejadores antiguos no ejecutan el salto');
  assert.equal(cancellations, 1, 'la carga pendiente no debe reenfocar la especie anterior');
  assert.equal(flatten(panel).find((node) => node.tagName === 'A').getAttribute('href'), '#preguntas');
});

test('test_ca04_static_result_highlights_its_destination', async () => {
  const { controller, context, document, panel } = mountSearch();
  const targets = [];
  context.ArcaSearchTarget = { highlight: (target) => targets.push(target) };
  await controller.execute('frecuente');
  panel.dispatch('click', { target: flatten(panel).find((node) => node.tagName === 'A') });
  assert.deepEqual(targets, [document.nodes.preguntas]);
});

test('test_ca04_all_pages_load_current_navigation_and_shared_highlight', () => {
  for (const page of ['index.html', 'noticias.html', 'eventos.html']) {
    const html = readFileSync(path.join(webSource, page), 'utf8');
    assert.match(html, /href="styles\.css\?v=web-012-4"/);
    assert.match(html, /src="js\/search-target\.js\?v=web-012-3"/);
    assert.match(html, /src="js\/news-events\.js\?v=web-012-3"/);
    assert.ok(html.indexOf('js/search-target.js') < html.indexOf('js/news-events.js'));
  }
  for (const script of ['script.js', 'js/animals.js']) {
    assert.ok(htmlSource.includes('src="' + script + '?v=web-012-3"'));
  }
  assert.ok(htmlSource.includes('src="js/search.js?v=web-012-4"'));
});

test('test_ca04_news_after_first_ten_records_links_to_the_page_containing_the_card', async () => {
  const helpers = searchApi();
  const newsItems = Array.from({ length: 53 }, (_, index) => ({ id: index + 1, title: 'Noticia ' + (index + 1) }));
  const requests = [];
  const api = publicApi();
  api.getNews = ({ page, limit }) => {
    requests.push({ page, limit });
    const start = (page - 1) * limit;
    return response(newsItems.slice(start, start + limit), { has_more: start + limit < newsItems.length });
  };
  api.getNewsItem = (id) => response({ id, content: 'Contenido de noticia ' + id });
  const loaded = await helpers.loadSources(api, [], {});
  assert.deepEqual(requests, [{ page: 1, limit: 50 }, { page: 2, limit: 50 }]);
  for (const id of [11, 50, 51, 53]) {
    const result = loaded.records.find((record) => record.type === 'Noticias' && record.title === 'Noticia ' + id);
    const url = new URL(result.url, 'https://portal.example/');
    const page = Number(url.searchParams.get('page'));
    const pageItems = newsItems.slice((page - 1) * 10, page * 10);
    const listing = fakeNewsEventsModule('news', url, pageItems);
    await flushSearch();
    assert.equal(page, Math.ceil(id / 10));
    assert.equal(listing.document.activeElement, listing.document.getElementById('news-' + id));
    assert.ok(listing.document.activeElement);
  }
});

test('test_ca04_species_link_locates_card_again_when_hash_is_unchanged', async () => {
  const { controller, context, panel } = mountSearch();
  const focused = [];
  context.location = { hash: '#animal-1' };
  context.ArcaTulanpedia = { focusCard: (id) => focused.push(id) };
  for (let count = 0; count < 2; count += 1) {
    await controller.execute('Zorro');
    const link = flatten(panel).find((node) => node.tagName === 'A');
    assert.equal(link.getAttribute('href'), '#animal-1');
    panel.dispatch('click', { target: link });
    assert.equal(panel.hidden, true);
  }
  assert.deepEqual(focused, ['1', '1']);
});

test('test_ca05_keyboard_and_screen_reader_accessible_results', () => {
  const inputMarkup = htmlSource.match(/<input type="search" id="searchInput"[^>]*>/)?.[0] || '';
  assert.match(inputMarkup, /aria-label="Buscar en todo el portal"/);
  assert.match(inputMarkup, /aria-controls="searchResults"/);
  assert.match(inputMarkup, /aria-expanded="false"/);
  assert.match(htmlSource, /class="search-submit" type="submit" aria-label="Buscar en el portal"/);
  assert.match(htmlSource, /<script src="js\/search\.js(?:\?[^"\s]*)?" defer><\/script>/);
  assert.match(htmlSource, /id="searchResults" role="region" aria-label="Resultados de búsqueda" hidden/);
  assert.match(searchSource, /event\.key === 'Escape'/);
  assert.match(cssSource, /\.search-panel a:focus-visible/);
  assert.match(cssSource, /\.search-panel button:focus-visible/);
  assert.match(cssSource, /\.search-target-highlight\s*\{[^}]*outline: 3px solid var\(--primary\)/);
  assert.match(cssSource, /@media\s*\(prefers-reduced-motion: reduce\)\s*\{\s*\.search-target-highlight\s*\{\s*animation: none;/);
  assert.match(cssSource, /animation: search-target-pulse 900ms ease-in-out 2;/);
});

test('test_ca05_outside_click_closes_panel_without_stealing_focus_and_inside_click_keeps_it_open', async () => {
  const { controller, document, input, panel } = mountSearch();
  await controller.execute('parque');
  document.dispatch('click', { target: input });
  assert.equal(panel.hidden, false);
  document.dispatch('click', { target: panel.firstChild });
  assert.equal(panel.hidden, false);
  document.nodes.outside.focus();
  document.dispatch('click', { target: document.nodes.outside });
  assert.equal(panel.hidden, true);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, document.nodes.outside);
});

test('test_ca05_escape_from_result_or_input_closes_panel_and_returns_focus', async () => {
  const { controller, document, input, panel } = mountSearch();
  for (const source of [panel, input]) {
    await controller.execute('parque');
    const link = flatten(panel).find((node) => node.tagName === 'A');
    link.focus();
    const event = source.dispatch('keydown', { key: 'Escape', target: source === panel ? link : input });
    assert.equal(event.defaultPrevented, true);
    assert.equal(panel.hidden, true);
    assert.equal(document.activeElement, input);
    assert.equal(input.getAttribute('aria-expanded'), 'false');
  }
});

test('test_ca05_closing_during_loading_or_retry_does_not_reopen_panel', async () => {
  let resolveSpecies;
  const api = publicApi();
  api.getSpecies = () => new Promise((resolve) => { resolveSpecies = resolve; });
  const { controller, document, input, panel } = mountSearch(api);
  const pending = controller.execute('parque');
  await flushSearch();
  document.dispatch('click', { target: document.nodes.outside });
  resolveSpecies({ ok: false });
  await pending;
  assert.equal(panel.hidden, true);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  api.getSpecies = () => Promise.resolve({ ok: false });
  await controller.execute('parque');
  const retry = flatten(panel).find((node) => node.getAttribute('data-search-source') === 'species');
  assert.ok(retry);
  api.getSpecies = () => new Promise((resolve) => { resolveSpecies = resolve; });
  panel.dispatch('click', { target: retry });
  document.dispatch('click', { target: retry, composedPath: () => [retry, panel, document] });
  assert.equal(panel.hidden, false, 'el clic en Reintentar sigue siendo interior aunque se sustituya su botón');
  await flushSearch();
  document.dispatch('click', { target: document.nodes.outside });
  resolveSpecies({ ok: true, data: [] });
  await flushSearch();
  assert.equal(panel.hidden, true);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
});

test('test_ca06_get_memories_passes_page_and_limit_without_credentials', async () => {
  let requestedUrl = '';
  let requestedOptions = null;
  const context = {
    document: { querySelector: () => ({ getAttribute: () => 'https://api.example/api/v1' }) },
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: (url, options) => {
      requestedUrl = url;
      requestedOptions = options;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    }
  };
  runInNewContext(apiSource, context);
  await context.ArcaApi.getMemories({ page: 2, limit: 50 });
  assert.equal(requestedUrl, 'https://api.example/api/v1/memories?page=2&limit=50');
  assert.equal(requestedOptions.credentials, 'omit');
  assert.equal(requestedOptions.headers.Accept, 'application/json');
  assert.equal(requestedOptions.headers.Authorization, undefined);
});

test('test_ca06_only_public_data_and_query_stays_local', async () => {
  const helpers = searchApi();
  const calls = [];
  const api = {
    getSpecies: () => { calls.push('species'); return response([{ id: 1, common_name: 'Ocelote', private_note: 'secreto' }]); },
    getNews: () => { calls.push('news'); return response([{ id: 2, title: 'Ocelote', author_email: 'privado' }]); },
    getNewsItem: () => { calls.push('news-detail'); return response({ id: 2, content: 'Ocelote' }); },
    getEvents: () => { calls.push('events'); return response([]); },
    getMemories: () => { calls.push('memories'); return response([]); }
  };
  const loaded = await helpers.loadSources(api, [], {});
  assert.equal(helpers.matching(loaded.records, 'correo-secreto').length, 0);
  assert.deepEqual(calls.sort(), ['events', 'memories', 'news', 'news-detail', 'species']);
  assert.doesNotMatch(searchSource, /\bfetch\s*\(|localStorage|sessionStorage|document\.cookie|Authorization|credentials/);
  assert.doesNotMatch(searchSource, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(apiSource, /credentials:\s*'omit'/);
  assert.match(apiSource, /headers:\s*\{\s*Accept:\s*'application\/json'/);
  const unsafeTitle = '<img src=x onerror=alert(1)>';
  const unsafePanel = fakePanel();
  helpers.render(unsafePanel, [{ type: 'Noticias', title: unsafeTitle, snippet: unsafeTitle, url: 'noticias.html' }]);
  assert.equal(flatten(unsafePanel).some((node) => node.tagName === 'IMG'), false);
  assert.equal(flatten(unsafePanel).find((node) => node.tagName === 'A').textContent, unsafeTitle);

});

test('test_ca07_empty_query_and_partial_or_total_source_failures', async () => {
  const helpers = searchApi();
  const counts = { species: 0, news: 0, events: 0, memories: 0 };
  const partialApi = {
    getSpecies: () => { counts.species += 1; return response([{ id: 1, common_name: 'Puma' }]); },
    getNews: () => { counts.news += 1; return response([{ id: 2, title: 'Aviso' }]); },
    getNewsItem: () => Promise.resolve({ ok: false, reason: 'http' }),
    getEvents: () => { counts.events += 1; return Promise.resolve({ ok: false, reason: 'http' }); },
    getMemories: () => { counts.memories += 1; return Promise.resolve({ ok: false, reason: 'network' }); }
  };
  const partial = await helpers.loadSources(partialApi, [], {});
  assert.ok(partial.records.some((record) => record.type === 'Especies'));
  assert.ok(partial.errors.includes('events'));
  assert.ok(partial.errors.includes('memories'));
  assert.ok(partial.errors.includes('news'));
  const panel = fakePanel();
  helpers.render(panel, helpers.matching(partial.records, 'puma'), { errors: partial.errors, status: 'No pudimos consultar las fuentes.' });
  assert.match(panel.textContent, /No pudimos consultar/);
  assert.ok(flatten(panel).filter((node) => node.getAttribute('data-search-source')).length >= 3);
  await helpers.loadSources(partialApi, [], partial.cache, ['events']);
  assert.equal(counts.events, 2);
  assert.equal(counts.species, 1);

  const fail = () => Promise.resolve({ ok: false, reason: 'network' });
  const total = await helpers.loadSources({ getSpecies: fail, getNews: fail, getNewsItem: fail, getEvents: fail, getMemories: fail }, [], {});
  assert.deepEqual(new Set(total.errors), new Set(['species', 'news', 'events', 'memories']));
});

test('test_ca07_concurrent_submission_uses_latest_valid_query', async () => {
  let resolveSpecies;
  let speciesCalls = 0;
  const api = publicApi();
  api.getSpecies = () => {
    speciesCalls += 1;
    return new Promise((resolve) => { resolveSpecies = resolve; });
  };
  api.getNewsItem = (id) => response({ id, content: 'Texto de contexto.' });
  const { controller, panel } = mountSearch(api);

  const pending = controller.execute('parque');
  await flushSearch();
  await controller.execute('sendero');
  resolveSpecies({ ok: true, data: [{ id: 1, common_name: 'Zorro del parque' }] });
  await pending;

  assert.equal(speciesCalls, 1, 'la segunda consulta reutiliza la carga en curso');
  assert.ok(panel.textContent.includes('Sendero del parque'));
  assert.ok(!panel.textContent.includes('Zorro del parque'));
  assert.ok(!panel.textContent.includes('Parque abierto'));
});

test('test_ca07_empty_submission_during_load_keeps_empty_query_message', async () => {
  let resolveSpecies;
  const api = publicApi();
  api.getSpecies = () => new Promise((resolve) => { resolveSpecies = resolve; });
  const { controller, panel } = mountSearch(api);

  const pending = controller.execute('parque');
  await flushSearch();
  await controller.execute('');
  assert.ok(panel.textContent.includes('Escribe una palabra o frase para buscar.'));

  resolveSpecies({ ok: true, data: [{ id: 1, common_name: 'Zorro del parque' }] });
  await pending;

  assert.ok(panel.textContent.includes('Escribe una palabra o frase para buscar.'));
  assert.equal(flatten(panel).filter((node) => node.tagName === 'A').length, 0);
});

test('test_ca08_every_acceptance_criterion_has_named_automated_test', () => {
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  for (let index = 1; index <= 7; index += 1) {
    assert.match(source, new RegExp('test_ca0' + index + '_'));
  }
});

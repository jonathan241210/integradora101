import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (d) => d.slice(1)));
const src = path.resolve(here, '..');
const read = (file) => readFileSync(path.join(src, file), 'utf8');
const apiJs = read('js/api.js');
const neJs = read('js/news-events.js');
const css = read('news-events.css');
const pages = { 'index.html': read('index.html'), 'noticias.html': read('noticias.html'), 'eventos.html': read('eventos.html') };

/* ---------- DOM simulado ---------- */
class TextNode {
  constructor(text) { this.nodeType = 3; this.data = text; this.parentNode = null; }
  get textContent() { return this.data; }
}
class FakeElement {
  constructor(tagName, doc) {
    this.nodeType = 1; this.tagName = tagName.toUpperCase(); this.doc = doc;
    this.attrs = new Map(); this.children = []; this.parentNode = null; this.listeners = new Map();
    this.hidden = false; this.disabled = false;
  }
  get firstChild() { return this.children[0] ?? null; }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  removeChild(node) { this.children = this.children.filter((c) => c !== node); node.parentNode = null; return node; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  removeAttribute(name) { this.attrs.delete(name); }
  hasAttribute(name) { return this.attrs.has(name); }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  dispatch(type) { this.listeners.get(type)?.({ type, target: this }); }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.doc.activeElement = this; }
  set textContent(value) {
    this.children = [];
    if (value !== '' && value != null) this.appendChild(new TextNode(String(value)));
  }
  get textContent() { return this.children.map((c) => c.textContent).join(''); }
  matches(selector) {
    return selector.split(',').some((part) => {
      const sel = part.trim();
      const cls = sel.match(/^\.([\w-]+)$/);
      if (cls) return (this.getAttribute('class') || '').split(/\s+/).includes(cls[1]);
      const attr = sel.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
      if (attr) return attr[2] === undefined ? this.hasAttribute(attr[1]) : this.getAttribute(attr[1]) === attr[2];
      const meta = sel.match(/^meta\[name="([^"]+)"\]$/);
      if (meta) return this.tagName === 'META' && this.getAttribute('name') === meta[1];
      return false;
    });
  }
  querySelectorAll(selector) {
    const out = [];
    const walk = (node) => node.children.forEach((c) => {
      if (c.nodeType !== 1) return;
      if (c.matches(selector)) out.push(c);
      walk(c);
    });
    walk(this);
    return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  all() { return this.querySelectorAll('[class],[role],[type],[src],[href]').concat(this.querySelectorAll('*')); }
}
function tree(node, out = []) {
  node.children.forEach((c) => { if (c.nodeType === 1) { out.push(c); tree(c, out); } });
  return out;
}
const byTag = (node, tag) => tree(node).filter((n) => n.tagName === tag.toUpperCase());
const byClass = (node, cls) => tree(node).filter((n) => (n.getAttribute('class') || '').split(/\s+/).includes(cls));
const byRole = (node, role) => tree(node).filter((n) => n.getAttribute('role') === role);

function makeDocument(base) {
  const doc = {
    readyState: 'complete', activeElement: null, byId: new Map(), lists: [],
    createElement: (tag) => new FakeElement(tag, doc),
    createTextNode: (text) => new TextNode(text),
    addEventListener() {},
    getElementById: (id) => doc.byId.get(id) ?? null,
    querySelector(selector) {
      if (selector === 'meta[name="arca-api-base"]' && base !== undefined) {
        const meta = new FakeElement('meta', doc);
        meta.setAttribute('name', 'arca-api-base');
        meta.setAttribute('content', base);
        return meta;
      }
      return null;
    },
    querySelectorAll(selector) { return selector === '[data-ne-list]' ? doc.lists : []; },
    addList(attrs, id) {
      const el = new FakeElement('div', doc);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      if (id) doc.byId.set(id, el);
      doc.lists.push(el);
      return el;
    }
  };
  return doc;
}

const flush = async () => { for (let i = 0; i < 12; i += 1) await new Promise((r) => setImmediate(r)); };

function json(body, ok = true) { return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }); }

function mount({ base = 'http://localhost:8000/api/v1', fetchImpl, timers } = {}) {
  const doc = makeDocument(base === null ? undefined : base);
  const calls = [];
  const sandbox = {
    document: doc, URLSearchParams, AbortController, console,
    setTimeout: timers?.setTimeout ?? setTimeout, clearTimeout: timers?.clearTimeout ?? clearTimeout,
    fetch: (url, opts) => { calls.push({ url, opts }); return fetchImpl(url, opts); }
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(apiJs, ctx);
  const ne = () => vm.runInContext(neJs, ctx);
  return { doc, calls, ctx, run: ne, api: ctx.ArcaApi, ne: () => ctx.ArcaNewsEvents };
}

const news = (n, extra = {}) => ({ id: n, title: `Noticia ${n}`, description: `Descripción ${n}`, category: 'Aviso', published_date: '2026-11-07', start_date: null, end_date: null, image_url: null, ...extra });
const event = (n, extra = {}) => ({ id: n, name: `Evento ${n}`, description: `Desc ${n}`, image_url: null, start_date: '2026-10-22', end_date: '2026-10-29', start_time: '10:00:00', end_time: '12:30:00', location: `Plaza ${n}`, ...extra });
const route = (map) => (url) => {
  for (const [key, handler] of Object.entries(map)) if (url.includes(key)) return handler(url);
  return json({}, false);
};

/* ---------- CA-01 / CA-02 ---------- */
test('CA-01 dynamic-news-events: la portada muestra hasta tres noticias en orden y sin contenido de muestra', async () => {
  const m = mount({ fetchImpl: route({ '/news/': () => json({ data: { ...news(1), content: 'Texto' } }), '/news': () => json({ data: [news(3), news(2), news(1)], meta: {} }) }) });
  const grid = m.doc.addList({ 'data-ne-list': 'news', 'data-ne-limit': '3' });
  m.run();
  await flush();
  const cards = byTag(grid, 'article');
  assert.equal(cards.length, 3);
  assert.deepEqual(byTag(grid, 'h3').map((h) => h.textContent), ['Noticia 3', 'Noticia 2', 'Noticia 1']);
  assert.equal(byClass(cards[0], 'news-date')[0].textContent.trim(), 'Aviso');
  assert.equal(byTag(cards[0], 'time')[0].textContent, '7 de noviembre de 2026');
  assert.match(cards[0].textContent, /Descripción 3/);
  assert.equal(byTag(cards[0], 'button').length, 0, 'sin botón de contenido');
  assert.match(m.calls[0].url, /\/news\?limit=3$/);
  const index = pages['index.html'];
  assert.match(index, /<div class="news-grid"[^>]*data-ne-list="news"[^>]*data-ne-limit="3"/);
  assert.doesNotMatch(index, /contenido de muestra|Pequeñas acciones, grandes cambios|Nuevas actividades para descubrir/);
  assert.match(index, /href="noticias\.html"/);
});

test('CA-02 dynamic-news-events: la portada muestra hasta dos eventos con fechas, horario y ubicación', async () => {
  const m = mount({ fetchImpl: route({ '/events': () => json({ data: [event(1), event(2)] }) }) });
  const grid = m.doc.addList({ 'data-ne-list': 'events', 'data-ne-limit': '2' });
  m.run();
  await flush();
  const cards = byTag(grid, 'article');
  assert.equal(cards.length, 2);
  const text = cards[0].textContent;
  assert.match(text, /Evento 1/);
  assert.match(text, /del 22 al 29 de octubre de 2026/);
  assert.match(text, /10:00–12:30 hrs/);
  assert.match(text, /Plaza 1/);
  assert.match(text, /Desc 1/);
  assert.equal(byTag(cards[0], 'button').length, 0);
  assert.match(m.calls[0].url, /\/events\?limit=2$/);
  const index = pages['index.html'];
  assert.match(index, /<div class="event-grid"[^>]*data-ne-list="events"[^>]*data-ne-limit="2"/);
  assert.doesNotMatch(index, /Actividades de ejemplo|Exploradores de la naturaleza|Guardianes de los hábitats/);
  assert.match(index, /href="eventos\.html"/);
});

/* ---------- CA-03 a CA-05 ---------- */
test('CA-03 dynamic-news-events: muestra estado de carga con role=status y aria-busy hasta terminar', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const m = mount({ fetchImpl: () => gate });
  const grid = m.doc.addList({ 'data-ne-list': 'news', 'data-ne-limit': '3' });
  const grid2 = m.doc.addList({ 'data-ne-list': 'events', 'data-ne-limit': '3' });
  m.run();
  await flush();
  assert.equal(grid.getAttribute('aria-busy'), 'true');
  assert.equal(byRole(grid, 'status')[0].textContent, 'Cargando noticias…');
  assert.equal(byRole(grid2, 'status')[0].textContent, 'Cargando eventos…');
  release({ ok: true, json: () => Promise.resolve({ data: [news(1)], meta: {} }) });
  await flush();
  assert.equal(grid.hasAttribute('aria-busy'), false);
  assert.equal(byClass(grid, 'ne-state').length, 0);
});

test('CA-04 dynamic-news-events: respuesta vacía muestra el texto de vacío sin tarjetas', async () => {
  const m = mount({ fetchImpl: () => json({ data: [], meta: {} }) });
  const n = m.doc.addList({ 'data-ne-list': 'news', 'data-ne-limit': '3' });
  const e = m.doc.addList({ 'data-ne-list': 'events', 'data-ne-limit': '3' });
  m.run();
  await flush();
  assert.equal(byRole(n, 'status')[0].textContent, 'Aún no hay noticias publicadas');
  assert.equal(byRole(e, 'status')[0].textContent, 'Aún no hay eventos vigentes');
  assert.equal(byTag(n, 'article').length + byTag(e, 'article').length, 0);
});

const failures = {
  'red caída': () => Promise.reject(new TypeError('network')),
  'HTTP 500': () => json({}, false),
  'JSON inválido': () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('x')) }),
  'data ausente': () => json({ meta: {} })
};

test('CA-05 dynamic-news-events: los fallos muestran error en español sin datos previos ni excepciones', async () => {
  for (const [label, fail] of Object.entries(failures)) {
    const m = mount({ fetchImpl: fail });
    const n = m.doc.addList({ 'data-ne-list': 'news', 'data-ne-limit': '3' });
    const e = m.doc.addList({ 'data-ne-list': 'events' });
    m.run();
    await flush();
    assert.equal(byRole(n, 'status')[0].textContent, 'No pudimos cargar las noticias. Inténtalo más tarde.', label);
    assert.equal(byRole(e, 'status')[0].textContent, 'No pudimos cargar los eventos. Inténtalo más tarde.', label);
    assert.equal(byTag(n, 'article').length, 0, label);
    assert.equal(n.hasAttribute('aria-busy'), false, label);
    assert.doesNotMatch(n.textContent, /TypeError|SyntaxError|500/);
  }
});

async function retryScenario(attrs, kind, item, moreId) {
  let fail = true;
  const body = kind === 'news' ? { data: [item(1), item(2)], meta: { has_more: false } } : { data: [item(1), item(2)] };
  const m = mount({ fetchImpl: (url) => (fail ? json({}, false) : /\/news\/\d+$/.test(url) ? json({ data: { ...item(1), content: 'Texto' } }) : json(body)) });
  const grid = m.doc.addList(attrs, null);
  if (moreId) m.doc.byId.set(moreId, new FakeElement('div', m.doc));
  m.run();
  await flush();
  assert.equal(byTag(grid, 'button').length, 1, 'hay botón Reintentar');
  const retry = byClass(grid, 'ne-retry')[0];
  assert.equal(retry.textContent, 'Reintentar');
  fail = false;
  retry.click();
  assert.equal(byRole(grid, 'status')[0].textContent, kind === 'news' ? 'Cargando noticias…' : 'Cargando eventos…');
  assert.equal(grid.getAttribute('aria-busy'), 'true');
  assert.equal(m.doc.activeElement.getAttribute('role'), 'status', 'el foco se mueve al estado de carga');
  await flush();
  assert.equal(m.calls.filter((c) => !/\/news\/\d+$/.test(c.url)).length, 2);
  assert.equal(byTag(grid, 'article').length, 2, 'sin tarjetas duplicadas');
  assert.equal(byClass(grid, 'ne-retry').length, 0);
  assert.equal(m.doc.activeElement, grid, 'el foco queda en el contenedor con contenido');
  fail = true;
  return m;
}

test('CA-05 dynamic-news-events: «Reintentar» vuelve a pedir y sustituye el error en portada, noticias.html y eventos.html', async () => {
  await retryScenario({ 'data-ne-list': 'news', 'data-ne-limit': '3' }, 'news', news);
  await retryScenario({ 'data-ne-list': 'events', 'data-ne-limit': '3' }, 'events', event);
  await retryScenario({ 'data-ne-list': 'news', 'data-ne-paged': 'true', 'data-ne-more': 'more' }, 'news', news, 'more');
  await retryScenario({ 'data-ne-list': 'events' }, 'events', event);
  // un segundo fallo deja de nuevo el botón y devuelve el foco a él
  const m = mount({ fetchImpl: () => json({}, false) });
  const grid = m.doc.addList({ 'data-ne-list': 'events' });
  m.run();
  await flush();
  byClass(grid, 'ne-retry')[0].click();
  await flush();
  assert.equal(byClass(grid, 'ne-retry').length, 1);
  assert.equal(m.doc.activeElement, byClass(grid, 'ne-retry')[0]);
  assert.equal(m.calls.length, 2);
});

/* ---------- CA-06 a CA-08 ---------- */
test('CA-06 dynamic-news-events: el HTML de la API se muestra como texto y no se usan APIs inseguras', async () => {
  const evil = '<img src=x onerror=alert(1)>';
  const m = mount({
    fetchImpl: route({
      '/news/7': () => json({ data: { ...news(7), content: evil } }),
      '/news': () => json({ data: [news(7, { title: evil, description: evil, category: evil })], meta: {} }),
      '/events': () => json({ data: [event(1, { name: evil, location: evil, description: evil })] })
    })
  });
  const n = m.doc.addList({ 'data-ne-list': 'news' });
  const e = m.doc.addList({ 'data-ne-list': 'events' });
  m.run();
  await flush();
  assert.equal(byTag(n, 'h3')[0].textContent, evil);
  assert.equal(byTag(e, 'h3')[0].textContent, evil);
  assert.equal(byClass(n, 'ne-content')[0].textContent, evil);
  for (const root of [n, e]) {
    assert.equal(byTag(root, 'img').length, 0);
    assert.equal(byTag(root, 'script').length, 0);
  }
  for (const code of [apiJs, neJs]) {
    assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function/);
  }
});

test('CA-07 dynamic-news-events: imágenes con atributos seguros y placeholder de respaldo', async () => {
  const items = [
    news(1, { image_url: 'https://cdn.test/a.jpg' }),
    news(2, { image_url: 'javascript:alert(1)' }),
    news(3, { image_url: 'data:text/html;base64,AAAA' }),
    news(4, { image_url: null }),
    news(5, { image_url: '/storage/b.png' }),
    news(6, { image_url: '//evil.test/x.png' })
  ];
  const m = mount({ fetchImpl: () => json({ data: items, meta: {} }) });
  const grid = m.doc.addList({ 'data-ne-list': 'news' });
  m.run();
  await flush();
  const cards = byTag(grid, 'article');
  const img = byTag(cards[0], 'img')[0];
  assert.equal(img.getAttribute('src'), 'https://cdn.test/a.jpg');
  assert.equal(img.getAttribute('loading'), 'lazy');
  assert.equal(img.getAttribute('decoding'), 'async');
  assert.equal(img.getAttribute('alt'), 'Noticia 1');
  for (const i of [1, 2, 3, 5]) {
    assert.equal(byTag(cards[i], 'img').length, 0);
    assert.equal(byClass(cards[i], 'ne-placeholder')[0].getAttribute('aria-hidden'), 'true');
  }
  assert.equal(byTag(cards[4], 'img')[0].getAttribute('src'), '/storage/b.png');
  img.dispatch('error');
  assert.equal(byTag(cards[0], 'img').length, 0);
  assert.equal(byClass(cards[0], 'ne-placeholder').length, 1);
});

test('CA-08 dynamic-news-events: fechas en español sin desplazamiento y fechas inválidas omitidas', () => {
  const m = mount({ fetchImpl: () => json({}) });
  m.run();
  const ne = m.ne();
  assert.equal(ne.formatSpanishDate('2026-11-07'), '7 de noviembre de 2026');
  assert.equal(ne.formatSpanishDate('2026-01-01'), '1 de enero de 2026');
  assert.equal(ne.formatEventRange('2026-10-22', '2026-10-29'), 'del 22 al 29 de octubre de 2026');
  assert.equal(ne.formatEventRange('2026-10-30', '2026-11-02'), 'del 30 de octubre de 2026 al 2 de noviembre de 2026');
  assert.equal(ne.formatEventRange('2026-10-22', null), '22 de octubre de 2026');
  assert.equal(ne.formatEventRange('2026-10-22', '2026-10-22'), '22 de octubre de 2026');
  for (const bad of ['2026-02-30', 'texto', '', null, undefined, '2026-13-01', '2026-11-7']) {
    assert.equal(ne.formatSpanishDate(bad), '');
    assert.equal(ne.formatEventRange(bad, null), '');
  }
  assert.doesNotMatch(neJs, /new Date|Intl\./);
});

/* ---------- CA-09 ---------- */
test('CA-09 dynamic-news-events: api.js es el único módulo de red, sin sesión, con base configurable y límite de 10 s', async () => {
  assert.match(apiJs, /credentials:\s*'omit'/);
  assert.match(apiJs, /Accept:\s*'application\/json'/);
  assert.doesNotMatch(apiJs, /authorization|csrf|xsrf/i);
  assert.match(apiJs, /TIMEOUT_MS = 10000/);
  assert.doesNotMatch(neJs, /\bfetch\b|XMLHttpRequest/);
  for (const html of Object.values(pages)) assert.doesNotMatch(html, /\bfetch\s*\(/);

  const ok = () => json({ data: [], meta: {} });
  let m = mount({ base: 'http://localhost:8000/api/v1/', fetchImpl: ok });
  await m.api.getNews({ page: 2, limit: 10 });
  assert.equal(m.calls[0].url, 'http://localhost:8000/api/v1/news?page=2&limit=10');
  assert.equal(m.calls[0].opts.credentials, 'omit');
  assert.equal(m.calls[0].opts.headers.Accept, 'application/json');
  assert.deepEqual(Object.keys(m.calls[0].opts.headers), ['Accept']);

  for (const base of ['', null]) {
    m = mount({ base, fetchImpl: ok });
    await m.api.getEvents({});
    assert.equal(m.calls[0].url, '/api/v1/events');
  }

  m = mount({ fetchImpl: () => json({ data: { id: 5, content: 'x' } }) });
  for (const bad of ['abc', '0', '1.5', -3, '', null, undefined, '01', '5; DROP']) {
    assert.deepEqual({ ...(await m.api.getNewsItem(bad)) }, { ok: false, reason: 'bad-id' });
  }
  assert.equal(m.calls.length, 0);
  const item = await m.api.getNewsItem(5);
  assert.equal(item.ok, true);
  assert.match(m.calls[0].url, /\/news\/5$/);

  // tiempo máximo: el temporizador de 10 s aborta la petición
  let scheduled = null;
  const timers = { setTimeout: (fn, ms) => { scheduled = { fn, ms }; return 1; }, clearTimeout() {} };
  m = mount({ timers, fetchImpl: (url, opts) => new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(new Error('abort')))) });
  const pending = m.api.getNews({});
  await flush();
  assert.equal(scheduled.ms, 10000);
  scheduled.fn();
  assert.deepEqual({ ...(await pending) }, { ok: false, reason: 'timeout' });
});

/* ---------- CA-10 ---------- */
test('CA-10 dynamic-news-events: listados con «Ver todas», paginación y lista completa de eventos', async () => {
  assert.match(pages['index.html'], /href="noticias\.html"/);
  assert.match(pages['index.html'], /href="eventos\.html"/);
  assert.match(pages['noticias.html'], /data-ne-list="news"[^>]*data-ne-paged="true"/);
  assert.match(pages['eventos.html'], /data-ne-list="events"/);
  assert.doesNotMatch(pages['eventos.html'], /data-ne-limit/);

  let failNext = false;
  const m = mount({
    fetchImpl: (url) => {
      const page = Number(new URL(url, 'http://x').searchParams.get('page'));
      if (page === 2 && failNext) return json({}, false);
      return json({ data: [news(page * 10 + 1), news(page * 10 + 2)], meta: { has_more: page < 3 } });
    }
  });
  const grid = m.doc.addList({ 'data-ne-list': 'news', 'data-ne-paged': 'true', 'data-ne-more': 'more' });
  const more = new FakeElement('div', m.doc);
  m.doc.byId.set('more', more);
  m.run();
  await flush();
  assert.match(m.calls[0].url, /news\?page=1&limit=10$/);
  assert.equal(byTag(grid, 'article').length, 2);
  assert.equal(m.calls.filter((c) => /\/news\/\d+$/.test(c.url)).length, 2, 'una petición de detalle por tarjeta');
  const button = byClass(more, 'ne-more-btn')[0];
  assert.equal(button.textContent, 'Cargar más');

  failNext = true;
  button.click();
  await flush();
  assert.equal(byTag(grid, 'article').length, 2, 'si falla la página siguiente se conserva lo mostrado');
  assert.equal(byRole(more, 'status')[0].textContent, 'No pudimos cargar las noticias. Inténtalo más tarde.');
  assert.equal(byClass(more, 'ne-more-btn').length, 1);

  failNext = false;
  byClass(more, 'ne-more-btn')[0].click();
  await flush();
  assert.match(m.calls.filter((c) => /page=/.test(c.url)).at(-1).url, /page=2&limit=10$/);
  assert.equal(byTag(grid, 'article').length, 4);
  assert.deepEqual(byTag(grid, 'h3').map((h) => h.textContent).slice(0, 2), ['Noticia 11', 'Noticia 12']);
  assert.equal(byRole(more, 'status').length, 0);

  byClass(more, 'ne-more-btn')[0].click();
  await flush();
  assert.equal(byTag(grid, 'article').length, 6);
  assert.equal(byClass(more, 'ne-more-btn').length, 0, 'sin has_more no hay «Cargar más»');

  const e = mount({ fetchImpl: () => json({ data: [event(1), event(2), event(3), event(4)] }) });
  const eg = e.doc.addList({ 'data-ne-list': 'events' });
  e.run();
  await flush();
  assert.equal(e.calls[0].url, 'http://localhost:8000/api/v1/events');
  assert.equal(byTag(eg, 'article').length, 4);
});

/* ---------- CA-11 ---------- */
test('CA-11 dynamic-news-events: index.html conserva identificadores, secciones y scripts existentes', () => {
  const index = pages['index.html'];
  for (const id of ['inicio', 'mainNav', 'menuToggle', 'searchForm', 'searchInput', 'mapa', 'noticias', 'eventos', 'boletos', 'contactForm', 'contactName', 'contactEmail', 'contactMessage', 'cognitiveLauncher', 'cognitivePanel', 'visita']) {
    assert.match(index, new RegExp(`id="${id}"`), `falta id ${id}`);
  }
  for (const script of ['script.js', 'animations.js', 'accessibility.js', 'js/api.js', 'js/news-events.js']) {
    assert.match(index, new RegExp(`<script src="${script.replace('.', '\\.')}" defer></script>`));
  }
  assert.match(index, /href="news-events\.css"/);
  assert.match(index, /href="#noticias"/);
  assert.match(index, /href="#eventos"/);
});

/* ---------- CA-12 ---------- */
test('CA-12 dynamic-news-events: reglas CSS de adaptación, foco visible y estados', () => {
  assert.match(css, /max-width:\s*100%/);
  assert.doesNotMatch(css, /ne-toggle|ne-expand/);
  assert.match(css, /\.ne-retry:focus-visible/);
  assert.match(css, /\.ne-more-btn:focus-visible/);
  assert.match(css, /\.ne-all-link:focus-visible/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /\.ne-state/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(css, /(^|[\s;{])width:\s*\d{3,}px/m);
  // los estados llevan role=status y los encabezados mantienen h2 > h3
  assert.match(neJs, /setAttribute\('role', 'status'\)/);
  assert.match(neJs, /el\('h3'/);
  for (const html of Object.values(pages).slice(1)) assert.match(html, /<h2>/);
});

/* ---------- CA-14 ---------- */
test('CA-14 dynamic-news-events: cada tarjeta pide su contenido una vez y lo muestra bajo «Contenido:» sin botón de expansión', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const m = mount({
    fetchImpl: route({
      '/news/1': () => gate.then(() => json({ data: { ...news(1), content: 'Línea 1\nLínea 2' } })),
      '/news/2': () => json({ data: { ...news(2), content: '<b>x</b>' } }),
      '/news/3': () => json({ data: { ...news(3), content: '' } }),
      '/news': () => json({ data: [news(1), news(2), news(3)], meta: {} })
    })
  });
  const grid = m.doc.addList({ 'data-ne-list': 'news' });
  m.run();
  await flush();
  const cards = byTag(grid, 'article');
  assert.equal(cards.length, 3);
  assert.doesNotMatch(neJs, /Ver todo el contenido|contentToggle/);
  assert.equal(byTag(grid, 'button').length, 0);
  // estado de carga con role=status mientras espera
  assert.equal(byRole(cards[0], 'status')[0].textContent, 'Cargando contenido…');
  release();
  await flush();
  assert.equal(byClass(cards[0], 'ne-content-label')[0].textContent, 'Contenido:');
  assert.equal(byClass(cards[0], 'ne-content')[0].textContent, 'Línea 1\nLínea 2');
  assert.equal(byRole(cards[0], 'status').length, 0);
  assert.match(css, /\.ne-content\s*\{[^}]*white-space:\s*pre-line/);
  // texto sin HTML
  assert.equal(byClass(cards[1], 'ne-content')[0].textContent, '<b>x</b>');
  assert.equal(byTag(cards[1], 'b').length, 0);
  // contenido vacío: sin bloque
  assert.equal(byClass(cards[2], 'ne-content-label').length, 0);
  assert.equal(cards[2].textContent.includes('Contenido:'), false);
  // una petición por tarjeta
  for (const id of [1, 2, 3]) {
    assert.equal(m.calls.filter((c) => new RegExp(`/news/${id}$`).test(c.url)).length, 1);
  }
});

test('CA-14 dynamic-news-events: un error del detalle muestra el mensaje con «Reintentar» que pide solo ese detalle', async () => {
  let ok = false;
  const m = mount({
    fetchImpl: route({
      '/news/2': () => (ok ? json({ data: { ...news(2), content: 'Listo' } }) : json({}, false)),
      '/news/4': () => json({ data: { ...news(4), content: 'Otro' } }),
      '/news': () => json({ data: [news(2), news(4)], meta: {} })
    })
  });
  const grid = m.doc.addList({ 'data-ne-list': 'news' });
  m.run();
  await flush();
  const cards = byTag(grid, 'article');
  const status = byRole(cards[0], 'status')[0];
  assert.equal(status.textContent, 'No pudimos cargar el contenido de esta noticia. Inténtalo más tarde.');
  const retry = byTag(cards[0], 'button')[0];
  assert.equal(retry.textContent, 'Reintentar');
  assert.equal(retry.getAttribute('type'), 'button');
  assert.equal(byTag(cards[1], 'button').length, 0);
  assert.match(css, /\.ne-retry:focus-visible/);
  assert.notEqual(m.doc.activeElement, retry, 'la carga inicial no mueve el foco');
  retry.click();
  assert.equal(byRole(cards[0], 'status')[0].textContent, 'Cargando contenido…');
  assert.equal(m.doc.activeElement, byRole(cards[0], 'status')[0], 'el foco pasa al estado de carga');
  await flush();
  const retryAgain = byTag(cards[0], 'button')[0];
  assert.equal(m.doc.activeElement, retryAgain, 'si vuelve a fallar, el foco va al nuevo botón «Reintentar»');
  ok = true;
  retryAgain.click();
  await flush();
  assert.equal(m.calls.filter((c) => /\/news\/2$/.test(c.url)).length, 3);
  assert.equal(m.doc.activeElement, byClass(cards[0], 'ne-content')[0], 'al cargar bien, el foco va al contenido');
  assert.equal(m.calls.filter((c) => /\/news\/4$/.test(c.url)).length, 1, 'no se repite el detalle de otras tarjetas');
  assert.equal(byClass(cards[0], 'ne-content')[0].textContent, 'Listo');
  assert.equal(byTag(cards[0], 'button').length, 0);
});

/* ---------- CA-15 ---------- */
test('CA-15 dynamic-news-events: imagen completa, centrada, sin ampliar y con fondo de token', () => {
  const box = css.match(/\.ne-media\s*\{([^}]*)\}/)[1];
  const image = css.match(/\.ne-media img\s*\{([^}]*)\}/)[1];
  assert.match(box, /aspect-ratio:\s*16 \/ 10/);
  assert.match(box, /background:\s*var\(--surface-subtle\)/);
  assert.match(box, /place-items:\s*center/);
  assert.match(box, /display:\s*grid/);
  assert.match(image, /object-fit:\s*contain/);
  assert.match(image, /object-position:\s*center/);
  for (const rule of ['width:\\s*auto', 'height:\\s*auto', 'max-width:\\s*100%', 'max-height:\\s*100%']) assert.match(image, new RegExp(rule));
  assert.doesNotMatch(css, /object-fit:\s*(cover|fill)|\bfill\b|transform|#[0-9a-f]{3,8}\b/i);
  // el placeholder usa la misma caja: se inserta dentro de ne-media
  assert.match(neJs, /box\.appendChild\(placeholder\(iconName\)\)/);
  assert.match(neJs, /el\('div', 'ne-media'\)/);
});

/* ---------- CA-16 ---------- */
test('CA-16 dynamic-news-events: cada página tiene una sola meta de base con el mismo valor terminado en /api/v1', () => {
  const values = Object.entries(pages).map(([name, html]) => {
    const found = [...html.matchAll(/<meta name="arca-api-base" content="([^"]*)">/g)];
    assert.equal(found.length, 1, `${name} debe tener exactamente una meta`);
    return found[0][1];
  });
  assert.equal(new Set(values).size, 1);
  assert.match(values[0], /\/api\/v1$/);
});

/* ---------- CA-13 ---------- */
test('CA-13 dynamic-news-events: cada criterio tiene su prueba', () => {
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  const ids = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16'];
  for (const id of ids) {
    assert.match(self, new RegExp(`test\\('CA-${id} dynamic-news-events:`), `falta test CA-${id}`);
  }
  const imports = self.split('\n').filter((line) => line.startsWith('import '));
  assert.ok(imports.every((line) => /from 'node:/.test(line)), 'sin dependencias externas');
});

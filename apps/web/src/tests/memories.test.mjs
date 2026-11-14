import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (d) => d.slice(1)));
const src = path.resolve(here, '..');
const read = (file) => readFileSync(path.join(src, file), 'utf8');
const apiJs = read('js/api.js');
const memJs = read('js/memories.js');
const carJs = read('js/memories-carousel.js');
const memCss = read('memories.css');
const pages = { 'index.html': read('index.html'), 'noticias.html': read('noticias.html'), 'eventos.html': read('eventos.html') };
const indexHtml = pages['index.html'];
const galeriaHtml = indexHtml.slice(indexHtml.indexOf('<section class="galeria" id="galeria">'), indexHtml.indexOf('</section>', indexHtml.indexOf('id="galeria"')));

/* ---------- DOM simulado ---------- */
class TextNode {
  constructor(text) { this.nodeType = 3; this.data = text; this.parentNode = null; }
  get textContent() { return this.data; }
}
class FakeElement {
  constructor(tagName, doc) {
    this.nodeType = 1; this.tagName = tagName.toUpperCase(); this.doc = doc;
    this.attrs = new Map(); this.children = []; this.parentNode = null; this.listeners = new Map();
    this.hidden = false; this.disabled = false; this.src = undefined;
  }
  get firstChild() { return this.children[0] ?? null; }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  removeChild(node) { this.children = this.children.filter((c) => c !== node); node.parentNode = null; return node; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  removeAttribute(name) { this.attrs.delete(name); }
  hasAttribute(name) { return this.attrs.has(name); }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
  removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) ?? []).filter((f) => f !== fn)); }
  dispatch(type, extra = {}) { [...(this.listeners.get(type) ?? [])].forEach((fn) => fn({ type, target: this, ...extra })); }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.doc.focusCalls.push(this); this.doc.activeElement = this; }
  contains(node) { for (let n = node; n; n = n.parentNode) if (n === this) return true; return false; }
  set textContent(value) {
    this.children = [];
    if (value !== '' && value != null) this.appendChild(new TextNode(String(value)));
  }
  get textContent() { return this.children.map((c) => c.textContent).join(''); }
  querySelector(selector) {
    const id = selector.startsWith('#') ? selector.slice(1) : null;
    return tree(this).find((n) => id !== null && n.getAttribute('id') === id) ?? null;
  }
}
function tree(node, out = []) {
  node.children.forEach((c) => { if (c.nodeType === 1) { out.push(c); tree(c, out); } });
  return out;
}
const byTag = (node, tag) => tree(node).filter((n) => n.tagName === tag.toUpperCase());
const byClass = (node, cls) => tree(node).filter((n) => (n.getAttribute('class') || '').split(/\s+/).includes(cls));
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeDocument(base) {
  const body = { children: [], nodeType: 1 };
  const doc = {
    readyState: 'complete', activeElement: null, body, focusCalls: [],
    createElement: (tag) => new FakeElement(tag, doc),
    addEventListener() {},
    getElementById: (id) => tree(body).find((n) => n.getAttribute('id') === id) ?? null,
    querySelector(selector) {
      if (selector === 'meta[name="arca-api-base"]' && base !== undefined) {
        const meta = new FakeElement('meta', doc);
        meta.setAttribute('name', 'arca-api-base');
        meta.setAttribute('content', base);
        return meta;
      }
      return null;
    },
    querySelectorAll() { return []; }
  };
  const add = (tag, attrs = {}, parent = body, extra = {}) => {
    const node = new FakeElement(tag, doc);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    Object.assign(node, extra);
    node.parentNode = parent;
    parent.children.push(node);
    return node;
  };
  const gallery = add('div', { id: 'memGallery', 'aria-busy': 'true' });
  const status = add('p', { id: 'memStatus', role: 'status' }, gallery);
  status.textContent = 'Cargando momentos…';
  const retry = add('button', { id: 'memRetry' }, gallery, { hidden: true });
  retry.textContent = 'Reintentar';
  const carousel = add('div', { id: 'memCarousel', role: 'region' }, gallery, { hidden: true });
  add('div', { id: 'memSlides' }, carousel);
  const arrows = add('div', { id: 'memArrows' }, carousel);
  const prev = add('button', { id: 'memPrev', 'aria-label': 'Momento anterior' }, arrows);
  const nextBtn = add('button', { id: 'memNext', 'aria-label': 'Momento siguiente' }, arrows);
  add('p', { id: 'memAnnounce', role: 'status' }, carousel);
  return doc;
}

const flush = async () => { for (let i = 0; i < 12; i += 1) await new Promise((r) => setImmediate(r)); };
const json = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });

function makeTimers() {
  const active = new Map();
  const log = [];
  let id = 0;
  return {
    active, log,
    setInterval: (fn, ms) => { id += 1; active.set(id, fn); log.push(ms); return id; },
    clearInterval: (key) => { active.delete(key); },
    tick() { [...active.values()].forEach((fn) => fn()); }
  };
}
function makeMedia(matches) {
  const listeners = [];
  const query = {
    matches,
    addEventListener: (type, fn) => { if (type === 'change') listeners.push(fn); },
    removeEventListener: (type, fn) => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    set(value) { query.matches = value; [...listeners].forEach((fn) => fn({ matches: value })); },
    listeners
  };
  return { query, matchMedia: () => query };
}

function mount({ base = 'http://localhost:8000/api/v1', fetchImpl, reduced = false, timers = makeTimers(), withApp = true } = {}) {
  const doc = makeDocument(base === null ? undefined : base);
  const calls = [];
  const media = makeMedia(reduced);
  const sandbox = {
    document: doc, URLSearchParams, AbortController, URL, console,
    setTimeout, clearTimeout,
    setInterval: timers.setInterval, clearInterval: timers.clearInterval, matchMedia: media.matchMedia,
    fetch: (url, opts) => { calls.push({ url, opts }); return fetchImpl(url, opts); }
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(apiJs, ctx);
  vm.runInContext(carJs, ctx);
  if (withApp) vm.runInContext(memJs, ctx);
  const $ = (id) => doc.getElementById(id);
  const slides = () => byClass($('memSlides'), 'mem-slide');
  const isActive = (s) => (s.getAttribute('class') || '').split(/\s+/).includes('mem-slide-active');
  const current = () => slides().findIndex(isActive);
  return { doc, calls, ctx, timers, media, $, slides, current, isActive, api: ctx.ArcaApi, app: () => ctx.ArcaMemories, carousel: () => ctx.ArcaMemoriesCarousel };
}

const mem = (n, extra = {}) => ({ id: n, opinion: `Opinión ${n}`, image_url: `https://x.test/${n}.webp`, published_at: '2026-11-10T10:00:00Z', ...extra });
const list = (n) => Array.from({ length: n }, (_, i) => mem(i + 1));
const ok = (data) => () => json({ data, meta: {} });

/* ---------- CA-09: módulo de red ---------- */
test('CA-09 dynamic-memories: getMemories pide {base}/memories?limit=6 con credentials omit, Accept application/json, tiempo máximo de 10 s y la base de la meta', async () => {
  const delays = [];
  const doc = makeDocument('http://api.example.test/api/v1/');
  const calls = [];
  const ctx = vm.createContext({
    document: doc, URLSearchParams, AbortController, URL, console,
    setTimeout: (fn, ms) => { delays.push(ms); return 1; }, clearTimeout() {},
    fetch: (url, opts) => { calls.push({ url, opts }); return json({ data: [] }); }
  });
  vm.runInContext(apiJs, ctx);
  const result = await ctx.ArcaApi.getMemories({ limit: 6 });
  assert.equal(result.ok, true);
  assert.equal(calls[0].url, 'http://api.example.test/api/v1/memories?limit=6');
  assert.equal(calls[0].opts.method, 'GET');
  assert.equal(calls[0].opts.credentials, 'omit');
  assert.equal(calls[0].opts.headers.Accept, 'application/json');
  assert.deepEqual(delays, [10000]);
});

test('CA-09 dynamic-memories: getMemories devuelve {ok:false, reason} con red caída, 500, JSON inválido y data ausente', async () => {
  const cases = [
    [() => Promise.reject(new Error('down')), 'network'],
    [() => json({}, false), 'http'],
    [() => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('bad')) }), 'invalid'],
    [() => json({ meta: {} }), 'invalid']
  ];
  for (const [impl, reason] of cases) {
    const m = mount({ fetchImpl: impl, withApp: false });
    const result = await m.api.getMemories({ limit: 6 });
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
  }
});

test('CA-09 dynamic-memories: api.js es el único archivo con fetch( en la galería; memories.js y memories-carousel.js no lo contienen', () => {
  assert.match(apiJs, /root\.fetch\(/);
  assert.ok(!/fetch\(/.test(memJs));
  assert.ok(!/fetch\(/.test(carJs));
  assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket/.test(memJs + carJs));
});

/* ---------- CA-07: imagen ---------- */
test('CA-07 dynamic-memories: safeImageUrl acepta solo http, https y rutas que empiezan por /; rechaza javascript:, data:, //host, rutas sin barra y valores que no son texto', () => {
  const { safeImageUrl } = mount({ fetchImpl: ok([]) }).app().helpers;
  assert.equal(safeImageUrl('https://x.test/a.webp'), 'https://x.test/a.webp');
  assert.equal(safeImageUrl('http://x.test/a.webp'), 'http://x.test/a.webp');
  assert.equal(safeImageUrl('/media/memories/a.webp'), '/media/memories/a.webp');
  for (const bad of [null, undefined, 4, {}, [], '', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil.test/a.png', '/\\evil.test', 'media/a.png', 'ftp://x.test/a']) {
    assert.equal(safeImageUrl(bad), null, String(bad));
  }
});

test('CA-07 dynamic-memories: https y http con loading, decoding y alt; null, javascript:, data: y error de carga muestran el marcador aria-hidden en la misma caja', async () => {
  const m = mount({
    fetchImpl: ok([
      mem(1), mem(2, { image_url: 'http://x.test/2.webp' }), mem(3, { image_url: null }), mem(4, { image_url: 'javascript:alert(1)' }),
      mem(5, { image_url: 'data:image/png;base64,AAAA' }), mem(6, { image_url: '//evil.test/a.png' })
    ])
  });
  await flush();
  const s = m.slides();
  for (const i of [0, 1]) {
    const img = byTag(s[i], 'img')[0];
    assert.equal(img.getAttribute('loading'), 'lazy');
    assert.equal(img.getAttribute('decoding'), 'async');
    assert.equal(img.getAttribute('alt'), 'Foto compartida por un visitante del zoológico');
    assert.ok(/^https?:\/\//.test(img.src));
  }
  for (const i of [2, 3, 4, 5]) {
    assert.equal(byTag(s[i], 'img').length, 0);
    const ph = byClass(s[i], 'mem-placeholder')[0];
    assert.equal(ph.getAttribute('aria-hidden'), 'true');
    assert.equal(ph.parentNode.getAttribute('class'), 'mem-media');
  }
  const broken = byTag(s[0], 'img')[0];
  broken.dispatch('error');
  assert.equal(byTag(s[0], 'img').length, 0);
  assert.equal(byClass(s[0], 'mem-placeholder')[0].getAttribute('aria-hidden'), 'true');
  assert.equal(byClass(s[0], 'mem-placeholder')[0].parentNode.getAttribute('class'), 'mem-media');
});

/* ---------- CA-01, CA-06 ---------- */
test('CA-01 dynamic-memories: cada momento solo presenta la imagen y la opinión; no lee published_until ni datos del visitante (RN-07, RN-10)', async () => {
  const m = mount({ fetchImpl: ok([mem(1, { published_until: '2026-11-17', name: 'Juan Pérez', email: 'juan@example.test', nickname: 'jp', avatar: 'a.png' })]) });
  await flush();
  const slide = m.slides()[0];
  assert.equal(byTag(slide, 'img').length, 1);
  assert.equal(byClass(slide, 'mem-opinion')[0].textContent, 'Opinión 1');
  for (const secret of ['Juan', 'juan@example.test', 'jp', '2026-11-17']) assert.ok(!slide.textContent.includes(secret), secret);
  assert.equal(byTag(slide, 'h3').length, 0);
  assert.ok(!/published_until|has_more|\bname\b|email|nickname|avatar/.test(memJs.replace(/\/\*[\s\S]*?\*\//g, '')));
});

test('CA-06 dynamic-memories: <img src=x onerror=…> en la opinión se muestra como texto y no crea img ni script; búsqueda estática de innerHTML, outerHTML, insertAdjacentHTML, document.write, eval y new Function en memories.js y memories-carousel.js sin resultados', async () => {
  const evil = '<img src=x onerror=alert(1)>';
  const m = mount({ fetchImpl: ok([mem(1, { opinion: evil, image_url: null })]) });
  await flush();
  const slide = m.slides()[0];
  assert.equal(byClass(slide, 'mem-opinion')[0].textContent, evil);
  assert.equal(byTag(slide, 'img').length, 0);
  assert.equal(byTag(slide, 'script').length, 0);
  for (const [name, code] of [['memories.js', memJs], ['memories-carousel.js', carJs]]) {
    for (const banned of [/innerHTML/, /outerHTML/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function/]) {
      assert.ok(!banned.test(code), `${name}: ${banned}`);
    }
  }
});

test('CA-01 dynamic-memories: con 8 momentos en la respuesta se dibujan los 6 primeros en el orden de la API; en el HTML no quedan f1, f2 ni f3', async () => {
  const m = mount({ fetchImpl: ok(list(8)) });
  await flush();
  assert.equal(m.slides().length, 6);
  assert.deepEqual(m.slides().map((s) => byClass(s, 'mem-opinion')[0].textContent), [1, 2, 3, 4, 5, 6].map((n) => `Opinión ${n}`));
  m.slides().forEach((s) => { assert.equal(byTag(s, 'img').length, 1); assert.equal(byClass(s, 'mem-opinion').length, 1); });
  assert.equal(m.$('memCarousel').hidden, false);
  assert.equal(m.$('memStatus').hidden, true);
  assert.equal(m.$('memGallery').getAttribute('aria-busy'), 'false');
  assert.ok(!/\bf[123]\b/.test(galeriaHtml));
});

test('CA-01 dynamic-memories: index.html no contiene las fotos fijas f1, f2 ni f3 ni la clase fotos dentro de #galeria', () => {
  assert.ok(!/class="foto\b|class="fotos"|\bf[123]\b/.test(galeriaHtml));
  assert.ok(!galeriaHtml.includes('Ver foto'));
  assert.ok(galeriaHtml.includes('id="memGallery"'));
});

test('CA-01 dynamic-memories: memories.js no contiene published_until ni has_more (la vigencia la decide la API)', () => {
  assert.ok(!/published_until|has_more/.test(memJs));
  assert.ok(!/published_until/.test(carJs));
});

/* ---------- CA-15 ---------- */
test('CA-15 dynamic-memories: se hace una sola petición GET memories?limit=6, sin page ni «Cargar más»; con 1 a 5 se muestran esos; con 0 se muestra el estado de vacío', async () => {
  const m = mount({ fetchImpl: ok(list(8)) });
  await flush();
  assert.equal(m.calls.length, 1);
  assert.equal(m.calls[0].url, 'http://localhost:8000/api/v1/memories?limit=6');
  assert.ok(!/page=/.test(m.calls[0].url));
  assert.ok(!/Cargar más/.test(memJs + galeriaHtml));
  for (const n of [1, 3, 5, 6]) {
    const x = mount({ fetchImpl: ok(list(n)) });
    await flush();
    assert.equal(x.slides().length, n, `${n} momentos`);
  }
  const empty = mount({ fetchImpl: ok([]) });
  await flush();
  assert.equal(empty.slides().length, 0);
  assert.equal(empty.$('memStatus').textContent, 'Aún no hay momentos publicados.');
});

/* ---------- CA-02, CA-03, CA-04, CA-05 ---------- */
test('CA-02 dynamic-memories: antes de resolver la petición, #memStatus anuncia «Cargando momentos…» con role="status" y #memGallery tiene aria-busy="true"', async () => {
  let release;
  const m = mount({ fetchImpl: () => new Promise((resolve) => { release = resolve; }) });
  await flush();
  assert.equal(m.$('memStatus').textContent, 'Cargando momentos…');
  assert.equal(m.$('memStatus').getAttribute('role'), 'status');
  assert.equal(m.$('memStatus').hidden, false);
  assert.equal(m.$('memGallery').getAttribute('aria-busy'), 'true');
  assert.equal(m.$('memCarousel').hidden, true);
  assert.equal(m.$('memRetry').hidden, true);
  release({ ok: true, json: () => Promise.resolve({ data: [mem(1)] }) });
  await flush();
  assert.equal(m.$('memGallery').getAttribute('aria-busy'), 'false');
});

test('CA-02 dynamic-memories: el HTML inicial de #memStatus tiene role="status" con «Cargando momentos…» y #memGallery tiene aria-busy="true"', () => {
  assert.match(galeriaHtml, /id="memStatus" role="status"[^>]*>Cargando momentos…<\/p>/);
  assert.match(galeriaHtml, /id="memGallery" aria-busy="true"/);
});

test('CA-03 dynamic-memories: data vacío muestra «Aún no hay momentos publicados.» sin slides, carrusel ni #memRetry', async () => {
  const m = mount({ fetchImpl: ok([]) });
  await flush();
  assert.equal(m.$('memStatus').textContent, 'Aún no hay momentos publicados.');
  assert.equal(m.$('memStatus').hidden, false);
  assert.equal(m.slides().length, 0);
  assert.equal(m.$('memCarousel').hidden, true);
  assert.equal(m.$('memRetry').hidden, true);
  const invalid = mount({ fetchImpl: ok([null, 'x', 3, []]) });
  await flush();
  assert.equal(invalid.$('memStatus').textContent, 'Aún no hay momentos publicados.');
});

test('CA-04 dynamic-memories: red caída, 500, JSON inválido y data ausente muestran el error con #memRetry; «Reintentar» pide de nuevo, muestra la carga y mueve el foco según el estado', async () => {
  const failures = [
    () => Promise.reject(new Error('down')),
    () => json({}, false),
    () => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('bad')) }),
    () => json({ meta: {} })
  ];
  for (const failure of failures) {
    const m = mount({ fetchImpl: failure });
    await flush();
    assert.equal(m.$('memStatus').textContent, 'No pudimos cargar los momentos. Inténtalo más tarde.');
    assert.equal(m.$('memStatus').getAttribute('role'), 'status');
    assert.equal(m.$('memRetry').hidden, false);
    assert.equal(m.$('memRetry').textContent, 'Reintentar');
    assert.equal(m.slides().length, 0);
    assert.ok(!/reason|network|http|timeout|invalid/.test(m.$('memStatus').textContent));
  }
  let mode = 'fail';
  let release;
  const m = mount({ fetchImpl: () => (mode === 'fail' ? Promise.reject(new Error('x')) : new Promise((r) => { release = r; })) });
  await flush();
  assert.equal(m.doc.focusCalls.length, 0, 'la primera carga no mueve el foco');
  m.$('memRetry').click();
  assert.equal(m.$('memStatus').textContent, 'Cargando momentos…');
  assert.equal(m.doc.activeElement, m.$('memStatus'), 'foco en el estado de carga');
  assert.equal(m.$('memRetry').hidden, true);
  await flush();
  assert.equal(m.calls.length, 2, 'pide de nuevo');
  assert.equal(m.calls[1].url, m.calls[0].url, 'con los mismos parámetros');
  assert.equal(m.doc.activeElement, m.$('memRetry'), 'si vuelve a fallar, foco en el botón');
  mode = 'ok';
  m.$('memRetry').click();
  await flush();
  release({ ok: true, json: () => Promise.resolve({ data: [mem(1), mem(2)] }) });
  await flush();
  assert.equal(m.slides().length, 2);
  assert.equal(m.doc.activeElement, m.$('memGallery'), 'tras éxito, foco en el contenido');
});

test('CA-05 dynamic-memories: tras un error no queda ninguna foto de muestra, ningún «Ver foto» ni slides de la carga anterior', async () => {
  let data = list(3);
  let fail = false;
  const m = mount({ fetchImpl: () => (fail ? Promise.reject(new Error('x')) : json({ data })) });
  await flush();
  assert.equal(m.slides().length, 3);
  fail = true;
  await m.app().load({ refocus: true });
  assert.equal(m.slides().length, 0);
  assert.equal(byTag(m.$('memGallery'), 'img').length, 0);
  assert.ok(!m.$('memGallery').textContent.includes('Ver foto'));
  assert.equal(m.$('memCarousel').hidden, true);
  assert.equal(m.timers.active.size, 0, 'el temporizador de la carga anterior se cancela');
  assert.equal(data.length, 3);
});

/* ---------- Carrusel: CA-17, CA-18 ---------- */
test('CA-18 dynamic-memories: con 2 a 6 momentos hay dos flechas con nombre accesible; pulsarlas y las teclas ←/→ cambian el momento sin mover el foco; sin paginación ni indicadores', async () => {
  for (const n of [2, 3, 6]) {
    const m = mount({ fetchImpl: ok(list(n)) });
    await flush();
    assert.equal(m.$('memPrev').getAttribute('aria-label'), 'Momento anterior');
    assert.equal(m.$('memNext').getAttribute('aria-label'), 'Momento siguiente');
    assert.equal(m.$('memPrev').hidden, false);
    assert.equal(m.$('memNext').hidden, false);
    assert.equal(m.$('memIndicators'), null, 'sin indicadores');
    assert.equal(m.current(), 0);
    const before = m.doc.focusCalls.length;
    m.$('memNext').click();
    assert.equal(m.current(), 1);
    m.$('memPrev').click();
    m.$('memPrev').click();
    assert.equal(m.current(), n - 1, 'desde el primero, anterior va al último');
    m.$('memNext').click();
    assert.equal(m.current(), 0, 'desde el último, siguiente va al primero');
    const box = m.$('memCarousel');
    box.dispatch('keydown', { key: 'ArrowRight' });
    assert.equal(m.current(), 1);
    box.dispatch('keydown', { key: 'ArrowLeft' });
    assert.equal(m.current(), 0);
    box.dispatch('keydown', { key: 'ArrowLeft' });
    assert.equal(m.current(), n - 1);
    box.dispatch('keydown', { key: 'Tab' });
    box.dispatch('keydown', { key: 'ArrowRight', ctrlKey: true });
    assert.equal(m.current(), n - 1, 'otras teclas o combinaciones no cambian el momento');
    assert.equal(m.doc.focusCalls.length, before, 'ni las flechas ni el teclado mueven el foco');
  }
});

test('CA-17 dynamic-memories: un único momento se ve sin flechas, sin indicadores y sin temporizador, y las teclas no hacen nada', async () => {
  const m = mount({ fetchImpl: ok([mem(1)]) });
  await flush();
  assert.equal(m.slides().length, 1);
  assert.equal(m.current(), 0);
  assert.equal(m.$('memCarousel').hidden, false);
  assert.equal(m.$('memPrev').hidden, true);
  assert.equal(m.$('memNext').hidden, true);
  assert.equal(m.$('memArrows').hidden, true);
  assert.equal(m.timers.active.size, 0);
  assert.equal(m.timers.log.length, 0);
  m.$('memCarousel').dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(m.current(), 0);
  assert.equal(m.$('memAnnounce').textContent, '');
});

/* ---------- CA-16, CA-21 ---------- */
test('CA-16 dynamic-memories: con 3 momentos sin movimiento reducido cambia cada 5 s con temporizador simulado, vuelve al primero desde el último y cada cambio muestra imagen y opinión juntas', async () => {
  const m = mount({ fetchImpl: ok(list(3)) });
  await flush();
  assert.deepEqual(m.timers.log, [5000]);
  assert.equal(m.timers.active.size, 1);
  const seen = [m.current()];
  for (let i = 0; i < 4; i += 1) { m.timers.tick(); seen.push(m.current()); }
  assert.deepEqual(seen, [0, 1, 2, 0, 1]);
  const visible = m.slides().filter(m.isActive);
  assert.equal(visible.length, 1);
  assert.equal(byTag(visible[0], 'img').length, 1);
  assert.equal(byClass(visible[0], 'mem-opinion').length, 1);
  assert.equal(m.doc.focusCalls.length, 0, 'los cambios automáticos no mueven el foco');
  /* la navegación manual reinicia la cuenta (se vuelve a programar el temporizador) */
  const programmed = m.timers.log.length;
  m.$('memNext').click();
  assert.equal(m.timers.log.length, programmed + 1);
  assert.equal(m.timers.active.size, 1);
  /* destroy limpia el temporizador */
  await m.app().load();
  assert.equal(m.timers.active.size, 1, 'una sola instancia activa tras recargar');
  const x = mount({ fetchImpl: ok([]), withApp: false });
  const slides = [x.doc.createElement('div'), x.doc.createElement('div')];
  const instance = x.carousel().mount(x.$('memCarousel'), slides, {});
  assert.equal(x.timers.active.size, 1);
  instance.destroy();
  assert.equal(x.timers.active.size, 0);
});

test('CA-21 dynamic-memories: el cursor dentro detiene el avance y al salir se reanuda; el foco dentro lo detiene y al perderlo se reanuda; no hay botón de pausa', async () => {
  const m = mount({ fetchImpl: ok(list(3)) });
  await flush();
  const box = m.$('memCarousel');
  assert.equal(m.timers.active.size, 1);
  box.dispatch('mouseenter');
  assert.equal(m.timers.active.size, 0);
  box.dispatch('mouseleave');
  assert.equal(m.timers.active.size, 1);
  box.dispatch('focusin');
  assert.equal(m.timers.active.size, 0);
  box.dispatch('focusout', { relatedTarget: m.$('memNext') });
  assert.equal(m.timers.active.size, 0, 'el foco sigue dentro del carrusel');
  box.dispatch('focusout', { relatedTarget: null });
  assert.equal(m.timers.active.size, 1);
  box.dispatch('mouseenter');
  box.dispatch('focusin');
  box.dispatch('mouseleave');
  assert.equal(m.timers.active.size, 0, 'con el foco dentro sigue en pausa aunque salga el cursor');
  assert.equal(m.$('memPause'), null);
});

/* ---------- CA-23 (retirado), CA-27 ---------- */
test('CA-23 dynamic-memories: retirado; no existen #memPause ni los textos «Pausar carrusel», «Reanudar carrusel», «Carrusel en pausa.» ni «Carrusel reanudado.»', () => {
  assert.ok(!/memPause/.test(indexHtml + carJs + memCss));
  for (const text of ['Pausar carrusel', 'Reanudar carrusel', 'Carrusel en pausa.', 'Carrusel reanudado.']) {
    assert.ok(!(indexHtml + carJs + memJs).includes(text), text);
  }
});

test('CA-27 dynamic-memories: sin numeración, indicadores, contador ni botón de pausa en el marcado; la región y cada momento conservan su nombre', async () => {
  for (const banned of ['memIndicators', 'mem-indicators', 'mem-dot', 'memPause', 'mem-controls', 'mem-counter']) {
    assert.ok(!(galeriaHtml + carJs + memJs + memCss).includes(banned), banned);
  }
  assert.ok(!/>\s*Momento (anterior|siguiente)\s*</.test(galeriaHtml), 'sin botones de texto');
  assert.match(galeriaHtml, /id="memCarousel" role="region" aria-roledescription="carrusel" aria-label="Momentos para recordar"/);
  const m = mount({ fetchImpl: ok(list(3)) });
  await flush();
  assert.deepEqual(plain(m.slides().map((s) => s.getAttribute('aria-label'))), ['Momento 1 de 3', 'Momento 2 de 3', 'Momento 3 de 3']);
  assert.equal(byTag(m.$('memCarousel'), 'button').filter((b) => /^\d+$/.test(b.textContent)).length, 0);
});

test('CA-27 dynamic-memories: el avance automático no escribe en #memAnnounce ni mueve el foco; flecha y teclado anuncian «Momento n de N»; el anuncio es visualmente oculto', async () => {
  assert.match(galeriaHtml, /<p class="mem-announce mem-sr-only" id="memAnnounce" role="status">/);
  assert.match(memCss, /\.mem-sr-only \{[^}]*position: absolute[^}]*width: 1px[^}]*height: 1px/);
  const m = mount({ fetchImpl: ok(list(4)) });
  await flush();
  const announce = () => m.$('memAnnounce').textContent;
  assert.equal(announce(), '');
  m.timers.tick(); m.timers.tick();
  assert.equal(announce(), '', 'el avance automático no se anuncia');
  m.$('memNext').click();
  assert.equal(announce(), 'Momento 4 de 4');
  m.$('memPrev').click();
  assert.equal(announce(), 'Momento 3 de 4');
  m.$('memCarousel').dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(announce(), 'Momento 4 de 4');
  m.$('memCarousel').dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(announce(), 'Momento 3 de 4');
  assert.equal(m.doc.focusCalls.length, 0);
  /* un cambio automático posterior no sobrescribe el último anuncio */
  m.timers.tick();
  assert.equal(announce(), 'Momento 3 de 4');
});

/* ---------- CA-24, CA-26, CA-20 ---------- */
test('CA-24 dynamic-memories: CSS con fundido de opacidad de 600 ms entre momentos, sin desplazamiento lateral; el cambio activa y desactiva la clase del momento', async () => {
  assert.match(memCss, /\.mem-slide \{[^}]*transition: opacity 600ms/);
  assert.match(memCss, /\.mem-slide-active \{[^}]*opacity: 1[^}]*transition: opacity 600ms/);
  assert.match(memCss, /\.mem-slide \{[^}]*grid-area: 1 \/ 1/);
  assert.match(memCss, /\.mem-slide \{[^}]*opacity: 0/);
  assert.ok(!/translate|left:\s*-|scroll-snap/.test(memCss.replace(/\.mem-arrows \{[^}]*\}/, '')));
  const m = mount({ fetchImpl: ok(list(3)) });
  await flush();
  assert.deepEqual(plain(m.slides().map(m.isActive)), [true, false, false]);
  assert.deepEqual(plain(m.slides().map((s) => s.getAttribute('aria-hidden'))), [null, 'true', 'true']);
  m.timers.tick();
  assert.deepEqual(plain(m.slides().map(m.isActive)), [false, true, false]);
  assert.deepEqual(plain(m.slides().map((s) => s.hidden)), [false, false, false], 'ambos momentos coexisten durante el fundido');
});

test('CA-25 dynamic-memories: dos flechas superpuestas con icono, sin texto visible, de al menos 44 px, con foco visible y sin color fijo nuevo', async () => {
  assert.match(galeriaHtml, /<button class="mem-arrow mem-arrow-prev" id="memPrev" type="button" aria-label="Momento anterior"><svg[^>]*aria-hidden="true"/);
  assert.match(galeriaHtml, /<button class="mem-arrow mem-arrow-next" id="memNext" type="button" aria-label="Momento siguiente"><svg[^>]*aria-hidden="true"/);
  assert.ok(galeriaHtml.indexOf('id="memPrev"') < galeriaHtml.indexOf('id="memNext"'));
  assert.match(memCss, /\.mem-arrows \{[^}]*position: absolute[^}]*aspect-ratio: 4 \/ 3/);
  assert.match(memCss, /\.mem-arrow \{[^}]*width: 56px[^}]*height: 56px[^}]*min-width: 44px[^}]*min-height: 44px/);
  assert.match(memCss, /\.mem-arrow \{[^}]*border-radius: 50%/);
  assert.match(memCss, /\.mem-arrow \{[^}]*background: color-mix\(in srgb, var\(--sidebar\)/);
  assert.match(memCss, /\.mem-arrow:focus-visible \{[^}]*outline: 3px solid/);
  const mobile = memCss.slice(memCss.indexOf('@media (max-width: 480px)'));
  const px = Number(mobile.match(/\.mem-arrow \{ width: (\d+)px; height: (\d+)px/)?.[1]);
  assert.ok(px >= 44, 'flechas táctiles en móvil');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(memCss), 'sin colores fijos');
  const m = mount({ fetchImpl: ok(list(2)) });
  await flush();
  assert.equal(m.$('memPrev').textContent, '');
  assert.equal(m.$('memNext').textContent, '');
});

test('CA-26 dynamic-memories: la imagen activa se acerca de 0,96 a 1,00 en 5 s sin recortar (object-fit contain, sin escala mayor que 1)', () => {
  assert.match(memCss, /\.mem-slide-active \.mem-media img \{ animation: mem-zoom 5s linear both; \}/);
  assert.match(memCss, /@keyframes mem-zoom \{\s*from \{ transform: scale\(0\.96\); \}\s*to \{ transform: scale\(1\); \}/);
  for (const [, v] of memCss.matchAll(/scale\(([\d.]+)\)/g)) assert.ok(Number(v) <= 1, `escala ${v}`);
  assert.match(memCss, /\.mem-media img \{[^}]*object-fit: contain;/);
  assert.match(memCss, /\.mem-media \{[^}]*overflow: hidden/);
});

test('CA-20 dynamic-memories: con movimiento reducido no hay avance automático, fundido ni acercamiento; las flechas y el teclado cambian el momento al instante', async () => {
  const m = mount({ fetchImpl: ok(list(3)), reduced: true });
  await flush();
  assert.equal(m.timers.active.size, 0);
  assert.equal(m.timers.log.length, 0);
  assert.equal(m.$('memPrev').hidden, false);
  m.$('memNext').click();
  assert.equal(m.current(), 1);
  m.$('memCarousel').dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(m.current(), 2);
  m.$('memPrev').click();
  assert.equal(m.current(), 1);
  assert.equal(m.timers.active.size, 0);
  for (const banned of [/scrollTo/, /scrollIntoView/, /smooth/, /transition/, /animate\(/]) assert.ok(!banned.test(carJs), String(banned));
  const reduce = memCss.slice(memCss.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(reduce, /\.mem-slide, \.mem-slide-active, \.mem-arrow \{ transition: none; \}/);
  assert.match(reduce, /\.mem-slide-active \.mem-media img \{ animation: none; transform: none; \}/);
  /* si la preferencia cambia con la página abierta, se recalcula */
  m.media.query.set(false);
  assert.equal(m.timers.active.size, 1);
  m.media.query.set(true);
  assert.equal(m.timers.active.size, 0);
});

/* ---------- CA-19 ---------- */
test('CA-19 dynamic-memories: el orden de tabulación es anterior y siguiente; los controles son button nativos; el carrusel no atrapa el foco', async () => {
  const order = ['id="memPrev"', 'id="memNext"'].map((id) => galeriaHtml.indexOf(id));
  assert.ok(order.every((i) => i > -1));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  for (const id of ['memPrev', 'memNext', 'memRetry']) assert.match(galeriaHtml, new RegExp(`<button[^>]*id="${id}"[^>]*type="button"`));
  assert.ok(!/tabindex="[1-9]/.test(galeriaHtml), 'sin tabindex positivo');
  assert.ok(!/preventDefault|\.focus\(/.test(carJs), 'el carrusel no atrapa ni mueve el foco');
  const m = mount({ fetchImpl: ok(list(3)) });
  await flush();
  const names = byTag(m.$('memCarousel'), 'button').map((n) => n.getAttribute('id'));
  assert.deepEqual(plain(names), ['memPrev', 'memNext']);
});

test('CA-19 dynamic-memories: el contenedor se anuncia como «Momentos para recordar» y cada momento como «Momento n de N», con su imagen y su opinión; un cambio automático no mueve el foco', async () => {
  assert.match(galeriaHtml, /id="memCarousel" role="region" aria-roledescription="carrusel" aria-label="Momentos para recordar"/);
  const m = mount({ fetchImpl: ok(list(3)) });
  await flush();
  assert.deepEqual(plain(m.slides().map((s) => s.getAttribute('aria-label'))), ['Momento 1 de 3', 'Momento 2 de 3', 'Momento 3 de 3']);
  m.slides().forEach((s) => {
    assert.equal(s.getAttribute('role'), 'group');
    assert.equal(s.getAttribute('aria-roledescription'), 'diapositiva');
    assert.equal(byTag(s, 'img')[0].getAttribute('alt'), 'Foto compartida por un visitante del zoológico');
    assert.match(byClass(s, 'mem-opinion')[0].textContent, /^Opinión \d$/);
  });
  assert.deepEqual(plain(m.slides().map(m.isActive)), [true, false, false]);
  m.timers.tick();
  assert.deepEqual(plain(m.slides().map(m.isActive)), [false, true, false]);
  assert.equal(m.doc.focusCalls.length, 0);
});

/* ---------- CA-08, CA-10: CSS y marcado ---------- */
test('CA-08 dynamic-memories: CSS de la caja de imagen con object-fit contain, sin cover ni fill, con var(--surface-subtle), con el marcador en la misma caja; el único transform es el acercamiento de CA-26 y no hay zoom en hover', () => {
  assert.match(memCss, /\.mem-media img \{[^}]*object-fit: contain;/);
  assert.match(memCss, /\.mem-media \{[^}]*background: var\(--surface-subtle\)/);
  assert.match(memCss, /\.mem-media \{[^}]*aspect-ratio: 4 \/ 3/);
  assert.ok(!/object-fit:\s*(cover|fill)/.test(memCss));
  assert.ok(!/:hover[^{]*\.mem-media(?![^{]*animation-play-state)[^{]*\{[^}]*transform/.test(memCss));
  assert.deepEqual([...memCss.matchAll(/transform:\s*([^;}]+)/g)].map((x) => x[1].trim()), ['scale(0.96)', 'scale(1)', 'none']);
  assert.ok(!/:\s*#[0-9a-fA-F]{3,8}\s*[;}]/.test(memCss), 'sin colores hexadecimales');
  assert.match(memCss, /\.mem-placeholder \{[^}]*place-items: center/);
});

test('CA-10 dynamic-memories: CSS sin desbordamiento (max-width 100% en imágenes, min-width 0 en contenedores), :focus-visible en flechas y botones y reglas para 360 px', () => {
  assert.match(memCss, /\.mem-media img \{[^}]*max-width: 100%/);
  assert.match(memCss, /\.mem-media \{[^}]*min-width: 0/);
  assert.match(memCss, /\.mem-carousel \{[^}]*min-width: 0/);
  assert.match(memCss, /\.mem-btn:focus-visible[\s\S]*?\.mem-retry:focus-visible \{ outline: 3px solid var\(--primary\)/);
  assert.match(memCss, /\.mem-arrow:focus-visible/);
  assert.match(memCss, /@media \(max-width: 480px\)/);
  assert.match(memCss, /@media \(prefers-reduced-motion: reduce\)/);
});

test('CA-10 dynamic-memories: #galeria conserva su h2 «Momentos para recordar» y ningún momento tiene encabezado propio', async () => {
  assert.equal((galeriaHtml.match(/<h2>/g) || []).length, 1);
  assert.ok(galeriaHtml.includes('<h2>Momentos para recordar</h2>'));
  assert.ok(!/<h[3-6]\b/.test(galeriaHtml));
  assert.ok(!/<section\b/.test(galeriaHtml.slice(10)));
  assert.match(galeriaHtml, /id="memStatus" role="status"/);
  const m = mount({ fetchImpl: ok(list(2)) });
  await flush();
  for (const h of ['h1', 'h2', 'h3', 'h4']) assert.equal(byTag(m.$('memGallery'), h).length, 0);
});

/* ---------- CA-11, CA-12 ---------- */
const SECTION_BASELINE = ['porque-visitar', 'animales', 'mapa', 'ubicacion', 'instalaciones', 'noticias', 'eventos', 'boletos', 'preguntas', 'galeria', 'cognitivePanel'];
test('CA-11 dynamic-memories: index.html conserva los id y las secciones de la línea base (T-01 d), el enlace «Descubre los animales» y las referencias a script.js, animations.js y accessibility.js', () => {
  const ids = [...indexHtml.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((x) => x[1]);
  assert.deepEqual(ids, SECTION_BASELINE);
  assert.match(galeriaHtml, /<a href="#animales" class="link">\s*Descubre los animales/);
  for (const file of ['script.js', 'animations.js', 'accessibility.js', 'js/api.js', 'js/memories-carousel.js', 'js/memories.js']) {
    assert.ok(new RegExp(`<script src="${file.replace('.', '\\.')}" defer></script>`).test(indexHtml), file);
  }
  /* orden acordado con web-011: api -> news-events -> animals -> memories-carousel -> memories */
  const order = ['js/api.js', 'js/news-events.js', 'js/animals.js', 'js/memories-carousel.js', 'js/memories.js'].map((f) => indexHtml.indexOf(`src="${f}"`));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.ok(order.every((i) => i > -1));
  const css = ['news-events.css', 'animals.css', 'memories.css'].map((f) => indexHtml.indexOf(`href="${f}"`));
  assert.deepEqual(css, [...css].sort((a, b) => a - b));
  assert.ok(css.every((i) => i > -1));
  const idList = [...galeriaHtml.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
  assert.equal(new Set(idList).size, idList.length, 'ids únicos en #galeria');
  for (const id of idList) assert.equal([...indexHtml.matchAll(new RegExp(`\\bid="${id}"`, 'g'))].length, 1, id);
});

test('CA-12 dynamic-memories: index.html, noticias.html y eventos.html tienen exactamente una meta arca-api-base con el mismo content; la galería no define otra base', () => {
  const contents = Object.entries(pages).map(([name, html]) => {
    const metas = [...html.matchAll(/<meta\s+name="arca-api-base"\s+content="([^"]*)"/g)];
    assert.equal(metas.length, 1, name);
    return metas[0][1];
  });
  assert.ok(contents.every((c) => c === contents[0]));
  assert.match(contents[0], /\/api\/v1$/);
  assert.ok(!/arca-api-base|apiBase|\/api\/v1/.test(memJs + carJs + galeriaHtml));
});

/* ---------- CA-14, CA-22 ---------- */
test('CA-14 dynamic-memories: sin package.json, build ni recursos remotos nuevos; sin cookies, localStorage, sessionStorage ni credenciales', () => {
  assert.ok(!existsSync(path.resolve(src, '..', 'package.json')));
  for (const [name, code] of [['memories.js', memJs], ['memories-carousel.js', carJs], ['memories.css', memCss], ['api.js', apiJs]]) {
    for (const banned of [/localStorage/, /sessionStorage/, /document\.cookie/, /indexedDB/i]) assert.ok(!banned.test(code), `${name}: ${banned}`);
  }
  for (const [, mode] of apiJs.matchAll(/credentials:\s*'([^']+)'/g)) assert.equal(mode, 'omit');
  assert.ok(!/https?:\/\/|@import|url\(/.test(memCss));
  assert.ok(!/https?:\/\//.test((memJs + carJs).replace(/\/\*[\s\S]*?\*\//g, '')));
  const scripts = [...indexHtml.matchAll(/<script\s+src="([^"]+)"/g)].map((x) => x[1]);
  assert.ok(scripts.every((s) => !/^(https?:)?\/\//.test(s)), 'solo scripts locales');
  const links = [...indexHtml.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map((x) => x[1]);
  assert.ok(links.every((l) => !/^(https?:)?\/\//.test(l)), 'solo hojas de estilo locales');
  assert.ok(!/https?:\/\//.test(galeriaHtml));
});

test('CA-22 dynamic-memories: el carrusel no usa librerías ni almacenamiento del navegador; los estados de carga, vacío y error mantienen sus textos', () => {
  assert.ok(!/localStorage|sessionStorage/.test(carJs));
  assert.ok(!/swiper|slick|glide|\bowl\b|flickity|splide|bootstrap\.Carousel|\brequire\(|\bimport\s/i.test(carJs + memJs));
  for (const text of ['Cargando momentos…', 'Aún no hay momentos publicados.', 'No pudimos cargar los momentos. Inténtalo más tarde.']) assert.ok(memJs.includes(text), text);
  assert.ok(galeriaHtml.includes('Cargando momentos…'));
  const imports = read('tests/memories.test.mjs').match(/^import .* from '[^']+'/gm).map((l) => l.match(/'([^']+)'/)[1]);
  assert.ok(imports.every((i) => i.startsWith('node:')));
});

/* ---------- Cobertura: CA-13 ---------- */
test('CA-13 dynamic-memories: cada criterio vigente CA-01 a CA-22 y CA-24 a CA-27 tiene al menos un test que lo nombra; CA-23 solo en su test de retirada', () => {
  const self = read('tests/memories.test.mjs');
  const names = new Set([...self.matchAll(/^test\('CA-(\d{2}) dynamic-memories/gm)].map((x) => x[1]));
  for (let i = 1; i <= 27; i += 1) assert.ok(names.has(String(i).padStart(2, '0')), `CA-${String(i).padStart(2, '0')}`);
});

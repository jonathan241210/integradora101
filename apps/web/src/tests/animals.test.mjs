import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (d) => d.slice(1)));
const src = path.resolve(here, '..');
const read = (file) => readFileSync(path.join(src, file), 'utf8');
const apiJs = read('js/api.js');
const animalsJs = read('js/animals.js');
const animalsCss = read('animals.css');
const scriptJs = read('script.js');
const pages = { 'index.html': read('index.html'), 'noticias.html': read('noticias.html'), 'eventos.html': read('eventos.html') };
const indexHtml = pages['index.html'];
const sectionHtml = (html, id, nextId) => {
  const a = html.indexOf(`id="${id}"`);
  const b = html.indexOf(`id="${nextId}"`);
  return html.slice(a, b);
};
const animalesHtml = sectionHtml(indexHtml, 'animales', 'mapa');

/* ---------- DOM simulado ---------- */
class TextNode {
  constructor(text) { this.nodeType = 3; this.data = text; this.parentNode = null; }
  get textContent() { return this.data; }
}
class FakeElement {
  constructor(tagName, doc) {
    this.nodeType = 1; this.tagName = tagName.toUpperCase(); this.doc = doc;
    this.attrs = new Map(); this.children = []; this.parentNode = null; this.listeners = new Map();
    this.hidden = false; this.disabled = false; this.value = ''; this.src = undefined;
  }
  get firstChild() { return this.children[0] ?? null; }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  removeChild(node) { this.children = this.children.filter((c) => c !== node); node.parentNode = null; return node; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  hasAttribute(name) { return this.attrs.has(name); }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
  dispatch(type) { (this.listeners.get(type) ?? []).forEach((fn) => fn({ type, target: this })); }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.doc.activeElement = this; }
  set textContent(value) {
    this.children = [];
    if (value !== '' && value != null) this.appendChild(new TextNode(String(value)));
  }
  get textContent() { return this.children.map((c) => c.textContent).join(''); }
}
function tree(node, out = []) {
  node.children.forEach((c) => { if (c.nodeType === 1) { out.push(c); tree(c, out); } });
  return out;
}
const byTag = (node, tag) => tree(node).filter((n) => n.tagName === tag.toUpperCase());
const byClass = (node, cls) => tree(node).filter((n) => (n.getAttribute('class') || '').split(/\s+/).includes(cls));

function makeDocument(base) {
  const body = { children: [], nodeType: 1 };
  const doc = {
    readyState: 'complete', activeElement: null, body,
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
  const filters = add('div', { id: 'animalFilters' }, body, { hidden: true });
  const f1 = add('label', { id: 'categoryFilterField' }, filters);
  add('select', { id: 'categoryFilter' }, f1);
  const f2 = add('label', { id: 'speciesFilterField' }, filters);
  add('select', { id: 'speciesFilter' }, f2);
  const f3 = add('label', { id: 'habitatFilterField' }, filters, { hidden: true });
  add('select', { id: 'habitatFilter' }, f3);
  add('button', { id: 'clearFilters' }, filters);
  add('p', { id: 'animalCount', 'aria-live': 'polite' }, filters, { hidden: true });
  const status = add('p', { id: 'animalStatus', role: 'status' }, body);
  status.textContent = 'Cargando especies…';
  add('div', { id: 'animalGrid', 'aria-busy': 'true' }, body);
  add('p', { id: 'noAnimals' }, body, { hidden: true });
  return doc;
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 12; i += 1) await new Promise((r) => setImmediate(r)); };
const json = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });

function mount({ base = 'http://localhost:8000/api/v1', fetchImpl, timers, withApp = true } = {}) {
  const doc = makeDocument(base === null ? undefined : base);
  const calls = [];
  const sandbox = {
    document: doc, URLSearchParams, AbortController, URL, console,
    setTimeout: timers?.setTimeout ?? setTimeout, clearTimeout: timers?.clearTimeout ?? clearTimeout,
    fetch: (url, opts) => { calls.push({ url, opts }); return fetchImpl(url, opts); }
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(apiJs, ctx);
  const start = () => vm.runInContext(animalsJs, ctx);
  if (withApp) start();
  const $ = (id) => doc.getElementById(id);
  const cards = () => byTag($('animalGrid'), 'article');
  const opts = (id) => byTag($(id), 'option').map((o) => ({ value: o.value, label: o.textContent }));
  return { doc, calls, ctx, start, $, cards, opts, api: ctx.ArcaApi, app: () => ctx.ArcaTulanpedia };
}

const sp = (n, extra = {}) => ({ id: n, common_name: `Especie ${n}`, category: null, image_url: null, ...extra });
const ok = (list) => () => json({ data: list });

/* ---------- CA-10 ---------- */
test('CA-10 dynamic-tulanpedia: getSpecies pide {base}/published-species con credentials omit, Accept application/json, 10 s y la base de la meta', async () => {
  const timers = [];
  const m = mount({
    base: 'http://api.example.test/api/v1/',
    fetchImpl: ok([sp(1)]),
    timers: { setTimeout: (fn, ms) => { timers.push(ms); return 1; }, clearTimeout() {} },
    withApp: false
  });
  const result = await m.api.getSpecies();
  assert.equal(result.ok, true);
  assert.equal(m.calls.length, 1);
  assert.equal(m.calls[0].url, 'http://api.example.test/api/v1/published-species');
  assert.equal(m.calls[0].opts.method, 'GET');
  assert.equal(m.calls[0].opts.credentials, 'omit');
  assert.equal(m.calls[0].opts.headers.Accept, 'application/json');
  assert.deepEqual(timers, [10000]);
  assert.ok(!/fetch\(/.test(animalsJs), 'animals.js no llama a fetch');
});

test('CA-10 dynamic-tulanpedia: getSpecies devuelve {ok:false, reason} con red caída, 500, JSON inválido y data ausente', async () => {
  const cases = [
    [() => Promise.reject(new Error('down')), 'network'],
    [() => json({}, false), 'http'],
    [() => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('bad json')) }), 'invalid'],
    [() => json({ meta: {} }), 'invalid']
  ];
  for (const [impl, reason] of cases) {
    const m = mount({ fetchImpl: impl, withApp: false });
    const result = await m.api.getSpecies();
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
  }
});

/* ---------- Helpers: CA-09, CA-19, CA-11 ---------- */
test('CA-09 dynamic-tulanpedia: safeImageUrl acepta solo http, https y rutas que empiezan por /; rechaza javascript:, data:, //host, rutas sin barra y valores no string', () => {
  const { safeImageUrl } = mount({ fetchImpl: ok([]), withApp: true }).app().helpers;
  assert.equal(safeImageUrl('https://x.test/a.webp'), 'https://x.test/a.webp');
  assert.equal(safeImageUrl('http://x.test/a.webp'), 'http://x.test/a.webp');
  assert.equal(safeImageUrl('/media/species/a.webp'), '/media/species/a.webp');
  for (const bad of [null, undefined, 3, {}, '', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil.test/a.png', '/\\evil.test', 'media/a.png', 'ftp://x.test/a', 'https://']) {
    assert.equal(safeImageUrl(bad), null, String(bad));
  }
});

test('CA-19 dynamic-tulanpedia: fieldRows devuelve solo los campos con valor válido, con las etiquetas exactas de la spec', () => {
  const { fieldRows } = mount({ fetchImpl: ok([]) }).app().helpers;
  const all = fieldRows({
    category: 'mammal', scientific_name: 'Panthera leo', origin: 'África', habitat: 'Sabana',
    conservation_status: 'Vulnerable', size_cm: 120, gestation_period: '110 días', diet: 'Carnívora',
    longevity: '15 años', characteristics: 'Melena'
  });
  assert.deepEqual(plain(all.map((r) => r.label)), [
    'Tipo de animal', 'Nombre científico', 'Área de distribución natural', 'Hábitat', 'Estado de conservación',
    'Tamaño', 'Gestación', 'Alimentación', 'Esperanza de vida', 'Características'
  ]);
  assert.equal(all[0].text, 'Mamífero');
  assert.equal(all[5].text, '120 cm');
  assert.deepEqual(plain(fieldRows({ category: null, scientific_name: '  ', habitat: null, size_cm: {}, diet: false, origin: ['x'] })), []);
  assert.deepEqual(plain(fieldRows({ habitat: ' Bosque ' })), [{ label: 'Hábitat', text: 'Bosque' }]);
});

test('CA-11 dynamic-tulanpedia: categoryLabel no toma valores heredados (constructor, __proto__) y muestra las claves desconocidas tal como llegan', () => {
  const { categoryLabel } = mount({ fetchImpl: ok([]) }).app().helpers;
  assert.equal(categoryLabel('constructor'), 'constructor');
  assert.equal(categoryLabel('__proto__'), '__proto__');
  assert.equal(categoryLabel('toString'), 'toString');
  assert.equal(categoryLabel('marsupial'), 'marsupial');
  assert.equal(categoryLabel('mammal'), 'Mamífero');
});

/* ---------- Marcado de index.html: CA-08, CA-12, CA-13, CA-18, CA-23 ---------- */
test('CA-08 dynamic-tulanpedia: index.html no tiene las cuatro fichas de muestra, demo-note, model-note, data-model ni .glb dentro de #animales', () => {
  assert.ok(!/<article[^>]*animal-card/.test(animalesHtml), 'sin article.animal-card fijas');
  for (const forbidden of ['demo-note', 'model-note', 'data-model', '.glb', 'Fichas de muestra', 'León', 'Guacamaya', 'Tortuga']) {
    assert.ok(!animalesHtml.includes(forbidden), forbidden);
  }
  for (const stale of ['Sabana', 'Bosque', 'Aviario', 'Reptilario', 'data-species', 'data-habitat']) {
    assert.ok(!animalesHtml.includes(stale), stale);
  }
});

test('CA-12 dynamic-tulanpedia: index.html conserva los IDs de la sección y las referencias a script.js, animations.js, accessibility.js, js/api.js y js/animals.js', () => {
  for (const id of ['animales', 'speciesFilter', 'habitatFilter', 'categoryFilter', 'clearFilters', 'animalCount', 'animalGrid', 'noAnimals', 'animalStatus', 'mapModelToggle']) {
    assert.ok(indexHtml.includes(`id="${id}"`), id);
  }
  for (const file of ['script.js', 'animations.js', 'accessibility.js', 'js/api.js', 'js/animals.js']) {
    assert.ok(new RegExp(`<script src="${file.replace('.', '\\.')}" defer></script>`).test(indexHtml), file);
  }
  assert.ok(indexHtml.indexOf('js/api.js') < indexHtml.indexOf('js/animals.js'), 'animals.js va después de api.js');
  assert.ok(indexHtml.includes('href="animals.css"'));
  assert.ok(indexHtml.includes('var viewerLoaded = false;'), 'viewerLoaded sigue para el mapa');
  assert.ok(!indexHtml.includes('.animal-card[data-model]'), 'sin bloque de visor de tarjetas');
});

test('CA-12 dynamic-tulanpedia: script.js no referencia .animal-card, speciesFilter, habitatFilter, clearFilters, animalCount ni noAnimals', () => {
  for (const name of ['.animal-card', 'speciesFilter', 'habitatFilter', 'clearFilters', 'animalCount', 'noAnimals', 'animalCards', 'filterAnimals']) {
    assert.ok(!scriptJs.includes(name), name);
  }
  assert.ok(scriptJs.includes("const searchInput = $('searchInput');"), 'ancla de relocation.test.mjs');
  assert.ok(scriptJs.includes('$(\'animales\').scrollIntoView'), 'el buscador lleva a #animales');
});

const SECTION_BASELINE = ['porque-visitar', 'animales', 'mapa', 'ubicacion', 'instalaciones', 'noticias', 'eventos', 'boletos', 'preguntas', 'galeria', 'cognitivePanel'];
test('CA-13 dynamic-tulanpedia: el orden de secciones coincide con la línea base de T-01 y #animales va antes de #mapa', () => {
  const ids = [...indexHtml.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((x) => x[1]);
  assert.deepEqual(ids, SECTION_BASELINE);
  assert.ok(ids.indexOf('animales') < ids.indexOf('mapa'));
});

test('CA-18 dynamic-tulanpedia: #animales no tiene carrusel, visor 3D, data-model, .glb ni la jirafa', () => {
  for (const forbidden of ['carousel', 'carrusel', 'model-viewer', 'data-model', '.glb', 'jirafa', 'Jirafa', 'giraffe']) {
    assert.ok(!animalesHtml.includes(forbidden), forbidden);
  }
  for (const code of [animalsJs, animalsCss]) {
    assert.ok(!/carousel|\.glb|model-viewer|data-model/i.test(code));
  }
});

test('CA-23 dynamic-tulanpedia: la introducción de #animales dice exactamente el texto de la spec y no contiene la frase de búsqueda por nombre', () => {
  const intro = 'Filtra las especies por tipo de animal, especie o hábitat. En cada ficha verás la información que el zoológico ha publicado para la especie.';
  assert.ok(animalesHtml.includes(`<p>${intro}</p>`));
  assert.ok(!/busca por nombre/i.test(animalesHtml));
  assert.ok(animalesHtml.includes('Encuentros inolvidables'));
  assert.ok(animalesHtml.includes('<h2>TulanPedia</h2>'));
});

/* ---------- Estados: CA-05, CA-06, CA-07 ---------- */
test('CA-05 dynamic-tulanpedia: antes de resolver la petición, #animalStatus anuncia «Cargando especies…» con role="status" y #animalGrid tiene aria-busy="true"', async () => {
  let release;
  const m = mount({ fetchImpl: () => new Promise((resolve) => { release = resolve; }) });
  await flush();
  assert.equal(m.$('animalStatus').textContent, 'Cargando especies…');
  assert.equal(m.$('animalStatus').getAttribute('role'), 'status');
  assert.equal(m.$('animalStatus').hidden, false);
  assert.equal(m.$('animalGrid').getAttribute('aria-busy'), 'true');
  assert.equal(m.$('animalFilters').hidden, true);
  assert.match(animalesHtml, /id="animalStatus" role="status"/);
  assert.match(animalesHtml, /id="animalGrid" aria-busy="true"/);
  release({ ok: true, json: () => Promise.resolve({ data: [sp(1)] }) });
  await flush();
  assert.equal(m.$('animalGrid').getAttribute('aria-busy'), 'false');
});

test('CA-06 dynamic-tulanpedia: data vacío muestra «Aún no hay especies publicadas.» sin tarjetas, filtros, contador ni #noAnimals', async () => {
  const m = mount({ fetchImpl: ok([]) });
  await flush();
  assert.equal(m.$('animalStatus').textContent, 'Aún no hay especies publicadas.');
  assert.equal(m.$('animalStatus').hidden, false);
  assert.equal(m.cards().length, 0);
  assert.equal(m.$('animalFilters').hidden, true);
  assert.equal(m.$('animalCount').hidden, true);
  assert.equal(m.$('noAnimals').hidden, true);
});

test('CA-07 dynamic-tulanpedia: red caída, 500, JSON inválido y data ausente muestran el error con #animalRetry, sin datos previos; «Reintentar» pide de nuevo, muestra la carga y mueve el foco', async () => {
  const failures = [
    () => Promise.reject(new Error('down')),
    () => json({}, false),
    () => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('bad')) }),
    () => json({ meta: {} })
  ];
  for (const failure of failures) {
    const m = mount({ fetchImpl: failure });
    await flush();
    assert.match(m.$('animalStatus').textContent, /^No pudimos cargar las especies\. Inténtalo más tarde\.Reintentar$/);
    assert.equal(m.$('animalStatus').getAttribute('role'), 'status');
    const retry = m.$('animalRetry');
    assert.ok(retry);
    assert.equal(retry.textContent, 'Reintentar');
    assert.equal(m.cards().length, 0);
    assert.equal(m.$('animalFilters').hidden, true);
  }

  /* error -> reintento ok: datos nuevos, foco en la cuadrícula; error -> reintento fallido: foco en el botón */
  let mode = 'fail';
  let release;
  const m = mount({ fetchImpl: () => (mode === 'fail' ? Promise.reject(new Error('x')) : new Promise((r) => { release = r; })) });
  await flush();
  assert.equal(m.calls.length, 1);
  m.$('animalRetry').click();
  assert.equal(m.$('animalStatus').textContent, 'Cargando especies…', 'muestra la carga');
  assert.equal(m.doc.activeElement, m.$('animalStatus'), 'foco en el estado de carga');
  assert.equal(m.$('animalGrid').getAttribute('aria-busy'), 'true');
  await flush();
  assert.equal(m.calls.length, 2, 'pide de nuevo');
  assert.equal(m.doc.activeElement, m.$('animalRetry'), 'si vuelve a fallar, foco en el botón');
  mode = 'ok';
  m.$('animalRetry').click();
  assert.equal(m.$('animalRetry'), null, 'sin botón durante la carga');
  await flush();
  release({ ok: true, json: () => Promise.resolve({ data: [sp(1)] }) });
  await flush();
  assert.equal(m.cards().length, 1);
  assert.equal(m.doc.activeElement, m.$('animalGrid'), 'tras éxito, foco en el contenido');
  assert.equal(m.$('animalStatus').hidden, true);
});

/* ---------- Tarjetas: CA-01, CA-02, CA-09, CA-11, CA-19 ---------- */
test('CA-01 dynamic-tulanpedia: una tarjeta por especie, en el orden recibido, sin tarjetas fijas en #animales; cada tarjeta tiene nombre y foto', async () => {
  const list = [sp(3, { image_url: 'https://x.test/3.webp' }), sp(1, { image_url: 'https://x.test/1.webp' }), sp(2, { image_url: null })];
  const m = mount({ fetchImpl: ok(list) });
  await flush();
  assert.equal(m.calls.length, 1);
  assert.ok(m.calls[0].url.endsWith('/published-species'));
  assert.equal(m.cards().length, 3);
  assert.deepEqual(byTag(m.$('animalGrid'), 'h3').map((h) => h.textContent), ['Especie 3', 'Especie 1', 'Especie 2']);
  m.cards().forEach((card) => assert.equal(byClass(card, 'tp-media').length, 1));
  assert.equal(byTag(m.cards()[0], 'img')[0].src, 'https://x.test/3.webp');
  assert.ok(!/<article/.test(animalesHtml), 'sin tarjetas fijas');
  assert.equal(m.$('animalStatus').hidden, true);
});

test('CA-02 dynamic-tulanpedia: se dibuja exactamente lo recibido; una especie que no llega no genera tarjeta', async () => {
  const m = mount({ fetchImpl: ok([sp(1), sp(2)]) });
  await flush();
  assert.equal(m.cards().length, 2);
  assert.ok(!m.cards().some((c) => c.textContent.includes('Especie 3')));
  const invalid = mount({ fetchImpl: ok([sp(1), null, 'x', { id: 9 }, { common_name: '  ' }, [], sp(2)]) });
  await flush();
  assert.equal(invalid.cards().length, 2, 'los elementos inválidos se omiten');
  const allInvalid = mount({ fetchImpl: ok([null, 3]) });
  await flush();
  assert.equal(allInvalid.$('animalStatus').textContent, 'Aún no hay especies publicadas.');
});

test('CA-09 dynamic-tulanpedia: https con loading, decoding y alt; null, javascript:, data:, //host y error de carga muestran placeholder con aria-hidden en la misma caja', async () => {
  const m = mount({
    fetchImpl: ok([
      sp(1, { image_url: 'https://x.test/a.webp' }), sp(2, { image_url: null }), sp(3, { image_url: 'javascript:alert(1)' }),
      sp(4, { image_url: 'data:image/png;base64,AAAA' }), sp(5, { image_url: '//evil.test/a.png' }), sp(6, { image_url: 'https://x.test/broken.webp' })
    ])
  });
  await flush();
  const cards = m.cards();
  const img = byTag(cards[0], 'img')[0];
  assert.equal(img.getAttribute('loading'), 'lazy');
  assert.equal(img.getAttribute('decoding'), 'async');
  assert.equal(img.getAttribute('alt'), 'Especie 1');
  for (const i of [1, 2, 3, 4]) {
    assert.equal(byTag(cards[i], 'img').length, 0, `tarjeta ${i + 1} sin img`);
    const ph = byClass(cards[i], 'tp-placeholder')[0];
    assert.equal(ph.getAttribute('aria-hidden'), 'true');
    assert.equal(ph.parentNode.getAttribute('class'), 'tp-media', 'misma caja');
  }
  const broken = byTag(cards[5], 'img')[0];
  broken.dispatch('error');
  assert.equal(byTag(cards[5], 'img').length, 0);
  const ph = byClass(cards[5], 'tp-placeholder')[0];
  assert.equal(ph.getAttribute('aria-hidden'), 'true');
  assert.equal(ph.parentNode.getAttribute('class'), 'tp-media');
});

test('CA-09 dynamic-tulanpedia: CSS de la caja de imagen con object-fit contain, sin cover ni fill, con var(--surface-subtle) y con la guarda de zoom', () => {
  assert.match(animalsCss, /\.tp-media img \{[^}]*object-fit: contain;/);
  assert.match(animalsCss, /\.tp-media \{[^}]*background: var\(--surface-subtle\)/);
  assert.match(animalsCss, /\.tp-media \{[^}]*aspect-ratio: 4 \/ 3/);
  assert.ok(!/object-fit:\s*(cover|fill)/.test(animalsCss));
  assert.match(animalsCss, /\.animal-card:hover \.tp-media img \{ transform: none; transition: none; \}/);
  assert.ok(!/transform:/.test(animalsCss.replace(/transform: none;/g, '')), 'sin transform salvo la guarda');
  assert.ok(!/:\s*#[0-9a-fA-F]{3,8}\s*[;}]/.test(animalsCss), 'sin colores hexadecimales');
});

test('CA-11 dynamic-tulanpedia: <img src=x onerror=…> en nombre, hábitat, origen y URL se muestra como texto y no crea elementos', async () => {
  const evil = '<img src=x onerror=alert(1)>';
  const m = mount({ fetchImpl: ok([sp(1, { common_name: evil, habitat: evil, origin: evil, scientific_name: evil, category: evil, image_url: evil })]) });
  await flush();
  const card = m.cards()[0];
  assert.equal(byTag(card, 'h3')[0].textContent, evil);
  assert.ok(byTag(card, 'dd').every((d) => d.textContent === evil));
  assert.equal(byTag(card, 'img').length, 0, 'no se crea ningún img (la URL no es válida)');
  assert.equal(byTag(card, 'script').length, 0);
  assert.ok(m.opts('speciesFilter').some((o) => o.label === evil));
});

test('CA-19 dynamic-tulanpedia: combinaciones de campos: nombre y foto siempre; filas solo con valor; sin bloque «Conocer más» si no hay filas; category null omitida', async () => {
  const m = mount({
    fetchImpl: ok([
      sp(1, { scientific_name: 'Panthera leo', origin: 'África', habitat: 'Sabana', category: 'mammal', created_by: 'secret-user', reviewed_by: 'secret-reviewer', is_published: 1, image_path: 'secret/path' }),
      sp(2),
      sp(3, { habitat: 'Bosque' })
    ])
  });
  await flush();
  const [a, b, c] = m.cards();
  assert.equal(byClass(a, 'tp-details-title')[0].textContent, 'Conocer más sobre la especie');
  assert.deepEqual(byTag(a, 'dt').map((n) => n.textContent), ['Tipo de animal', 'Nombre científico', 'Área de distribución natural', 'Hábitat']);
  assert.deepEqual(byTag(a, 'dd').map((n) => n.textContent), ['Mamífero', 'Panthera leo', 'África', 'Sabana']);
  for (const secret of ['secret-user', 'secret-reviewer', 'secret/path']) assert.ok(!a.textContent.includes(secret), secret);
  assert.equal(byClass(b, 'tp-details').length, 0, 'sin bloque si no hay campos opcionales');
  assert.equal(byTag(b, 'h3')[0].textContent, 'Especie 2');
  assert.equal(byClass(b, 'tp-media').length, 1);
  assert.deepEqual(byTag(c, 'dt').map((n) => n.textContent), ['Hábitat']);
});

/* ---------- Filtros: CA-03, CA-04, CA-21, CA-22 ---------- */
const catalog = () => [
  sp(1, { common_name: 'León', category: 'mammal', habitat: 'Sabana' }),
  sp(2, { common_name: 'Guacamaya', category: 'bird', habitat: ' sabana ' }),
  sp(3, { common_name: 'Águila', category: 'bird', habitat: 'Bosque' }),
  sp(4, { common_name: 'Tortuga', category: 'reptile', habitat: null }),
  sp(5, { common_name: 'Cebra' })
];
const visible = (m) => m.cards().filter((c) => !c.hidden).map((c) => byTag(c, 'h3')[0].textContent);

test('CA-03 dynamic-tulanpedia: filtros combinados sobre la lista en memoria; contador singular y plural; «Limpiar filtros» restablece los tres; sin peticiones adicionales', async () => {
  const m = mount({ fetchImpl: ok(catalog()) });
  await flush();
  assert.equal(m.$('animalFilters').hidden, false);
  assert.equal(m.$('animalCount').hidden, false);
  assert.equal(m.$('animalCount').textContent, '5 especies encontradas');
  const pick = (id, value) => { m.$(id).value = value; m.$(id).dispatch('change'); };
  pick('categoryFilter', 'bird');
  assert.deepEqual(visible(m), ['Guacamaya', 'Águila']);
  assert.equal(m.$('animalCount').textContent, '2 especies encontradas');
  pick('habitatFilter', 'sabana');
  assert.deepEqual(visible(m), ['Guacamaya']);
  assert.equal(m.$('animalCount').textContent, '1 especie encontrada');
  pick('speciesFilter', 'León');
  assert.deepEqual(visible(m), []);
  assert.equal(m.$('noAnimals').hidden, false);
  assert.equal(m.$('animalCount').textContent, '0 especies encontradas');
  m.$('clearFilters').click();
  assert.equal(m.$('speciesFilter').value, '');
  assert.equal(m.$('habitatFilter').value, '');
  assert.equal(m.$('categoryFilter').value, '');
  assert.equal(visible(m).length, 5);
  assert.equal(m.$('noAnimals').hidden, true);
  assert.equal(m.doc.activeElement, m.$('clearFilters'));
  pick('speciesFilter', 'Tortuga');
  assert.deepEqual(visible(m), ['Tortuga']);
  assert.equal(m.calls.length, 1, 'cero peticiones adicionales');
});

test('CA-04 dynamic-tulanpedia: opciones ordenadas con «Todas» primero; hábitats sin distinguir mayúsculas con la primera forma; null y vacíos descartados; sin valores fijos en el HTML; etiquetas de category en español', async () => {
  const list = catalog().concat([sp(6, { common_name: 'León', habitat: 'SABANA', category: 'fish' }), sp(7, { common_name: 'Rana', habitat: '   ', category: 'amphibian' }), sp(8, { common_name: 'Pulpo', category: 'invertebrate' }), sp(9, { common_name: 'Otro', category: 'marsupial' })]);
  const m = mount({ fetchImpl: ok(list) });
  await flush();
  assert.deepEqual(m.opts('speciesFilter').map((o) => o.label), ['Todas las especies', 'Águila', 'Cebra', 'Guacamaya', 'León', 'Otro', 'Pulpo', 'Rana', 'Tortuga']);
  assert.equal(m.opts('speciesFilter')[0].value, '');
  assert.deepEqual(m.opts('habitatFilter').map((o) => o.label), ['Todos los hábitats', 'Bosque', 'Sabana']);
  assert.deepEqual(m.opts('categoryFilter').map((o) => o.label), ['Todos los tipos', 'Anfibio', 'Ave', 'Invertebrado', 'marsupial', 'Mamífero', 'Pez', 'Reptil'].sort((a, b) => (a === 'Todos los tipos' ? -1 : b === 'Todos los tipos' ? 1 : a.localeCompare(b, 'es'))));
  assert.ok(!animalesHtml.includes('<option'), 'sin opciones fijas en el HTML');
  /* una especie sin hábitat sale con «Todos» y en su opción de «Especie», pero no al filtrar por hábitat */
  m.$('habitatFilter').value = 'sabana';
  m.$('habitatFilter').dispatch('change');
  assert.ok(!visible(m).includes('Tortuga'));
  m.$('habitatFilter').value = '';
  m.$('habitatFilter').dispatch('change');
  assert.ok(visible(m).includes('Tortuga'));
  m.$('speciesFilter').value = 'Tortuga';
  m.$('speciesFilter').dispatch('change');
  assert.deepEqual(visible(m), ['Tortuga']);
});

test('CA-21 dynamic-tulanpedia: sin habitat válido el filtro de hábitat queda oculto; con al menos una especie, «Especie» está visible', async () => {
  const m = mount({ fetchImpl: ok([sp(1, { habitat: null }), sp(2, { habitat: '  ' }), sp(3)]) });
  await flush();
  assert.equal(m.$('habitatFilterField').hidden, true);
  assert.equal(m.$('speciesFilterField').hidden, false);
  assert.equal(m.$('animalFilters').hidden, false);
  const withHabitat = mount({ fetchImpl: ok([sp(1, { habitat: 'Bosque' })]) });
  await flush();
  assert.equal(withHabitat.$('habitatFilterField').hidden, false);
});

test('CA-22 dynamic-tulanpedia: tres casos de tipo: varias categorías; una sola (visible, no se oculta); ninguna (solo «Todos los tipos», deshabilitado)', async () => {
  const many = mount({ fetchImpl: ok([sp(1, { category: 'bird' }), sp(2, { category: 'mammal' })]) });
  await flush();
  assert.deepEqual(many.opts('categoryFilter').map((o) => o.label), ['Todos los tipos', 'Ave', 'Mamífero']);
  assert.equal(many.$('categoryFilterField').hidden, false);
  assert.equal(many.$('categoryFilter').disabled, false);

  const one = mount({ fetchImpl: ok([sp(1, { category: 'bird' }), sp(2, { category: 'bird' })]) });
  await flush();
  assert.deepEqual(one.opts('categoryFilter').map((o) => o.label), ['Todos los tipos', 'Ave']);
  assert.equal(one.$('categoryFilterField').hidden, false);
  assert.equal(one.$('categoryFilter').disabled, false);
  one.$('categoryFilter').value = 'bird';
  one.$('categoryFilter').dispatch('change');
  assert.equal(visible(one).length, 2);

  const none = mount({ fetchImpl: ok([sp(1), sp(2, { category: '' })]) });
  await flush();
  assert.deepEqual(none.opts('categoryFilter').map((o) => o.label), ['Todos los tipos']);
  assert.equal(none.$('categoryFilterField').hidden, false);
  assert.equal(none.$('categoryFilter').disabled, true);
});

/* ---------- Visibilidad y republicación: CA-20, CA-24 ---------- */
test('CA-20 dynamic-tulanpedia: data vacío no cambia el HTML; en una segunda carga con una especie aparece sin cambios en index.html', async () => {
  const before = read('index.html');
  let data = [];
  const m = mount({ fetchImpl: () => json({ data }) });
  await flush();
  assert.equal(m.$('animalStatus').textContent, 'Aún no hay especies publicadas.');
  assert.equal(m.$('animalFilters').hidden, true);
  assert.equal(m.$('noAnimals').hidden, true);
  data = [sp(1, { common_name: 'León' })];
  await m.app().load({ refocus: true });
  assert.equal(m.cards().length, 1);
  assert.equal(m.$('animalStatus').hidden, true);
  assert.equal(m.$('animalFilters').hidden, false);
  assert.equal(read('index.html'), before, 'index.html no cambia');
});

test('CA-24 dynamic-tulanpedia: una especie que no viene en la respuesta no genera tarjeta; cuando vuelve en la carga siguiente, aparece sin cambiar el HTML', async () => {
  const before = read('index.html');
  let data = [sp(1, { common_name: 'León' }), sp(2, { common_name: 'Cebra' })];
  const m = mount({ fetchImpl: () => json({ data }) });
  await flush();
  assert.equal(m.cards().length, 2);
  data = [sp(1, { common_name: 'León' })];
  await m.app().load();
  assert.deepEqual(visible(m), ['León']);
  assert.ok(!m.opts('speciesFilter').some((o) => o.label === 'Cebra'), 'sin datos de la carga anterior');
  data = [sp(1, { common_name: 'León' }), sp(2, { common_name: 'Cebra' })];
  await m.app().load();
  assert.deepEqual(visible(m), ['León', 'Cebra']);
  assert.equal(read('index.html'), before);
});

/* ---------- CSS y accesibilidad: CA-14 ---------- */
test('CA-14 dynamic-tulanpedia: CSS con min-width 0, max-width 100% en imágenes, :focus-visible en #animalRetry y #clearFilters, y reglas para 360 px; h2 de sección, h3 por especie y role="status" en #animalStatus', async () => {
  assert.match(animalsCss, /\.animal-card \{ min-width: 0; \}/);
  assert.match(animalsCss, /\.tp-media img \{[^}]*max-width: 100%/);
  assert.match(animalsCss, /\.tp-media \{[^}]*min-width: 0/);
  assert.match(animalsCss, /#animalRetry:focus-visible[\s\S]*?#clearFilters:focus-visible[\s\S]*?outline: 3px solid var\(--primary\)/);
  assert.match(animalsCss, /@media \(max-width: 480px\)[\s\S]*width: 100%/);
  assert.match(animalesHtml, /<h2>TulanPedia<\/h2>/);
  assert.match(animalesHtml, /id="animalStatus" role="status"/);
  const m = mount({ fetchImpl: ok([sp(1)]) });
  await flush();
  assert.equal(byTag(m.cards()[0], 'h3').length, 1);
  assert.equal(byTag(m.cards()[0], 'h4').length, 0);
});

/* ---------- Pruebas estáticas: CA-11, CA-15, CA-17 ---------- */
test('CA-11 dynamic-tulanpedia: revisión estática de innerHTML, outerHTML, insertAdjacentHTML, document.write, eval y new Function en js/', () => {
  for (const [name, code] of [['animals.js', animalsJs], ['api.js', apiJs]]) {
    for (const banned of [/innerHTML/, /outerHTML/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function/]) {
      assert.ok(!banned.test(code), `${name}: ${banned}`);
    }
  }
});

test('CA-15 dynamic-tulanpedia: las tres páginas tienen la misma meta arca-api-base terminada en /api/v1', () => {
  const contents = Object.entries(pages).map(([name, html]) => {
    const metas = [...html.matchAll(/<meta\s+name="arca-api-base"\s+content="([^"]*)"/g)];
    assert.equal(metas.length, 1, name);
    return metas[0][1];
  });
  assert.ok(contents.every((c) => c === contents[0]));
  assert.match(contents[0], /\/api\/v1$/);
  assert.ok(!/arca-api-base|apiBase/.test(animalsJs), 'la sección no define otra base de API');
});

test('CA-17 dynamic-tulanpedia: sin package.json, sin almacenamiento, credentials solo omit y sin recursos remotos nuevos', () => {
  assert.ok(!existsSync(path.resolve(src, '..', 'package.json')));
  for (const [name, code] of [['animals.js', animalsJs], ['api.js', apiJs], ['animals.css', animalsCss]]) {
    for (const banned of [/localStorage/, /sessionStorage/, /document\.cookie/, /indexedDB/i]) assert.ok(!banned.test(code), `${name}: ${banned}`);
  }
  for (const [, mode] of apiJs.matchAll(/credentials:\s*'([^']+)'/g)) assert.equal(mode, 'omit');
  assert.ok(!/https?:\/\//.test(animalsCss) && !/@import|url\(/.test(animalsCss));
  assert.ok(!/https?:\/\//.test(animalsJs.replace(/\/\*[\s\S]*?\*\//g, '')));
  assert.ok(!/https?:\/\//.test(animalesHtml));
  const scripts = [...indexHtml.matchAll(/<script\s+src="([^"]+)"/g)].map((x) => x[1]);
  assert.ok(scripts.every((s) => !/^(https?:)?\/\//.test(s)), 'solo scripts locales');
  const imports = [...read('tests/animals.test.mjs').matchAll(/^import .* from '([^']+)'/gm)].map((x) => x[1]);
  assert.ok(imports.every((i) => i.startsWith('node:')));
});

/* ---------- Cobertura: CA-16 ---------- */
test('CA-16 dynamic-tulanpedia: cada criterio tiene su prueba (CA-01 a CA-24)', () => {
  const self = read('tests/animals.test.mjs');
  const names = new Set([...self.matchAll(/^test\('CA-(\d{2}) dynamic-tulanpedia/gm)].map((x) => x[1]));
  for (let i = 1; i <= 24; i += 1) assert.ok(names.has(String(i).padStart(2, '0')), `CA-${String(i).padStart(2, '0')}`);
});

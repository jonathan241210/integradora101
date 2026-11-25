import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const api = read('js/api.js');
const directory = read('js/map-directory.js');
const html = read('index.html');

function createGroup() {
  const status = { textContent: '' };
  const list = {
    hidden: true,
    names: [],
    replaceChildren(fragment) {
      this.names = fragment.children.map(item => item.label.textContent);
    }
  };
  return { status, list, querySelector: selector => selector === 'ul' ? list : status };
}

function openDirectory(enclosures, places) {
  const groups = { mapEnclosures: createGroup(), mapPlaces: createGroup() };
  for (const id of ['enclosurePins', 'placePins']) {
    groups[id] = { id, markers: [], replaceChildren(fragment) { this.markers = fragment.children; } };
  }
  for (const id of ['directorySearch', 'directoryType']) {
    groups[id] = { value: '', addEventListener(event, listener) { this[event] = listener; } };
  }
  groups.mapEnclosures.id = 'mapEnclosures';
  groups.mapPlaces.id = 'mapPlaces';
  const handlers = new Map();
  function attachModel() {
    const model = { pins: [], appendChild(pin) { this.pins.push(pin); } };
    groups.mapModel = model;
    handlers.get('zoo-map-model-created')({ detail: model });
    return model;
  }
  const requests = [];
  const catalogs = new Map([['/api/v1/enclosures', enclosures], ['/api/v1/zoo-places', places]]);
  const context = vm.createContext({
    AbortController, URLSearchParams, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      requests.push([url, options.credentials]);
      assert.ok(catalogs.has(url));
      const data = await catalogs.get(url);
      return { ok: data !== null, json: async () => ({ data }) };
    },
    document: {
      addEventListener(name, fn) { handlers.set(name, fn); },
      querySelector: () => null,
      getElementById: id => groups[id],
      createElement(tag) {
        return { tag, style: {}, setAttribute(k, v) { this[k] = v; }, addEventListener() {}, appendChild(label) { this.label = label; } };
      },
      createDocumentFragment() {
        return { children: [], appendChild(node) { this.children.push(node); } };
      }
    }
  });
  vm.runInContext(api, context);
  vm.runInContext(directory, context);
  return { ...groups, requests, attachModel };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('CA-08 isometric-zoo-map lista los dos catálogos públicos con sus nombres y sin exigir coordenadas', async () => {
  const dir = openDirectory([
    { id: 8, name: 'Recinto 10' }, { id: 5, name: 'Recinto 2', map_x: null }
  ], [
    { id: 8, name: '<Fuente>' }, { id: 9, name: '<Fuente>' }
  ]);
  await settle();
  assert.deepEqual(dir.requests, [['/api/v1/enclosures', 'omit'], ['/api/v1/zoo-places', 'omit']]);
  assert.deepEqual(dir.mapEnclosures.list.names, ['Recinto 2', 'Recinto 10']);
  assert.deepEqual(dir.mapPlaces.list.names, ['<Fuente>', '<Fuente>']);
  assert.equal(dir.mapPlaces.status.textContent, '2 lugares');
  assert.equal(dir.mapEnclosures.list.hidden, false);
  assert.equal(dir.mapPlaces.list.hidden, false);
  assert.match(html, /<script src="js\/map-directory\.js(?:\?[^"]*)?" defer>/);
  assert.ok(html.indexOf('src="js/api.js') < html.indexOf('src="js/map-directory.js'));
  for (const group of ['mapPlaces', 'mapEnclosures']) {
    assert.match(html, new RegExp('id="' + group + '"[^>]*>\\s*<h4 id="' + group + 'Title">[^<]+</h4>\\s*<p role="status"></p>\\s*<ul aria-labelledby="' + group + 'Title" hidden>'));
  }
});

test('CA-09 isometric-zoo-map conserva un grupo disponible aunque el otro siga cargando o falle', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const dir = openDirectory(pending, [{ id: 1, name: 'Taquilla' }]);
  assert.match(dir.mapEnclosures.status.textContent, /Cargando/);
  assert.match(dir.mapPlaces.status.textContent, /Cargando/);
  await settle();
  assert.equal(dir.mapPlaces.status.textContent, '1 lugar');
  assert.deepEqual(dir.mapPlaces.list.names, ['Taquilla']);
  assert.match(dir.mapEnclosures.status.textContent, /Cargando/);
  finish(null);
  await settle();
  assert.match(dir.mapEnclosures.status.textContent, /No se pudieron cargar los recintos/);
  assert.ok(dir.mapEnclosures.list.hidden);
  assert.deepEqual(dir.mapPlaces.list.names, ['Taquilla']);
});

test('CA-09 isometric-zoo-map distingue un catálogo vacío de una consulta fallida', async () => {
  const dir = openDirectory([], null);
  await settle();
  assert.equal(dir.mapEnclosures.status.textContent, 'No hay recintos para mostrar.');
  assert.match(dir.mapPlaces.status.textContent, /No se pudieron cargar los lugares/);
  assert.ok(dir.mapEnclosures.list.hidden && dir.mapPlaces.list.hidden);
  const emptyPlaces = openDirectory([{ name: 'Aviario' }], []);
  await settle();
  assert.equal(emptyPlaces.mapPlaces.status.textContent, 'No hay lugares de interés para mostrar.');
  assert.deepEqual(emptyPlaces.mapEnclosures.list.names, ['Aviario']);
});

test('CA-12 vincula identificadores, nombres y posiciones de ambos catálogos con la superficie ampliable', async () => {
  const dir = openDirectory([
    { id: 7, name: 'Nombre actualizado', map_x: 0.25, map_y: 0.75 },
    { id: 8, name: 'Sin posición', map_x: null, map_y: 0 },
    { id: 9, name: 'Fuera del plano', map_x: 1.1, map_y: 0.4 }
  ], [{ id: 7, name: 'Fuente', map_x: 0, map_y: 1 }]);
  await settle();
  const [a] = dir.enclosurePins.markers;
  const [b] = dir.placePins.markers;
  assert.equal(dir.enclosurePins.markers.length, 1);
  assert.deepEqual([a.id, a.label.textContent, a.style.left, a.style.top], ['enclosurePins-7', 'Nombre actualizado', '25%', '75%']);
  assert.deepEqual([b.id, b.label.textContent, b.style.left, b.style.top], ['placePins-7', 'Fuente', '0%', '100%']);
  assert.equal(dir.mapEnclosures.list.names.length, 3);
  assert.match(html, /class="map-surface">\s*<img[^>]+>\s*<div[^>]+id="enclosurePins"><\/div>\s*<div[^>]+id="placePins"/);
  assert.match(read('assets/zoo-map-v3.svg'), /id="icons_auto" display="none"/);
});

test('CA-13 isometric-zoo-map posiciona y nombra los hotspots tanto antes como después de abrir el modelo', async () => {
  let finish;
  const places = new Promise(resolve => { finish = resolve; });
  const dir = openDirectory([{ id: 2, name: 'Lémur', map_x: .5, map_y: .25 }], places);
  await settle();
  const model = dir.attachModel();
  finish([{ id: 2, name: 'Entrada', map_x: 1, map_y: 0 }, { id: 4, name: 'Sin posición', map_x: null, map_y: null }]);
  await settle();
  assert.deepEqual(model.pins.map(p => p.slot), ['hotspot-enclosurePins-2','hotspot-placePins-2']);
  assert.deepEqual(model.pins.map(p => p.label.textContent), ['Lémur','Entrada']);
  const [x,y,z] = model.pins[0]['data-position'].split(' ').map(parseFloat);
  assert.ok(Math.abs(x + .025897) < .00001 && y === .265 && Math.abs(z + 2.140369) < .00001);
  assert.equal(dir.attachModel().pins.length, 2);
});

test('CA-15 filtra por tipo y encuentra nombres con o sin acentos', async () => {
  const dir = openDirectory([{ id: 1, name: 'Águila' }, { id: 2, name: 'Jaguar' }], [{ id: 1, name: 'Taquilla' }]);
  await settle();
  dir.directorySearch.value = 'AGUILA';
  dir.directorySearch.input();
  assert.deepEqual(dir.mapEnclosures.list.names, ['Águila']);
  assert.equal(dir.mapPlaces.status.textContent, 'Sin coincidencias.');
  dir.directorySearch.value = '';
  dir.directoryType.value = 'mapPlaces';
  dir.directoryType.change();
  assert.equal(dir.mapEnclosures.hidden, true);
  assert.equal(dir.mapPlaces.hidden, false);
  assert.deepEqual(dir.mapPlaces.list.names, ['Taquilla']);
});

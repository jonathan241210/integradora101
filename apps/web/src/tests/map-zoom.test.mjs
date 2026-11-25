import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const controller = readFileSync(new URL('../js/map-viewer.js', import.meta.url), 'utf8');

function element() {
  const attributes = new Map();
  const events = new Map();
  return {
    hidden: false,
    style: {},
    classList: { add() {}, remove() {} },
    addEventListener(type, listener) { events.set(type, listener); },
    dispatch(type, event) { return events.get(type)?.(event); },
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name); },
    removeAttribute(name) { attributes.delete(name); },
    toggleAttribute(name, on) { if (on) attributes.set(name, ''); else attributes.delete(name); },
    remove() {}
  };
}

function openMap() {
  const ids = ['mapModelToggle', 'mapScene', 'mapPlan', 'mapModelStatus', 'mapZoomValue',
    'mapZoomControls', 'mapZoomIn', 'mapZoomOut', 'mapZoomReset'];
  const nodes = Object.fromEntries(ids.map(id => [id, element()]));
  const art = element();
  const plan = nodes.mapPlan;
  Object.assign(plan, { clientWidth: 400, clientHeight: 300, scrollLeft: 0, scrollTop: 0, querySelector: () => art });
  Object.defineProperties(plan, {
    scrollWidth: { get: () => plan.clientWidth * parseFloat(art.style.width || '100') / 100 },
    scrollHeight: { get: () => plan.clientHeight * parseFloat(art.style.height || '100') / 100 }
  });
  nodes.mapModelToggle.dataset = { model: 'assets/zoo-map.glb' };
  const model = element();
  model.getCameraOrbit = () => ({ theta: 1, phi: 0.7, radius: 12 });
  nodes.mapScene.appendChild = child => assert.equal(child, model);
  vm.runInNewContext(controller, {
    CustomEvent: class {},
    CSS: { escape: value => value },
    document: { dispatchEvent() {}, getElementById: id => nodes[id], createElement: () => model },
    location: { protocol: 'http:' },
    customElements: { get: () => true }
  });
  return { ...nodes, model, art };
}

test('CA-10 isometric-zoo-map amplía el plano en ambos ejes, conserva el centro visible y respeta los límites', () => {
  const { mapPlan, mapZoomIn, mapZoomOut, mapZoomReset, mapZoomValue, art } = openMap();
  assert.equal(mapZoomOut.getAttribute('aria-disabled'), 'true');
  mapZoomIn.dispatch('click');
  assert.equal(art.style.width, '125%');
  assert.equal(art.style.height, '125%');
  assert.equal(mapPlan.scrollLeft, 50);
  assert.equal(mapPlan.scrollTop, 37.5);
  mapPlan.scrollLeft = 100;
  mapZoomIn.dispatch('click');
  assert.equal(mapPlan.scrollLeft, 160);
  for (let count = 0; count < 10; count++) mapZoomIn.dispatch('click');
  assert.equal(mapZoomValue.textContent, '300 %');
  assert.equal(mapZoomIn.getAttribute('aria-disabled'), 'true');
  mapZoomReset.dispatch('click');
  mapZoomOut.dispatch('click');
  assert.equal(mapZoomValue.textContent, '100 %');
  assert.deepEqual([mapPlan.scrollLeft, mapPlan.scrollTop], [0, 0]);
});

test('CA-10 y CA-11 isometric-zoo-map mantiene los niveles de cada vista y ajusta la órbita sin perder la rotación', async () => {
  const ui = openMap();
  ui.mapZoomIn.dispatch('click');
  await ui.mapModelToggle.dispatch('click');
  ui.model.loaded = true;
  ui.model.dispatch('load');
  assert.equal(ui.mapZoomValue.textContent, '100 %');
  for (let count = 0; count < 4; count++) ui.mapZoomIn.dispatch('click');
  assert.equal(ui.model.cameraOrbit, '1rad 0.7rad 48%');
  await ui.mapModelToggle.dispatch('click');
  assert.equal(ui.mapZoomValue.textContent, '125 %');
  await ui.mapModelToggle.dispatch('click');
  assert.equal(ui.mapZoomValue.textContent, '200 %');
  ui.mapZoomOut.dispatch('click');
  assert.equal(ui.mapZoomValue.textContent, '175 %');
  ui.mapZoomReset.dispatch('click');
  assert.equal(ui.model.cameraOrbit, ui.model.getAttribute('camera-orbit'));
  assert.equal(ui.mapZoomValue.textContent, '100 %');
});

test('CA-11 isometric-zoo-map espera al modelo y recupera el zoom del plano si falla la carga', async () => {
  const ui = openMap();
  ui.mapZoomIn.dispatch('click');
  await ui.mapModelToggle.dispatch('click');
  for (const button of [ui.mapZoomIn, ui.mapZoomOut, ui.mapZoomReset]) {
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    button.dispatch('click');
  }
  assert.equal(ui.mapZoomValue.textContent, '100 %');
  ui.model.dispatch('error');
  assert.equal(ui.mapPlan.hidden, false);
  assert.equal(ui.mapZoomValue.textContent, '125 %');
  assert.equal(ui.mapZoomOut.getAttribute('aria-disabled'), 'false');
  assert.match(ui.mapModelStatus.textContent, /No se pudo cargar/);
  await ui.mapModelToggle.dispatch('click');
  await ui.mapModelToggle.dispatch('click');
  ui.model.loaded = true;
  ui.model.dispatch('load');
  assert.equal(ui.mapZoomValue.textContent, '125 %');
  assert.equal(ui.mapPlan.hidden, false);
});

test('CA-14 isometric-zoo-map arrastra solo el plano ampliado y termina el movimiento al soltar o cancelar', () => {
  const { mapPlan: plan, mapZoomIn } = openMap();
  const mouse = { pointerType: 'mouse', button: 0, pointerId: 5, clientX: 80, clientY: 60, target: { setPointerCapture() {} } };
  const move = (dx,dy) => plan.dispatch('pointermove', { ...mouse, clientX: mouse.clientX+dx, clientY: mouse.clientY+dy });
  plan.dispatch('pointerdown',mouse); move(-10,-20);
  assert.deepEqual([plan.scrollLeft,plan.scrollTop],[0,0]);
  mapZoomIn.dispatch('click');
  for (const end of ['pointerup','pointercancel','lostpointercapture']) {
    const x=plan.scrollLeft, y=plan.scrollTop;
    plan.dispatch('pointerdown',mouse); move(-10,-20);
    assert.deepEqual([plan.scrollLeft,plan.scrollTop],[x+10,y+20]);
    move(10,15);
    assert.deepEqual([plan.scrollLeft,plan.scrollTop],[x-10,y-15]);
    plan.dispatch(end,mouse); move(0,0);
    assert.deepEqual([plan.scrollLeft,plan.scrollTop],[x-10,y-15]);
  }
});

test('CA-22 y CA-23 centra cada selección al 200 %, mueve la flecha y restablece al 100 %', async () => {
  const ui = openMap();
  const pins = new Map(['hotspot-placePins-1', 'hotspot-enclosurePins-1'].map((slot, index) => {
    const pin = element();
    pin.focus = () => {};
    pin.setAttribute('data-position', index + 'm 0m 2m');
    return ['[slot="' + slot + '"]', pin];
  }));
  ui.model.querySelector = selector => pins.get(selector);
  const [first, second] = pins.values();
  const select = slot => ui.mapScene.dispatch('zoo-map-select-area', { detail: slot });

  await ui.mapModelToggle.dispatch('click');
  select('hotspot-enclosurePins-1');
  select('hotspot-placePins-1');
  ui.model.loaded = true;
  ui.model.dispatch('load');
  assert.equal(ui.model.cameraTarget, first.getAttribute('data-position'));
  assert.equal(ui.model.cameraOrbit, '1rad 0.7rad 48%');
  assert.equal(ui.mapZoomValue.textContent, '200 %');
  assert.equal(first.getAttribute('aria-current'), 'location');

  ui.mapZoomIn.dispatch('click');
  assert.equal(ui.mapZoomValue.textContent, '225 %');
  select('hotspot-enclosurePins-1');
  assert.equal(ui.mapZoomValue.textContent, '200 %');
  assert.equal(ui.model.cameraTarget, second.getAttribute('data-position'));
  assert.equal(first.getAttribute('aria-current'), undefined);
  assert.equal(second.getAttribute('aria-current'), 'location');
  ui.mapZoomReset.dispatch('click');
  assert.equal(second.getAttribute('aria-current'), undefined);
  assert.equal(ui.model.cameraTarget, 'auto auto auto');
  assert.equal(ui.mapZoomValue.textContent, '100 %');
});

test('CA-23 el nombre 3D seleccionado admite varias líneas y persiste al perder el foco', () => {
  const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const rule = styles.match(/\.model-pin\[aria-current="location"\] span\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule, 'El rótulo expandido depende de la selección del marcador');
  assert.match(rule, /white-space:\s*normal/);
  assert.match(rule, /overflow-wrap:\s*anywhere/);
  assert.match(rule, /width:\s*max-content/);
});

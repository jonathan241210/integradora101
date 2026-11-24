import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(sourceRoot, 'js/search-target.js'), 'utf8');
const marker = 'search-target-highlight';

function node(tagName, heading = null) {
  const classes = new Set(['existing-class']);
  const changes = [];
  return {
    tagName: tagName.toUpperCase(),
    classList: {
      add(name) { classes.add(name); changes.push(['add', name]); },
      remove(name) { classes.delete(name); changes.push(['remove', name]); },
      contains(name) { return classes.has(name); }
    },
    changes,
    layoutReads: 0,
    get offsetWidth() { this.layoutReads += 1; return 200; },
    querySelector(selector) { return selector === 'h1, h2' ? heading : null; }
  };
}

function mount() {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  const cancelled = [];
  const context = {
    setTimeout(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, delay, dueAt: now + delay });
      return id;
    },
    clearTimeout(id) {
      const timer = timers.get(id);
      if (timer) cancelled.push(timer.callback);
      timers.delete(id);
    }
  };
  runInNewContext(source, context);
  function advance(milliseconds) {
    now += milliseconds;
    for (const [id, timer] of timers) {
      if (timer.dueAt > now) continue;
      timers.delete(id);
      timer.callback();
    }
  }
  return { highlight: context.ArcaSearchTarget.highlight, timers, cancelled, advance };
}

test('CA-04 portal-search: resalta el encabezado de una sección o main y la tarjeta completa de un artículo', () => {
  const { highlight } = mount();
  for (const containerTag of ['section', 'main']) {
    const heading = node(containerTag === 'main' ? 'h1' : 'h2');
    const container = node(containerTag, heading);
    assert.equal(highlight(container), heading);
    assert.equal(heading.classList.contains(marker), true);
    assert.equal(container.classList.contains(marker), false);
  }
  const heading = node('h2');
  const article = node('article', heading);
  assert.equal(highlight(article), article);
  assert.equal(article.classList.contains(marker), true);
  assert.equal(heading.classList.contains(marker), false);
  const fallback = node('section');
  assert.equal(highlight(fallback), fallback);
  assert.equal(fallback.classList.contains(marker), true);
});

test('CA-04 portal-search: elegir otro destino limpia la marca y el temporizador anteriores', () => {
  const { highlight, timers, cancelled, advance } = mount();
  const first = node('article');
  const second = node('article');
  highlight(first);
  advance(1000);
  highlight(second);
  assert.equal(first.classList.contains(marker), false);
  assert.equal(second.classList.contains(marker), true);
  assert.equal(timers.size, 1);
  assert.equal(cancelled.length, 1);
  advance(1400);
  assert.equal(second.classList.contains(marker), true, 'el plazo del destino anterior no acorta el nuevo resaltado');
  advance(1000);
  assert.equal(second.classList.contains(marker), false);
  assert.equal(timers.size, 0);
});

test('CA-04 portal-search: elegir de nuevo el mismo destino reinicia el pulso y su duración', () => {
  const { highlight, timers, cancelled, advance } = mount();
  const destination = node('article');
  highlight(destination);
  advance(1800);
  highlight(destination);
  assert.equal(destination.layoutReads, 2, 'el layout se lee en cada activación para reiniciar la animación CSS');
  assert.equal(destination.changes.filter(([action, name]) => action === 'add' && name === marker).length, 2);
  assert.deepEqual(destination.changes.slice(-2), [['remove', marker], ['add', marker]]);
  cancelled[0]();
  assert.equal(destination.classList.contains(marker), true, 'un callback cancelado no elimina el nuevo pulso');
  advance(2399);
  assert.equal(destination.classList.contains(marker), true);
  advance(1);
  assert.equal(destination.classList.contains(marker), false);
  assert.equal(timers.size, 0);
});

test('CA-05 portal-search: el resaltado es temporal y no modifica clases existentes, foco ni atributos accesibles', () => {
  const { highlight, advance } = mount();
  const destination = node('article');
  destination.focus = () => { assert.fail('el helper no debe mover el foco'); };
  destination.setAttribute = () => { assert.fail('el helper no debe cambiar atributos accesibles'); };
  highlight(destination);
  advance(2399);
  assert.equal(destination.classList.contains(marker), true);
  assert.equal(destination.classList.contains('existing-class'), true);
  advance(1);
  assert.equal(destination.classList.contains(marker), false);
  assert.equal(destination.classList.contains('existing-class'), true);
  assert.equal(highlight(null), null);
});

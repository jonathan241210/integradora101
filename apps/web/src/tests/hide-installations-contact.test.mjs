import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const index = read('index.html');
const styles = read('styles.css');
const scriptJs = read('script.js');

const SECTION = /<section class="installations" id="instalaciones"( hidden)?>([\s\S]*?)<\/section>/;
const FORM = /<form class="contact-form" id="contactForm"( hidden)?>([\s\S]*?)<\/form>/;
const MENU_LINK = '<a href="#instalaciones"( hidden)?>Instalaciones</a>';

test('CA-01 hide-installations-contact: la sección #instalaciones tiene hidden, conserva class, id y su contenido', () => {
  const m = index.match(SECTION);
  assert.ok(m, 'sección con class e id');
  assert.ok(m[1], 'tiene hidden');
  assert.ok(m[2].trim().length > 200, 'conserva contenido');
  assert.match(m[2], /<h2/);
});

test('CA-02 hide-installations-contact: el formulario #contactForm tiene hidden y conserva class, id, campos, botón y nota', () => {
  const m = index.match(FORM);
  assert.ok(m && m[1], 'formulario con hidden');
  for (const id of ['contactName', 'contactEmail', 'contactMessage']) assert.match(m[2], new RegExp(`id="${id}"`));
  assert.match(m[2], /<button/);
  assert.match(m[2], /form-note/);
});

test('CA-03 hide-installations-contact: el enlace a #instalaciones tiene hidden y no hay otro enlace a #instalaciones', () => {
  assert.match(index, new RegExp(MENU_LINK.replace('( hidden)?', ' hidden')));
  const links = index.match(/href="#instalaciones"/g) || [];
  assert.equal(links.length, 1);
});

test('CA-04 hide-installations-contact: el enlace Contacto (#visita) sigue visible y el pie #visita no tiene hidden', () => {
  assert.match(index, /<a href="#visita">Contacto<\/a>/);
  assert.match(index, /<footer class="footer" id="visita">/);
  assert.doesNotMatch(index, /<footer[^>]*id="visita"[^>]*hidden/);
});

test('CA-05 hide-installations-contact: script.js se ejecuta con #contactForm e #instalaciones ocultos sin errores y el listener de submit queda registrado', () => {
  const listeners = {};
  const makeStub = (id) => {
    const target = function () {};
    const handler = {
      get(t, prop) {
        if (prop === Symbol.toPrimitive) return () => '';
        if (prop === 'addEventListener') return (type) => { (listeners[id] ||= []).push(type); };
        if (prop === 'hidden') return id === 'contactForm' || id === 'instalaciones';
        if (prop === 'length') return 0;
        if (prop === 'matches') return false;
        if (prop === 'then') return undefined;
        if (prop === Symbol.iterator) return function* () {};
        if (prop === 'value') return '';
        if (prop === 'style' || prop === 'classList' || prop === 'dataset') return makeStub(id + '.' + String(prop));
        return makeStub(id + '.' + String(prop));
      },
      set() { return true; },
      apply() { return makeStub(id + '()'); },
      construct() { return makeStub(id + 'new'); },
    };
    return new Proxy(target, handler);
  };
  const stubs = {};
  const getStub = id => (stubs[id] ||= makeStub(id));
  const win = makeStub('window');
  const doc = new Proxy({}, {
    get(_, prop) {
      if (prop === 'getElementById') return id => getStub(id);
      if (prop === 'addEventListener') return () => {};
      return makeStub('document.' + String(prop));
    },
    set() { return true; },
  });
  const sandbox = {
    document: doc,
    window: new Proxy({}, {
      get(_, prop) {
        if (prop === 'matchMedia') return () => ({ matches: false, addEventListener() {}, addListener() {} });
        if (prop === 'addEventListener') return () => {};
        return win[prop];
      },
      set() { return true; },
    }),
    Intl, setTimeout, clearTimeout, console, IntersectionObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: () => 0, localStorage: { getItem: () => null, setItem() {} },
  };
  const ctx = vm.createContext(sandbox);
  assert.doesNotThrow(() => vm.runInContext(scriptJs, ctx));
  assert.ok((listeners.contactForm || []).includes('submit'), 'listener de submit registrado');
});

test('CA-06 hide-installations-contact: la lista de id de section[id] y su orden coinciden con la línea base de web-011', () => {
  const baseline = ['porque-visitar', 'animales', 'mapa', 'ubicacion', 'instalaciones', 'noticias', 'eventos', 'boletos', 'preguntas', 'galeria', 'cognitivePanel'];
  const ids = [...index.matchAll(/<(?:section|aside|div)\b[^>]*\bid="([^"]+)"/g)].map(m => m[1]).filter(id => baseline.includes(id));
  assert.deepEqual(ids, baseline);
  assert.ok(index.includes('id="instalaciones"') && index.includes('id="contactForm"'));
});

test('CA-07 hide-installations-contact: quitar hidden de los tres elementos en memoria devuelve el HTML sin otras diferencias', () => {
  const restored = index
    .replace('<a href="#instalaciones" hidden>', '<a href="#instalaciones">')
    .replace('id="instalaciones" hidden>', 'id="instalaciones">')
    .replace('id="contactForm" hidden>', 'id="contactForm">');
  assert.equal(index.length - restored.length, ' hidden'.length * 3);
  assert.ok(!/id="(instalaciones|contactForm)" hidden/.test(restored));
  assert.match(restored, /<a href="#instalaciones">Instalaciones<\/a>/);
  assert.match(restored, /<section class="installations" id="instalaciones">/);
  assert.match(restored, /<form class="contact-form" id="contactForm">/);
});

test('CA-08 hide-installations-contact: styles.css contiene [hidden] { display: none !important; } y no se añadió ninguna regla sobre #instalaciones ni .contact-form con !important', () => {
  assert.match(styles, /^\[hidden\] \{ display: none !important; \}$/m);
  assert.doesNotMatch(styles, /#instalaciones/);
  assert.doesNotMatch(styles, /\.contact-form[^{]*\{[^}]*display[^}]*!important/);
  assert.doesNotMatch(styles, /\.installations[^{]*\{[^}]*display[^}]*!important/);
});

test('CA-09 hide-installations-contact: cada CA-01 a CA-08 y CA-10 aparece por nombre en el archivo de pruebas', () => {
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  for (const n of ['01', '02', '03', '04', '05', '06', '07', '08', '10']) {
    assert.ok(self.includes(`'CA-${n} hide-installations-contact:`), `falta CA-${n}`);
  }
});

test('CA-10 hide-installations-contact: no existe apps/web/package.json y el cambio no añade configuración ni scripts', () => {
  assert.equal(existsSync(new URL('../../package.json', import.meta.url)), false);
  const scripts = [...index.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m => m[1]);
  for (const s of scripts) assert.ok(!/^https?:/.test(s), `script de terceros ${s}`);
});

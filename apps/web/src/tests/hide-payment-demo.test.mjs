import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const visibleHtml = html.replace(/<!--[\s\S]*?-->/g, '');

test('CA-01 hide-payment-demo: conserva el formulario comentado y permite inicializar el portal', () => {
  const comments = html.match(/<!--[\s\S]*?-->/g) ?? [];
  assert.ok(comments.some(comment => /id="ticketForm"[\s\S]*id="receipt"/.test(comment)));
  assert.doesNotMatch(visibleHtml, /id="(?:ticketForm|receipt|demoCardNumber)"/);

  const events = [];
  const elements = {
    menuToggle: { addEventListener() {}, setAttribute() {} },
    mainNav: { addEventListener() {}, contains: () => false },
    contactForm: { addEventListener: event => events.push(event) },
  };
  const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
  runInNewContext(script, {
    window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
    document: {
      getElementById: id => elements[id] ?? null,
      querySelectorAll: () => [],
      addEventListener() {},
    },
  });
  assert.deepEqual(events, ['submit']);
});

test('CA-02 hide-payment-demo: oculta la franja y el botón sin dejar enlaces rotos', () => {
  assert.doesNotMatch(visibleHtml, /id="boletos"|href="#boletos"|Un día inolvidable empieza aquí|Ver precios de entrada/);
  assert.match(visibleHtml, /<a href="#ubicacion" class="btn btn-primary">[\s\S]*?Planear mi visita/);
  assert.match(visibleHtml, /<a href="#preguntas">\s*<strong>\s*Consulta boletos y precios/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const testFile = new URL(import.meta.url);
const webSource = path.resolve(path.dirname(testFile.pathname.replace(/^\/(?:[A-Za-z]:)/, (drive) => drive.slice(1))), '..');
const repository = path.resolve(webSource, '..', '..', '..');

const expectedHashes = new Map([
  ['assets/TransformandoTulancingo-2024-300x261.png', 'ab2ddf9869f7d780276936b66aac2b29ee7b8fdab7ed141f7decf42a7c00c8b3'],
  ['assets/dog.jpg', 'b385db5566f52302cd319f4b6d72c5669a0ed2e0c32c0dce81b9d8bb09edc4c5'],
  ['assets/fox.jpg', '6a376ff6dbebfe2f13ad72e74615137d6631f78860e45263f126a3dd43fbcd2f'],
  ['assets/giraffe.jpg', 'f4d6d123b63774cd3e25fe4e0263c51d550a0a2523f94be7cbd4f8cdf01bda8b'],
  ['assets/greenery.jpg', '485c73aead8f152d258b6f7372ff2015cad46fed0a8a212d629e1ed0d876a55d'],
  ['assets/lion.jpg', 'e4e0935b6e6c64dcc1b8999f8920770e3da15c9f5bf22d021a012e75367414eb'],
  ['assets/macaw.jpg', '7b436a17df4be07c6cd93b794bc31784b9e98bd82afb241346b7011876075087'],
  ['assets/model-viewer.min.js', '774edda21e1be2a0934e460ca5943af1fe3f88da130a9f98bd6a9d611576cacf'],
  ['assets/nyilonelycompany-nature-51.glb', 'dcf01e6dc9aea219a5dfd8d4654c4a2def141b533cc26f1c8e5c86da38d82fed'],
  ['assets/savanna.jpg', '14eb1c03bb6d98e4b4e587f5048eaab2c191a89e38abfb2f7d7ae2e27842f47e'],
  ['assets/turtle.jpg', 'c65d5b67d09b63a361ea3156546073e09c00abd0e7c86081deec39e9d38a7db8'],
]);

function gitContentHash(relativePath) {
  let content = readFileSync(path.join(webSource, relativePath));
  if (/\.(?:html|css|js)$/.test(relativePath)) {
    content = Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n'));
  }
  return createHash('sha256').update(content).digest('hex');
}

function localReferences(content, pattern) {
  return [...content.matchAll(pattern)]
    .map((match) => match[1].trim().replace(/^['"]|['"]$/g, ''))
    .filter((reference) => reference && !/^(?:https?:|\/\/|#|data:)/i.test(reference));
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function themeTokens() {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  const root = css.match(/:root\s*\{([^}]*)\}/s)?.[1];
  assert.ok(root, 'No se encontró el bloque central :root');
  return new Map([...root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}

function luminance(hexColor) {
  const normalized = hexColor.replace('#', '');
  const expanded = normalized.length === 3 ? [...normalized].map((digit) => digit + digit).join('') : normalized;
  assert.match(expanded, /^[\da-f]{6}$/i, `Color hexadecimal inválido: ${hexColor}`);
  const channels = [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function mountMobileNavigation(initialWidth = 390) {
  const listeners = new Map();
  const attributes = new Map([['aria-expanded', 'false']]);
  const menuToggle = {
    hidden: true,
    addEventListener: (type, listener) => listeners.set(`toggle:${type}`, listener),
    setAttribute: (name, value) => attributes.set(name, value),
    getAttribute: (name) => attributes.get(name),
    focus: () => { document.activeElement = menuToggle; },
  };
  const navLink = {
    focus: () => { document.activeElement = navLink; },
    closest: (selector) => selector === 'a' ? navLink : null,
  };
  const mainNav = {
    hidden: false,
    addEventListener: (type, listener) => listeners.set(`nav:${type}`, listener),
    contains: (element) => element === navLink,
    querySelector: () => navLink,
  };
  const document = {
    activeElement: null,
    addEventListener: (type, listener) => listeners.set(`document:${type}`, listener),
    getElementById: (id) => id === 'menuToggle' ? menuToggle : mainNav,
  };
  const mediaQuery = {
    matches: initialWidth <= 820,
    addEventListener: (type, listener) => listeners.set(`media:${type}`, listener),
  };
  const window = { matchMedia: () => mediaQuery };
  const script = readFileSync(path.join(webSource, 'script.js'), 'utf8');
  const start = script.indexOf('const menuToggle =');
  const end = script.indexOf('const searchInput =');
  assert.ok(start >= 0 && end > start, 'No se encontró el controlador de navegación');
  runInNewContext(script.slice(start, end), { document, window });

  return {
    attributes,
    document,
    listeners,
    mainNav,
    mediaQuery,
    menuToggle,
    navLink,
  };
}

function mountMapSelection() {
  const listeners = new Map();
  const selectedClasses = [];
  const makeControl = (name) => {
    const attributes = new Map([['aria-pressed', 'false']]);
    const classes = new Set();
    selectedClasses.push(classes);
    return {
      dataset: { name },
      attributes,
      addEventListener: (type, listener) => listeners.set(`map:${listeners.size}`, listener),
      setAttribute: (attribute, value) => attributes.set(attribute, value),
      classList: {
        toggle: (className, enabled) => enabled ? classes.add(className) : classes.delete(className),
        contains: (className) => classes.has(className),
      },
    };
  };
  const controls = [
    makeControl('Felinos'),
    makeControl('Felinos'),
    makeControl('Entrada'),
    makeControl('Entrada'),
    makeControl('Baños'),
  ];
  const selection = { textContent: '' };
  const document = {
    querySelectorAll: () => controls,
    getElementById: () => selection,
  };
  const script = readFileSync(path.join(webSource, 'script.js'), 'utf8');
  const start = script.indexOf('const mapControls =');
  const end = script.indexOf('const mapScene =', start);
  assert.ok(start >= 0 && end > start, 'No se encontró el controlador de selección del mapa');
  runInNewContext(script.slice(start, end), { document });

  return { controls, listeners, selection, selectedClasses };
}

function mountMapZoom() {
  const listeners = new Map();
  const selectedAttributes = new Map([['aria-pressed', 'false']]);
  const selectedClasses = new Set();
  const controls = [{
    dataset: { name: 'Lago' },
    addEventListener: (type, listener) => listeners.set(`mapSelection:${type}`, listener),
    setAttribute: (name, value) => selectedAttributes.set(name, value),
    classList: {
      toggle: (name, enabled) => enabled ? selectedClasses.add(name) : selectedClasses.delete(name),
    },
  }];
  const makeButton = (id) => ({
    disabled: false,
    addEventListener: (type, listener) => listeners.set(`${id}:${type}`, listener),
  });
  const mapScene = { style: { setProperty: (name, value) => listeners.set(`style:${name}`, value) } };
  const zoomIn = makeButton('mapZoomIn');
  const zoomOut = makeButton('mapZoomOut');
  const zoomReset = makeButton('mapZoomReset');
  const zoomStatus = { textContent: '' };
  const selection = { textContent: '' };
  const elements = new Map([
    ['mapScene', mapScene],
    ['mapZoomIn', zoomIn],
    ['mapZoomOut', zoomOut],
    ['mapZoomReset', zoomReset],
    ['mapZoomStatus', zoomStatus],
    ['mapSelection', selection],
  ]);
  const document = {
    activeElement: null,
    querySelectorAll: () => controls,
    getElementById: (id) => elements.get(id),
  };
  const script = readFileSync(path.join(webSource, 'script.js'), 'utf8');
  const start = script.indexOf('const mapControls =');
  const end = script.indexOf("document.querySelectorAll('.foto')", start);
  assert.ok(start >= 0 && end > start, 'No se encontró el controlador de zoom del mapa');
  runInNewContext(script.slice(start, end), { document });

  return { listeners, mapScene, zoomIn, zoomOut, zoomReset, zoomStatus, selection, selectedAttributes, selectedClasses, document };
}

function mapSection(html) {
  const mapId = html.indexOf('id="mapa"');
  const start = html.lastIndexOf('<section', mapId);
  const end = html.indexOf('</section>', start);
  assert.ok(mapId >= 0 && start >= 0 && end > start, 'No se encontró la sección del mapa');
  return html.slice(start, end);
}

test('CA-01 brand-color-refresh centraliza la paleta y tipografía aprobadas', () => {
  const tokens = themeTokens();
  const expected = new Map([
    ['sidebar', '#661a2f'],
    ['primary', '#87293a'],
    ['sidebar-primary', '#87293a'],
    ['secondary', '#b79159'],
    ['footer', 'var(--secondary)'],
    ['footer-background', 'var(--footer)'],
    ['footer-foreground', 'var(--foreground-dark)'],
    ['accent', '#DEC9A3'],
    ['foreground', '#000000'],
    ['foreground-dark', '#000000'],
    ['foreground-light', '#ffffff'],
    ['font-size-base', '16px'],
    ['font-family-base', '"Lato", sans-serif'],
    ['font-weight-base', '400'],
  ]);
  for (const [name, value] of expected) {
    assert.equal(tokens.get(name), value, `Token incorrecto: --${name}`);
  }
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /body\s*\{[^}]*font:\s*var\(--font-weight-base\)\s*var\(--font-size-base\)\/1\.6\s*var\(--font-family-base\)/s);
});

test('CA-02 brand-color-refresh aplica tokens semánticos y elimina la paleta anterior', () => {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /h1,\s*h2,\s*h3\s*\{[^}]*color:\s*var\(--primary\)/s);
  assert.match(css, /\.btn-primary\s*\{[^}]*background:\s*var\(--primary\)[^}]*color:\s*var\(--foreground-light\)/s);
  assert.match(css, /\.info-icon\s*\{[^}]*background:\s*var\(--accent\)/s);
  assert.match(css, /\.ticket-section\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*var\(--sidebar\),\s*var\(--primary\)\)/s);
  assert.match(css, /\.footer\s*\{[^}]*background:\s*var\(--footer-background\)[^}]*color:\s*var\(--footer-foreground\)/s);
  assert.doesNotMatch(css, /--(?:green|green-dark|green-soft|orange)\s*:/);
});

test('CA-03 brand-color-refresh verifica contraste WCAG 2.1 AA', () => {
  const tokens = themeTokens();
  const pairs = [
    ['foreground-dark', 'surface', 4.5],
    ['foreground', 'surface-page', 4.5],
    ['foreground-dark', 'surface-subtle', 4.5],
    ['muted-foreground', 'surface', 4.5],
    ['muted-foreground', 'surface-page', 4.5],
    ['muted-foreground', 'surface-subtle', 4.5],
    ['foreground-dark', 'secondary', 4.5],
    ['foreground-dark', 'accent', 4.5],
    ['foreground-light', 'primary', 4.5],
    ['foreground-light', 'sidebar', 4.5],
    ['primary', 'surface-accent', 4.5],
    ['sidebar', 'accent', 4.5],
    ['primary', 'surface', 3],
    ['primary', 'surface-subtle', 3],
  ];
  for (const [foreground, background, minimum] of pairs) {
    const ratio = contrastRatio(tokens.get(foreground), tokens.get(background));
    assert.ok(ratio >= minimum, `--${foreground} sobre --${background}: ${ratio.toFixed(2)}:1 (mínimo ${minimum}:1)`);
  }
});

test('CA-04 brand-color-refresh conserva estructura, recursos y reglas responsivas', () => {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  for (const breakpoint of ['1380px', '1200px', '820px', '560px', '360px']) {
    assert.ok(css.includes(`max-width: ${breakpoint}`), `Falta el breakpoint ${breakpoint}`);
  }
});

test('CA-05 brand-color-refresh verifica criterios sin dependencias nuevas', () => {
  const source = readFileSync(testFile, 'utf8');
  for (const criterion of ['CA-01 brand-color-refresh', 'CA-02 brand-color-refresh', 'CA-03 brand-color-refresh', 'CA-04 brand-color-refresh', 'CA-05 brand-color-refresh']) {
    assert.ok(source.includes(criterion), `Falta el test ${criterion}`);
  }
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(imports.every((specifier) => specifier.startsWith('node:')));
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});

test('CA-01 conserva los 11 assets fuera de alcance y sus hashes de Git', () => {
  assert.equal(expectedHashes.size, 11);
  for (const [relativePath, expectedHash] of expectedHashes) {
    assert.ok(existsSync(path.join(webSource, relativePath)), `Falta ${relativePath}`);
    assert.equal(gitContentHash(relativePath), expectedHash, `Hash distinto: ${relativePath}`);
  }
});

test('CA-02 index.php contiene exactamente la redirección esperada', () => {
  const content = readFileSync(path.join(webSource, 'index.php'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(content, "<?php\nheader('Location: ./index.html', true, 302);\nexit;\n");
});

test('CA-03 los orígenes portal-web e index.php raíz están ausentes', () => {
  assert.equal(existsSync(path.join(repository, 'portal-web')), false);
  assert.equal(existsSync(path.join(repository, 'index.php')), false);
});

test('CA-04 los artefactos Docker raíz están ausentes', () => {
  for (const name of ['Dockerfile', 'docker-compose.yml', '.dockerignore']) {
    assert.equal(existsSync(path.join(repository, name)), false, `${name} todavía existe`);
  }
});

test('CA-05 las referencias locales HTML y CSS resuelven', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  const references = [
    ...localReferences(html, /(?:src|href)\s*=\s*["']([^"']+)["']/gi),
    ...localReferences(css, /url\(\s*([^)]*?)\s*\)/gi),
  ];
  assert.ok(references.length > 0);
  for (const reference of references) {
    const pathname = reference.split(/[?#]/, 1)[0];
    assert.ok(existsSync(path.resolve(webSource, pathname)), `Referencia rota: ${reference}`);
  }
});

test('CA-06 el traslado sigue estructural y conserva hashes de archivos no visuales', () => {
  const files = walk(webSource);
  const forbiddenFiles = files.filter((file) => /\.(?:ts|tsx|jsx)$/.test(file) || path.basename(file) === 'package.json' || /^vite\.config\./.test(path.basename(file)));
  const forbiddenDirectories = files.filter((file) => file.split(path.sep).some((part) => ['node_modules', 'dist', 'build'].includes(part)));
  assert.deepEqual(forbiddenFiles, []);
  assert.deepEqual(forbiddenDirectories, []);
  for (const [relativePath, expectedHash] of expectedHashes) {
    assert.equal(gitContentHash(relativePath), expectedHash, `Hash distinto: ${relativePath}`);
  }
});

test('CA-07 la prueba persistente usa solo builtins y no requiere manifiesto', () => {
  assert.ok(existsSync(testFile));
  const source = readFileSync(testFile, 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(imports.length > 0);
  assert.ok(imports.every((specifier) => ['node:test', 'node:assert/strict', 'node:fs', 'node:path', 'node:crypto', 'node:vm'].includes(specifier)));
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});

test('CA-01 lion-hero-mobile-navigation recupera el degradado verde solo en el hero', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /\.hero\s*\{[^}]*linear-gradient\(90deg,\s*rgba\(10,\s*40,\s*18,\s*\.82\)\s*0%,\s*rgba\(10,\s*40,\s*18,\s*\.62\)\s*35%,\s*rgba\(10,\s*40,\s*18,\s*\.28\)\s*100%\),\s*url\(['"]assets\/lion\.jpg['"]\)/s);
  assert.match(html, /<section class="hero">/);
  assert.equal(themeTokens().get('primary'), '#87293a');
});

test('CA-02 lion-hero-mobile-navigation conserva el menú desplegado en escritorio', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(html, /<button[^>]*id="menuToggle"[^>]*aria-controls="mainNav"[^>]*hidden\s*>/);
  assert.match(html, /<nav\s+class="main-nav"\s+id="mainNav"/);
  assert.match(css, /@media \(min-width: 821px\)\s*\{\s*\.menu-toggle\s*\{\s*display:\s*none;/);
  assert.match(css, /\.main-nav\s*\{[^}]*display:\s*flex/s);
});

test('CA-03 lion-hero-mobile-navigation expone controles accesibles y teclado', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const script = readFileSync(path.join(webSource, 'script.js'), 'utf8');
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(html, /aria-label="Abrir menú principal"[^>]*aria-controls="mainNav"[^>]*aria-expanded="false"/);
  assert.match(script, /window\.matchMedia\('\(max-width: 820px\)'\)/);
  assert.match(script, /event\.key !== 'Escape'/);
  assert.match(script, /menuToggle\.focus\(\)/);
  assert.match(script, /mainNav\.addEventListener\('click'/);
  assert.match(script, /mobileNavigation\.addEventListener\('change'/);
  assert.match(css, /\.menu-toggle\[aria-expanded="true"\]/);
  assert.match(css, /@media \(max-width: 820px\)/);
});

test('CA-03 lion-hero-mobile-navigation opera apertura, Escape, enlace y breakpoints', () => {
  const mobile = mountMobileNavigation();
  assert.equal(mobile.menuToggle.hidden, false);
  assert.equal(mobile.mainNav.hidden, true);
  assert.equal(mobile.menuToggle.getAttribute('aria-expanded'), 'false');

  mobile.listeners.get('toggle:click')();
  assert.equal(mobile.mainNav.hidden, false);
  assert.equal(mobile.menuToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(mobile.menuToggle.getAttribute('aria-label'), 'Cerrar menú principal');

  mobile.listeners.get('document:keydown')({ key: 'Escape' });
  assert.equal(mobile.mainNav.hidden, true);
  assert.equal(mobile.menuToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(mobile.document.activeElement, mobile.menuToggle);

  mobile.listeners.get('toggle:click')();
  mobile.listeners.get('nav:click')({ target: mobile.navLink });
  assert.equal(mobile.mainNav.hidden, true);

  mobile.mediaQuery.matches = false;
  mobile.listeners.get('media:change')();
  assert.equal(mobile.menuToggle.hidden, true);
  assert.equal(mobile.mainNav.hidden, false);
  assert.equal(mobile.document.activeElement, mobile.navLink);

  mobile.mediaQuery.matches = true;
  mobile.listeners.get('media:change')();
  assert.equal(mobile.menuToggle.hidden, false);
  assert.equal(mobile.mainNav.hidden, true);
  assert.equal(mobile.document.activeElement, mobile.menuToggle);
});

test('CA-04 lion-hero-mobile-navigation aplica controles fluidos en los anchos objetivo', () => {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.doesNotMatch(css, /html,\s*body\s*\{[^}]*overflow-x:\s*clip/s);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /\.top-actions\s*\{[^}]*flex:\s*1 0 100%[^}]*width:\s*100%/s);
  assert.match(css, /\.search input\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/s);
  assert.match(css, /\.hero h1\s*\{\s*max-width:\s*18ch/s);
  assert.match(css, /\.event-date span\s*\{\s*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.page-shell\s*\{\s*max-width:\s*none/s);
});

test('CA-05 lion-hero-mobile-navigation tiene pruebas CA-01..CA-05 sin paquetes nuevos', () => {
  const source = readFileSync(testFile, 'utf8');
  for (const criterion of [
    'CA-01 lion-hero-mobile-navigation',
    'CA-02 lion-hero-mobile-navigation',
    'CA-03 lion-hero-mobile-navigation',
    'CA-04 lion-hero-mobile-navigation',
    'CA-05 lion-hero-mobile-navigation',
  ]) {
    assert.ok(source.includes(criterion), `Falta el test ${criterion}`);
  }
  assert.ok([...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].every((match) => match[1].startsWith('node:')));
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});

test('CA-01 visit-info-icons-and-favicon centra iconos y contenido de visita en responsive', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /\.infobar\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.infobar\s*>\s*div\s*\{[^}]*flex-direction:\s*column[^}]*align-items:\s*center[^}]*text-align:\s*center/s);
  assert.match(css, /\.infobar\s*>\s*div\s*>\s*span\s*\{[^}]*max-width:\s*100%/s);
  assert.match(css, /@media \(max-width: 560px\)\s*\{[\s\S]*?\.infobar[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.equal((html.match(/class="bi bi-(?:clock|geo-alt|ticket-perforated) info-icon"/g) ?? []).length, 3);
});

test('CA-02 visit-info-icons-and-favicon carga el logo del favicon desde un asset local', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const favicon = html.match(/<link\s+rel="icon"[^>]*>/s)?.[0];
  assert.ok(favicon, 'No se encontró la referencia del favicon');
  const href = favicon.match(/href=["']([^"']+)["']/)?.[1];
  assert.equal(href, 'assets/zoo-logo.jpeg');
  assert.doesNotMatch(href, /^(?:https?:|\/\/|\/)/i);
  assert.doesNotMatch(href, /(?:^|\/)\.\.(?:\/|$)/);
  const logo = readFileSync(path.join(webSource, href));
  assert.deepEqual([...logo.subarray(0, 3)], [0xff, 0xd8, 0xff], 'El favicon no contiene el logo JPEG local');
});

test('CA-03 visit-info-icons-and-favicon conserva las etiquetas y prueba todos los criterios', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const source = readFileSync(testFile, 'utf8');
  assert.match(html, /<small>Horario<\/small>/);
  assert.match(html, /<strong>Tulancingo de Bravo, Hidalgo<\/strong>/);
  assert.match(html, /<a href="#boletos">[\s\S]*?Consulta boletos y precios/);
  for (const criterion of [
    'CA-01 visit-info-icons-and-favicon',
    'CA-02 visit-info-icons-and-favicon',
    'CA-03 visit-info-icons-and-favicon',
  ]) {
    assert.ok(source.includes(criterion), `Falta el test ${criterion}`);
  }
  assert.ok([...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].every((match) => match[1].startsWith('node:')));
});

test('CA-01 isometric-zoo-map dibuja una escena local con perspectiva y sin proveedor', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const section = mapSection(html);
  assert.match(section, /<svg[\s\S]*?class="map-art"[\s\S]*?viewBox="0 0 900 560"/);
  assert.match(section, /<linearGradient[\s\S]*?id="map-ground"/);
  assert.match(section, /fill="url\(#map-grass\)"/);
  assert.match(section, /stroke-dasharray="5 13"/);
  assert.match(section, /class="map-scene" id="mapScene"/);
  assert.match(section, /map-icon-(?:felinos|aviario|reptilario|primates|granja|lago|entrada)/);
  assert.match(section, /id="mapZoomReset"[^>]*aria-controls="mapScene"(?![^>]*\sdisabled)/);
  assert.doesNotMatch(section, /https?:|maps\.google|mapbox|openstreetmap/i);
});

test('CA-02 isometric-zoo-map conserva zonas, servicios e iconos SVG accesibles', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const section = mapSection(html);
  const names = ['Felinos', 'Aviario', 'Reptilario', 'Primates', 'Granja', 'Lago', 'Entrada', 'Baños', 'Alimentos', 'Bebederos', 'Áreas de descanso', 'Enfermería', 'Tiendas'];
  const controls = [...section.matchAll(/<button\b(?=[^>]*\bmap-control\b)[\s\S]*?<\/button>/g)].map((match) => match[0]);
  const symbols = new Set([...section.matchAll(/<symbol id="([^"]+)"/g)].map((match) => match[1]));
  assert.ok(controls.length >= names.length);
  for (const name of names) {
    assert.ok(section.includes(`data-name="${name}"`), `Falta ${name}`);
    const control = controls.find((candidate) => candidate.includes(`data-name="${name}"`));
    assert.ok(control, `Falta un control para ${name}`);
    assert.match(control, /aria-label="[^"]+"/);
    assert.match(control, /<svg class="map-icon"[^>]*aria-hidden="true"/);
    const symbol = control.match(/<use href="#([^"]+)"/)?.[1];
    assert.ok(symbols.has(symbol), `Falta el símbolo SVG local de ${name}`);
    assert.match(control, /<span(?: class="map-marker-label")?>[^<]+<\/span>/);
    assert.match(control, /aria-pressed="false"/);
  }
});

test('CA-03 isometric-zoo-map advierte que la ilustración no sirve para orientarse con precisión', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const section = mapSection(html);
  assert.match(section, /Ilustración aproximada,\s*no está a escala y no sirve\s*para orientarte con precisión/);
});

test('CA-04 isometric-zoo-map sincroniza selección, resaltado y anuncio entre controles', () => {
  const map = mountMapSelection();
  map.listeners.get('map:0')();
  assert.equal(map.selection.textContent, 'Seleccionaste: Felinos. Consulta al personal para encontrar esta zona.');
  assert.equal(map.controls[0].attributes.get('aria-pressed'), 'true');
  assert.equal(map.controls[1].attributes.get('aria-pressed'), 'true');
  assert.equal(map.controls[2].attributes.get('aria-pressed'), 'false');
  assert.equal(map.controls[0].classList.contains('active'), true);
  assert.equal(map.controls[2].classList.contains('active'), false);

  map.listeners.get('map:4')();
  assert.equal(map.selection.textContent, 'Seleccionaste: Baños. Consulta al personal para encontrar esta zona.');
  assert.equal(map.controls[0].attributes.get('aria-pressed'), 'false');
  assert.equal(map.controls[0].classList.contains('active'), false);
  assert.equal(map.controls[4].attributes.get('aria-pressed'), 'true');
  assert.equal(map.controls[4].classList.contains('active'), true);
});

test('CA-05 isometric-zoo-map adapta la ilustración y la leyenda a viewports estrechos', () => {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /\.map\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.map-scene\s*\{[^}]*position:\s*absolute[^}]*transform:\s*scale\(var\(--map-scale,\s*1\)\)/s);
  assert.match(css, /\.map-art\s*\{[^}]*position:\s*absolute[^}]*width:\s*100%[^}]*height:\s*100%/s);
  assert.match(css, /\.map-zoom-controls\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /\.map-marker\s*\{[^}]*top:\s*var\(--marker-y\)[^}]*left:\s*var\(--marker-x\)/s);
  assert.match(css, /@media \(max-width: 820px\)\s*\{\s*\.map-layout\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /@media \(max-width: 560px\)\s*\{[\s\S]*?\.map-marker-label\s*\{[^}]*clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
  assert.match(css, /\.map-control:focus-visible/);
  assert.doesNotMatch(css, /html,\s*body\s*\{[^}]*overflow-x:\s*clip/s);
});

test('CA-07 isometric-zoo-map controla límites, estado y restablecimiento sin perder selección o foco', () => {
  const zoom = mountMapZoom();
  assert.equal(zoom.zoomOut.disabled, true);
  assert.equal(zoom.zoomReset.disabled, false);
  assert.equal(zoom.zoomStatus.textContent, 'Vista: 100 %');
  assert.equal(zoom.listeners.get('style:--map-scale'), '1');

  zoom.listeners.get('mapZoomIn:click')();
  assert.equal(zoom.zoomStatus.textContent, 'Vista: 110 %');
  assert.equal(zoom.zoomReset.disabled, false);
  assert.equal(zoom.listeners.get('style:--map-scale'), '1.1');
  zoom.listeners.get('mapSelection:click')();
  assert.equal(zoom.selectedAttributes.get('aria-pressed'), 'true');
  assert.equal(zoom.selectedClasses.has('active'), true);

  for (let step = 0; step < 5; step += 1) {
    zoom.listeners.get('mapZoomIn:click')();
  }
  assert.equal(zoom.zoomStatus.textContent, 'Vista: 150 %');
  assert.equal(zoom.zoomIn.disabled, true);
  assert.equal(zoom.zoomOut.disabled, false);
  zoom.listeners.get('mapZoomIn:click')();
  assert.equal(zoom.zoomStatus.textContent, 'Vista: 150 %');

  for (let step = 0; step < 5; step += 1) {
    zoom.listeners.get('mapZoomOut:click')();
  }
  assert.equal(zoom.zoomStatus.textContent, 'Vista: 100 %');
  assert.equal(zoom.zoomOut.disabled, true);
  assert.equal(zoom.zoomReset.disabled, false);

  zoom.listeners.get('mapZoomIn:click')();
  zoom.document.activeElement = zoom.zoomReset;
  zoom.listeners.get('mapZoomReset:click')();
  assert.equal(zoom.document.activeElement, zoom.zoomReset);
  assert.equal(zoom.selectedAttributes.get('aria-pressed'), 'true');
  assert.equal(zoom.selectedClasses.has('active'), true);

  assert.match(readFileSync(path.join(webSource, 'index.html'), 'utf8'), /aria-label="Controles de zoom del mapa"/);
  assert.match(readFileSync(path.join(webSource, 'index.html'), 'utf8'), /id="mapZoomStatus" role="status" aria-live="polite"/);
});

test('CA-06 isometric-zoo-map conserva suite Node local sin nuevas dependencias', () => {
  const source = readFileSync(testFile, 'utf8');
  for (const criterion of [
    'CA-01 isometric-zoo-map',
    'CA-02 isometric-zoo-map',
    'CA-03 isometric-zoo-map',
    'CA-04 isometric-zoo-map',
    'CA-05 isometric-zoo-map',
    'CA-06 isometric-zoo-map',
    'CA-07 isometric-zoo-map',
  ]) {
    assert.ok(source.includes(criterion), `Falta el test ${criterion}`);
  }
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(imports.every((specifier) => ['node:test', 'node:assert/strict', 'node:fs', 'node:path', 'node:crypto', 'node:vm'].includes(specifier)));
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});

test('CA-04 visit-info-icons-and-favicon baja 8 px los tres iconos sin alterar el centrado', () => {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /\.infobar\s*\.info-icon\s*\{\s*margin-top:\s*8px;\s*\}/);
  assert.match(css, /\.infobar\s*>\s*div\s*\{[^}]*align-items:\s*center[^}]*text-align:\s*center/s);
  assert.equal((readFileSync(path.join(webSource, 'index.html'), 'utf8').match(/class="bi bi-(?:clock|geo-alt|ticket-perforated) info-icon"/g) ?? []).length, 3);
});

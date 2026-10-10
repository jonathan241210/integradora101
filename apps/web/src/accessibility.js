(() => {
  const launcher = document.getElementById('cognitiveLauncher');
  const panel = document.getElementById('cognitivePanel');
  const closeButton = document.getElementById('cognitiveClose');
  const profileSelect = document.getElementById('cognitiveProfile');
  const resetButton = document.getElementById('cognitiveReset');
  const ruler = document.getElementById('cognitiveReadingRuler');
  const controls = [...document.querySelectorAll('[data-cognitive-mode]')];
  const main = document.querySelector('main');

  if (!launcher || !panel || !closeButton || !profileSelect || !resetButton || !ruler || !main) return;

  const storageKey = 'arca-cognitive-accessibility-v1';
  const modeNames = ['focus', 'dyslexia', 'bionic', 'ruler', 'calm'];
  const profiles = {
    none: Object.fromEntries(modeNames.map((mode) => [mode, false])),
    clear: { focus: false, dyslexia: true, bionic: false, ruler: false, calm: false },
    focus: { focus: true, dyslexia: false, bionic: false, ruler: true, calm: false },
    calm: { focus: false, dyslexia: false, bionic: false, ruler: false, calm: true },
  };
  const defaults = () => ({ modes: { ...profiles.none } });
  let state = readPreferences();
  let focusedBlock = null;
  let transformedText = [];
  let observer = null;
  const focusSelector = 'p, li, h1, h2, h3, blockquote, .location-item, .map-disclaimer';

  function readPreferences() {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return defaults();
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !parsed.modes || typeof parsed.modes !== 'object') {
        return defaults();
      }
      const modes = Object.fromEntries(modeNames.map((mode) => [mode, parsed.modes[mode] === true]));
      return { modes };
    } catch {
      return defaults();
    }
  }

  function savePreferences() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: 1,
        profile: currentProfile(),
        modes: state.modes,
      }));
    } catch {
      // Preferences remain active in memory when browser storage is unavailable.
    }
  }

  function currentProfile() {
    for (const [name, modes] of Object.entries(profiles)) {
      if (modeNames.every((mode) => state.modes[mode] === modes[mode])) return name;
    }
    return 'custom';
  }

  function render() {
    for (const mode of modeNames) {
      document.documentElement.classList.toggle(`cognitive-mode-${mode}`, state.modes[mode]);
    }
    for (const control of controls) {
      control.checked = state.modes[control.dataset.cognitiveMode] === true;
    }
    profileSelect.value = currentProfile();
    ruler.hidden = !state.modes.ruler;
    setFocusedBlock(state.modes.focus ? focusedBlock : null);
    if (state.modes.bionic) applyBionicReading();
    else restoreBionicReading();
  }

  function update(modes, persist = true) {
    state = { modes: Object.fromEntries(modeNames.map((mode) => [mode, modes[mode] === true])) };
    render();
    if (persist) savePreferences();
  }

  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    closeButton.focus();
  }

  function closePanel(returnFocus = true) {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    if (returnFocus) launcher.focus();
  }

  function eligibleTextNode(node) {
    const parent = node.parentElement;
    const computed = parent && typeof window.getComputedStyle === 'function' ? window.getComputedStyle(parent) : null;
    return parent
      && node.nodeValue.trim()
      && (!computed || (computed.display !== 'none' && computed.visibility !== 'hidden' && computed.visibility !== 'collapse'))
      && !parent.closest('a, button, input, textarea, select, option, script, style, svg, [contenteditable], [aria-hidden="true"], [hidden], .cognitive-panel, .cognitive-launcher, .cognitive-reading-ruler, .cognitive-bionic-text');
  }

  function transformTextNode(node) {
    if (!eligibleTextNode(node)) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'cognitive-bionic-text';
    const pieces = node.nodeValue.split(/(\s+)/u);
    for (const piece of pieces) {
      if (!piece) continue;
      if (/^\s+$/u.test(piece)) {
        wrapper.append(document.createTextNode(piece));
        continue;
      }
      const word = piece.match(/^[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/u)?.[0];
      if (!word) {
        wrapper.append(document.createTextNode(piece));
        continue;
      }
      const accessibleWord = document.createElement('span');
      accessibleWord.setAttribute('role', 'text');
      accessibleWord.setAttribute('aria-label', piece);
      const visualWord = document.createElement('span');
      visualWord.setAttribute('aria-hidden', 'true');
      const strong = document.createElement('strong');
      const prefixLength = Math.max(1, Math.ceil(word.length * 0.4));
      strong.textContent = word.slice(0, prefixLength);
      visualWord.append(strong, document.createTextNode(piece.slice(prefixLength)));
      accessibleWord.append(visualWord);
      wrapper.append(accessibleWord);
    }
    node.parentNode.replaceChild(wrapper, node);
    transformedText.push({ original: node, wrapper });
  }

  function transformTextWithin(root) {
    if (root.nodeType === 3) {
      transformTextNode(root);
      return;
    }
    if (root.nodeType !== 1 || root.closest?.('.cognitive-bionic-text, .cognitive-panel, .cognitive-launcher')) return;
    const walker = document.createTreeWalker(root, 4);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(transformTextNode);
  }

  function applyBionicReading() {
    if (transformedText.length) return;
    transformTextWithin(main);
    if (!observer && window.MutationObserver) {
      observer = new window.MutationObserver((records) => {
        for (const record of records) {
          record.addedNodes.forEach(transformTextWithin);
        }
      });
      observer.observe(main, { childList: true, subtree: true });
    }
  }

  function restoreBionicReading() {
    observer?.disconnect();
    observer = null;
    for (const { original, wrapper } of transformedText) {
      if (wrapper.parentNode) wrapper.parentNode.replaceChild(original, wrapper);
    }
    transformedText = [];
  }

  function readingBlock(target) {
    if (!(target instanceof Element)) return null;
    const block = target.closest(`main ${focusSelector.split(', ').join(', main ')}`);
    if (!block || block.closest('.cognitive-panel, .cognitive-launcher')) return null;
    return block;
  }

  function setFocusedBlock(block) {
    if (focusedBlock === block && state.modes.focus && focusedBlock) return;
    focusedBlock?.classList.remove('cognitive-focus-current');
    focusedBlock = block;
    const blocks = [...main.querySelectorAll(focusSelector)]
      .filter((candidate) => !candidate.querySelector(focusSelector));
    for (const candidate of blocks) {
      candidate.classList.remove('cognitive-focus-current', 'cognitive-focus-muted');
      if (!state.modes.focus) continue;
      if (candidate === focusedBlock) candidate.classList.add('cognitive-focus-current');
      else candidate.classList.add('cognitive-focus-muted');
    }
    focusedBlock?.classList.remove('cognitive-focus-muted');
    focusedBlock?.classList.add('cognitive-focus-current');
  }

  function positionRuler(y) {
    if (!state.modes.ruler || !Number.isFinite(y)) return;
    const height = 40;
    ruler.style.top = `${Math.max(0, Math.min(window.innerHeight - height, y - height / 2))}px`;
  }

  launcher.addEventListener('click', () => {
    if (panel.hidden) openPanel();
    else closePanel(false);
  });
  closeButton.addEventListener('click', () => closePanel());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) closePanel();
  });
  profileSelect.addEventListener('change', () => {
    if (profiles[profileSelect.value]) update(profiles[profileSelect.value]);
  });
  controls.forEach((control) => {
    control.addEventListener('change', () => {
      update({ ...state.modes, [control.dataset.cognitiveMode]: control.checked });
    });
  });
  resetButton.addEventListener('click', () => {
    update(profiles.none, false);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // The in-memory defaults remain active when browser storage is unavailable.
    }
  });
  document.addEventListener('pointermove', (event) => {
    if (state.modes.focus) {
      const block = readingBlock(event.target);
      if (block) setFocusedBlock(block);
    }
    if (state.modes.ruler && !event.target.closest?.('.cognitive-panel, .cognitive-launcher')) {
      positionRuler(event.clientY);
    }
  });
  document.addEventListener('focusin', (event) => {
    const block = readingBlock(event.target);
    if (state.modes.focus && block) setFocusedBlock(block);
    if (state.modes.ruler && block) {
      const bounds = block.getBoundingClientRect();
      positionRuler(bounds.top + Math.min(bounds.height / 2, 24));
    }
  });
  document.addEventListener('touchmove', (event) => {
    if (state.modes.ruler
      && event.touches.length
      && !event.target.closest?.('.cognitive-panel, .cognitive-launcher')) {
      positionRuler(event.touches[0].clientY);
    }
  }, { passive: true });

  render();
})();

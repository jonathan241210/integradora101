(function () {
  'use strict';

  const toggle = document.getElementById('mapModelToggle');
  const scene = document.getElementById('mapScene');
  const plan = document.getElementById('mapPlan');
  const surface = plan.querySelector('.map-surface');
  const status = document.getElementById('mapModelStatus');
  const zoomIn = document.getElementById('mapZoomIn');
  const zoomOut = document.getElementById('mapZoomOut');
  const reset = document.getElementById('mapZoomReset');
  const value = document.getElementById('mapZoomValue');

  const minZoom = 100;
  const maxZoom = 300;
  const step = 25;
  const initialRadiusPercent = 96;
  const initialOrbit = '0deg 35deg ' + initialRadiusPercent + '%';
  let planZoom = minZoom;
  let modelZoom = minZoom;
  let viewer = null;

  function updateControls() {
    const zoom = plan.hidden ? modelZoom : planZoom;
    const loading = plan.hidden && !viewer?.loaded;
    value.textContent = zoom + ' %';
    zoomIn.setAttribute('aria-disabled', String(loading || zoom === maxZoom));
    zoomOut.setAttribute('aria-disabled', String(loading || zoom === minZoom));
    reset.setAttribute('aria-disabled', String(loading));
  }

  function scalePlan(zoom) {
    const centerX = (plan.scrollLeft + plan.clientWidth / 2) / plan.scrollWidth;
    const centerY = (plan.scrollTop + plan.clientHeight / 2) / plan.scrollHeight;
    surface.style.width = zoom + '%';
    surface.style.height = zoom + '%';
    if (zoom > minZoom) {
      plan.tabIndex = 0;
      plan.scrollLeft = centerX * plan.scrollWidth - plan.clientWidth / 2;
      plan.scrollTop = centerY * plan.scrollHeight - plan.clientHeight / 2;
    } else {
      plan.removeAttribute('tabindex');
      plan.scrollLeft = 0;
      plan.scrollTop = 0;
    }
    planZoom = zoom;
  }

  let drag = null;
  let dragged = false;
  plan.addEventListener('dragstart', event => event.preventDefault());
  plan.addEventListener('pointerdown', event => {
    dragged = false;
    if (planZoom === minZoom || event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: plan.scrollLeft, top: plan.scrollTop };
    event.target.setPointerCapture(event.pointerId);
  });
  plan.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!dragged && Math.hypot(dx, dy) < 3) return;
    dragged = true;
    plan.classList.add('is-dragging');
    plan.scrollLeft = drag.left - dx;
    plan.scrollTop = drag.top - dy;
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    plan.classList.remove('is-dragging');
  }
  plan.addEventListener('pointerup', endDrag);
  plan.addEventListener('pointercancel', endDrag);
  plan.addEventListener('lostpointercapture', endDrag);
  plan.addEventListener('click', event => {
    if (dragged && event.detail) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  function scaleModel(zoom, restore) {
    const orbit = viewer.getCameraOrbit();
    const radius = initialRadiusPercent * minZoom / zoom;
    viewer.cameraOrbit = restore ? initialOrbit : orbit.theta + 'rad ' + orbit.phi + 'rad ' + radius + '%';
    viewer.toggleAttribute('disable-pan', zoom === minZoom);
    if (zoom === minZoom) viewer.cameraTarget = 'auto auto auto';
    modelZoom = zoom;
  }

  function changeZoom(delta) {
    if (plan.hidden && !viewer?.loaded) return;
    const current = plan.hidden ? modelZoom : planZoom;
    const zoom = delta === 0 ? minZoom : current + delta;
    if (zoom < minZoom || zoom > maxZoom) return;
    if (plan.hidden) scaleModel(zoom, delta === 0);
    else scalePlan(zoom);
    updateControls();
  }

  function setView(showModel) {
    plan.hidden = showModel;
    if (viewer) viewer.hidden = !showModel;
    toggle.setAttribute('aria-pressed', String(showModel));
    toggle.textContent = showModel ? 'Ver en 2D' : 'Ver en 3D';
    status.hidden = !showModel || Boolean(viewer?.loaded);
    updateControls();
  }

  function showError() {
    setView(false);
    status.textContent = location.protocol === 'file:'
      ? 'Abre el portal desde un servidor web para ver el mapa 3D.'
      : 'No se pudo cargar el mapa 3D. Puedes seguir explorando el mapa en 2D.';
    status.classList.add('is-error');
    status.hidden = false;
  }

  function createViewer() {
    const model = document.createElement('model-viewer');
    model.id = 'mapModel';
    model.className = 'map-model';
    model.setAttribute('alt', 'Mapa 3D del zoológico');
    model.setAttribute('camera-controls', '');
    model.setAttribute('camera-orbit', initialOrbit);
    model.setAttribute('min-camera-orbit', 'auto auto 25%');
    model.setAttribute('touch-action', 'pan-y');
    model.setAttribute('disable-zoom', '');
    model.setAttribute('disable-pan', '');
    model.setAttribute('loading', 'eager');
    model.addEventListener('load', function () {
      if (viewer !== model || !plan.hidden) return;
      status.hidden = true;
      updateControls();
    });
    model.addEventListener('error', function () {
      if (viewer !== model) return;
      viewer = null;
      modelZoom = minZoom;
      model.remove();
      if (plan.hidden) showError();
    });
    viewer = model;
    model.setAttribute('src', toggle.dataset.model);
    scene.appendChild(model);
    document.dispatchEvent(new CustomEvent('zoo-map-model-created', { detail: model }));
  }

  toggle.addEventListener('click', async function () {
    if (plan.hidden) {
      setView(false);
      return;
    }
    if (location.protocol === 'file:') {
      showError();
      return;
    }
    status.classList.remove('is-error');
    status.textContent = 'Cargando mapa 3D…';
    setView(true);
    try {
      if (!customElements.get('model-viewer')) await import('../assets/model-viewer.min.js');
      if (plan.hidden && !viewer) createViewer();
    } catch {
      if (plan.hidden) showError();
    }
  });

  zoomIn.addEventListener('click', () => changeZoom(step));
  zoomOut.addEventListener('click', () => changeZoom(-step));
  reset.addEventListener('click', () => changeZoom(0));
  updateControls();
  document.getElementById('mapZoomControls').hidden = false;
})();

(function () {
  'use strict';

  function isMapCoordinate(value) {
    return Number.isFinite(value) && value >= 0 && value <= 1;
  }

  const positionedGroups = new Map();

  function addModelPins(model, records, group) {
    const isPlace = group === 'placePins';
    for (const record of records) {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = isPlace ? 'model-pin place-pin' : 'model-pin';
      pin.slot = 'hotspot-' + group + '-' + record.id;
      // El SVG mide 1600 × 1200 px. Cada píxel representa 0,01 m en este GLB.
      const x = record.map_x * 16 - 8.025897;
      const z = record.map_y * 12 - 5.140369;
      pin.setAttribute('data-position', x + 'm ' + (isPlace ? 0.425 : 0.265) + 'm ' + z + 'm');
      pin.setAttribute('data-normal', '0 1 0');
      const label = document.createElement('span');
      label.textContent = record.name;
      pin.appendChild(label);
      model.appendChild(pin);
    }
  }

  document.addEventListener('zoo-map-model-created', event => {
    for (const [group, records] of positionedGroups) addModelPins(event.detail, records, group);
  });

  function renderMarkers(records, layer) {
    const markers = document.createDocumentFragment();
    const positioned = records.filter(record => isMapCoordinate(record.map_x) && isMapCoordinate(record.map_y));
    positionedGroups.set(layer.id, positioned);
    const model = document.getElementById('mapModel');
    if (model) addModelPins(model, positioned, layer.id);
    for (const record of positioned) {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'map-pin';
      marker.id = layer.id + '-' + record.id;
      marker.style.left = record.map_x * 100 + '%';
      marker.style.top = record.map_y * 100 + '%';
      const label = document.createElement('span');
      label.textContent = record.name;
      marker.appendChild(label);
      marker.addEventListener('click', () => marker.focus());
      markers.appendChild(marker);
    }
    layer.replaceChildren(markers);
  }

  const search = document.getElementById('directorySearch');
  const type = document.getElementById('directoryType');
  const renderGroups = [];
  function normalize(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function locate(layer, record) {
    const model = document.getElementById('mapModel');
    const key = layer.id + '-' + record.id;
    const hotspot = model?.querySelector('[slot="hotspot-' + key + '"]');
    if (model?.loaded && !model.hidden && hotspot) {
      model.cameraTarget = hotspot.getAttribute('data-position');
      model.scrollIntoView({ block: 'center' });
      hotspot.focus({ preventScroll: true });
    } else {
      if (document.getElementById('mapPlan').hidden) document.getElementById('mapModelToggle').click();
      const pin = document.getElementById(key);
      pin.scrollIntoView({ block: 'center', inline: 'center' });
      pin.focus({ preventScroll: true });
    }
  }

  function filterDirectory() {
    for (const render of renderGroups) render();
  }
  search.addEventListener('input', filterDirectory);
  type.addEventListener('change', filterDirectory);

  async function showGroup(group, layer, load, messages) {
    const status = group.querySelector('[role="status"]');
    const list = group.querySelector('ul');
    status.textContent = messages.loading;

    let records;
    function render() {
      group.hidden = Boolean(type.value && type.value !== group.id);
      if (!records) return;
      const query = normalize(search.value);
      const matches = records.filter(record => normalize(record.name).includes(query));
      const items = document.createDocumentFragment();
      for (const record of matches) {
        const item = document.createElement('li');
        const positioned = isMapCoordinate(record.map_x) && isMapCoordinate(record.map_y);
        const row = document.createElement(positioned ? 'button' : 'span');
        row.textContent = record.name;
        if (positioned) {
          row.type = 'button';
          row.className = 'directory-location';
          row.setAttribute('aria-label', 'Localizar ' + record.name + ' en el mapa');
          row.addEventListener('click', () => locate(layer, record));
        } else {
          row.className = 'directory-unlocated';
          const note = document.createElement('small');
          note.textContent = 'Sin ubicación';
          row.appendChild(note);
        }
        item.appendChild(row);
        items.appendChild(item);
      }
      list.replaceChildren(items);
      list.hidden = !matches.length;
      status.textContent = matches.length
        ? matches.length + ' ' + (matches.length === 1 ? messages.singular : messages.plural)
        : (records.length ? 'Sin coincidencias.' : messages.empty);
    }
    renderGroups.push(render);
    try {
      const result = await load();
      if (!result.ok) {
        status.textContent = messages.error;
        return;
      }

      renderMarkers(result.data, layer);
      records = result.data.slice().sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
      render();
    } catch {
      status.textContent = messages.error;
    }
  }

  showGroup(document.getElementById('mapEnclosures'), document.getElementById('enclosurePins'), () => ArcaApi.getEnclosures(), {
    loading: 'Cargando recintos…',
    empty: 'No hay recintos para mostrar.',
    error: 'No se pudieron cargar los recintos. Actualiza la página para reintentar.',
    singular: 'recinto',
    plural: 'recintos'
  });
  showGroup(document.getElementById('mapPlaces'), document.getElementById('placePins'), () => ArcaApi.getZooPlaces(), {
    loading: 'Cargando lugares…',
    empty: 'No hay lugares de interés para mostrar.',
    error: 'No se pudieron cargar los lugares de interés. Actualiza la página para reintentar.',
    singular: 'lugar',
    plural: 'lugares'
  });
})();

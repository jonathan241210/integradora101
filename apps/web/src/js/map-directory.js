(function () {
  'use strict';

  function isMapCoordinate(value) {
    return Number.isFinite(value) && value >= 0 && value <= 1;
  }

  function positionStartByTicketOffice(places) {
    const start = places.find(place => ['inicio', 'entrada'].includes(normalize(place.name)));
    const office = places.find(place => ['boletaje', 'taquilla'].includes(normalize(place.name)));
    // Centro de Boletaje en el plano canónico, para la consulta sin conexión.
    const x = office && isMapCoordinate(office.map_x) && isMapCoordinate(office.map_y) ? office.map_x : 0.3066;
    const y = office && isMapCoordinate(office.map_x) && isMapCoordinate(office.map_y) ? office.map_y : 0.6847;
    const ticketPin = { ...office, id: office?.id ?? 'plan-office', name: office?.name ?? 'Boletaje', landmark: 'office', map_x: x, map_y: y };
    const startPin = { ...start, id: start?.id ?? 'plan-start', name: start?.name ?? 'Entrada', landmark: 'start',
      map_x: x + (x <= .97 ? .03 : -.03), map_y: y + (y >= 20 / 1200 ? -20 / 1200 : 20 / 1200) };
    const points = places.map(place => place === start ? startPin : place === office ? ticketPin : place);
    if (!start) points.push(startPin);
    if (!office) points.push(ticketPin);
    return points;
  }

  function landmarkLabel(record) {
    if (record.landmark === 'start') return 'Entrada';
    if (record.landmark === 'office') return 'Boletaje';
    return record.name;
  }

  const positionedGroups = new Map();

  function selectModelPin(slot) {
    document.getElementById('mapScene').dispatchEvent(new CustomEvent('zoo-map-select-area', { detail: slot }));
  }

  function addModelPins(model, records, group) {
    const isPlace = group === 'placePins';
    for (const record of records) {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = isPlace ? 'model-pin place-pin' : 'model-pin';
      if (record.landmark) pin.className += ' landmark-' + record.landmark;
      pin.slot = 'hotspot-' + group + '-' + record.id;
      pin.addEventListener('click', () => selectModelPin(pin.slot));
      // El SVG mide 1600 × 1200 px. Cada píxel representa 0,01 m en este GLB.
      const x = record.map_x * 16 - 8.025897;
      const z = record.map_y * 12 - 5.140369;
      pin.setAttribute('data-position', x + 'm ' + (isPlace ? 0.425 : 0.265) + 'm ' + z + 'm');
      pin.setAttribute('data-normal', '0 1 0');
      const label = document.createElement('span');
      label.textContent = landmarkLabel(record);
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
      if (record.landmark) marker.className += ' landmark-' + record.landmark;
      marker.id = layer.id + '-' + record.id;
      marker.style.left = record.map_x * 100 + '%';
      marker.style.top = record.map_y * 100 + '%';
      const label = document.createElement('span');
      label.textContent = landmarkLabel(record);
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
    const key = layer.id + '-' + record.id;
    if (document.getElementById('mapPlan').hidden) {
      selectModelPin('hotspot-' + key);
      document.getElementById('mapScene').scrollIntoView({ block: 'center' });
    } else {
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
      const matches = records.filter(record => (normalize(record.name).includes(query) || normalize(landmarkLabel(record)).includes(query) || (record.landmark === 'start' && 'inicio'.includes(query))));
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
      if (!result.ok) throw new Error(messages.error);

      const points = layer.id === 'placePins' ? positionStartByTicketOffice(result.data) : result.data;
      renderMarkers(points, layer);
      records = points.filter(point => typeof point.id !== 'string' || !point.id.startsWith('plan-')).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
      render();
    } catch {
      if (layer.id === 'placePins') renderMarkers(positionStartByTicketOffice([]), layer);
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

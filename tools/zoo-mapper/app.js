// ARCA-NB · Mapeador GPS de Recintos (PWA)
// Almacenamiento local desacoplado para levantamiento en campo en el Zoológico Nicolás Bravo

const STORAGE_KEY = 'arca_zoo_mapper_enclosures_v1';

// Estado global de la aplicación
let currentGps = {
  lat: null,
  lon: null,
  accuracy: null,
  timestamp: null
};

let draftItem = null;
let enclosures = [];

// Coordenadas mostradas en la animación tipo reloj/odómetro
let displayedCoords = {
  lat: null,
  lon: null
};
let isRolling = false;
let animationFrameId = null;

// Elementos del DOM
const semaphoreCard = document.getElementById('semaphoreCard');
const semaphoreLabel = document.getElementById('semaphoreLabel');
const accuracyLabel = document.getElementById('accuracyLabel');
const semaphoreDesc = document.getElementById('semaphoreDesc');

const latDisplay = document.getElementById('latDisplay');
const lonDisplay = document.getElementById('lonDisplay');
const gpsPulseDot = document.getElementById('gpsPulseDot');
const motionStatus = document.getElementById('motionStatus');

const enclosureNameInput = document.getElementById('enclosureName');
const btnPasteCoords = document.getElementById('btnPasteCoords');

const draftCard = document.getElementById('draftCard');
const draftTreeName = document.getElementById('draftTreeName');
const draftTreeCoords = document.getElementById('draftTreeCoords');
const btnConfirm = document.getElementById('btnConfirm');
const btnCancel = document.getElementById('btnCancel');

const enclosuresList = document.getElementById('enclosuresList');
const counterBadge = document.getElementById('counterBadge');
const savedCountLabel = document.getElementById('savedCountLabel');
const btnExportJson = document.getElementById('btnExportJson');
const btnExportCsv = document.getElementById('btnExportCsv');
const btnClearAll = document.getElementById('btnClearAll');
const btnSimulateWalk = document.getElementById('btnSimulateWalk');
const exportHint = document.getElementById('exportHint');

// 1. Inicialización
document.addEventListener('DOMContentLoaded', () => {
  loadStoredEnclosures();
  initGeolocation();
  initServiceWorker();
  setupEventListeners();
});

// 2. Chips rápidos
window.setChip = function(name) {
  enclosureNameInput.value = name;
  enclosureNameInput.focus();
};

// 3. Geolocalización en vivo (watchPosition continuo + heartbeat activo)
function initGeolocation() {
  if (!('geolocation' in navigator)) {
    updateSemaphoreState('error', 'GPS no disponible', 'Este navegador no soporta geolocalización');
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 0
  };

  const onLocationSuccess = (position) => {
    const prevLat = currentGps.lat;
    const prevLon = currentGps.lon;

    currentGps.lat = position.coords.latitude;
    currentGps.lon = position.coords.longitude;
    currentGps.accuracy = position.coords.accuracy;
    currentGps.timestamp = new Date(position.timestamp);

    // Detectar si estás caminando o detenido en tiempo real
    if (motionStatus) {
      if (position.coords.speed != null && position.coords.speed > 0.3) {
        const kmh = (position.coords.speed * 3.6).toFixed(1);
        motionStatus.textContent = `🚶 Caminando (${kmh} km/h)`;
        motionStatus.style.color = '#4ade80';
      } else if (prevLat !== null && (Math.abs(prevLat - currentGps.lat) > 0.000008 || Math.abs(prevLon - currentGps.lon) > 0.000008)) {
        motionStatus.textContent = '🚶 En movimiento';
        motionStatus.style.color = '#38bdf8';
      } else {
        motionStatus.textContent = '📍 Detenido / Fijo';
        motionStatus.style.color = '#94a3b8';
      }
    }

    updateGpsUi();
  };

  const onLocationError = (error) => {
    let msg = 'Error obteniendo señal';
    if (error.code === error.PERMISSION_DENIED) {
      msg = 'Permiso GPS denegado. Permite la ubicación en el navegador.';
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      msg = 'Buscando satélites... Sal a cielo despejado.';
    } else if (error.code === error.TIMEOUT) {
      msg = 'Buscando satélites...';
    }
    updateSemaphoreState('error', 'Sin señal GPS', msg);
  };

  // Escucha continua al sensor físico
  navigator.geolocation.watchPosition(onLocationSuccess, onLocationError, options);

  // Heartbeat continuo cada 1.8s para evitar que navegadores móviles duerman el GPS
  setInterval(() => {
    navigator.geolocation.getCurrentPosition(onLocationSuccess, () => {}, options);
  }, 1800);
}

function updateGpsUi() {
  const acc = currentGps.accuracy;
  accuracyLabel.textContent = `±${acc.toFixed(1)} m`;

  // Animar los números de las coordenadas como odómetro / reloj digital
  animateRollingCoords(currentGps.lat, currentGps.lon);

  if (acc <= 5.0) {
    updateSemaphoreState('good', '🟢 Señal Excelente', 'Margen óptimo para registrar el recinto.', acc);
  } else if (acc <= 15.0) {
    updateSemaphoreState('medium', '🟡 Señal Regular', 'Espera unos segundos a que fije más satélites...', acc);
  } else {
    updateSemaphoreState('poor', '🔴 Señal Imprecisa', 'Margen de error alto. Espera o muévete a cielo despejado.', acc);
  }
}

// Animación fluida de cambio numérico (estilo reloj / odómetro digital)
function animateRollingCoords(targetLat, targetLon) {
  // Pulso satelital visual
  if (gpsPulseDot) {
    gpsPulseDot.classList.add('tick');
    setTimeout(() => gpsPulseDot.classList.remove('tick'), 250);
  }

  // Primera lectura: asignar directamente
  if (displayedCoords.lat === null || displayedCoords.lon === null) {
    displayedCoords.lat = targetLat;
    displayedCoords.lon = targetLon;
    renderCoordsText(targetLat, targetLon, false);
    return;
  }

  // Si ya estamos animando, cancelar frame anterior
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  const startLat = displayedCoords.lat;
  const startLon = displayedCoords.lon;
  const startTime = performance.now();
  const duration = 400; // 400 ms de transición rodante

  latDisplay.classList.add('rolling');
  lonDisplay.classList.add('rolling');

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Curva easeOutCubic para que desacelere como rueda de reloj
    const ease = 1 - Math.pow(1 - progress, 3);

    const currentLat = startLat + (targetLat - startLat) * ease;
    const currentLon = startLon + (targetLon - startLon) * ease;

    renderCoordsText(currentLat, currentLon, true);

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(tick);
    } else {
      displayedCoords.lat = targetLat;
      displayedCoords.lon = targetLon;
      renderCoordsText(targetLat, targetLon, false);
      latDisplay.classList.remove('rolling');
      lonDisplay.classList.remove('rolling');
      animationFrameId = null;
    }
  }

  animationFrameId = requestAnimationFrame(tick);
}

function renderCoordsText(lat, lon, isAnimating) {
  latDisplay.textContent = lat.toFixed(8);
  lonDisplay.textContent = lon.toFixed(8);
}

function updateSemaphoreState(state, label, desc, acc = null) {
  semaphoreCard.classList.remove('state-good', 'state-medium', 'state-poor');

  if (state === 'good') {
    semaphoreCard.classList.add('state-good');
  } else if (state === 'medium') {
    semaphoreCard.classList.add('state-medium');
  } else {
    semaphoreCard.classList.add('state-poor');
  }

  semaphoreLabel.textContent = label;
  semaphoreDesc.textContent = desc;
  if (acc !== null) {
    accuracyLabel.textContent = `±${acc.toFixed(1)} m`;
  }
}

// 4. Captura y vista previa tipo Árbol
function setupEventListeners() {
  btnPasteCoords.addEventListener('click', handlePasteCoords);
  btnConfirm.addEventListener('click', handleConfirmDraft);
  btnCancel.addEventListener('click', handleCancelDraft);
  btnExportJson.addEventListener('click', handleExportJson);
  btnExportCsv.addEventListener('click', handleExportCsv);
  btnClearAll.addEventListener('click', handleClearAll);
  if (btnSimulateWalk) {
    btnSimulateWalk.addEventListener('click', handleSimulateWalk);
  }
}

// Simulador de pasos para pruebas en computadora
function handleSimulateWalk() {
  if (currentGps.lat === null || currentGps.lon === null) {
    // Si aún no hay GPS en PC, inicializar en el Zoológico Nicolás Bravo
    currentGps.lat = 20.08380000;
    currentGps.lon = -98.72360000;
    currentGps.accuracy = 3.2;
  } else {
    // Pequeño desplazamiento aleatorio correspondiente a caminar unos metros
    const deltaLat = (Math.random() - 0.45) * 0.000045;
    const deltaLon = (Math.random() - 0.45) * 0.000045;
    currentGps.lat += deltaLat;
    currentGps.lon += deltaLon;
    currentGps.accuracy = 2.5 + Math.random() * 2.5;
  }
  updateGpsUi();
}

function handlePasteCoords() {
  const name = enclosureNameInput.value.trim();
  if (!name) {
    alert('Por favor escribe o selecciona el nombre del recinto primero.');
    enclosureNameInput.focus();
    return;
  }

  if (currentGps.lat === null || currentGps.lon === null) {
    alert('Aún no se reciben coordenadas del GPS. Espera unos segundos a que fije satélites.');
    return;
  }

  // Crear borrador
  draftItem = {
    name: name,
    gps_lat: Number(currentGps.lat.toFixed(8)),
    gps_lon: Number(currentGps.lon.toFixed(8)),
    accuracy: Number(currentGps.accuracy.toFixed(1)),
    timestamp: new Date().toISOString()
  };

  // Mostrar formato árbol
  draftTreeName.textContent = `📍 ${draftItem.name}`;
  draftTreeCoords.textContent = `└── 🌐 Lat: ${draftItem.gps_lat}, Lon: ${draftItem.gps_lon} (±${draftItem.accuracy}m)`;

  draftCard.style.display = 'block';
  draftCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function handleCancelDraft() {
  draftItem = null;
  draftCard.style.display = 'none';
  // Mantiene el nombre en el input para poder reintentar
  enclosureNameInput.focus();
}

function handleConfirmDraft() {
  if (!draftItem) return;

  // Guardar en la lista (formato limpio compatible con DBR-008)
  enclosures.push({
    name: draftItem.name,
    gps_lat: draftItem.gps_lat,
    gps_lon: draftItem.gps_lon
  });

  saveEnclosuresToStorage();
  renderEnclosuresList();

  // Vibración háptica de confirmación si el teléfono la soporta
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch (_) {}
  }

  // Limpiar borrador y formulario
  draftItem = null;
  draftCard.style.display = 'none';
  enclosureNameInput.value = '';
  enclosureNameInput.focus();
}

// 5. Persistencia Local
function loadStoredEnclosures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      enclosures = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error al cargar de localStorage:', e);
    enclosures = [];
  }
  renderEnclosuresList();
}

function saveEnclosuresToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enclosures));
  } catch (e) {
    console.error('Error al guardar en localStorage:', e);
  }
}

// 6. Renderizado de lista
function renderEnclosuresList() {
  const count = enclosures.length;
  counterBadge.textContent = `${count} guardados`;
  savedCountLabel.textContent = `(${count})`;

  btnExportJson.textContent = `📥 Descargar JSON (${count})`;
  btnExportJson.disabled = count === 0;
  btnExportCsv.disabled = count === 0;
  btnClearAll.style.display = count > 0 ? 'block' : 'none';
  if (exportHint) exportHint.style.display = count > 0 ? 'block' : 'none';

  if (count === 0) {
    enclosuresList.innerHTML = '<div class="empty-state">Aún no has registrado ningún recinto.</div>';
    return;
  }

  enclosuresList.innerHTML = '';
  // Se muestran del más reciente al más antiguo
  enclosures.slice().reverse().forEach((item, reversedIndex) => {
    const originalIndex = enclosures.length - 1 - reversedIndex;
    const el = document.createElement('div');
    el.className = 'enclosure-item';
    el.innerHTML = `
      <div class="enclosure-item-info">
        <span class="enclosure-item-name">${escapeHtml(item.name)}</span>
        <span class="enclosure-item-coords">${item.gps_lat}, ${item.gps_lon}</span>
      </div>
      <button type="button" class="btn-delete-item" title="Eliminar" onclick="deleteEnclosure(${originalIndex})">
        🗑️
      </button>
    `;
    enclosuresList.appendChild(el);
  });
}

window.deleteEnclosure = function(index) {
  const item = enclosures[index];
  if (confirm(`¿Eliminar "${item.name}" de la lista?`)) {
    enclosures.splice(index, 1);
    saveEnclosuresToStorage();
    renderEnclosuresList();
  }
};

function handleClearAll() {
  if (confirm(`¿Estás seguro de borrar todos los ${enclosures.length} recintos guardados? Esta acción no se puede deshacer.`)) {
    enclosures = [];
    saveEnclosuresToStorage();
    renderEnclosuresList();
  }
}

// 7. Exportación de archivos
function handleExportJson() {
  if (enclosures.length === 0) return;

  const jsonStr = JSON.stringify(enclosures, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `recintos_zoologico_${getFormattedDate()}.json`);
}

function handleExportCsv() {
  if (enclosures.length === 0) return;

  let csvContent = 'name,gps_lat,gps_lon\n';
  enclosures.forEach((item) => {
    const escapedName = `"${item.name.replace(/"/g, '""')}"`;
    csvContent += `${escapedName},${item.gps_lat},${item.gps_lon}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `recintos_zoologico_${getFormattedDate()}.csv`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 8. Registro de PWA Service Worker
// Una PWA solo se puede instalar y usar el GPS sirviéndose por HTTPS (o localhost).
function initServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[pwa] Este navegador no soporta Service Workers: no habrá modo offline.');
    return;
  }

  const isSecure = location.protocol === 'https:'
    || location.hostname === 'localhost'
    || location.hostname === '127.0.0.1';

  if (!isSecure) {
    console.warn('[pwa] Abre la app por HTTPS o en localhost. Con "file://" no hay instalación ni GPS.');
    return;
  }

  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then((registration) => {
      console.log('[pwa] Service Worker registrado en', registration.scope);

      // El registro se resuelve aunque la instalación falle después: se vigila.
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          console.log('[pwa] Estado del Service Worker:', worker.state);
        });
      });
    })
    .catch((error) => {
      console.error('[pwa] No se pudo registrar el Service Worker:', error);
    });
}

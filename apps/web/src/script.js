(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  const debounce = (fn, wait = 150) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  /* Quita acentos y pasa a minúsculas: "León" -> "leon" */
  const normalize = text =>
    text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');

  const currency = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });
  const formatMXN = value => `${currency.format(value)} MXN`;

  /* ---------- Toast ---------- */
  const toast = $('toast');
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  /* ---------- Navegación móvil ---------- */
  const menuToggle = $('menuToggle');
  const mainNav = $('mainNav');
  const mobileNavigation = window.matchMedia('(max-width: 820px)');

  function setMobileNavigationOpen(isOpen) {
    if (!mobileNavigation.matches) return;
    mainNav.hidden = !isOpen;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú principal' : 'Abrir menú principal');
  }

  function syncNavigationForViewport() {
    const isMobile = mobileNavigation.matches;
    const focusWasInNavigation = mainNav.contains(document.activeElement);
    const toggleHadFocus = document.activeElement === menuToggle;

    menuToggle.hidden = !isMobile;
    mainNav.hidden = isMobile;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú principal');

    if (isMobile && focusWasInNavigation) menuToggle.focus();
    if (!isMobile && toggleHadFocus) mainNav.querySelector('a')?.focus();
  }

  menuToggle.addEventListener('click', () => setMobileNavigationOpen(mainNav.hidden));

  mainNav.addEventListener('click', event => {
    if (!mobileNavigation.matches || !event.target.closest('a')) return;
    setMobileNavigationOpen(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !mobileNavigation.matches || mainNav.hidden) return;
    setMobileNavigationOpen(false);
    menuToggle.focus();
  });

  mobileNavigation.addEventListener('change', syncNavigationForViewport);
  syncNavigationForViewport();

  /* ---------- Filtros de animales ---------- */
  const searchInput = $('searchInput');
  const speciesFilter = $('speciesFilter');
  const habitatFilter = $('habitatFilter');
  const animalCount = $('animalCount');
  const noAnimals = $('noAnimals');

  // Se normaliza una sola vez, no en cada pulsación de tecla
  const animalCards = [...document.querySelectorAll('.animal-card')].map(card => ({
    card,
    name: normalize(card.dataset.name),
    species: card.dataset.species,
    habitat: card.dataset.habitat
  }));

  function filterAnimals() {
    const query = normalize(searchInput.value.trim());
    const species = speciesFilter.value;
    const habitat = habitatFilter.value;
    let visibleCount = 0;

    animalCards.forEach(item => {
      const matches = item.name.includes(query)
        && (!species || item.species === species)
        && (!habitat || item.habitat === habitat);
      item.card.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    animalCount.textContent = `${visibleCount} ${visibleCount === 1 ? 'animal encontrado' : 'animales encontrados'}`;
    noAnimals.hidden = visibleCount !== 0;
  }

  searchInput.addEventListener('input', debounce(filterAnimals));
  speciesFilter.addEventListener('change', filterAnimals);
  habitatFilter.addEventListener('change', filterAnimals);

  $('searchForm').addEventListener('submit', event => {
    event.preventDefault();
    filterAnimals();
    $('animales').scrollIntoView({ behavior: scrollBehavior() });
  });

  $('clearFilters').addEventListener('click', () => {
    searchInput.value = '';
    speciesFilter.value = '';
    habitatFilter.value = '';
    filterAnimals();
    searchInput.focus();
  });

  filterAnimals();

  /* ---------- Mapa: selección (delegación de eventos) ---------- */
  const mapSection = document.querySelector('.map-section');
  const mapControls = [...mapSection.querySelectorAll('.map-control')];
  const mapSelection = $('mapSelection');

  mapSection.addEventListener('click', event => {
    const point = event.target.closest('.map-control');
    if (!point) return;

    mapControls.forEach(control => {
      const isSelected = control.dataset.name === point.dataset.name;
      control.setAttribute('aria-pressed', String(isSelected));
      control.classList.toggle('active', isSelected);
    });

    mapSelection.textContent = `Seleccionaste: ${point.dataset.name}. Consulta al personal para encontrar esta zona.`;
  });

  /* ---------- Mapa: zoom ---------- */
  const mapScene = $('mapScene');
  const mapZoomIn = $('mapZoomIn');
  const mapZoomOut = $('mapZoomOut');
  const mapZoomStatus = $('mapZoomStatus');
  const MAP_ZOOM_MIN = 100;
  const MAP_ZOOM_MAX = 150;
  const MAP_ZOOM_STEP = 10;
  let mapZoom = MAP_ZOOM_MIN;

  function setMapZoom(value) {
    mapZoom = Math.min(Math.max(value, MAP_ZOOM_MIN), MAP_ZOOM_MAX);
    mapScene.style.setProperty('--map-scale', String(mapZoom / 100));
    mapZoomOut.disabled = mapZoom === MAP_ZOOM_MIN;
    mapZoomIn.disabled = mapZoom === MAP_ZOOM_MAX;
    mapZoomStatus.textContent = `Vista: ${mapZoom} %`;
  }

  mapZoomIn.addEventListener('click', () => setMapZoom(mapZoom + MAP_ZOOM_STEP));
  mapZoomOut.addEventListener('click', () => setMapZoom(mapZoom - MAP_ZOOM_STEP));
  $('mapZoomReset').addEventListener('click', () => setMapZoom(MAP_ZOOM_MIN));
  setMapZoom(MAP_ZOOM_MIN);

  /* ---------- Galería ---------- */
  document.querySelectorAll('.foto').forEach((photo, index) => {
    photo.addEventListener('click', () => showToast(`Fotografía ${index + 1} de la galería`));
  });

  /* ---------- Boletos ---------- */
  const TICKET_PRICE = { adult: 25, child: 16 };
  const MAX_PER_TYPE = 20;
  const CLOSED_DAY = 1; // lunes (0 = domingo)

  const ticketForm = $('ticketForm');
  const ticketTotal = $('ticketTotal');
  const adultsInput = $('adults');
  const childrenInput = $('children');
  const visitDate = $('visitDate');
  const receipt = $('receipt');

  const readQuantity = input => {
    const value = Math.floor(Number(input.value));
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), MAX_PER_TYPE) : 0;
  };

  function updateTicketTotal() {
    const adults = readQuantity(adultsInput);
    const children = readQuantity(childrenInput);
    const total = adults * TICKET_PRICE.adult + children * TICKET_PRICE.child;
    ticketTotal.textContent = formatMXN(total);
    return { adults, children, total };
  }

  adultsInput.addEventListener('input', updateTicketTotal);
  childrenInput.addEventListener('input', updateTicketTotal);

  // Fecha mínima: hoy (en hora local)
  const now = new Date();
  visitDate.min = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');

  // El zoológico no abre los lunes
  visitDate.addEventListener('input', () => {
    const picked = visitDate.value ? new Date(`${visitDate.value}T12:00:00`) : null;
    visitDate.setCustomValidity(
      picked && picked.getDay() === CLOSED_DAY
        ? 'El zoológico cierra los lunes. Elige de martes a domingo.'
        : ''
    );
  });

  ticketForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!ticketForm.reportValidity()) return;

    const { adults, children, total } = updateTicketTotal();
    if (adults + children === 0) {
      showToast('Selecciona al menos un boleto.');
      return;
    }

    const name = $('visitorName').value.trim();
    const email = $('visitorEmail').value.trim();
    const date = new Date(`${visitDate.value}T12:00:00`);

    const title = document.createElement('h3');
    title.textContent = 'Comprobante de muestra';

    const details = document.createElement('p');
    details.textContent = `${name} · ${email} · ${date.toLocaleDateString('es-MX')} · ${adults} adulto(s) · ${children} niño(s)`;

    const amount = document.createElement('strong');
    amount.textContent = `Total estimado: ${formatMXN(total)}`;

    const note = document.createElement('p');
    note.textContent = 'Sin valor de entrada y sin pago realizado. Confirma las tarifas oficiales con el zoológico.';

    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.className = 'btn btn-outline';
    printButton.textContent = 'Imprimir comprobante';
    printButton.addEventListener('click', () => window.print());

    receipt.replaceChildren(title, details, amount, note, printButton);
    receipt.hidden = false;
    receipt.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
  });

  updateTicketTotal();

  /* ---------- Contacto ---------- */
  $('contactForm').addEventListener('submit', event => {
    const form = event.currentTarget;
    event.preventDefault();
    if (!form.reportValidity()) return;
    showToast('Gracias. Este formulario de muestra no envía mensajes.');
    form.reset();
  });
})();
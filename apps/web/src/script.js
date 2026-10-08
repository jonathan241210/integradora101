const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
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

menuToggle.addEventListener('click', () => {
  setMobileNavigationOpen(mainNav.hidden);
});
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

const searchInput = document.getElementById('searchInput');
const speciesFilter = document.getElementById('speciesFilter');
const habitatFilter = document.getElementById('habitatFilter');
const animalCards = [...document.querySelectorAll('.animal-card')];
const animalCount = document.getElementById('animalCount');

function filterAnimals() {
  const query = searchInput.value.trim().toLocaleLowerCase('es');
  const species = speciesFilter.value;
  const habitat = habitatFilter.value;
  let visibleCount = 0;

  animalCards.forEach(card => {
    const matches = card.dataset.name.includes(query)
      && (!species || card.dataset.species === species)
      && (!habitat || card.dataset.habitat === habitat);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  animalCount.textContent = `${visibleCount} ${visibleCount === 1 ? 'animal encontrado' : 'animales encontrados'}`;
  document.getElementById('noAnimals').hidden = visibleCount !== 0;
}

searchInput.addEventListener('input', filterAnimals);
speciesFilter.addEventListener('change', filterAnimals);
habitatFilter.addEventListener('change', filterAnimals);
document.getElementById('searchForm').addEventListener('submit', event => {
  event.preventDefault();
  document.getElementById('animales').scrollIntoView({ behavior: 'smooth' });
  filterAnimals();
});
document.getElementById('clearFilters').addEventListener('click', () => {
  searchInput.value = '';
  speciesFilter.value = '';
  habitatFilter.value = '';
  filterAnimals();
  searchInput.focus();
});
filterAnimals();

const mapControls = [...document.querySelectorAll('.map-control')];
const mapSelection = document.getElementById('mapSelection');

mapControls.forEach(point => {
  point.addEventListener('click', () => {
    mapControls.forEach(control => {
      const isSelected = control.dataset.name === point.dataset.name;
      control.setAttribute('aria-pressed', String(isSelected));
      control.classList.toggle('active', isSelected);
    });
    mapSelection.textContent = `Seleccionaste: ${point.dataset.name}. Consulta al personal para encontrar esta zona.`;
  });
});

const mapScene = document.getElementById('mapScene');
const mapZoomIn = document.getElementById('mapZoomIn');
const mapZoomOut = document.getElementById('mapZoomOut');
const mapZoomReset = document.getElementById('mapZoomReset');
const mapZoomStatus = document.getElementById('mapZoomStatus');
const mapZoomMin = 100;
const mapZoomMax = 150;
const mapZoomStep = 10;
let mapZoom = mapZoomMin;

const renderMapZoom = () => {
  mapScene.style.setProperty('--map-scale', String(mapZoom / 100));
  mapZoomOut.disabled = mapZoom === mapZoomMin;
  mapZoomIn.disabled = mapZoom === mapZoomMax;
  mapZoomStatus.textContent = `Vista: ${mapZoom} %`;
};

mapZoomIn.addEventListener('click', () => {
  if (mapZoom < mapZoomMax) {
    mapZoom = Math.min(mapZoom + mapZoomStep, mapZoomMax);
    renderMapZoom();
  }
});

mapZoomOut.addEventListener('click', () => {
  if (mapZoom > mapZoomMin) {
    mapZoom = Math.max(mapZoom - mapZoomStep, mapZoomMin);
    renderMapZoom();
  }
});

mapZoomReset.addEventListener('click', () => {
  mapZoom = mapZoomMin;
  renderMapZoom();
});

renderMapZoom();

document.querySelectorAll('.foto').forEach((photo, index) => {
  photo.addEventListener('click', () => showToast(`Fotografía ${index + 1} de la galería`));
});

const ticketForm = document.getElementById('ticketForm');
const ticketTotal = document.getElementById('ticketTotal');
const ticketPrice = { adult: 25, child: 16 };

function updateTicketTotal() {
  const adults = Number(document.getElementById('adults').value) || 0;
  const children = Number(document.getElementById('children').value) || 0;
  const total = adults * ticketPrice.adult + children * ticketPrice.child;
  ticketTotal.textContent = `$${total.toLocaleString('es-MX')} MXN`;
  return { adults, children, total };
}

document.getElementById('adults').addEventListener('input', updateTicketTotal);
document.getElementById('children').addEventListener('input', updateTicketTotal);
const today = new Date();
document.getElementById('visitDate').min = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0')
].join('-');
ticketForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!ticketForm.reportValidity()) return;

  const { adults, children, total } = updateTicketTotal();
  if (adults + children === 0) {
    showToast('Selecciona al menos un boleto.');
    return;
  }

  const name = document.getElementById('visitorName').value.trim();
  const email = document.getElementById('visitorEmail').value.trim();
  const date = new Date(`${document.getElementById('visitDate').value}T12:00:00`);
  const receipt = document.getElementById('receipt');
  receipt.replaceChildren();

  const title = document.createElement('h3');
  title.textContent = 'Comprobante de muestra';
  const details = document.createElement('p');
  details.textContent = `${name} · ${email} · ${date.toLocaleDateString('es-MX')} · ${adults} adulto(s) · ${children} niño(s)`;
  const amount = document.createElement('strong');
  amount.textContent = `Total estimado: $${total.toLocaleString('es-MX')} MXN`;
  const note = document.createElement('p');
  note.textContent = 'Sin valor de entrada y sin pago realizado. Confirma las tarifas oficiales con el zoológico.';
  const printButton = document.createElement('button');
  printButton.type = 'button';
  printButton.className = 'btn btn-outline';
  printButton.textContent = 'Imprimir comprobante';
  printButton.addEventListener('click', () => window.print());
  receipt.append(title, details, amount, note, printButton);
  receipt.hidden = false;
  receipt.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
updateTicketTotal();

document.getElementById('contactForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  showToast('Gracias. Este formulario de muestra no envía mensajes.');
  event.currentTarget.reset();
});

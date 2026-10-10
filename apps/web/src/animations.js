/* =========================================================
   ANIMALITOS CAMINANDO (dibujados en SVG) + ANIMACIONES
   Cargar DESPUÉS de script.js
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     DIBUJOS (todos miran hacia la derecha; el código los
     voltea solo cuando caminan hacia la izquierda)
     --------------------------------------------------------- */
  var DIBUJOS = {

    /* ---------- LEÓN ---------- */
    leon:
      '<svg viewBox="0 0 130 90" style="--amp:26deg;--gait:.7s" aria-hidden="true">' +
        // cola
        '<g class="sway" style="--r:12deg;--sd:1.1s;transform-origin:20px 42px">' +
          '<path d="M20 42 Q4 40 7 20" fill="none" stroke="#c48a3a" stroke-width="5" stroke-linecap="round"/>' +
          '<circle cx="7" cy="18" r="6" fill="#7a3e1c"/>' +
        '</g>' +
        // patas del fondo (más oscuras)
        '<g class="leg a" style="transform-origin:47px 56px"><rect x="42" y="54" width="10" height="28" rx="5" fill="#b07a30"/><ellipse cx="47" cy="83" rx="7" ry="4" fill="#8f6125"/></g>' +
        '<g class="leg b" style="transform-origin:93px 56px"><rect x="88" y="54" width="10" height="28" rx="5" fill="#b07a30"/><ellipse cx="93" cy="83" rx="7" ry="4" fill="#8f6125"/></g>' +
        // cuerpo
        '<ellipse cx="58" cy="44" rx="40" ry="20" fill="#d9a24b"/>' +
        '<ellipse cx="58" cy="54" rx="30" ry="9" fill="#e8bd73" opacity=".7"/>' +
        // patas de enfrente
        '<g class="leg b" style="transform-origin:32px 56px"><rect x="27" y="54" width="10" height="28" rx="5" fill="#d9a24b"/><ellipse cx="32" cy="83" rx="7" ry="4" fill="#b98338"/></g>' +
        '<g class="leg a" style="transform-origin:81px 56px"><rect x="76" y="54" width="10" height="28" rx="5" fill="#d9a24b"/><ellipse cx="81" cy="83" rx="7" ry="4" fill="#b98338"/></g>' +
        // melena y cabeza
        '<g class="sway" style="--r:2.5deg;--sd:.7s;transform-origin:92px 50px">' +
          '<circle cx="98" cy="36" r="24" fill="#7a3e1c"/>' +
          '<circle cx="98" cy="37" r="18" fill="#96501f"/>' +
          '<circle cx="95" cy="22" r="5.5" fill="#e8b45c"/>' +
          '<circle cx="103" cy="40" r="14" fill="#e8b45c"/>' +
          '<ellipse cx="113" cy="45" rx="7.5" ry="5.5" fill="#f3cd8a"/>' +
          '<ellipse cx="118" cy="42" rx="3" ry="2.1" fill="#3b2314"/>' +
          '<path d="M112 49 Q116 53 120 48" fill="none" stroke="#3b2314" stroke-width="1.6" stroke-linecap="round"/>' +
          '<circle cx="108" cy="36" r="2.4" fill="#2b1a0e"/><circle cx="108.7" cy="35.3" r=".8" fill="#fff"/>' +
        '</g>' +
      '</svg>',

    /* ---------- ELEFANTE ---------- */
    elefante:
      '<svg viewBox="0 0 155 105" style="--amp:15deg;--gait:1.3s" aria-hidden="true">' +
        // cola
        '<g class="sway" style="--r:10deg;--sd:1.3s;transform-origin:21px 44px">' +
          '<path d="M21 44 Q9 52 13 68" fill="none" stroke="#7b8794" stroke-width="4" stroke-linecap="round"/>' +
          '<circle cx="13" cy="70" r="3.5" fill="#5f6a76"/>' +
        '</g>' +
        // patas del fondo
        '<g class="leg a" style="transform-origin:58px 68px"><rect x="50" y="64" width="16" height="36" rx="7" fill="#7b8794"/><rect x="51" y="94" width="14" height="6" rx="3" fill="#d9dee3"/></g>' +
        '<g class="leg b" style="transform-origin:108px 68px"><rect x="100" y="64" width="16" height="36" rx="7" fill="#7b8794"/><rect x="101" y="94" width="14" height="6" rx="3" fill="#d9dee3"/></g>' +
        // cuerpo
        '<ellipse cx="66" cy="50" rx="46" ry="30" fill="#919cab"/>' +
        '<ellipse cx="66" cy="66" rx="34" ry="11" fill="#a4aebb" opacity=".6"/>' +
        // patas de enfrente
        '<g class="leg b" style="transform-origin:40px 68px"><rect x="32" y="64" width="16" height="36" rx="7" fill="#919cab"/><rect x="33" y="94" width="14" height="6" rx="3" fill="#e6eaee"/></g>' +
        '<g class="leg a" style="transform-origin:92px 68px"><rect x="84" y="64" width="16" height="36" rx="7" fill="#919cab"/><rect x="85" y="94" width="14" height="6" rx="3" fill="#e6eaee"/></g>' +
        // cabeza
        '<circle cx="114" cy="46" r="20" fill="#98a3b0"/>' +
        // trompa
        '<g class="sway" style="--r:7deg;--sd:1.3s;transform-origin:130px 48px">' +
          '<path d="M130 50 Q147 56 141 84 Q140 93 133 91" fill="none" stroke="#98a3b0" stroke-width="12" stroke-linecap="round"/>' +
          '<path d="M127 60 Q138 66 141 74" fill="none" stroke="#f4f1e6" stroke-width="3.5" stroke-linecap="round"/>' +
        '</g>' +
        // oreja
        '<g class="sway" style="--r:7deg;--sd:.9s;transform-origin:104px 32px">' +
          '<ellipse cx="100" cy="48" rx="15" ry="21" fill="#a7b1bd" stroke="#7b8794" stroke-width="2"/>' +
        '</g>' +
        '<circle cx="121" cy="40" r="2.5" fill="#222"/><circle cx="121.8" cy="39.2" r=".9" fill="#fff"/>' +
      '</svg>',

    /* ---------- JIRAFA ---------- */
    jirafa:
      '<svg viewBox="0 0 125 145" style="--amp:20deg;--gait:1.1s" aria-hidden="true">' +
        // cola
        '<g class="sway" style="--r:12deg;--sd:1.2s;transform-origin:19px 78px">' +
          '<path d="M19 78 Q8 84 10 101" fill="none" stroke="#d9a43f" stroke-width="3" stroke-linecap="round"/>' +
          '<circle cx="10" cy="103" r="3.5" fill="#6b3f1c"/>' +
        '</g>' +
        // patas del fondo
        '<g class="leg a" style="transform-origin:39.5px 96px"><rect x="36" y="92" width="7" height="47" rx="3.5" fill="#cf9a38"/><rect x="36" y="132" width="7" height="8" rx="3" fill="#5e3e20"/></g>' +
        '<g class="leg b" style="transform-origin:77.5px 96px"><rect x="74" y="92" width="7" height="47" rx="3.5" fill="#cf9a38"/><rect x="74" y="132" width="7" height="8" rx="3" fill="#5e3e20"/></g>' +
        // cuerpo
        '<ellipse cx="48" cy="84" rx="31" ry="17" fill="#e8b84a"/>' +
        '<circle cx="36" cy="80" r="5" fill="#b5792a"/><circle cx="52" cy="92" r="4" fill="#b5792a"/>' +
        '<circle cx="60" cy="76" r="5" fill="#b5792a"/><circle cx="44" cy="70" r="3" fill="#b5792a"/>' +
        // patas de enfrente
        '<g class="leg b" style="transform-origin:27.5px 96px"><rect x="24" y="92" width="7" height="47" rx="3.5" fill="#e8b84a"/><rect x="24" y="132" width="7" height="8" rx="3" fill="#6b4a2a"/></g>' +
        '<g class="leg a" style="transform-origin:69.5px 96px"><rect x="66" y="92" width="7" height="47" rx="3.5" fill="#e8b84a"/><rect x="66" y="132" width="7" height="8" rx="3" fill="#6b4a2a"/></g>' +
        // cuello y cabeza
        '<g class="sway" style="--r:2.5deg;--sd:1.1s;transform-origin:72px 82px">' +
          '<polygon points="62,80 84,22 97,28 82,92" fill="#e8b84a"/>' +
          '<path d="M84 22 L64 78" fill="none" stroke="#8a5a22" stroke-width="3" stroke-linecap="round"/>' +
          '<circle cx="82" cy="50" r="4" fill="#b5792a"/><circle cx="77" cy="67" r="4.5" fill="#b5792a"/><circle cx="87" cy="36" r="3" fill="#b5792a"/>' +
          '<line x1="92" y1="17" x2="90" y2="7" stroke="#b5792a" stroke-width="2.5" stroke-linecap="round"/><circle cx="90" cy="6" r="2.6" fill="#5e3e20"/>' +
          '<line x1="98" y1="16" x2="98" y2="6" stroke="#b5792a" stroke-width="2.5" stroke-linecap="round"/><circle cx="98" cy="5" r="2.6" fill="#5e3e20"/>' +
          '<ellipse cx="89" cy="23" rx="5.5" ry="2.6" transform="rotate(-30 89 23)" fill="#cf9a38"/>' +
          '<ellipse cx="100" cy="23" rx="12" ry="8" transform="rotate(14 100 23)" fill="#e8b84a"/>' +
          '<ellipse cx="110" cy="27" rx="6.5" ry="5" fill="#f1cf7c"/>' +
          '<circle cx="113" cy="26" r="1.2" fill="#5e3e20"/>' +
          '<circle cx="101" cy="20" r="2.2" fill="#2b1a0e"/><circle cx="101.7" cy="19.3" r=".7" fill="#fff"/>' +
        '</g>' +
      '</svg>',

    /* ---------- TORTUGA ---------- */
    tortuga:
      '<svg viewBox="0 0 98 55" style="--amp:20deg;--gait:1.8s" aria-hidden="true">' +
        '<path d="M13 40 L3 44 L13 45Z" fill="#7aa05a"/>' +
        // patas del fondo
        '<g class="leg a" style="transform-origin:28px 41px"><rect x="23" y="40" width="10" height="12" rx="4.5" fill="#6d9150"/></g>' +
        '<g class="leg b" style="transform-origin:60px 41px"><rect x="55" y="40" width="10" height="12" rx="4.5" fill="#6d9150"/></g>' +
        // caparazón
        '<path d="M12 41 Q12 8 46 8 Q80 8 80 41 Z" fill="#5d8f45" stroke="#3f6b30" stroke-width="2"/>' +
        '<path d="M28 41 Q28 20 46 15 Q64 20 64 41 M46 15 L46 41 M20 41 Q22 26 31 19 M72 41 Q70 26 61 19" fill="none" stroke="#3f6b30" stroke-width="1.8" stroke-linecap="round"/>' +
        '<rect x="12" y="39" width="68" height="6" rx="3" fill="#c9b27a"/>' +
        // patas de enfrente
        '<g class="leg b" style="transform-origin:21px 41px"><rect x="16" y="40" width="10" height="12" rx="4.5" fill="#7aa05a"/></g>' +
        '<g class="leg a" style="transform-origin:68px 41px"><rect x="63" y="40" width="10" height="12" rx="4.5" fill="#7aa05a"/></g>' +
        // cabeza
        '<g class="sway" style="--r:5deg;--sd:1.8s;transform-origin:78px 38px">' +
          '<rect x="75" y="30" width="9" height="11" rx="4" fill="#8fb36b"/>' +
          '<ellipse cx="87" cy="32" rx="9" ry="7" fill="#8fb36b"/>' +
          '<circle cx="90" cy="30" r="1.9" fill="#222"/>' +
          '<path d="M88 36 Q91 37 94 35" fill="none" stroke="#4b6b33" stroke-width="1.3" stroke-linecap="round"/>' +
        '</g>' +
      '</svg>'
  };

  /* ---------------------------------------------------------
     QUIÉN CAMINA
     - tipo:  leon | elefante | jirafa | tortuga
     - w:     ancho en px (tamaño del animal)
     - dur:   segundos que tarda en cruzar la pantalla (más = más lento)
     - dir:   'der' o 'izq'
     - y:     altura sobre el borde de abajo (da profundidad)
     - ini:   dónde aparece al cargar (0 = al inicio de su camino, 0.5 = a la mitad)
     - dice:  lo que dice al darle clic
     --------------------------------------------------------- */
  var ANIMALES = [
    { tipo: 'leon',     w: 120, dur: 46,  dir: 'der', y: 6,  ini: 0.12, dice: '¡Grrrr! Soy el rey del zoológico' },
    { tipo: 'elefante', w: 140, dur: 64,  dir: 'izq', y: 0,  ini: 0.30, dice: '¡Prrrrr! Los elefantes nunca olvidan' },
    { tipo: 'jirafa',   w: 105, dur: 72,  dir: 'der', y: 2,  ini: 0.55, dice: 'Desde aquí arriba se ve todo' },
    { tipo: 'tortuga',  w: 72,  dur: 130, dir: 'izq', y: 0,  ini: 0.75, dice: 'Voy lento, pero llego' },
    { tipo: 'leon',     w: 80,  dur: 36,  dir: 'izq', y: 10, ini: 0.20, dice: '¡Mi papá es el rey!' },
    { tipo: 'elefante', w: 86,  dur: 58,  dir: 'der', y: 8,  ini: 0.35, dice: '¡Soy el bebé elefante!' }
  ];

  /* ---------------------------------------------------------
     Crear la capa y los animalitos
     --------------------------------------------------------- */
  function crearAnimalitos() {
    var capa = document.createElement('div');
    capa.className = 'zoo-walkers';
    capa.setAttribute('aria-hidden', 'true');
    var mobileQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 560px)')
      : null;
    var caminantes = [];
    var parejaActiva = 0;
    var temporizadorRotacion = null;

    ANIMALES.forEach(function (a, i) {
      var walker = document.createElement('div');
      walker.className = 'walker' + (a.dir === 'izq' ? ' go-left flip' : '');

      walker.style.setProperty('--w', a.w + 'px');
      walker.style.setProperty('--dur', a.dur + 's');
      walker.style.setProperty('--y', a.y + 'px');
      // Delay negativo = ya están a mitad del camino al cargar la página
      walker.style.setProperty('--delay', '-' + (a.ini * a.dur).toFixed(1) + 's');

      walker.innerHTML =
        '<span class="walker-jump">' +
          '<span class="walker-bubble"></span>' +
          '<span class="walker-flip"><span class="walker-body">' + DIBUJOS[a.tipo] + '</span></span>' +
        '</span>';

      walker.querySelector('.walker-bubble').textContent = a.dice;
      caminantes.push(walker);

      var timer;
      walker.addEventListener('click', function () {
        walker.classList.remove('jump');
        void walker.offsetWidth; // reinicia la animación
        walker.classList.add('jump', 'talk');
        clearTimeout(timer);
        timer = setTimeout(function () {
          walker.classList.remove('jump', 'talk');
        }, 2200);
      });

      capa.appendChild(walker);
    });

    var topbar = document.querySelector('.topbar');
    if (topbar) {
      capa.classList.add('is-header-layer');
      topbar.appendChild(capa);
    } else {
      document.body.appendChild(capa);
    }

    function detenerRotacion() {
      if (temporizadorRotacion !== null) {
        clearInterval(temporizadorRotacion);
        temporizadorRotacion = null;
      }
    }

    function mostrarParejaActiva() {
      caminantes.forEach(function (walker, index) {
        walker.hidden = mobileQuery && mobileQuery.matches &&
          Math.floor(index / 2) !== parejaActiva;
      });
    }

    function ajustarAnimalesAlViewport() {
      detenerRotacion();
      parejaActiva = 0;
      mostrarParejaActiva();

      if (!mobileQuery || !mobileQuery.matches) return;

      temporizadorRotacion = setInterval(function () {
        parejaActiva = (parejaActiva + 1) % Math.ceil(caminantes.length / 2);
        mostrarParejaActiva();
      }, 8000);
    }

    if (mobileQuery) {
      if (typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', ajustarAnimalesAlViewport);
      } else if (typeof mobileQuery.addListener === 'function') {
        mobileQuery.addListener(ajustarAnimalesAlViewport);
      }
    }
    ajustarAnimalesAlViewport();

    // Botón para ocultar / mostrar
    var btn = document.createElement('button');
    btn.className = 'walkers-toggle';
    btn.type = 'button';
    btn.textContent = '🐾';
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Mostrar u ocultar los animalitos que caminan');
    btn.title = 'Mostrar u ocultar animalitos';
    btn.addEventListener('click', function () {
      var visibles = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!visibles));
      capa.classList.toggle('is-hidden', visibles);
    });
    document.body.appendChild(btn);
  }

  /* ---------------------------------------------------------
     Contador animado en las estadísticas del hero (63+, 18 hábitats)
     --------------------------------------------------------- */
  function contarEstadisticas() {
    var items = document.querySelectorAll('.hero-stats strong');
    items.forEach(function (el) {
      var m = el.textContent.trim().match(/^(\d+)(.*)$/);
      if (!m) return;
      var meta = parseInt(m[1], 10);
      var resto = m[2];
      var inicio = null;
      var duracion = 1400;

      function paso(t) {
        if (inicio === null) inicio = t;
        var p = Math.min((t - inicio) / duracion, 1);
        var suave = 1 - Math.pow(1 - p, 3); // empieza rápido y frena
        el.textContent = Math.round(meta * suave) + resto;
        if (p < 1) requestAnimationFrame(paso);
      }
      el.textContent = '0' + resto;
      setTimeout(function () { requestAnimationFrame(paso); }, 700);
    });
  }

  /* ---------------------------------------------------------
     Sombra del header al hacer scroll
     --------------------------------------------------------- */
  function headerScroll() {
    var header = document.querySelector('.topbar');
    if (!header) return;
    function revisar() { header.classList.toggle('is-scrolled', window.scrollY > 10); }
    window.addEventListener('scroll', revisar, { passive: true });
    revisar();
  }

  /* ---------------------------------------------------------
     Iniciar
     --------------------------------------------------------- */
  function init() {
    headerScroll();
    if (reduceMotion) return;
    crearAnimalitos();
    contarEstadisticas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
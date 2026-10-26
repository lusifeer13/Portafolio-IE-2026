// --- Cartas: se dan vuelta al pasar el mouse y quedan reveladas 3 segundos después de quitarlo ---

function inicializarTarjetas() {
    document.querySelectorAll('.tarjeta').forEach(function (tarjeta) {
        let temporizador; // Guarda la "cuenta regresiva" de esta carta para poder cancelarla

        function revelar() {
            clearTimeout(temporizador); // Si volvió antes de los 3s, cancela la vuelta pendiente
            tarjeta.classList.add('volteada'); // El CSS hace el giro al aparecer la clase
        }

        function esconderEn3Segundos() {
            temporizador = setTimeout(function () {
                tarjeta.classList.remove('volteada'); // El CSS hace el giro de vuelta
            }, 3000); // 3000 milisegundos = 3 segundos
        }

        // Mouse
        tarjeta.addEventListener('mouseenter', revelar);
        tarjeta.addEventListener('mouseleave', esconderEn3Segundos);

        // Teclado (tecla Tab): mismo comportamiento al entrar y salir del link
        tarjeta.addEventListener('focusin', revelar);
        tarjeta.addEventListener('focusout', esconderEn3Segundos);
    });
}

inicializarTarjetas();


// --- Música de fondo: suena al primer clic en la página y se controla con el botón ♪ ---

const musica = document.getElementById('musica');
const botonMusica = document.getElementById('boton-musica');
const controlMusica = document.getElementById('control-musica');
const sliderVolumen = document.getElementById('volumen-musica');
const VOLUMEN_INICIAL = 0.2; // Volumen al reproducir por primera vez (0 = silencio, 1 = máximo)

function leer(almacen, clave) {
    try { return almacen.getItem(clave); } catch (e) { return null; }
}
function guardar(almacen, clave, valor) {
    try { almacen.setItem(clave, valor); } catch (e) { /* sin almacenamiento local, no pasa nada */ }
}

if (musica && botonMusica && sliderVolumen) {
    let temporizadorFade;

    // Volumen elegido: el último que dejó la persona con el slider, o VOLUMEN_INICIAL la primera vez
    const volumenGuardado = parseFloat(leer(localStorage, 'musica-volumen'));
    let volumenElegido = volumenGuardado >= 0 && volumenGuardado <= 1 ? volumenGuardado : VOLUMEN_INICIAL;
    sliderVolumen.value = volumenElegido;

    // Sube el volumen gradualmente en ~2 segundos para un inicio suave
    function reproducirConFade() {
        clearInterval(temporizadorFade);
        musica.volume = 0;
        return musica.play().then(function () {
            temporizadorFade = setInterval(function () {
                musica.volume = Math.min(volumenElegido, musica.volume + volumenElegido / 40);
                if (musica.volume >= volumenElegido) clearInterval(temporizadorFade);
            }, 50); // 40 pasos x 50 ms = 2 segundos
            return true;
        }).catch(function () {
            return false;
        });
    }

    // Cambia el estado visual y de accesibilidad del botón según el audio
    function actualizarBoton() {
        const sonando = !musica.paused;
        botonMusica.classList.toggle('sonando', sonando);
        botonMusica.setAttribute('aria-pressed', sonando);
        botonMusica.setAttribute('aria-label', sonando ? 'Pausar música' : 'Reproducir música');
    }
    musica.addEventListener('play', actualizarBoton);
    musica.addEventListener('pause', actualizarBoton);

    // Retoma desde donde iba si la persona recargó la página
    const tiempoGuardado = parseFloat(leer(sessionStorage, 'musica-tiempo'));
    if (tiempoGuardado > 0) {
        if (musica.readyState >= 1) {
            musica.currentTime = tiempoGuardado;
        } else {
            musica.addEventListener('loadedmetadata', function () {
                musica.currentTime = tiempoGuardado;
            }, { once: true });
        }
    }
    window.addEventListener('pagehide', function () {
        guardar(sessionStorage, 'musica-tiempo', musica.currentTime);
    });

    // Primer clic, toque o tecla en cualquier parte de la página: inicia la música
    function dejarDeEscuchar() {
        document.removeEventListener('pointerdown', alPrimerGesto);
        document.removeEventListener('keydown', alPrimerGesto);
    }

    function alPrimerGesto(evento) {
        if (controlMusica.contains(evento.target) || leer(localStorage, 'musica-pausada') === 'si') {
            dejarDeEscuchar();
            return;
        }
        reproducirConFade().then(function (sono) {
            if (sono) dejarDeEscuchar();
        });
    }
    document.addEventListener('pointerdown', alPrimerGesto);
    document.addEventListener('keydown', alPrimerGesto);

    // Botón ♪: alterna entre pausa y reproducción
    botonMusica.addEventListener('click', function () {
        if (musica.paused) {
            reproducirConFade();
            guardar(localStorage, 'musica-pausada', 'no');
        } else {
            clearInterval(temporizadorFade);
            musica.pause();
            guardar(localStorage, 'musica-pausada', 'si');
        }
    });

    // Slider de volumen
    sliderVolumen.addEventListener('input', function () {
        volumenElegido = parseFloat(sliderVolumen.value);
        clearInterval(temporizadorFade);
        musica.volume = volumenElegido;
        guardar(localStorage, 'musica-volumen', volumenElegido);
    });
}


// --- Cabecera móvil animada al hacer scroll ---

const cabecera = document.querySelector('header');
if (cabecera) {
    function controlarCabecera() {
        if (window.scrollY > 80) {
            cabecera.classList.add('compacto');
        } else {
            cabecera.classList.remove('compacto');
        }
    }
    window.addEventListener('scroll', controlarCabecera, { passive: true });
    controlarCabecera();
}


// --- Navegación fluida instantánea: la música NUNCA se corta al entrar o salir de las tareas ---

let contenidoGaleriaOriginal = null;
let tituloOriginal = document.title;

function obtenerContenidoGaleria() {
    const main = document.querySelector('main');
    if (!contenidoGaleriaOriginal && main && !main.classList.contains('tarea')) {
        contenidoGaleriaOriginal = main.innerHTML;
        tituloOriginal = document.title;
    }
    return contenidoGaleriaOriginal;
}

obtenerContenidoGaleria();

// Muestra una tarea al instante usando plantillas sin recargar la página ni cortar la música
function mostrarTareaPorPlantilla(numeroTarea, empujarHistorial = true) {
    const plantilla = document.getElementById('plantilla-tarea-' + numeroTarea);
    const mainActual = document.querySelector('main');
    if (!plantilla || !mainActual) return false;

    obtenerContenidoGaleria();

    function aplicar() {
        mainActual.className = plantilla.getAttribute('data-clase') || 'tarea';
        mainActual.innerHTML = plantilla.innerHTML;
        document.title = plantilla.getAttribute('data-titulo') || ('Tarea ' + numeroTarea + ' | Portafolio Luciana Valdés');
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (document.startViewTransition) {
        document.startViewTransition(aplicar);
    } else {
        aplicar();
    }

    if (empujarHistorial) {
        try {
            if (window.location.protocol === 'file:') {
                window.history.pushState({ tarea: numeroTarea }, '', '#tarea-' + numeroTarea);
            } else {
                window.history.pushState({ tarea: numeroTarea }, '', 'tareas/tarea' + numeroTarea + '.html');
            }
        } catch (e) {
            window.history.pushState({ tarea: numeroTarea }, '', '#tarea-' + numeroTarea);
        }
    }
    return true;
}

// Vuelve a la galería principal de forma fluida
function volverAGaleria(empujarHistorial = true, anclaDestino = '#proyectos') {
    const mainActual = document.querySelector('main');
    if (!mainActual) return;

    const galeriaHtml = obtenerContenidoGaleria();
    if (!galeriaHtml) return;

    function aplicar() {
        mainActual.className = '';
        mainActual.innerHTML = galeriaHtml;
        document.title = tituloOriginal;
        inicializarTarjetas();

        if (anclaDestino) {
            const dest = document.querySelector(anclaDestino);
            if (dest) {
                dest.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }

    if (document.startViewTransition) {
        document.startViewTransition(aplicar);
    } else {
        aplicar();
    }

    if (empujarHistorial) {
        try {
            if (window.location.protocol === 'file:') {
                window.history.pushState({ tarea: 0 }, '', window.location.pathname);
            } else {
                window.history.pushState({ tarea: 0 }, '', 'index.html' + (anclaDestino || ''));
            }
        } catch (e) {
            window.history.pushState({ tarea: 0 }, '', window.location.pathname);
        }
    }
}

// Interceptar clics para navegación fluida
document.addEventListener('click', function (evento) {
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
        return;
    }

    const enlace = evento.target.closest('a');
    if (!enlace) return;

    // Enlaces externos o que abran en otra pestaña (Spotify, wikis, etc.)
    if (enlace.target === '_blank' || (enlace.origin && enlace.origin !== window.location.origin)) {
        return;
    }

    const href = enlace.getAttribute('href');
    if (!href) return;

    // 1. Clic en "← Volver a proyectos"
    if (enlace.classList.contains('volver') || href === '../index.html' || href === 'index.html') {
        const main = document.querySelector('main');
        if (main && main.classList.contains('tarea')) {
            evento.preventDefault();
            volverAGaleria(true, '#proyectos');
            return;
        }
    }

    // 2. Clic en una tarjeta de la galería (ej: tareas/tarea1.html o #tarea-1)
    const matchTarea = href.match(/tarea(\d)\.html/i) || href.match(/#tarea-(\d)/i);
    if (matchTarea) {
        const num = matchTarea[1];
        if (mostrarTareaPorPlantilla(num, true)) {
            evento.preventDefault();
            return;
        }
    }

    // 3. Clic en un enlace del índice (#sobre-mi, #imagen-escrita, #proyectos, #otros-proyectos, #contacto)
    const hash = enlace.hash || (href.startsWith('#') ? href : (href.includes('#') ? '#' + href.split('#')[1] : ''));
    if (hash) {
        const main = document.querySelector('main');
        // Si estamos dentro de una tarea y queremos ir a una sección del inicio
        if (main && main.classList.contains('tarea')) {
            evento.preventDefault();
            volverAGaleria(true, hash);
            return;
        }

        // Si ya estamos en la galería principal
        const elemento = document.querySelector(hash);
        if (elemento) {
            evento.preventDefault();
            elemento.scrollIntoView({ behavior: 'smooth' });
            try { window.history.pushState(null, '', hash); } catch (e) {}
            return;
        }
    }
});

// Botones Atrás / Adelante del navegador
window.addEventListener('popstate', function (e) {
    if (e.state && e.state.tarea) {
        mostrarTareaPorPlantilla(e.state.tarea, false);
    } else {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#tarea-')) {
            const num = hash.replace('#tarea-', '');
            mostrarTareaPorPlantilla(num, false);
        } else {
            volverAGaleria(false, hash || '#proyectos');
        }
    }
});

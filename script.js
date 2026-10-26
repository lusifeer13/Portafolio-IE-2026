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

// localStorage y sessionStorage pueden estar bloqueados (modo privado, etc.): por eso el try/catch
function leer(almacen, clave) {
    try { return almacen.getItem(clave); } catch (e) { return null; }
}
function guardar(almacen, clave, valor) {
    try { almacen.setItem(clave, valor); } catch (e) { /* sin memoria, no pasa nada */ }
}

if (musica && botonMusica && sliderVolumen) {
    let temporizadorFade;

    // Volumen elegido: el último que dejó la persona con el slider, o VOLUMEN_INICIAL la primera vez
    const volumenGuardado = parseFloat(leer(localStorage, 'musica-volumen'));
    let volumenElegido = volumenGuardado >= 0 && volumenGuardado <= 1 ? volumenGuardado : VOLUMEN_INICIAL;
    sliderVolumen.value = volumenElegido;

    // Sube el volumen de 0 al volumen elegido en ~2 segundos, para que no parta de golpe
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

    // Cambia el botón según el estado real del audio
    function actualizarBoton() {
        const sonando = !musica.paused;
        botonMusica.classList.toggle('sonando', sonando);
        botonMusica.setAttribute('aria-pressed', sonando);
        botonMusica.setAttribute('aria-label', sonando ? 'Pausar música' : 'Reproducir música');
    }
    musica.addEventListener('play', actualizarBoton);
    musica.addEventListener('pause', actualizarBoton);

    // Retoma desde donde iba si la persona recargó o vino de otra página
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

    // Primer clic, toque o tecla en cualquier parte: empieza la música
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


// --- Navegación fluida (SPA): la música NUNCA se corta al entrar o salir de las tareas ---

function esIndex(urlStr) {
    try {
        const u = new URL(urlStr, window.location.href);
        const path = u.pathname.toLowerCase();
        return path.endsWith('index.html') || path.endsWith('/') || !path.includes('/tareas/');
    } catch (e) {
        return false;
    }
}

async function cargarPagina(urlStr, empujarHistorial = true, hash = '') {
    try {
        const respuesta = await fetch(urlStr);
        if (!respuesta.ok) throw new Error('Error al cargar página');
        const html = await respuesta.text();

        const parser = new DOMParser();
        const docNuevo = parser.parseFromString(html, 'text/html');
        const nuevoMain = docNuevo.querySelector('main');
        const mainActual = document.querySelector('main');

        if (!nuevoMain || !mainActual) {
            window.location.href = urlStr;
            return;
        }

        const estabaEnIndex = esIndex(window.location.href);
        const vaAIndex = esIndex(urlStr);

        function aplicarCambios() {
            // Reemplaza únicamente el contenido del <main>, manteniendo la música intacta
            mainActual.className = nuevoMain.className;
            mainActual.innerHTML = nuevoMain.innerHTML;

            if (docNuevo.title) {
                document.title = docNuevo.title;
            }

            // Si volvimos a la galería principal, reactiva los giros 3D de las tarjetas
            if (vaAIndex) {
                inicializarTarjetas();
            }

            // Desplazamiento suave al lugar correcto
            if (hash) {
                const destino = document.querySelector(hash);
                if (destino) {
                    destino.scrollIntoView({ behavior: 'smooth' });
                }
            } else if (vaAIndex && !estabaEnIndex) {
                // Al volver de una tarea, se desplaza suavemente a la sección de proyectos
                const secProyectos = document.getElementById('proyectos');
                if (secProyectos) {
                    secProyectos.scrollIntoView({ behavior: 'smooth' });
                } else {
                    window.scrollTo({ top: 0, behavior: 'instant' });
                }
            } else {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
        }

        // View Transitions API para navegadores modernos (efecto de transición suave)
        if (document.startViewTransition) {
            document.startViewTransition(aplicarCambios);
        } else {
            aplicarCambios();
        }

        if (empujarHistorial) {
            window.history.pushState({ url: urlStr }, '', urlStr);
        }
    } catch (err) {
        // En caso de error o modo local file://, navega de forma estándar
        window.location.href = urlStr;
    }
}

// Interceptar clics en enlaces internos para navegar sin recargar la página
document.addEventListener('click', function (evento) {
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
        return;
    }

    const enlace = evento.target.closest('a');
    if (!enlace) return;

    // Enlaces externos o que abran en nueva pestaña
    if (enlace.target === '_blank' || enlace.origin !== window.location.origin) {
        return;
    }

    // Si se abrió localmente con file://, navegamos de forma estándar
    if (window.location.protocol === 'file:') {
        return;
    }

    const urlDestino = new URL(enlace.href);
    const hash = urlDestino.hash;

    // Si es un enlace a una sección con ancla (#sobre-mi, #proyectos, etc.)
    if (hash) {
        const elemento = document.querySelector(hash);
        if (elemento && urlDestino.pathname === window.location.pathname) {
            // El elemento está en la pantalla actual: desplazamiento suave inmediato
            evento.preventDefault();
            elemento.scrollIntoView({ behavior: 'smooth' });
            window.history.pushState(null, '', hash);
            return;
        } else {
            // El elemento no está en la pantalla actual (ej: estamos en una tarea y vamos a #sobre-mi)
            evento.preventDefault();
            const urlIndex = esIndex(enlace.href) ? enlace.href : new URL('../index.html', window.location.href).href;
            cargarPagina(urlIndex, true, hash);
            return;
        }
    }

    // Navegación dinámica entre inicio y tareas
    evento.preventDefault();
    cargarPagina(enlace.href, true, hash);
});

// Manejar botones atrás y adelante del navegador sin cortar la música
window.addEventListener('popstate', function () {
    if (window.location.protocol === 'file:') return;
    cargarPagina(window.location.href, false, window.location.hash);
});

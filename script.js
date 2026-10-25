// --- Cartas: se dan vuelta al pasar el mouse y quedan reveladas 3 segundos después de quitarlo ---

// Recorre cada carta de la galería
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

    // Volumen elegido: el último que dejó la persona con el slider, o 0.4 la primera vez
    const volumenGuardado = parseFloat(leer(localStorage, 'musica-volumen'));
    let volumenElegido = volumenGuardado >= 0 && volumenGuardado <= 1 ? volumenGuardado : VOLUMEN_INICIAL;
    sliderVolumen.value = volumenElegido;

    // Sube el volumen de 0 al volumen elegido en ~2 segundos, para que no parta de golpe
    function reproducirConFade() {
        clearInterval(temporizadorFade);
        musica.volume = 0;
        // play() devuelve una promesa: falla si el navegador todavía no permite sonido.
        // Esta función devuelve true si logró sonar y false si no
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

    // Retoma desde donde iba si la persona fue a una tarea y volvió
    const tiempoGuardado = parseFloat(leer(sessionStorage, 'musica-tiempo'));
    if (tiempoGuardado > 0) {
        // readyState >= 1 = el navegador ya conoce la duración (pasa si el audio venía de la caché)
        if (musica.readyState >= 1) {
            musica.currentTime = tiempoGuardado;
        } else {
            musica.addEventListener('loadedmetadata', function () {
                musica.currentTime = tiempoGuardado;
            }, { once: true });
        }
    }
    // pagehide = justo antes de salir de la página
    window.addEventListener('pagehide', function () {
        guardar(sessionStorage, 'musica-tiempo', musica.currentTime);
    });

    // Primer clic, toque o tecla en cualquier parte: empieza la música
    // (salvo que la persona la haya pausado antes: eso se respeta)
    function dejarDeEscuchar() {
        document.removeEventListener('pointerdown', alPrimerGesto);
        document.removeEventListener('keydown', alPrimerGesto);
    }

    function alPrimerGesto(evento) {
        // Si el primer clic fue en el control (botón ♪ o slider), él se encarga (así no se activa dos veces)
        if (controlMusica.contains(evento.target) || leer(localStorage, 'musica-pausada') === 'si') {
            dejarDeEscuchar();
            return;
        }
        reproducirConFade().then(function (sono) {
            if (sono) dejarDeEscuchar(); // Si el navegador lo bloqueó, se intenta en el próximo clic
        });
    }
    document.addEventListener('pointerdown', alPrimerGesto);
    document.addEventListener('keydown', alPrimerGesto);

    // Botón ♪: alterna entre pausa y reproducción, y recuerda la elección
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

    // Slider: el evento "input" se dispara mientras se arrastra, no solo al soltar
    sliderVolumen.addEventListener('input', function () {
        volumenElegido = parseFloat(sliderVolumen.value);
        clearInterval(temporizadorFade); // Si estaba en medio del fade, manda el slider
        musica.volume = volumenElegido;
        guardar(localStorage, 'musica-volumen', volumenElegido);
    });
}

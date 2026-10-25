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

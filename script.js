// ⚠️ PEGA AQUÍ TU URL DE APPS SCRIPT
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyg5CeIFMyuiRiApFVENzfCl0jTIt8pu4rlARxIs8kdkmsgUTQMY7sSASl5wxyVkAMu/exec";

let bancoPalabras = [], palabraActual = "", pistaActual = "", letrasAdivinadas = [], errores = 0, puntajeActual = 0;
const MAX_ERRORES = 6;

const ahorcadoASCII = [
  "  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n========="
];

// Función para animar el cambio de pantallas limpiamente
function cambiarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(idPantalla).classList.add('activa');
}

document.addEventListener("DOMContentLoaded", () => {
    fetch(WEB_APP_URL)
        .then(response => response.json())
        .then(data => {
            if (data.error || data.length === 0) return document.getElementById("pantalla-carga").innerHTML = "<p style='text-align:center;'>Error: Base de datos vacía.</p>";
            bancoPalabras = data;
            iniciarPartida();
        })
        .catch(() => document.getElementById("pantalla-carga").innerHTML = "<p style='text-align:center; color:red;'>Error de conexión.</p>");
});

function iniciarPartida() {
    errores = 0; letrasAdivinadas = [];
    document.getElementById("formPuntaje").style.display = "none";

    const random = Math.floor(Math.random() * bancoPalabras.length);
    palabraActual = bancoPalabras[random].palabra;
    pistaActual = bancoPalabras[random].pista;
    puntajeActual = palabraActual.length * 10;

    document.getElementById("pistaTexto").innerText = pistaActual;
    cambiarPantalla('pantalla-juego');
    actualizarGraficos();
    dibujarTeclado();
}

function actualizarGraficos() {
    document.getElementById("dibujoAhorcado").innerText = ahorcadoASCII[errores];
    
    // Genera corazones rojos vivos y negros vacíos según los errores
    document.getElementById("vidasTexto").innerText = "❤️".repeat(MAX_ERRORES - errores) + "🖤".repeat(errores);

    let textoMostrar = "", victoria = true;
    for (let letra of palabraActual) {
        if (letrasAdivinadas.includes(letra)) { textoMostrar += letra; } 
        else { textoMostrar += "_"; victoria = false; }
    }
    
    document.getElementById("palabraTexto").innerText = textoMostrar;
    
    // Pequeño retraso para que el usuario alcance a ver la última letra antes de cambiar de pantalla
    if (victoria) setTimeout(() => finalizarJuego(true), 300);
    if (errores >= MAX_ERRORES) setTimeout(() => finalizarJuego(false), 300);
}

function dibujarTeclado() {
    const contenedor = document.getElementById("tecladoContenedor");
    contenedor.innerHTML = "";
    "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").forEach(letra => {
        const btn = document.createElement("button");
        btn.innerText = letra;
        btn.classList.add("outline"); // Diseño base secundario
        btn.onclick = () => procesarLetra(letra, btn);
        contenedor.appendChild(btn);
    });
}

function procesarLetra(letra, botonHTML) {
    botonHTML.disabled = true;
    letrasAdivinadas.push(letra);
    
    // En lugar de inyectar estilos sueltos, ahora asignamos clases CSS
    if (palabraActual.includes(letra)) {
        botonHTML.classList.remove("outline");
        botonHTML.classList.add("acierto");
    } else {
        botonHTML.classList.remove("outline");
        botonHTML.classList.add("error");
        errores++;
    }
    actualizarGraficos();
}

function finalizarJuego(gano) {
    cambiarPantalla('pantalla-resultado');
    document.getElementById("palabraRevelada").innerText = palabraActual;
    
    const mensajeFinal = document.getElementById("mensajeFinal");
    if (gano) {
        mensajeFinal.innerText = "¡Ganaste! 🎉";
        mensajeFinal.style.color = "#2ea043"; // Verde
        document.getElementById("formPuntaje").style.display = "block";
    } else {
        mensajeFinal.innerText = "Game Over 💀";
        mensajeFinal.style.color = "#da3633"; // Rojo
    }
}

document.getElementById("formPuntaje").addEventListener("submit", (e) => {
    e.preventDefault();
    const btnGuardar = document.getElementById("btnGuardar");
    btnGuardar.disabled = true; btnGuardar.innerText = "Guardando...";

    fetch(WEB_APP_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jugador: document.getElementById("nombreJugador").value, puntaje: puntajeActual })
    }).then(() => {
        alert("¡Puntaje guardado con éxito!");
        document.getElementById("formPuntaje").style.display = "none";
    }).finally(() => {
        btnGuardar.disabled = false; btnGuardar.innerText = "Guardar Puntaje";
    });
});

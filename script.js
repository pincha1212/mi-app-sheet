// ⚠️ PEGA AQUÍ LA NUEVA URL DE APPS SCRIPT
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

document.addEventListener("DOMContentLoaded", () => {
    fetch(WEB_APP_URL)
        .then(response => response.json())
        .then(data => {
            if (data.error || data.length === 0) return document.getElementById("pantalla-carga").innerHTML = "<p>Error: Base de datos vacía.</p>";
            bancoPalabras = data;
            iniciarPartida();
        })
        .catch(() => document.getElementById("pantalla-carga").innerHTML = "<p>Error de conexión.</p>");
});

function iniciarPartida() {
    errores = 0; letrasAdivinadas = [];
    document.getElementById("pantalla-carga").style.display = "none";
    document.getElementById("pantalla-resultado").style.display = "none";
    document.getElementById("pantalla-juego").style.display = "block";
    document.getElementById("formPuntaje").style.display = "none";

    const random = Math.floor(Math.random() * bancoPalabras.length);
    palabraActual = bancoPalabras[random].palabra;
    pistaActual = bancoPalabras[random].pista;
    puntajeActual = palabraActual.length * 10;

    document.getElementById("pistaTexto").innerText = pistaActual;
    actualizarGraficos();
    dibujarTeclado();
}

function actualizarGraficos() {
    document.getElementById("dibujoAhorcado").innerText = ahorcadoASCII[errores];
    document.getElementById("vidasTexto").innerText = MAX_ERRORES - errores;

    let textoMostrar = "", victoria = true;
    for (let letra of palabraActual) {
        if (letrasAdivinadas.includes(letra)) { textoMostrar += letra; } 
        else { textoMostrar += "_"; victoria = false; }
    }
    
    document.getElementById("palabraTexto").innerText = textoMostrar;
    if (victoria) finalizarJuego(true);
    if (errores >= MAX_ERRORES) finalizarJuego(false);
}

function dibujarTeclado() {
    const contenedor = document.getElementById("tecladoContenedor");
    contenedor.innerHTML = "";
    "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").forEach(letra => {
        const btn = document.createElement("button");
        btn.innerText = letra;
        btn.classList.add("outline");
        btn.onclick = () => procesarLetra(letra, btn);
        contenedor.appendChild(btn);
    });
}

function procesarLetra(letra, botonHTML) {
    botonHTML.disabled = true;
    letrasAdivinadas.push(letra);
    if (palabraActual.includes(letra)) {
        botonHTML.style.backgroundColor = "green"; botonHTML.style.color = "white";
    } else {
        botonHTML.style.backgroundColor = "red"; botonHTML.style.color = "white";
        errores++;
    }
    actualizarGraficos();
}

function finalizarJuego(gano) {
    document.getElementById("pantalla-juego").style.display = "none";
    document.getElementById("pantalla-resultado").style.display = "block";
    document.getElementById("palabraRevelada").innerText = palabraActual;
    document.getElementById("mensajeFinal").innerText = gano ? "¡Ganaste!" : "Game Over";
    if (gano) document.getElementById("formPuntaje").style.display = "block";
}

document.getElementById("formPuntaje").addEventListener("submit", (e) => {
    e.preventDefault();
    const btnGuardar = document.getElementById("btnGuardar");
    btnGuardar.disabled = true; btnGuardar.innerText = "Guardando...";

    fetch(WEB_APP_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jugador: document.getElementById("nombreJugador").value, puntaje: puntajeActual })
    }).then(() => {
        alert("¡Puntaje guardado!");
        document.getElementById("formPuntaje").style.display = "none";
    }).finally(() => {
        btnGuardar.disabled = false; btnGuardar.innerText = "Guardar Puntaje";
    });
});

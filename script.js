// ⚠️ PEGA AQUÍ TU URL DE APPS SCRIPT (Sigue siendo la misma de siempre)
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

function cambiarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(idPantalla).classList.add('activa');
}

// 1. CARGA INICIAL (Ahora recibe palabras + ranking)
document.addEventListener("DOMContentLoaded", () => {
    fetch(WEB_APP_URL)
        .then(response => response.json())
        .then(data => {
            if (data.error || !data.palabras || data.palabras.length === 0) {
                return document.getElementById("pantalla-carga").innerHTML = "<p style='text-align:center;'>Error al cargar base de datos.</p>";
            }
            
            bancoPalabras = data.palabras; // Guardamos las palabras
            dibujarRanking(data.ranking);  // Dibujamos la tabla
            
            // En lugar de arrancar el juego de golpe, vamos al menú principal
            cambiarPantalla('pantalla-inicio');
        })
        .catch(() => document.getElementById("pantalla-carga").innerHTML = "<p style='text-align:center; color:red;'>Error de red.</p>");
});

// Función para pintar la tabla
function dibujarRanking(ranking) {
    const tabla = document.getElementById("tabla-ranking");
    tabla.innerHTML = "";
    
    if (ranking.length === 0) {
        tabla.innerHTML = "<tr><td colspan='3'>Aún no hay récords. ¡Sé el primero!</td></tr>";
        return;
    }
    
    const medallas = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    
    ranking.forEach((registro, index) => {
        tabla.innerHTML += `
            <tr>
                <td>${medallas[index]}</td>
                <td>${registro.jugador}</td>
                <td>${registro.puntaje}</td>
            </tr>
        `;
    });
}

function iniciarPartida() {
    errores = 0; letrasAdivinadas = [];
    document.getElementById("formPuntaje").style.display = "none";
    document.getElementById("textoPuntaje").style.display = "none";

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
    document.getElementById("vidasTexto").innerText = "❤️".repeat(MAX_ERRORES - errores) + "🖤".repeat(errores);

    let textoMostrar = "", victoria = true;
    for (let letra of palabraActual) {
        if (letrasAdivinadas.includes(letra)) { textoMostrar += letra; } 
        else { textoMostrar += "_"; victoria = false; }
    }
    document.getElementById("palabraTexto").innerText = textoMostrar;
    
    if (victoria) setTimeout(() => finalizarJuego(true), 300);
    if (errores >= MAX_ERRORES) setTimeout(() => finalizarJuego(false), 300);
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
        botonHTML.classList.remove("outline");
        botonHTML.classList.add("acierto");
    } else {
        botonHTML.classList.remove("outline");
        botonHTML.classList.add("error");
        errores++;
        // Restar puntos por cada error, sin que baje de 0
        puntajeActual = Math.max(0, puntajeActual - 5); 
    }
    actualizarGraficos();
}

function finalizarJuego(gano) {
    cambiarPantalla('pantalla-resultado');
    document.getElementById("palabraRevelada").innerText = palabraActual;
    const mensajeFinal = document.getElementById("mensajeFinal");
    
    if (gano) {
        mensajeFinal.innerText = "¡Ganaste! 🎉";
        mensajeFinal.style.color = "#2ea043";
        document.getElementById("textoPuntaje").style.display = "block";
        document.getElementById("puntosFinales").innerText = puntajeActual;
        document.getElementById("formPuntaje").style.display = "block";
    } else {
        mensajeFinal.innerText = "Game Over 💀";
        mensajeFinal.style.color = "#da3633";
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
        // Recargamos la página para que vuelva al menú principal y actualice el ranking
        setTimeout(() => location.reload(), 1000);
    }).finally(() => {
        btnGuardar.disabled = false; btnGuardar.innerText = "Guardar Puntaje";
    });
});

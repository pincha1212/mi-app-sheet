        // ⚠️ PEGA AQUÍ TU URL DE APPS SCRIPT
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyg5CeIFMyuiRiApFVENzfCl0jTIt8pu4rlARxIs8kdkmsgUTQMY7sSASl5wxyVkAMu/exec";

// Variables de Estado
let bancoPalabras = [], rankingGlobal = [];
let palabraActual = "", pistaActual = "", ultimaPalabra = "";
let letrasAdivinadas = [], errores = 0, MAX_ERRORES = 6;

// Sistema de Progresión
let puntajeAcumulado = 0;
let puntosPalabraActual = 0;
let rachaActual = 0;
let multiplicador = 1;
let recordPersonal = parseInt(localStorage.getItem("ahorcadoRecord")) || 0;

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

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("menu-record").innerText = recordPersonal;
    const datosCacheados = localStorage.getItem("ahorcadoData");

    if (datosCacheados) {
        const data = JSON.parse(datosCacheados);
        bancoPalabras = data.palabras;
        rankingGlobal = data.ranking;
        dibujarRanking(rankingGlobal);
        cambiarPantalla('pantalla-inicio');
        actualizarDatosSilencioso();
    } else {
        descargarDatosCompletos();
    }
});

function descargarDatosCompletos() {
    fetch(WEB_APP_URL)
        .then(response => response.json())
        .then(data => {
            if (data.error || !data.palabras) throw new Error("Base vacía");
            localStorage.setItem("ahorcadoData", JSON.stringify(data));
            bancoPalabras = data.palabras;
            rankingGlobal = data.ranking;
            dibujarRanking(rankingGlobal);
            cambiarPantalla('pantalla-inicio');
        })
        .catch(() => document.getElementById("pantalla-carga").innerHTML = "<p style='text-align:center; color:red;'>Error de conexión.</p>");
}

function actualizarDatosSilencioso() {
    fetch(WEB_APP_URL).then(r => r.json()).then(data => {
        if (!data.error && data.palabras) {
            localStorage.setItem("ahorcadoData", JSON.stringify(data));
            rankingGlobal = data.ranking;
            dibujarRanking(rankingGlobal);
        }
    }).catch(err => console.log("Caché omitido"));
}

function volverAlMenu() {
    document.getElementById("menu-record").innerText = recordPersonal;
    cambiarPantalla('pantalla-inicio');
    actualizarDatosSilencioso();
}

function dibujarRanking(ranking) {
    const tabla = document.getElementById("tabla-ranking");
    tabla.innerHTML = "";
    if (ranking.length === 0) return tabla.innerHTML = "<tr><td colspan='3'>Aún no hay récords.</td></tr>";
    
    const medallas = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    ranking.forEach((r, i) => {
        tabla.innerHTML += `<tr><td>${medallas[i]}</td><td>${r.jugador}</td><td>${r.puntaje}</td></tr>`;
    });
}

function actualizarUITopBar() {
    document.getElementById("ui-record").innerText = recordPersonal;
    document.getElementById("ui-puntaje").innerText = puntajeAcumulado + puntosPalabraActual;
    document.getElementById("ui-racha").innerText = rachaActual;
    const multSpan = document.getElementById("ui-mult");
    multSpan.innerText = `x${multiplicador}`;
    
    if (multiplicador > 1) multSpan.classList.add("mult-activo");
    else multSpan.classList.remove("mult-activo");
}

// Controla el inicio: 'nuevaPartida' es true si venimos del menú, false si es la siguiente palabra
function iniciarPartida(nuevaPartida = false) {
    if (nuevaPartida) {
        puntajeAcumulado = 0;
        rachaActual = 0;
        ultimaPalabra = "";
    }
    
    errores = 0;
    letrasAdivinadas = [];
    puntosPalabraActual = 0;
    multiplicador = Math.min(1 + Math.floor(rachaActual / 2), 4); // x1, x2 (racha 2), x3 (racha 4)... Max x4
    
    document.getElementById("formPuntaje").style.display = "none";
    
    // Evitar palabra anterior
    let disponibles = bancoPalabras.filter(p => p.palabra !== ultimaPalabra);
    if (disponibles.length === 0) disponibles = bancoPalabras; 
    
    const random = Math.floor(Math.random() * disponibles.length);
    palabraActual = disponibles[random].palabra;
    pistaActual = disponibles[random].pista;
    ultimaPalabra = palabraActual;

    document.getElementById("pistaTexto").innerText = pistaActual;
    cambiarPantalla('pantalla-juego');
    actualizarUITopBar();
    actualizarGraficos();
    dibujarTeclado();
}

function mostrarFeedbackVisual(texto, esPositivo, x, y) {
    const fb = document.createElement("div");
    fb.innerText = texto;
    fb.className = `feedback-flotante ${esPositivo ? 'feedback-pos' : 'feedback-neg'}`;
    fb.style.left = `${x}px`;
    fb.style.top = `${y - 20}px`;
    document.body.appendChild(fb);
    setTimeout(() => fb.remove(), 800);
}

function procesarLetra(letra, botonHTML, event) {
    botonHTML.disabled = true;
    letrasAdivinadas.push(letra);
    
    const rect = botonHTML.getBoundingClientRect();
    const x = event.clientX || rect.left + 15;
    const y = event.clientY || rect.top;

    if (palabraActual.includes(letra)) {
        botonHTML.classList.remove("outline");
        botonHTML.classList.add("acierto");
        
        let ganancia = 10 * multiplicador;
        puntosPalabraActual += ganancia;
        mostrarFeedbackVisual(`+${ganancia}`, true, x, y);
    } else {
        botonHTML.classList.remove("outline");
        botonHTML.classList.add("error");
        
        errores++;
        puntosPalabraActual = Math.max(0, puntosPalabraActual - 5);
        mostrarFeedbackVisual("-5", false, x, y);
        
        const dibujo = document.getElementById("dibujoAhorcado");
        dibujo.classList.add("shake");
        setTimeout(() => dibujo.classList.remove("shake"), 300);
    }
    
    actualizarUITopBar();
    actualizarGraficos();
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
    
    if (victoria) setTimeout(() => finalizarJuego(true), 400);
    if (errores >= MAX_ERRORES) setTimeout(() => finalizarJuego(false), 400);
}

function dibujarTeclado() {
    const contenedor = document.getElementById("tecladoContenedor");
    contenedor.innerHTML = "";
    "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").forEach(letra => {
        const btn = document.createElement("button");
        btn.innerText = letra;
        btn.classList.add("outline");
        btn.onclick = (e) => procesarLetra(letra, btn, e);
        contenedor.appendChild(btn);
    });
}

function obtenerAnalisisRanking(puntaje) {
    if (rankingGlobal.length === 0) return "¡El ranking está vacío! Asegura tu primer lugar.";
    let rank = [...rankingGlobal].sort((a,b) => b.puntaje - a.puntaje);
    
    let pos = rank.findIndex(r => puntaje > r.puntaje);
    if (pos === 0) return "🚀 ¡Tienes puntaje para ser el N°1 Global!";
    if (pos > 0 && pos < 5) {
        let faltan = rank[pos-1].puntaje - puntaje + 1;
        return `🔥 Entrarías al Top ${pos + 1}. Faltan ${faltan} pts para el #${pos}.`;
    }
    if (pos === -1 && rank.length < 5) return `¡Entras directo al Top ${rank.length + 1}!`;
    
    let ultimoTop = rank[rank.length - 1].puntaje;
    let faltan = ultimoTop - puntaje + 1;
    return `Faltan ${faltan} puntos para entrar al Top 5.`;
}

function finalizarJuego(gano) {
    cambiarPantalla('pantalla-resultado');
    document.getElementById("palabraRevelada").innerText = palabraActual;
    const msgFinal = document.getElementById("mensajeFinal");
    const msgRecord = document.getElementById("mensajeRécord");
    
    document.getElementById("formPuntaje").style.display = "none";
    document.getElementById("btnContinuar").style.display = gano ? "inline-block" : "none";

    let bonusVidas = 0;
    let bonusRacha = 0;

    if (gano) {
        msgFinal.innerText = "¡Bien hecho! 🎉";
        msgFinal.style.color = "#2ea043";
        bonusVidas = (MAX_ERRORES - errores) * 15;
        bonusRacha = rachaActual * 20;
        rachaActual++; // Aumenta la racha para la siguiente ronda
    } else {
        msgFinal.innerText = "Game Over 💀";
        msgFinal.style.color = "#da3633";
        rachaActual = 0; // Pierde racha
    }

    puntajeAcumulado += puntosPalabraActual + bonusVidas + bonusRacha;

    // Pintar desglose
    document.getElementById("res-letras").innerText = puntosPalabraActual;
    document.getElementById("res-vidas").innerText = `+${bonusVidas}`;
    document.getElementById("res-racha-num").innerText = rachaActual - (gano ? 1 : 0); // racha de la partida
    document.getElementById("res-racha-pts").innerText = `+${bonusRacha}`;
    document.getElementById("puntosFinales").innerText = puntajeAcumulado;

    // Lógica Récord Personal
    msgRecord.style.display = "none";
    if (puntajeAcumulado > recordPersonal && puntajeAcumulado > 0) {
        recordPersonal = puntajeAcumulado;
        localStorage.setItem("ahorcadoRecord", recordPersonal);
        msgRecord.style.display = "block";
    }

    // Análisis Ranking
    document.getElementById("mensajeRanking").innerText = puntajeAcumulado > 0 ? obtenerAnalisisRanking(puntajeAcumulado) : "";
}

function mostrarFormulario() {
    if (puntajeAcumulado === 0) return volverAlMenu(); // No guarda score de 0
    document.getElementById("btnContinuar").style.display = "none";
    document.getElementById("formPuntaje").style.display = "block";
}

document.getElementById("formPuntaje").addEventListener("submit", (e) => {
    e.preventDefault();
    const btnGuardar = document.getElementById("btnGuardar");
    btnGuardar.disabled = true; btnGuardar.innerText = "Guardando...";

    fetch(WEB_APP_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jugador: document.getElementById("nombreJugador").value, puntaje: puntajeAcumulado })
    }).then(() => {
        alert("¡Puntaje guardado con éxito!");
        volverAlMenu();
    }).finally(() => {
        btnGuardar.disabled = false; btnGuardar.innerText = "Guardar Puntaje";
    });
});
      

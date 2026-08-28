const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyg5CeIFMyuiRiApFVENzfCl0jTIt8pu4rlARxIs8kdkmsgUTQMY7sSASl5wxyVkAMu/exec";

// --- ESTADOS Y VARIABLES ---
let bancoPalabras = [], rankingGlobal = [];
let palabraActual = "", pistaActual = "", ultimaPalabra = "";
let letrasAdivinadas = [], errores = 0, MAX_ERRORES = 6;
let puntajeAcumulado = 0, puntosPalabraActual = 0, rachaActual = 0, multiplicador = 1;
let recordPersonal = parseInt(localStorage.getItem("ahorcadoRecord")) || 0;

// Estado Admin
let modoEdicionAdmin = false;
let palabraOriginalEditando = "";
let busquedaAdmin = "";

const ahorcadoASCII = [
  "  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n========="
];

// --- NAVEGACIÓN GENERAL ---
function cambiarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(idPantalla).classList.add('activa');
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("menu-record").innerText = recordPersonal;
    
    // Listener Buscador Admin en tiempo real
    document.getElementById("admin-buscador").addEventListener("input", (e) => {
        busquedaAdmin = e.target.value.trim().toLowerCase();
        renderizarTablaAdmin();
    });

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

// --- CARGA DE DATOS ---
function guardarCacheLocal() {
    localStorage.setItem("ahorcadoData", JSON.stringify({ palabras: bancoPalabras, ranking: rankingGlobal }));
}

function descargarDatosCompletos() {
    fetch(WEB_APP_URL)
        .then(r => r.json())
        .then(data => {
            if (data.error || !data.palabras) throw new Error("Base vacía");
            bancoPalabras = data.palabras; rankingGlobal = data.ranking;
            guardarCacheLocal();
            dibujarRanking(rankingGlobal);
            cambiarPantalla('pantalla-inicio');
        })
        .catch(() => document.getElementById("pantalla-carga").innerHTML = "<p style='text-align:center; color:red;'>Error de conexión.</p>");
}

function actualizarDatosSilencioso() {
    fetch(WEB_APP_URL).then(r => r.json()).then(data => {
        if (!data.error && data.palabras) {
            bancoPalabras = data.palabras; rankingGlobal = data.ranking;
            guardarCacheLocal();
            dibujarRanking(rankingGlobal);
            if(document.getElementById("pantalla-admin").classList.contains("activa")){
                renderizarTablaAdmin();
            }
        }
    }).catch(err => console.log("Caché omitido"));
}

function volverAlMenu() {
    document.getElementById("menu-record").innerText = recordPersonal;
    cambiarPantalla('pantalla-inicio');
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

// --- LÓGICA DEL JUEGO (MODO JUGADOR) ---
function actualizarUITopBar() {
    document.getElementById("ui-record").innerText = recordPersonal;
    document.getElementById("ui-puntaje").innerText = puntajeAcumulado + puntosPalabraActual;
    document.getElementById("ui-racha").innerText = rachaActual;
    const multSpan = document.getElementById("ui-mult");
    multSpan.innerText = `x${multiplicador}`;
    if (multiplicador > 1) multSpan.classList.add("mult-activo");
    else multSpan.classList.remove("mult-activo");
}

function iniciarPartida(nuevaPartida = false) {
    if (bancoPalabras.length === 0) return alert("El banco de palabras está vacío.");
    
    if (nuevaPartida) {
        puntajeAcumulado = 0; rachaActual = 0; ultimaPalabra = "";
    }
    
    errores = 0; letrasAdivinadas = []; puntosPalabraActual = 0;
    multiplicador = Math.min(1 + Math.floor(rachaActual / 2), 4);
    
    document.getElementById("formPuntaje").style.display = "none";
    
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
    fb.style.left = `${x}px`; fb.style.top = `${y - 20}px`;
    document.body.appendChild(fb);
    setTimeout(() => fb.remove(), 800);
}

function procesarLetra(letra, botonHTML, event) {
    botonHTML.disabled = true; letrasAdivinadas.push(letra);
    
    const rect = botonHTML.getBoundingClientRect();
    const x = event.clientX || rect.left + 15;
    const y = event.clientY || rect.top;

    if (palabraActual.includes(letra)) {
        botonHTML.classList.remove("outline"); botonHTML.classList.add("acierto");
        let ganancia = 10 * multiplicador;
        puntosPalabraActual += ganancia;
        mostrarFeedbackVisual(`+${ganancia}`, true, x, y);
    } else {
        botonHTML.classList.remove("outline"); botonHTML.classList.add("error");
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
        btn.innerText = letra; btn.classList.add("outline");
        btn.onclick = (e) => procesarLetra(letra, btn, e);
        contenedor.appendChild(btn);
    });
}

function obtenerAnalisisRanking(puntaje) {
    if (rankingGlobal.length === 0) return "¡El ranking está vacío! Asegura tu primer lugar.";
    let rank = [...rankingGlobal].sort((a,b) => b.puntaje - a.puntaje);
    let pos = rank.findIndex(r => puntaje > r.puntaje);
    
    if (pos === 0) return "🚀 ¡Tienes puntaje para ser el N°1 Global!";
    if (pos > 0 && pos < 5) return `🔥 Entrarías al Top ${pos + 1}. Faltan ${rank[pos-1].puntaje - puntaje + 1} pts para el #${pos}.`;
    if (pos === -1 && rank.length < 5) return `¡Entras directo al Top ${rank.length + 1}!`;
    return `Faltan ${rank[rank.length - 1].puntaje - puntaje + 1} puntos para entrar al Top 5.`;
}

function finalizarJuego(gano) {
    cambiarPantalla('pantalla-resultado');
    document.getElementById("palabraRevelada").innerText = palabraActual;
    const msgFinal = document.getElementById("mensajeFinal");
    const msgRecord = document.getElementById("mensajeRécord");
    
    document.getElementById("formPuntaje").style.display = "none";
    document.getElementById("btnContinuar").style.display = gano ? "inline-block" : "none";

    let bonusVidas = 0, bonusRacha = 0;
    if (gano) {
        msgFinal.innerText = "¡Bien hecho! 🎉"; msgFinal.style.color = "#2ea043";
        bonusVidas = (MAX_ERRORES - errores) * 15; bonusRacha = rachaActual * 20;
        rachaActual++;
    } else {
        msgFinal.innerText = "Game Over 💀"; msgFinal.style.color = "#da3633";
        rachaActual = 0; 
    }

    puntajeAcumulado += puntosPalabraActual + bonusVidas + bonusRacha;

    document.getElementById("res-letras").innerText = puntosPalabraActual;
    document.getElementById("res-vidas").innerText = `+${bonusVidas}`;
    document.getElementById("res-racha-num").innerText = rachaActual - (gano ? 1 : 0);
    document.getElementById("res-racha-pts").innerText = `+${bonusRacha}`;
    document.getElementById("puntosFinales").innerText = puntajeAcumulado;

    msgRecord.style.display = "none";
    if (puntajeAcumulado > recordPersonal && puntajeAcumulado > 0) {
        recordPersonal = puntajeAcumulado;
        localStorage.setItem("ahorcadoRecord", recordPersonal);
        msgRecord.style.display = "block";
    }
    document.getElementById("mensajeRanking").innerText = puntajeAcumulado > 0 ? obtenerAnalisisRanking(puntajeAcumulado) : "";
}

function mostrarFormularioPuntaje() {
    if (puntajeAcumulado === 0) return volverAlMenu();
    document.getElementById("btnContinuar").style.display = "none";
    document.getElementById("formPuntaje").style.display = "block";
}

document.getElementById("formPuntaje").addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnGuardar");
    btn.disabled = true; btn.innerText = "Guardando...";

    fetch(WEB_APP_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveScore", jugador: document.getElementById("nombreJugador").value, puntaje: puntajeAcumulado })
    }).then(() => {
        alert("¡Puntaje guardado con éxito!");
        volverAlMenu();
    }).finally(() => {
        btn.disabled = false; btn.innerText = "Guardar Puntaje";
    });
});

// --- MODO ADMINISTRADOR (MEJORADO) ---

function abrirAdmin() {
    cambiarPantalla('pantalla-admin');
    cambiarSeccionAdmin('palabras');
    busquedaAdmin = "";
    document.getElementById("admin-buscador").value = "";
    renderizarTablaAdmin();
    cancelarEdicionAdmin();
    setSyncStatus('success');
}

function cambiarSeccionAdmin(seccion) {
    document.querySelectorAll('.sec-admin').forEach(s => s.classList.remove('activa'));
    document.getElementById(`sec-admin-${seccion}`).classList.add('activa');
    document.getElementById("nav-palabras").className = (seccion === 'palabras') ? "primary" : "secondary outline";
    document.getElementById("nav-config").className = (seccion === 'config') ? "primary" : "secondary outline";
}

function setSyncStatus(estado) {
    const s = document.getElementById("sync-status");
    if (estado === 'syncing') {
        s.innerHTML = "⏳ Sincronizando..."; s.style.color = "#58a6ff";
    } else if (estado === 'success') {
        s.innerHTML = "✔️ Sincronizado"; s.style.color = "#2ea043";
    } else {
        s.innerHTML = "⚠️ Error de sincronización"; s.style.color = "#da3633";
    }
}

function mostrarNotificacionAdmin(mensaje, tipo) {
    const toast = document.getElementById("admin-toast");
    toast.innerText = mensaje;
    toast.className = `toast-admin ${tipo} mostrar`;
    setTimeout(() => { toast.classList.remove('mostrar'); }, 3000);
}

function renderizarTablaAdmin() {
    const tbody = document.getElementById("tabla-admin-palabras");
    const contador = document.getElementById("contador-palabras");
    tbody.innerHTML = "";
    
    // 1. Actualiza Contador
    contador.innerText = `${bancoPalabras.length} palabras en el banco`;

    // 2. Estado vacío global
    if (bancoPalabras.length === 0) {
        tbody.innerHTML = `<tr><td colspan='3' style='text-align:center; padding: 3rem 1rem;'>
            <span style="font-size:2rem;">📭</span><br>
            No hay palabras en el banco.<br>Agrega la primera palabra para comenzar.</td></tr>`;
        return;
    }

    // 3. Filtrado por buscador
    const filtradas = bancoPalabras.filter(p => 
        p.palabra.toLowerCase().includes(busquedaAdmin) || 
        p.pista.toLowerCase().includes(busquedaAdmin)
    );

    // 4. Estado vacío por búsqueda
    if (filtradas.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding: 2rem;'>No se encontraron resultados para tu búsqueda.</td></tr>";
        return;
    }

    // 5. Renderizar filas
    filtradas.forEach(item => {
        // Escapar comillas simples para evitar romper el onclick
        const pistaEscapada = item.pista.replace(/'/g, "\\'");
        tbody.innerHTML += `
            <tr>
                <td><strong>${item.palabra}</strong></td>
                <td class="col-pista">${item.pista}</td>
                <td style="text-align: center;">
                    <button class="outline secondary" style="padding: 0.2rem 0.5rem; border:none;" onclick="prepararEdicion('${item.palabra}', '${pistaEscapada}')">✏️</button>
                    <button class="outline secondary" style="padding: 0.2rem 0.5rem; border:none; color: #da3633;" onclick="eliminarPalabra('${item.palabra}')">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function cancelarEdicionAdmin() {
    modoEdicionAdmin = false;
    palabraOriginalEditando = "";
    document.getElementById("formAdminPalabra").reset();
    document.getElementById("titulo-form-admin").innerText = "✨ Agregar Nueva Palabra";
    document.getElementById("admin-btn-guardar").innerText = "Agregar Palabra";
    document.getElementById("admin-btn-cancelar").style.display = "none";
}

function prepararEdicion(palabra, pista) {
    modoEdicionAdmin = true;
    palabraOriginalEditando = palabra;
    document.getElementById("admin-palabra").value = palabra;
    document.getElementById("admin-pista").value = pista;
    document.getElementById("titulo-form-admin").innerText = "✏️ Editando Palabra";
    document.getElementById("admin-btn-guardar").innerText = "Guardar Cambios";
    document.getElementById("admin-btn-cancelar").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById("formAdminPalabra").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const inpPalabra = document.getElementById("admin-palabra").value.trim().toUpperCase();
    const inpPista = document.getElementById("admin-pista").value.trim();
    
    if (!inpPalabra || !inpPista) return mostrarNotificacionAdmin("Datos inválidos. Completa ambos campos.", "error");

    const esDuplicado = bancoPalabras.some(p => p.palabra === inpPalabra && (!modoEdicionAdmin || p.palabra !== palabraOriginalEditando));
    if (esDuplicado) return mostrarNotificacionAdmin("Esta palabra ya existe en el banco.", "error");

    const payload = modoEdicionAdmin 
        ? { action: "editWord", oldPalabra: palabraOriginalEditando, newPalabra: inpPalabra, newPista: inpPista }
        : { action: "addWord", palabra: inpPalabra, pista: inpPista };

    // Actualización local inmediata (Optimista)
    if (modoEdicionAdmin) {
        const idx = bancoPalabras.findIndex(p => p.palabra === palabraOriginalEditando);
        if(idx > -1) bancoPalabras[idx] = { palabra: inpPalabra, pista: inpPista };
        mostrarNotificacionAdmin("Palabra editada correctamente", "success");
    } else {
        bancoPalabras.push({ palabra: inpPalabra, pista: inpPista });
        mostrarNotificacionAdmin("Palabra agregada correctamente", "success");
    }
    
    guardarCacheLocal();
    renderizarTablaAdmin();
    cancelarEdicionAdmin();
    setSyncStatus('syncing');

    // Enviar al servidor
    fetch(WEB_APP_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(() => {
        setSyncStatus('success');
        actualizarDatosSilencioso(); 
    })
    .catch(() => {
        setSyncStatus('error');
        mostrarNotificacionAdmin("Error de conexión con el servidor.", "error");
    });
});

function eliminarPalabra(palabra) {
    if (!confirm(`¿Estás seguro de eliminar la palabra:\n"${palabra}"?`)) return;
    
    // Eliminación local optimista
    bancoPalabras = bancoPalabras.filter(p => p.palabra !== palabra);
    guardarCacheLocal();
    renderizarTablaAdmin();
    mostrarNotificacionAdmin("Palabra eliminada", "success");
    setSyncStatus('syncing');

    // Enviar al servidor
    fetch(WEB_APP_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteWord", palabra: palabra })
    })
    .then(() => {
        setSyncStatus('success');
        actualizarDatosSilencioso();
    })
    .catch(() => {
        setSyncStatus('error');
        mostrarNotificacionAdmin("Error al sincronizar eliminación", "error");
    });
}

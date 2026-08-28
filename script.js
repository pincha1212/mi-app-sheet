const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyg5CeIFMyuiRiApFVENzfCl0jTIt8pu4rlARxIs8kdkmsgUTQMY7sSASl5wxyVkAMu/exec";

// --- ESTADOS LOCALES ---
let bancoPalabras = [], rankingGlobal = [];
let palabraActual = "", pistaActual = "", ultimaPalabra = "";
let letrasAdivinadas = [], errores = 0;
let puntajeAcumulado = 0, puntosPalabraActual = 0, rachaActual = 0, multiplicador = 1;

// Configuración & Stats persistentes
let config = JSON.parse(localStorage.getItem("ahorcadoConfig")) || { vidas: 6, puntosAcierto: 10, penalizacion: 5, maxMult: 4 };
let stats = JSON.parse(localStorage.getItem("ahorcadoStats")) || { jugadas: 0, ganadas: 0, perdidas: 0, mejorPuntaje: 0, mejorRacha: 0, puntosTotales: 0 };
let historial = JSON.parse(localStorage.getItem("ahorcadoHistorial")) || [];

// Estado Admin
let modoEdicionAdmin = false, palabraOriginalEditando = "", busquedaAdmin = "";

const ahorcadoASCII = [
  "  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n========="
];

// --- INICIALIZACIÓN ---
function cambiarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(idPantalla).classList.add('activa');
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("menu-record").innerText = stats.mejorPuntaje;
    document.getElementById("admin-buscador").addEventListener("input", e => { busquedaAdmin = e.target.value.trim().toLowerCase(); renderizarTablaAdmin(); });
    
    // Cargar config en formulario admin
    document.getElementById("cfg-vidas").value = config.vidas;
    document.getElementById("cfg-puntos").value = config.puntosAcierto;
    document.getElementById("cfg-penalizacion").value = config.penalizacion;
    document.getElementById("cfg-mult").value = config.maxMult;

    const datosCacheados = localStorage.getItem("ahorcadoData");
    if (datosCacheados) {
        const data = JSON.parse(datosCacheados);
        bancoPalabras = data.palabras; rankingGlobal = data.ranking;
        dibujarRankingInicio();
        cambiarPantalla('pantalla-inicio');
        actualizarDatosSilencioso();
    } else {
        descargarDatosCompletos();
    }
});

// --- DATOS GLOBALES ---
function guardarCacheLocal() { localStorage.setItem("ahorcadoData", JSON.stringify({ palabras: bancoPalabras, ranking: rankingGlobal })); }

function descargarDatosCompletos() {
    fetch(WEB_APP_URL).then(r => r.json()).then(data => {
        if (data.error || !data.palabras) throw new Error("Base vacía");
        bancoPalabras = data.palabras; rankingGlobal = data.ranking;
        guardarCacheLocal(); dibujarRankingInicio(); cambiarPantalla('pantalla-inicio');
    }).catch(() => document.getElementById("pantalla-carga").innerHTML = "<p style='text-align:center; color:red;'>Error de conexión.</p>");
}

function actualizarDatosSilencioso() {
    fetch(WEB_APP_URL).then(r => r.json()).then(data => {
        if (!data.error && data.palabras) {
            bancoPalabras = data.palabras; rankingGlobal = data.ranking;
            guardarCacheLocal(); dibujarRankingInicio();
            if(document.getElementById("pantalla-admin").classList.contains("activa")) {
                renderizarTablaAdmin(); renderizarRankingAdmin();
            }
        }
    }).catch(err => console.log("Caché omitido"));
}

function dibujarRankingInicio() {
    const tabla = document.getElementById("tabla-ranking-inicio");
    tabla.innerHTML = "";
    const top5 = rankingGlobal.slice(0, 5);
    if (top5.length === 0) return tabla.innerHTML = "<tr><td colspan='3'>Aún no hay récords.</td></tr>";
    const medallas = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    top5.forEach((r, i) => tabla.innerHTML += `<tr><td>${medallas[i]}</td><td>${r.jugador}</td><td>${r.puntaje}</td></tr>`);
}

function volverAlMenu() {
    document.getElementById("menu-record").innerText = stats.mejorPuntaje;
    cambiarPantalla('pantalla-inicio');
}

// --- ESTADÍSTICAS PERSONALES ---
function abrirStats() {
    document.getElementById("stat-jugadas").innerText = stats.jugadas;
    document.getElementById("stat-vd").innerText = `${stats.ganadas} / ${stats.perdidas}`;
    const pct = stats.jugadas > 0 ? Math.round((stats.ganadas / stats.jugadas) * 100) : 0;
    document.getElementById("stat-porcentaje").innerText = `${pct}%`;
    document.getElementById("stat-totales").innerText = stats.puntosTotales;
    document.getElementById("stat-record").innerText = stats.mejorPuntaje;
    document.getElementById("stat-racha").innerText = stats.mejorRacha;

    const tHist = document.getElementById("tabla-historial");
    tHist.innerHTML = "";
    if (historial.length === 0) tHist.innerHTML = "<tr><td colspan='5'>No hay partidas recientes.</td></tr>";
    else {
        historial.forEach(h => {
            const color = h.resultado === "Victoria" ? "#2ea043" : "#da3633";
            tHist.innerHTML += `<tr><td>${h.fecha}</td><td>${h.palabra}</td><td style="color:${color}">${h.resultado}</td><td>${h.puntaje}</td><td>${h.racha}</td></tr>`;
        });
    }
    cambiarPantalla('pantalla-stats');
}

// CORRECCIÓN: Unifica el reinicio de estadísticas globales y la lista de partidas recientes.
function borrarHistorial() {
    if(confirm("¿Seguro que deseas reiniciar todas tus estadísticas y borrar el historial de partidas?")) {
        
        // 1. Reiniciar array historial
        historial = [];
        localStorage.setItem("ahorcadoHistorial", JSON.stringify(historial));
        
        // 2. Reiniciar objeto de estadísticas globales
        stats = { jugadas: 0, ganadas: 0, perdidas: 0, mejorPuntaje: 0, mejorRacha: 0, puntosTotales: 0 };
        localStorage.setItem("ahorcadoStats", JSON.stringify(stats));
        
        // 3. Reiniciar Récord Personal
        localStorage.setItem("ahorcadoRecord", "0");
        document.getElementById("menu-record").innerText = "0";
        document.getElementById("ui-record").innerText = "0";

        // 4. Volver a pintar la pantalla para reflejar los ceros
        abrirStats();
    }
}

function guardarStatsFinales(gano) {
    stats.jugadas++;
    if(gano) stats.ganadas++; else stats.perdidas++;
    stats.puntosTotales += puntajeAcumulado;
    if(puntajeAcumulado > stats.mejorPuntaje) stats.mejorPuntaje = puntajeAcumulado;
    if(rachaActual > stats.mejorRacha) stats.mejorRacha = rachaActual;
    localStorage.setItem("ahorcadoStats", JSON.stringify(stats));

    historial.unshift({
        fecha: new Date().toLocaleDateString("es-AR", {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}),
        resultado: gano ? "Victoria" : "Derrota",
        puntaje: puntajeAcumulado,
        palabra: palabraActual,
        racha: rachaActual - (gano ? 1 : 0)
    });
    if(historial.length > 20) historial.pop();
    localStorage.setItem("ahorcadoHistorial", JSON.stringify(historial));
}

// --- JUEGO ---
function iniciarPartida(nuevaPartida = false) {
    // Aplicar Dificultad
    const dif = document.getElementById("select-dificultad").value;
    let palabrasValidas = bancoPalabras;
    if (dif === 'facil') palabrasValidas = bancoPalabras.filter(p => p.palabra.length >= 4 && p.palabra.length <= 6);
    else if (dif === 'media') palabrasValidas = bancoPalabras.filter(p => p.palabra.length >= 7 && p.palabra.length <= 9);
    else if (dif === 'dificil') palabrasValidas = bancoPalabras.filter(p => p.palabra.length >= 10);

    if (palabrasValidas.length === 0) return alert("No hay palabras en el banco para esta dificultad.");
    
    if (nuevaPartida) { puntajeAcumulado = 0; rachaActual = 0; ultimaPalabra = ""; }
    
    errores = 0; letrasAdivinadas = []; puntosPalabraActual = 0;
    multiplicador = Math.min(1 + Math.floor(rachaActual / 2), config.maxMult);
    
    document.getElementById("formPuntaje").style.display = "none";
    
    let disponibles = palabrasValidas.filter(p => p.palabra !== ultimaPalabra);
    if (disponibles.length === 0) disponibles = palabrasValidas; 
    
    const random = Math.floor(Math.random() * disponibles.length);
    palabraActual = disponibles[random].palabra;
    pistaActual = disponibles[random].pista;
    ultimaPalabra = palabraActual;

    document.getElementById("pistaTexto").innerText = pistaActual;
    cambiarPantalla('pantalla-juego');
    actualizarUITopBar(); actualizarGraficos(); dibujarTeclado();
}

function actualizarUITopBar() {
    document.getElementById("ui-record").innerText = stats.mejorPuntaje;
    document.getElementById("ui-puntaje").innerText = puntajeAcumulado + puntosPalabraActual;
    document.getElementById("ui-racha").innerText = rachaActual;
    const multSpan = document.getElementById("ui-mult");
    multSpan.innerText = `x${multiplicador}`;
    if (multiplicador > 1) multSpan.classList.add("mult-activo"); else multSpan.classList.remove("mult-activo");
}

function mostrarFeedbackVisual(texto, esPositivo, x, y) {
    const fb = document.createElement("div"); fb.innerText = texto;
    fb.className = `feedback-flotante ${esPositivo ? 'feedback-pos' : 'feedback-neg'}`;
    fb.style.left = `${x}px`; fb.style.top = `${y - 20}px`;
    document.body.appendChild(fb); setTimeout(() => fb.remove(), 800);
}

function procesarLetra(letra, botonHTML, event) {
    botonHTML.disabled = true; letrasAdivinadas.push(letra);
    const rect = botonHTML.getBoundingClientRect();
    const x = event.clientX || rect.left + 15, y = event.clientY || rect.top;

    if (palabraActual.includes(letra)) {
        botonHTML.classList.remove("outline"); botonHTML.classList.add("acierto");
        let ganancia = config.puntosAcierto * multiplicador;
        puntosPalabraActual += ganancia;
        mostrarFeedbackVisual(`+${ganancia}`, true, x, y);
    } else {
        botonHTML.classList.remove("outline"); botonHTML.classList.add("error");
        errores++;
        puntosPalabraActual = Math.max(0, puntosPalabraActual - config.penalizacion);
        mostrarFeedbackVisual(`-${config.penalizacion}`, false, x, y);
        const dibujo = document.getElementById("dibujoAhorcado");
        dibujo.classList.add("shake"); setTimeout(() => dibujo.classList.remove("shake"), 300);
    }
    actualizarUITopBar(); actualizarGraficos();
}

function actualizarGraficos() {
    document.getElementById("dibujoAhorcado").innerText = ahorcadoASCII[Math.min(errores, 6)];
    
    let vidasRestantes = Math.max(0, config.vidas - errores);
    document.getElementById("vidasTexto").innerText = "❤️".repeat(vidasRestantes) + "🖤".repeat(Math.min(config.vidas, errores));

    let textoMostrar = "", victoria = true;
    for (let letra of palabraActual) {
        if (letrasAdivinadas.includes(letra)) { textoMostrar += letra; } 
        else { textoMostrar += "_"; victoria = false; }
    }
    document.getElementById("palabraTexto").innerText = textoMostrar;
    
    if (victoria) setTimeout(() => finalizarJuego(true), 400);
    if (errores >= config.vidas) setTimeout(() => finalizarJuego(false), 400);
}

function dibujarTeclado() {
    const contenedor = document.getElementById("tecladoContenedor"); contenedor.innerHTML = "";
    "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").forEach(letra => {
        const btn = document.createElement("button"); btn.innerText = letra; btn.classList.add("outline");
        btn.onclick = (e) => procesarLetra(letra, btn, e); contenedor.appendChild(btn);
    });
}

function obtenerAnalisisRanking(puntaje) {
    if (rankingGlobal.length === 0) return "¡El ranking está vacío! Asegura tu primer lugar.";
    let pos = rankingGlobal.findIndex(r => puntaje > r.puntaje);
    if (pos === 0) return "🚀 ¡Tienes puntaje para ser el N°1 Global!";
    if (pos > 0 && pos < 5) return `🔥 Entrarías al Top ${pos + 1}. Faltan ${rankingGlobal[pos-1].puntaje - puntaje + 1} pts para el #${pos}.`;
    if (pos === -1 && rankingGlobal.length < 5) return `¡Entras directo al Top ${rankingGlobal.length + 1}!`;
    return `Faltan ${rankingGlobal[Math.min(4, rankingGlobal.length - 1)].puntaje - puntaje + 1} puntos para entrar al Top 5.`;
}

function finalizarJuego(gano) {
    cambiarPantalla('pantalla-resultado');
    document.getElementById("palabraRevelada").innerText = palabraActual;
    const msgFinal = document.getElementById("mensajeFinal"), msgRecord = document.getElementById("mensajeRécord");
    document.getElementById("formPuntaje").style.display = "none";
    document.getElementById("btnContinuar").style.display = gano ? "inline-block" : "none";

    let bonusVidas = 0, bonusRacha = 0;
    if (gano) {
        msgFinal.innerText = "¡Bien hecho! 🎉"; msgFinal.style.color = "#2ea043";
        bonusVidas = Math.max(0, config.vidas - errores) * 15; 
        bonusRacha = rachaActual * 20;
        rachaActual++;
    } else {
        msgFinal.innerText = "Game Over 💀"; msgFinal.style.color = "#da3633";
        rachaActual = 0; 
    }

    puntajeAcumulado += puntosPalabraActual + bonusVidas + bonusRacha;
    
    guardarStatsFinales(gano);

    document.getElementById("res-letras").innerText = puntosPalabraActual;
    document.getElementById("res-vidas").innerText = `+${bonusVidas}`;
    document.getElementById("res-racha-num").innerText = rachaActual - (gano ? 1 : 0);
    document.getElementById("res-racha-pts").innerText = `+${bonusRacha}`;
    document.getElementById("puntosFinales").innerText = puntajeAcumulado;

    msgRecord.style.display = "none";
    if (puntajeAcumulado >= stats.mejorPuntaje && puntajeAcumulado > 0) msgRecord.style.display = "block";
    
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
        alert("¡Puntaje guardado con éxito!"); volverAlMenu();
    }).finally(() => { btn.disabled = false; btn.innerText = "Guardar Puntaje"; });
});

// --- MODO ADMIN ---
function abrirAdmin() {
    cambiarPantalla('pantalla-admin'); cambiarSeccionAdmin('palabras');
    busquedaAdmin = ""; document.getElementById("admin-buscador").value = "";
    renderizarTablaAdmin(); renderizarRankingAdmin(); cancelarEdicionAdmin(); setSyncStatus('success');
}

function cambiarSeccionAdmin(seccion) {
    document.querySelectorAll('.sec-admin').forEach(s => s.classList.remove('activa'));
    document.getElementById(`sec-admin-${seccion}`).classList.add('activa');
    document.getElementById("nav-palabras").className = (seccion === 'palabras') ? "primary" : "secondary outline";
    document.getElementById("nav-ranking").className = (seccion === 'ranking') ? "primary" : "secondary outline";
    document.getElementById("nav-config").className = (seccion === 'config') ? "primary" : "secondary outline";
}

function setSyncStatus(estado) {
    const s = document.getElementById("sync-status");
    if (estado === 'syncing') { s.innerHTML = "⏳ Sincronizando..."; s.style.color = "#58a6ff"; } 
    else if (estado === 'success') { s.innerHTML = "✔️ Sincronizado"; s.style.color = "#2ea043"; } 
    else { s.innerHTML = "⚠️ Error de sincronización"; s.style.color = "#da3633"; }
}

function mostrarNotificacionAdmin(mensaje, tipo) {
    const toast = document.getElementById("admin-toast"); toast.innerText = mensaje;
    toast.className = `toast-admin ${tipo} mostrar`; setTimeout(() => toast.classList.remove('mostrar'), 3000);
}

// Admin: Configuración
document.getElementById("formAdminConfig").addEventListener("submit", (e) => {
    e.preventDefault();
    config = {
        vidas: parseInt(document.getElementById("cfg-vidas").value),
        puntosAcierto: parseInt(document.getElementById("cfg-puntos").value),
        penalizacion: parseInt(document.getElementById("cfg-penalizacion").value),
        maxMult: parseInt(document.getElementById("cfg-mult").value)
    };
    localStorage.setItem("ahorcadoConfig", JSON.stringify(config));
    mostrarNotificacionAdmin("Configuración guardada localmente", "success");
});

// Admin: Ranking
function renderizarRankingAdmin() {
    const tbody = document.getElementById("tabla-admin-ranking-full"); tbody.innerHTML = "";
    if (rankingGlobal.length === 0) return tbody.innerHTML = "<tr><td colspan='4'>No hay registros.</td></tr>";
    rankingGlobal.forEach(r => {
        tbody.innerHTML += `<tr><td>${r.fecha}</td><td>${r.jugador}</td><td>${r.puntaje}</td>
            <td><button class="outline" style="padding:0.2rem; color:#da3633; border:none;" onclick="eliminarRankingAdmin('${r.fecha}','${r.jugador}',${r.puntaje})">🗑️</button></td></tr>`;
    });
}

function eliminarRankingAdmin(fecha, jugador, puntaje) {
    if(!confirm(`¿Eliminar puntaje de ${jugador} (${puntaje} pts)?`)) return;
    rankingGlobal = rankingGlobal.filter(r => !(r.fecha === fecha && r.jugador === jugador && r.puntaje === puntaje));
    guardarCacheLocal(); renderizarRankingAdmin(); setSyncStatus('syncing');
    fetch(WEB_APP_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteRanking", fecha: fecha, jugador: jugador, puntaje: puntaje })
    }).then(() => { setSyncStatus('success'); actualizarDatosSilencioso(); }).catch(() => setSyncStatus('error'));
}

// Admin: Palabras
function renderizarTablaAdmin() {
    const tbody = document.getElementById("tabla-admin-palabras"), contador = document.getElementById("contador-palabras");
    tbody.innerHTML = ""; contador.innerText = `${bancoPalabras.length} palabras`;
    if (bancoPalabras.length === 0) return tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>📭 No hay palabras.</td></tr>";
    const filtradas = bancoPalabras.filter(p => p.palabra.toLowerCase().includes(busquedaAdmin) || p.pista.toLowerCase().includes(busquedaAdmin));
    if (filtradas.length === 0) return tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>No se encontraron resultados.</td></tr>";
    filtradas.forEach(item => {
        const pE = item.pista.replace(/'/g, "\\'");
        tbody.innerHTML += `<tr><td><strong>${item.palabra}</strong></td><td class="col-pista">${item.pista}</td>
            <td style="text-align: center;"><button class="outline secondary" style="padding:0.2rem; border:none;" onclick="prepararEdicion('${item.palabra}', '${pE}')">✏️</button>
            <button class="outline secondary" style="padding:0.2rem; border:none; color: #da3633;" onclick="eliminarPalabra('${item.palabra}')">🗑️</button></td></tr>`;
    });
}

function cancelarEdicionAdmin() {
    modoEdicionAdmin = false; palabraOriginalEditando = ""; document.getElementById("formAdminPalabra").reset();
    document.getElementById("titulo-form-admin").innerText = "✨ Agregar Nueva Palabra";
    document.getElementById("admin-btn-guardar").innerText = "Agregar"; document.getElementById("admin-btn-cancelar").style.display = "none";
}

function prepararEdicion(palabra, pista) {
    modoEdicionAdmin = true; palabraOriginalEditando = palabra;
    document.getElementById("admin-palabra").value = palabra; document.getElementById("admin-pista").value = pista;
    document.getElementById("titulo-form-admin").innerText = "✏️ Editando Palabra";
    document.getElementById("admin-btn-guardar").innerText = "Guardar Cambios"; document.getElementById("admin-btn-cancelar").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById("formAdminPalabra").addEventListener("submit", (e) => {
    e.preventDefault();
    const inpPalabra = document.getElementById("admin-palabra").value.trim().toUpperCase(), inpPista = document.getElementById("admin-pista").value.trim();
    if (!inpPalabra || !inpPista) return mostrarNotificacionAdmin("Datos inválidos", "error");
    if (bancoPalabras.some(p => p.palabra === inpPalabra && (!modoEdicionAdmin || p.palabra !== palabraOriginalEditando))) return mostrarNotificacionAdmin("Palabra duplicada.", "error");

    const payload = modoEdicionAdmin ? { action: "editWord", oldPalabra: palabraOriginalEditando, newPalabra: inpPalabra, newPista: inpPista } : { action: "addWord", palabra: inpPalabra, pista: inpPista };
    if (modoEdicionAdmin) {
        const idx = bancoPalabras.findIndex(p => p.palabra === palabraOriginalEditando);
        if(idx > -1) bancoPalabras[idx] = { palabra: inpPalabra, pista: inpPista };
    } else { bancoPalabras.push({ palabra: inpPalabra, pista: inpPista }); }
    
    guardarCacheLocal(); renderizarTablaAdmin(); cancelarEdicionAdmin(); setSyncStatus('syncing'); mostrarNotificacionAdmin("Guardado localmente", "success");
    fetch(WEB_APP_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    .then(() => { setSyncStatus('success'); actualizarDatosSilencioso(); }).catch(() => { setSyncStatus('error'); mostrarNotificacionAdmin("Error servidor", "error"); });
});

function eliminarPalabra(palabra) {
    if (!confirm(`¿Eliminar la palabra "${palabra}"?`)) return;
    bancoPalabras = bancoPalabras.filter(p => p.palabra !== palabra);
    guardarCacheLocal(); renderizarTablaAdmin(); setSyncStatus('syncing'); mostrarNotificacionAdmin("Eliminada", "success");
    fetch(WEB_APP_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteWord", palabra: palabra }) })
    .then(() => { setSyncStatus('success'); actualizarDatosSilencioso(); }).catch(() => setSyncStatus('error'));
}

// --- IMPORTAR / EXPORTAR ---
function exportarCSV() {
    if(bancoPalabras.length === 0) return mostrarNotificacionAdmin("Banco vacío", "error");
    let csv = "palabra,pista\n" + bancoPalabras.map(p => `${p.palabra},${p.pista}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'banco_palabras.csv';
    a.click(); URL.revokeObjectURL(a.href);
}

function importarCSV(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const lineas = e.target.result.split('\n');
        let nuevas = [], duplicadas = 0, invalidas = 0;
        
        for(let i = 1; i < lineas.length; i++) { // Salta cabecera
            const partes = lineas[i].split(',');
            if(partes.length >= 2) {
                const pal = partes[0].trim().toUpperCase();
                const pis = partes.slice(1).join(',').trim(); 
                if(pal && pis) {
                    if(bancoPalabras.some(p => p.palabra === pal) || nuevas.some(n => n[0] === pal)) duplicadas++;
                    else nuevas.push([pal, pis]);
                } else invalidas++;
            }
        }
        
        const msg = `Encontradas: ${lineas.length - 1}\nNuevas: ${nuevas.length}\nDuplicadas: ${duplicadas}\nInválidas: ${invalidas}\n\n¿Importar las nuevas?`;
        if(nuevas.length > 0 && confirm(msg)) {
            setSyncStatus('syncing');
            nuevas.forEach(n => bancoPalabras.push({palabra: n[0], pista: n[1]}));
            guardarCacheLocal(); renderizarTablaAdmin();
            
            fetch(WEB_APP_URL, {
                method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "importWords", words: nuevas })
            }).then(() => { setSyncStatus('success'); actualizarDatosSilencioso(); mostrarNotificacionAdmin("Importación exitosa", "success");
            }).catch(() => { setSyncStatus('error'); mostrarNotificacionAdmin("Error servidor al importar", "error"); });
        } else if (nuevas.length === 0) { alert("No se encontraron palabras nuevas válidas para importar."); }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

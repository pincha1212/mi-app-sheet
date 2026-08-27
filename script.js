// ⚠️ REEMPLAZA ESTA URL POR LA DE TU NUEVA IMPLEMENTACIÓN DE APPS SCRIPT
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyg5CeIFMyuiRiApFVENzfCl0jTIt8pu4rlARxIs8kdkmsgUTQMY7sSASl5wxyVkAMu/exec";

// Cargar datos al inicio y configurar el envío
document.addEventListener("DOMContentLoaded", cargarDatos);
document.getElementById("myForm").addEventListener("submit", enviarDatos);

function cargarDatos() {
    const container = document.getElementById("data-container");
    container.innerHTML = "<p>Cargando datos desde el servidor...</p>";

    fetch(WEB_APP_URL)
        .then(response => response.json())
        .then(data => {
            if (!data || data.length === 0) {
                container.innerHTML = "<p>No hay registros todavía.</p>";
                return;
            }
            
            let html = "<ul>";
            // .reverse() muestra el mensaje más nuevo arriba
            data.reverse().forEach(item => {
                html += `
                    <li style="margin-bottom: 1rem;">
                        <strong>${item.nombre}</strong>: ${item.mensaje} <br>
                        <small style="color:gray;">${item.fecha}</small>
                    </li>`;
            });
            html += "</ul>";
            container.innerHTML = html;
        })
        .catch(error => {
            console.error("Error Fetch:", error);
            container.innerHTML = "<p style='color:red;'>Error al cargar la base de datos.</p>";
        });
}

function enviarDatos(e) {
    e.preventDefault(); 
    
    const btnSubmit = document.getElementById("btnSubmit");
    btnSubmit.disabled = true; 
    btnSubmit.textContent = "Enviando..."; 

    const formData = {
        nombre: document.getElementById("nombre").value,
        mensaje: document.getElementById("mensaje").value
    };

    fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
    })
    .then(() => {
        document.getElementById("myForm").reset(); 
        cargarDatos(); 
    })
    .catch(error => {
        console.error("Error POST:", error);
        alert("Ocurrió un error al enviar el dato.");
    })
    .finally(() => {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Enviar datos";
    });
}

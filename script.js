// ⚠️ TU URL DE GOOGLE APPS SCRIPT
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyg5CeIFMyuiRiApFVENzfCl0jTIt8pu4rlARxIs8kdkmsgUTQMY7sSASl5wxyVkAMu/exec";

// 1. Obtener y mostrar datos al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    fetch(WEB_APP_URL)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("data-container");
            if (!data || data.length === 0) {
                container.innerHTML = "<p>No hay registros todavía.</p>";
                return;
            }
            
            let html = "<ul>";
            data.forEach(row => {
                // Obtenemos las llaves (keys) dinámicamente sin importar cómo se llamen tus columnas
                const keys = Object.keys(row);
                const fecha = row[keys[0]] || '';
                const nombre = row[keys[1]] || 'Sin nombre';
                const mensaje = row[keys[2]] || '';

                html += `<li><strong>${nombre}:</strong> ${mensaje} <small style="color:gray;">(${fecha})</small></li>`;
            });
            html += "</ul>";
            container.innerHTML = html;
        })
        .catch(error => {
            console.error("Error al cargar:", error);
            document.getElementById("data-container").innerHTML = "<p>Error al cargar los datos.</p>";
        });
});

// 2. Enviar datos al hacer submit en el formulario
document.getElementById("myForm").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const formData = {
        nombre: document.getElementById("nombre").value,
        mensaje: document.getElementById("mensaje").value
    };

    fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
    })
    .then(() => {
        alert("¡Datos enviados con éxito!");
        document.getElementById("myForm").reset();
        setTimeout(() => location.reload(), 1000);
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Hubo un error al enviar los datos.");
    });
});

// exportartomas.js

/**
 * Genera un archivo HTML con el storyboard a partir de la escena o escenas seleccionadas.
 */
// exportartomas.js

/**
 * Genera un archivo HTML con el storyboard a partir de la escena o escenas seleccionadas,
 * con un formato visual similar al de un libro.
 */
async function generarHTMLTomas() {
    console.log("Iniciando generación de HTML para Storyboard de Tomas...");
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    const select = document.getElementById('tomas-export-select');
    const selectedSceneId = select.value;

    if (!selectedSceneId) {
        alert("Por favor, selecciona una opción para exportar.");
        return;
    }

    if (typeof storyScenes === 'undefined' || !Array.isArray(storyScenes)) {
        alert("Error: No se ha podido encontrar la lista de escenas (storyScenes no está definida).");
        console.error("La variable global 'storyScenes' no está definida o no es un array.");
        return;
    }

    let escenasAExportar = [];
    if (selectedSceneId === 'all') {
        escenasAExportar = storyScenes;
    } else {
        const escenaSeleccionada = storyScenes.find(s => s.id === selectedSceneId);
        if (escenaSeleccionada) {
            escenasAExportar.push(escenaSeleccionada);
        }
    }

    if (escenasAExportar.length === 0) {
        alert("No hay escenas de storyboard para exportar o la escena seleccionada no se encontró.");
        return;
    }

    // --- INICIO: Contenido del Body del HTML ---
    let bodyContent = `<h1>Storyboard: ${tituloProyecto}</h1>`;

    for (const escena of escenasAExportar) {
        bodyContent += `<h2 class="scene-title">${escena.nombre || 'Escena Sin Título'}</h2>`;

        if (escena.tomas && escena.tomas.length > 0) {
            // Se itera sobre cada toma para crear su contenedor individual
            for (const toma of escena.tomas) {
                
                // Contenedor principal para la toma, con estilo de "frame" de libro
                bodyContent += '<div class="toma-container">';
                
                // 1. Añadir la imagen
                if (toma.imagen && toma.imagen.startsWith('data:image')) {
                     bodyContent += `<img src="${toma.imagen}" alt="Imagen de la toma">`;
                } else {
                    bodyContent += '<div class="no-image-placeholder">Sin Imagen</div>';
                }

                // 2. Añadir el "Prompt Visual" (guionTecnico) sin etiquetas adicionales
                if (toma.guionTecnico) {
                    bodyContent += `<p>${toma.guionTecnico.replace(/\n/g, "<br>")}</p>`;
                }
                
                bodyContent += '</div>'; // Cierre de .toma-container
            }
        } else {
             bodyContent += '<p><em>Esta escena no contiene tomas.</em></p>';
        }
    }
    // --- FIN: Contenido del Body del HTML ---


    // --- Estructura HTML completa con el nuevo CSS ---
    const htmlCompleto = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Storyboard: ${tituloProyecto}</title>
            <style>
                /* Estilos inspirados en la exportación de libro.js para un look limpio */
                body { 
                    font-family: sans-serif; 
                    line-height: 1.6; 
                    margin: 0; 
                    padding: 20px; 
                    background-color: #fff; 
                }
                .container { 
                    max-width: 800px; 
                    margin: auto; 
                    padding: 0 20px; 
                }
                h1 { 
                    color: #2c3e50; 
                    text-align: center; 
                    border-bottom: 2px solid #ecf0f1; 
                    padding-bottom: 15px; 
                    margin-bottom: 30px; 
                }
                .scene-title { 
                    color: #333; 
                    border-bottom: 1px solid #eee; 
                    padding-bottom: 10px; 
                    margin-top: 40px; 
                }
                /* Contenedor principal para cada toma, imitando el estilo de un frame de libro */
                .toma-container { 
                    margin: 40px 0; 
                    padding-left: 20px; 
                    border-left: 3px solid #bdc3c7; 
                    page-break-inside: avoid; 
                }
                .toma-container img { 
                    max-width: 100%; 
                    height: auto; 
                    border-radius: 4px; 
                    margin-bottom: 15px; 
                    border: 1px solid #ddd;
                }
                .no-image-placeholder { 
                    width: 100%; 
                    height: 250px; 
                    background-color: #f1f3f5; 
                    border: 2px dashed #ced4da; 
                    border-radius: 6px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    color: #6c757d; 
                    font-style: italic; 
                    margin-bottom: 15px; 
                }
                /* Estilo para el texto del prompt visual */
                .toma-container p { 
                    white-space: pre-wrap; 
                    margin: 0; 
                    color: #333;
                }
            </style>
        </head>
        <body>
            <div class="container">
                ${bodyContent}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Storyboard_${tituloProyecto.replace(/\s+/g, '_')}.html`;
    a.click();
    console.log("Exportación de Storyboard de Tomas a HTML completada.");
    cerrarModalExportar();
}

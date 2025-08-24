function abrirModalGenerarStoryboardDesdeLibro() {
    // Comprobar si hay libros disponibles
    if (!libros || libros.length === 0) {
        alert("No hay libros en la biblioteca. Por favor, crea un libro primero.");
        return;
    }

    // Eliminar modales anteriores
    const existingOverlay = document.getElementById('storyboard-gen-modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // HTML del modal, ahora solo con selector de libro
    const modalHTML = `
        <div id="storyboard-gen-modal-overlay" class="modal-overlay" style="display: block;">
            <div id="storyboard-gen-modal" class="modal-content" style="display: flex; flex-direction: column;">
                <button class="modal-close-btn" onclick="cerrarModalGenerarStoryboard()">&times;</button>
                <h2 style="font-size: 1.5em; font-weight: bold; margin-bottom: 1rem;">Generar Storyboard desde Libro</h2>
                <p style="margin-bottom: 1.5rem;">Selecciona un libro. La IA leerá su contenido y generará una escena con una toma por cada párrafo.</p>
                
                <div style="margin-bottom: 1rem;">
                    <label for="libro-select-storyboard" style="display: block; margin-bottom: 0.5rem;">Libro:</label>
                    <select id="libro-select-storyboard" class="modal-select">
                        <option value="">Selecciona un libro...</option>
                        ${libros.map(libro => `<option value="${libro.id}">${libro.titulo}</option>`).join('')}
                    </select>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="cerrarModalGenerarStoryboard()" class="btn btn-secondary">Cancelar</button>
                    <button id="confirm-storyboard-gen" class="btn btn-primary">Generar Tomas</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Lógica del botón de confirmación
    document.getElementById('confirm-storyboard-gen').onclick = () => {
        const selectedLibroId = document.getElementById('libro-select-storyboard').value;

        if (!selectedLibroId) {
            alert("Por favor, selecciona un libro.");
            return;
        }

        // --- LÓGICA CLAVE ---
        // Se llama a la función que procesa un LIBRO.
        // Ahora está definida en este mismo archivo, por lo que no dará error.
        if (typeof crearYMostrarEscenasParaLibro === 'function') {
            console.log(`Iniciando generación de storyboard desde el libro ID: ${selectedLibroId}`);
            crearYMostrarEscenasParaLibro(selectedLibroId);
        } else {
            // Este error ya no debería ocurrir.
            alert("Error: La función 'crearYMostrarEscenasParaLibro' no está disponible. Asegúrate de que el script correspondiente esté cargado.");
        }
        
        cerrarModalGenerarStoryboard();
        // Nos aseguramos de que el usuario vea la sección del storyboard.
        abrir('escenah'); 
    };

    // Cierre del modal
    document.getElementById('storyboard-gen-modal-overlay').onclick = function(e) {
        if (e.target.id === 'storyboard-gen-modal-overlay') {
            cerrarModalGenerarStoryboard();
        }
    };
}


function cerrarModalGenerarStoryboard() {
    const overlay = document.getElementById('storyboard-gen-modal-overlay');
    if (overlay) {
        overlay.remove();
    }
}


/**
 * Genera un storyboard, pidiendo a la IA que divida cada párrafo en múltiples
 * tomas. Para cada toma, solo se rellena el campo del guion conceptual.
 *
 * @param {string} libroId - El ID del libro para el cual generar el storyboard.
 */
async function crearYMostrarEscenasParaLibro(libroId) {
    if (!libroId) {
        alert("No se ha seleccionado ningún libro.");
        return;
    }

    const libro = libros.find(l => l.id === libroId);
    if (!libro) {
        alert("El libro seleccionado no se encontró.");
        return;
    }

    let contenidoCompleto = "";
    const capitulosDelLibro = Object.values(escenas).filter(cap => cap.libroId === libroId);

    for (const capitulo of capitulosDelLibro) {
        if (capitulo.frames && Array.isArray(capitulo.frames)) {
            for (const frame of capitulo.frames) {
                if (frame.texto && frame.texto.trim() !== "") {
                    contenidoCompleto += frame.texto + "\n\n";
                }
            }
        }
    }

    if (!contenidoCompleto.trim()) {
        alert("El libro seleccionado está vacío o sus capítulos no contienen texto. No se pueden generar tomas.");
        return;
    }

    const parrafos = contenidoCompleto.split('\n\n').filter(p => p.trim() !== '');
    if (parrafos.length === 0) {
        alert("No se encontraron párrafos válidos en el libro para generar tomas.");
        return;
    }

    mostrarIndicadorCarga(true, `Preparando escena para "${libro.titulo}"...`);

    const nuevaEscena = {
        id: `scene_${Date.now()}`,
        nombre: `Storyboard de ${libro.titulo}`,
        tomas: []
    };
    
    storyScenes.push(nuevaEscena);
    activeSceneId = nuevaEscena.id;
    
    if (typeof renderEscenasUI === 'function') {
        renderEscenasUI();
    } else {
        console.error("La función `renderEscenasUI` no está disponible para actualizar la vista.");
        mostrarIndicadorCarga(false);
        return;
    }

    try {
        for (let i = 0; i < parrafos.length; i++) {
            const parrafo = parrafos[i];
            
            mostrarIndicadorCarga(true, `Generando tomas para el párrafo ${i + 1}/${parrafos.length}...`);

            // --- PROMPT ACTUALIZADO ---
            // Ahora pide explícitamente ambos guiones y especifica el formato del guion técnico.
            const prompt = `Basado en el siguiente párrafo de una historia, divídelo en las tomas cinematográficas necesarias. Para CADA TOMA, genera un "guion_conceptual" y un "narracion" (que será la narración de la obra y concretamente de cada toma).

Instrucciones:
1.  **guion_conceptual**: Describe la esencia de la toma: emoción, propósito, atmósfera, personajes y acciones clave. Ten en cuenta que estas esto será el prompt para generar la ilustración o el video de la toma. 
2.  **narracion**: Escribe el parrafo, la parte que describe la toma,  en fomato narrativo, un breve parrafo para cada toma. El resultado debe ser un texto con formato de narrativa, no una imagen o un desarrollo tecnico, es la parte que se leerá por el lector. 

Párrafo: "${parrafo}"

Formato de respuesta (JSON estricto con un array de tomas):
{
  "tomas_generadas": [
    {
      "guion_conceptual": "Descripción conceptual de la primera toma.",
      "narracion": "\\"${parrafo.replace(/"/g, '\\"')}\\"\\n\\n "
    },
    {
      "guion_conceptual": "Descripción de la segunda toma...",
      "narracion": "\\"${parrafo.replace(/"/g, '\\"')}\\"\\n\\n "
    }
  ]
}`;
            
            if (typeof llamarIAConFeedback !== 'function') {
                throw new Error("La función `llamarIAConFeedback` no está definida.");
            }
            
            const modelToUse = 'gemini-1.5-flash'; // Se recomienda 1.5 por la complejidad del prompt
            const respuestaAPI = await llamarIAConFeedback(prompt, `Párrafo ${i+1}`, modelToUse, true);

            // --- LÓGICA ACTUALIZADA ---
            // Procesa el array y valida que ambos guiones existan antes de crear la toma.
            if (respuestaAPI && Array.isArray(respuestaAPI.tomas_generadas) && respuestaAPI.tomas_generadas.length > 0) {
                
                for (const tomaData of respuestaAPI.tomas_generadas) {
                    // Se valida que ambos guiones existan en la respuesta
                    if (tomaData.guion_conceptual && tomaData.narracion) {
                        const nuevaToma = {
                            id: `toma_${nuevaEscena.id}_${nuevaEscena.tomas.length}`,
                            duracion: 8,
                            imagen: '',
                            guionConceptual: tomaData.guion_conceptual, // Rellenado por la IA
                            guionTecnico: tomaData.narracion,      // Rellenado por la IA
                            guionArtistico: ""
                        };
                        nuevaEscena.tomas.push(nuevaToma);
                    }
                }
                
                if (typeof renderEscenasUI === 'function') {
                    renderEscenasUI();
                }

            } else {
                console.warn(`No se pudo generar ninguna toma para el párrafo ${i+1}:`, parrafo);
            }
        }
        
        console.log(`Generación de storyboard completada con ${nuevaEscena.tomas.length} tomas.`);

    } catch (error) {
        console.error("Error durante la generación del storyboard:", error);
        alert("Ocurrió un error al generar las tomas. Revisa la consola para más detalles.");
    } finally {
        mostrarIndicadorCarga(false);
    }
}
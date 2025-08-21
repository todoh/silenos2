/**
 * Genera un archivo HTML interactivo a partir de los momentos del lienzo, superponiendo las entidades.
 * @param {string} nombreMomentoInicial - El NOMBRE del primer momento que se mostrará.
 */
async function generarGAME(nombreMomentoInicial) {
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    function sanitizarParaId(texto) {
        if (!texto) return '';
        return texto.trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, '-')
            .toLowerCase();
    }

    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    
    // --- PASO 1: Validar nombres y crear mapas de IDs ---
    const idToSanitizedNameMap = new Map();
    const sanitizedNameCheck = new Map();
    let hasDuplicates = false;
    let duplicateErrorMsg = 'Error: No se puede exportar. Se encontraron nombres de momentos que resultan en el mismo identificador. Por favor, renómbralos para que sean únicos:\n';

    for (const nodo of nodosMomento) {
        const id = nodo.id;
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = sanitizarParaId(titulo);

        if (sanitizedNameCheck.has(sanitizedTitulo)) {
            hasDuplicates = true;
            const originalDuplicateTitle = sanitizedNameCheck.get(sanitizedTitulo);
            if (!duplicateErrorMsg.includes(originalDuplicateTitle)) {
                 duplicateErrorMsg += `\n- "${originalDuplicateTitle}" y "${titulo}" (ambos generan "${sanitizedTitulo}")`;
            } else {
                 duplicateErrorMsg += `, y también "${titulo}"`;
            }
        } else if (sanitizedTitulo) {
            sanitizedNameCheck.set(sanitizedTitulo, titulo);
        }
        idToSanitizedNameMap.set(id, sanitizedTitulo);
    }

    if (hasDuplicates) {
        alert(duplicateErrorMsg);
        return;
    }
    
    // --- PASO 2: Crear un mapa con las imágenes de todos los datos ---
    const datosImagenMap = new Map();
    document.querySelectorAll('#listapersonajes .personaje').forEach(datoEl => {
        const nombre = datoEl.querySelector('.nombreh')?.value.trim();
        const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;
        if (nombre && imgSrc) {
            datosImagenMap.set(nombre, imgSrc);
        }
    });

    // --- PASO 3: Recopilar todos los datos de los momentos en un objeto JSON ---
    const momentosData = {};
    for (const nodo of nodosMomento) {
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = idToSanitizedNameMap.get(nodo.id);
        
        const accionesOriginales = JSON.parse(nodo.dataset.acciones || '[]');
        const accionesMapeadas = accionesOriginales.map(accion => ({
            ...accion,
            idDestino: idToSanitizedNameMap.get(accion.idDestino) || ''
        })).filter(accion => accion.idDestino);
        
        // --- CAMBIO CLAVE: Incluimos las entidades ---
        const entidades = JSON.parse(nodo.dataset.entidades || '[]');

        momentosData[sanitizedTitulo] = {
            titulo: titulo,
            descripcion: nodo.dataset.descripcion || '',
            svg: nodo.dataset.svgIlustracion || '', 
            imagenFallback: nodo.querySelector('.momento-imagen').src,
            acciones: accionesMapeadas,
            entidades: entidades // Añadimos el array de entidades
        };
    }

    // --- PASO 4: Crear el contenido del archivo HTML final con el NUEVO DISEÑO ---
    const nombreInicialSanitizado = sanitizarParaId(nombreMomentoInicial);
    
    const css = `
        html, body {
            margin: 0; padding: 0; height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #1a1a1a;
            color: #ffffff;
            overflow: hidden;
        }
        .game-container {
            position: relative; /* Contenedor principal para posicionar capas */
            width: 100%;
            height: 100%;
        }
        .background-container {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-color: #000;
        }
       #game-image-bg {
    width: 100%; /* La imagen debe ocupar el 100% del ancho de su contenedor */
    height: 100%; /* Y el 100% del alto */
    object-fit: cover !important; /* Mantiene la proporción y cubre todo el espacio, recortando lo que sobre */
    object-position: center bottom; /* Se asegura de que la imagen permanezca centrada */
}
        /* --- NUEVO: Contenedor para las entidades superpuestas --- */
        #game-entities-overlay {
            position: absolute;
            bottom: 0; /* Lo alineamos abajo */
            left: 0;
            width: 100%;
            height: 95%; /* Ocupa la mitad inferior de la pantalla */
            display: flex;
            justify-content: center; /* Centra las entidades horizontalmente */
            align-items: flex-end; /* Alinea las entidades en la base */
            padding-bottom: 2%; /* Un pequeño margen inferior */
            gap: 1vw; /* Espacio entre entidades */
            pointer-events: none; /* Para que no interfiera con los botones */
        }
        .entity-sprite {
           
            object-fit: contain; /* Mantiene la proporción de la imagen */
            -webkit-filter: drop-shadow(5px 5px 5px #222); /* Sombra para resaltar */
            filter: drop-shadow(5px 5px 5px #222);
        }
 

        .content-container { 
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            bottom: 5%;
            width: 90%;
            max-width: 1100px;
            padding: 20px;
            border-radius: 12px;
            background-color: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-sizing: border-box;
            text-align: center;
        }
        #game-title {
            margin: 0 0 10px 0; font-size: 1.6em; display: none;
        }
     #game-description {
    
    margin: 0 0 15px 0; 
    font-size: 1em; 
    line-height: 1.5;
}
        .actions-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
        }
        .action-button {
            padding: 10px 20px;
            font-size: 1em;
            font-weight: bold;
            color: #ffffff;
            background-color: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        .action-button:hover {
            background-color: rgba(255, 255, 255, 0.3);
        }
    `;

    const script = `
        const momentos = ${JSON.stringify(momentosData)};
        const datosImagenes = ${JSON.stringify(Object.fromEntries(datosImagenMap))};
        const idInicio = "${nombreInicialSanitizado}";

        function mostrarMomento(sanitizedName) {
            const momento = momentos[sanitizedName];
            if (!momento) {
                console.error('Error: No se encontró el momento', sanitizedName);
                return;
            }

            const bgImageEl = document.getElementById('game-image-bg');
            const entitiesContainer = document.getElementById('game-entities-overlay');

            // 1. Cargar imagen de fondo
            if (momento.svg && momento.svg.trim() !== '') {
                const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(momento.svg)));
                bgImageEl.src = svgDataUrl;
            } else {
                bgImageEl.src = momento.imagenFallback || '';
            }

            // 2. Renderizar entidades (ESTA ES LA SECCIÓN ACTUALIZADA)
            entitiesContainer.innerHTML = ''; // Limpiar entidades anteriores
            if (momento.entidades && Array.isArray(momento.entidades)) {
                momento.entidades.forEach(entidad => {
                    const imgSrc = datosImagenes[entidad.recurso];
                    if (imgSrc) {
                        const imgEl = document.createElement('img');
                        imgEl.src = imgSrc;
                        imgEl.className = 'entity-sprite';
                        
                        // LÍNEA CLAVE: Aplicamos la altura guardada como estilo.
                        // Usamos vh (altura de la ventana) para mantener la consistencia.
                      imgEl.style.height = (entidad.altura || 65) + 'vh';

                        entitiesContainer.appendChild(imgEl);
                    }
                });
            }

            // 3. Actualizar textos y botones
            document.getElementById('game-title').textContent = momento.titulo;
            document.getElementById('game-description').innerHTML = momento.descripcion.replace(/\\n/g, "<br>");
            
            const actionsContainer = document.getElementById('game-actions');
            actionsContainer.innerHTML = ''; 

            if (momento.acciones) {
                momento.acciones.forEach(accion => {
                    const button = document.createElement('button');
                    button.className = 'action-button';
                    button.textContent = accion.textoBoton;
                    button.onclick = () => mostrarMomento(accion.idDestino);
                    actionsContainer.appendChild(button);
                });
            }
        }
        
        window.onload = () => mostrarMomento(idInicio);
    `;

    const htmlCompleto = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tituloProyecto}</title>
    <style>${css}</style>
</head>
<body>
    <div class="game-container">
        <div class="background-container">
            <img id="game-image-bg" src="" alt="Fondo de la escena">
        </div>
        <div id="game-entities-overlay"></div>
        <div class="content-container">
            <h1 id="game-title"></h1>
            <p id="game-description"></p>
            <div class="actions-container" id="game-actions"></div>
        </div>
    </div>
    <script>${script.replace(/<\/script>/g, '<\\/script>')}
    <\/script>
</body>
</html>`;

    // 5. Descargar el archivo
    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Juego.html`;
    a.click();
    console.log("Exportación de Videojuego con entidades completada.");
}

// (El resto de funciones auxiliares no cambian)
function poblarSelectorMomentoInicial() {
    const selectMomentoInicial = document.getElementById('momento-inicial-id');
    if (!selectMomentoInicial) return;
    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    const valorSeleccionadoPreviamente = selectMomentoInicial.value;
    selectMomentoInicial.innerHTML = '';
    if (nodosMomento.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No hay momentos creados";
        option.disabled = true;
        selectMomentoInicial.appendChild(option);
        return;
    }
    const placeholder = document.createElement('option');
    placeholder.value = "";
    placeholder.textContent = "Selecciona un momento inicial...";
    selectMomentoInicial.appendChild(placeholder);
    nodosMomento.forEach(nodo => {
        const option = document.createElement('option');
        const titulo = nodo.querySelector('.momento-titulo').textContent.trim();
        option.value = titulo; 
        option.textContent = titulo;
        selectMomentoInicial.appendChild(option);
    });
    selectMomentoInicial.value = valorSeleccionadoPreviamente;
}

function iniciarExportacionJuego() {
    const momentoInicialSelect = document.getElementById('momento-inicial-id');
    const nombreMomentoInicial = momentoInicialSelect.value;
    if (!nombreMomentoInicial) {
        alert("Por favor, selecciona un momento inicial para comenzar el juego.");
        return;
    }
    generarGAME(nombreMomentoInicial);
}
 


/**
 * [MODIFICADO] - Genera el juego, priorizando el uso de SVG para las entidades.
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
    
    // Validación de nombres duplicados (sin cambios)
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
    
    // Mapa de imágenes de previsualización (usado como fallback)
    const datosImagenMap = new Map();
    document.querySelectorAll('#listapersonajes .personaje').forEach(datoEl => {
        const nombre = datoEl.querySelector('.nombreh')?.value.trim();
        const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;
        if (nombre && imgSrc) {
            datosImagenMap.set(nombre, imgSrc);
        }
    });

    // Recopilación de datos de momentos (ahora incluye el SVG en las entidades)
     const momentosData = {};
    for (const nodo of nodosMomento) {
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = idToSanitizedNameMap.get(nodo.id);
        
        // Las acciones ya contienen toda la info nueva gracias a JSON.parse
        const accionesOriginales = JSON.parse(nodo.dataset.acciones || '[]');
        const accionesMapeadas = accionesOriginales.map(accion => ({
            ...accion,
            idDestino: idToSanitizedNameMap.get(accion.idDestino) || ''
        })).filter(accion => accion.idDestino);
        
        const entidades = JSON.parse(nodo.dataset.entidades || '[]');
        
        // [NUEVO] Parseamos las listas de llaves a arrays limpios
        const llavesActivar = (nodo.dataset.llavesActivar || '').split(',')
                                .map(k => k.trim()).filter(Boolean);
        const llavesDesactivar = (nodo.dataset.llavesDesactivar || '').split(',')
                                .map(k => k.trim()).filter(Boolean);

        momentosData[sanitizedTitulo] = {
            titulo: titulo,
            descripcion: nodo.dataset.descripcion || '',
            svg: nodo.dataset.svgIlustracion || '', 
            imagenFallback: nodo.querySelector('.momento-imagen').src,
            acciones: accionesMapeadas,
            entidades: entidades,
            llavesActivar: llavesActivar,       // <-- Nuevo
            llavesDesactivar: llavesDesactivar  // <-- Nuevo
        };
    }

    // Creación del HTML y CSS (sin cambios)
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
    
    // -- CAMBIO CLAVE --
    // El script del juego ahora sabe cómo manejar el SVG de una entidad.
// Dentro de la función generarGAME, localiza la variable 'script' y reemplaza la función mostrarMomento.

const script = `
    const momentos = ${JSON.stringify(momentosData)};
    const datosImagenes = ${JSON.stringify(Object.fromEntries(datosImagenMap))};
    const idInicio = "${nombreInicialSanitizado}";

    // [NUEVO] Estado global para las llaves y acciones usadas
    let estadoLlaves = {};
    const accionesUsadas = new Set();

    /**
     * [MODIFICADO] - La función clave del juego, ahora con lógica condicional.
     */
    function mostrarMomento(sanitizedName) {
        const momento = momentos[sanitizedName];
        if (!momento) {
            console.error('Error: No se encontró el momento', sanitizedName);
            return;
        }

        // --- 1. ACTUALIZAR ESTADO DE LLAVES (se hace al entrar al momento) ---
        if (momento.llavesActivar && momento.llavesActivar.length > 0) {
            momento.llavesActivar.forEach(llave => {
                estadoLlaves[llave] = true;
                console.log('Llave ACTIVADA:', llave);
            });
        }
        if (momento.llavesDesactivar && momento.llavesDesactivar.length > 0) {
            momento.llavesDesactivar.forEach(llave => {
                estadoLlaves[llave] = false;
                console.log('Llave DESACTIVADA:', llave);
            });
        }
        
        // Cargar fondo y entidades (sin cambios)
        const bgImageEl = document.getElementById('game-image-bg');
        if (momento.svg && momento.svg.trim() !== '') {
            bgImageEl.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(momento.svg)));
        } else {
            bgImageEl.src = momento.imagenFallback || '';
        }
        const entitiesContainer = document.getElementById('game-entities-overlay');
        entitiesContainer.innerHTML = '';
        if (momento.entidades && Array.isArray(momento.entidades)) {
            momento.entidades.forEach(entidad => { /* ...lógica de entidades sin cambios... */ });
        }
        // --- LÓGICA DE RENDERIZADO DE ENTIDADES MODIFICADA ---
        entitiesContainer.innerHTML = '';
        if (momento.entidades && Array.isArray(momento.entidades)) {
            momento.entidades.forEach(entidad => {
                const entidadContainer = document.createElement('div');
                entidadContainer.className = 'entity-sprite';
                
                // [NUEVO] Aplicar TAMAÑO y ALTURA (POSICIÓN Y)
                // 1. El tamaño controla la altura de la entidad en 'vh' (porcentaje de la altura de la ventana).
                entidadContainer.style.height = (entidad.tamaño || 45) + 'vh';
                
                // 2. La altura controla la separación desde la base (posición Y).
                //    Usamos margin-bottom para "elevar" la entidad desde su posición base.
                //    Multiplico por un factor para que el valor del input no sea tan extremo. Puedes ajustar 0.3 si quieres más o menos sensibilidad.
                entidadContainer.style.marginBottom = ((entidad.altura || 0) * 0.3) + 'vh';

                
                if (entidad.svg && entidad.svg.trim() !== '') {
                    // Si hay SVG, lo inyectamos directamente
                    entidadContainer.innerHTML = entidad.svg;
                } else {
                    // Si no, usamos el <img> como fallback
                    const fallbackImg = document.createElement('img');
                    const fallbackSrc = datosImagenes[entidad.recurso];
                    if (fallbackSrc) {
                        fallbackImg.src = fallbackSrc;
                        fallbackImg.style.width = '100%';
                        fallbackImg.style.height = '100%';
                        entidadContainer.appendChild(fallbackImg);
                    }
                }
                entitiesContainer.appendChild(entidadContainer);
            });
        }
        // Actualizar textos (sin cambios)
        document.getElementById('game-title').textContent = momento.titulo;
        document.getElementById('game-description').innerHTML = momento.descripcion.replace(/\\n/g, "<br>");
        
        // --- 2. RENDERIZAR ACCIONES CON LÓGICA CONDICIONAL ---
        const actionsContainer = document.getElementById('game-actions');
        actionsContainer.innerHTML = ''; 

        if (momento.acciones) {
            momento.acciones.forEach(accion => {
                let esVisible = false;
                const condicionTipo = accion.condicionTipo || 'siempre_visible';
                const condicionLlave = accion.condicionLlave;

                switch (condicionTipo) {
                    case 'una_vez':
                        const accionId = sanitizedName + '|' + accion.textoBoton;
                        if (!accionesUsadas.has(accionId)) {
                            esVisible = true;
                        }
                        break;
                    case 'visible_si':
                        if (estadoLlaves[condicionLlave]) {
                            esVisible = true;
                        }
                        break;
                    case 'invisible_si':
                        if (!estadoLlaves[condicionLlave]) {
                            esVisible = true;
                        }
                        break;
                    case 'siempre_visible':
                    default:
                        esVisible = true;
                        break;
                }

                if (esVisible) {
                    const button = document.createElement('button');
                    button.className = 'action-button';
                    button.textContent = accion.textoBoton;
                    
                    button.onclick = () => {
                        // Si es una acción de un solo uso, la marcamos como usada.
                        if (condicionTipo === 'una_vez') {
                            const accionId = sanitizedName + '|' + accion.textoBoton;
                            accionesUsadas.add(accionId);
                        }
                        mostrarMomento(accion.idDestino);
                    };
                    actionsContainer.appendChild(button);
                }
            });
        }
    }
    
    window.onload = () => mostrarMomento(idInicio);
`;
// El resto de la función generarGAME sigue igual...

    // Creación del HTML final y descarga (sin cambios)
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

    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Juego.html`;
    a.click();
    console.log("Exportación de Videojuego con entidades (SVG-priorizado) completada.");
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
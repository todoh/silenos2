 


/**
 * [MODIFICADO] - Genera el juego, priorizando el uso de SVG para las entidades.
 * @param {string} nombreMomentoInicial - El NOMBRE del primer momento que se mostrará.
 */
 
// EN: exportarjuego.js
// REEMPLAZA la función completa

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
    
    // Mapa con la información visual de TODOS los datos (sin cambios)
    const datosVisualesMap = new Map();
    document.querySelectorAll('#listapersonajes .personaje').forEach(datoEl => {
        const nombre = datoEl.querySelector('.nombreh')?.value.trim();
        const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;
        const svgContent = datoEl.dataset.svgContent || '';
        if (nombre) {
            datosVisualesMap.set(nombre, { imagen: imgSrc, svg: svgContent });
        }
    });

    // Recopilación de datos de momentos (sin cambios)
    const momentosData = {};
    for (const nodo of nodosMomento) {
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = idToSanitizedNameMap.get(nodo.id);
        const accionesOriginales = JSON.parse(nodo.dataset.acciones || '[]');
        const accionesMapeadas = accionesOriginales.map(accion => ({ ...accion, idDestino: idToSanitizedNameMap.get(accion.idDestino) || '' })).filter(accion => accion.idDestino);
        const entidades = JSON.parse(nodo.dataset.entidades || '[]');
        const llavesActivar = (nodo.dataset.llavesActivar || '').split(',').map(k => k.trim()).filter(Boolean);
        const llavesDesactivar = (nodo.dataset.llavesDesactivar || '').split(',').map(k => k.trim()).filter(Boolean);
        const objetosGanar = (nodo.dataset.objetosGanar || '').split(',').map(o => o.trim()).filter(Boolean);
        const objetosPerder = (nodo.dataset.objetosPerder || '').split(',').map(o => o.trim()).filter(Boolean);

        momentosData[sanitizedTitulo] = {
            titulo: titulo,
            descripcion: nodo.dataset.descripcion || '',
            svg: nodo.dataset.svgIlustracion || '', 
            imagenFallback: nodo.querySelector('.momento-imagen').src,
            acciones: accionesMapeadas,
            entidades: entidades,
            llavesActivar: llavesActivar,
            llavesDesactivar: llavesDesactivar,
            objetosGanar: objetosGanar,
            objetosPerder: objetosPerder
        };
    }

    // --- [INICIO] MODIFICACIÓN DE CSS ---
    const nombreInicialSanitizado = sanitizarParaId(nombreMomentoInicial);
    const css = `
        html, body { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; overflow: hidden; }
        .game-container { position: relative; width: 100%; height: 100%; }
        .background-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #000; }
        #game-image-bg { width: 100%; height: 100%; object-fit: cover !important; object-position: center bottom; }
        #game-entities-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 95%; display: flex; justify-content: center; align-items: flex-end; padding-bottom: 2%; gap: 1vw; pointer-events: none; }
        .entity-sprite { object-fit: contain; -webkit-filter: drop-shadow(5px 5px 5px #222); filter: drop-shadow(5px 5px 5px #222); }
        .content-container { position: absolute; left: 50%; transform: translateX(-50%); bottom: 5%; width: 90%; max-width: 1100px; padding: 20px; border-radius: 12px; background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); box-sizing: border-box; text-align: center; }
        #game-title { margin: 0 0 10px 0; font-size: 1.6em; display: none; }
        #game-description { margin: 0 0 15px 0; font-size: 1em; line-height: 1.5; }
        .actions-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
        .action-button { padding: 10px 20px; font-size: 1em; font-weight: bold; color: #ffffff; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease; }
        .action-button:hover { background-color: rgba(255, 255, 255, 0.3); }

        /* --- CSS MEJORADO PARA EL INVENTARIO --- */
        #inventory-ui-container { position: fixed; top: 20px; right: 20px; z-index: 100; }
        #inventory-toggle-button {
            width: 50px; height: 50px; border-radius: 50%; background-color: rgba(0,0,0,0.7); border: 2px solid rgba(255,255,255,0.3);
            color: white; font-size: 24px; cursor: pointer; display: flex; justify-content: center; align-items: center; position: relative;
        }
        .item-count-badge {
            position: absolute; bottom: -2px; right: -2px; background-color: #c0392b; color: white;
            border-radius: 50%; width: 20px; height: 20px; font-size: 12px; font-weight: bold;
            display: flex; justify-content: center; align-items: center; border: 1px solid white;
        }
        #inventory-modal {
            display: none; /* Oculto por defecto */
            position: absolute; top: 60px; right: 0;
            width: 300px; max-height: 70vh; /* Altura máxima y scroll */
            background-color: rgba(0, 0, 0, 0.8); backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px;
            padding: 15px; box-sizing: border-box;
        }
        #inventory-modal.visible { display: block; } /* Clase para mostrarlo */
        #inventory-grid {
            display: flex; flex-wrap: wrap; /* Para que sea una cuadrícula */
            gap: 10px;
            overflow-y: auto; /* Scroll si el contenido es muy alto */
            max-height: calc(70vh - 70px); /* Resta el padding y el título */
        }
        .inventory-item {
            position: relative; /* Para posicionar el contador */
            width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.1);
            border-radius: 6px; padding: 5px; box-sizing: border-box;
            display: flex; justify-content: center; align-items: center;
        }
        .inventory-item img, .inventory-item svg { max-width: 100%; max-height: 100%; object-fit: contain; }
        .item-quantity {
            position: absolute; bottom: 2px; right: 4px;
            background-color: rgba(0, 0, 0, 0.7); color: #fff;
            padding: 1px 5px; border-radius: 10px; font-size: 12px; font-weight: bold;
        }
    `;
    // --- [FIN] MODIFICACIÓN DE CSS ---
    
    // --- [INICIO] MODIFICACIÓN DEL SCRIPT DEL JUEGO ---
    const script = `
    const momentos = ${JSON.stringify(momentosData)};
    const datosVisuales = ${JSON.stringify(Object.fromEntries(datosVisualesMap))};
    const idInicio = "${nombreInicialSanitizado}";

    // --- ESTADO GLOBAL ---
    let estadoLlaves = {};
    const accionesUsadas = new Set();
    let inventario = new Map(); // <-- CAMBIO: Usamos un Map para guardar {nombreObjeto: cantidad}

    // --- FUNCIÓN DE RENDERIZADO DEL INVENTARIO (MEJORADA) ---
    function renderizarInventario() {
        const inventoryGrid = document.getElementById('inventory-grid');
        const countBadge = document.getElementById('inventory-item-count');
        
        inventoryGrid.innerHTML = ''; // Limpiar la cuadrícula
        countBadge.textContent = inventario.size; // Actualizar el contador de items únicos

        for (const [itemName, quantity] of inventario.entries()) {
            const visual = datosVisuales[itemName];
            if (!visual) continue;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.title = itemName;

            if (visual.svg && visual.svg.trim() !== '') {
                itemDiv.innerHTML = visual.svg;
            } else if (visual.imagen) {
                const img = document.createElement('img');
                img.src = visual.imagen;
                itemDiv.appendChild(img);
            }
            
            // Añadir el contador de cantidad si es mayor que 1
            if (quantity > 1) {
                const quantityDiv = document.createElement('div');
                quantityDiv.className = 'item-quantity';
                quantityDiv.textContent = quantity;
                itemDiv.appendChild(quantityDiv);
            }

            inventoryGrid.appendChild(itemDiv);
        }
    }

    function mostrarMomento(sanitizedName) {
        const momento = momentos[sanitizedName];
        if (!momento) {
            console.error('Error: No se encontró el momento', sanitizedName);
            return;
        }

        // --- 1. ACTUALIZAR ESTADO (LLAVES E INVENTARIO) ---
        if (momento.llavesActivar) momento.llavesActivar.forEach(llave => { estadoLlaves[llave] = true; });
        if (momento.llavesDesactivar) momento.llavesDesactivar.forEach(llave => { estadoLlaves[llave] = false; });
        
        // --- LÓGICA DE INVENTARIO MEJORADA (PARA ACUMULAR OBJETOS) ---
        if (momento.objetosGanar) {
            momento.objetosGanar.forEach(obj => {
                const currentCount = inventario.get(obj) || 0;
                inventario.set(obj, currentCount + 1);
            });
        }
        if (momento.objetosPerder) {
            momento.objetosPerder.forEach(obj => {
                const currentCount = inventario.get(obj);
                if (currentCount > 1) {
                    inventario.set(obj, currentCount - 1);
                } else if (currentCount === 1) {
                    inventario.delete(obj);
                }
            });
        }

        // --- 2. RENDERIZAR TODO ---
        renderizarInventario(); // Actualizar la vista del inventario

        // Cargar fondo y entidades (sin cambios)
        const bgImageEl = document.getElementById('game-image-bg');
        bgImageEl.src = (momento.svg) ? 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(momento.svg))) : momento.imagenFallback || '';
        const entitiesContainer = document.getElementById('game-entities-overlay');
        entitiesContainer.innerHTML = '';
        if (momento.entidades) {
            momento.entidades.forEach(entidad => {
                const entidadContainer = document.createElement('div');
                entidadContainer.className = 'entity-sprite';
                entidadContainer.style.height = (entidad.tamaño || 45) + 'vh';
                entidadContainer.style.marginBottom = ((entidad.altura || 0) * 0.3) + 'vh';
                
                if (entidad.svg) {
                    entidadContainer.innerHTML = entidad.svg;
                } else if(datosVisuales[entidad.recurso]?.imagen) {
                    const fallbackImg = document.createElement('img');
                    fallbackImg.src = datosVisuales[entidad.recurso].imagen;
                    fallbackImg.style.width = '100%'; fallbackImg.style.height = '100%';
                    entidadContainer.appendChild(fallbackImg);
                }
                entitiesContainer.appendChild(entidadContainer);
            });
        }
        
        document.getElementById('game-title').textContent = momento.titulo;
        document.getElementById('game-description').innerHTML = momento.descripcion.replace(/\\n/g, "<br>");
        
        // Renderizar acciones con lógica condicional (sin cambios)
        const actionsContainer = document.getElementById('game-actions');
        actionsContainer.innerHTML = ''; 
        if (momento.acciones) {
            momento.acciones.forEach(accion => {
                let esVisible = false;
                const condicionTipo = accion.condicionTipo || 'siempre_visible';
                const condicionLlave = accion.condicionLlave;
                switch (condicionTipo) {
                    case 'una_vez': esVisible = !accionesUsadas.has(sanitizedName + '|' + accion.textoBoton); break;
                    case 'visible_si': esVisible = !!estadoLlaves[condicionLlave]; break;
                    case 'invisible_si': esVisible = !estadoLlaves[condicionLlave]; break;
                    default: esVisible = true; break;
                }
                if (esVisible) {
                    const button = document.createElement('button');
                    button.className = 'action-button';
                    button.textContent = accion.textoBoton;
                    button.onclick = () => {
                        if (condicionTipo === 'una_vez') accionesUsadas.add(sanitizedName + '|' + accion.textoBoton);
                        mostrarMomento(accion.idDestino);
                    };
                    actionsContainer.appendChild(button);
                }
            });
        }
    }
    
    window.onload = () => {
        mostrarMomento(idInicio);

        // --- NUEVOS LISTENERS PARA EL MODAL DEL INVENTARIO ---
        const toggleBtn = document.getElementById('inventory-toggle-button');
        const modal = document.getElementById('inventory-modal');

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que el clic se propague al documento
            modal.classList.toggle('visible');
        });

        document.addEventListener('click', (event) => {
            // Si el modal está visible Y el clic fue fuera del modal Y fuera del botón que lo abre
            if (modal.classList.contains('visible') && !modal.contains(event.target) && !toggleBtn.contains(event.target)) {
                modal.classList.remove('visible');
            }
        });
    };
`;
    // --- [FIN] MODIFICACIÓN DEL SCRIPT DEL JUEGO ---

    // --- [INICIO] MODIFICACIÓN DEL HTML ---
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
        <div id="inventory-ui-container">
            <button id="inventory-toggle-button" title="Abrir Inventario">
                I
                <span id="inventory-item-count" class="item-count-badge">0</span>
            </button>
            <div id="inventory-modal">
                <h2 style="text-align: center; margin-top: 0; margin-bottom: 15px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">Inventario</h2>
                <div id="inventory-grid"></div>
            </div>
        </div>

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
    // --- [FIN] MODIFICACIÓN DEL HTML ---

    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Juego.html`;
    a.click();
    console.log("Exportación de Videojuego con INVENTARIO AVANZADO completada.");
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
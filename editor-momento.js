/**
 * ================================================================
 * GESTOR DEL PANEL DE EDICIÓN FLOTANTE (VERSIÓN 3D / ENTIDADES 2D)
 * Permite definir el entorno y las entidades (sprites) de cada momento.
 * ================================================================
 */

let panelState = {
    nodoActual: null,
    panelElement: null,
    tituloInput: null,
    descripcionInput: null,
    // Contenedores para la UI
    entornoContainer: null,
    entidadesContainer: null,
    accionesContainer: null,
    agregarAccionBtn: null,
};


/**
 * Inicializa el panel de edición, obteniendo referencias a sus elementos y añadiendo listeners.
 */
function inicializarPanelEdicion() {
    console.log('[EditorMomento] Inicializando...');

    const s = panelState;
    s.panelElement = document.getElementById('panel-edicion-momento');
    if (!s.panelElement) {
        console.error('[EditorMomento] ERROR CRÍTICO: #panel-edicion-momento no se encontró.');
        return;
    }

    s.panelElement.innerHTML = `
        <div class="panel-header">
            <h3>Editar Momento</h3>
            <button id="panel-edicion-cerrar-btn" class="panel-cerrar-btn">×</button>
        </div>
        <div class="panel-contenido">
            <input type="text" id="panel-editor-titulo" placeholder="Título del momento...">
            <textarea id="panel-editor-descripcion" rows="4" placeholder="Describe lo que sucede en este momento..."></textarea>
            <hr>
            <div id="panel-entorno-container">
                </div>
            <hr>
            <div id="panel-entidades-container">
                </div>
            <button id="panel-boton-agregar-entidad" class="btn-accion-agregar"><i class="fas fa-plus"></i> Añadir Entidad</button>
            <hr>
            <div id="panel-acciones-container">
                </div>
            <button id="panel-boton-agregar-accion" class="btn-accion-agregar"><i class="fas fa-plus"></i> Añadir Acción</button>
        </div>
    `;

    s.tituloInput = document.getElementById('panel-editor-titulo');
    s.descripcionInput = document.getElementById('panel-editor-descripcion');
    s.entornoContainer = document.getElementById('panel-entorno-container');
    s.entidadesContainer = document.getElementById('panel-entidades-container');
    s.accionesContainer = document.getElementById('panel-acciones-container');
    s.agregarAccionBtn = document.getElementById('panel-boton-agregar-accion');
    const agregarEntidadBtn = document.getElementById('panel-boton-agregar-entidad');
    const cerrarBtn = document.getElementById('panel-edicion-cerrar-btn');

    cerrarBtn?.addEventListener('click', ocultarPanelEdicion);
    s.tituloInput?.addEventListener('input', actualizarDatosNodo);
    s.descripcionInput?.addEventListener('input', actualizarDatosNodo);
    s.agregarAccionBtn.addEventListener('click', () => agregarNuevaAccionAPanel());
    
    agregarEntidadBtn.addEventListener('click', abrirModalSeleccionEntidad);

    console.log('[EditorMomento] Inicialización completada.');
}

/**
 * Muestra y puebla el panel de edición con los datos de un nodo.
 * @param {HTMLElement} nodo - El elemento del nodo del momento a editar.
 */
function mostrarPanelEdicion(nodo) {
    if (!panelState.panelElement) return;
    panelState.nodoActual = nodo;
    const s = panelState;

    s.tituloInput.value = nodo.querySelector('.momento-titulo').textContent;
    s.descripcionInput.value = nodo.dataset.descripcion || '';

    // Poblar entorno, entidades y acciones
    const entornoData = JSON.parse(nodo.dataset.entorno || '{}');
    poblarEntornoPanel(entornoData); 
    
    const entidadesData = JSON.parse(nodo.dataset.entidades || '[]');
    poblarEntidadesPanel(entidadesData);

    const accionesData = JSON.parse(nodo.dataset.acciones || '[]');
    poblarAccionesPanel(accionesData);

    s.panelElement.classList.add('visible');
}


function ocultarPanelEdicion() {
    if (panelState.panelElement) panelState.panelElement.classList.remove('visible');
    if (panelState.nodoActual) panelState.nodoActual.classList.remove('momento-seleccionado');
    panelState.nodoActual = null;
    if (window.previsualizacionActiva && typeof dibujarConexiones === 'function') dibujarConexiones();
}

/**
 * Actualiza TODOS los datos del nodo en el DOM en tiempo real.
 */
function actualizarDatosNodo() {
    if (!panelState.nodoActual) return;
    const nodo = panelState.nodoActual;
    const s = panelState;

    nodo.querySelector('.momento-titulo').textContent = s.tituloInput.value;
    nodo.dataset.descripcion = s.descripcionInput.value;

    const entornoData = {
        texturaSuelo: document.getElementById('entorno-suelo-select')?.value || '',
        colorCielo: document.getElementById('entorno-cielo-input')?.value || '#87ceeb',
    };
    nodo.dataset.entorno = JSON.stringify(entornoData);

   const entidadesData = Array.from(s.entidadesContainer.querySelectorAll('.entidad-item')).map(item => {
    const alturaInput = item.querySelector('.entidad-altura-input');
    return {
        recurso: item.dataset.recurso,
        altura: parseInt(alturaInput.value, 10) || 65
    };
}).filter(e => e.recurso);
nodo.dataset.entidades = JSON.stringify(entidadesData);


    const accionesData = Array.from(s.accionesContainer.querySelectorAll('.accion-item')).map(item => ({
        textoBoton: item.querySelector('input[type="text"]').value,
        idDestino: item.querySelector('select.accion-destino-select').value
    })).filter(a => a.textoBoton && a.idDestino);
    nodo.dataset.acciones = JSON.stringify(accionesData);

    if (window.previsualizacionActiva && typeof dibujarConexiones === 'function') dibujarConexiones();
}

 
/**
 * Crea y muestra un modal con una cuadrícula de todos los "Datos" disponibles.
 */
function abrirModalSeleccionEntidad() {
    if (document.getElementById('modal-seleccion-entidad')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'modal-seleccion-entidad';
    modalOverlay.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Seleccionar Entidad</h2>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body-grid"></div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const gridContainer = modalContent.querySelector('.modal-body-grid');
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');

    if (todosLosDatos.length === 0) {
        gridContainer.innerHTML = '<p>No se encontraron "Datos" para añadir como entidades.</p>';
    } else {
        todosLosDatos.forEach(datoEl => {
            const nombre = datoEl.querySelector('.nombreh')?.value.trim();
            const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;

            if (nombre && imgSrc && imgSrc.trim() !== '' && !imgSrc.endsWith('/')) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item-entidad';
                gridItem.innerHTML = `<img src="${imgSrc}" alt="${nombre}" /><span>${nombre}</span>`;
                gridItem.onclick = () => {
                    agregarEntidadDesdeDato(nombre);
                    cerrarModalSeleccionEntidad();
                };
                gridContainer.appendChild(gridItem);
            }
        });
    }

    modalContent.querySelector('.modal-close-btn').onclick = cerrarModalSeleccionEntidad;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) cerrarModalSeleccionEntidad();
    };
}
 
function cerrarModalSeleccionEntidad() {
    const modal = document.getElementById('modal-seleccion-entidad');
    if (modal) modal.remove();
}

/**
 * Añade la entidad seleccionada desde el modal al panel de edición.
 * @param {string} nombreDato - El nombre del "Dato" seleccionado.
 */
function agregarEntidadDesdeDato(nombreDato) {
    if (!panelState.nodoActual) return;
    const nuevoElemento = crearElementoEntidadPanel({ recurso: nombreDato });
    panelState.entidadesContainer.appendChild(nuevoElemento);
    actualizarDatosNodo();
}
/**
 * [CORREGIDO] - Reemplaza la función original con esta.
 * Hemos hecho el código más robusto, asegurando que encuentra los botones
 * antes de intentar asignarles un evento 'click'.
 */
function poblarEntornoPanel(data = {}) {
    const container = panelState.entornoContainer;
    container.innerHTML = `
        <div class="panel-campo">
            <label>Textura Suelo:</label>
            <select id="entorno-suelo-select">
                <option value="">-- Sin Textura --</option>
            </select>
        </div>
        <div class="panel-campo">
            <label>Color Cielo:</label>
            <input type="color" id="entorno-cielo-input" value="${data.colorCielo || '#87ceeb'}">
        </div>

        <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button id="btn-ilustrar-momento-ia" class="btn-accion-agregar" style="flex: 1;">
                ✨ Ilustrar con IA
            </button>
            <button id="btn-seleccionar-fondo-dato" class="btn-accion-agregar" style="flex: 1;">
                🖼️ Seleccionar Fondo
            </button>
        </div>
    `;
    const selectSuelo = container.querySelector('#entorno-suelo-select');
    const datosContainer = document.getElementById('listapersonajes');
    if (datosContainer) {
        const datosItems = datosContainer.querySelectorAll('.personaje');
        datosItems.forEach(item => {
            const nombreEl = item.querySelector('.nombreh');
            const imgEl = item.querySelector('.personaje-visual img');
            if (nombreEl && imgEl && imgEl.src) {
                const nombre = nombreEl.value.trim();
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                selectSuelo.appendChild(option);
            }
        });
    }
    selectSuelo.value = data.texturaSuelo || '';

    // --- SECCIÓN DE LISTENERS REVISADA PARA MAYOR ROBUSTEZ ---
    const btnIlustrar = container.querySelector('#btn-ilustrar-momento-ia');
    const btnSeleccionarFondo = container.querySelector('#btn-seleccionar-fondo-dato');

    if (btnIlustrar) {
        btnIlustrar.addEventListener('click', () => {
            if (typeof generarYRefinarImagenParaNodo === 'function') {
                generarYRefinarImagenParaNodo();
            } else {
                alert('La función de ilustración por IA no está disponible.');
            }
        });
    }

    if (btnSeleccionarFondo) {
        btnSeleccionarFondo.addEventListener('click', abrirModalSeleccionFondo);
    } else {
        // Este mensaje aparecerá en la consola si el botón no se encuentra por alguna razón.
        console.error("Error: No se encontró el botón 'Seleccionar Fondo'.");
    }
    
    container.querySelectorAll('input, select').forEach(input => input.addEventListener('input', actualizarDatosNodo));
}


/**
 * [MODIFICADO] - Abre el modal para seleccionar el fondo.
 * Ahora busca el código SVG original del "Dato" seleccionado.
 */
function abrirModalSeleccionFondo() {
    const modalExistente = document.getElementById('modal-seleccion-entidad');
    if (modalExistente) {
        modalExistente.remove();
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'modal-seleccion-entidad';
    modalOverlay.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Seleccionar Imagen de Fondo</h2>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body-grid"></div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const gridContainer = modalContent.querySelector('.modal-body-grid');
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');

    if (todosLosDatos.length === 0) {
        gridContainer.innerHTML = '<p>No se encontraron "Datos" para usar como fondo.</p>';
    } else {
        todosLosDatos.forEach(datoEl => {
            const nombre = datoEl.querySelector('.nombreh')?.value.trim();
            const imgEl = datoEl.querySelector('.personaje-visual img');
            const imgSrc = imgEl ? imgEl.getAttribute('src') : null;

            if (nombre && imgSrc && imgSrc.trim() !== '' && !imgSrc.endsWith('/')) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item-entidad';
                gridItem.innerHTML = `<img src="${imgSrc}" alt="${nombre}" /><span>${nombre}</span>`;
                
                // --- MEJORA CLAVE ---
                // Al hacer clic, buscamos el SVG original y lo pasamos a la función de aplicar.
                gridItem.onclick = () => {
                    const datoOriginalEl = Array.from(document.querySelectorAll('#listapersonajes .personaje')).find(p => p.querySelector('.nombreh')?.value.trim() === nombre);
                    let svgCode = null;
                    if (datoOriginalEl) {
                        // CORRECCIÓN: Se busca el SVG en el dataset, no como un elemento hijo.
                        svgCode = datoOriginalEl.dataset.svgContent || null;
                    }
                    aplicarFondoDesdeDato(imgSrc, svgCode);
                    cerrarModalSeleccionFondo();
                };
                gridContainer.appendChild(gridItem);
            }
        });
    }

    modalContent.querySelector('.modal-close-btn').onclick = cerrarModalSeleccionFondo;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) cerrarModalSeleccionFondo();
    };
}
/**
 * [MODIFICADO] Cierra el modal de selección de fondo.
 */
function cerrarModalSeleccionFondo() {
    const modal = document.getElementById('modal-seleccion-entidad');
    if (modal) modal.remove();
}

/**
 * [MODIFICADO] Aplica la imagen y "normaliza" el SVG para un correcto escalado.
 * @param {string} imgSrc - La URL de la imagen para la previsualización.
 * @param {string|null} svgCode - El código HTML del SVG, si se encontró.
 */
function aplicarFondoDesdeDato(imgSrc, svgCode = null) {
    if (!panelState.nodoActual) return;
    const nodo = panelState.nodoActual;
    
    const imgElement = nodo.querySelector('.momento-imagen');
    if (imgElement) {
        imgElement.src = imgSrc; // Pone una imagen de preview mientras procesa el SVG.
        nodo.classList.add('con-imagen');
        
        if (svgCode) {
            // --- INICIO DE LA SOLUCIÓN SENCILLA ---
            // Para asegurar que el SVG se centre y escale, se modifica su código.
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgCode, "image/svg+xml");
            const svgElement = svgDoc.documentElement;

            // Se añaden los atributos para que ocupe el 100% del espacio y se centre.
            svgElement.setAttribute('width', '100%');
            svgElement.setAttribute('height', '100%');
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            // Se eliminan 'x' e 'y' para evitar desplazamientos.
            svgElement.removeAttribute('x');
            svgElement.removeAttribute('y');

            const serializer = new XMLSerializer();
            const svgCorregido = serializer.serializeToString(svgElement);

            // Se guarda y muestra el SVG corregido.
            nodo.dataset.svgIlustracion = svgCorregido;
            const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgCorregido)));
            imgElement.src = svgDataUrl;
            // --- FIN DE LA SOLUCIÓN ---

        } else {
            // Si no es un SVG, se borra el dato SVG anterior.
            delete nodo.dataset.svgIlustracion;
        }
    }
}


// --- FIN DE LAS NUEVAS FUNCIONES ---


// --- FUNCIONES PARA POBLAR EL PANEL (ACTUALIZADAS) ---

function poblarEntidadesPanel(entidades = []) {
    const container = panelState.entidadesContainer;
    container.innerHTML = '';
    if (entidades.length > 0) {
        entidades.forEach(entidad => {
            container.appendChild(crearElementoEntidadPanel(entidad));
        });
    }
}

function crearElementoEntidadPanel(data = { recurso: '', altura: 65 }) {
    const div = document.createElement('div');
    div.className = 'entidad-item item-panel';
    div.dataset.recurso = data.recurso;

    div.innerHTML = `
        <span class="entidad-nombre">${data.recurso}</span>
        <div class="entidad-controles">
            <label>Altura:</label>
            <input type="number" class="entidad-altura-input" value="${data.altura || 65}" min="10" max="150" step="1">
            <span>%</span>
            <button class="delete-item-btn">&times;</button>
        </div>
    `;

    div.querySelector('.delete-item-btn').onclick = () => {
        div.remove();
        actualizarDatosNodo();
    };
    
    div.querySelector('.entidad-altura-input').addEventListener('input', actualizarDatosNodo);

    return div;
}


 

function poblarAccionesPanel(acciones = []) {
    const container = panelState.accionesContainer;
    container.innerHTML = '';
    if (acciones.length > 0) {
        acciones.forEach(accion => {
            container.appendChild(crearElementoAccionPanel(accion));
        });
    }
}

function agregarNuevaAccionAPanel() {
    if (!panelState.nodoActual) return;
    const nuevoElemento = crearElementoAccionPanel();
    panelState.accionesContainer.appendChild(nuevoElemento);
}

function crearElementoAccionPanel(data = { textoBoton: '', idDestino: '' }) {
    const div = document.createElement('div');
    div.className = 'accion-item item-panel';
    const textoInput = document.createElement('input');
    textoInput.type = 'text';
    textoInput.placeholder = 'Texto del botón...';
    textoInput.value = data.textoBoton;
    const selectDestino = document.createElement('select');
    selectDestino.className = 'accion-destino-select';
    selectDestino.innerHTML = '<option value="">-- Seleccionar Destino --</option>';
    document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(nodo => {
        if (nodo.id !== panelState.nodoActual.id) {
            const option = document.createElement('option');
            option.value = nodo.id;
            option.textContent = nodo.querySelector('.momento-titulo').textContent.trim();
            selectDestino.appendChild(option);
        }
    });
    selectDestino.value = data.idDestino;
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-item-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => {
        div.remove();
        actualizarDatosNodo();
    };
    div.append(textoInput, selectDestino, deleteBtn);
    div.querySelectorAll('input, select').forEach(el => el.addEventListener('input', actualizarDatosNodo));
    return div;
}

// Inicializar el módulo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPanelEdicion);

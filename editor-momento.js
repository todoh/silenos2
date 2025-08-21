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
    
    // --- CAMBIO CLAVE: El botón de añadir entidad ahora abre el modal ---
    agregarEntidadBtn.addEventListener('click', () => abrirModalSeleccionEntidad());

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
    poblarEntornoPanel(entornoData); // Mantenemos la lógica del entorno
    
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
    if (window.previsualizacionActiva) dibujarConexiones();
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

    // --- CAMBIO CLAVE: Guardar datos de las Entidades simplificadas ---
   const entidadesData = Array.from(s.entidadesContainer.querySelectorAll('.entidad-item')).map(item => {
    const alturaInput = item.querySelector('.entidad-altura-input');
    return {
        recurso: item.dataset.recurso,
        // Leemos el valor del input, lo convertimos a número y ponemos 65 si falla
        altura: parseInt(alturaInput.value, 10) || 65
    };
}).filter(e => e.recurso);
nodo.dataset.entidades = JSON.stringify(entidadesData);


    const accionesData = Array.from(s.accionesContainer.querySelectorAll('.accion-item')).map(item => ({
        textoBoton: item.querySelector('input[type="text"]').value,
        idDestino: item.querySelector('select.accion-destino-select').value
    })).filter(a => a.textoBoton && a.idDestino);
    nodo.dataset.acciones = JSON.stringify(accionesData);

    if (window.previsualizacionActiva) dibujarConexiones();
}

 
/**
 * Crea y muestra un modal con una cuadrícula de todos los "Datos" disponibles.
 * --- VERSIÓN MEJORADA CON DEPURACIÓN ---
 */
function abrirModalSeleccionEntidad() {
    // Evita abrir múltiples modales
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

    // 1. Mensaje de depuración principal
    console.log(`[Modal Entidades] Buscando datos... Encontrados ${todosLosDatos.length} elementos de 'Datos'.`);

    if (todosLosDatos.length === 0) {
        gridContainer.innerHTML = '<p style="color: #ffcc00;">No se encontraron datos en la aplicación. El proceso de carga del proyecto pudo haber fallado. Revisa la consola en busca de errores rojos.</p>';
    } else {
        let itemsAñadidos = 0;
        todosLosDatos.forEach((datoEl, index) => {
            const nombre = datoEl.querySelector('.nombreh')?.value.trim();
            const imgEl = datoEl.querySelector('.personaje-visual img');
            
            // Usamos getAttribute para ser más fiables, incluso si la imagen no ha cargado visualmente.
            const imgSrc = imgEl ? imgEl.getAttribute('src') : null;

            // 2. Mensaje de depuración por cada dato
            console.log(`[Modal Entidades] Procesando dato #${index + 1}: Nombre='${nombre}', Img Element='${imgEl ? 'OK' : 'NO Encontrado'}', Img Src='${imgSrc ? 'OK' : 'NO Encontrado'}'`);

            if (nombre && imgSrc && imgSrc.trim() !== '' && !imgSrc.endsWith('/')) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item-entidad';
                gridItem.innerHTML = `
                    <img src="${imgSrc}" alt="${nombre}" />
                    <span>${nombre}</span>
                `;
                gridItem.onclick = () => {
                    agregarEntidadDesdeDato(nombre);
                    cerrarModalSeleccionEntidad();
                };
                gridContainer.appendChild(gridItem);
                itemsAñadidos++;
            }
        });

        // 3. Mensaje de feedback si se encontraron datos pero ninguno era válido
        if (itemsAñadidos === 0 && todosLosDatos.length > 0) {
            gridContainer.innerHTML = `<p style="color: #ffcc00;">Se encontraron ${todosLosDatos.length} datos, pero ninguno tenía un nombre o imagen válidos para mostrar. Revisa los mensajes de depuración en la consola (F12).</p>`;
        }
    }

    modalContent.querySelector('.modal-close-btn').onclick = cerrarModalSeleccionEntidad;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            cerrarModalSeleccionEntidad();
        }
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
    actualizarDatosNodo(); // Guardar el cambio inmediatamente
}


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

    // Se añade el input de altura con un valor por defecto de 65
    div.innerHTML = `
        <span class="entidad-nombre">${data.recurso}</span>
        <div class="entidad-controles">
            <label>Altura:</label>
            <input type="number" class="entidad-altura-input" value="${data.altura || 65}" min="10" max="150" step="1">
            <span>%</span>
            <button class="delete-item-btn">&times;</button>
        </div>
    `;

    // Se elimina el botón "Cambiar" que era redundante y se simplifican los controles.
    // El evento de borrado no cambia.
    div.querySelector('.delete-item-btn').onclick = () => {
        div.remove();
        actualizarDatosNodo();
    };
    
    // IMPORTANTE: El nuevo input también debe actualizar los datos al cambiar
    div.querySelector('.entidad-altura-input').addEventListener('input', actualizarDatosNodo);

    return div;
}


// --- FUNCIONES LEGADO (Mantenidas para Entorno y Acciones) ---

function poblarEntornoPanel(data = {}) {
    // (Esta función no se modifica, se mantiene como estaba)
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
        <button id="btn-ilustrar-momento-ia" class="btn-accion-agregar" style="width: 100%; margin-top: 10px;">
            ✨ Ilustrar Momento con IA
        </button>
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
    container.querySelector('#btn-ilustrar-momento-ia').addEventListener('click', generarYRefinarImagenParaNodo);
    container.querySelectorAll('input, select').forEach(input => input.addEventListener('input', actualizarDatosNodo));
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
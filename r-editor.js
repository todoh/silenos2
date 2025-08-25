// =======================================================================
// === LÓGICA DEL EDITOR HÍBRIDO 2D/3D (UI, EVENTOS E INICIALIZACIÓN) ====
// =======================================================================

// Estado actual del editor
let activeTool = { category: 'texture', id: 'grass' };
const WORLD_DATA_NAME_PREFIX = 'Mundo - ';
let editorState = {
    isPickingCoordinate: false,
    entityBeingEdited: null,
};

// Referencias a los elementos del DOM.
const editorDOM = {
    mapGridContainer: document.getElementById('r-map-grid-container'),
    texturePalette: document.getElementById('r-texture-palette'),
    entityPalette: document.getElementById('r-entity-palette'),
    previewButton: document.getElementById('r-preview-button'),
    saveButton: document.getElementById('r-save-button'),
    loadWorldSelect: document.getElementById('r-load-world-select'),
    saveToCharacterButton: document.getElementById('r-save-to-character-btn'),
    previewModal: document.getElementById('r-preview-modal'),
    previewModalCloseBtn: document.querySelector('#r-preview-modal .modal-close-button1'),
    zoomInButton: document.getElementById('r-zoom-in-button'),
    zoomOutButton: document.getElementById('r-zoom-out-button'),
    characterModal: document.getElementById('r-character-modal-overlay'),
    characterModalCloseBtn: document.querySelector('#r-character-modal-overlay .character-modal-close-button'),
    characterGrid: document.getElementById('r-character-grid'),
    editEntityModal: document.getElementById('r-edit-entity-modal'),
    editEntityCloseBtn: document.getElementById('r-edit-entity-close-btn'),
    editEntitySaveBtn: document.getElementById('r-edit-entity-save-btn'),
    editEntityNameSpan: document.getElementById('r-edit-entity-name'),
    editColisionTipoSelect: document.getElementById('edit-colision-tipo'),
};

// Estado para el visor 3D del editor
let editor3DState = {
    isActive: false,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    placeableObjects: new THREE.Group(),
    groundObjects: [],
    gridHelper: null
};

let selectedAvatarKey = null;

// --- FUNCIONES ORIGINALES PRESERVADAS ---

async function openAvatarSelectionModal() {
    const avatarGrid = document.getElementById('r-avatar-grid');
    avatarGrid.innerHTML = '';
    for (const toolId in tools.customEntities) {
        const tool = tools.customEntities[toolId];
        if (tool.modelType === 'json3d') {
            const btn = document.createElement('button');
            btn.className = 'palette-item';
            const previewSrc = await generate3DPreview(tool.icon);
            btn.innerHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${tool.name}"></div><span>${tool.name}</span>`;
            btn.onclick = () => {
                selectedAvatarKey = toolId;
                document.getElementById('r-avatar-modal').style.display = 'none';
                alert(`Avatar "${tool.name}" seleccionado.`);
            };
            avatarGrid.appendChild(btn);
        }
    }
    document.getElementById('r-avatar-modal').style.display = 'flex';
}

function findDatoElementByName(name) {
    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of characterDataElements) {
        if (charElement.querySelector('.nombreh')?.value === name) {
            return charElement;
        }
    }
    return null;
}

function openEntityEditorModal(entity) {
    if (!entity.dataRef) {
        alert("Este objeto no es personalizable (no proviene de un 'Dato').");
        return;
    }
    const datoElement = findDatoElementByName(entity.dataRef);
    if (!datoElement) {
        alert(`No se encontró el "Dato" original llamado "${entity.dataRef}".`);
        return;
    }
    editorState.entityBeingEdited = entity;
    const props = procesarPropiedadesVideojuego(datoElement);
    renderizarRutaMovimiento(props.movimiento || []);
    editorDOM.editEntityNameSpan.textContent = entity.dataRef;
    document.getElementById('edit-tamano-x').value = props.tamano?.x || 1;
    document.getElementById('edit-tamano-y').value = props.tamano?.y || 1.8;
    document.getElementById('edit-tamano-z').value = props.tamano?.z || 1;
    document.getElementById('edit-rotacion-y').value = props.rotacionY || 0;
    document.getElementById('edit-es-cubo-3d').checked = props.esCubo3D || false;
    document.getElementById('edit-es-cilindro-3d').checked = props.esCilindro3D || false;
    document.getElementById('edit-colision-tipo').value = props.colision?.tipo || 'ninguna';
    document.getElementById('edit-colision-radio').value = props.colision?.radio || 0.5;
    document.getElementById('edit-colision-altura').value = props.colision?.altura || 1.8;
    updateCollisionFieldsVisibility();
    editorDOM.editEntityModal.dataset.editingDatoName = entity.dataRef;
    editorDOM.editEntityModal.style.display = 'flex';
}

function saveEntityProperties() {
    const datoName = editorDOM.editEntityModal.dataset.editingDatoName;
    if (!datoName) return;
    const datoElement = findDatoElementByName(datoName);
    if (!datoElement) {
        alert("Error: Se perdió la referencia al 'Dato' original.");
        return;
    }
    const newProps = {
        tamano: {
            x: parseFloat(document.getElementById('edit-tamano-x').value),
            y: parseFloat(document.getElementById('edit-tamano-y').value),
            z: parseFloat(document.getElementById('edit-tamano-z').value)
        },
        rotacionY: parseFloat(document.getElementById('edit-rotacion-y').value),
        esCubo3D: document.getElementById('edit-es-cubo-3d').checked,
        esCilindro3D: document.getElementById('edit-es-cilindro-3d').checked,
        colision: {
            tipo: document.getElementById('edit-colision-tipo').value,
            radio: parseFloat(document.getElementById('edit-colision-radio').value),
            altura: parseFloat(document.getElementById('edit-colision-altura').value)
        },
        movimiento: []
    };
    const pasos = document.querySelectorAll('#edit-movimiento-lista .ruta-paso');
    pasos.forEach(pasoEl => {
        const pasoData = { tipo: pasoEl.dataset.tipo };
        if (pasoData.tipo === 'aleatorio') {
            pasoData.duracion = pasoEl.dataset.duracion === 'null' ? null : parseFloat(pasoEl.dataset.duracion);
        } else if (pasoData.tipo === 'ir_a') {
            pasoData.coordenadas = { x: parseFloat(pasoEl.dataset.x), z: parseFloat(pasoEl.dataset.z) };
        }
        newProps.movimiento.push(pasoData);
    });
    const KEYWORD = 'Videojuego';
    const SEPARATOR = '---';
    const promptVisualTextarea = datoElement.querySelector('.descripcionh');
    const oldText = promptVisualTextarea.value;
    const separatorIndex = oldText.indexOf(SEPARATOR);
    const descriptionText = separatorIndex > -1 ? oldText.substring(separatorIndex) : '';
    const newJsonString = JSON.stringify(newProps, null, 2);
    promptVisualTextarea.value = `${KEYWORD}\n${newJsonString}\n\n${descriptionText}`.trim();
    alert(`Propiedades de "${datoName}" actualizadas!`);
    editorDOM.editEntityModal.style.display = 'none';
}

function iniciarModoSeleccionCoordenada() {
    if (!editorState.entityBeingEdited) {
        alert("Error: No hay ninguna entidad seleccionada para editar.");
        return;
    }
    editorState.isPickingCoordinate = true;
    editorDOM.editEntityModal.style.display = 'none';
    editorDOM.mapGridContainer.style.cursor = 'crosshair';
}

// --- NUEVA FUNCIÓN PARA RECARGA MANUAL ---

/**
 * Recarga y vuelve a dibujar manualmente todos los elementos en el canvas del editor 3D.
 * Útil para forzar una actualización visual después de cargar datos.
 */
function cargarcanvas() {
    console.log("Recarga manual del canvas 3D iniciada...");
    if (!editor3DState.isActive) {
        console.warn("El editor 3D no está activo. Intentando inicializar...");
        initialize3DEditor();
        return;
    }
    render3DWorldFromData();
    console.log("Canvas 3D recargado.");
}

// --- MOTOR DEL EDITOR 3D ---

function initialize3DEditor() {
    if (editor3DState.isActive) return;
    const container = editorDOM.mapGridContainer;
    if (container.clientWidth === 0 || container.clientHeight === 0) {
        console.warn("El contenedor del editor 3D no tiene dimensiones. Se reintentará.");
        requestAnimationFrame(initialize3DEditor);
        return;
    }
    container.innerHTML = '';

    editor3DState.scene = new THREE.Scene();
    editor3DState.scene.background = new THREE.Color(0x608da0);
    editor3DState.scene.fog = new THREE.Fog(0x608da0, 100, 500);

    editor3DState.renderer = new THREE.WebGLRenderer({ antialias: true });
    editor3DState.renderer.setSize(container.clientWidth, container.clientHeight);
    editor3DState.renderer.shadowMap.enabled = true;
    container.appendChild(editor3DState.renderer.domElement);

    const centerX = (GRID_WIDTH * CHUNK_SIZE) / 2;
    const centerZ = (GRID_HEIGHT * CHUNK_SIZE) / 2;
    editor3DState.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 2000);
    editor3DState.camera.position.set(centerX, 120, centerZ + 80);

    editor3DState.controls = new THREE.OrbitControls(editor3DState.camera, editor3DState.renderer.domElement);
    editor3DState.controls.target.set(centerX, 0, centerZ);
    editor3DState.controls.enableDamping = true;
    editor3DState.controls.dampingFactor = 0.1;
    editor3DState.controls.screenSpacePanning = false;
    editor3DState.controls.maxPolarAngle = Math.PI / 2.1;

    editor3DState.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(150, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -200;
    dirLight.shadow.camera.right = 200;
    dirLight.shadow.camera.top = 200;
    dirLight.shadow.camera.bottom = -200;
    editor3DState.scene.add(dirLight);

    const gridSize = Math.max(GRID_WIDTH, GRID_HEIGHT) * CHUNK_SIZE;
    editor3DState.gridHelper = new THREE.GridHelper(gridSize, gridSize / CHUNK_SIZE, 0x000000, 0x888888);
    editor3DState.gridHelper.position.set(centerX, 0.01, centerZ);
    editor3DState.scene.add(editor3DState.gridHelper);

    editor3DState.scene.add(editor3DState.placeableObjects);
    render3DWorldFromData();

    editor3DState.isActive = true;
    animate3DEditor();

    window.addEventListener('resize', handleEditorResize, false);
    editor3DState.renderer.domElement.addEventListener('click', handleEditorClick, false);
    editor3DState.renderer.domElement.addEventListener('contextmenu', handleEditorRightClick, false);
}

function animate3DEditor() {
    if (!editor3DState.isActive) return;
    requestAnimationFrame(animate3DEditor);
    editor3DState.controls.update();
    editor3DState.renderer.render(editor3DState.scene, editor3DState.camera);
}

async function render3DWorldFromData() {
    while (editor3DState.placeableObjects.children.length > 0) {
        editor3DState.placeableObjects.remove(editor3DState.placeableObjects.children[0]);
    }
    editor3DState.groundObjects.forEach(ground => editor3DState.scene.remove(ground));
    editor3DState.groundObjects = [];

    for (const chunkId in worldData.chunks) {
        const chunk = worldData.chunks[chunkId];
        if (!chunk || chunk.groundTextureKey === 'empty') continue;
        const [chunkX, chunkZ] = chunkId.split('_').map(Number);

        const textureData = tools.textures[chunk.groundTextureKey] || { material: { materialRef: 'terreno_cesped' } };
        const groundMaterial = createMaterial(textureData.material);
        if (groundMaterial.isMeshStandardMaterial) groundMaterial.roughness = 0.9;

        const groundGeometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.set(chunkX * CHUNK_SIZE + CHUNK_SIZE / 2, 0, chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2);
        groundMesh.receiveShadow = true;
        editor3DState.scene.add(groundMesh);
        editor3DState.groundObjects.push(groundMesh);

        for (const obj of chunk.objects) {
            const entityData = tools.customEntities[obj.type] || tools.entities[obj.type];
            if (!entityData) continue;

            let modelObject = null;
            if (entityData.modelType === 'json3d' && entityData.icon) {
                modelObject = createModelFromJSON(entityData.icon);
            } else if (entityData.modelType === 'sprite') {
                const iconSrc = findCharacterImageSrc(obj.dataRef) || entityData.icon;
                if (iconSrc) {
                    const map = new THREE.TextureLoader().load(iconSrc);
                    const material = new THREE.SpriteMaterial({ map, transparent: true, alphaTest: 0.1 });
                    const sprite = new THREE.Sprite(material);
                    const gameProps = (entityData.gameProps) ? entityData.gameProps : { tamano: { x: 3, y: 4.8 } };
                    sprite.scale.set(gameProps.tamano.x, gameProps.tamano.y, 1);
                    modelObject = sprite;
                }
            } else if (entityData.model) {
                modelObject = createModelFromJSON(entityData.model);
            }

            if (modelObject) {
                const objX = (chunkX * CHUNK_SIZE) + obj.x;
                const objZ = (chunkZ * CHUNK_SIZE) + obj.z;
                const box = new THREE.Box3().setFromObject(modelObject);
                const size = box.getSize(new THREE.Vector3());
                const yOffset = modelObject.isSprite ? size.y / 2 : -box.min.y;
                modelObject.position.set(objX, yOffset, objZ);
                modelObject.castShadow = true;
                modelObject.userData.sourceObject = obj;
                editor3DState.placeableObjects.add(modelObject);
            }
        }
    }

    const playerStart = worldData.metadata.playerStartPosition;
    if (playerStart) {
        const startX = (playerStart.chunkX * CHUNK_SIZE) + (playerStart.subX * (CHUNK_SIZE / SUBGRID_SIZE)) + ((CHUNK_SIZE / SUBGRID_SIZE) / 2);
        const startZ = (playerStart.chunkZ * CHUNK_SIZE) + (playerStart.subZ * (CHUNK_SIZE / SUBGRID_SIZE)) + ((CHUNK_SIZE / SUBGRID_SIZE) / 2);
        const startMarkerGeo = new THREE.ConeGeometry(1.5, 4, 12);
        const startMarkerMat = new THREE.MeshLambertMaterial({ color: 0xff4444 });
        const startMarker = new THREE.Mesh(startMarkerGeo, startMarkerMat);
        startMarker.position.set(startX, 2, startZ);
        editor3DState.placeableObjects.add(startMarker);
    }
}

function handleEditorResize() {
    if (!editor3DState.isActive) return;
    const container = editorDOM.mapGridContainer;
    editor3DState.camera.aspect = container.clientWidth / container.clientHeight;
    editor3DState.camera.updateProjectionMatrix();
    editor3DState.renderer.setSize(container.clientWidth, container.clientHeight);
}

function handleEditorClick(event) {
    if (event.button !== 0) return;

    if (editorState.isPickingCoordinate) {
        const rect = editorDOM.mapGridContainer.getBoundingClientRect();
        const mouse = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, editor3DState.camera);
        const intersects = raycaster.intersectObjects(editor3DState.groundObjects);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            const nuevoPaso = { tipo: 'ir_a', coordenadas: { x: point.x, z: point.z } };
            const listaEl = document.getElementById('edit-movimiento-lista');
            let rutaActual = [];
            listaEl.querySelectorAll('.ruta-paso').forEach(pasoEl => {
                const pasoData = { tipo: pasoEl.dataset.tipo };
                if (pasoData.tipo === 'aleatorio') pasoData.duracion = pasoEl.dataset.duracion === 'null' ? null : parseFloat(pasoEl.dataset.duracion);
                else if (pasoData.tipo === 'ir_a') pasoData.coordenadas = { x: parseFloat(pasoEl.dataset.x), z: parseFloat(pasoEl.dataset.z) };
                rutaActual.push(pasoData);
            });
            rutaActual.push(nuevoPaso);
            renderizarRutaMovimiento(rutaActual);
            editorState.isPickingCoordinate = false;
            editorDOM.mapGridContainer.style.cursor = 'default';
            editorDOM.editEntityModal.style.display = 'flex';
        }
        return;
    }

    const container = editorDOM.mapGridContainer;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(((event.clientX - rect.left) / container.clientWidth) * 2 - 1, -((event.clientY - rect.top) / container.clientHeight) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, editor3DState.camera);
    const intersects = raycaster.intersectObjects(editor3DState.groundObjects);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        const chunkX = Math.floor(point.x / CHUNK_SIZE);
        const chunkZ = Math.floor(point.z / CHUNK_SIZE);
        const chunkId = `${chunkX}_${chunkZ}`;
        if (!worldData.chunks[chunkId]) {
            worldData.chunks[chunkId] = { groundTextureKey: 'grass', objects: [] };
        }
        const chunk = worldData.chunks[chunkId];
        const posX_in_chunk = point.x - (chunkX * CHUNK_SIZE);
        const posZ_in_chunk = point.z - (chunkZ * CHUNK_SIZE);

        if (activeTool.category === 'texture') {
            chunk.groundTextureKey = activeTool.id;
        } else if (activeTool.category === 'entity' || activeTool.category === 'customEntity') {
            if (activeTool.id === 'eraser') {
                let closestObject = null;
                let minDistance = 2;
                chunk.objects.forEach(obj => {
                    const distance = Math.hypot(obj.x - posX_in_chunk, obj.z - posZ_in_chunk);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestObject = obj;
                    }
                });
                if (closestObject) {
                    chunk.objects.splice(chunk.objects.indexOf(closestObject), 1);
                }
            } else if (activeTool.id === 'playerStart') {
                worldData.metadata.playerStartPosition = {
                    chunkX,
                    chunkZ,
                    subX: Math.floor(posX_in_chunk / (CHUNK_SIZE / SUBGRID_SIZE)),
                    subZ: Math.floor(posZ_in_chunk / (CHUNK_SIZE / SUBGRID_SIZE))
                };
            } else if (activeTool.id !== 'selector') {
                const newObject = { type: activeTool.id, x: posX_in_chunk, z: posZ_in_chunk };
                if (activeTool.category === 'customEntity') {
                    newObject.dataRef = tools.customEntities[activeTool.id].dataRef;
                }
                chunk.objects.push(newObject);
            }
        }
        render3DWorldFromData();
    }
}

function handleEditorRightClick(event) {
    event.preventDefault();
    if (activeTool.id !== 'selector') return;
    const container = editorDOM.mapGridContainer;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(((event.clientX - rect.left) / container.clientWidth) * 2 - 1, -((event.clientY - rect.top) / container.clientHeight) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, editor3DState.camera);
    const intersects = raycaster.intersectObjects(editor3DState.placeableObjects.children, true);
    if (intersects.length > 0) {
        let mainParent = intersects[0].object;
        while (mainParent.parent && mainParent.parent !== editor3DState.placeableObjects) {
            mainParent = mainParent.parent;
        }
        if (mainParent.userData.sourceObject) {
            openEntityEditorModal(mainParent.userData.sourceObject);
        }
    }
}

function selectTool(category, id) {
    activeTool = { category, id };
    document.querySelectorAll('.palette-item.selected').forEach(el => el.classList.remove('selected'));
    const toolElement = document.querySelector(`.palette-item[data-id='${id}']`);
    if (toolElement) toolElement.classList.add('selected');
    editorDOM.mapGridContainer.style.cursor = (id === 'selector') ? 'pointer' : 'crosshair';
}

function zoomIn() {
    if (editor3DState.isActive) editor3DState.controls.dollyIn(1.2);
}

function zoomOut() {
    if (editor3DState.isActive) editor3DState.controls.dollyOut(1.2);
}

function findCharacterImageSrc(dataRefName) {
    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of allCharacters) {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value === dataRefName) {
            const imgElement = charElement.querySelector('.personaje-visual img');
            if (imgElement && imgElement.src) return imgElement.src;
        }
    }
    return null;
}

// --- INICIALIZACIÓN Y EVENT LISTENERS (CORREGIDO) ---

document.addEventListener('DOMContentLoaded', async () => {
    // Inicialización de datos del mundo
    if (Object.keys(worldData.chunks).length === 0) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            for (let z = 0; z < GRID_HEIGHT; z++) {
                worldData.chunks[`${x}_${z}`] = { groundTextureKey: 'grass', objects: [] };
            }
        }
    }
    if (!worldData.metadata.playerStartPosition) {
        worldData.metadata.playerStartPosition = { chunkX: Math.floor(GRID_WIDTH/2), chunkZ: Math.floor(GRID_HEIGHT/2), subX: 0, subZ: 0 };
    }

    // Poblar UI y configurar estado inicial
    await populatePalettes();
    selectTool('texture', 'grass');
    populateWorldList();

    // Observador para inicializar el editor 3D solo cuando sea visible
    const renderizadorEl = document.getElementById('renderizador');
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = renderizadorEl.style.display !== 'none';
                if (isVisible && !editor3DState.isActive) {
                    console.log("El editor se ha hecho visible. Inicializando Three.js...");
                    initialize3DEditor();
                }
            }
        }
    });
    observer.observe(renderizadorEl, { attributes: true });

    // Listeners de botones principales
    
    editorDOM.saveButton.addEventListener('click', saveWorldToCharacter);
    if (editorDOM.saveToCharacterButton) {
        editorDOM.saveToCharacterButton.addEventListener('click', saveWorldToCharacter);
    }
    editorDOM.previewButton.addEventListener('click', startPreview);
    editorDOM.previewModalCloseBtn.addEventListener('click', stopPreview);

    // --- CAMBIO CLAVE: Listener de carga de mundo corregido ---
    if (editorDOM.loadWorldSelect) {
        editorDOM.loadWorldSelect.addEventListener('change', async (event) => {
            await loadWorldData(event.target.value); // Espera a que la carga y la paleta se actualicen
            render3DWorldFromData(); // Renderiza DESPUÉS de que todo esté listo
        });
        editorDOM.loadWorldSelect.addEventListener('click', populateWorldList);
    }

    if (editorDOM.editEntityModal) {
        editorDOM.editEntityCloseBtn.addEventListener('click', () => editorDOM.editEntityModal.style.display = 'none');
        editorDOM.editEntitySaveBtn.addEventListener('click', saveEntityProperties);
        editorDOM.editColisionTipoSelect.addEventListener('change', updateCollisionFieldsVisibility);
        const cuboCheckbox = document.getElementById('edit-es-cubo-3d');
        const cilindroCheckbox = document.getElementById('edit-es-cilindro-3d');
        cuboCheckbox.addEventListener('change', () => { if (cuboCheckbox.checked) cilindroCheckbox.checked = false; });
        cilindroCheckbox.addEventListener('change', () => { if (cilindroCheckbox.checked) cuboCheckbox.checked = false; });
        
        document.getElementById('movimiento-seleccionar-coord-btn').addEventListener('click', iniciarModoSeleccionCoordenada);
    }

    if (document.getElementById('r-avatar-modal-close-btn')) {
        document.getElementById('r-avatar-modal-close-btn').addEventListener('click', () => {
            document.getElementById('r-avatar-modal').style.display = 'none';
        });
    }
});
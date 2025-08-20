// =======================================================================
// === LÓGICA DEL VISOR 3D (THREE.JS) ====================================
// =======================================================================

let previewState = { 
    isActive: false, scene: null, camera: null, renderer: null, clock: null, animationFrameId: null, groundMeshes: [], 
    collidableObjects: [], interactiveObjects: [] , movingObjects: [],  physicsWorld: null,  
    physicsObjects: []
};
const CHUNK_SIZE = 32;
const SUB_CELL_SIZE = CHUNK_SIZE / SUBGRID_SIZE;
const textureColors = { grass: 0x7C9C4A, sand: 0xEDC9AF, stone: 0x615953, water: 0x3B698B, forest: 0x3E7C4F };
// --- AÑADIDO: Propiedades de salto y correr ---
const playerController = { 
    height: 1.8, 
    speed: 18.0, 
    runSpeedMultiplier: 1.6, // Multiplicador al correr
    radius: 0.5, 
    mesh: null, 
    targetPosition: null, 
    velocityY: 0, 
    canJump: true, 
    jumpForce: 8 
};
const GRAVITY = 25.0; 

// --- MODIFICADO: Añadido control de cámara vertical y nombres más claros ---
const cameraController = { 
    distance: 18, 
    angle: Math.PI / 4,
    horizontalAngle: 0,
    horizontalRotationDirection: 0, // -1 para izquierda, 1 para derecha
    verticalRotationDirection: 0,   // -1 para abajo, 1 para arriba
    ROTATION_SPEED: 1.5, // Velocidad de rotación reducida para mayor control
    offset: new THREE.Vector3(), 
    minZoom: 5, 
    maxZoom: 50,
    mode: 'thirdPerson', 
    pitch: 0,
    yaw: 0,
};
const INTERACTION_DISTANCE = 5;

const keyState = {};
let rotationStopHandler = null; // Para poder eliminar el event listener global


function startPreview() {
    if (previewState.isActive) return;
    const container = document.getElementById('r-game-container');
    container.innerHTML = '';
    
    previewState.collidableObjects = [];
    previewState.groundMeshes = [];
    previewState.interactiveObjects = [];
    previewState.movingObjects = [];
    playerController.velocityY = 0;
    cameraController.horizontalAngle = 0;
    cameraController.angle = Math.PI / 4;

    previewState.scene = new THREE.Scene();
    previewState.scene.background = new THREE.Color(0x87ceeb);
    previewState.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

    previewState.physicsWorld = new CANNON.World();
    previewState.physicsWorld.gravity.set(0, -9.82, 0); // Gravedad terrestre
    previewState.physicsWorld.broadphase = new CANNON.NaiveBroadphase();
    previewState.physicsObjects = [];

    // --- Materiales Físicos para Fricción y Rebote ---
    const groundMaterial = new CANNON.Material("groundMaterial");
    const playerMaterial = new CANNON.Material("playerMaterial");
    const groundPlayerContactMaterial = new CANNON.ContactMaterial(
        groundMaterial,
        playerMaterial,
        {
            friction: 0.4,      // Fricción (0 = sin fricción, 1 = mucha fricción)
            restitution: 0.1,   // Rebote (0 = no rebota, 1 = rebota perfectamente)
        }
    );
    previewState.physicsWorld.addContactMaterial(groundPlayerContactMaterial);
    previewState.physicsMaterials = { groundMaterial, playerMaterial };
    // --- Fin de Materiales Físicos ---

    previewState.clock = new THREE.Clock();
    previewState.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    const playerGeo = new THREE.CylinderGeometry(playerController.radius, playerController.radius, playerController.height, 16);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    playerController.mesh = new THREE.Mesh(playerGeo, playerMat);


 if (selectedAvatarKey && tools.customEntities[selectedAvatarKey]) {
        const avatarData = tools.customEntities[selectedAvatarKey].icon;
        playerController.mesh = createModelFromJSON(avatarData);
      //  playerController.mesh.rotation.y = Math.PI; // Rota el modelo 180 grados
    } else {
        // Si no hay avatar seleccionado, usa el cilindro rojo por defecto
        const playerGeo = new THREE.CylinderGeometry(playerController.radius, playerController.radius, playerController.height, 16);
        const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        playerController.mesh = new THREE.Mesh(playerGeo, playerMat);
    }


    playerController.mesh.castShadow = true;
const playerBox = new THREE.Box3().setFromObject(playerController.mesh);
// La distancia desde el pivote del modelo hasta su punto más bajo.
// Si el pivote está en la cintura, box.min.y será un valor negativo.
// Lo guardamos para usarlo en cada fotograma.
playerController.yOffset = -playerBox.min.y;
    let startX = 0, startZ = 0;
    if (worldData.metadata.playerStartPosition) {
        const { chunkX, chunkZ, subX, subZ } = worldData.metadata.playerStartPosition;
        startX = (chunkX * CHUNK_SIZE) + (subX * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
        startZ = (chunkZ * CHUNK_SIZE) + (subZ * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
    }
    playerController.mesh.position.set(startX, playerController.height / 2, startZ);
    previewState.scene.add(playerController.mesh);
    playerController.targetPosition = playerController.mesh.position.clone();

    const playerShape = new CANNON.Sphere(playerController.radius);
    const playerBody = new CANNON.Body({
        mass: 5, // Masa en kg
        position: new CANNON.Vec3(startX, playerController.height, startZ),
        shape: playerShape,
        linearDamping: 0.9, // Fricción con el aire/suelo
        material: previewState.physicsMaterials.playerMaterial
    });
    playerBody.fixedRotation = true; // Evita que la esfera ruede sin control
    playerBody.updateMassProperties();

    previewState.physicsWorld.addBody(playerBody);
    playerController.mesh.userData.physicsBody = playerBody;

    // --- Evento de colisión para detectar el suelo ---
    playerBody.addEventListener("collide", (event) => {
        const contact = event.contact;
        const contactNormal = new CANNON.Vec3();
        const up = new CANNON.Vec3(0, 1, 0);
        let onGround = false;

        // Determina la dirección de la normal de contacto relativa al jugador
        if (contact.bi.id === playerBody.id) {
            contact.ni.negate(contactNormal);
        } else {
            contactNormal.copy(contact.ni);
        }

        // Si el producto punto es mayor a 0.5, significa que la colisión es mayormente desde abajo.
        if (contactNormal.dot(up) > 0.5) { 
            onGround = true;
        }

        if (onGround) {
            playerController.canJump = true;
        }
    });


    previewState.renderer = new THREE.WebGLRenderer({ antialias: true });
    previewState.renderer.shadowMap.enabled = true;
    container.appendChild(previewState.renderer.domElement);

    previewState.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    previewState.scene.add(directionalLight);
    
    // --- INICIO: Añadir cruceta de control y sus estilos ---
    const dpadControlsHTML = `
        <style id="r-preview-dpad-styles">
            #r-dpad-container {
                position: absolute;
                bottom: 15px;
                left: 15px;
                display: grid;
                grid-template-columns: 45px 45px 45px;
                grid-template-rows: 45px 45px;
                gap: 4px;
                z-index: 100;
            }
            .r-dpad-btn {
                background-color: rgba(0, 0, 0, 0.4);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.7);
                font-size: 24px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
                transition: background-color 0.2s;
                border-radius: 8px;
            }
            .r-dpad-btn:hover { background-color: rgba(0, 0, 0, 0.7); }
            #r-rotate-up-btn    { grid-column: 2; grid-row: 1; }
            #r-rotate-down-btn  { grid-column: 2; grid-row: 2; }
            #r-rotate-left-btn  { grid-column: 1; grid-row: 2; }
            #r-rotate-right-btn { grid-column: 3; grid-row: 2; }
        </style>
        <div id="r-dpad-container">
            <button id="r-rotate-up-btn" class="r-dpad-btn" title="Subir cámara">▲</button>
            <button id="r-rotate-left-btn" class="r-dpad-btn" title="Girar a la izquierda">⟲</button>
            <button id="r-rotate-down-btn" class="r-dpad-btn" title="Bajar cámara">▼</button>
            <button id="r-rotate-right-btn" class="r-dpad-btn" title="Girar a la derecha">⟳</button>
        </div>
    `;
    document.getElementById('r-preview-modal').insertAdjacentHTML('beforeend', dpadControlsHTML);
    
    const rotateUpBtn = document.getElementById('r-rotate-up-btn');
    const rotateDownBtn = document.getElementById('r-rotate-down-btn');
    const rotateLeftBtn = document.getElementById('r-rotate-left-btn');
    const rotateRightBtn = document.getElementById('r-rotate-right-btn');

    const stopRotation = () => {
        cameraController.horizontalRotationDirection = 0;
        cameraController.verticalRotationDirection = 0;
    };
    rotationStopHandler = stopRotation; // Guardar referencia
    
    const setupRotationButton = (btn, hDir, vDir) => {
        btn.addEventListener('mousedown', (e) => {
            if (cameraController.mode === 'thirdPerson') {
                cameraController.horizontalRotationDirection = hDir;
                cameraController.verticalRotationDirection = vDir;
            }
            e.stopPropagation();
        });
        btn.addEventListener('mouseleave', stopRotation);
    };

    setupRotationButton(rotateUpBtn, 0, 1);
    setupRotationButton(rotateDownBtn, 0, -1);
    setupRotationButton(rotateLeftBtn, -1, 0);
    setupRotationButton(rotateRightBtn, 1, 0);
    
    document.addEventListener('mouseup', rotationStopHandler);
    // --- FIN: Añadir cruceta de control ---
    
    loadWorldFromData(worldData.chunks);
    document.getElementById('r-preview-modal').style.display = 'flex';
    
    setTimeout(() => {
        handlePreviewResize();
        window.addEventListener('resize', handlePreviewResize, false);
        container.addEventListener('click', handlePreviewClick, false);
        container.addEventListener('wheel', handleMouseWheel, false);
        
        document.getElementById('r-toggle-view-btn').addEventListener('click', toggleCameraView);
        window.addEventListener('keydown', handleKeyDown, false);
        window.addEventListener('keyup', handleKeyUp, false);
        container.addEventListener('mousemove', handleMouseMove, false);
        document.addEventListener('pointerlockchange', handlePointerLockChange, false);

        previewState.isActive = true;
        animatePreview();
    }, 0);
}

function stopPreview() {
    if (!previewState.isActive) return;
    cancelAnimationFrame(previewState.animationFrameId);
    const container = document.getElementById('r-game-container');
    window.removeEventListener('resize', handlePreviewResize, false);
    container.removeEventListener('click', handlePreviewClick, false);
    container.removeEventListener('wheel', handleMouseWheel, false);

    const toggleBtn = document.getElementById('r-toggle-view-btn');
    if(toggleBtn) toggleBtn.removeEventListener('click', toggleCameraView);
    window.removeEventListener('keydown', handleKeyDown, false);
    window.removeEventListener('keyup', handleKeyUp, false);
    container.removeEventListener('mousemove', handleMouseMove, false);
    document.removeEventListener('pointerlockchange', handlePointerLockChange, false);
    
    // --- INICIO: Limpieza de cruceta y listeners ---
    if (rotationStopHandler) {
        document.removeEventListener('mouseup', rotationStopHandler);
        rotationStopHandler = null;
    }
    const dpad = document.getElementById('r-dpad-container');
    const styles = document.getElementById('r-preview-dpad-styles');
    if (dpad) dpad.remove();
    if (styles) styles.remove();
    // --- FIN: Limpieza de cruceta y listeners ---

    if (document.pointerLockElement === container) {
        document.exitPointerLock();
    }

    if (previewState.renderer) previewState.renderer.dispose();
    container.innerHTML = '';
    previewState = { isActive: false, scene: null, camera: null, renderer: null, clock: null, animationFrameId: null, groundMeshes: [], collidableObjects: [], interactiveObjects: [] };
    
    cameraController.mode = 'thirdPerson';
    
    document.getElementById('r-preview-modal').style.display = 'none';
}

function handlePreviewResize() {
    if (!previewState.isActive) return;
    const container = document.getElementById('r-game-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    previewState.camera.aspect = width / height;
    previewState.camera.updateProjectionMatrix();
    previewState.renderer.setSize(width, height);
}

function handleMouseWheel(event) {
    event.preventDefault();
    if(cameraController.mode !== 'thirdPerson') return;
    const zoomSpeed = 0.5;
    cameraController.distance += event.deltaY * 0.05 * zoomSpeed;
    cameraController.distance = Math.max(cameraController.minZoom, Math.min(cameraController.maxZoom, cameraController.distance));
}

function toggleCameraView() {
    const container = document.getElementById('r-game-container');
    const toggleBtn = document.getElementById('r-toggle-view-btn');
    const dpad = document.getElementById('r-dpad-container');

    if (cameraController.mode === 'thirdPerson') {
        cameraController.mode = 'firstPerson';
        toggleBtn.textContent = 'Vista 3ª Persona';
        playerController.mesh.visible = false;
        if (dpad) dpad.style.display = 'none';
        container.requestPointerLock();
    } else {
        cameraController.mode = 'thirdPerson';
        toggleBtn.textContent = 'Vista 1ª Persona';
        playerController.mesh.visible = true;
        if (dpad) dpad.style.display = 'grid';
        document.exitPointerLock();
        playerController.targetPosition = playerController.mesh.position.clone(); 
    }
}

function handleKeyDown(event) {
    if (!previewState.isActive) return;

    keyState[event.code] = true;

    if (event.code === 'Space' && playerController.canJump) {
        const playerBody = playerController.mesh.userData.physicsBody;
        if (playerBody) {
            playerBody.velocity.y = playerController.jumpForce;
            playerController.canJump = false;
        }
    }
}

function handleKeyUp(event) {
    if (!previewState.isActive) return;
    keyState[event.code] = false;
}

function handleMouseMove(event) {
    if (!previewState.isActive || cameraController.mode !== 'firstPerson' || document.pointerLockElement !== document.getElementById('r-game-container')) return;
    
    const sensitivity = 0.002;
    cameraController.yaw -= event.movementX * sensitivity;
    cameraController.pitch -= event.movementY * sensitivity;

    cameraController.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraController.pitch));
}

function handlePointerLockChange() {
    const container = document.getElementById('r-game-container');
    if (document.pointerLockElement !== container && cameraController.mode === 'firstPerson') {
        toggleCameraView();
    }
}

function handlePreviewClick(event) {
    if (!previewState.isActive || cameraController.mode === 'firstPerson') return;
    // Evitar que el clic en los botones de la cruceta mueva al personaje
    if (event.target.classList.contains('r-dpad-btn')) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const container = document.getElementById('r-game-container');
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, previewState.camera);

    const intersectsInteractive = raycaster.intersectObjects(previewState.interactiveObjects, true);
    if (intersectsInteractive.length > 0) {
        const mainObject = intersectsInteractive[0].object.userData.mainObject;
        if (mainObject && mainObject.name === 'building_door_pivot') {
            const distance = playerController.mesh.position.distanceTo(mainObject.position);
            if (distance < INTERACTION_DISTANCE) {
                toggleDoor(mainObject);
            }
            return;
        }
    }

    const intersectsGround = raycaster.intersectObjects(previewState.collidableObjects, true);
    if (intersectsGround.length > 0) {
        playerController.targetPosition = intersectsGround[0].point;
    }
}

function toggleDoor(doorPivot) {
    const doorMesh = doorPivot.userData.doorMesh;
    if (doorPivot.userData.isOpen) {
        doorPivot.rotation.y = 0;
        if (!previewState.collidableObjects.includes(doorMesh)) {
            previewState.collidableObjects.push(doorMesh);
        }
        doorPivot.userData.isOpen = false;
    } else {
        doorPivot.rotation.y = Math.PI / 2.2;
        const index = previewState.collidableObjects.indexOf(doorMesh);
        if (index > -1) {
            previewState.collidableObjects.splice(index, 1);
        }
        doorPivot.userData.isOpen = true;
    }
}
 
function updatePlayer(deltaTime) {
    if (!playerController.mesh || !playerController.mesh.userData.physicsBody) return;

    const playerBody = playerController.mesh.userData.physicsBody;
    
    // --- LÓGICA DE CORRER ---
    const isRunning = keyState['ShiftLeft'] || keyState['ShiftRight'];
    const speedMultiplier = isRunning ? playerController.runSpeedMultiplier : 1.0;
    const playerSpeed = (playerController.speed / 0.8) * speedMultiplier; 
    // --- FIN LÓGICA DE CORRER ---

    const lerpFactor = 0.4; 

    const forward = new THREE.Vector3();
    previewState.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(previewState.camera.up, forward).normalize();

    const moveDirection = new THREE.Vector3();

    if (cameraController.mode === 'firstPerson') {
        if (keyState['KeyW'] || keyState['ArrowUp']) moveDirection.add(forward);
        if (keyState['KeyS'] || keyState['ArrowDown']) moveDirection.sub(forward);
        if (keyState['KeyA'] || keyState['ArrowLeft']) moveDirection.add(right);
        if (keyState['KeyD'] || keyState['ArrowRight']) moveDirection.sub(right);
    } else if (playerController.targetPosition) {
        const directionToTarget = playerController.targetPosition.clone().sub(playerController.mesh.position);
        directionToTarget.y = 0;
        if (directionToTarget.lengthSq() > 0.5 * 0.5) {
            moveDirection.copy(directionToTarget).normalize();
        } else {
            playerController.targetPosition = null;
        }
    }

    moveDirection.normalize();

    const currentVelocity = playerBody.velocity;
    const targetVelocity = new CANNON.Vec3(
        moveDirection.x * playerSpeed,
        currentVelocity.y,
        moveDirection.z * playerSpeed
    );
    
    playerBody.velocity.x = THREE.MathUtils.lerp(currentVelocity.x, targetVelocity.x, lerpFactor);
    playerBody.velocity.z = THREE.MathUtils.lerp(currentVelocity.z, targetVelocity.z, lerpFactor);

    if (cameraController.mode === 'thirdPerson' && moveDirection.lengthSq() > 0.01) {
      
const angle = Math.atan2(moveDirection.x, moveDirection.z);
         const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
         playerController.mesh.quaternion.slerp(targetQuaternion, 15 * deltaTime);
    }
}
function updateCamera(deltaTime) {
    if (!playerController.mesh) return;
    
    if (cameraController.mode === 'thirdPerson') {
        // --- INICIO: Lógica de rotación de la cruceta ---
        if (cameraController.horizontalRotationDirection !== 0) {
            cameraController.horizontalAngle += cameraController.horizontalRotationDirection * cameraController.ROTATION_SPEED * deltaTime;
        }
        if (cameraController.verticalRotationDirection !== 0) {
            cameraController.angle += cameraController.verticalRotationDirection * cameraController.ROTATION_SPEED * deltaTime;
            // Limitar (clamp) el ángulo vertical para que no se invierta la cámara
            cameraController.angle = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraController.angle));
        }
        // --- FIN: Lógica de rotación ---

        const hAngle = cameraController.horizontalAngle;
        const vAngle = cameraController.angle;

        const horizontalRadius = cameraController.distance * Math.cos(vAngle);
        const offsetX = Math.sin(hAngle) * horizontalRadius;
        const offsetY = Math.sin(vAngle) * cameraController.distance;
        const offsetZ = Math.cos(hAngle) * horizontalRadius;
        cameraController.offset.set(offsetX, offsetY, offsetZ);
        
        const cameraPosition = playerController.mesh.position.clone().add(cameraController.offset);
        
        // --- MODIFICADO: Eliminado el lerp (mamboleo) para un seguimiento rígido ---
        previewState.camera.position.copy(cameraPosition); 
        previewState.camera.lookAt(playerController.mesh.position);

    } else { // Modo primera persona
        const eyePosition = playerController.mesh.position.clone();
        eyePosition.y += playerController.height * 0.4;
        previewState.camera.position.copy(eyePosition);
        
        previewState.camera.rotation.order = 'YXZ';
        previewState.camera.rotation.y = cameraController.yaw;
        previewState.camera.rotation.x = cameraController.pitch;
    }
}

function findCharacterImageSrc(dataRefName) {
    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of allCharacters) {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value === dataRefName) {
            const imgElement = charElement.querySelector('.personaje-visual img');
            if (imgElement && imgElement.src) {
                return imgElement.src;
            }
        }
    }
    return null;
}

function loadWorldFromData(data) {
    const textureLoader = new THREE.TextureLoader();
    for (const chunkId in data) {
        const chunk = data[chunkId];
        const [chunkX, chunkZ] = chunkId.split('_').map(Number);
        const textureData = tools.textures[chunk.groundTextureKey] || { material: { materialRef: 'terreno_cesped' }, isPassable: true };

        const groundMaterial = createMaterial(textureData.material);
        
        if (groundMaterial.isMeshStandardMaterial || groundMaterial.isMeshLambertMaterial) {
            groundMaterial.receiveShadow = true;
        }

        const groundGeometry = new THREE.BoxGeometry(CHUNK_SIZE, 0.1, CHUNK_SIZE);
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.position.set(chunkX * CHUNK_SIZE + CHUNK_SIZE / 2, -0.05, chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2);
        groundMesh.updateMatrixWorld(true);

        groundMesh.receiveShadow = true;
        groundMesh.userData.isGround = true;
        previewState.scene.add(groundMesh);
        previewState.collidableObjects.push(groundMesh);
        
        const groundShape = new CANNON.Box(new CANNON.Vec3(CHUNK_SIZE / 2, 0.1 / 2, CHUNK_SIZE / 2));
        const groundBody = new CANNON.Body({
            mass: 0, 
            shape: groundShape,
            position: new CANNON.Vec3(groundMesh.position.x, groundMesh.position.y, groundMesh.position.z),
            material: previewState.physicsMaterials.groundMaterial
        });
        previewState.physicsWorld.addBody(groundBody);

        if (chunk.objects) {
            chunk.objects.forEach(obj => {
                let entityData;
                let isCustom = false;

                if (obj.dataRef) {
                    isCustom = true;
                    entityData = tools.customEntities[obj.type]; 
                } else {
                    entityData = tools.entities[obj.type];
                    isCustom = false;
                }

                if (!entityData) return;
                const objX = (chunkX * CHUNK_SIZE) + obj.x;
                const objZ = (chunkZ * CHUNK_SIZE) + obj.z;

                let modelObject = null;
                const gameProps = (isCustom && entityData.gameProps) ? entityData.gameProps : {};
                const tamano = gameProps.tamano || { x: 4, y: 4, z: 1 };

                if (isCustom) {
                    if (entityData.modelType === 'sprite') {
                        const iconSrc = findCharacterImageSrc(obj.dataRef) || entityData.icon;
                        if (!iconSrc) return;
                        const map = textureLoader.load(iconSrc);
                        const material = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
                        const geometry = new THREE.PlaneGeometry(tamano.x, tamano.y);
                        modelObject = new THREE.Mesh(geometry, material);
                    } else if (entityData.modelType === 'json3d') {
                        modelObject = createModelFromJSON(entityData.icon);
                    }
                } else if (entityData.model) {
                    modelObject = createModelFromJSON(entityData.model);
                }
                
                if (modelObject) {
                    const modelBox = new THREE.Box3().setFromObject(modelObject);
    const yOffset = -modelBox.min.y;
    modelObject.position.set(objX, yOffset, objZ);
                    if (gameProps.rotacionY) {
                        modelObject.rotation.y = THREE.MathUtils.degToRad(gameProps.rotacionY);
                    }

                    previewState.scene.add(modelObject);
                    
                   // --- INICIO: LÓGICA DE COLISIÓN COMPUESTA ---
// --- INICIO: LÓGICA DE COLISIÓN COMPUESTA (VERSIÓN FINAL) ---
let isObjectSolid = entityData.isSolid;
if (isCustom) {
    isObjectSolid = gameProps.colision ? gameProps.colision.tipo !== 'ninguna' : true;
}

if (isObjectSolid) {
    modelObject.updateMatrixWorld(true);

    const compoundBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3().copy(modelObject.position),
        quaternion: new CANNON.Quaternion().copy(modelObject.quaternion),
        material: previewState.physicsMaterials.groundMaterial
    });

    const rootQuaternionInverse = new CANNON.Quaternion().copy(modelObject.quaternion).inverse();

    modelObject.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const shape = createCannonShape(child);

            if (shape) {
                const childWorldPosition = new THREE.Vector3();
                child.getWorldPosition(childWorldPosition);
                const relativePosition = childWorldPosition.sub(modelObject.position);

                // === INICIO DE LA CORRECCIÓN A LA CORRECCIÓN ===
                // 1. Usar un THREE.Quaternion para la función de Three.js
                const childWorldThreeQuaternion = new THREE.Quaternion();
                child.getWorldQuaternion(childWorldThreeQuaternion);

                // 2. Crear un CANNON.Quaternion y copiar los valores
                const childWorldCannonQuaternion = new CANNON.Quaternion(
                    childWorldThreeQuaternion.x,
                    childWorldThreeQuaternion.y,
                    childWorldThreeQuaternion.z,
                    childWorldThreeQuaternion.w
                );

                // 3. Hacer el cálculo de física usando solo objetos de Cannon.js
                const relativeQuaternion = rootQuaternionInverse.mult(childWorldCannonQuaternion);
                // === FIN DE LA CORRECCIÓN A LA CORRECCIÓN ===

                compoundBody.addShape(shape, new CANNON.Vec3().copy(relativePosition), relativeQuaternion);
            }
        }
    });
    previewState.physicsWorld.addBody(compoundBody);
} else {
     modelObject.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}
// --- FIN: LÓGICA DE COLISIÓN COMPUESTA (VERSIÓN FINAL) ---
                    // --- FIN: LÓGICA DE COLISIÓN COMPUESTA ---
                    
                    if (gameProps.animacion && gameProps.animacion.tipo) {
                        modelObject.userData.behavior = gameProps.animacion.tipo;
                        Object.assign(modelObject.userData, gameProps.animacion.parametros);
                    }

                    const rutaMovimiento = gameProps.movimiento;
                    if (rutaMovimiento && rutaMovimiento.length > 0) {
                        modelObject.userData.movimientoState = { ruta: rutaMovimiento, indicePasoActual: 0, temporizadorPaso: 0, destino: null };
                        previewState.movingObjects.push(modelObject);
                    }
                }
                else if (obj.type === 'building' && entityData.model) {
                    // (Esta lógica para edificios predefinidos se puede mantener o adaptar a compuestos también)
                    const modelGroup = createModelFromJSON(entityData.model);
                    // ... (resto de la lógica de edificios)
                }
            });
        }
    }
}

function updateObjectMovements(deltaTime) {
    const velocidad = 5.0;

    previewState.movingObjects.forEach(obj => {
        const state = obj.userData.movimientoState;
        if (!state) return;

        let pasoActual = state.ruta[state.indicePasoActual];

        if (pasoActual.tipo === 'aleatorio') {
            if (state.destino === null) {
                const radioMovimiento = 15;
                const angulo = Math.random() * Math.PI * 2;
                state.destino = new THREE.Vector3(
                    obj.position.x + Math.cos(angulo) * radioMovimiento,
                    obj.position.y,
                    obj.position.z + Math.sin(angulo) * radioMovimiento
                );
                state.temporizadorPaso = pasoActual.duracion;
            }
        } else if (pasoActual.tipo === 'ir_a') {
            if (state.destino === null) {
                state.destino = new THREE.Vector3(pasoActual.coordenadas.x, obj.position.y, pasoActual.coordenadas.z);
            }
        }

        if (state.destino) {
            const direccion = state.destino.clone().sub(obj.position);
            direccion.y = 0;
            const distancia = direccion.length();
            
            if (distancia < 0.5) {
                state.destino = null; 
                if (pasoActual.tipo !== 'aleatorio') {
                     state.indicePasoActual = (state.indicePasoActual + 1) % state.ruta.length;
                }
            } else {
                const movimiento = direccion.normalize().multiplyScalar(Math.min(velocidad * deltaTime, distancia));
                obj.position.add(movimiento);
            }
        }
        
        if (pasoActual.tipo === 'aleatorio' && pasoActual.duracion !== null) {
            state.temporizadorPaso -= deltaTime;
            if (state.temporizadorPaso <= 0) {
                state.destino = null; 
                state.indicePasoActual = (state.indicePasoActual + 1) % state.ruta.length;
            }
        }
    });
}

function animatePreview() {
    if (!previewState.isActive) return;
    previewState.animationFrameId = requestAnimationFrame(animatePreview);
    handlePreviewResize();
    const deltaTime = previewState.clock.getDelta();
    
    if (previewState.physicsWorld) {
        previewState.physicsWorld.step(1 / 60, deltaTime, 3);

        previewState.physicsObjects.forEach(obj => {
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });
        
        if (playerController.mesh && playerController.mesh.userData.physicsBody) {
            const playerBody = playerController.mesh.userData.physicsBody;
    const bodyPos = playerBody.position;

    // La posición Y del suelo real es el centro de la esfera física menos su radio.
    const groundY = bodyPos.y - playerController.radius;
    
    // Colocamos el pivote del modelo en el suelo y lo levantamos por su altura real.
    playerController.mesh.position.set(
        bodyPos.x,
        groundY + playerController.yOffset, // Usamos el offset que calculamos al inicio
        bodyPos.z
    );
        }
    }

    updatePlayer(deltaTime);
    updateObjectMovements(deltaTime); 
     if (typeof updateAnimations === 'function') {
        updateAnimations(previewState.scene);
    }
    updateCamera(deltaTime);
    previewState.renderer.render(previewState.scene, previewState.camera);
}
 
/**
 * Crea una forma de Cannon.js a partir de una malla de Three.js de forma más precisa.
 * @param {THREE.Mesh} mesh El objeto visual.
 * @returns {CANNON.Shape | null} La forma física o null si no se pudo crear.
 */
function createCannonShape(mesh) {
    const geometry = mesh.geometry;
    const scale = mesh.scale;

    const params = geometry.parameters;
    if (!params) {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (!box) return null;
        const size = new THREE.Vector3();
        box.getSize(size);
        if (size.x === 0 || size.y === 0 || size.z === 0) return null;
        const halfExtents = new CANNON.Vec3(size.x * scale.x / 2, size.y * scale.y / 2, size.z * scale.z / 2);
        return new CANNON.Box(halfExtents);
    }

    switch (geometry.type) {
        case 'BoxGeometry':
        case 'BoxBufferGeometry': {
            const halfExtents = new CANNON.Vec3(params.width * scale.x / 2, params.height * scale.y / 2, params.depth * scale.z / 2);
            return new CANNON.Box(halfExtents);
        }
        case 'SphereGeometry':
        case 'SphereBufferGeometry': {
            const radius = params.radius * Math.max(scale.x, scale.y, scale.z); // Usar la escala máxima para esferas
            return new CANNON.Sphere(radius);
        }
        case 'CylinderGeometry':
        case 'CylinderBufferGeometry': {
            const radiusTop = (params.radiusTop ?? params.radius) * scale.x;
            const radiusBottom = (params.radiusBottom ?? params.radius) * scale.x;
            const height = params.height * scale.y;
            const numSegments = params.radialSegments || 8;
            return new CANNON.Cylinder(radiusTop, radiusBottom, height, numSegments);
        }
        default:
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            if (!box) return null;
            const size = new THREE.Vector3();
            box.getSize(size);
            if (size.x === 0 || size.y === 0 || size.z === 0) return null;
            const halfExtents = new CANNON.Vec3(size.x * scale.x / 2, size.y * scale.y / 2, size.z * scale.z / 2);
            return new CANNON.Box(halfExtents);
    }
}
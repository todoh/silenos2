// Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAfK_AOq-Pc2bzgXEzIEZ1ESWvnhMJUvwI",
    authDomain: "enraya-51670.firebaseapp.com",
    databaseURL: "https://enraya-51670-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "enraya-51670",
    storageBucket: "enraya-51670.appspot.com",
    messagingSenderId: "103343380727",
    appId: "1:103343380727:web:b2fa02aee03c9506915bf2",
    measurementId: "G-2G31LLJY1T"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
// Es importante que estos elementos existan en tu index.html con estos IDs
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userPic = document.getElementById('user-pic');

// --- LÓGICA DE AUTENTICACIÓN ---
const loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error durante el inicio de sesión:", error.message);
    }
};

const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
};

// --- OBSERVADOR DEL ESTADO DE AUTENTICACIÓN ---
// Esta es la función principal que reacciona a los cambios de login/logout
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuario está logueado
        if (userInfoDiv) userInfoDiv.style.display = 'flex'; // Usamos flex para alinear imagen y botón
        if (loginBtn) loginBtn.style.display = 'none';
        if (userPic) userPic.src = user.photoURL;
        
        console.log("Usuario autenticado:", user.displayName);
        // Aquí podrías llamar a una función para cargar datos del usuario si es necesario
        // await loadPlayerData(user);

    } else {
        // Usuario no está logueado
        if (userInfoDiv) userInfoDiv.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
        if (userPic) userPic.src = "";
        
        console.log("Ningún usuario autenticado.");
    }
});

// --- ASIGNACIÓN DE EVENTOS ---
// Nos aseguramos de que los botones existan antes de añadirles el listener
if (loginBtn) {
    loginBtn.addEventListener('click', loginWithGoogle);
}
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

const savePlayerData = async () => {
    if (!auth.currentUser) return;
    const user = auth.currentUser;
    const playerDocRef = doc(db, "players", user.uid);
    try {
        await setDoc(playerDocRef, player, { merge: true });
        saveFeedback.textContent = "¡Datos guardados!";
        setTimeout(() => saveFeedback.textContent = "", 2000);
    } catch (error) {
        console.error("Error al guardar los datos del jugador:", error);
        saveFeedback.textContent = "Error al guardar.";
        setTimeout(() => saveFeedback.textContent = "", 2000);
    }
};
// (Opcional) Puedes mantener la función para cargar datos si la necesitas en el futuro
const loadPlayerData = async (user) => {
    const playerDocRef = doc(db, "players", user.uid);
    try {
        const docSnap = await getDoc(playerDocRef);
        if (docSnap.exists()) {
            console.log("Datos del jugador encontrados:", docSnap.data());
            // Aquí procesarías los datos del jugador
        } else {
            console.log("Nuevo jugador, creando datos...");
            // Aquí crearías un nuevo documento para el jugador
        }
    } catch (error) {
        console.error("Error al cargar datos del jugador:", error);
    }
};
playerNameInput.addEventListener('input', (e) => {
    player.name = e.target.value;
});

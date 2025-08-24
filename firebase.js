// Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    initializeAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    browserPopupRedirectResolver
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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
const auth = initializeAuth(app, {
    popupRedirectResolver: browserPopupRedirectResolver
});
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userPic = document.getElementById('user-pic');

// --- LÓGICA DE AUTENTICACIÓN ---
const loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
const barra = document.getElementById('barra2');
  barra.style.display = 'flex';

    } catch (error) {
        console.error("Error durante el inicio de sesión:", error.message);
    }
};

const logout = async () => {
    try {document.getElementById('barra2').style.display = 'none';
        await signOut(auth);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
};

// --- OBSERVADOR DEL ESTADO DE AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuario está logueado
        if (userInfoDiv) userInfoDiv.style.display = 'flex';
        if (loginBtn) loginBtn.style.display = 'none';
        if (userPic) userPic.src = user.photoURL;
        
        console.log("Usuario autenticado:", user.displayName);

    } else {
        // Usuario no está logueado
        if (userInfoDiv) userInfoDiv.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
        if (userPic) userPic.src = "";
        
        console.log("Ningún usuario autenticado.");
    }
});

// --- ASIGNACIÓN DE EVENTOS ---
if (loginBtn) {
    loginBtn.addEventListener('click', loginWithGoogle);
}
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// SE HAN ELIMINADO LAS LÍNEAS FINALES QUE CAUSABAN ERRORES DE SINTAXIS.
// El código para guardar y cargar datos del jugador (savePlayerData, loadPlayerData)
// puede ser añadido de nuevo si es necesario, pero debe hacerse de forma correcta.
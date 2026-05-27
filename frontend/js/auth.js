import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateStateChanged, // Note: Typo fixed below
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Ekte konfigurasjon hentet direkte fra WebApp 'Frivillig WebApp' i prosjektet ditt!
const firebaseConfig = {
    projectId: "frivillig-kalendar-klubb",
    appId: "1:998803304720:web:08d505175b57ce442e3595",
    storageBucket: "frivillig-kalendar-klubb.firebasestorage.app",
    apiKey: "AIzaSyC_JxRas7EeyujqqreWvvUkqKIL7HSZkeY",
    authDomain: "frivillig-kalendar-klubb.firebaseapp.com",
    messagingSenderId: "998803304720"
};

// Start Firebase-maskineriet
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Eksporterer auth for bruk i andre app-filer hvis nødvendig
export { auth, signInWithPopup, signOut, onAuthStateChanged };

// ==========================================
// Autentiserings-logikk
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnGoogle = document.getElementById('btnLoginGoogle');
    const btnLogout = document.getElementById('btnLogout');
    const authSection = document.getElementById('authSection');
    const appSection = document.getElementById('appSection');
    const userNameDisplay = document.getElementById('userNameDisplay');

    // Sjekk om noen elementer finnes (sikrer at logikken ikke krasjer kalendersiden hvis ui mangler)
    if (!btnGoogle) return;

    // Logg inn handling
    btnGoogle.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Innloggingsfeil:", error.message);
            alert("Kunne ikke logge inn via Google. Prøv igjen.");
        }
    });

    // Logg ut handling
    if (btnLogout) {
         btnLogout.addEventListener('click', async () => {
             await signOut(auth);
         });
    }

    // Lytt på status-endringer (Inn/ut logget)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Bruker ER logget inn -> Skjul innlogging, vis app
            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            
            // Fyll inn navn som visuell bekreftelse og autoutfyll forms!
            if (userNameDisplay) userNameDisplay.innerText = `Hei, ${user.displayName}!`;
            
            const formName = document.getElementById('name');
            const formEmail = document.getElementById('email');
            
            if (formName) formName.value = user.displayName;
            if (formEmail) formEmail.value = user.email;
            
        } else {
            // Bruker er IKKE logget inn -> Vis innlogging, skjul app
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
        }
    });
});
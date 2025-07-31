import { getDatabase } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDYzKk18gri7x4_p3BfbI9kizYNuqJYYF4",
  authDomain: "projeto-integrador-384cb.firebaseapp.com",
  projectId: "projeto-integrador-384cb",
  storageBucket: "projeto-integrador-384cb.firebasestorage.app",
  messagingSenderId: "435410112306",
  appId: "1:435410112306:web:a1f6143077373d8a13912b",
  measurementId: "G-HNEV513RN7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

async function signOut() {
  try {
    await firebaseSignOut(auth);
    window.location.href = "/";
  } catch (error) {
    console.error("Erro ao deslogar:", error);
  }
}

export { app, auth, db, signOut };

import { getDatabase } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
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
    localStorage.removeItem("token");
  } catch (error) {
    console.error("Erro ao deslogar:", error);
  }
}


function waitForUser() {
  return new Promise((resolve, reject) => {
    const user = auth.currentUser;
    if (user) return resolve(user); // usuário já disponível
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) resolve(user);
      else reject(new Error("Usuário não autenticado"));
    });
  });
}

async function apiFetch(url, options = {}) {
  try {
    const user = await waitForUser();
    const token = await user.getIdToken();

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    if (options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Erro ${res.status}: ${errorMsg}`);
    }

    return res.json();
  } catch (error) {
    console.error("Falha na apiFetch:", error);
    throw error;
  }
}

async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  try {
    const res = await fetch("/auth/check", {
      headers: { Authorization: "Bearer " + token },
    });

    if (!res.ok) {
      window.location.href = "/";
    }
  } catch (err) {
    console.error("Erro ao verificar auth:", err);
    window.location.href = "/";
  }
}

export { app, auth, db, signOut, apiFetch, checkAuth };

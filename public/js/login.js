import { auth } from "./firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const mensagem = document.getElementById("message");
const loginForm = document.getElementById("login-form");
const registerButton = document.getElementById("register-button");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("toggle-password");

const eyeOpenIcon = "eye-open.png";
const eyeClosedIcon = "eye-closed.png";

async function sendTokenToBackend(idToken, path) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`, 
    },
    body: JSON.stringify({}), 
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.error || "Erro ao comunicar com backend";
    throw new Error(message);
  }

  return response.json();
}

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginForm.email.value;
  const password = loginForm.password.value;

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    const idToken = await user.getIdToken();

    await sendTokenToBackend(idToken, "/auth/login");

    window.location.href = "pages/menu.html";
  } catch (error) {
    alert(error.message);
  }
});

// Registro
registerButton.addEventListener("click", async (e) => {
  e.preventDefault();

  registerButton.disabled = true;

  const email = loginForm.email.value;
  const password = loginForm.password.value;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    const idToken = await user.getIdToken();

    await sendTokenToBackend(idToken, "/auth/register");

    mensagem.textContent = "Usuário registrado com sucesso! Logando...";
    mensagem.style.display = "block";

    setTimeout(() => {
      mensagem.style.display = "none";
      window.location.href = "pages/menu.html";
      registerButton.disabled = false;
    }, 2000);
  } catch (error) {
    alert(error.message);
    registerButton.disabled = false;
  }
});

togglePassword.style.backgroundImage = `url(../assets/img/${eyeClosedIcon})`;

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";

  togglePassword.style.backgroundImage = isPassword
    ? `url(../assets/img/${eyeOpenIcon})`
    : `url(../assets/img/${eyeClosedIcon})`;
});

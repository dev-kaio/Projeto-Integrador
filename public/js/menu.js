import { auth, checkAuth, signOut } from "./firebaseConfig.js";

document.getElementById("logout").addEventListener("click", async function (e) {
  e.preventDefault();
  try {
    await signOut(auth);
    window.location.href = "/";
  } catch (error) {
    alert("Erro ao fazer logout: " + error.message);
  }
});

checkAuth();

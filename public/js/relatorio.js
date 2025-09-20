import { apiFetch, checkAuth } from "./firebaseConfig.js";

const searchInput = document.getElementById("searchBroca");
const searchBtn = document.getElementById("searchBtn");
let brocas = [];

searchBtn.addEventListener("click", () => {
  const term = searchInput.value.trim();
  if (!term) {
    return;
  }

  filterBrocas(term);
});

async function carregarBrocas() {
  try {
    brocas = await apiFetch("/brocas/puxarBrocas", { method: "GET" });
  } catch (error) {
    console.error("Erro ao carregar brocas:", error.message);
  }
}

function filterBrocas(term) {
  const filtered = brocas.filter(
    (broca) =>
      broca.id.toString().toLowerCase().includes(term.toLowerCase()) ||
      broca.tipo.toLowerCase().includes(term.toLowerCase())
  );

  if (filtered.length === 0) {
    document.getElementById("bf").style.display = "none";
    document.getElementById("brocaID").textContent = "";
    alert("Nenhuma broca encontrada.");

    return;
  }
  document.getElementById("bf").style.display = "flex";
  document.getElementById("brocaID").textContent = `ID da Broca: ${term}`;
  carregarDados(filtered[0]);
}

function carregarDados(broca) {
  // ANTES e DEPOIS (campos iguais nos dois lados)
  document
    .querySelectorAll("#codigo")
    .forEach((el) => (el.textContent = broca.id));
  document
    .querySelectorAll("#comprimento")
    .forEach((el) => (el.textContent = broca.comprimento));
  document
    .querySelectorAll("#NovoComprimento")
    .forEach((el) => (el.textContent = broca.novoComp || "X"));
  document
    .querySelectorAll("#diametro")
    .forEach((el) => (el.textContent = broca.diametro));
  document
    .querySelectorAll("#afiacoes")
    .forEach((el) => (el.textContent = broca.numeroAfiacoes || "X"));

  puxarFotos(broca.id).then((imagem) => {
    if (imagem && imagem.inicio && imagem.inicio.url) {
      document.getElementById("img-antes").src = imagem.inicio.url;
      document.getElementById("img-depois").src = imagem.fim.url;
    } else {
      console.error("Imagem de início não encontrada");
    }
  });
}

async function puxarFotos(id) {
  try {
    const data = await apiFetch(`/fotos/puxarURL/${id}`, { method: "GET" });
    console.log(data);
    return data;
  } catch (error) {
    console.error("Erro na requisição:", error);
    return null;
  }
}

window.addEventListener("DOMContentLoaded", carregarBrocas);

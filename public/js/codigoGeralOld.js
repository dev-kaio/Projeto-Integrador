import { auth, signOut } from "./firebaseConfig.js";

const brocaListElement = document.querySelector(".drill-list ul");
const searchInput = document.getElementById("brocaSearchInput");

let brocas = []; // armazenar brocas carregadas do Firebase

// Função para renderizar a lista com base em um array filtrado
function renderBrocas(list) {
  brocaListElement.innerHTML = "";
  if (list.length === 0) {
    brocaListElement.innerHTML = "<li>Nenhuma broca encontrada.</li>";
    return;
  }
  list.forEach((broca) => {
    const li = document.createElement("li");
    li.textContent = `${broca.id} - ${broca.tipo} - ${broca.quantidade} unidades`;
    li.dataset.id = broca.id;
    // Aqui você pode adicionar evento para abrir popup info, etc.
    brocaListElement.appendChild(li);
  });
}

function filterBrocas(term) {
  const filtered = brocas.filter(
    (broca) =>
      broca.id.toLowerCase().includes(term.toLowerCase()) ||
      broca.tipo.toLowerCase().includes(term.toLowerCase())
  );
  renderBrocas(filtered);
}

async function loadBrocas() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");
    const idToken = await user.getIdToken();

    const res = await fetch("/brocas/puxarBrocas", {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) throw new Error("Erro ao carregar brocas");
    brocas = await res.json();
    renderBrocas(brocas);
  } catch (error) {
    console.error("Falha ao carregar brocas:", error);
    brocaListElement.innerHTML = "<li>Erro ao carregar brocas.</li>";
  }
}

// Evento input da busca
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.trim();
  filterBrocas(term);
});

//Inicialização da página
auth.onAuthStateChanged((user) => {
  if (user) {
    loadBrocas();
  } else {
    brocaListElement.innerHTML =
      "<li>Por favor, faça login para ver as brocas.</li>";
    setTimeout(() => signOut(auth), 3000);
  }
});

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "block";
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "none";
  }
}

function setupModalCloseHandlers() {
  document
    .querySelectorAll(
      ".modal .close, .modal-custom .close-custom, .modal-custom3 .close-custom3, .popup .close"
    )
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        // O pai do botão é o conteúdo, o pai do conteúdo é o modal
        const modal = btn.closest(
          ".modal, .modal-custom, .modal-custom3, .popup"
        );
        if (modal) modal.style.display = "none";
      });
    });

  // Fechar ao clicar fora do conteúdo (modal background)
  window.addEventListener("click", (event) => {
    ["modal", "modal-custom", "modal-custom3", "popup"].forEach((className) => {
      const modals = document.querySelectorAll(`.${className}`);
      modals.forEach((modal) => {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      });
    });
  });
}

// Inicializar os handlers de fechamento
setupModalCloseHandlers();

// Exemplo: abrir modal ao clicar em elementos com class modal-trigger
document.querySelectorAll(".modal-trigger").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = el.getAttribute("data-target");
    if (targetId) openModal(targetId);
  });
});

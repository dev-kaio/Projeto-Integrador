import { auth, signOut, apiFetch } from "./firebaseConfig.js";

const brocaListElement = document.querySelector(".drill-list ul");
const searchInput = document.getElementById("brocaSearchInput");
// const searchInputGestao = document.getElementById("searchInputGestao");

let brocas = []; // armazenar brocas carregadas do Firebase
let brocasExistentes = [];

// Função para renderizar a lista com base em um array filtrado
function renderBrocas(list) {
  "";
  brocaListElement.innerHTML = "";
  if (list.length === 0) {
    brocaListElement.innerHTML = "<li>Nenhuma broca encontrada.</li>";
    return;
  }
  list.forEach((broca) => {
    const li = document.createElement("li");

    li.textContent = ` ID: ${broca.id} - Tipo: ${
      broca.tipo
    } - Data Adição: ${formatarData(broca.dataAdicao)}`;
    li.dataset.id = broca.id;

    li.addEventListener("click", () => {
      // Exibir informações detalhadas no popup
      document.getElementById("broca-id").textContent = broca.id;
      document.getElementById("broca-diametro").textContent = broca.diametro;
      document.getElementById("broca-comprimento").textContent =
        broca.comprimento;
      document.getElementById("broca-data").textContent = broca.dataAdicao
        ? formatarData(broca.dataAdicao)
        : "—";
      document.getElementById("broca-numeroAfiacoes").textContent =
        broca.numeroAfiacoes || 0;
      document.getElementById("broca-tipo").textContent = broca.tipo;
      document.getElementById("broca-dataEdicao").textContent = broca.dataEdicao
        ? formatarData(broca.dataEdicao)
        : " ";

      openModal("popup-info");
    });

    brocaListElement.appendChild(li);
  });
}

function filterBrocas(term) {
  const filtered = brocas.filter(
    (broca) =>
      broca.id.toString().toLowerCase().includes(term.toLowerCase()) ||
      broca.tipo.toLowerCase().includes(term.toLowerCase())
  );
  renderBrocas(filtered);
}

// function filterBrocasGestao(term) {
//   const lista = document.querySelector(".checkbox-list");
//   lista.innerHTML = "";

//   const filtradas = brocas.filter(
//     (broca) =>
//       broca.id.toString().includes(term.toLowerCase()) ||
//       broca.tipo.toLowerCase().includes(term.toLowerCase())
//   );

//   if (filtradas.length === 0) {
//     lista.innerHTML = "<li>Nenhuma broca encontrada.</li>";
//     return;
//   }

//   filtradas.forEach((broca) => {
//     const li = document.createElement("li");
//     li.classList.add("checkbox-item");

//     li.innerHTML = `
//       <label style="display:flex;align-items:center;">
//         <input type="checkbox" name="broca-checkbox" value="${broca.id}" />
//         ID: ${broca.id} &nbsp|&nbsp Tipo: ${broca.tipo}
//       </label>
//     `;

//     lista.appendChild(li);
//   });
// }

async function loadBrocas() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    brocas = await apiFetch("/brocas/puxarBrocas");
    brocasExistentes = [...brocas];

    renderBrocas(brocas);
    atualizarEstoque();
    return brocas;
  } catch (error) {
    console.error("Falha ao carregar brocas:", error);
    brocaListElement.innerHTML = "<li>Erro ao carregar brocas.</li>";
  }
}

async function carregarBrocasParaEdicao() {
  brocas = await loadBrocas();

  const lista = document.querySelector(".checkbox-list");
  lista.innerHTML = "";

  brocas.forEach((broca) => {
    const li = document.createElement("li");
    li.classList.add("checkbox-item");

    li.innerHTML = `
      <label style="display:flex;align-items:center;">
        <input type="checkbox" name="broca-checkbox" value="${broca.id}" />
        ID: ${broca.id} &nbsp|&nbsp Tipo: ${broca.tipo}
      </label>
    `;

    lista.appendChild(li);
  });
}

async function iniciarExclusaoBrocas() {
  const checkboxes = document.querySelectorAll(
    '.checkbox-list input[name="broca-checkbox"]:checked'
  );

  if (checkboxes.length === 0) {
    alert("Selecione ao menos uma broca para deletar.");
    return;
  }

  const confirmacao = confirm(
    `Deseja deletar ${checkboxes.length} broca(s) selecionada(s)?`
  );
  if (!confirmacao) return;

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const idsSelecionadas = Array.from(checkboxes).map((cb) => cb.value);

    for (const id of idsSelecionadas) {
      await apiFetch(`/brocas/deletarBroca/${id}`, { method: "DELETE" });
    }

    alert(`${idsSelecionadas.length} broca(s) deletada(s) com sucesso!`);

    await loadBrocas();
    atualizarEstoque();
    closeModal("modalDelete");
    closeModal("modal2");
  } catch (err) {
    console.error(err);
    alert("Falha ao deletar as brocas.");
  }
}

async function atualizarEstoque() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const dados = await apiFetch("/brocas/estoqueBrocas");

    const spans = document.querySelectorAll(
      ".stock-info .stock-item span:nth-child(2)"
    );
    spans[0].textContent = dados.total;
    spans[1].textContent = dados.novas;
    spans[2].textContent = dados.usadas;
    spans[3].textContent = dados.afiar;
  } catch (err) {
    console.error("Erro ao atualizar estoque:", err);
  }
}

async function adicionarBroca(e) {
  e.preventDefault();
  const form = document.getElementById("adicionarBrocaForm");

  const data = {
    diametro: form.diameter.value.trim(),
    comprimento: form.length.value.trim(),
    tipo: form.type.value,
  };

  if (!data.tipo || !data.diametro || !data.comprimento) {
    alert("Preencha todos os campos.");
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    if (brocasExistentes.some((b) => b.id === data.id)) {
      alert(`ID "${data.id}" já existe! Por favor, escolha outro.`);
      return;
    }

    await apiFetch("/brocas/guardarBroca", {
      method: "POST",
      body: JSON.stringify(data),
    });

    alert("Broca adicionada com sucesso!");

    form.reset();
    closeModal("modal3");
    closeModal("modal2");
    loadBrocas();
  } catch (error) {
    console.error("Erro ao adicionar broca:", error);
    alert("Falha ao adicionar broca.");
  }
}

document
  .getElementById("editarBrocaForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const originalId = document.getElementById("edit-original-id").value;
    const brocaAtualizada = {
      diametro: document.getElementById("edit-diameter").value,
      comprimento: document.getElementById("edit-length").value,
      tipo: document.getElementById("edit-type").value,
      dataEdicao: new Date().toISOString(),
    };

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");
      await apiFetch(`/brocas/editarBroca/${originalId}`, {
        method: "PUT",
        body: JSON.stringify(brocaAtualizada),
      });
      alert("Edição Bem-Sucedida.");
      await loadBrocas();
      atualizarEstoque();
      closeModal("modal4");
      closeModal("modal2");
    } catch (error) {
      console.error("Falha ao editar broca:", error);
    }
  });

// Evento input da busca
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.trim();
  filterBrocas(term);
});

// searchInputGestao.addEventListener("input", (e) => {
//   const term = e.target.value.trim();
//   filterBrocasGestao(term);
// });

//Inicialização da página
auth.onAuthStateChanged((user) => {
  if (user) {
    loadBrocas();
    atualizarEstoque();
  } else {
    brocaListElement.innerHTML =
      "<li>Por favor, faça login para ver as brocas.</li>";
    setTimeout(() => signOut(auth), 2000);
  }
});

document
  .getElementById("adicionarBrocaForm")
  .addEventListener("submit", adicionarBroca);

//detecta quando a aba for ativada e chama a função
document.getElementById("edit").addEventListener("change", function () {
  if (this.checked) {
    carregarBrocasParaEdicao();
  }
});

document.getElementById("edit").addEventListener("click", abrirModalEdicao);

document
  .getElementById("delete")
  .addEventListener("click", iniciarExclusaoBrocas);

//Verificando existência da broca no banco de dados - Usar para puxar fotos depois
document.getElementById("afiacaoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const input = document.getElementById("brocaAfiacaoSearchInput").value.trim();

  if (!input) {
    alert("Digite o ID de alguma broca.");
    return;
  }

  try {
    const data = await apiFetch(
      `/brocas/verificarBD/${encodeURIComponent(input)}`,
      { method: "GET" }
    );

    if (!data.existe) {
      alert("ID de broca não existe.");
      document.getElementById("brocaAfiacaoSearchInput").value = "";
    }

    if (data.existe) {
      try {
        const selectedID = await apiFetch(
          `/brocas/selectedID/${encodeURIComponent(input)}`,
          { method: "PUT" }
        );

        if (selectedID) {
          window.location.href = `maquina.html?ID=${encodeURIComponent(input)}`;
        }
      } catch (error) {
        console.log("ERRO: ", error.message);
      }
    }
  } catch (error) {
    throw new Error(`Erro na consulta: ${error.message}`);
  }
});

// ============================ MODAIS

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "block";
  }

  if (id == "modal2") {
    carregarBrocasParaEdicao();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "none";
  }
}

function abrirModalEdicao() {
  const checkboxes = document.querySelectorAll(
    '.checkbox-list input[name="broca-checkbox"]:checked'
  );

  if (checkboxes.length > 1) {
    alert("Selecione apenas uma broca para editar.");
    return;
  } else if (checkboxes.length < 1) {
    alert("Selecione ao menos uma broca para editar.");
    return;
  }

  const brocaIdSelecionada = checkboxes[0].value;

  if (!brocaIdSelecionada) {
    alert("ID inválido.");
    return;
  }
  // Buscar a broca na lista carregada
  const broca = brocas.find((b) => b.id === brocaIdSelecionada);

  if (!broca) {
    alert("Broca não encontrada.");
    return;
  }
  // Preenche os campos
  document.getElementById("edit-original-id").value = broca.id || "";
  document.getElementById("edit-diameter").value = broca.diametro || "";
  document.getElementById("edit-length").value = broca.comprimento || "";
  document.getElementById("edit-type").value = broca.tipo || "";

  openModal("modal4");
}

function setupModalCloseHandlers() {
  document
    .querySelectorAll(
      ".modal .close, .modal-custom .close-custom, .modal-custom3 .close-custom3, .modal-custom4 .close-custom4, .modal-custom-delete .close-delete, .popup .close"
    )

    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        // O pai do botão é o conteúdo, o pai do conteúdo é o modal
        const modal = btn.closest(
          ".modal, .modal-custom, .modal-custom3, .modal-custom4, .modal-custom-delete, .popup"
        );
        if (modal) modal.style.display = "none";
      });
    });

  // Fechar ao clicar fora do conteúdo (modal background)
  window.addEventListener("click", (event) => {
    [
      "modal",
      "modal-custom",
      "modal-custom3",
      "modal-custom4",
      "popup",
    ].forEach((className) => {
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

function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarComprimentoInput(input) {
  input.addEventListener("blur", () => {
    let valor = input.value.trim();

    if (!valor) return;

    // Remove "mm" (se já tiver) e espaços extras
    valor = valor.replace(/mm$/i, "").trim();

    valor = valor.replace(".", ",");

    if (valor.includes(",")) {
      const [inteiro, decimal] = valor.split(",");
      const decimalCorrigido = (decimal || "").padEnd(2, "0").slice(0, 2);
      valor = `${inteiro},${decimalCorrigido}`;
    } else {
      valor += ",00";
    }

    input.value = valor + " mm";
  });
}

formatarComprimentoInput(document.getElementById("diameter"));
formatarComprimentoInput(document.getElementById("length"));
formatarComprimentoInput(document.getElementById("edit-length"));

import { apiFetch } from "./firebaseConfig.js";

const video = document.getElementById("cameraFeed");
const urlParams = new URLSearchParams(window.location.search);
const brocaId = urlParams.get("ID");

const brocas = await apiFetch("/brocas/puxarBrocas", {
  method: "GET",
});

const broca = brocas.find((b) => String(b.id) === String(brocaId));

navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => console.error("Erro ao acessar a câmera:", err));

//Iniciar medição
async function tirarFoto(tipo) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converte para blob
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    // Upload para Cloudinary
    const resultado = await uploadFoto(blob);

    // Salvar URL no Realtime Database e atualizar afiações
    await salvarFotoURL(resultado.url, brocaId, tipo);
  } catch (err) {
    console.error("Erro ao tirar/enviar foto:", err);
    alert("Falha ao enviar foto.");
  }


}

async function uploadFoto(blob) {
  const formData = new FormData();
  formData.append("foto", blob, "foto.png");

  return await apiFetch("/fotos/upload", {
    method: "POST",
    body: formData,
  });
}

async function salvarFotoURL(url, brocaId, tipo) {
  return await apiFetch("/fotos/salvarURL", {
    method: "POST",
    body: JSON.stringify({ url, brocaId, tipo }),
  });
}

async function incrementarAfiacoes(brocaId) {
  try {
    if (!broca) {
      throw new Error("Broca não encontrada");
    }

    const afiacaoAtual = parseInt(broca.numeroAfiacoes) || 0;

    await apiFetch(`/brocas/editarBroca/${brocaId}`, {
      method: "PUT",
      body: JSON.stringify({
        numeroAfiacoes: afiacaoAtual + 1,
        dataAfiacao: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("Erro ao atualizar número de afiações:", error);
  }
}

async function carregarDetalhesDaBroca() {
  try {
    if (!broca) {
      console.error("Broca não encontrada.");
      return;
    }

    document.getElementById("comprimento").textContent =
      broca.novoComp || "-";
    document.getElementById("diametro").textContent = broca.diametro || "-";
    document.getElementById("codigo").textContent = broca.id || "-";
    document.getElementById("afiacoes").textContent =
      broca.numeroAfiacoes ?? "0";
  } catch (error) {
    console.error("Erro ao carregar broca:", error);
  }
}

//Começo de tudo
document.getElementById("tirarFotoBtn").addEventListener("click", async () => {
  await tirarFoto("inicio");
  await alterarEstado("iniciando");
  //ESP32 q vai atualizar o estado para parado
  await esperarEstadoEsperado("parado");
  await incrementarAfiacoes(brocaId);

  setTimeout(() => {
    carregarDetalhesDaBroca();
    document.getElementById("atualizacao").textContent =
      "Medidas atualizadas.";
  }, 35000);
});

document.getElementById("check-button").addEventListener("click", FuncaoCheck);

async function FuncaoCheck() {
  try {
    const data = await apiFetch("/brocas/selectedID/0", { method: "PUT" });

    console.log("Resposta da API:", data);
    //Tira foto após concluir processo
    await tirarFoto("fim");

    //Concluindo processo na maquina
    await alterarEstado("finalizado");

    if (data) {
      window.location.href = "./brocas.html";
    } else {
      console.log("Erro ao alterar ID");
    }

  } catch (error) {
    console.log(error.message);
  }
}

async function alterarEstado(estado) {
  try {
    await apiFetch("/maquina/alterarEstado", {
      method: "POST",
      body: JSON.stringify({ estado: estado }),
    });
  } catch (error) {
    console.error("Erro ao alterar estado:", error);
  }
}

async function esperarEstadoEsperado(estadoEsperado, intervalo = 500) {
  while (true) {
    try {
      const { estado } = await apiFetch("/maquina/estadoAtual", {
        method: "GET",
      });

      console.log("Estado atual:", estado.estado);

      if (estado.estado === estadoEsperado) {
        break;
      }

      await new Promise((res) => setTimeout(res, intervalo));
    } catch (error) {
      console.error("Erro ao checar estado:", error);
      break;
    }
  }
}

//Criar botao para recomeçar processo e alterar estado para reiniciando
document.getElementById("reiniciarBtn").addEventListener("click", async () => {
  await alterarEstado("reiniciando");
});

document.getElementById("pararBtn").addEventListener("click", async () => {
  await alterarEstado("finalizado");
});
//As fotos vão sobescrever as antigas na forma atual

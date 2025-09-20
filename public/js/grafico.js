import { apiFetch, checkAuth } from "./firebaseConfig.js";
import { inicializarDetalhes } from "./detalhesRelatorio.js";

document.addEventListener("DOMContentLoaded", async () => {
  checkAuth();
  let brocas = [];

  async function fetchBrocas() {
    try {
      brocas = await apiFetch("/brocas/puxarBrocas");
    } catch (error) {
      console.error(error);
      return (brocas = []);
    }
  }

  // =======================
  // 2. Função de filtro
  // =======================
  function filtrarBrocas() {
    const monthSelect = document.getElementById("month").value;
    const yearSelect = document.getElementById("year").value;
    const startMonth = document.getElementById("start-month").value; // yyyy-mm
    const endMonth = document.getElementById("end-month").value; // yyyy-mm

    const meses = {
      janeiro: 0,
      fevereiro: 1,
      março: 2,
      abril: 3,
      maio: 4,
      junho: 5,
      julho: 6,
      agosto: 7,
      setembro: 8,
      outubro: 9,
      novembro: 10,
      dezembro: 11,
    };

    // Se nenhum filtro estiver ativo, retorna tudo direto
    const nenhumFiltroAtivo =
      !monthSelect && !yearSelect && !startMonth && !endMonth;
    if (nenhumFiltroAtivo) return brocas;

    return brocas.filter((broca) => {
      const data = new Date(broca.dataAdicao);

      // filtro mês/ano só se ambos selecionados
      if (monthSelect && yearSelect) {
        if (
          data.getMonth() !== meses[monthSelect] ||
          data.getFullYear() !== Number(yearSelect)
        ) {
          return false;
        }
      }

      // filtro intervalo só se ambos selecionados
      if (startMonth && endMonth) {
        const start = new Date(startMonth + "-01T00:00:00");
        const end = new Date(
          new Date(endMonth + "-01T00:00:00").getFullYear(),
          new Date(endMonth + "-01T00:00:00").getMonth() + 1,
          0,
          23,
          59,
          59
        );
        if (data < start || data > end) return false;
      }

      return true;
    });
  }

  // =======================
  // 3. Função para atualizar gráfico de brocas adicionadas
  // =======================
  function atualizarGrafico(chart, brocasFiltradas) {
    const contagem = {};

    brocasFiltradas.forEach((broca) => {
      const dia = new Date(broca.dataAdicao).toLocaleDateString("pt-BR");
      contagem[dia] = (contagem[dia] || 0) + 1;
    });

    const labels = Object.keys(contagem).sort((a, b) => {
      const [d1, m1, y1] = a.split("/");
      const [d2, m2, y2] = b.split("/");
      return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
    });

    chart.data.labels = labels;
    chart.data.datasets[0].data = labels.map((label) => contagem[label]);
    chart.update();
  }

  // =======================
  // 4. Função para atualizar gráfico de afiações
  // =======================
  function atualizarGraficoAfiacoes(chart, brocasFiltradas) {
    const contagem = {};

    brocasFiltradas.forEach((broca) => {
      const afi = parseInt(broca.numeroAfiacoes) || 0;
      if (afi > 0) {
        const dia = new Date(broca.dataAdicao).toLocaleDateString("pt-BR");
        contagem[dia] =
          (contagem[dia] || 0) + (parseInt(broca.numeroAfiacoes) || 0);
      }
    });

    chart.data.labels = Object.keys(contagem);
    chart.data.datasets[0].data = Object.values(contagem);
    chart.update();
  }

  // =======================
  // 5. Inicialização dos gráficos
  // =======================
  const ctxUso = document.getElementById("usage-chart").getContext("2d");
  const usageChart = new Chart(ctxUso, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Brocas adicionadas",
          data: [],
          backgroundColor: "rgba(54, 162, 235, 0.6)",
        },
      ],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } },
  });

  const ctxAfiacoes = document
    .getElementById("sharpening-chart")
    .getContext("2d");
  const afiacoesChart = new Chart(ctxAfiacoes, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Afiações",
          data: [],
          backgroundColor: "rgba(255, 99, 132, 0.6)",
        },
      ],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } },
  });

  // =======================
  // 6. Função de aplicar filtros
  // =======================
  function aplicarFiltro() {
    const filtradas = filtrarBrocas();
    atualizarGrafico(usageChart, filtradas);
    atualizarGraficoAfiacoes(afiacoesChart, filtradas);
  }

  // =======================
  // 7. Eventos dos filtros
  // =======================
  ["month", "year", "start-month", "end-month"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      aplicarFiltro();
    });
  });

  // =========================
  // 8. Exportar para o Excel
  // =========================
  function exportarExcel(dados) {
    // Criar planilha
    const ws = XLSX.utils.json_to_sheet(dados);

    // Ajustar largura colunas
    ws["!cols"] = [
      { wch: 15 }, // data
      { wch: 15 }, // brocas
      { wch: 15 }, // afiações
    ];

    // Criar workbook e anexar planilha
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");

    // Exportar arquivo Excel
    XLSX.writeFile(wb, "relatorio-brocas.xlsx");
  }

  function prepararDadosExcel() {
    const labels = usageChart.data.labels; // datas
    const brocasData = usageChart.data.datasets[0].data;
    const afiacoesData = afiacoesChart.data.datasets[0].data;

    const dados = labels.map((label, idx) => ({
      Data: label,
      "Brocas Adicionadas": brocasData[idx] || 0,
      Afiações: afiacoesData[idx] || 0,
    }));

    return dados;
  }

  document.querySelector(".export-button").addEventListener("click", (e) => {
    e.preventDefault();
    const dados = prepararDadosExcel();
    exportarExcel(dados);
  });

  await fetchBrocas();

  inicializarDetalhes(brocas);
});

// cria a parte da seleção de meses na parte dos relatórios
const ctx1 = document.getElementById("usage-chart").getContext("2d");
const usageChart = new Chart(ctx1, {
  type: "line",
  data: {
    labels: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho"],
    datasets: [
      {
        label: "Uso de Brocas",
        // matriz como calendario
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: "rgba(0, 83, 160, 0.2)",
        borderColor: "rgba(0, 83, 160, 1)",
        borderWidth: 1,
      },
    ],
  },
  // forca um inicio de 0
  options: {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});
//  uso das datas para diversificar
const ctx2 = document.getElementById("sharpening-chart").getContext("2d");
const sharpeningChart = new Chart(ctx2, {
  type: "line",
  data: {
    labels: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho"],
    datasets: [
      {
        label: "Afiações",
        data: [15, 10, 5, 2, 20, 30],
        backgroundColor: "rgba(40, 167, 69, 0.2)",
        borderColor: "rgba(40, 167, 69, 1)",
        borderWidth: 1,
      },
    ],
  },
  options: {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});

document
  .getElementById("details-select")
  .addEventListener("change", function () {
    const selectedValue = this.value;
    const detailsList = document.getElementById("details-list");
    detailsList.innerHTML = ""; // Limpa a lista de detalhes

    if (selectedValue === "brocas-gastas") {
      detailsList.innerHTML = `
                    <div class="detail-item">
                        <span>Broca 1</span>
                        <span>Gasta</span>
                    </div>
                    <div class="detail-item">
                        <span>Broca 2</span>
                        <span>Gasta</span>
                    </div>
                `;
    } else if (selectedValue === "afiacoes") {
      detailsList.innerHTML = `
                    <div class="detail-item">
                        <span>Broca 1</span>
                        <span>Afiada</span>
                    </div>
                    <div class="detail-item">
                        <span>Broca 2</span>
                        <span>Afiada</span>
                    </div>
                `;
    }
  });

export function inicializarDetalhes(brocas) {
  const detailsSelect = document.getElementById("details-select");
  const detailsList = document.getElementById("details-list");

  function atualizarDetalhes() {
    const valor = detailsSelect.value;
    let filtered = [];

    if (valor === "brocas-gastas") {
      filtered = brocas;
    } else if (valor === "afiacoes") {
      filtered = brocas.filter((b) => (parseInt(b.numeroAfiacoes) || 0) > 0);
    }

    if (filtered.length === 0) {
      detailsList.innerHTML = "<p>Nenhuma broca encontrada.</p>";
      return;
    }

    let html = `
    <style>
        #details-list table {
          width: 100%;
          margin-top: 10px;
        }
        table{
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          overflow: hidden;
          border-collapse: collapse;
        }
        #details-list th, #details-list td {
          padding: 8px;
          text-align: center; /* centraliza texto */
        }
        #details-list th {
          background-color: rgba(35, 179, 74); /* azul claro */
          font-weight: bold;
          color: #e0e0e0;
        }
        table tr:nth-child(odd) td {
          background-color: white;
        }
        /* Cor de fundo para linhas pares */
        table tr:nth-child(even) td {
          background-color: #e0e0e0;
        }
      </style>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Quantidade de Afiações</th>
            </tr>
          </thead>
          <tbody>
    `;

    filtered.forEach((broca) => {
      html += `
        <tr>
          <td>${new Date(broca.dataAdicao).toLocaleDateString("pt-BR")}</td>
          <td>${broca.tipo || "-"}</td>
          <td>${broca.numeroAfiacoes || 0}</td>
        </tr>
      `;
    });

    html += "</tbody></table>";

    detailsList.innerHTML = html;
  }

  detailsSelect.addEventListener("change", atualizarDetalhes);

  // Atualiza na carga inicial
  atualizarDetalhes();
}

module.exports = (db, admin) => {
  const express = require("express");
  const router = express.Router();
  const { authenticateToken } = require("./auth");

  router.post("/guardarBroca", authenticateToken, async (req, res) => {
    try {
      const { diametro, comprimento, tipo } = req.body;

      if (!tipo || !diametro || !comprimento) {
        return res.status(400).json({ error: "Campo obrigatório faltando." });
      }

      const brocasRef = db.ref("Brocas");
      const snapshot = await brocasRef.once("value");
      const brocas = snapshot.val();

      let maxId = 0;
      if (brocas) {
        const ids = Object.keys(brocas);
        maxId = Math.max(...ids.map((id) => parseInt(id)));
      }

      const novoId = maxId + 1;

      const novaBroca = {
        id: String(novoId),
        diametro: diametro,
        comprimento: comprimento,
        tipo,
        dataAdicao: new Date().toISOString(),
        numeroAfiacoes: 0,
      };

      await db.ref(`Brocas/${novoId}`).set(novaBroca);

      res.status(200).json({ message: "Broca adicionada com sucesso" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao adicionar broca" });
    }
  });

  router.put("/selectedID/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      await db.ref("BrocaSelecionadaID").update({ id });
      res.status(200).json({ message: "Seleção de broca alterada" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao alterar ID Selecionado." });
    }
  });

  router.put("/editarBroca/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const dados = req.body;

    try {
      const brocasRef = db.ref("Brocas");
      const snapshot = await brocasRef
        .orderByChild("id")
        .equalTo(String(id))
        .once("value");

      if (!snapshot.exists()) {
        return res.status(404).json({ error: "Broca não encontrada" });
      }

      const key = Object.keys(snapshot.val())[0];
      await db.ref(`Brocas/${key}`).update(dados);

      res.json({ message: "Broca atualizada com sucesso" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar broca" });
    }
  });

  //Só p puxar as brocas do banco
  async function getBrocasArray() {
    const brocasRef = db.ref("Brocas");
    const snapshot = await brocasRef.once("value");
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
  }

  router.get("/estoqueBrocas", authenticateToken, async (req, res) => {
    try {
      const brocas = await getBrocasArray();

      let total = brocas.length; // total de brocas (quantidade de itens)
      let novas = 0;
      let usadas = 0;

      brocas.forEach((broca) => {
        const afi = parseInt(broca.numeroAfiacoes) || 0;

        if (afi === 0) {
          novas += 1;
        } else if (afi > 0) {
          usadas += 1;
        }
      });

      res.json({ total, novas, usadas });
    } catch (error) {
      res.status(500).json({ error: "Erro ao calcular estoque" });
    }
  });

  router.get("/puxarBrocas", authenticateToken, async (req, res) => {
    try {
      const snapshot = await db.ref("Brocas").once("value");
      const data = snapshot.val();

      if (!data) {
        return res.status(200).json([]);
      }

      const brocas = Object.values(data)
        .filter((b) => typeof b.id !== "undefined") // Filtra apenas as brocas válidas
        .sort((a, b) => a.id - b.id); // Ordena por ID
      res.status(200).json(brocas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao acessar o banco" });
    }
  });

  router.delete("/deletarBroca/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "ID da broca não fornecido" });
      }

      const brocasRef = db.ref("Brocas").child(id);

      const snapshot = await brocasRef.once("value");
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "Broca não encontrada" });
      }

      await brocasRef.remove();

      res.json({ message: "Broca deletada com sucesso" });
    } catch (error) {
      console.error("Erro ao deletar", error);
      res.status(500).json({ error: "Erro ao deletar broca" });
    }
  });

  router.get("/verificarBD/:id", authenticateToken, async (req, res) => {
    const input = req.params.id;

    if (!input) {
      return res.status(400).json({ error: "Parâmetro 'input' não fornecido" });
    }

    try {
      const brocaRef = db.ref(`Brocas/${input}`);
      const snapshot = await brocaRef.once("value");
      const existe = snapshot.exists();

      return res.json({ existe });
    } catch (error) {
      console.error("Erro ao verificar broca:", error);
      return res.status(500).json({ error: "Erro ao verificar broca." });
    }
  });

  return router;
};

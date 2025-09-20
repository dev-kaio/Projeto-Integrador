module.exports = (db, admin) => {
    const express = require("express");
    const router = express.Router();
    const { authenticateToken } = require("./auth");

    router.post("/alterarEstado", authenticateToken, async (req, res) => {
        const { estado } = req.body;

        try {
            await db.ref("EstadoMaquina/estadoAtual").set({ estado, atualizadoEm: new Date().toISOString() });
            res.status(200).json({ message: "Estado alterado com sucesso" });
        } catch (error) {
            console.error("Erro ao alterar estado:", error);
            res.status(500).json({ message: "Erro ao alterar estado" });
        }
    });
    
    router.get("/estadoAtual", authenticateToken, async (req, res) => {
        try {
            const snapshot = await db.ref("EstadoMaquina/estadoAtual").once("value");
            const estado = snapshot.val();

            res.status(200).json({ estado });
        } catch (error) {
            console.error("Erro ao obter estado:", error);
            res.status(500).json({ message: "Erro ao obter estado" });
        }
    });

    return router;
}
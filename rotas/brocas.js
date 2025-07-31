module.exports = (db, admin) => {
  const express = require("express");
  const router = express.Router();

  async function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).send("Token não fornecido");
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      return res.status(403).send("Token inválido");
    }
  }

  router.get("/puxarBrocas", authenticateToken, async (req, res) => {
    try {
      const brocasRef = db.ref("Brocas");
      const snapshot = await brocasRef.once("value");
      if (snapshot.exists()) {
        const dataObj = snapshot.val();
        const brocasArray = Object.values(dataObj);
        res.json(brocasArray);
      } else {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao acessar o banco" });
    }
  });

  return router;
};

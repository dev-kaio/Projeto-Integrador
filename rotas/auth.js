const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.redirect("/");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido ou expirado" });
  }
}

router.post("/login", authenticateToken, (req, res) => {
  return res.json({
    message: "Login validado com sucesso",
    uid: req.user.uid,
  });
});

router.post("/register", authenticateToken, (req, res) => {
  return res.json({
    message: "Registro validado com sucesso",
    uid: req.user.uid,
  });
});

router.get("/check", authenticateToken, (req, res) => {
  res.json({ ok: true, uid: req.user.uid });
});

module.exports = { router, authenticateToken };

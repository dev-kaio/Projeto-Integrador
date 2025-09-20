const express = require("express");
const router = express.Router();
const { cloudinary } = require("../server");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() }); // arquivo na memória
const { authenticateToken } = require("./auth");
const streamifier = require("streamifier"); // para transformar buffer em stream

module.exports = (db, admin) => {
  // Rota para upload da foto
  router.post(
    "/upload",
    authenticateToken,
    upload.single("foto"), // multer captura o arquivo
    async (req, res) => {
      try {
        if (!req.file)
          return res.status(400).json({ error: "Nenhuma foto enviada" });

        // Função para upload via stream
        const uploadFromBuffer = (buffer) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "Brocas" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            streamifier.createReadStream(buffer).pipe(stream);
          });
        };

        const result = await uploadFromBuffer(req.file.buffer);

        res.json({ url: result.secure_url }); // URL pública do Cloudinary
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao enviar foto" });
      }
    }
  );

  // Rota para salvar URL no Realtime Database
  router.post("/salvarURL", authenticateToken, async (req, res) => {
    try {
      console.log("Dados recebidos no backend:", req.body);

      const { url, brocaId, tipo } = req.body;

      if (!url || !brocaId || !tipo) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      const ref = db.ref(`Fotos/${brocaId}/fotos/${tipo}`);
      await ref.set({
        url,
        timestamp: Date.now(),
      });

      res.json({ success: true, id: brocaId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Falha ao salvar URL" });
    }
  });


  router.get("/puxarURL/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;

      const ref = db.ref(`Fotos/${id}/fotos`);
      const snapshot = await ref.once("value");

      if (!snapshot.exists()) {
        return res.status(404).json({ error: "Imagens não encontradas." });
      }

      const fotos = snapshot.val(); // { inicio: { ... }, fim: { ... } }

      res.json(fotos); // Retorna o objeto com as URLs
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Falha ao buscar URL da imagem." });
    }
  });

  return router;
};

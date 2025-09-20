require("dotenv").config();

console.clear();
const path = require("path");
const express = require("express");
const admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 3000;

try {
  const firebaseConfig = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url:
      process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  };

  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
} catch (error) {
  console.error("Erro ao inicializar Firebase Admin SDK:", error);
  process.exit(1);
}

const db = admin.database();

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports.cloudinary = cloudinary;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages", "index.html"));
});

app.use(express.static(path.join(__dirname, "public")));

// Para rotas que recebem JSON
app.use("/auth", express.json());
app.use("/brocas", express.json());
app.use("/maquina", express.json());
app.use("/fotos", express.json()); // multer lida com /upload, express.json não interfere

// Rotas
const rotaBrocas = require("./rotas/brocas")(db, admin);
const { router: rotaAuth } = require("./rotas/auth");
const rotaMaquina = require("./rotas/maquina")(db, admin);
const rotaFotos = require("./rotas/fotos")(db, admin);

app.use("/auth", rotaAuth);
app.use("/brocas", rotaBrocas);
app.use("/maquina", rotaMaquina);
app.use("/fotos", rotaFotos);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

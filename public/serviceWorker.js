const CACHE_NAME = "brocas-cache-v1";
const urlsToCache = [
  "/", // raiz serve index.html
  "/z/index.html",
  "/pages/brocas.html",
  "/pages/config.html",
  "/pages/maquina.html",
  "/pages/menu.html",
  "/pages/relatorio.html",

  "/css/brocas.css",
  "/css/config.css",
  "/css/maquina.css",
  "/css/relatorio.css",
  "/css/styles.css",

  "/js/brocas-front.js",
  "/js/config.js",
  "/js/detalhesRelatorio.js",
  "/js/firebaseConfig.js",
  "/js/grafico.js",
  "/js/login.js",
  "/js/maquina.js",
  "/js/menu.js",

  "/assets/img/brocas.png",
  "/assets/img/configuracoes.png",
  "/assets/img/eye-closed.png",
  "/assets/img/eye-open.png",
  "/assets/img/favicon.ico",
  "/assets/img/gear.gif",
  "/assets/img/logo_quadrada.png",
  "/assets/img/logo.png",
  "/assets/img/lupa.png",
  "/assets/img/machos.png",
  "/assets/img/preview-broca.png",
  "/assets/img/relatorios.png",
];

// Durante a instalação, abrir cache e adicionar arquivos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Ativar e limpar caches antigos (se houver)
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (!cacheWhitelist.includes(key)) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Intercepta requisições e responde com cache ou fetch da rede
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

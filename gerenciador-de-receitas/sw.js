// Service worker: guarda o app inteiro no aparelho para abrir offline.
// Estratégia: o shell é pré-carregado na instalação; navegação tenta a rede
// e cai no cache; o resto responde do cache e se atualiza por trás.
const VERSAO = "cozinha-retro-v5";
const SHELL = [
  "./", "./index.html", "./styles.css", "./manifest.webmanifest", "./dados.json",
  "./js/estado.js", "./js/api.js", "./js/tela.js", "./js/main.js",
  "./assets/panela.webp", "./assets/icone-180.png", "./assets/icone-192.png", "./assets/icone-512.png",
  "./assets/ovo.webp", "./assets/queijo.webp", "./assets/leite.webp", "./assets/manteiga.webp",
  "./assets/tomate.webp", "./assets/cebola.webp", "./assets/limao.webp", "./assets/banana.webp",
  "./assets/morango.webp", "./assets/maca.webp", "./assets/frango.webp", "./assets/arroz.webp",
  "./assets/feijao.webp", "./assets/alho.webp"
];

self.addEventListener("install", e => {
  // cada arquivo separado: um 404 isolado não derruba a instalação inteira
  e.waitUntil(caches.open(VERSAO).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then(cacheado => {
    const rede = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(x => x.put(req, c)); } return r; }).catch(() => cacheado);
    return cacheado || rede;
  }));
});
